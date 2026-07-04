const axios = require('axios');
const CONFIG = require('../config');
const PowerOutage = require('../models/PowerOutage');

const DAYS_AHEAD = 14;
const CARD_MAX_ITEMS = 15;

function fmt(d) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

async function fetchSubOrgs() {
  const res = await axios.get(CONFIG.EVNCPC_ORG_LIST_URL, {
    headers: { version: '1.0' },
    params: { maDonViCapTren: CONFIG.EVNCPC_ORG_CODE },
    timeout: 20000,
  });
  return (res.data || []).map((o) => ({ code: o.code, name: o.organizationName }));
}

async function fetchOutagesForSubOrg(subOrgCode) {
  const from = new Date(); from.setHours(0, 0, 0, 0);
  const to = new Date(); to.setDate(to.getDate() + DAYS_AHEAD); to.setHours(23, 59, 59, 0);

  const items = [];
  for (let page = 1; page <= 10; page++) {
    const res = await axios.get(CONFIG.EVNCPC_API_URL, {
      headers: { version: '1.0', Accept: 'application/json' },
      params: {
        orgCode: CONFIG.EVNCPC_ORG_CODE, subOrgCode,
        fromDate: fmt(from), toDate: fmt(to), page, limit: 100,
      },
      timeout: 20000,
    });
    const batch = res.data?.items || [];
    items.push(...batch);
    if (batch.length < 100) break;
  }
  return items;
}

function toDoc(it) {
  return {
    subOrgCode: it.subOrganizationCode || '',
    subOrgName: it.subOrganizationName || '',
    stationCode: it.stationCode || '',
    stationName: it.stationName || '',
    fromDate: it.fromDate ? new Date(it.fromDate) : null,
    toDate: it.toDate ? new Date(it.toDate) : null,
    fromDateStr: it.fromDateStr || '',
    toDateStr: it.toDateStr || '',
    outageType: it.outageType || '',
    statusStr: it.statusStr || '',
    reason: it.reason || '',
    crawledAt: new Date(),
  };
}

async function syncOutages() {
  const code = CONFIG.EVNCPC_SUBORG_CODE;
  let items;
  try {
    items = await fetchOutagesForSubOrg(code);
  } catch (e1) {
    await new Promise((r) => setTimeout(r, 3000));
    try { items = await fetchOutagesForSubOrg(code); }
    catch (e2) { console.error(`[CatDien] Cào đơn vị ${code} thất bại: ${e2.message}`); return 0; }
  }
  let upserted = 0;
  for (const it of items) {
    const doc = toDoc(it);
    if (!doc.subOrgCode) doc.subOrgCode = code;
    if (!doc.stationCode || !doc.fromDate || !doc.toDate) continue;
    await PowerOutage.updateOne(
      { stationCode: doc.stationCode, fromDate: doc.fromDate, toDate: doc.toDate },
      { $set: doc },
      { upsert: true }
    );
    upserted++;
  }
  console.log(`[CatDien] Đồng bộ ${upserted} lịch cắt điện (đơn vị ${code})`);
  return upserted;
}

async function getOutages(query = '', subOrgCode = CONFIG.EVNCPC_SUBORG_CODE) {
  const q = (query || '').toLowerCase().trim().normalize('NFC');
  const now = new Date();
  const vnNow = new Date(now.getTime() + (7 * 3600000));
  const startOfToday = new Date(Date.UTC(vnNow.getUTCFullYear(), vnNow.getUTCMonth(), vnNow.getUTCDate(), -7, 0, 0, 0));

  const filter = {};
  if (subOrgCode && subOrgCode !== 'all') filter.subOrgCode = subOrgCode;

  const dateMatch = q.match(/^(\d{1,2})[/-](\d{1,2})$/);
  if (dateMatch) {
    const [, d, m] = dateMatch;
    const y = vnNow.getUTCFullYear();
    const start = new Date(Date.UTC(y, parseInt(m) - 1, parseInt(d), -7, 0, 0, 0));
    const end = new Date(Date.UTC(y, parseInt(m) - 1, parseInt(d), 16, 59, 59, 999));
    filter.fromDate = { $gte: start, $lte: end };
  } else {
    filter.toDate = { $gte: startOfToday };
    if (q && !['tất cả', 'tat ca', 'tatca'].includes(q)) {
      const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ stationName: regex }, { reason: regex }];
    }
  }

  return PowerOutage.find(filter).sort({ fromDate: 1 }).limit(50).lean();
}

async function listStations(subOrgCode = CONFIG.EVNCPC_SUBORG_CODE) {
  const filter = {};
  if (subOrgCode && subOrgCode !== 'all') filter.subOrgCode = subOrgCode;
  const names = await PowerOutage.distinct('stationName', filter);
  return names.filter(Boolean).sort((a, b) => a.localeCompare(b, 'vi'));
}

function parseDmy(str) {
  const m = (str || '').trim().match(/^(\d{1,2})[/-](\d{1,2})(?:[/-](\d{4}))?$/);
  if (!m) return null;
  const [, d, mo, y] = m;
  return { d: parseInt(d), m: parseInt(mo) - 1, y: y ? parseInt(y) : new Date().getFullYear() };
}

async function getOutagesByStations(stationNames = [], dateFrom = '', dateTo = '', subOrgCode = CONFIG.EVNCPC_SUBORG_CODE) {
  const filter = {};
  if (subOrgCode && subOrgCode !== 'all') filter.subOrgCode = subOrgCode;
  if (stationNames.length) filter.stationName = { $in: stationNames };

  let from = parseDmy(dateFrom);
  let to = parseDmy(dateTo) || from;
  if (from && to && new Date(from.y, from.m, from.d) > new Date(to.y, to.m, to.d)) {
    [from, to] = [to, from];
  }

  if (from) {
    filter.fromDate = {
      $gte: new Date(Date.UTC(from.y, from.m, from.d, -7, 0, 0, 0)),
      $lte: new Date(Date.UTC(to.y, to.m, to.d, 16, 59, 59, 999)),
    };
  } else {
    const now = new Date();
    const vnNow = new Date(now.getTime() + 7 * 3600000);
    filter.toDate = { $gte: new Date(Date.UTC(vnNow.getUTCFullYear(), vnNow.getUTCMonth(), vnNow.getUTCDate(), -7, 0, 0, 0)) };
  }

  return PowerOutage.find(filter).sort({ fromDate: 1 }).limit(100).lean();
}

// startAutoSync dùng node-cron (cài thêm nếu cần: npm install node-cron)
function startAutoSync() {
  try {
    const cron = require('node-cron');
    syncOutages().catch((e) => console.error('[CatDien] Sync lần đầu lỗi:', e.message));
    cron.schedule('*/30 * * * *', () => {
      syncOutages().catch((e) => console.error('[CatDien] Sync định kỳ lỗi:', e.message));
    });
    console.log('[CatDien] Đã bật tự động đồng bộ lịch cắt điện (mỗi 30 phút)');
  } catch {
    console.warn('[CatDien] node-cron chưa được cài. Chạy: npm install node-cron');
  }
}

module.exports = {
  fetchSubOrgs, fetchOutagesForSubOrg, syncOutages,
  getOutages, listStations, getOutagesByStations, startAutoSync,
};

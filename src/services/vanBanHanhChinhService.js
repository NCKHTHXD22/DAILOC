const axios = require('axios');
const VanBanHanhChinh = require('../models/VanBanHanhChinh');

const BASE_URL = 'https://1022.vn/vbpq/';
const MAX_PAGES = 200;

function isDaNangAgency(coQuanBanHanh) {
  return (coQuanBanHanh || '').includes('Đà Nẵng');
}

function parseVnDate(str) {
  const s = (str || '').trim();
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const [, d, mo, y] = m;
  const year = parseInt(y);
  if (year < 1990 || year > new Date().getFullYear() + 1) return null;
  return new Date(Date.UTC(year, parseInt(mo) - 1, parseInt(d), -7, 0, 0, 0));
}

async function fetchPage(pageNum) {
  const cheerio = require('cheerio');
  const url = pageNum <= 1 ? BASE_URL : `${BASE_URL}?paged=${pageNum}`;
  const res = await axios.get(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (UBND-DaiLoc-VanBan/1.0)' },
    timeout: 20000,
  });
  const $ = cheerio.load(res.data);
  const rows = [];

  $('table.vbqp-archive-table tbody tr').each((_, el) => {
    const tds = $(el).find('td');
    if (tds.length < 8) return;
    const soHieu = $(tds[1]).text().trim();
    const detailUrl = $(tds[1]).find('a').attr('href') || $(tds[5]).find('a').attr('href') || '';
    const coQuanBanHanh = $(tds[2]).text().trim();
    const loaiVanBan = $(tds[3]).text().trim();
    const linhVuc = $(tds[4]).text().trim();
    const trichYeu = $(tds[5]).text().trim();
    const ngayBanHanh = $(tds[6]).text().trim();
    const ngayHieuLuc = $(tds[7]).text().trim();
    if (!detailUrl || !soHieu) return;
    rows.push({ soHieu, coQuanBanHanh, loaiVanBan, linhVuc, trichYeu, ngayBanHanh, ngayHieuLuc, detailUrl });
  });

  return rows;
}

async function crawlAll() {
  let totalRows = 0;
  let upserted = 0;
  let page = 1;

  for (; page <= MAX_PAGES; page++) {
    let rows;
    try {
      rows = await fetchPage(page);
    } catch (err) {
      console.error(`[VanBan] Lỗi tải trang ${page}: ${err.message}`);
      break;
    }
    if (rows.length === 0) break;
    totalRows += rows.length;

    for (const r of rows) {
      if (!isDaNangAgency(r.coQuanBanHanh)) continue;
      const doc = {
        soHieu: r.soHieu,
        coQuanBanHanh: r.coQuanBanHanh,
        loaiVanBan: r.loaiVanBan,
        linhVuc: r.linhVuc,
        trichYeu: r.trichYeu,
        ngayBanHanh: parseVnDate(r.ngayBanHanh),
        ngayHieuLuc: parseVnDate(r.ngayHieuLuc),
        detailUrl: r.detailUrl,
        crawledAt: new Date(),
      };
      await VanBanHanhChinh.updateOne({ detailUrl: doc.detailUrl }, { $set: doc }, { upsert: true });
      upserted++;
    }

    await new Promise((r) => setTimeout(r, 1500));
  }

  console.log(`[VanBan] Cào xong ${page - 1} trang, ${totalRows} dòng, upsert ${upserted} văn bản liên quan Đà Nẵng`);
  return { pages: page - 1, totalRows, upserted };
}

async function syncVanBan() {
  return crawlAll();
}

// startAutoSync dùng node-cron (cài thêm nếu cần: npm install node-cron)
function startAutoSync() {
  try {
    const cron = require('node-cron');
    syncVanBan().catch((e) => console.error('[VanBan] Sync lần đầu lỗi:', e.message));
    cron.schedule('0 3 * * *', () => {
      syncVanBan().catch((e) => console.error('[VanBan] Sync định kỳ lỗi:', e.message));
    });
    console.log('[VanBan] Đã bật tự động đồng bộ văn bản hành chính (mỗi ngày 3h sáng)');
  } catch {
    console.warn('[VanBan] node-cron chưa được cài. Chạy: npm install node-cron');
  }
}

async function searchVanBan(filters = {}, page = 1) {
  const {
    soHieu = '', trichYeu = '', coQuanBanHanh = '', loaiVanBan = '', linhVuc = '',
    ngayBanHanhFrom = '', ngayBanHanhTo = '', ngayHieuLucFrom = '', ngayHieuLucTo = '',
  } = filters;

  const q = {};
  if (soHieu) q.soHieu = new RegExp(soHieu.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  if (trichYeu) q.trichYeu = new RegExp(trichYeu.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  if (coQuanBanHanh) q.coQuanBanHanh = coQuanBanHanh;
  if (loaiVanBan) q.loaiVanBan = loaiVanBan;
  if (linhVuc) q.linhVuc = linhVuc;

  if (ngayBanHanhFrom || ngayBanHanhTo) {
    q.ngayBanHanh = {};
    if (ngayBanHanhFrom) q.ngayBanHanh.$gte = new Date(ngayBanHanhFrom);
    if (ngayBanHanhTo) q.ngayBanHanh.$lte = new Date(ngayBanHanhTo);
  }
  if (ngayHieuLucFrom || ngayHieuLucTo) {
    q.ngayHieuLuc = {};
    if (ngayHieuLucFrom) q.ngayHieuLuc.$gte = new Date(ngayHieuLucFrom);
    if (ngayHieuLucTo) q.ngayHieuLuc.$lte = new Date(ngayHieuLucTo);
  }

  const LIMIT = 20;
  const skip = (Math.max(1, parseInt(page) || 1) - 1) * LIMIT;

  const [items, count] = await Promise.all([
    VanBanHanhChinh.find(q).sort({ ngayBanHanh: -1 }).skip(skip).limit(LIMIT).lean(),
    VanBanHanhChinh.countDocuments(q),
  ]);

  return { items, count, totalPages: Math.max(1, Math.ceil(count / LIMIT)) };
}

async function listFilterOptions() {
  const [coQuanBanHanh, loaiVanBan, linhVuc] = await Promise.all([
    VanBanHanhChinh.distinct('coQuanBanHanh'),
    VanBanHanhChinh.distinct('loaiVanBan'),
    VanBanHanhChinh.distinct('linhVuc'),
  ]);
  const sortVi = (arr) => arr.filter(Boolean).sort((a, b) => a.localeCompare(b, 'vi'));
  return {
    coQuanBanHanh: sortVi(coQuanBanHanh),
    loaiVanBan: sortVi(loaiVanBan),
    linhVuc: sortVi(linhVuc),
  };
}

module.exports = {
  fetchPage, crawlAll, syncVanBan, startAutoSync,
  searchVanBan, listFilterOptions, isDaNangAgency, parseVnDate,
};

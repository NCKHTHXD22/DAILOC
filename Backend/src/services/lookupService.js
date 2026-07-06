const { setState, getState, clearState } = require('./chatState');
const { sendZaloText } = require('../utils/zaloApi');
const Feedback = require('../models/Feedback');

const CODE_RE = /^#?([0-9a-f]{5})$/i;
const PHONE_RE = /^(0|\+84)[3-9]\d{8}$/;
const MAX_LIST = 5;
const CANCEL_WORDS = ['huỷ', 'hủy', 'huy', 'cancel', 'thoát', 'thoat'];

// Zalo userId (theo App) khác với userId theo OA (theo webhook) nên không dùng để lọc được.
// Định danh chủ phản ánh bằng SĐT đã nhập lúc gửi (Feedback.contact) thay vì userId.
function phoneVariants(raw) {
  const p = raw.replace(/[\s.-]/g, '');
  if (/^0[3-9]\d{8}$/.test(p)) return [p, '+84' + p.slice(1)];
  if (/^\+84[3-9]\d{8}$/.test(p)) return ['0' + p.slice(3), p];
  return [p];
}

function isLookupTrigger(text) {
  const lower = text.toLowerCase().trim();
  // Lưu ý: "tra cứu hồ sơ" / "#tracuuhoso" thuộc tra cứu THỦ TỤC HÀNH CHÍNH (hoSoService), không nhận ở đây.
  return (
    lower === '#tracuugoopy' ||
    lower === '#theodoi' ||
    lower.includes('theo dõi phản ánh') ||
    lower.includes('theo doi phan anh') ||
    lower.includes('tra cứu góp ý') ||
    lower.includes('tra cuu gop y') ||
    lower.includes('tra cứu phản ánh') ||
    lower.includes('tra cuu phan anh')
  );
}

function isDirectCode(text) {
  return CODE_RE.test(text.trim());
}

function shortCode(fb) {
  return fb._id.toString().slice(-5).toUpperCase();
}

function isResolved(fb) {
  return fb.status === 'resolved' || fb.status === 'done';
}

function statusLine(fb) {
  return isResolved(fb) ? '✅ Đã xử lý xong' : '🕐 Đang xử lý';
}

function progressBar(fb) {
  // Stage 1: luôn hoàn thành (đã gởi hồ sơ)
  const s1 = true;
  // Stage 2: đã tiếp nhận — được phân công cho cán bộ
  const s2 = !!(fb.assignedTo || fb.status === 'draft' || isResolved(fb));
  // Stage 3: đang xử lý — cán bộ đã nộp dự thảo chờ duyệt
  const s3 = fb.status === 'draft' || isResolved(fb);
  // Stage 4: đã duyệt
  const s4 = isResolved(fb);
  // Stage 5: đã gởi hoàn tất hồ sơ
  const s5 = isResolved(fb);

  const mark = (done) => done ? '✅' : '⬜';
  const stages = [
    `${mark(s1)} 1. Đã gởi`,
    `${mark(s2)} 2. Đã tiếp nhận`,
    `${mark(s3)} 3. Đang xử lý`,
    `${mark(s4)} 4. Đã duyệt`,
    `${mark(s5)} 5. Đã xử lý`,
  ];

  // Xác định bước hiện tại
  let current = 1;
  if (s5) current = 5;
  else if (s4) current = 4;
  else if (s3) current = 3;
  else if (s2) current = 2;
  const labels = stages.map((s, i) => i + 1 === current && !s5 ? s + ' ⏳' : s);

  return '📊 TIẾN TRÌNH XỬ LÝ\n' + labels.join('\n');
}

function formatDate(date) {
  return new Date(date).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
}

function truncate(text, max) {
  const t = (text || '').trim();
  return t.length > max ? t.slice(0, max).trim() + '...' : t;
}

async function startLookup(userId) {
  setState(userId, { step: 'lookup_awaiting_phone' });
  await sendZaloText(userId,
    '📱 Vui lòng nhập số điện thoại bạn đã dùng khi gửi phản ánh để tra cứu.\n' +
    '(Nhắn "huỷ" để thoát)'
  );
}

async function listByPhone(userId, rawPhone, pendingCode) {
  const items = await Feedback.find({ contact: { $in: phoneVariants(rawPhone) } })
    .sort({ createdAt: -1 })
    .limit(MAX_LIST)
    .populate('categoryId', 'name')
    .lean();

  if (items.length === 0) {
    clearState(userId);
    await sendZaloText(userId,
      `📭 Không tìm thấy phản ánh nào với số điện thoại ${rawPhone.trim()}.\n\n` +
      'Chọn "Góp ý, phản ánh" trong menu để gửi mới.'
    );
    return;
  }

  if (pendingCode) {
    const fb = items.find((f) => shortCode(f) === pendingCode);
    clearState(userId);
    if (!fb) {
      await sendZaloText(userId, `⚠️ Không tìm thấy phản ánh #${pendingCode} với số điện thoại ${rawPhone.trim()}.`);
      return;
    }
    await replyDetail(userId, fb);
    return;
  }

  setState(userId, { step: 'lookup_list', items: items.map((i) => i._id.toString()) });

  const lines = items.map((fb, i) =>
    `${i + 1}️⃣ #${shortCode(fb)} · ${formatDate(fb.createdAt)} · ${statusLine(fb)}\n` +
    `   ${truncate(fb.content, 60)}`
  );

  await sendZaloText(userId,
    '📋 Các phản ánh gần đây của bạn:\n\n' +
    lines.join('\n\n') +
    `\n\nNhắn số (1-${items.length}) để xem chi tiết, hoặc nhắn mã (#XXXXX).\n` +
    '(Nhắn "huỷ" để thoát)'
  );
}

async function handlePhoneReply(userId, text) {
  const lower = text.toLowerCase().trim();
  if (CANCEL_WORDS.includes(lower)) {
    clearState(userId);
    await sendZaloText(userId, '❌ Đã huỷ.');
    return;
  }

  const raw = text.trim().replace(/[\s.-]/g, '');
  if (!PHONE_RE.test(raw)) {
    await sendZaloText(userId, '⚠️ Số điện thoại không đúng định dạng. Vui lòng nhập lại (VD: 0848018141).');
    return;
  }

  const state = getState(userId);
  await listByPhone(userId, text, state?.pendingCode);
}

async function replyDetail(userId, fb) {
  const catName = fb.categoryId?.name || 'Chưa rõ';
  const locationLine = fb.location?.address ? `📍 Địa chỉ: ${fb.location.address}\n` : '';
  // Hạn xử lý — chỉ hiển thị khi chưa gởi hoàn tất hồ sơ
  const deadlineLine = (!isResolved(fb) && fb.deadline) ? `⏰ Hạn xử lý: ${formatDate(fb.deadline)}\n` : '';

  // Phần 1: Thông tin hồ sơ
  let msg =
    `━━━━━━ THÔNG TIN HỒ SƠ ━━━━━━\n` +
    `🆔 Mã phản ánh: #${shortCode(fb)}\n` +
    `🗓️ Ngày gửi: ${formatDate(fb.createdAt)}\n` +
    `🏷️ Loại: ${catName}\n` +
    `${locationLine}` +
    `${deadlineLine}` +
    `📝 Nội dung: ${fb.content}\n\n`;

  // Phần 2: Tiến trình xử lý
  msg += progressBar(fb);

  // Phần 3: Phản hồi của UBND (nếu đã giải quyết xong)
  if (isResolved(fb)) {
    const reply = fb.finalResponse || fb.response || '';
    if (reply) {
      msg += `\n\n━━━━━━ PHẢN HỒI CỦA UBND ━━━━━━\n${reply}`;
    }
  }

  await sendZaloText(userId, msg);
}

// Chưa biết SĐT của người gõ mã trực tiếp (chưa qua state) → hỏi SĐT trước khi lộ dữ liệu.
async function lookupByCode(userId, rawCode) {
  const match = rawCode.trim().match(CODE_RE);
  const code = (match ? match[1] : rawCode.replace(/^#/, '')).toUpperCase();

  setState(userId, { step: 'lookup_awaiting_phone', pendingCode: code });
  await sendZaloText(userId,
    `📱 Để tra cứu phản ánh #${code}, vui lòng nhập số điện thoại bạn đã dùng khi gửi phản ánh.\n` +
    '(Nhắn "huỷ" để thoát)'
  );
}

// Đang trong danh sách đã lọc theo SĐT → tìm/chọn trong đúng danh sách đó, không truy vấn lại toàn DB.
async function handleLookupReply(userId, text) {
  const lower = text.toLowerCase().trim();

  if (CANCEL_WORDS.includes(lower)) {
    clearState(userId);
    await sendZaloText(userId, '❌ Đã huỷ.');
    return;
  }

  const state = getState(userId);
  const ids = state?.items || [];

  if (isDirectCode(text)) {
    const match = text.trim().match(CODE_RE);
    const code = (match ? match[1] : text.replace(/^#/, '')).toUpperCase();
    const candidates = await Feedback.find({ _id: { $in: ids } }).populate('categoryId', 'name').lean();
    const fb = candidates.find((f) => shortCode(f) === code);
    clearState(userId);
    if (!fb) {
      await sendZaloText(userId, `⚠️ Không tìm thấy phản ánh #${code} trong danh sách của bạn.`);
      return;
    }
    await replyDetail(userId, fb);
    return;
  }

  const idx = parseInt(lower, 10) - 1;

  if (Number.isInteger(idx) && ids[idx]) {
    const fb = await Feedback.findById(ids[idx]).populate('categoryId', 'name').lean();
    clearState(userId);
    if (fb) await replyDetail(userId, fb);
    return;
  }

  await sendZaloText(userId, `⚠️ Vui lòng nhắn số (1-${ids.length}) hoặc mã phản ánh (#XXXXX).`);
}

module.exports = { isLookupTrigger, isDirectCode, startLookup, handlePhoneReply, handleLookupReply, lookupByCode };

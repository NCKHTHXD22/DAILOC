const { sendZaloText, sendZaloLinkButton, sendZaloToGroup, getZaloUserProfile } = require('../utils/zaloApi');
const { uploadFromUrl, uploadFromZaloImageUrl, uploadFromZaloVideoUrl } = require('../utils/cloudinary');
const Feedback = require('../models/Feedback');
const Category = require('../models/Category');
const CONFIG = require('../config');

const MAX_IMAGES = 5;
const BATCH_DELAY_MS = 3000; // Chờ 3 giây để gộp ảnh gửi cùng lúc từ Zalo

// Bounding box Huyện Đại Lộc (Đà Nẵng / Quảng Nam) để định vị Nominatim
const DAI_LOC_VIEWBOX = '107.8,16.0,108.3,15.7'; // min_lng,max_lat,max_lng,min_lat

// State machine lưu trạng thái từng user trong memory (10 phút timeout)
// Dùng chung qua chatState để luồng góp ý & tra cứu không xung đột state.
const { setState, getState, clearState } = require('./chatState');
const profileCache = new Map();

// Buffer gộp ảnh: { userId → { urls: [], timer } }
const imageBatchBuffer = new Map();

function isPhone(text) {
  return /^(0|\+84)[3-9]\d{8}$/.test(text.replace(/\s/g, ''));
}

function isEmail(text) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text.trim());
}

function isUrl(text) {
  return /^https?:\/\/.+/i.test(text.trim());
}

// Geocode địa chỉ tay thành tọa độ lat/lng qua Nominatim OpenStreetMap
async function geocodeAddress(address) {
  const axios = require('axios');
  const headers = { 'User-Agent': 'UBND-DaiLoc-GopY/1.0 (gopy@dailoc.gov.vn)' };
  const query = `${address}, Đại Lộc, Quảng Nam, Việt Nam`;

  try {
    const res = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: { q: query, format: 'json', limit: 1, countrycodes: 'vn', viewbox: DAI_LOC_VIEWBOX, bounded: 1 },
      headers,
      timeout: 5000,
    });
    if (res.data && res.data.length > 0) {
      return { lat: Number(res.data[0].lat), lng: Number(res.data[0].lon) };
    }
  } catch (err) {
    console.error('[Geocode] Lỗi geocode địa chỉ:', err.message);
  }
  return null;
}

// Bắt đầu luồng góp ý
async function startFeedback(userId, displayName = '') {
  let name = displayName;
  if (!name) {
    if (profileCache.has(userId)) {
      name = profileCache.get(userId).display_name;
    } else {
      const profile = await getZaloUserProfile(userId);
      name = profile?.display_name || '';
      if (profile) profileCache.set(userId, profile);
    }
  }
  setState(userId, { step: 'waiting_contact', displayName: name });
  await sendZaloText(userId,
    '💬 Chào mừng bạn đến với tính năng Góp ý - Phản ánh của UBND Xã Đại Lộc!\n\n' +
    '📞 Vui lòng nhập SĐT (09xxxxxxxx) hoặc email của bạn để chúng tôi có thể liên hệ lại:\n\n' +
    '(Nhắn "huỷ" để thoát bất cứ lúc nào)'
  );
}

async function sendCategoryMenu(userId) {
  await sendZaloText(userId,
    '🏷️ Chọn loại phản ánh của bạn:\n\n' +
    '1️⃣ Môi trường, Hạ tầng, Xây dựng\n' +
    '2️⃣ Văn hoá, Giáo dục, Y tế\n' +
    '3️⃣ Dịch vụ công, Thủ tục hành chính\n' +
    '4️⃣ An ninh trật tự, PCCC\n\n' +
    '(Gõ số 1-4 để chọn)'
  );
}

async function sendLocationPrompt(userId) {
  const publicUrl = CONFIG.PUBLIC_URL;
  if (publicUrl) {
    const url = `${publicUrl}/location?uid=${userId}`;
    await sendZaloLinkButton(
      userId,
      '📍 Cung cấp vị trí phản ánh',
      'Nhấn nút bên dưới để lấy vị trí GPS tự động — hoặc gõ địa chỉ thủ công — hoặc nhắn "1" để bỏ qua.',
      '📡 Lấy vị trí GPS tự động',
      url,
    );
  } else {
    await sendZaloText(userId,
      '📍 Vui lòng cung cấp địa chỉ / vị trí xảy ra sự việc phản ánh:\n\n' +
      '• Gõ địa chỉ cụ thể (VD: Thôn 1, xã Đại Lộc)\n' +
      '• Hoặc chia sẻ vị trí GPS trực tiếp qua Zalo\n\n' +
      '1️⃣ Bỏ qua vị trí — gõ số 1 để tiếp tục'
    );
  }
}

async function sendImagePrompt(userId, currentCount) {
  if (currentCount === 0) {
    await sendZaloText(userId,
      `📎 Bạn có muốn gửi hình ảnh hoặc video minh hoạ không? (Tối đa ${MAX_IMAGES} ảnh, 1 video)\n\n` +
      '• Gửi 1 hoặc nhiều ảnh/video trực tiếp từ điện thoại\n' +
      '• Hoặc gửi URL ảnh/video (http/https)\n\n' +
      '1️⃣ Không đính kèm — gõ số 1 để bỏ qua'
    );
  } else {
    await sendZaloText(userId,
      `✅ Đã có ${currentCount}/${MAX_IMAGES} ảnh đính kèm\n\n` +
      `${currentCount < MAX_IMAGES ? '• Gửi thêm ảnh/video nếu muốn\n' : ''}` +
      '• Nhắn "xong" để tiếp tục\n' +
      '1️⃣ Gõ số 1 để kết thúc'
    );
  }
}

// Xử lý tin nhắn text từ user
async function handleText(userId, text, displayName) {
  const state = getState(userId);
  const lower = text.toLowerCase().trim().normalize('NFC');

  // Lệnh huỷ toàn cục
  if (['huỷ', 'hủy', 'huy', 'cancel', 'thoát', 'thoat'].includes(lower)) {
    clearState(userId);
    await sendZaloText(userId, '❌ Đã huỷ. Bạn có thể bắt đầu lại bằng cách chọn "Góp ý, phản ánh" trong menu.');
    return;
  }

  if (!state) {
    if (isFeedbackTrigger(text)) await startFeedback(userId, displayName);
    return;
  }

  if (state.step === 'waiting_contact') {
    if (!isPhone(text) && !isEmail(text)) {
      await sendZaloText(userId,
        '⚠️ Thông tin liên hệ không hợp lệ.\n\n' +
        'Vui lòng nhập SĐT 10 chữ số (VD: 0912345678) hoặc Email:\n\n' +
        '(Nhắn "huỷ" để thoát)'
      );
      return;
    }
    setState(userId, {
      step: 'waiting_category',
      contact: text.trim(),
      displayName: displayName || state.displayName || '',
    });
    await sendCategoryMenu(userId);
    return;
  }

  if (state.step === 'waiting_category') {
    const num = lower.trim();
    const validChoices = ['1', '2', '3', '4'];
    if (!validChoices.includes(num)) {
      await sendZaloText(userId, '⚠️ Vui lòng gõ số từ 1 đến 4 để chọn loại phản ánh.');
      await sendCategoryMenu(userId);
      return;
    }
    const categories = await Category.find({}).sort({ order: 1 }).lean();
    const idx = parseInt(num) - 1;
    if (!categories[idx]) {
      await sendZaloText(userId, '⚠️ Danh mục chưa được cấu hình. Vui lòng liên hệ quản trị viên.');
      return;
    }
    const cat = categories[idx];
    setState(userId, {
      ...state,
      step: 'waiting_content',
      categoryId: cat._id.toString(),
      categoryName: cat.name,
      categoryGroupId: cat.zaloGroupId,
    });
    await sendZaloText(userId,
      `✅ Loại phản ánh: ${cat.name}\n\n` +
      '✏️ Nhập nội dung góp ý / phản ánh của bạn (tối thiểu 5 ký tự):\n\n' +
      '(Nhắn "huỷ" để thoát)'
    );
    return;
  }

  if (state.step === 'waiting_content') {
    if (text.trim().length < 5) {
      await sendZaloText(userId, '⚠️ Nội dung quá ngắn. Vui lòng nhập ít nhất 5 ký tự.');
      return;
    }
    setState(userId, { ...state, step: 'waiting_location', content: text.trim() });
    await sendLocationPrompt(userId);
    return;
  }

  if (state.step === 'waiting_location') {
    const skipKeywords = ['1', 'bỏ qua', 'bo qua', 'skip', 'không', 'khong'];
    if (skipKeywords.some(k => lower.trim() === k)) {
      setState(userId, { ...state, step: 'waiting_image', location: null, imageUrls: [], videoUrl: '' });
      await sendImagePrompt(userId, 0);
      return;
    }

    const addr = text.trim();
    const geo = await geocodeAddress(addr);
    setState(userId, {
      ...state,
      step: 'waiting_image',
      location: { address: addr, lat: geo?.lat ?? null, lng: geo?.lng ?? null },
      imageUrls: [],
      videoUrl: '',
    });
    await sendZaloText(userId, `✅ Đã ghi nhận địa chỉ: ${addr}`);
    await sendImagePrompt(userId, 0);
    return;
  }

  if (state.step === 'waiting_image') {
    const currentImages = state.imageUrls || [];
    const doneKeywords = ['1', 'xong', 'done', 'không có', 'khong co', 'không', 'khong', 'no', 'bỏ qua', 'bo qua'];
    const isDone = doneKeywords.some((k) => lower.trim() === k);

    if (isDone) {
      setState(userId, { ...state, step: 'waiting_confirm' });
      await sendConfirmation(userId, state);
      return;
    }

    if (isUrl(text)) {
      const isVideo = /\.(mp4|mov|avi|mkv|3gp|m4v)(\?.*)?$/i.test(text.trim());
      if (isVideo) {
        await sendZaloText(userId, '⏳ Đang tải video lên...');
        try {
          const videoUrl = await uploadFromZaloVideoUrl(text.trim());
          setState(userId, { ...state, step: 'waiting_confirm', videoUrl });
          await sendConfirmation(userId, { ...state, videoUrl });
        } catch (err) {
          console.error('[Cloudinary] Upload URL video thất bại:', err.message);
          await sendZaloText(userId, '⚠️ Không thể tải video từ URL đó. Hãy thử URL khác hoặc nhắn "xong" để bỏ qua.');
        }
      } else {
        if (currentImages.length >= MAX_IMAGES) {
          setState(userId, { ...state, step: 'waiting_confirm' });
          await sendZaloText(userId, `⚠️ Đã đạt tối đa ${MAX_IMAGES} ảnh.`);
          await sendConfirmation(userId, state);
          return;
        }
        await sendZaloText(userId, '⏳ Đang tải ảnh lên...');
        try {
          const imageUrl = await uploadFromUrl(text.trim());
          const newImages = [...currentImages, imageUrl];
          const updatedState = { ...state, imageUrls: newImages };
          setState(userId, updatedState);
          if (newImages.length >= MAX_IMAGES) {
            setState(userId, { ...updatedState, step: 'waiting_confirm' });
            await sendZaloText(userId, `✅ Đã đính kèm ${newImages.length}/${MAX_IMAGES} ảnh (tối đa).`);
            await sendConfirmation(userId, updatedState);
          } else {
            await sendImagePrompt(userId, newImages.length);
          }
        } catch (err) {
          console.error('[Cloudinary] Upload URL thất bại:', err.message);
          await sendZaloText(userId, '⚠️ Không thể tải ảnh từ URL đó. Hãy thử URL khác hoặc nhắn "xong" để bỏ qua.');
        }
      }
      return;
    }

    await sendImagePrompt(userId, currentImages.length);
    return;
  }

  if (state.step === 'waiting_confirm') {
    if (lower.trim() === '1' || ['xác nhận gửi', 'xac nhan gui', 'xác nhận', 'xac nhan', 'gửi', 'gui', 'ok', 'đồng ý', 'dong y'].some(k => lower.includes(k.normalize('NFC')))) {
      await saveFeedback(userId, state);
      return;
    }
    if (lower.trim() === '2' || ['nhập lại', 'nhap lai', 'làm lại', 'lam lai', 'sửa', 'sua'].some(k => lower.includes(k.normalize('NFC')))) {
      await startFeedback(userId);
      return;
    }
    if (lower.trim() === '3' || ['huỷ', 'hủy', 'huy', 'cancel'].some(k => lower.includes(k.normalize('NFC')))) {
      clearState(userId);
      await sendZaloText(userId, '❌ Đã huỷ. Bạn có thể bắt đầu lại bằng cách chọn "Góp ý, phản ánh" trong menu.');
      return;
    }
    await sendZaloText(userId,
      '⚠️ Vui lòng trả lời bằng số:\n1️⃣ Xác nhận gửi\n2️⃣ Nhập lại\n3️⃣ Huỷ'
    );
    return;
  }
}

// Xử lý khi user gửi ảnh trực tiếp (gộp ảnh debounce)
async function handleImage(userId, imageUrl) {
  const state = getState(userId);
  if (!state || state.step !== 'waiting_image') return;

  const existing = imageBatchBuffer.get(userId) || { urls: [], timer: null };
  existing.urls.push(imageUrl);
  if (existing.timer) clearTimeout(existing.timer);
  existing.timer = setTimeout(() => _processBatch(userId), BATCH_DELAY_MS);
  imageBatchBuffer.set(userId, existing);
}

// Xử lý gộp tải nhiều ảnh
async function _processBatch(userId) {
  const batch = imageBatchBuffer.get(userId);
  imageBatchBuffer.delete(userId);
  if (!batch || batch.urls.length === 0) return;

  const state = getState(userId);
  if (!state || state.step !== 'waiting_image') return;

  const currentImages = state.imageUrls || [];
  if (currentImages.length >= MAX_IMAGES) {
    setState(userId, { ...state, step: 'waiting_confirm' });
    await sendConfirmation(userId, state);
    return;
  }

  const remaining = MAX_IMAGES - currentImages.length;
  const toProcess = batch.urls.slice(0, remaining);
  const skipped = batch.urls.length - toProcess.length;

  await sendZaloText(userId, `⏳ Đang tải ${toProcess.length} ảnh lên...`);

  const results = await Promise.allSettled(
    toProcess.map((url) => uploadFromZaloImageUrl(url))
  );

  const uploaded = results.filter((r) => r.status === 'fulfilled').map((r) => r.value);
  const failed = results.filter((r) => r.status === 'rejected').length;

  const freshState = getState(userId);
  if (!freshState || freshState.step !== 'waiting_image') return;

  const freshImages = freshState.imageUrls || [];
  const available = MAX_IMAGES - freshImages.length;
  const finalUploaded = uploaded.slice(0, Math.max(0, available));
  const newImages = [...freshImages, ...finalUploaded];
  const updatedState = { ...freshState, imageUrls: newImages };

  let msg = `✅ Đã thêm ${uploaded.length} ảnh (${newImages.length}/${MAX_IMAGES})`;
  if (failed > 0) msg += ` · ${failed} ảnh lỗi, hãy thử lại`;
  if (skipped > 0) msg += ` · ${skipped} ảnh bỏ qua (quá giới hạn)`;

  if (newImages.length >= MAX_IMAGES) {
    setState(userId, { ...updatedState, step: 'waiting_confirm' });
    await sendZaloText(userId, msg + '. Đã đạt tối đa.');
    await sendConfirmation(userId, updatedState);
  } else {
    setState(userId, updatedState);
    await sendZaloText(userId, msg + '\n\nGửi thêm ảnh hoặc nhắn "xong" để tiếp tục.');
  }
}

// Xử lý gửi video trực tiếp
async function handleVideo(userId, videoUrl) {
  const state = getState(userId);
  if (!state || state.step !== 'waiting_image') return;

  await sendZaloText(userId, '⏳ Đang tải video lên...');
  try {
    const cloudUrl = await uploadFromZaloVideoUrl(videoUrl);
    setState(userId, { ...state, step: 'waiting_confirm', videoUrl: cloudUrl });
    await sendConfirmation(userId, { ...state, videoUrl: cloudUrl });
  } catch (err) {
    console.error('[Cloudinary] Upload video Zalo thất bại:', err.message);
    await sendZaloText(userId, '⚠️ Không thể tải video. Hãy thử lại hoặc gõ "1" để bỏ qua.');
  }
}

// Xử lý gửi contact card
async function handleContactCard(userId, phone, displayName) {
  const state = getState(userId);
  if (!state || state.step !== 'waiting_contact') return;

  setState(userId, { step: 'waiting_category', contact: phone, displayName: displayName || '' });
  await sendZaloText(userId, `✅ Đã ghi nhận SĐT: ${phone}\n`);
  await sendCategoryMenu(userId);
}

// Xử lý chia sẻ vị trí GPS
async function handleLocation(userId, { lat, lng, address }) {
  const state = getState(userId);
  if (!state || state.step !== 'waiting_location') return;

  const addr = address || `${lat}, ${lng}`;
  setState(userId, {
    ...state,
    step: 'waiting_image',
    location: { address: addr, lat: Number(lat), lng: Number(lng) },
    imageUrls: [],
    videoUrl: '',
  });
  await sendZaloText(userId, `✅ Đã ghi nhận vị trí: ${addr}`);
  await sendImagePrompt(userId, 0);
}

async function sendConfirmation(userId, state) {
  const imageUrls = state.imageUrls || [];
  const imageStatus = imageUrls.length > 0
    ? `✅ ${imageUrls.length} ảnh đính kèm`
    : '❌ Không có ảnh';
  const videoStatus = state.videoUrl ? '✅ Đã đính kèm video' : '❌ Không có video';
  const locationStatus = state.location?.address
    ? `📍 ${state.location.address}`
    : '📍 Không có địa chỉ';

  await sendZaloText(userId,
    '📋 Xác nhận góp ý:\n' +
    `• Liên hệ: ${state.contact}\n` +
    `• Loại: ${state.categoryName || 'Chưa chọn'}\n` +
    `• Nội dung: ${state.content}\n` +
    `• Địa chỉ: ${locationStatus}\n` +
    `• Hình ảnh: ${imageStatus}\n` +
    `• Video: ${videoStatus}\n\n` +
    'Trả lời bằng số:\n' +
    '1️⃣ Xác nhận gửi\n' +
    '2️⃣ Nhập lại\n' +
    '3️⃣ Huỷ'
  );
}

async function saveFeedback(userId, state) {
  try {
    let displayName = state.displayName || '';
    if (!displayName) {
      if (profileCache.has(userId)) {
        displayName = profileCache.get(userId).display_name;
      } else {
        const profile = await getZaloUserProfile(userId);
        displayName = profile?.display_name || '';
        if (profile) profileCache.set(userId, profile);
      }
    }

    const deadline = new Date();
    deadline.setDate(deadline.getDate() + 3);

    const imageUrls = state.imageUrls || [];
    const feedback = await Feedback.create({
      userId,
      displayName,
      contact: state.contact,
      content: state.content,
      location: state.location || {},
      imageUrl: imageUrls[0] || '',
      imageUrls,
      videoUrl: state.videoUrl || '',
      categoryId: state.categoryId || null,
      deadline,
    });
    clearState(userId);

    const shortCode = feedback._id.toString().slice(-5).toUpperCase();

    await sendZaloText(userId,
      '✅ Đã tiếp nhận phản ánh!\n\n' +
      `Mã phản ánh: #${shortCode}\n` +
      'Cảm ơn bạn!'
    );

    const now = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
    const nameInfo = displayName ? `👤 Tên: ${displayName}\n` : '';
    const catInfo = state.categoryName ? `🏷️ Loại: ${state.categoryName}\n` : '';
    const locationInfo = state.location?.address ? `📍 Địa chỉ: ${state.location.address}\n` : '';
    const imageInfo = imageUrls.length > 0
      ? `🖼️ ${imageUrls.length} ảnh:\n${imageUrls.map((u, i) => `  ${i + 1}. ${u}`).join('\n')}`
      : '🖼️ Ảnh: Không có';
    const videoInfo = state.videoUrl ? `🎬 Video: ${state.videoUrl}` : '🎬 Video: Không có';

    const groupMsg =
      `📩 PHẢN ÁNH MỚI - ${now}\n` +
      `${'─'.repeat(30)}\n` +
      `${nameInfo}` +
      `📞 Liên hệ: ${state.contact}\n` +
      `${catInfo}` +
      `${locationInfo}` +
      `📝 Nội dung:\n${state.content}\n` +
      `${imageInfo}\n` +
      `${videoInfo}\n` +
      `🆔 Mã: #${shortCode}`;

    const targetGroupId = state.categoryGroupId;
    await sendZaloToGroup(groupMsg, targetGroupId);

    console.log(`[Feedback] Lưu góp ý thành công: #${shortCode}`);
  } catch (err) {
    console.error('[Feedback] Lưu DB thất bại:', err.message);
    await sendZaloText(userId, '⚠️ Có lỗi xảy ra khi lưu góp ý. Vui lòng thử lại sau.');
  }
}

function isFeedbackTrigger(text) {
  const lower = text.toLowerCase().normalize('NFC');
  return (
    lower.includes('#goopy') ||
    lower.includes('#goppy') ||
    lower.includes('góp ý') ||
    lower.includes('gop y') ||
    lower.includes('phản ánh') ||
    lower.includes('phan anh') ||
    lower === 'goopy' ||
    lower === 'goppy'
  );
}

module.exports = {
  startFeedback,
  handleText,
  handleImage,
  handleVideo,
  handleContactCard,
  handleLocation,
  isFeedbackTrigger,
  geocodeAddress
};

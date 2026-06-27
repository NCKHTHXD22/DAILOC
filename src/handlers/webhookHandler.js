const { sendZaloText } = require('../utils/zaloApi');
const {
  startFeedback,
  handleText,
  handleImage,
  handleContactCard,
  handleLocation,
  isFeedbackTrigger,
} = require('../services/feedbackService');
const {
  isLookupTrigger,
  isDirectCode,
  startLookup,
  handleLookupReply,
  lookupByCode,
} = require('../services/lookupService');
const { getState } = require('../services/chatState');
const { saveProfile } = require('../admin/profileCache');
const { syncFollowers } = require('../admin/followerService');

async function handleWebhook(body) {
  const eventName = body.event_name;

  // Sự kiện thành viên ra/vào nhóm Zalo
  if (['user_join_group', 'user_leave_group'].includes(eventName)) {
    const groupId = body.group?.id || body.group_id;
    const users = body.users || [];

    // Fallback nếu Zalo đổi lại cấu trúc
    if (!users.length) {
      const fallbackId = body.sender?.id || body.follower?.id || body.user?.id;
      if (fallbackId) users.push({ id: fallbackId });
    }

    console.log(`[GroupSync] Webhook ${eventName}: groupId=${groupId}, có ${users.length} user`);

    if (groupId && users.length > 0) {
      const { handleUserJoinGroup, handleUserLeaveGroup } = require('../services/groupSyncService');

      for (const u of users) {
        const userId = u.id;
        if (!userId) continue;

        if (eventName === 'user_join_group') {
          handleUserJoinGroup(groupId, userId, '', '').catch(e => console.error(e));
        } else {
          handleUserLeaveGroup(groupId, userId).catch(e => console.error(e));
        }
      }
    } else {
      console.warn(`[GroupSync] Webhook thiếu groupId hoặc danh sách user rỗng! Không thể xử lý.`);
    }
    return;
  }

  const userId = body.sender?.id || body.follower?.id;
  if (!userId) return;


  console.log(`[Event] ${eventName} | userId: ${userId}`);

  // Cache profile từ mọi sự kiện có sender info (để danh sách follower có tên/avatar)
  const displayName = body.sender?.display_name || body.follower?.display_name || '';
  const avatar = body.sender?.avatar || body.follower?.avatar || '';
  if (displayName) {
    saveProfile(userId, displayName, avatar).catch(() => {});
  }

  // Cập nhật thông tin user (đổi tên, avatar) → đồng bộ lại follower
  if (eventName === 'update_user_info') {
    syncFollowers().catch(err => console.error('[Follower] sync lỗi:', err.message));
    return;
  }

  // Chào mừng khi follow OA
  if (eventName === 'follow') {
    await sendZaloText(userId,
      'Xin chào! Chào mừng bạn quan tâm OA Xã Đại Lộc 🏘️\n\n' +
      'Bạn có thể gửi góp ý, phản ánh tới chúng tôi bằng cách:\n' +
      '• Chọn mục "Góp ý, phản ánh" trong menu bên dưới\n' +
      '• Hoặc nhắn tin: #goopy'
    );
    return;
  }

  // User chia sẻ vị trí GPS
  if (eventName === 'user_send_location') {
    const loc = body.message?.location || body.message?.attachments?.[0]?.payload || {};
    const lat = loc.lat ?? loc.latitude;
    const lng = loc.long ?? loc.lng ?? loc.longitude;
    const address = loc.address || loc.name || '';
    if (lat != null && lng != null) {
      await handleLocation(userId, { lat: Number(lat), lng: Number(lng), address });
    }
    return;
  }

  // User gửi text
  if (eventName === 'user_send_text') {
    const text = (body.message?.text || '').trim();
    if (!text) return;

    // Kiểm tra contact card trong attachment
    const attachments = body.message?.attachments || [];
    const contactAttachment = attachments.find(a => a.type === 'contact');
    if (contactAttachment) {
      const phone = contactAttachment.payload?.phone || contactAttachment.payload?.phoneNumber || '';
      const contactName = contactAttachment.payload?.name || contactAttachment.payload?.display_name || displayName;
      if (phone) {
        await handleContactCard(userId, phone, contactName);
        return;
      }
    }

    // Kiểm tra location attachment trong user_send_text
    const locationAttachment = attachments.find(a => a.type === 'location');
    if (locationAttachment) {
      const p = locationAttachment.payload || {};
      const lat = p.lat ?? p.latitude;
      const lng = p.long ?? p.lng ?? p.longitude;
      const address = p.address || p.name || '';
      if (lat != null && lng != null) {
        await handleLocation(userId, { lat: Number(lat), lng: Number(lng), address });
        return;
      }
    }

    // Đang trong luồng tra cứu → xử lý chọn số / mã
    const state = getState(userId);
    if (state?.step === 'lookup_list') {
      await handleLookupReply(userId, text);
      return;
    }
    // Khi chưa có luồng nào đang chạy: bắt trigger tra cứu / mã trực tiếp
    if (!state) {
      if (isLookupTrigger(text)) {
        await startLookup(userId);
        return;
      }
      if (isDirectCode(text)) {
        await lookupByCode(userId, text);
        return;
      }
    }

    // Xử lý trong luồng góp ý (trigger chỉ kích hoạt khi chưa có luồng đang chạy)
    await handleText(userId, text, displayName);
    return;
  }

  // User click menu "Truy vấn tự động" (submit_info)
  if (eventName === 'user_submit_info') {
    const action = (body.info?.action_payload || body.info?.action || body.info?.data || '').trim();
    if (isLookupTrigger(action)) {
      await startLookup(userId);
      return;
    }
    if (isFeedbackTrigger(action) || action === '#goopy' || action === '#goppy') {
      await startFeedback(userId);
    }
    return;
  }

  // User gửi ảnh trực tiếp
  if (eventName === 'user_send_image') {
    const attachments = body.message?.attachments || [];
    const imageAtt = attachments.find(a => a.type === 'photo' || a.type === 'image');
    const imageUrl = imageAtt?.payload?.url || imageAtt?.payload?.thumbnail || '';
    if (imageUrl) {
      await handleImage(userId, imageUrl);
    }
    return;
  }

  // User gửi video trực tiếp
  if (eventName === 'user_send_video') {
    const attachments = body.message?.attachments || [];
    const videoAtt = attachments.find(a => a.type === 'video');
    const videoUrl = videoAtt?.payload?.url || '';
    if (videoUrl) {
      const { handleVideo } = require('../services/feedbackService');
      await handleVideo(userId, videoUrl);
    }
    return;
  }
}

module.exports = { handleWebhook };

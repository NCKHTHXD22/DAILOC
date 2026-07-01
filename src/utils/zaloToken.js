const axios = require('axios');

let _accessToken = process.env.ZALO_OA_TOKEN || '';
let _refreshToken = process.env.ZALO_REFRESH_TOKEN || '';
let _refreshTimer = null;

const EXPIRES_IN_MS = 90000 * 1000; // 25 hours
const REFRESH_BEFORE_MS = 2 * 60 * 60 * 1000; // 2 hours

async function redisCmd(...args) {
  const url = process.env.UPSTASH_REDIS_REST_URL?.replace(/['"]/g, '');
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.replace(/['"]/g, '');
  if (!url || !token) return null;
  try {
    const res = await axios.post(url, args, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    });
    return res.data.result;
  } catch (err) {
    console.error('[Redis]', err.message);
    return null;
  }
}

function getToken() {
  return _accessToken;
}

function scheduleRefresh(delayMs) {
  if (_refreshTimer) clearTimeout(_refreshTimer);

  // Thêm random jitter từ 0 đến 30 giây để tránh các PM2 instances cùng gọi Zalo API một lúc
  const jitter = Math.floor(Math.random() * 30000);
  const finalDelay = Math.max(0, delayMs + jitter);

  _refreshTimer = setTimeout(async () => {
    console.log('[ZaloToken] Proactive refresh token trước khi hết hạn...');
    try {
      await refreshAccessToken();
    } catch (err) {
      console.error('[ZaloToken] Proactive refresh thất bại:', err.message);
      // Retry sau 5 đến 10 phút (thêm jitter)
      const retryDelay = 5 * 60 * 1000 + Math.floor(Math.random() * 5 * 60 * 1000);
      scheduleRefresh(retryDelay);
    }
  }, finalDelay);

  const hours = Math.round(finalDelay / 3600000 * 10) / 10;
  console.log(`[ZaloToken] Sẽ tự refresh sau ${hours} giờ (đã thêm jitter)`);
}

async function refreshAccessToken() {
  const appId = process.env.ZALO_APP_ID;
  const appSecret = process.env.ZALO_APP_SECRET;

  if (!appId || !appSecret) {
    throw new Error('Thiếu ZALO_APP_ID / ZALO_APP_SECRET');
  }

  // 1. Kiểm tra lại Redis trước khi gọi API của Zalo. Có thể tiến trình khác đã refresh rồi.
  const redisAccess = await redisCmd('GET', 'dailoc_zalo_access_token');
  const redisRefresh = await redisCmd('GET', 'dailoc_zalo_refresh_token');
  const redisExpiresAt = await redisCmd('GET', 'dailoc_zalo_expires_at');

  if (redisAccess && redisExpiresAt) {
    const expiresAt = parseInt(redisExpiresAt);
    if (!isNaN(expiresAt) && (expiresAt - Date.now() > REFRESH_BEFORE_MS)) {
      _accessToken = redisAccess;
      if (redisRefresh) _refreshToken = redisRefresh;
      console.log('[ZaloToken] Tiến trình khác đã refresh trên Redis. Đã đồng bộ token mới.');
      scheduleRefresh(expiresAt - Date.now() - REFRESH_BEFORE_MS);
      return _accessToken;
    }
  }

  // 2. Chưa refresh hoặc sắp hết hạn -> gọi API Zalo
  const refreshToken = redisRefresh || _refreshToken || process.env.ZALO_REFRESH_TOKEN;
  if (!refreshToken) {
    throw new Error('Thiếu ZALO_REFRESH_TOKEN để refresh');
  }

  const params = new URLSearchParams();
  params.append('grant_type', 'refresh_token');
  params.append('app_id', appId);
  params.append('refresh_token', refreshToken);

  const res = await axios.post(
    'https://oauth.zaloapp.com/v4/oa/access_token',
    params,
    { headers: { secret_key: appSecret, 'Content-Type': 'application/x-www-form-urlencoded' } }
  );

  const { access_token, refresh_token, expires_in } = res.data;
  if (!access_token) throw new Error(`Refresh thất bại: ${JSON.stringify(res.data)}`);

  _accessToken = access_token;
  if (refresh_token) _refreshToken = refresh_token;

  const parsedExpiresIn = expires_in ? parseInt(expires_in) : 90000;
  const newExpiresAt = Date.now() + parsedExpiresIn * 1000;

  await redisCmd('SET', 'dailoc_zalo_access_token', access_token);
  if (refresh_token) await redisCmd('SET', 'dailoc_zalo_refresh_token', refresh_token);
  await redisCmd('SET', 'dailoc_zalo_expires_at', String(newExpiresAt));
  console.log('[ZaloToken] Refresh thành công, đã lưu vào Redis');

  scheduleRefresh(parsedExpiresIn * 1000 - REFRESH_BEFORE_MS);
  return access_token;
}

(async () => {
  // Đọc từ Redis trước
  const redisAccess = await redisCmd('GET', 'dailoc_zalo_access_token');
  const redisRefresh = await redisCmd('GET', 'dailoc_zalo_refresh_token');
  const redisExpiresAt = await redisCmd('GET', 'dailoc_zalo_expires_at');

  if (redisAccess) {
    _accessToken = redisAccess;
    _refreshToken = redisRefresh || process.env.ZALO_REFRESH_TOKEN || '';
    console.log('[ZaloToken] Đã đọc token từ Redis');
  } else {
    // Nếu Redis trống, dùng env var và đồng bộ
    const envAccess = process.env.ZALO_OA_TOKEN || '';
    const envRefresh = process.env.ZALO_REFRESH_TOKEN || '';
    if (envAccess) {
      _accessToken = envAccess;
      _refreshToken = envRefresh;
      const initialExpiresAt = Date.now() + EXPIRES_IN_MS;
      await redisCmd('SET', 'dailoc_zalo_access_token', envAccess);
      if (envRefresh) await redisCmd('SET', 'dailoc_zalo_refresh_token', envRefresh);
      await redisCmd('SET', 'dailoc_zalo_expires_at', String(initialExpiresAt));
      console.log('[ZaloToken] Redis trống — đã đồng bộ env var vào Redis');
    }
  }

  // Xác định xem có cần refresh ngay lập tức hay không
  let needsImmediateRefresh = true;
  let remainingTimeMs = 0;

  if (_accessToken) {
    const expiresAt = redisExpiresAt ? parseInt(redisExpiresAt) : NaN;
    if (!isNaN(expiresAt)) {
      remainingTimeMs = expiresAt - Date.now();
      if (remainingTimeMs > REFRESH_BEFORE_MS) {
        needsImmediateRefresh = false;
        console.log(`[ZaloToken] Khởi động: Token còn hiệu lực. Thời gian còn lại: ${Math.round(remainingTimeMs / 3600000 * 10) / 10} giờ.`);
      }
    }
  }

  if (needsImmediateRefresh) {
    try {
      console.log('[ZaloToken] Khởi động: Token hết hạn hoặc sắp hết hạn. Đang refresh...');
      await refreshAccessToken();
      console.log('[ZaloToken] Khởi động: Lấy access token mới thành công');
    } catch (err) {
      console.error('[ZaloToken] Khởi động: Không thể refresh:', err.message);
      if (_accessToken) {
        console.warn('[ZaloToken] Dùng token hiện tại làm fallback, retry sau 10 phút');
      }
      scheduleRefresh(10 * 60 * 1000);
    }
  } else {
    // Lên lịch refresh trước khi hết hạn
    scheduleRefresh(remainingTimeMs - REFRESH_BEFORE_MS);
  }
})();

async function setTokensManually(accessToken, refreshToken, expiresIn) {
  _accessToken = accessToken;
  _refreshToken = refreshToken;
  const parsedExpiresIn = expiresIn ? parseInt(expiresIn) : 90000;
  const expiresAt = Date.now() + parsedExpiresIn * 1000;

  await redisCmd('SET', 'dailoc_zalo_access_token', accessToken);
  await redisCmd('SET', 'dailoc_zalo_refresh_token', refreshToken);
  await redisCmd('SET', 'dailoc_zalo_expires_at', String(expiresAt));
  console.log('[ZaloToken] Token được set thủ công/OAuth, đã lưu vào Redis');
  
  scheduleRefresh(parsedExpiresIn * 1000 - REFRESH_BEFORE_MS);
}

module.exports = { getToken, refreshAccessToken, setTokensManually };

require('dotenv').config();
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const methodOverride = require('method-override');
const mongoose = require('mongoose');
const CONFIG = require('./src/config');
const { handleWebhook } = require('./src/handlers/webhookHandler');
const { setTokensManually } = require('./src/utils/zaloToken');

async function redisCmd(...args) {
  const url = process.env.UPSTASH_REDIS_REST_URL?.replace(/['"]/g, '');
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.replace(/['"]/g, '');
  if (!url || !token) return null;
  try {
    const axios = require('axios');
    const res = await axios.post(url, args, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    });
    return res.data.result;
  } catch (err) {
    console.error('[Redis]', err.message);
    return null;
  }
}

const app = express();

// CORS
app.use(cors({
  origin: [
    /\.vercel\.app$/,
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'http://localhost:5176',
    'http://localhost:5177',
    'http://localhost:3001',
    process.env.PUBLIC_URL,
  ].filter(Boolean),
  credentials: true,
}));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));

// Session (dùng cho JWT fallback)
app.use(session({
  secret: process.env.SESSION_SECRET || 'dailoc-goopy-secret-2025',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 8 * 60 * 60 * 1000,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    secure: process.env.NODE_ENV === 'production',
  },
}));

// Kết nối MongoDB + seed dữ liệu mặc định
mongoose.connect(CONFIG.MONGO_URI)
  .then(async () => {
    console.log('[MongoDB] Kết nối thành công');

    const AdminUser = require('./src/models/AdminUser');
    const Category = require('./src/models/Category');

    const adminCount = await AdminUser.countDocuments();
    if (adminCount === 0) {
      await AdminUser.create({
        username: 'admin',
        password: 'admin@2025',
        fullName: 'Quản trị viên',
        role: 'superadmin',
      });
      console.log('[Admin] Tài khoản mặc định: admin / admin@2025 — đổi mật khẩu sau khi đăng nhập!');
    }

    const catCount = await Category.countDocuments();
    if (catCount === 0) {
      const defaultCategories = [
        { name: 'Môi trường, Hạ tầng, Xây dựng',   zaloGroupId: process.env.ZALO_GROUP_MOITRUONG || 'unconfigured', icon: '🏗️', order: 1 },
        { name: 'Văn hoá, Giáo dục, Y tế',           zaloGroupId: process.env.ZALO_GROUP_VANHOA    || 'unconfigured', icon: '🏫', order: 2 },
        { name: 'Dịch vụ công, Thủ tục hành chính', zaloGroupId: process.env.ZALO_GROUP_DICHVUCONG || 'unconfigured', icon: '📋', order: 3 },
        { name: 'An ninh trật tự, PCCC',             zaloGroupId: process.env.ZALO_GROUP_ANNINH    || 'unconfigured', icon: '🚔', order: 4 },
      ];
      await Category.insertMany(defaultCategories);
      console.log('[Seed] Đã tạo 4 danh mục phản ánh mặc định');
    }
  })
  .catch(err => console.error('[MongoDB] Lỗi kết nối:', err.message));

// Request logging
app.use((req, res, next) => {
  console.log(`[REQ] ${req.method} ${req.path}`);
  next();
});

// ── GitHub Deploy Webhook ──────────────────────────────
app.post('/deploy', (req, res) => {
  const secret = process.env.DEPLOY_SECRET;
  if (secret) {
    const sig = req.headers['x-hub-signature-256'] || '';
    const expected = 'sha256=' + crypto.createHmac('sha256', secret)
      .update(JSON.stringify(req.body)).digest('hex');
    if (sig !== expected) {
      console.warn('[Deploy] Webhook signature không hợp lệ');
      return res.status(403).json({ error: 'Forbidden' });
    }
  }
  const { execSync } = require('child_process');
  const appDir = process.env.VPS_APP_DIR || path.join(__dirname, '..');
  const backendDir = path.join(appDir, 'Backend');
  console.log('[Deploy] Bắt đầu git pull + restart...');
  res.json({ ok: true, message: 'Deploying...' });
  try {
    execSync(`cd "${appDir}" && git pull origin main && cd "${backendDir}" && npm install --production`, { stdio: 'inherit' });
    console.log('[Deploy] Pull xong, đang restart pm2...');
    execSync('pm2 restart dailoc-oa', { stdio: 'inherit' });
    console.log('[Deploy] ✅ Deploy thành công');
  } catch (err) {
    console.error('[Deploy] ❌ Lỗi:', err.message);
  }
});

// ── Webhook Zalo ──────────────────────────────────────
app.get('/webhook', (req, res) => {
  console.log('[Webhook] Xác thực Zalo webhook:', req.query.token);
  res.json({ token: req.query.token || '' });
});

app.post('/webhook', async (req, res) => {
  res.sendStatus(200);
  try {
    await handleWebhook(req.body);
  } catch (err) {
    console.error('[Webhook] Lỗi xử lý:', err.message);
  }
});

// ── Zalo token thủ công ──
app.get('/set-tokens', (_req, res) => {
  res.type('html').send(`<!DOCTYPE html><html lang="vi"><head><meta charset="UTF-8"><title>Set Zalo Tokens - Đại Lộc</title>
  <style>body{font-family:sans-serif;max-width:600px;margin:40px auto;padding:0 20px}
  textarea{width:100%;padding:8px;margin:8px 0;box-sizing:border-box;height:80px;font-size:12px}
  button{background:#0068ff;color:white;padding:10px 24px;border:none;cursor:pointer;border-radius:4px;font-size:16px;margin-top:8px}
  .oauth-btn{background:#00c300;display:block;width:100%;text-align:center;text-decoration:none}
  label{font-weight:bold}hr{margin:24px 0}</style></head>
  <body><h2>Cập nhật Zalo Token - Đại Lộc</h2>
  <a class="oauth-btn" href="/oauth-start"><button type="button" style="width:100%;background:#00c300;font-size:18px">🔑 Cấp quyền tự động qua Zalo OAuth (Khuyên dùng)</button></a>
  <hr>
  <p>Hoặc dán token thủ công:</p>
  <form method="POST" action="/set-tokens">
    <label>Access Token:</label>
    <textarea name="access_token" placeholder="Dán access_token vào đây" required></textarea>
    <label>Refresh Token:</label>
    <textarea name="refresh_token" placeholder="Dán refresh_token vào đây" required></textarea>
    <button type="submit">Lưu vào Redis</button>
  </form></body></html>`);
});

app.post('/set-tokens', async (req, res) => {
  const { access_token, refresh_token } = req.body;
  if (!access_token || !refresh_token) return res.send('Lỗi: Cần cả 2 token');
  try {
    await setTokensManually(access_token.trim(), refresh_token.trim());
    res.send('<h2>✅ Token đã lưu vào Redis! Bot sẵn sàng hoạt động.</h2>');
  } catch (err) {
    res.send(`<h2>❌ Lỗi: ${err.message}</h2>`);
  }
});

// ── REST API ────────────────────────
const apiRouter = require('./api/routes/index');
app.use('/api', apiRouter);

// ── Zalo domain verifier ──
app.get(process.env.ZALO_VERIFIER_PATH || '/zalo_verifier.html', (req, res) => {
  res.type('html').send(process.env.ZALO_VERIFIER_CONTENT || 'There Is No Limit To What You Can Accomplish Using Zalo!');
});

// ── OAuth Zalo: khởi động flow PKCE ──
app.get('/oauth-start', async (req, res) => {
  const appId = process.env.ZALO_APP_ID;
  if (!appId) return res.type('html').send('<h2>❌ Thiếu ZALO_APP_ID trong .env</h2>');

  const codeVerifier = crypto.randomBytes(48).toString('base64url');
  const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
  const state = crypto.randomBytes(16).toString('hex');

  // Lưu code_verifier vào Redis 10 phút để dùng khi callback
  await redisCmd('SETEX', `zalo_pkce_${state}`, 600, codeVerifier);

  const redirectUri = `${process.env.PUBLIC_URL || 'https://dailoc.dxvtech.vn'}/oauth`;
  const authUrl = new URL('https://oauth.zaloapp.com/v4/oa/permission');
  authUrl.searchParams.set('app_id', appId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('code_challenge', codeChallenge);
  authUrl.searchParams.set('state', state);

  console.log('[OAuth] Khởi động PKCE flow, redirect đến Zalo:', authUrl.toString());
  res.redirect(authUrl.toString());
});

// ── OAuth callback Zalo ──
app.get('/oauth', async (req, res) => {
  const { code, state } = req.query;
  if (!code) return res.type('html').send('<h2>❌ Thiếu code OAuth</h2>');
  try {
    const axios = require('axios');
    const params = new URLSearchParams();
    params.append('code', code);
    params.append('app_id', process.env.ZALO_APP_ID);
    params.append('grant_type', 'authorization_code');

    // Nếu có state → lấy code_verifier từ Redis (PKCE flow)
    if (state) {
      const codeVerifier = await redisCmd('GET', `zalo_pkce_${state}`);
      if (codeVerifier) {
        params.append('code_verifier', codeVerifier);
        await redisCmd('DEL', `zalo_pkce_${state}`);
        console.log('[OAuth] Dùng PKCE code_verifier từ Redis');
      } else {
        console.warn('[OAuth] Không tìm thấy code_verifier cho state:', state);
      }
    }

    const r = await axios.post(
      'https://oauth.zaloapp.com/v4/oa/access_token',
      params,
      { headers: { secret_key: process.env.ZALO_APP_SECRET, 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    const { access_token, refresh_token, expires_in } = r.data;
    if (access_token) {
      await setTokensManually(access_token, refresh_token, expires_in);
      console.log('[OAuth] Lấy token mới từ OAuth thành công');
      return res.type('html').send('<h2>✅ Cấp quyền thành công! Token đã lưu. Bot sẵn sàng.</h2>');
    }
    console.error('[OAuth] Zalo trả về lỗi:', r.data);
    return res.type('html').send(`<h2>❌ Zalo lỗi: ${JSON.stringify(r.data)}</h2>`);
  } catch (err) {
    const detail = err.response?.data ? JSON.stringify(err.response.data) : err.message;
    console.error('[OAuth] Exception:', detail);
    return res.type('html').send(`<h2>❌ Lỗi: ${detail}</h2>`);
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', project: 'Đại Lộc - Góp ý', timestamp: new Date().toISOString() });
});

// ── Zalo site verification ──
app.get('/', (req, res, next) => {
  if (!req.query.code) {
    return res.type('html').send(`<!DOCTYPE html><html><head><meta name="zalo-platform-site-verification" content="${process.env.ZALO_SITE_VERIFICATION || ''}" /></head><body>Dai Loc - OA Zalo</body></html>`);
  }
  next();
});

// ── Static cho file upload broadcast (ảnh/video) — đặt trước catch-all React ──
app.use('/images', express.static(path.join(__dirname, 'public', 'images')));

// ── Serve React build ─────────────────────────────────
const webDist = path.join(__dirname, '..', 'Frontend', 'Web', 'dist');
if (require('fs').existsSync(webDist)) {
  app.use(express.static(webDist));
  app.get('*', (_req, res) => res.sendFile(path.join(webDist, 'index.html')));
} else {
  console.warn('[Web] Chưa build React. Chạy: cd Frontend/Web && npm run build');
}

app.listen(CONFIG.PORT, () => {
  console.log(`\n🚀 Server Đại Lộc Góp ý chạy tại http://localhost:${CONFIG.PORT}`);
  console.log(`📡 Webhook URL: http://localhost:${CONFIG.PORT}/webhook`);
  console.log(`🔑 Set tokens: http://localhost:${CONFIG.PORT}/set-tokens\n`);

  // Khởi động runner kiểm tra lịch hẹn gửi tin
  require('./src/admin/scheduledMessageService').startScheduledMessageRunner();

  // Khởi động đồng bộ lịch cắt điện Đại Lộc (EVNCPC)
  require('./src/services/catDienService').startAutoSync();

  // Khởi động đồng bộ văn bản hành chính (mỗi ngày 3h sáng)
  require('./src/services/vanBanHanhChinhService').startAutoSync();

  // Khởi động job đồng bộ phản ánh sang Cổng góp ý 1022 (quét lại mỗi 10 phút)
  require('./src/services/cgy1022RetryService').startCgy1022Retry();
});

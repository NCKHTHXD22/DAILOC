const router = require('express').Router()
const axios = require('axios')
const multer = require('multer')
const CONFIG = require('../../src/config')
const Category = require('../../src/models/Category')
const Feedback = require('../../src/models/Feedback')
const { uploadFromBuffer } = require('../../src/utils/cloudinary')
const { sendZaloText, sendZaloToGroup } = require('../../src/utils/zaloApi')

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 5 },
})

async function exchangeCodeForToken(code) {
  const tokenRes = await axios.post(
    'https://oauth.zaloapp.com/v4/access_token',
    new URLSearchParams({ code, app_id: CONFIG.ZALO_APP_ID, grant_type: 'authorization_code' }),
    { headers: { secret_key: CONFIG.ZALO_APP_SECRET, 'Content-Type': 'application/x-www-form-urlencoded' } }
  )
  const accessToken = tokenRes.data?.access_token
  if (!accessToken) throw new Error(`Đăng nhập Zalo thất bại: ${JSON.stringify(tokenRes.data)}`)
  return accessToken
}

async function fetchZaloProfile(accessToken) {
  const profileRes = await axios.get('https://graph.zalo.me/v2.0/me', {
    params: { fields: 'id,name,picture' },
    headers: { access_token: accessToken },
  })
  const { id, name, picture } = profileRes.data || {}
  if (!id) throw new Error(`Không lấy được thông tin Zalo: ${JSON.stringify(profileRes.data)}`)
  return { id: String(id), name: name || '', avatar: picture?.data?.url || '' }
}

// GET /api/public/categories
router.get('/categories', async (req, res) => {
  try {
    const categories = await Category.find({}, 'name icon order').sort({ order: 1 }).lean()
    res.json({ categories })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/public/zalo-login
router.post('/zalo-login', async (req, res) => {
  try {
    const { code } = req.body
    if (!code) return res.status(400).json({ error: 'Thiếu code đăng nhập Zalo' })
    const accessToken = await exchangeCodeForToken(code)
    const profile = await fetchZaloProfile(accessToken)
    res.json({ accessToken, profile })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// POST /api/public/feedbacks
router.post('/feedbacks', upload.array('images', 5), async (req, res) => {
  try {
    const { accessToken, contact, categoryId, content, address, lat, lng } = req.body
    if (!accessToken) return res.status(400).json({ error: 'Thiếu thông tin đăng nhập Zalo' })
    if (!contact || !(/^(0|\+84)[3-9]\d{8}$/.test(contact.replace(/\s/g, '')) || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.trim()))) {
      return res.status(400).json({ error: 'SĐT hoặc email không hợp lệ' })
    }
    if (!content || content.trim().length < 5) {
      return res.status(400).json({ error: 'Nội dung phản ánh quá ngắn (tối thiểu 5 ký tự)' })
    }

    const profile = await fetchZaloProfile(accessToken)

    let category = null
    if (categoryId) category = await Category.findById(categoryId).lean()

    const files = req.files || []
    const imageUrls = []
    for (const file of files) {
      const url = await uploadFromBuffer(file.buffer, `web-${Date.now()}-${imageUrls.length}`)
      imageUrls.push(url)
    }

    const location = {
      address: address?.trim() || '',
      lat: lat ? parseFloat(lat) : null,
      lng: lng ? parseFloat(lng) : null,
    }

    const deadline = new Date()
    deadline.setDate(deadline.getDate() + 5)

    const feedback = await Feedback.create({
      userId: profile.id,
      displayName: profile.name,
      contact: contact.trim(),
      content: content.trim(),
      location,
      imageUrl: imageUrls[0] || '',
      imageUrls,
      categoryId: category?._id || null,
      deadline,
    })

    const shortCode = feedback._id.toString().slice(-5).toUpperCase()
    const catLine = category ? `🏷️ Loại góp ý: ${category.name}\n` : ''
    const locLine = location.address ? `📍 Địa chỉ: ${location.address}\n` : ''
    const imgLine = imageUrls.length > 0 ? `🖼️ Hình ảnh: ${imageUrls.length} ảnh\n` : ''

    try {
      await sendZaloText(profile.id,
        `✅ ĐÃ TIẾP NHẬN PHẢN ÁNH!\n` +
        `${'─'.repeat(28)}\n` +
        `📋 THÔNG TIN GÓP Ý\n` +
        `${'─'.repeat(28)}\n` +
        `🆔 Mã phản ánh: #${shortCode}\n` +
        `📞 Liên hệ: ${contact.trim()}\n` +
        `${catLine}${locLine}${imgLine}` +
        `${'─'.repeat(28)}\n` +
        `🙏 Cảm ơn bạn đã tin tưởng gởi\nphản ánh tới UBND Xã Đại Lộc!`
      )
    } catch (err) {
      console.warn('[PublicFeedback] Không gửi được tin xác nhận:', err.message)
    }

    const now = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })
    const nameInfo = profile.name ? `👤 Tên: ${profile.name}\n` : ''
    const catInfo = category ? `🏷️ Loại: ${category.name}\n` : ''
    const locationInfo = location.address ? `📍 Địa chỉ: ${location.address}\n` : ''
    const imageInfo = imageUrls.length > 0
      ? `🖼️ ${imageUrls.length} ảnh:\n${imageUrls.map((u, i) => `  ${i + 1}. ${u}`).join('\n')}`
      : '🖼️ Ảnh: Không có'

    const groupMsg =
      `📩 PHẢN ÁNH MỚI - ${now}\n` +
      `${'─'.repeat(30)}\n` +
      `${nameInfo}📞 Liên hệ: ${contact.trim()}\n` +
      `${catInfo}${locationInfo}` +
      `📝 Nội dung:\n${content.trim()}\n` +
      `${imageInfo}\n🆔 Mã: #${shortCode}`

    await sendZaloToGroup(groupMsg, category?.zaloGroupId || null)

    res.status(201).json({ ok: true, code: shortCode })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/public/feedbacks/map
router.get('/feedbacks/map', async (req, res) => {
  try {
    const feedbacks = await Feedback.find({
      status: { $nin: ['resolved', 'done'] },
      'location.lat': { $ne: null },
      'location.lng': { $ne: null },
    })
      .select('location content categoryId createdAt status')
      .populate('categoryId', 'name icon')
      .lean()

    const points = feedbacks.map(fb => ({
      lat: fb.location.lat,
      lng: fb.location.lng,
      address: fb.location.address || '',
      content: fb.content.slice(0, 80) + (fb.content.length > 80 ? '...' : ''),
      category: fb.categoryId ? `${fb.categoryId.icon || ''} ${fb.categoryId.name}`.trim() : 'Phản ánh',
      status: fb.status,
      createdAt: fb.createdAt,
    }))

    res.json({ points })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router

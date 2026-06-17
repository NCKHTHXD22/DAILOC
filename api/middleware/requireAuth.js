const jwt = require('jsonwebtoken')
const JWT_SECRET = process.env.JWT_SECRET || 'dailoc-jwt-secret-2025'

module.exports = (req, res, next) => {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Chưa đăng nhập' })
  }
  try {
    req.user = jwt.verify(authHeader.slice(7), JWT_SECRET)
    next()
  } catch {
    res.status(401).json({ error: 'Token không hợp lệ hoặc đã hết hạn' })
  }
}

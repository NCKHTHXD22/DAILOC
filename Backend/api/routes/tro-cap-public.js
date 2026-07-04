const router = require('express').Router()
const TroCapSchedule = require('../../src/models/TroCapSchedule')

// GET /api/tro-cap-public/search?thang=7&nam=2026
router.get('/search', async (req, res) => {
  try {
    const now = new Date()
    const thang = parseInt(req.query.thang) || now.getMonth() + 1
    const nam = parseInt(req.query.nam) || now.getFullYear()

    const items = await TroCapSchedule.find({
      ngayChiTra: { $gte: new Date(nam, thang - 1, 1), $lt: new Date(nam, thang, 1) },
    }).sort({ ngayChiTra: 1 }).lean()

    res.json({ thang, nam, count: items.length, items })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router

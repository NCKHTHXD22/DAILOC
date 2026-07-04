const router = require('express').Router();
const { searchVanBan, listFilterOptions, syncVanBan } = require('../../src/services/vanBanHanhChinhService');

// GET /api/van-ban-hanh-chinh/search?soHieu=&trichYeu=&...&page=1
router.get('/search', async (req, res) => {
  try {
    const { page = 1, ...filters } = req.query;
    const result = await searchVanBan(filters, page);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/van-ban-hanh-chinh/filters
router.get('/filters', async (req, res) => {
  try {
    const options = await listFilterOptions();
    res.json(options);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/van-ban-hanh-chinh/sync
router.post('/sync', async (req, res) => {
  try {
    const result = await syncVanBan();
    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

const router = require('express').Router();
const { getOutages, syncOutages, listStations, getOutagesByStations } = require('../../src/services/catDienService');

// GET /api/cat-dien?q=12/06&donVi=PC05HH
router.get('/', async (req, res) => {
  try {
    const { q = '', donVi } = req.query;
    const items = await getOutages(q, donVi);
    res.json({ count: items.length, items });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/cat-dien/stations?donVi=PC05HH
router.get('/stations', async (req, res) => {
  try {
    const { donVi } = req.query;
    const stations = await listStations(donVi);
    res.json({ stations });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/cat-dien/search?station=Tram+A&dateFrom=20/07&dateTo=25/07&donVi=PC05HH
router.get('/search', async (req, res) => {
  try {
    const { station = '', date = '', dateFrom = '', dateTo = '', donVi } = req.query;
    const stationNames = station ? station.split(',').map((s) => s.trim()).filter(Boolean) : [];
    const items = await getOutagesByStations(stationNames, dateFrom || date, dateTo, donVi);
    res.json({ count: items.length, items });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/cat-dien/sync
router.post('/sync', async (req, res) => {
  try {
    const synced = await syncOutages();
    res.json({ ok: true, synced });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

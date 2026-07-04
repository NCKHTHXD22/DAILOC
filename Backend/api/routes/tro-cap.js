const router = require('express').Router()
const TroCapSchedule = require('../../src/models/TroCapSchedule')

// GET /api/tro-cap?thang=&nam=
router.get('/', async (req, res) => {
  try {
    const { thang, nam } = req.query
    const filter = {}
    if (thang && nam) {
      const y = parseInt(nam), m = parseInt(thang)
      filter.ngayChiTra = {
        $gte: new Date(y, m - 1, 1),
        $lt: new Date(y, m, 1),
      }
    }
    const items = await TroCapSchedule.find(filter).sort({ ngayChiTra: 1 }).lean()
    res.json({ items })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/tro-cap
router.post('/', async (req, res) => {
  try {
    const {
      phuongCu, phuongMoi, ngayChiTra, khungGio, diaDiem, nhanVienTen, nhanVienSdt, ghiChu,
      loaiTroCap, soLuong, donVi, soTien, hinhThuc,
    } = req.body
    if (!phuongMoi || !ngayChiTra || !diaDiem) {
      return res.status(400).json({ error: 'Thiếu phường mới, ngày chi trả hoặc địa điểm' })
    }
    const item = await TroCapSchedule.create({
      phuongCu: phuongCu || '', phuongMoi, ngayChiTra: new Date(ngayChiTra),
      khungGio: khungGio || '', diaDiem, nhanVienTen: nhanVienTen || '', nhanVienSdt: nhanVienSdt || '',
      ghiChu: ghiChu || '',
      loaiTroCap: loaiTroCap || 'baotro', soLuong: parseInt(soLuong) || 0, donVi: donVi || 'người',
      soTien: parseInt(soTien) || 0, hinhThuc: hinhThuc || 'cash',
      createdBy: req.user?.id || null,
    })
    res.status(201).json({ item })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PUT /api/tro-cap/:id
router.put('/:id', async (req, res) => {
  try {
    const {
      phuongCu, phuongMoi, ngayChiTra, khungGio, diaDiem, nhanVienTen, nhanVienSdt, ghiChu,
      loaiTroCap, soLuong, donVi, soTien, hinhThuc,
    } = req.body
    await TroCapSchedule.findByIdAndUpdate(req.params.id, {
      phuongCu, phuongMoi, ngayChiTra: ngayChiTra ? new Date(ngayChiTra) : undefined,
      khungGio, diaDiem, nhanVienTen, nhanVienSdt, ghiChu,
      loaiTroCap, soLuong: soLuong !== undefined ? parseInt(soLuong) || 0 : undefined,
      donVi, soTien: soTien !== undefined ? parseInt(soTien) || 0 : undefined, hinhThuc,
      updatedAt: new Date(),
    })
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/tro-cap/:id
router.delete('/:id', async (req, res) => {
  try {
    await TroCapSchedule.findByIdAndDelete(req.params.id)
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router

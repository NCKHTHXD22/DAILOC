function newestYear(items) {
  let y = 0
  items.forEach((it) => {
    const d = it.ngayBanHanh ? new Date(it.ngayBanHanh).getFullYear() : 0
    if (d > y) y = d
  })
  return y || '—'
}

// "Đã có hiệu lực" = văn bản có ngày hiệu lực và đã tới ngày đó — không khẳng định
// văn bản chưa bị bãi bỏ/thay thế (hệ thống chưa theo dõi trạng thái bãi bỏ).
function effectivePct(items) {
  if (!items.length) return 0
  const today = new Date()
  const n = items.filter((it) => it.ngayHieuLuc && new Date(it.ngayHieuLuc) <= today).length
  return Math.round((n / items.length) * 100)
}

export default function StatsRow({ items, totalCount }) {
  return (
    <div className="grid grid-cols-3 gap-2.5 animate-fade-in">
      <div className="bg-white rounded-2xl p-[13px_12px]" style={{ boxShadow: '0 10px 26px -16px rgba(90,70,170,0.4)' }}>
        <div className="w-[30px] h-[30px] rounded-[9px] grid place-items-center text-sm" style={{ background: '#ede9fe', color: '#7c3aed' }}>◉</div>
        <div className="mt-2 text-[19px] font-extrabold" style={{ color: '#2e2a44' }}>{totalCount}</div>
        <div className="text-[10.5px]" style={{ color: '#8b88a3' }}>văn bản</div>
      </div>
      <div className="bg-white rounded-2xl p-[13px_12px]" style={{ boxShadow: '0 10px 26px -16px rgba(90,70,170,0.4)' }}>
        <div className="w-[30px] h-[30px] rounded-[9px] grid place-items-center text-sm" style={{ background: '#dcfce7', color: '#16a34a' }}>◨</div>
        <div className="mt-2 text-[19px] font-extrabold" style={{ color: '#2e2a44' }}>{newestYear(items)}</div>
        <div className="text-[10.5px]" style={{ color: '#8b88a3' }}>năm mới nhất</div>
      </div>
      <div className="bg-white rounded-2xl p-[13px_12px]" style={{ boxShadow: '0 10px 26px -16px rgba(90,70,170,0.4)' }}>
        <div className="w-[30px] h-[30px] rounded-[9px] grid place-items-center text-sm" style={{ background: '#dbeafe', color: '#2563eb' }}>▦</div>
        <div className="mt-2 text-[19px] font-extrabold" style={{ color: '#2e2a44' }}>{effectivePct(items)}%</div>
        <div className="text-[10.5px]" style={{ color: '#8b88a3' }}>đã có hiệu lực</div>
      </div>
    </div>
  )
}

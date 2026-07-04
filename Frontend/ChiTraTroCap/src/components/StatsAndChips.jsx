import { CheckCircle2, Users, Landmark, CreditCard } from 'lucide-react'
import { CATEGORIES } from '@/lib/categories'

function fmt(n) {
  return (n || 0).toLocaleString('vi-VN')
}

export default function StatsAndChips({ items, thang, nam, filter, onFilter }) {
  const people = items.reduce((s, x) => s + (x.soLuong || 0), 0)
  const money = items.reduce((s, x) => s + (x.soTien || 0), 0)
  const bankCount = items.filter((x) => x.hinhThuc === 'bank').length
  const bankPct = items.length ? Math.round((bankCount / items.length) * 100) : 0

  const chipDefs = [{ key: 'all', label: 'Tất cả', dot: '#8b5cf6' }, ...Object.entries(CATEGORIES).map(([key, c]) => ({ key, label: c.shortLabel, dot: c.dot }))]

  return (
    <div className="flex flex-col gap-[13px]">
      <div className="flex items-center gap-[9px] px-0.5 text-sm font-medium text-[#475569]">
        <CheckCircle2 className="h-[17px] w-[17px] text-[#7c3aed]" />
        <span>Có <b className="text-[#7c3aed] font-extrabold">{items.length}</b> lịch chi trả trong tháng {thang}/{nam}</span>
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        <div className="bg-white rounded-[17px] p-[13px_11px] border border-[#eef0f6]" style={{ boxShadow: '0 8px 22px -16px rgba(30,41,59,.4)' }}>
          <div className="w-[30px] h-[30px] rounded-[9px] flex items-center justify-center text-white mb-2" style={{ background: 'linear-gradient(135deg,#8b5cf6,#6366f1)' }}>
            <Users className="h-4 w-4" />
          </div>
          <div className="text-[19px] font-extrabold tracking-tight text-[#0f172a]">{fmt(people)}</div>
          <div className="text-[11px] text-[#94a3b8] font-medium">đối tượng</div>
        </div>
        <div className="bg-white rounded-[17px] p-[13px_11px] border border-[#eef0f6]" style={{ boxShadow: '0 8px 22px -16px rgba(30,41,59,.4)' }}>
          <div className="w-[30px] h-[30px] rounded-[9px] flex items-center justify-center text-white mb-2" style={{ background: 'linear-gradient(135deg,#34d399,#10b981)' }}>
            <Landmark className="h-4 w-4" />
          </div>
          <div className="text-[19px] font-extrabold tracking-tight text-[#0f172a]">{(money / 1e6).toLocaleString('vi-VN', { maximumFractionDigits: 2 })}<small className="text-xs font-semibold text-[#94a3b8]">tr</small></div>
          <div className="text-[11px] text-[#94a3b8] font-medium">tổng kinh phí</div>
        </div>
        <div className="bg-white rounded-[17px] p-[13px_11px] border border-[#eef0f6]" style={{ boxShadow: '0 8px 22px -16px rgba(30,41,59,.4)' }}>
          <div className="w-[30px] h-[30px] rounded-[9px] flex items-center justify-center text-white mb-2" style={{ background: 'linear-gradient(135deg,#38bdf8,#3b82f6)' }}>
            <CreditCard className="h-4 w-4" />
          </div>
          <div className="text-[19px] font-extrabold tracking-tight text-[#0f172a]">{bankPct}<small className="text-xs font-semibold text-[#94a3b8]">%</small></div>
          <div className="text-[11px] text-[#94a3b8] font-medium">qua tài khoản</div>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 pt-0.5 px-0.5">
        {chipDefs.map((c) => {
          const cnt = c.key === 'all' ? items.length : items.filter((x) => x.loaiTroCap === c.key).length
          const active = filter === c.key
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => onFilter(c.key)}
              className={`inline-flex items-center gap-[7px] px-[13px] py-[9px] rounded-full text-[12.5px] font-semibold whitespace-nowrap border ${active ? 'text-white border-transparent' : 'text-[#475569] border-[#e7e9f2] bg-white'}`}
              style={active ? { background: 'linear-gradient(135deg,#6366f1 0%,#8b5cf6 40%,#d946ef 74%,#fb7185 100%)', boxShadow: '0 8px 16px -8px rgba(99,102,241,.7)' } : undefined}
            >
              <span className="w-[7px] h-[7px] rounded-full shrink-0" style={{ background: c.dot }} />
              {c.label}
              <span className={`text-[11px] font-bold px-1.5 rounded-full ${active ? 'bg-white/25 text-white' : 'bg-[#f1f2f7] text-[#64748b]'}`}>{cnt}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

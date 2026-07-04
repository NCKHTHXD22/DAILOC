import { Calendar, Clock, ChevronDown, Search, Loader2 } from 'lucide-react'

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1)
const HERO_GRAD = 'linear-gradient(135deg,#6366f1 0%,#8b5cf6 40%,#d946ef 74%,#fb7185 100%)'

export default function SelectorCard({ thang, nam, onThang, onNam, years, onSearch, loading }) {
  return (
    <div className="bg-white rounded-[22px] p-[18px] border border-[#eef0f6]" style={{ boxShadow: '0 12px 34px -20px rgba(30,41,59,.35)' }}>
      <div className="flex items-center gap-2 mb-[13px]">
        <Calendar className="h-[15px] w-[15px] text-[#7c3aed]" />
        <span className="font-mono text-[11.5px] font-semibold tracking-[1.4px] text-[#64748b]">CHỌN THÁNG / NĂM</span>
      </div>

      <div className="grid grid-cols-2 gap-[11px]">
        <div className="relative">
          <Calendar className="absolute left-[13px] top-1/2 -translate-y-1/2 h-[17px] w-[17px] text-[#8b5cf6] pointer-events-none" />
          <select
            value={thang}
            onChange={(e) => onThang(Number(e.target.value))}
            className="appearance-none w-full py-[13px] pl-10 pr-[38px] rounded-[14px] border border-[#e7e9f2] text-[14.5px] font-semibold text-[#0f172a] bg-[#f7f8fc] cursor-pointer"
          >
            {MONTHS.map((m) => <option key={m} value={m}>Tháng {m}</option>)}
          </select>
          <ChevronDown className="absolute right-[13px] top-1/2 -translate-y-1/2 h-4 w-4 text-[#94a3b8] pointer-events-none" />
        </div>
        <div className="relative">
          <Clock className="absolute left-[13px] top-1/2 -translate-y-1/2 h-[17px] w-[17px] text-[#06b6d4] pointer-events-none" />
          <select
            value={nam}
            onChange={(e) => onNam(Number(e.target.value))}
            className="appearance-none w-full py-[13px] pl-10 pr-[38px] rounded-[14px] border border-[#e7e9f2] text-[14.5px] font-semibold text-[#0f172a] bg-[#f7f8fc] cursor-pointer"
          >
            {years.map((y) => <option key={y} value={y}>Năm {y}</option>)}
          </select>
          <ChevronDown className="absolute right-[13px] top-1/2 -translate-y-1/2 h-4 w-4 text-[#94a3b8] pointer-events-none" />
        </div>
      </div>

      <button
        type="button"
        onClick={onSearch}
        disabled={loading}
        className="mt-[13px] w-full border-none cursor-pointer text-white text-[15.5px] font-bold py-[15px] rounded-2xl flex items-center justify-center gap-2.5 active:scale-[.98] transition-transform disabled:opacity-70"
        style={{ background: HERO_GRAD, boxShadow: '0 14px 26px -10px rgba(124,58,237,.65)' }}
      >
        {loading ? <Loader2 className="h-[19px] w-[19px] animate-spin" /> : <Search className="h-[19px] w-[19px]" />}
        {loading ? 'Đang tìm kiếm...' : 'Tra cứu lịch chi trả'}
      </button>
    </div>
  )
}

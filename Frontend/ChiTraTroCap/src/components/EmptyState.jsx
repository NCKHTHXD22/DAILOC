import { CalendarX2, RotateCcw } from 'lucide-react'

const HERO_GRAD = 'linear-gradient(135deg,#6366f1 0%,#8b5cf6 40%,#d946ef 74%,#fb7185 100%)'

export default function EmptyState({ thang, nam, onGoRecent }) {
  return (
    <div className="bg-white rounded-3xl p-9 px-6 border border-[#eef0f6] flex flex-col items-center text-center gap-1.5" style={{ boxShadow: '0 12px 34px -22px rgba(30,41,59,.4)' }}>
      <div className="w-[74px] h-[74px] rounded-[22px] flex items-center justify-center text-white mb-2" style={{ background: HERO_GRAD, boxShadow: '0 16px 30px -12px rgba(124,58,237,.6)' }}>
        <CalendarX2 className="h-9 w-9" />
      </div>
      <h3 className="m-0 text-[16.5px] font-bold text-[#0f172a]">Chưa có lịch chi trả</h3>
      <p className="m-0 text-[13.5px] text-[#64748b] leading-relaxed max-w-[280px]">
        Chưa có lịch chi trả nào được công bố cho tháng {thang}/{nam}. Vui lòng chọn tháng khác.
      </p>
      <button
        type="button"
        onClick={onGoRecent}
        className="mt-3 px-5 py-[11px] rounded-[13px] border border-[#ddd6fe] bg-[#f5f3ff] text-[#7c3aed] text-[13.5px] font-bold cursor-pointer inline-flex items-center gap-1.5 active:scale-[.98] transition-transform"
      >
        <RotateCcw className="h-4 w-4" /> Xem tháng gần nhất
      </button>
    </div>
  )
}

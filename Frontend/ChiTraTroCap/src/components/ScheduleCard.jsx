import { MapPin, Users, CreditCard, Banknote } from 'lucide-react'
import { CATEGORIES, statusOf, statusStyle, weekday, ddmm } from '@/lib/categories'

function fmt(n) {
  return (n || 0).toLocaleString('vi-VN')
}

export default function ScheduleCard({ item, code, delay = '0s' }) {
  const cat = CATEGORIES[item.loaiTroCap] || CATEGORIES.baotro
  const Icon = cat.icon
  const status = statusOf(item.ngayChiTra)
  const ss = statusStyle(status)
  const bank = item.hinhThuc === 'bank'

  return (
    <div
      className="relative overflow-hidden bg-white rounded-[22px] p-4 border border-[#eef0f6] animate-card-in"
      style={{ boxShadow: '0 12px 32px -20px rgba(30,41,59,.4)', animationDelay: delay }}
    >
      <div className="absolute left-0 top-0 bottom-0 w-[5px]" style={{ background: cat.grad }} />

      <div className="flex items-start gap-3">
        <div className="w-[52px] h-[52px] rounded-2xl flex items-center justify-center text-white shrink-0" style={{ background: cat.grad }}>
          <Icon className="h-6 w-6" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-mono text-[10.5px] font-semibold tracking-wide" style={{ color: cat.ink }}>{code}</div>
          <div className="text-[15px] font-bold leading-tight text-[#0f172a] mt-0.5">{cat.label}</div>
        </div>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-[5px] rounded-full text-[11.5px] font-semibold whitespace-nowrap shrink-0" style={{ background: ss.bg, color: ss.color }}>
          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: ss.dot }} />
          {status}
        </span>
      </div>

      <div className="flex gap-3 mt-3.5 items-stretch">
        <div className="flex flex-col items-center justify-center min-w-[62px] px-1.5 py-2 rounded-2xl shrink-0" style={{ background: cat.soft, color: cat.ink }}>
          <div className="text-base font-extrabold tracking-tight">{ddmm(item.ngayChiTra)}</div>
          <div className="text-[10.5px] font-semibold opacity-85 mt-0.5">{weekday(item.ngayChiTra)}</div>
        </div>
        <div className="flex-1 min-w-0 flex flex-col justify-center gap-1.5">
          <div className="flex items-center gap-1.5 text-[13px] font-medium text-[#475569]">
            <MapPin className="h-[15px] w-[15px] text-[#94a3b8] shrink-0" />
            <span className="truncate">{item.diaDiem}{item.khungGio ? ` · ${item.khungGio}` : ''}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[13px] font-medium text-[#475569]">
            <Users className="h-[15px] w-[15px] text-[#94a3b8] shrink-0" />
            <span>{fmt(item.soLuong)} {item.donVi}</span>
          </div>
        </div>
      </div>

      <div className="h-px bg-[#f1f2f7] my-3.5" />

      <div className="flex items-center justify-between gap-2.5">
        <div>
          <div className="text-[10.5px] text-[#94a3b8] font-medium">Kinh phí chi trả</div>
          <div className="text-[19px] font-extrabold tracking-tight" style={{ color: cat.ink }}>{fmt(item.soTien)} <small className="text-[13px] font-semibold">đ</small></div>
        </div>
        <span
          className="inline-flex items-center gap-1.5 px-[11px] py-2 rounded-[11px] text-xs font-semibold whitespace-nowrap"
          style={bank ? { background: '#eff6ff', color: '#2563eb' } : { background: '#fff7ed', color: '#c2410c' }}
        >
          {bank ? <CreditCard className="h-3.5 w-3.5" /> : <Banknote className="h-3.5 w-3.5" />}
          {bank ? 'Qua tài khoản' : 'Tiền mặt'}
        </span>
      </div>
    </div>
  )
}

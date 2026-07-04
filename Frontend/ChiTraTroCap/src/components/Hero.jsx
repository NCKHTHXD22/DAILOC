import { Landmark, HeartHandshake, Award } from 'lucide-react'

const HERO_GRAD = 'linear-gradient(135deg,#6366f1 0%,#8b5cf6 40%,#d946ef 74%,#fb7185 100%)'

export default function Hero({ period }) {
  return (
    <div
      className="relative overflow-hidden rounded-[26px] p-5 text-white"
      style={{ background: HERO_GRAD, boxShadow: '0 22px 44px -20px rgba(124,58,237,.65)' }}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-[.55] pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,.18) 1px, transparent 1px)', backgroundSize: '15px 15px' }}
      />
      <div
        aria-hidden="true"
        className="absolute -top-[46px] -right-[34px] w-40 h-40 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(255,255,255,.4), transparent 70%)' }}
      />

      <div className="relative flex flex-col gap-[15px]">
        <div className="flex items-center justify-between gap-2.5">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-[5px] rounded-full font-mono text-[10.5px] font-semibold tracking-[1.4px] bg-white/[.18] border border-white/[.28]">
            <Award className="h-3 w-3" /> CHUYỂN ĐỔI SỐ
          </span>
          <span className="font-mono text-xs font-semibold opacity-90">{period}</span>
        </div>

        <div className="flex items-center gap-[13px]">
          <div className="w-[54px] h-[54px] shrink-0 rounded-2xl flex items-center justify-center bg-white/20 border border-white/30 backdrop-blur-[6px]">
            <Landmark className="h-[26px] w-[26px]" />
          </div>
          <div>
            <div className="text-xl font-extrabold tracking-tight leading-[1.1]">Lịch chi trả trợ cấp</div>
            <div className="text-[13px] font-medium opacity-90 mt-0.5">UBND xã Đại Lộc</div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 px-[11px] py-[6px] rounded-full text-[11.5px] font-semibold bg-white/[.16] border border-white/[.24]">
            <HeartHandshake className="h-[13px] w-[13px]" /> Trợ cấp xã hội
          </span>
          <span className="inline-flex items-center gap-1.5 px-[11px] py-[6px] rounded-full text-[11.5px] font-semibold bg-white/[.16] border border-white/[.24]">
            <Award className="h-[13px] w-[13px]" /> Người có công
          </span>
        </div>
      </div>
    </div>
  )
}

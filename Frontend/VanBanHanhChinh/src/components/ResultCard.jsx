const ICON_THEMES = [
  { icon: '⚑', bg: 'linear-gradient(135deg,#f59e0b,#f97316)', text: '#ea580c' },
  { icon: '♡', bg: 'linear-gradient(135deg,#3b82f6,#06b6d4)', text: '#2563eb' },
  { icon: '◈', bg: 'linear-gradient(135deg,#8b5cf6,#ec4899)', text: '#7c3aed' },
  { icon: '▤', bg: 'linear-gradient(135deg,#10b981,#14b8a6)', text: '#0d9488' },
]

function themeFor(soHieu) {
  let hash = 0
  for (let i = 0; i < (soHieu || '').length; i++) hash = (hash + soHieu.charCodeAt(i)) % ICON_THEMES.length
  return ICON_THEMES[hash]
}

function formatDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  const p = (n) => String(n).padStart(2, '0')
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`
}

const WD = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']

export default function ResultCard({ item, delay = '0s' }) {
  const th = themeFor(item.soHieu)
  const d = item.ngayBanHanh ? new Date(item.ngayBanHanh) : null
  const day = d ? `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}` : '—'
  const weekday = d ? WD[d.getDay()] : ''

  return (
    <a
      href={item.detailUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="relative block rounded-[18px] p-4 bg-white opacity-0 animate-reveal-up overflow-hidden transition-transform hover:-translate-y-0.5"
      style={{ boxShadow: '0 12px 32px -20px rgba(90,70,170,0.5)', animationDelay: delay }}
    >
      <div className="absolute top-0 left-0 w-1 h-full" style={{ background: th.bg }} />
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 shrink-0 rounded-[13px] grid place-items-center text-white text-lg" style={{ background: th.bg, boxShadow: `0 8px 18px -8px ${th.text}` }}>
          {th.icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[10.5px] font-bold tracking-wide" style={{ color: th.text }}>{item.loaiVanBan || 'VB'} · {item.soHieu || '—'}</span>
            <span className="ml-auto inline-flex items-center gap-1.5 text-[10.5px] font-semibold text-[#16a34a] whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e]" /> Tra cứu chi tiết
            </span>
          </div>
          <div className="mt-1 text-sm font-bold leading-snug text-[#2e2a44]">{item.trichYeu}</div>
        </div>
      </div>
      <div className="flex items-center gap-3.5 mt-3 pt-3 border-t border-[#f0edf8]">
        <div className="text-center shrink-0">
          <div className="text-[17px] font-extrabold leading-none" style={{ color: th.text }}>{day}</div>
          <div className="text-[10px] text-[#8b88a3] mt-0.5">{weekday}</div>
        </div>
        <div className="w-px h-[30px] bg-[#f0edf8]" />
        <div className="min-w-0 text-xs text-[#6b6685] leading-relaxed">
          <div>◈ {item.linhVuc}{item.coQuanBanHanh ? ` · ${item.coQuanBanHanh}` : ''}</div>
          <div className="text-[#8b88a3]">◷ Ban hành {formatDate(item.ngayBanHanh)}{item.ngayHieuLuc ? ` · Hiệu lực ${formatDate(item.ngayHieuLuc)}` : ''}</div>
        </div>
      </div>
    </a>
  )
}

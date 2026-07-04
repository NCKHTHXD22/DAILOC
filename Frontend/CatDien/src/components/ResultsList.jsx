import { Clock, CheckCircle2 } from 'lucide-react'

function pad(n) { return String(n).padStart(2, '0') }

function formatDate(iso) {
  const d = new Date(iso)
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`
}

function formatTime(iso) {
  const d = new Date(iso)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function typeColor(type) {
  const t = (type || '').toLowerCase()
  if (t.includes('sự cố') || t.includes('đột xuất')) return 'bg-red-500'
  return 'bg-orange-500'
}

export default function ResultsList({ items, searched }) {
  if (!searched) return null

  if (items.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-6 text-center space-y-2">
        <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto" />
        <p className="text-sm font-medium text-foreground">Hiện không có lịch tạm ngừng cấp điện</p>
        <p className="text-xs text-muted-foreground">Thử chọn trạm hoặc thời gian khác.</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-bold text-foreground">Kết quả: {items.length} lịch tạm ngừng cấp điện</p>
      {items.map((it) => (
        <div key={it._id} className="card-hover rounded-lg border bg-card p-4 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-bold text-foreground">{it.stationName || '—'}</span>
            <span className={`text-xs font-bold text-white px-2.5 py-0.5 rounded whitespace-nowrap ${typeColor(it.outageType)}`}>
              {it.outageType || '—'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
            <Clock className="h-3.5 w-3.5" />
            {formatDate(it.fromDate)} · {formatTime(it.fromDate)} – {formatTime(it.toDate)}
          </div>
          {it.reason && <p className="text-xs text-muted-foreground leading-relaxed">{it.reason}</p>}
        </div>
      ))}
    </div>
  )
}

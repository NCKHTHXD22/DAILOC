import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']

function daysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate()
}

// Thứ của ngày 1 trong tháng, quy về mốc Thứ2=0 ... CN=6 (lịch Việt Nam bắt đầu từ Thứ2)
function firstWeekdayOffset(year, month) {
  const jsDay = new Date(year, month, 1).getDay() // 0=CN...6=T7
  return (jsDay + 6) % 7
}

function isSameDay(a, b) {
  return a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function startOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

export default function Calendar({ rangeFrom, rangeTo, onSelect }) {
  const today = new Date()
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1))

  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const total = daysInMonth(year, month)
  const offset = firstWeekdayOffset(year, month)

  const cells = []
  for (let i = 0; i < offset; i++) cells.push(null)
  for (let d = 1; d <= total; d++) cells.push(d)

  function changeMonth(delta) {
    setViewDate(new Date(year, month + delta, 1))
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={() => changeMonth(-1)}
          className="h-8 w-8 rounded-full bg-muted flex items-center justify-center hover:bg-accent"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-bold uppercase">Tháng {month + 1} năm {year}</span>
        <button
          type="button"
          onClick={() => changeMonth(1)}
          className="h-8 w-8 rounded-full bg-muted flex items-center justify-center hover:bg-accent"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center mb-1">
        {WEEKDAYS.map((w) => (
          <span key={w} className="text-xs font-semibold text-muted-foreground py-1">{w}</span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (d === null) return <span key={`empty-${i}`} />
          const cellDate = new Date(year, month, d)
          const isFrom = isSameDay(cellDate, rangeFrom)
          const isTo = isSameDay(cellDate, rangeTo)
          const isEndpoint = isFrom || isTo
          const inRange = rangeFrom && rangeTo && !isEndpoint
            && startOfDay(cellDate) > startOfDay(rangeFrom) && startOfDay(cellDate) < startOfDay(rangeTo)
          const isToday = isSameDay(cellDate, today)
          return (
            <button
              type="button"
              key={d}
              onClick={() => onSelect(cellDate)}
              className={cn(
                'h-9 w-9 mx-auto rounded-full text-sm flex items-center justify-center transition-colors',
                isEndpoint ? 'bg-primary text-primary-foreground font-bold'
                  : inRange ? 'bg-primary/15 text-foreground'
                  : 'bg-muted hover:bg-accent',
                isToday && !isEndpoint && 'ring-2 ring-primary/50'
              )}
            >
              {d}
            </button>
          )
        })}
      </div>
    </div>
  )
}

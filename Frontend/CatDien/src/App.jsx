import { useEffect, useState } from 'react'
import { Search, Loader2, Zap, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import StationPicker from '@/components/StationPicker'
import Calendar from '@/components/Calendar'
import ResultsList from '@/components/ResultsList'
import { api } from '@/lib/api'

function pad(n) { return String(n).padStart(2, '0') }
function fmtDate(d) { return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}` }
function isSameDay(a, b) {
  return a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

const ACCENT = 'linear-gradient(135deg,#6366f1 0%,#8b5cf6 40%,#d946ef 74%,#fb7185 100%)'
const PAGE_BG = 'linear-gradient(180deg, #f3eefc 0%, #eff1fd 55%, #f6f0fb 100%)'
const BLOB_A = 'radial-gradient(circle at 30% 30%, rgba(167,139,250,0.5), transparent 62%)'
const BLOB_B = 'radial-gradient(circle at 50% 50%, rgba(236,72,153,0.34), transparent 62%)'
const BLOB_C = 'radial-gradient(circle at 50% 50%, rgba(96,165,250,0.30), transparent 62%)'

export default function App() {
  const [stations, setStations] = useState([])
  const [stationsLoading, setStationsLoading] = useState(true)
  const [selected, setSelected] = useState(new Set())
  const [dateFrom, setDateFrom] = useState(null)
  const [dateTo, setDateTo] = useState(null)
  const [items, setItems] = useState([])
  const [searched, setSearched] = useState(false)
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/stations')
      .then((res) => setStations(res.data.stations || []))
      .catch(() => setStations([]))
      .finally(() => setStationsLoading(false))
  }, [])

  function toggleStation(name) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  function selectAllStations() {
    setSelected((prev) => (prev.size === stations.length ? new Set() : new Set(stations)))
  }

  // Chọn khoảng ngày: bấm lần 1 = mốc "từ", bấm lần 2 = mốc "đến" (tự hoán đổi nếu chọn ngược)
  function handleSelectDay(day) {
    if (!dateFrom || dateTo) {
      setDateFrom(day)
      setDateTo(null)
    } else if (isSameDay(day, dateFrom)) {
      setDateFrom(null)
      setDateTo(null)
    } else if (day < dateFrom) {
      setDateFrom(day)
    } else {
      setDateTo(day)
    }
  }

  function clearDateRange() {
    setDateFrom(null)
    setDateTo(null)
  }

  async function handleSearch() {
    setSearching(true)
    setError('')
    try {
      const params = {}
      if (selected.size > 0 && selected.size < stations.length) {
        params.station = [...selected].join(',')
      }
      if (dateFrom) {
        params.dateFrom = fmtDate(dateFrom)
        if (dateTo) params.dateTo = fmtDate(dateTo)
      }
      const res = await api.get('/search', { params })
      setItems(res.data.items || [])
      setSearched(true)
    } catch (err) {
      setError(err.response?.data?.error || 'Có lỗi xảy ra, vui lòng thử lại')
    } finally {
      setSearching(false)
    }
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden flex justify-center px-4 py-[34px] pb-[60px]" style={{ background: PAGE_BG }}>
      <div aria-hidden="true" className="pointer-events-none absolute -top-[14%] -left-[20%] w-[60vw] h-[60vw] max-w-[560px] max-h-[560px] rounded-full blur-[64px] animate-blob-a" style={{ background: BLOB_A }} />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-[18%] -right-[16%] w-[56vw] h-[56vw] max-w-[520px] max-h-[520px] rounded-full blur-[70px] animate-blob-b" style={{ background: BLOB_B }} />
      <div aria-hidden="true" className="pointer-events-none absolute top-[40%] left-[44%] w-[38vw] h-[38vw] max-w-[380px] max-h-[380px] rounded-full blur-[60px] animate-blob-c" style={{ background: BLOB_C }} />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 dot-grid" />

      <div className="relative z-[1] w-full max-w-md flex flex-col gap-4">
        <div className="relative overflow-hidden rounded-[24px] px-5 pt-5 pb-[22px] animate-fade-in text-white" style={{ background: ACCENT, boxShadow: '0 20px 44px -16px rgba(139,92,246,0.55)' }}>
          <span aria-hidden="true" className="absolute top-0 left-0 w-[55%] h-full pointer-events-none animate-sheen" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)' }} />
          <div className="relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10.5px] font-bold tracking-[1.5px] uppercase" style={{ background: 'rgba(255,255,255,0.22)', backdropFilter: 'blur(4px)' }}>
            <Sparkles className="h-3 w-3" /> Chuyển đổi số
          </div>
          <div className="relative flex items-center gap-[13px] mt-[15px]">
            <div className="w-12 h-12 shrink-0 rounded-[14px] overflow-hidden" style={{ background: 'rgba(255,255,255,0.9)', boxShadow: '0 6px 16px -6px rgba(0,0,0,0.35)' }}>
              <img src="/LogoDaiLoc.jpg" alt="Đại Lộc" className="w-12 h-12 object-cover" />
            </div>
            <div>
              <div className="font-extrabold text-xl leading-tight tracking-tight">Tra cứu lịch cắt điện</div>
              <div className="mt-1 text-xs text-white/85">UBND xã Đại Lộc</div>
            </div>
          </div>
          <div className="relative flex flex-wrap gap-2 mt-[15px]">
            <span className="inline-flex items-center gap-1.5 px-[13px] py-[7px] rounded-full text-xs font-semibold" style={{ background: 'rgba(255,255,255,0.2)' }}>
              <Zap className="h-3 w-3" /> Lịch cắt điện
            </span>
          </div>
        </div>

        <StationPicker
          stations={stations}
          loading={stationsLoading}
          selected={selected}
          onToggle={toggleStation}
          onSelectAll={selectAllStations}
          allSelected={stations.length > 0 && selected.size === stations.length}
        />

        <div className="rounded-2xl border bg-card p-4" style={{ boxShadow: '0 18px 46px -22px rgba(90,70,170,0.42)' }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold uppercase">Chọn từ ngày – đến ngày</p>
            {(dateFrom || dateTo) && (
              <button type="button" onClick={clearDateRange} className="text-xs font-medium text-muted-foreground underline">
                Xoá
              </button>
            )}
          </div>
          <Calendar rangeFrom={dateFrom} rangeTo={dateTo} onSelect={handleSelectDay} />
          <p className="text-xs text-muted-foreground mt-2">
            {dateFrom && dateTo
              ? `Đã chọn từ ${fmtDate(dateFrom)} đến ${fmtDate(dateTo)}`
              : dateFrom
                ? `Đã chọn ngày ${fmtDate(dateFrom)} — bấm thêm 1 ngày nữa để chọn khoảng`
                : 'Chưa chọn ngày — mặc định xem lịch sắp tới'}
          </p>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button className="relative overflow-hidden w-full gap-2" size="lg" onClick={handleSearch} disabled={searching} style={{ background: ACCENT, boxShadow: '0 16px 32px -14px rgba(139,92,246,0.55)' }}>
          {!searching && <span aria-hidden="true" className="absolute top-0 left-0 w-[55%] h-full pointer-events-none animate-sheen" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)' }} />}
          <span className="relative inline-flex items-center gap-2">
            {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            {searching ? 'Đang tìm kiếm...' : 'Tìm kiếm'}
          </span>
        </Button>

        <ResultsList items={items} searched={searched} />
      </div>
    </div>
  )
}

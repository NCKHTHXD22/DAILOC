import { useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import Hero from '@/components/Hero'
import SelectorCard from '@/components/SelectorCard'
import StatsAndChips from '@/components/StatsAndChips'
import ScheduleCard from '@/components/ScheduleCard'
import EmptyState from '@/components/EmptyState'
import { api } from '@/lib/api'

const now = new Date()
const YEARS = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1]

function pad(n) { return String(n).length < 2 ? '0' + n : '' + n }

export default function App() {
  const [thang, setThang] = useState(now.getMonth() + 1)
  const [nam, setNam] = useState(now.getFullYear())
  const [filter, setFilter] = useState('all')
  const [items, setItems] = useState([])
  const [searched, setSearched] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSearch(overrideThang, overrideNam) {
    const m = overrideThang ?? thang
    const y = overrideNam ?? nam
    setLoading(true)
    setError('')
    try {
      const res = await api.get('/search', { params: { thang: m, nam: y } })
      setItems(res.data.items || [])
      setFilter('all')
      setSearched(true)
    } catch (err) {
      setError(err.response?.data?.error || 'Có lỗi xảy ra, vui lòng thử lại')
    } finally {
      setLoading(false)
    }
  }

  function handleGoRecent() {
    const m = now.getMonth() + 1, y = now.getFullYear()
    setThang(m); setNam(y)
    handleSearch(m, y)
  }

  const filteredItems = filter === 'all' ? items : items.filter((x) => x.loaiTroCap === filter)

  return (
    <div className="relative overflow-hidden min-h-screen w-full flex justify-center px-[18px] py-[26px] pb-[34px]" style={{ background: '#eceefb' }}>
      <div aria-hidden="true" className="absolute -top-[70px] -left-20 w-[280px] h-[280px] rounded-full pointer-events-none blur-[12px] animate-float-a" style={{ background: 'radial-gradient(circle,rgba(139,92,246,.5),transparent 68%)' }} />
      <div aria-hidden="true" className="absolute top-10 -right-[90px] w-[260px] h-[260px] rounded-full pointer-events-none blur-[12px] animate-float-b" style={{ background: 'radial-gradient(circle,rgba(6,182,212,.42),transparent 68%)' }} />
      <div aria-hidden="true" className="absolute -bottom-[90px] left-5 w-[300px] h-[300px] rounded-full pointer-events-none blur-[14px] animate-float-a-slow" style={{ background: 'radial-gradient(circle,rgba(251,113,133,.34),transparent 70%)' }} />
      <div aria-hidden="true" className="absolute inset-0 dot-grid pointer-events-none" />

      <div className="relative z-[1] w-full max-w-[430px] flex flex-col gap-4">
        <Hero period={`${thang}/${nam}`} />

        <SelectorCard
          thang={thang} nam={nam}
          onThang={setThang} onNam={setNam}
          years={YEARS}
          onSearch={() => handleSearch()}
          loading={loading}
        />

        {error && <p className="text-sm text-red-500 px-1">{error}</p>}

        {searched && !loading && (
          <StatsAndChips items={items} thang={thang} nam={nam} filter={filter} onFilter={setFilter} />
        )}

        {loading && (
          <div className="flex flex-col gap-[13px]">
            <div className="skel h-[150px] animate-shimmer" />
            <div className="skel h-[150px] animate-shimmer" />
            <div className="skel h-[150px] animate-shimmer" />
          </div>
        )}

        {!loading && searched && items.length === 0 && (
          <EmptyState thang={thang} nam={nam} onGoRecent={handleGoRecent} />
        )}

        {!loading && searched && items.length > 0 && (
          <div className="flex flex-col gap-[13px]">
            {filteredItems.map((it, i) => (
              <ScheduleCard
                key={it._id}
                item={it}
                code={`PT·${pad(thang)}·${pad(items.indexOf(it) + 1)}`}
                delay={`${(i * 0.07).toFixed(2)}s`}
              />
            ))}
          </div>
        )}

        <div className="flex flex-col items-center gap-1.5 mt-1 pb-1.5">
          <div className="inline-flex items-center gap-1.5 font-mono text-[11px] font-medium text-[#94a3b8]">
            <ShieldCheck className="h-3.5 w-3.5 text-[#10b981]" />
            Dữ liệu công khai
          </div>
          <div className="text-[11.5px] text-[#a5adbe]">Cổng dịch vụ công trực tuyến xã Đại Lộc</div>
        </div>
      </div>
    </div>
  )
}

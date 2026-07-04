import { useEffect, useState } from 'react'
import { Loader2, FileText, ChevronLeft, ChevronRight, Search, Heart, Sparkles } from 'lucide-react'
import FilterPanel from '@/components/FilterPanel'
import ResultCard from '@/components/ResultCard'
import StatsRow from '@/components/StatsRow'
import { api } from '@/lib/api'

const EMPTY_FILTERS = {
  soHieu: '', trichYeu: '', coQuanBanHanh: '', loaiVanBan: '', linhVuc: '',
  ngayBanHanhFrom: '', ngayBanHanhTo: '', ngayHieuLucFrom: '', ngayHieuLucTo: '',
}

const ACCENT = 'linear-gradient(135deg,#6366f1 0%,#8b5cf6 40%,#d946ef 74%,#fb7185 100%)'
const ACCENT_SHADOW = 'rgba(139,92,246,0.55)'
const PAGE_BG = 'linear-gradient(180deg, #f3eefc 0%, #eff1fd 55%, #f6f0fb 100%)'
const BLOB_A = 'radial-gradient(circle at 30% 30%, rgba(167,139,250,0.5), transparent 62%)'
const BLOB_B = 'radial-gradient(circle at 50% 50%, rgba(236,72,153,0.34), transparent 62%)'
const BLOB_C = 'radial-gradient(circle at 50% 50%, rgba(96,165,250,0.30), transparent 62%)'

export default function App() {
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [filterOptions, setFilterOptions] = useState({ coQuanBanHanh: [], loaiVanBan: [], linhVuc: [] })
  const [filterOpen, setFilterOpen] = useState(true)

  const [result, setResult] = useState({ items: [], count: 0, totalPages: 1 })
  const [page, setPage] = useState(1)
  const [searched, setSearched] = useState(false)
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/filters').then((res) => setFilterOptions(res.data)).catch(() => {})
  }, [])

  async function runSearch(targetPage) {
    setSearching(true)
    setError('')
    try {
      const res = await api.get('/search', { params: { ...filters, page: targetPage } })
      setResult(res.data)
      setPage(targetPage)
      setSearched(true)
    } catch (err) {
      setError(err.response?.data?.error || 'Có lỗi xảy ra, vui lòng thử lại')
    } finally {
      setSearching(false)
    }
  }

  function handleSearch() {
    runSearch(1)
  }

  return (
    <div
      className="relative min-h-screen w-full overflow-hidden flex justify-center px-4 py-[34px] pb-[60px] font-sans"
      style={{ background: PAGE_BG, color: '#38334f' }}
    >
      <div aria-hidden="true" className="pointer-events-none absolute -top-[14%] -left-[20%] w-[60vw] h-[60vw] max-w-[560px] max-h-[560px] rounded-full blur-[64px] animate-blob-a" style={{ background: BLOB_A }} />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-[18%] -right-[16%] w-[56vw] h-[56vw] max-w-[520px] max-h-[520px] rounded-full blur-[70px] animate-blob-b" style={{ background: BLOB_B }} />
      <div aria-hidden="true" className="pointer-events-none absolute top-[40%] left-[44%] w-[38vw] h-[38vw] max-w-[380px] max-h-[380px] rounded-full blur-[60px] animate-blob-c" style={{ background: BLOB_C }} />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 dot-grid" />

      <div className="relative z-[1] w-full max-w-[400px] flex flex-col gap-[15px]">

        {/* HEADER */}
        <div className="relative overflow-hidden rounded-[24px] px-5 pt-5 pb-[22px] animate-fade-in" style={{ background: ACCENT, boxShadow: `0 20px 44px -16px ${ACCENT_SHADOW}` }}>
          <span aria-hidden="true" className="absolute top-0 left-0 w-[55%] h-full pointer-events-none animate-sheen" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)' }} />
          <div className="relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-white text-[10.5px] font-bold tracking-[1.5px] uppercase" style={{ background: 'rgba(255,255,255,0.22)', backdropFilter: 'blur(4px)' }}>
            <Sparkles className="h-3 w-3" /> Chuyển đổi số
          </div>
          <div className="relative flex items-center gap-[13px] mt-[15px]">
            <div className="w-12 h-12 shrink-0 rounded-[14px] overflow-hidden" style={{ background: 'rgba(255,255,255,0.9)', boxShadow: '0 6px 16px -6px rgba(0,0,0,0.35)' }}>
              <img src="/LogoDaiLoc.jpg" alt="UBND Đại Lộc" className="w-12 h-12 object-cover" />
            </div>
            <div className="min-w-0">
              <div className="font-extrabold text-[21px] leading-[1.12] text-white tracking-tight">Tra cứu văn bản</div>
              <div className="mt-1 text-xs text-white/85">UBND xã Đại Lộc</div>
            </div>
          </div>
          <div className="relative flex flex-wrap gap-2 mt-[15px]">
            <span className="inline-flex items-center gap-1.5 px-[13px] py-[7px] rounded-full text-white text-xs font-semibold" style={{ background: 'rgba(255,255,255,0.2)' }}>
              <FileText className="h-3 w-3" /> Hành chính
            </span>
            <span className="inline-flex items-center gap-1.5 px-[13px] py-[7px] rounded-full text-white text-xs font-semibold" style={{ background: 'rgba(255,255,255,0.2)' }}>
              <Heart className="h-3 w-3" /> Công khai
            </span>
          </div>
        </div>

        <FilterPanel
          open={filterOpen}
          onToggle={() => setFilterOpen((v) => !v)}
          filters={filters}
          setFilters={setFilters}
          filterOptions={filterOptions}
          onSearch={handleSearch}
          searching={searching}
        />

        {error && <p className="text-sm text-red-500 px-1">{error}</p>}

        {searching && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin" style={{ color: '#7c3aed' }} />
          </div>
        )}

        {searched && !searching && (
          <div className="flex flex-col gap-3 animate-fade-in">
            <div className="flex items-center gap-1.5 px-1 text-[13px]" style={{ color: '#6b6685' }}>
              <Search className="h-3.5 w-3.5" style={{ color: '#7c3aed' }} />
              Có <b style={{ color: '#7c3aed' }}>{result.count}</b> văn bản phù hợp
            </div>

            {result.items.length > 0 && <StatsRow items={result.items} totalCount={result.count} />}

            {result.items.length === 0 ? (
              <div className="rounded-2xl p-6 text-center space-y-2 bg-white" style={{ boxShadow: '0 12px 34px -22px rgba(90,70,170,0.4)' }}>
                <FileText className="h-8 w-8 mx-auto" style={{ color: '#a7a3bd' }} />
                <p className="text-sm" style={{ color: '#6b6685' }}>Không tìm thấy văn bản phù hợp. Thử đổi bộ lọc.</p>
              </div>
            ) : (
              result.items.map((item, i) => <ResultCard key={item._id} item={item} delay={`${(i * 0.09).toFixed(2)}s`} />)
            )}
          </div>
        )}

        {!searching && searched && result.totalPages > 1 && (
          <div className="flex items-center justify-between pt-1 px-1">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => runSearch(page - 1)}
              className="flex items-center gap-1 text-sm font-semibold disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              style={{ color: '#7c3aed' }}
            >
              <ChevronLeft className="h-4 w-4" /> Trước
            </button>
            <span className="text-xs" style={{ color: '#8b88a3' }}>Trang {page}/{result.totalPages}</span>
            <button
              type="button"
              disabled={page >= result.totalPages}
              onClick={() => runSearch(page + 1)}
              className="flex items-center gap-1 text-sm font-semibold disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              style={{ color: '#7c3aed' }}
            >
              Sau <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

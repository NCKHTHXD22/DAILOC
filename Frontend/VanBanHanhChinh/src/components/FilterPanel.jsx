import { ChevronDown, Search, Loader2, X } from 'lucide-react'

const ALL = '__all__'
const ACCENT = 'linear-gradient(135deg,#6366f1 0%,#8b5cf6 40%,#d946ef 74%,#fb7185 100%)'
const ACCENT_TEXT = '#7c3aed'
const ACCENT_SOLID = '#8b5cf6'
const ACCENT_RING = 'rgba(139,92,246,0.18)'
const SOFT_ACCENT = '#f1ecfe'

const FIELD_LABELS = {
  soHieu: 'Số VB', trichYeu: 'Từ khoá',
  ngayBanHanhFrom: 'BH từ', ngayBanHanhTo: 'BH đến',
  ngayHieuLucFrom: 'HL từ', ngayHieuLucTo: 'HL đến',
  linhVuc: 'Lĩnh vực', loaiVanBan: 'Loại', coQuanBanHanh: 'Cơ quan',
}

const inputCls = 'w-full min-w-0 px-3.5 py-3 rounded-[13px] border-[1.5px] border-[#eae6f6] bg-[#f6f4fc] text-[#38334f] text-sm outline-none transition-colors focus:bg-white focus:border-[#8b5cf6] focus:shadow-[0_0_0_4px_rgba(139,92,246,0.18)] hover:border-[#c4b5fd]'

function FieldLabel({ children, accent }) {
  return <label className={accent ? 'text-xs font-bold' : 'text-xs font-semibold text-[#6b6685]'} style={accent ? { color: ACCENT_TEXT } : undefined}>{children}</label>
}

function TextField({ label, value, onChange, placeholder }) {
  return (
    <div className="flex flex-col gap-1.5">
      <FieldLabel>{label}</FieldLabel>
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={inputCls} />
    </div>
  )
}

function DateRangeField({ title, fromValue, toValue, onFrom, onTo }) {
  return (
    <div className="flex flex-col gap-2 min-w-0">
      <FieldLabel accent>{title}</FieldLabel>
      <div className="grid grid-cols-2 gap-2.5 min-w-0">
        <div className="flex flex-col gap-1 min-w-0">
          <span className="text-[11px] text-[#8b88a3]">Từ ngày</span>
          <input type="date" value={fromValue} onChange={(e) => onFrom(e.target.value)} className={`${inputCls} py-2.5 text-[13px]`} style={{ colorScheme: 'light' }} />
        </div>
        <div className="flex flex-col gap-1 min-w-0">
          <span className="text-[11px] text-[#8b88a3]">Đến ngày</span>
          <input type="date" value={toValue} onChange={(e) => onTo(e.target.value)} className={`${inputCls} py-2.5 text-[13px]`} style={{ colorScheme: 'light' }} />
        </div>
      </div>
    </div>
  )
}

function SelectField({ label, value, onChange, options }) {
  return (
    <div className="flex flex-col gap-1.5">
      <FieldLabel>{label}</FieldLabel>
      <select
        value={value || ALL}
        onChange={(e) => onChange(e.target.value === ALL ? '' : e.target.value)}
        className={`${inputCls} cursor-pointer appearance-none bg-no-repeat bg-[right_14px_center] bg-[url('data:image/svg+xml;utf8,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20width=%2212%22%20height=%2212%22%20viewBox=%220%200%2012%2012%22%3E%3Cpath%20d=%22M2%204l4%204%204-4%22%20stroke=%22%238b5cf6%22%20stroke-width=%221.6%22%20fill=%22none%22%20stroke-linecap=%22round%22/%3E%3C/svg%3E')]`}
      >
        <option value={ALL}>-- Tất cả --</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  )
}

export default function FilterPanel({ open, onToggle, filters, setFilters, filterOptions, onSearch, searching }) {
  function set(key, value) {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const activeChips = Object.keys(FIELD_LABELS)
    .filter((f) => filters[f])
    .map((f) => ({ key: f, label: `${FIELD_LABELS[f]}: ${filters[f]}` }))

  return (
    <div className="rounded-[22px] bg-white overflow-hidden" style={{ boxShadow: '0 18px 46px -22px rgba(90,70,170,0.42)' }}>
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-[18px] py-[17px] bg-transparent text-left hover:bg-[#faf8ff] transition-colors"
      >
        <span className="grid place-items-center w-[34px] h-[34px] rounded-[11px] shrink-0" style={{ background: SOFT_ACCENT, color: ACCENT_TEXT }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><line x1="4" y1="6" x2="20" y2="6" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="18" x2="20" y2="18" /></svg>
        </span>
        <span className="flex-1 font-bold text-[12.5px] tracking-[1.4px] uppercase text-[#6b6685]">Chọn bộ lọc</span>
        {activeChips.length > 0 && (
          <span className="min-w-[22px] h-[22px] px-1.5 grid place-items-center rounded-full text-white text-xs font-bold animate-badge-pulse" style={{ background: ACCENT }}>
            {activeChips.length}
          </span>
        )}
        <ChevronDown className={`h-4 w-4 text-[#a7a3bd] transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="px-[18px] pb-[18px] pt-0.5 flex flex-col gap-[15px] min-w-0">
          <TextField label="Số văn bản" value={filters.soHieu} onChange={(v) => set('soHieu', v)} placeholder="VD: 49/2026/NQ-HĐND" />
          <TextField label="Trích yếu (từ khoá)" value={filters.trichYeu} onChange={(v) => set('trichYeu', v)} placeholder="VD: bảo hiểm y tế" />

          <DateRangeField title="Ngày ban hành" fromValue={filters.ngayBanHanhFrom} toValue={filters.ngayBanHanhTo}
            onFrom={(v) => set('ngayBanHanhFrom', v)} onTo={(v) => set('ngayBanHanhTo', v)} />
          <DateRangeField title="Ngày hiệu lực" fromValue={filters.ngayHieuLucFrom} toValue={filters.ngayHieuLucTo}
            onFrom={(v) => set('ngayHieuLucFrom', v)} onTo={(v) => set('ngayHieuLucTo', v)} />

          <SelectField label="Lĩnh vực" value={filters.linhVuc} onChange={(v) => set('linhVuc', v)} options={filterOptions.linhVuc} />
          <SelectField label="Loại văn bản" value={filters.loaiVanBan} onChange={(v) => set('loaiVanBan', v)} options={filterOptions.loaiVanBan} />
          <SelectField label="Cơ quan ban hành" value={filters.coQuanBanHanh} onChange={(v) => set('coQuanBanHanh', v)} options={filterOptions.coQuanBanHanh} />

          {activeChips.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {activeChips.map((chip) => (
                <button
                  key={chip.key}
                  type="button"
                  onClick={() => set(chip.key, '')}
                  className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1.5 rounded-full text-xs font-semibold transition-transform active:scale-95"
                  style={{ background: SOFT_ACCENT, border: `1px solid ${ACCENT_RING}`, color: ACCENT_TEXT }}
                >
                  {chip.label}
                  <span className="grid place-items-center w-4 h-4 rounded-full text-white" style={{ background: ACCENT_SOLID }}>
                    <X className="h-2.5 w-2.5" />
                  </span>
                </button>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={onSearch}
            disabled={searching}
            className="relative overflow-hidden mt-1 w-full py-4 rounded-[15px] border-none text-white text-[15px] font-bold tracking-wide cursor-pointer transition-transform hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.985] disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0"
            style={{ background: ACCENT, boxShadow: '0 16px 32px -14px rgba(139,92,246,0.55)' }}
          >
            {!searching && (
              <span aria-hidden="true" className="absolute top-0 left-0 w-[55%] h-full animate-sheen pointer-events-none" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)' }} />
            )}
            <span className="relative inline-flex items-center justify-center gap-2">
              {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              {searching ? 'Đang tìm…' : 'Tra cứu'}
            </span>
          </button>
        </div>
      )}
    </div>
  )
}

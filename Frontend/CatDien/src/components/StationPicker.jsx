import { useMemo, useState } from 'react'
import { ChevronUp, ChevronDown, MapPin, Check, Plus, Search } from 'lucide-react'
import { cn } from '@/lib/utils'

const MAX_VISIBLE = 300 // chống lag khi danh sách rất dài, giới hạn số dòng render mỗi lần

// Bỏ dấu tiếng Việt để tìm kiếm không phân biệt dấu (người dùng hay gõ không dấu)
function stripDiacritics(str) {
  return str
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .toLowerCase()
}

export default function StationPicker({ stations, loading, selected, onToggle, onSelectAll, allSelected }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const summary =
    selected.size === 0
      ? 'Chưa chọn trạm nào (mặc định: tất cả trạm)'
      : allSelected
        ? 'Đã chọn tất cả trạm'
        : `Đã chọn ${selected.size} trạm`

  const filtered = useMemo(() => {
    const q = stripDiacritics(search.trim())
    const list = q ? stations.filter((s) => stripDiacritics(s).includes(q)) : stations
    return list.slice(0, MAX_VISIBLE)
  }, [stations, search])

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
      >
        <MapPin className="h-5 w-5 text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold uppercase">Danh sách trạm {stations.length > 0 && `(${stations.length})`}</div>
          <div className="text-xs text-muted-foreground truncate">{summary}</div>
        </div>
        {open ? <ChevronUp className="h-4 w-4 shrink-0" /> : <ChevronDown className="h-4 w-4 shrink-0" />}
      </button>

      {open && (
        <div className="border-t px-4 py-3 space-y-1">
          {loading && <p className="text-sm text-muted-foreground py-2">Đang tải danh sách trạm...</p>}

          {!loading && stations.length === 0 && (
            <p className="text-sm text-muted-foreground py-2">
              Chưa có dữ liệu trạm cụ thể cho khu vực Hiệp Đức. Bạn vẫn có thể tra cứu — kết quả sẽ hiển thị tất cả khu vực.
            </p>
          )}

          {!loading && stations.length > 0 && (
            <>
              <button
                type="button"
                onClick={onSelectAll}
                className="w-full flex items-center justify-between rounded-full bg-primary/10 px-4 py-2.5 text-sm font-bold text-primary hover:bg-primary/20 transition-colors"
              >
                CHỌN TẤT CẢ TRẠM
                <Plus className="h-4 w-4" />
              </button>

              {stations.length > 10 && (
                <div className="relative pt-2">
                  <Search className="absolute left-3 top-[1.15rem] h-4 w-4 text-muted-foreground" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Tìm tên trạm/thôn..."
                    className="w-full h-9 rounded-md border border-input bg-background pl-9 pr-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
              )}

              <div className="pt-1 max-h-80 overflow-y-auto">
                {filtered.length === 0 && (
                  <p className="text-sm text-muted-foreground py-3 text-center">Không tìm thấy trạm phù hợp.</p>
                )}
                {filtered.map((name) => {
                  const checked = selected.has(name)
                  return (
                    <button
                      type="button"
                      key={name}
                      onClick={() => onToggle(name)}
                      className="w-full flex items-center justify-between py-2.5 text-sm text-left border-b last:border-b-0"
                    >
                      <span className={cn(checked ? 'font-semibold text-foreground' : 'text-foreground')}>{name}</span>
                      {checked && <Check className="h-4 w-4 text-primary shrink-0" />}
                    </button>
                  )
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

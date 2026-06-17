import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Loader2, Users, ChevronDown, ChevronRight, Pencil, Check, X } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

// ── Quản lý thành viên Zalo của một nhóm ──────────────
function CategoryMemberPanel({ cat }) {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ displayName: '', zaloUserId: '' })

  const { data, isLoading } = useQuery({
    queryKey: ['zalo-members', cat._id],
    queryFn: () => api.get(`/api/zalo-members/${cat._id}`).then((r) => r.data),
    enabled: open,
  })

  const addMutation = useMutation({
    mutationFn: () => api.post(`/api/zalo-members/manual/${cat._id}`, form).then((r) => r.data),
    onSuccess: () => {
      toast.success('Đã thêm thành viên')
      setForm({ displayName: '', zaloUserId: '' })
      queryClient.invalidateQueries({ queryKey: ['zalo-members', cat._id] })
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Lỗi thêm'),
  })

  const deleteMutation = useMutation({
    mutationFn: (memberId) => api.delete(`/api/zalo-members/member/${memberId}`).then((r) => r.data),
    onSuccess: () => {
      toast.success('Đã xóa')
      queryClient.invalidateQueries({ queryKey: ['zalo-members', cat._id] })
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Lỗi xóa'),
  })

  const members = data?.members ?? []

  return (
    <div className="border border-slate-100 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-slate-50 text-left transition-colors"
      >
        <span className="text-sm font-medium flex items-center gap-2">
          {cat.icon} {cat.name}
          <span className="text-xs font-normal text-slate-400">
            · <code className="bg-slate-100 px-1 rounded">{cat.zaloGroupId || 'chưa cấu hình'}</code>
          </span>
        </span>
        <div className="flex items-center gap-2">
          {members.length > 0 && (
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
              {members.length} TV
            </span>
          )}
          {open ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 pt-3 bg-slate-50/50 border-t border-slate-100 space-y-3">
          <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-3 space-y-3">
            <p className="text-xs font-semibold text-blue-700 flex items-center gap-1">
              <Plus className="h-3.5 w-3.5" /> Thêm thành viên
            </p>
            <div className="flex gap-2">
              <div className="flex-1 space-y-1">
                <Label className="text-xs">Họ tên</Label>
                <Input
                  placeholder="Nguyễn Văn A"
                  className="h-9 text-sm"
                  value={form.displayName}
                  onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
                />
              </div>
              <div className="flex-1 space-y-1">
                <Label className="text-xs">Zalo User ID</Label>
                <Input
                  placeholder="123456789"
                  className="h-9 text-sm"
                  value={form.zaloUserId}
                  onChange={(e) => setForm((f) => ({ ...f, zaloUserId: e.target.value }))}
                />
              </div>
              <div className="flex items-end">
                <Button
                  size="sm"
                  className="h-9"
                  onClick={() => {
                    if (!form.displayName.trim()) { toast.error('Vui lòng nhập họ tên'); return }
                    if (!form.zaloUserId.trim()) { toast.error('Vui lòng nhập Zalo User ID'); return }
                    addMutation.mutate()
                  }}
                  disabled={addMutation.isPending}
                >
                  {addMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-slate-400 py-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Đang tải...
            </div>
          ) : members.length === 0 ? (
            <div className="text-center py-4 text-sm text-slate-400">
              <Users className="h-8 w-8 mx-auto mb-2 text-slate-200" />
              Chưa có thành viên nào
            </div>
          ) : (
            <div className="divide-y divide-slate-100 rounded-lg border border-slate-100 overflow-hidden bg-white">
              {members.map((m) => (
                <div key={m._id} className="flex items-center justify-between px-3 py-2.5 hover:bg-slate-50">
                  <div>
                    <p className="text-sm font-medium text-slate-700">{m.displayName || '(Không tên)'}</p>
                    <p className="text-xs text-slate-400 font-mono">ID: {m.zaloUserId}</p>
                  </div>
                  <button
                    onClick={() => {
                      if (window.confirm(`Xóa ${m.displayName}?`)) deleteMutation.mutate(m._id)
                    }}
                    className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Row chỉnh sửa một danh mục ──────────────
function CategoryRow({ cat, onSaved, onDeleted }) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ name: cat.name, zaloGroupId: cat.zaloGroupId, icon: cat.icon, order: cat.order })

  const saveMutation = useMutation({
    mutationFn: () => api.put(`/api/categories/${cat._id}`, form).then((r) => r.data),
    onSuccess: () => { toast.success('Đã lưu danh mục'); setEditing(false); onSaved() },
    onError: (e) => toast.error(e.response?.data?.error || 'Lỗi lưu'),
  })

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/api/categories/${cat._id}`).then((r) => r.data),
    onSuccess: () => { toast.success('Đã xóa danh mục'); onDeleted() },
    onError: (e) => toast.error(e.response?.data?.error || 'Lỗi xóa'),
  })

  if (!editing) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-slate-100 hover:border-slate-200">
        <span className="text-xl w-7 text-center">{cat.icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-800">{cat.name}</p>
          <p className="text-xs text-slate-400 font-mono truncate">Group ID: {cat.zaloGroupId || '—'}</p>
        </div>
        <button
          onClick={() => setEditing(true)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-50 transition-colors"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => { if (window.confirm(`Xóa danh mục "${cat.name}"?`)) deleteMutation.mutate() }}
          className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
          disabled={deleteMutation.isPending}
        >
          {deleteMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
        </button>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50/30 p-3 space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Tên danh mục</Label>
          <Input
            className="h-9 text-sm"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Zalo Group ID</Label>
          <Input
            className="h-9 text-sm font-mono"
            placeholder="fa0dbd7f1e1df743ae0c"
            value={form.zaloGroupId}
            onChange={(e) => setForm((f) => ({ ...f, zaloGroupId: e.target.value }))}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Icon (emoji)</Label>
          <Input
            className="h-9 text-sm"
            value={form.icon}
            onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Thứ tự</Label>
          <Input
            type="number"
            className="h-9 text-sm"
            value={form.order}
            onChange={(e) => setForm((f) => ({ ...f, order: parseInt(e.target.value) || 0 }))}
          />
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <Button size="sm" variant="outline" className="h-8 gap-1" onClick={() => setEditing(false)}>
          <X className="h-3.5 w-3.5" /> Hủy
        </Button>
        <Button
          size="sm"
          className="h-8 gap-1 bg-blue-600 hover:bg-blue-700 text-white"
          onClick={() => {
            if (!form.name.trim()) { toast.error('Nhập tên danh mục'); return }
            if (!form.zaloGroupId.trim()) { toast.error('Nhập Zalo Group ID'); return }
            saveMutation.mutate()
          }}
          disabled={saveMutation.isPending}
        >
          {saveMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
          Lưu
        </Button>
      </div>
    </div>
  )
}

// ── Trang chính ──────────────────────────────────────
export default function SettingsPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [addForm, setAddForm] = useState({ name: '', zaloGroupId: '', icon: '', order: 0 })
  const [showAdd, setShowAdd] = useState(false)

  const { data: catsData, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get('/api/categories').then((r) => r.data),
  })

  const addMutation = useMutation({
    mutationFn: () => api.post('/api/categories', addForm).then((r) => r.data),
    onSuccess: () => {
      toast.success('Đã thêm danh mục')
      setAddForm({ name: '', zaloGroupId: '', icon: '', order: 0 })
      setShowAdd(false)
      queryClient.invalidateQueries({ queryKey: ['categories'] })
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Lỗi thêm'),
  })

  const invalidateCats = () => queryClient.invalidateQueries({ queryKey: ['categories'] })

  const categories = catsData?.categories ?? []
  const isSuperadmin = user?.role === 'superadmin'

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      {/* ── Quản lý danh mục ── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Danh mục phản ánh</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Tên, icon và Zalo Group ID của từng loại</p>
            </div>
            {isSuperadmin && (
              <Button size="sm" variant="outline" className="gap-1" onClick={() => setShowAdd((v) => !v)}>
                <Plus className="h-3.5 w-3.5" /> Thêm mới
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {isSuperadmin && showAdd && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/30 p-3 space-y-2 mb-3">
              <p className="text-xs font-semibold text-emerald-700">Thêm danh mục mới</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Tên danh mục *</Label>
                  <Input
                    className="h-9 text-sm"
                    placeholder="Ví dụ: Giao thông"
                    value={addForm.name}
                    onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Zalo Group ID *</Label>
                  <Input
                    className="h-9 text-sm font-mono"
                    placeholder="fa0dbd7f..."
                    value={addForm.zaloGroupId}
                    onChange={(e) => setAddForm((f) => ({ ...f, zaloGroupId: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Icon (emoji)</Label>
                  <Input
                    className="h-9 text-sm"
                    placeholder="🚦"
                    value={addForm.icon}
                    onChange={(e) => setAddForm((f) => ({ ...f, icon: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Thứ tự</Label>
                  <Input
                    type="number"
                    className="h-9 text-sm"
                    value={addForm.order}
                    onChange={(e) => setAddForm((f) => ({ ...f, order: parseInt(e.target.value) || 0 }))}
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button size="sm" variant="outline" className="h-8 gap-1" onClick={() => setShowAdd(false)}>
                  <X className="h-3.5 w-3.5" /> Hủy
                </Button>
                <Button
                  size="sm"
                  className="h-8 gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => {
                    if (!addForm.name.trim()) { toast.error('Nhập tên danh mục'); return }
                    if (!addForm.zaloGroupId.trim()) { toast.error('Nhập Zalo Group ID'); return }
                    addMutation.mutate()
                  }}
                  disabled={addMutation.isPending}
                >
                  {addMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  Thêm
                </Button>
              </div>
            </div>
          )}

          {categories.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">Chưa có danh mục nào</p>
          ) : (
            <div className="space-y-2">
              {categories.map((cat) =>
                isSuperadmin ? (
                  <CategoryRow key={cat._id} cat={cat} onSaved={invalidateCats} onDeleted={invalidateCats} />
                ) : (
                  <div key={cat._id} className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-slate-100">
                    <span className="text-xl w-7 text-center">{cat.icon}</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-800">{cat.name}</p>
                      <p className="text-xs text-slate-400 font-mono">Group ID: {cat.zaloGroupId || '—'}</p>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Thành viên Zalo nhóm ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Thành viên Zalo theo nhóm</CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            Quản lý cán bộ trong từng nhóm để phân công xử lý phản ánh
          </p>
        </CardHeader>
        <CardContent className="space-y-2">
          {categories.map((cat) => (
            <CategoryMemberPanel key={cat._id} cat={cat} />
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

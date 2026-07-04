import { Award, HeartHandshake, Home, Baby } from 'lucide-react'

// Phân loại nhóm đối tượng trợ cấp — dùng chung cho chip lọc + card kết quả
export const CATEGORIES = {
  cong: {
    label: 'Người có công với cách mạng', shortLabel: 'Người có công',
    icon: Award, grad: 'linear-gradient(135deg,#fbbf24,#f59e0b,#f97316)',
    soft: '#fff7ed', ink: '#c2410c', dot: '#f59e0b',
  },
  baotro: {
    label: 'Bảo trợ xã hội hàng tháng', shortLabel: 'Bảo trợ XH',
    icon: HeartHandshake, grad: 'linear-gradient(135deg,#38bdf8,#3b82f6,#6366f1)',
    soft: '#eff6ff', ink: '#1d4ed8', dot: '#3b82f6',
  },
  ngheo: {
    label: 'Hỗ trợ hộ nghèo, cận nghèo', shortLabel: 'Hộ nghèo',
    icon: Home, grad: 'linear-gradient(135deg,#34d399,#10b981,#14b8a6)',
    soft: '#ecfdf5', ink: '#047857', dot: '#10b981',
  },
  treem: {
    label: 'Trợ cấp trẻ em & chính sách khác', shortLabel: 'Trẻ em',
    icon: Baby, grad: 'linear-gradient(135deg,#fb7185,#f43f5e,#ec4899)',
    soft: '#fff1f2', ink: '#be123c', dot: '#f43f5e',
  },
}

export function statusOf(ngayChiTra) {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const d = new Date(ngayChiTra); d.setHours(0, 0, 0, 0)
  if (d.getTime() < today.getTime()) return 'Hoàn thành'
  if (d.getTime() === today.getTime()) return 'Đang diễn ra'
  return 'Sắp diễn ra'
}

export function statusStyle(status) {
  if (status === 'Sắp diễn ra') return { bg: '#f5f3ff', color: '#7c3aed', dot: '#8b5cf6' }
  if (status === 'Đang diễn ra') return { bg: '#eff6ff', color: '#2563eb', dot: '#3b82f6' }
  if (status === 'Hoàn thành') return { bg: '#ecfdf5', color: '#059669', dot: '#10b981' }
  return { bg: '#f1f5f9', color: '#475569', dot: '#94a3b8' }
}

const WD = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy']

export function weekday(iso) {
  return WD[new Date(iso).getDay()]
}

export function ddmm(iso) {
  const d = new Date(iso)
  const p = (n) => String(n).padStart(2, '0')
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}`
}

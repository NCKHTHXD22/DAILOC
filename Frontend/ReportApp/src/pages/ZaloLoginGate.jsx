import { useEffect, useRef, useState } from 'react'
import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import BlobBackground from '@/components/BlobBackground'
import { buildZaloLoginUrl, api } from '@/lib/api'

const ACCENT = 'linear-gradient(135deg,#6366f1 0%,#8b5cf6 40%,#d946ef 74%,#fb7185 100%)'

const RED_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="36" viewBox="0 0 24 36">
  <path d="M12 0C5.37 0 0 5.37 0 12c0 9 12 24 12 24S24 21 24 12C24 5.37 18.63 0 12 0z" fill="#ef4444"/>
  <circle cx="12" cy="12" r="5" fill="white"/>
</svg>`

function createRedIcon(L) {
  return L.icon({
    iconUrl: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(RED_ICON_SVG),
    iconSize: [24, 36], iconAnchor: [12, 36], popupAnchor: [0, -36],
  })
}

// Chỉ render khi points.length > 0 — không có toạ độ mặc định
function ComplaintMap({ points }) {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)

  useEffect(() => {
    const L = window.L
    if (!L || !mapRef.current || mapInstanceRef.current) return

    // Tạo map không set center/zoom — sẽ fitBounds theo marker thực
    const map = L.map(mapRef.current, { zoomControl: true })
    mapInstanceRef.current = map

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map)

    const redIcon = createRedIcon(L)
    const group = L.featureGroup()

    points.forEach(p => {
      const dateStr = p.createdAt ? new Date(p.createdAt).toLocaleDateString('vi-VN') : ''
      L.marker([p.lat, p.lng], { icon: redIcon })
        .bindPopup(
          `<div style="min-width:160px;font-size:13px">` +
          `<b style="color:#ef4444">⚠️ Đang xử lý</b><br>` +
          `<b>${p.category}</b><br>${p.content}<br>` +
          (p.address ? `<span style="color:#666">📍 ${p.address}</span><br>` : '') +
          (dateStr ? `<span style="color:#999;font-size:11px">${dateStr}</span>` : '') +
          `</div>`,
          { maxWidth: 240 }
        )
        .addTo(group)
    })

    group.addTo(map)
    // Auto-zoom vừa đủ bao phủ tất cả marker
    try { map.fitBounds(group.getBounds().pad(0.35)) } catch {}

    // Lớp ranh giới xã Đại Lộc — thêm sau khi đã có center từ marker
    fetch(
      'https://nominatim.openstreetmap.org/search.php' +
      '?q=' + encodeURIComponent('Xã Đại Lộc, Quảng Nam') +
      '&format=geojson&polygon_geojson=1&limit=1',
      { headers: { 'User-Agent': 'UBND-DaiLoc-GoiY/1.0' } }
    )
      .then(r => r.json())
      .then(data => {
        if (!data.features?.length || !mapInstanceRef.current) return
        L.geoJSON(data, {
          style: { color: '#0068ff', weight: 2.5, fillColor: '#0068ff', fillOpacity: 0.06, dashArray: '5,4' },
        })
          .bindPopup('<b style="color:#0068ff">Xã Đại Lộc</b><br>Tỉnh Quảng Nam')
          .addTo(mapInstanceRef.current)
      })
      .catch(() => {})

    return () => {
      map.remove()
      mapInstanceRef.current = null
    }
  }, [])

  return (
    <div style={{ height: '320px', width: '100%', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e5e7eb' }}>
      <div ref={mapRef} style={{ height: '100%', width: '100%' }} />
    </div>
  )
}

export default function ZaloLoginGate({ loading, error }) {
  const [leafletReady, setLeafletReady] = useState(false)
  const [mapPoints, setMapPoints] = useState(null) // null = chưa load, [] = không có

  // Đợi Leaflet CDN
  useEffect(() => {
    if (window.L) { setLeafletReady(true); return }
    const check = setInterval(() => { if (window.L) { setLeafletReady(true); clearInterval(check) } }, 200)
    return () => clearInterval(check)
  }, [])

  // Tải danh sách phản ánh có toạ độ
  useEffect(() => {
    api.get('/feedbacks/map')
      .then(res => setMapPoints(res.data.points || []))
      .catch(() => setMapPoints([]))
  }, [])

  const showMap = leafletReady && mapPoints !== null && mapPoints.length > 0

  return (
    <BlobBackground className="flex flex-col items-center justify-start p-4 gap-4 pt-6">
      <div
        className="relative overflow-hidden w-full max-w-sm rounded-[24px] px-5 py-6 text-center text-white animate-fade-in"
        style={{ background: ACCENT, boxShadow: '0 20px 44px -16px rgba(139,92,246,0.55)' }}
      >
        <span aria-hidden="true" className="absolute top-0 left-0 w-[55%] h-full pointer-events-none animate-sheen" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)' }} />
        <div className="relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10.5px] font-bold tracking-[1.5px] uppercase mb-3" style={{ background: 'rgba(255,255,255,0.22)', backdropFilter: 'blur(4px)' }}>
          <Sparkles className="h-3 w-3" /> Chuyển đổi số
        </div>
        <div className="relative text-xl font-extrabold tracking-tight">UBND Xã Đại Lộc</div>
        <p className="relative text-sm text-white/85 mt-1">Góp ý - Phản ánh</p>
      </div>

      <Card className="w-full max-w-sm animate-fade-in" style={{ boxShadow: '0 18px 46px -22px rgba(90,70,170,0.42)' }}>
        <CardContent className="space-y-4 text-center pt-6">
          <p className="text-sm text-muted-foreground">
            Vui lòng đăng nhập bằng Zalo để gửi góp ý / phản ánh. Cán bộ sẽ phản hồi trực tiếp qua Zalo của bạn.
          </p>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button
            className="relative overflow-hidden w-full"
            size="lg"
            disabled={loading}
            onClick={() => { window.location.href = buildZaloLoginUrl() }}
            style={{ background: ACCENT, boxShadow: '0 16px 32px -14px rgba(139,92,246,0.55)' }}
          >
            {!loading && <span aria-hidden="true" className="absolute top-0 left-0 w-[55%] h-full pointer-events-none animate-sheen" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)' }} />}
            <span className="relative">{loading ? 'Đang xử lý...' : 'Đăng nhập bằng Zalo'}</span>
          </Button>
        </CardContent>
      </Card>

      {/* Bản đồ — chỉ hiện khi có phản ánh có toạ độ thực */}
      {showMap && (
        <div className="w-full max-w-sm space-y-2">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-red-500 inline-block" />
            <p className="text-sm font-medium text-foreground">
              Phản ánh đang chờ xử lý ({mapPoints.length} điểm)
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            Nhấn vào điểm đỏ để xem nội dung. Đường viền xanh là ranh giới xã.
          </p>
          <ComplaintMap points={mapPoints} />
        </div>
      )}
    </BlobBackground>
  )
}

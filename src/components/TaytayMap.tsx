import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

/** Barangay centers of Taytay, Rizal (from OpenStreetMap / Nominatim). */
export const BARANGAY_COORDS: Record<string, [number, number]> = {
  Dolores: [14.5693434, 121.1354143],
  'San Juan': [14.5585639, 121.1360313],
  'San Isidro': [14.5766542, 121.1331821],
  'Sta. Ana': [14.5654235, 121.1267997],
  Muzon: [14.5438526, 121.1443721],
}
export const TAYTAY_CENTER: [number, number] = [14.5625, 121.1345]

/** Distance in km between two coordinates (haversine). */
export function distanceKm(a: [number, number], b: [number, number]) {
  const R = 6371
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b[0] - a[0])
  const dLng = toRad(b[1] - a[1])
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

export interface MapPin {
  barangay: string
  title: string
  detail?: string
  today?: boolean
  mine?: boolean
}
export interface UnitPin {
  id: string
  name: string
  barangay?: string
  coords: [number, number]
  active: boolean // deployed and serving today
  detail: string
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)
const TRUCK =
  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg>'

/** Interactive map of Taytay, Rizal: barangays, Rolling Botika units, your location and the nearest unit. */
export function TaytayMap({
  pins,
  units = [],
  me,
  nearestId,
  focusUnit,
  selected,
  onSelect,
  onUnit,
}: {
  pins: MapPin[]
  units?: UnitPin[]
  me?: [number, number] | null
  nearestId?: string | null
  focusUnit?: string | null
  selected?: string
  onSelect?: (barangay: string) => void
  onUnit?: (id: string) => void
}) {
  const el = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const layer = useRef<L.LayerGroup | null>(null)
  const pick = useRef(onSelect)
  const pickUnit = useRef(onUnit)
  pick.current = onSelect
  pickUnit.current = onUnit

  useEffect(() => {
    if (!el.current || map.current) return
    const m = L.map(el.current, { scrollWheelZoom: false }).setView(TAYTAY_CENTER, 14)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(m)
    layer.current = L.layerGroup().addTo(m)
    map.current = m
    return () => {
      m.remove()
      map.current = null
    }
  }, [])

  useEffect(() => {
    const m = map.current
    const g = layer.current
    if (!m || !g) return
    g.clearLayers()
    const pts: L.LatLngExpression[] = []

    // One marker per barangay; a Rolling Botika deployed there is shown inside the marker.
    const unitIn = new Map(units.filter((u) => u.barangay).map((u) => [u.barangay!, u]))
    for (const p of pins) {
      const c = BARANGAY_COORDS[p.barangay]
      if (!c) continue
      pts.push(c)
      const u = unitIn.get(p.barangay)
      const near = !!u && u.id === nearestId
      const cls = ['map-pin', p.today ? 'today' : '', p.mine ? 'mine' : '', selected === p.barangay ? 'sel' : '', u ? `has-unit ${u.active ? 'unit-on' : 'unit-off'}` : '', near ? 'near' : ''].join(' ')
      const html = `<span class="${cls}">${u ? `<i class="pin-truck">${TRUCK}</i>` : ''}<b>${esc(p.barangay)}</b>${near ? '<em>Nearest</em>' : ''}</span>`
      const popup = `<b>Brgy. ${esc(p.barangay)}</b><br>${esc(p.title)}${p.detail ? `<br><small>${esc(p.detail)}</small>` : ''}${u ? `<hr><b>${esc(u.name)}</b><br><small>${esc(u.detail)}</small>` : ''}`
      const mk = L.marker(c, { icon: L.divIcon({ className: '', html, iconSize: [0, 0] }), title: u ? `${u.name}, Barangay ${p.barangay}` : `Barangay ${p.barangay}`, keyboard: true, zIndexOffset: near ? 1000 : u ? 500 : 0 })
        .bindPopup(popup, { offset: [0, -30] })
        .on('click', () => (u ? pickUnit.current?.(u.id) : pick.current?.(p.barangay)))
        .addTo(g)
      if ((u && focusUnit === u.id) || (selected === p.barangay && !focusUnit)) mk.openPopup()
    }
    // Units outside the barangay markers
    for (const u of units.filter((x) => !x.barangay || !BARANGAY_COORDS[x.barangay])) {
      pts.push(u.coords)
      const near = u.id === nearestId
      const icon = L.divIcon({ className: '', html: `<span class="truck-pin ${u.active ? 'on' : 'off'} ${near ? 'near' : ''}">${TRUCK}${near ? '<em>Nearest</em>' : ''}</span>`, iconSize: [0, 0] })
      const mk = L.marker(u.coords, { icon, title: u.name, keyboard: true, zIndexOffset: near ? 1000 : 500 })
        .bindPopup(`<b>${esc(u.name)}</b><br><small>${esc(u.detail)}</small>`, { offset: [0, -20] })
        .on('click', () => pickUnit.current?.(u.id))
        .addTo(g)
      if (focusUnit === u.id) mk.openPopup()
    }

    // you are here + route line to nearest
    if (me) {
      pts.push(me)
      L.circle(me, { radius: 120, color: '#137fb9', weight: 1, fillColor: '#137fb9', fillOpacity: 0.12 }).addTo(g)
      L.marker(me, { icon: L.divIcon({ className: '', html: '<span class="me-pin"><i></i></span>', iconSize: [0, 0] }), title: 'You are here', zIndexOffset: 2000 })
        .bindPopup('<b>You are here</b>')
        .addTo(g)
      const n = units.find((u) => u.id === nearestId)
      if (n) L.polyline([me, n.coords], { color: '#006398', weight: 4, dashArray: '8 8', opacity: 0.85 }).addTo(g)
    }

    const fu = units.find((u) => u.id === focusUnit)
    const sel = selected && BARANGAY_COORDS[selected]
    if (fu) m.setView(fu.coords, 16, { animate: false })
    else if (sel) m.setView(sel, Math.max(m.getZoom(), 14), { animate: false })
    else if (me && nearestId) {
      const n = units.find((u) => u.id === nearestId)
      if (n) m.fitBounds(L.latLngBounds([me, n.coords]), { padding: [70, 70], maxZoom: 16, animate: false })
    } else if (pts.length > 1) m.fitBounds(L.latLngBounds(pts), { padding: [40, 40], maxZoom: 15, animate: false })
  }, [pins, units, me, nearestId, focusUnit, selected])

  return <div ref={el} className="taytay-map" role="region" aria-label="Map of Taytay, Rizal with Rolling Botika units" />
}

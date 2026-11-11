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

export interface MapPin {
  barangay: string
  title: string // e.g. "Next visit Nov 14"
  detail?: string // e.g. location and services
  today?: boolean
  mine?: boolean
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)

/** Interactive map of Taytay, Rizal with a pin per barangay. */
export function TaytayMap({ pins, selected, onSelect }: { pins: MapPin[]; selected?: string; onSelect?: (barangay: string) => void }) {
  const el = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const layer = useRef<L.LayerGroup | null>(null)
  const pick = useRef(onSelect)
  pick.current = onSelect

  // create the map once
  useEffect(() => {
    if (!el.current || map.current) return
    const m = L.map(el.current, { scrollWheelZoom: false, attributionControl: true }).setView([14.5625, 121.1345], 14)
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

  // redraw pins when data changes
  useEffect(() => {
    const m = map.current
    const g = layer.current
    if (!m || !g) return
    g.clearLayers()
    const pts: L.LatLngExpression[] = []
    for (const p of pins) {
      const c = BARANGAY_COORDS[p.barangay]
      if (!c) continue
      pts.push(c)
      const cls = ['map-pin', p.today ? 'today' : '', p.mine ? 'mine' : '', selected === p.barangay ? 'sel' : ''].join(' ')
      const icon = L.divIcon({ className: '', html: `<span class="${cls}"><b>${esc(p.barangay)}</b></span>`, iconSize: [0, 0] })
      const marker = L.marker(c, { icon, title: p.barangay, keyboard: true })
        .bindPopup(`<b>Brgy. ${esc(p.barangay)}</b><br>${esc(p.title)}${p.detail ? `<br><small>${esc(p.detail)}</small>` : ''}`, { offset: [0, -28] })
        .on('click', () => pick.current?.(p.barangay))
        .addTo(g)
      if (selected === p.barangay) marker.openPopup()
    }
    const sel = selected && BARANGAY_COORDS[selected]
    if (sel) m.panTo(sel)
    else if (pts.length > 1) m.fitBounds(L.latLngBounds(pts), { padding: [40, 40], maxZoom: 15 })
  }, [pins, selected])

  return <div ref={el} className="taytay-map" role="region" aria-label="Map of Taytay, Rizal with Rolling Botika schedules" />
}

import { useMemo, useState } from 'react'
import { BellRing, BellOff, MapPin } from 'lucide-react'
import { useStore } from '../../lib/store'
import { useResident } from './context'
import { Icon } from '../../components/Icon'
import { Empty, useToast } from '../../components/ui'
import { Weather } from '../../components/Weather'
import { TaytayMap, BARANGAY_COORDS, TAYTAY_CENTER, distanceKm, type MapPin as Pin, type UnitPin } from '../../components/TaytayMap'
import { nowServing } from '../../lib/domain'
import { LocateFixed, Navigation, Truck as TruckIcon } from 'lucide-react'
import { BARANGAYS, fmtTime, isoDate, medicineStatus } from '../../lib/utils'
import type { Service } from '../../lib/types'

const ALERT_KEY = 'smilecare:alerts'

export default function RSchedule() {
  const { data } = useStore()
  const { resident, go } = useResident()
  const toast = useToast()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState<string | null>(null)
  const [alerts, setAlerts] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(ALERT_KEY) || 'null') ?? [resident.barangay]
    } catch {
      return [resident.barangay]
    }
  })
  const toggleAlert = (b: string) => {
    const next = alerts.includes(b) ? alerts.filter((x) => x !== b) : [...alerts, b]
    setAlerts(next)
    try {
      localStorage.setItem(ALERT_KEY, JSON.stringify(next))
    } catch {
      /* ignore */
    }
    toast(next.includes(b) ? `You'll be alerted about visits in Brgy. ${b}` : `Alerts off for Brgy. ${b}`)
  }

  const today = isoDate()
  /** Deployments = upcoming services grouped by date + location. */
  const deployments = useMemo(() => {
    const groups = new Map<string, Service[]>()
    for (const s of data.services.filter((x) => x.date >= today && x.status !== 'COMPLETED' && x.status !== 'CANCELLED')) {
      const k = `${s.date}|${s.location}`
      groups.set(k, [...(groups.get(k) ?? []), s])
    }
    const s = q.trim().toLowerCase()
    return [...groups.values()]
      .map((list) => ({ key: `${list[0].date}|${list[0].location}`, date: list[0].date, location: list[0].location, barangay: list[0].barangay ?? '', unitId: list.find((x) => x.unitId)?.unitId, services: list }))
      .filter((d) => !s || `${d.location} ${d.barangay}`.toLowerCase().includes(s))
      .sort((a, b) => a.date.localeCompare(b.date))
  }, [data.services, today, q])

  /** Medicines available for a deployment: its unit's loaded stock, or central stock for the health office. */
  const availability = (unitId?: string) => {
    const unit = data.units.find((u) => u.id === unitId)
    const list = data.medicines.filter((m) => medicineStatus(m) !== 'EXPIRED')
    return list
      .map((m) => {
        const qty = unit?.stock ? unit.stock[m.id] ?? 0 : m.stock
        return { m, qty, state: qty <= 0 ? 'Out of stock' : qty < 30 ? 'Limited' : 'Available' }
      })
      .filter((x) => (unit?.stock ? x.m.id in unit.stock : true))
      .sort((a, b) => b.qty - a.qty)
  }

  const pins = useMemo<Pin[]>(
    () =>
      BARANGAYS.map((b) => {
        const n = data.services.filter((s) => s.barangay === b && s.date >= today && s.status !== 'CANCELLED' && s.status !== 'COMPLETED').sort((a, x) => a.date.localeCompare(x.date))[0]
        return {
          barangay: b,
          title: n ? `${n.date === today ? 'Today' : 'Next visit ' + new Date(n.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} • ${fmtTime(n.start)} - ${fmtTime(n.end)}` : 'No visit scheduled yet',
          detail: n ? n.location : undefined,
          today: n?.date === today,
          mine: b === resident.barangay,
        }
      }),
    [data.services, today, resident.barangay],
  )

  /* ---------- locator & nearest Rolling Botika detector ---------- */
  const [me, setMe] = useState<[number, number] | null>(null)
  const [meNote, setMeNote] = useState('')
  const [locating, setLocating] = useState(false)
  const [focusUnit, setFocusUnit] = useState<string | null>(null)

  /** Pseudo location: a spot inside the chosen barangay (used for demos or when GPS isn't available). */
  const setPseudo = (b: string, why: string) => {
    const c = BARANGAY_COORDS[b] ?? TAYTAY_CENTER
    setMe([c[0] - 0.0026, c[1] + 0.0011]) // a spot just south of the barangay marker, clear of its label
    setMeNote(why)
    setFocusUnit(null)
    setLocating(false)
  }
  const locate = () => {
    setLocating(true)
    setFocusUnit(null)
    if (!('geolocation' in navigator)) return setPseudo(resident.barangay, `Location isn't available on this device, so a demo location in Brgy. ${resident.barangay} is used.`)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const c: [number, number] = [pos.coords.latitude, pos.coords.longitude]
        if (distanceKm(c, TAYTAY_CENTER) > 6) return setPseudo(resident.barangay, `You seem to be outside Taytay, so a demo location in Brgy. ${resident.barangay} is used.`)
        setMe(c)
        setMeNote('Using your device location.')
        setLocating(false)
      },
      () => setPseudo(resident.barangay, `Location permission wasn't given, so a demo location in Brgy. ${resident.barangay} is used.`),
      { timeout: 8000, enableHighAccuracy: true, maximumAge: 60000 },
    )
  }

  const unitPins = useMemo<(UnitPin & { km: number | null; next?: string; status: string; queue: number; serving: number; until: string })[]>(() => {
    return data.units
      .filter((u) => u.kind === 'Rolling Botika')
      .map((u) => {
        // Units are drawn on their barangay's point (truck above, barangay name below).
        const coords: [number, number] = BARANGAY_COORDS[u.barangay ?? ''] ?? u.coords ?? TAYTAY_CENTER
        const active = u.status !== 'CLOSED'
        const next = data.services.filter((x) => x.unitId === u.id && x.date >= today && x.status !== 'CANCELLED' && x.status !== 'COMPLETED').sort((a, b) => a.date.localeCompare(b.date))[0]
        const serving = nowServing(data, u.id)
        const detail = active
          ? `${u.status === 'IN PROGRESS' ? 'Serving now' : 'Open'} until ${fmtTime(u.until)} • now serving #${serving || '—'} • ${u.queue} in queue • ${u.location}`
          : next
            ? `Not deployed today • next visit ${new Date(next.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at ${next.location}`
            : `Not deployed today • ${u.location}`
        return { id: u.id, name: u.name, barangay: u.barangay, coords, active, detail, km: me ? distanceKm(me, coords) : null, next: next?.date, status: u.status, queue: u.queue, serving, until: u.until }
      })
      .sort((a, b) => (a.km ?? 0) - (b.km ?? 0) || Number(b.active) - Number(a.active))
  }, [data, me, today])
  const nearest = me ? unitPins.find((u) => u.active) ?? null : null
  const fmtKm = (km: number) => (km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`)
  const mins = (km: number, kmh: number) => Math.max(1, Math.round((km / kmh) * 60))

  const nextFor = (b: string) => data.services.filter((s) => s.barangay === b && s.date >= today && s.status !== 'CANCELLED' && s.status !== 'COMPLETED').sort((a, x) => a.date.localeCompare(x.date))[0]

  return (
    <div className="page rpage">
      <div className="page-head">
        <div>
          <h1 className="rtitle">Schedule &amp; availability</h1>
          <p>Find the Rolling Botika and municipal health services near you.</p>
        </div>
      </div>

      <div className="toolbar">
        <div className="search">
          <Icon name="search" className="ic-blue" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search barangay or location" aria-label="Search barangay or location" />
        </div>
      </div>

      <section className="card map-card">
        <div className="card-head">
          <div>
            <h3>Taytay, Rizal map &amp; weather</h3>
            <p className="muted small">Find the nearest Rolling Botika, see every deployed unit, and tap a barangay to see its schedule.</p>
          </div>
          {q && <button className="btn btn-outline sm" onClick={() => setQ('')}>Show all barangays</button>}
        </div>
        <div className="map-weather">
          <div>
            <div className="locate-bar">
              <button className="btn btn-primary sm" onClick={locate} disabled={locating}><LocateFixed size={16} /> {locating ? 'Locating…' : 'Locate me'}</button>
              <label className="pretend">
                <span className="muted small">or pretend I'm in</span>
                <select className="mini-select" value="" onChange={(e) => e.target.value && setPseudo(e.target.value, `Demo location in Brgy. ${e.target.value}.`)} aria-label="Pretend location">
                  <option value="">Choose barangay…</option>
                  {BARANGAYS.map((b) => <option key={b}>{b}</option>)}
                </select>
              </label>
              {me && <button className="btn btn-ghost sm" onClick={() => { setMe(null); setMeNote(''); setFocusUnit(null) }}>Clear</button>}
            </div>
            <TaytayMap pins={pins} units={unitPins} me={me} nearestId={nearest?.id} focusUnit={focusUnit} selected={BARANGAYS.find((b) => b.toLowerCase() === q.trim().toLowerCase())} onSelect={(b) => { setFocusUnit(null); setQ(b) }} onUnit={(id) => setFocusUnit(id)} />
            <div className="map-legend">
              <span><i className="lg-dot today" /> Visit today</span>
              <span><i className="lg-dot" /> Upcoming / none</span>
              <span><i className="lg-dot mine" /> Your barangay</span>
              <span><i className="lg-truck on" /> Rolling Botika deployed</span>
              <span><i className="lg-truck" /> Not deployed today</span>
              <span><i className="lg-me" /> You are here</span>
            </div>
          </div>
          <Weather />
        </div>

        <div className="nearest">
          {nearest && me && (
            <div className="nearest-hero">
              <Navigation size={22} />
              <div className="grow">
                <small>Nearest Rolling Botika</small>
                <b>{nearest.name}</b>
                <span>{fmtKm(nearest.km!)} away • about {mins(nearest.km!, 4.5)} min walk or {mins(nearest.km!, 18)} min by tricycle • now serving #{nearest.serving || '—'}, {nearest.queue} in queue</span>
                {meNote && <em>{meNote}</em>}
              </div>
              <button className="btn btn-white sm" onClick={() => go('my-booking')}>Join E-Pila</button>
            </div>
          )}
          {!me && <p className="muted small">Tap <b>Locate me</b> to find the Rolling Botika nearest to you. All deployed units are shown on the map.</p>}
          <div className="unit-dist">
            {unitPins.map((u) => (
              <button key={u.id} className={`unit-row ${u.id === nearest?.id ? 'near' : ''} ${u.active ? '' : 'off'}`} onClick={() => setFocusUnit(u.id)}>
                <span className={`truck-dot ${u.active ? 'on' : ''}`}><TruckIcon size={16} /></span>
                <span className="grow">
                  <b>{u.name}</b>
                  <small className="muted">{u.active ? `${u.status === 'IN PROGRESS' ? 'Serving now' : 'Open'} until ${fmtTime(u.until)} • ${u.queue} in queue` : u.next ? `Next visit ${new Date(u.next + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : 'Not deployed today'}</small>
                </span>
                {u.km != null && <span className="dist">{fmtKm(u.km)}</span>}
                <span className={`pill ${u.active ? 'pill-ok' : 'pill-wait'}`}>{u.active ? 'DEPLOYED' : 'SCHEDULED'}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="card">
        <div className="card-head">
          <div>
            <h3>Barangay coverage</h3>
            <p className="muted small">Turn on alerts for the barangays you want to hear about.</p>
          </div>
          <span className="muted small">{BARANGAYS.length} barangays • Taytay, Rizal</span>
        </div>
        <div className="brgy-grid">
          {BARANGAYS.map((b) => {
            const n = nextFor(b)
            const on = alerts.includes(b)
            return (
              <div key={b} className={`brgy ${b === resident.barangay ? 'mine' : ''}`}>
                <div className="brgy-top">
                  <MapPin size={18} />
                  <b>{b}</b>
                  <button className={`icon-btn sm ${on ? 'ok' : ''}`} onClick={() => toggleAlert(b)} aria-label={on ? `Turn off alerts for ${b}` : `Turn on alerts for ${b}`} aria-pressed={on}>
                    {on ? <BellRing size={16} /> : <BellOff size={16} />}
                  </button>
                </div>
                <small className="muted">{n ? `Next visit ${new Date(n.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : 'No visit scheduled yet'}</small>
                {b === resident.barangay && <span className="tag">YOUR BARANGAY</span>}
              </div>
            )
          })}
        </div>
      </section>

      <h3 className="sec-title">Upcoming schedules</h3>
      {deployments.length === 0 && (
        <section className="card">
          <Empty text={q ? 'No schedules match your search.' : 'No upcoming schedules yet. Check the announcements for updates.'} />
        </section>
      )}
      <div className="deploy-list">
        {deployments.map((d) => {
          const dt = new Date(d.date + 'T00:00:00')
          const isOpen = open === d.key
          const meds = availability(d.unitId)
          const start = d.services.map((s) => s.start).sort()[0]
          const end = d.services.map((s) => s.end).sort().slice(-1)[0]
          return (
            <section key={d.key} className={`deploy card ${d.barangay === resident.barangay ? 'mine' : ''}`}>
              <div className="deploy-head">
                <span className="date-tile sm">
                  <b>{dt.getDate()}</b>
                  <small>{dt.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}</small>
                </span>
                <div className="grow">
                  <b className="deploy-title">{d.unitId ? 'Rolling Botika' : 'Health service'} • Brgy. {d.barangay || d.location}</b>
                  <small className="muted">
                    {dt.toLocaleDateString('en-US', { weekday: 'long' })} • {fmtTime(start)} - {fmtTime(end)} • {d.location}
                  </small>
                </div>
                {d.date === today && <span className="pill pill-ok">TODAY</span>}
              </div>
              <div className="svc-chips">
                {d.services.map((s) => {
                  const left = Math.max(0, s.capacity - s.booked)
                  return (
                    <span key={s.id} className={`svc-chip ${left === 0 ? 'full' : ''}`}>
                      {s.name} <small>{left === 0 ? 'Fully booked' : `${left} slots left`}</small>
                    </span>
                  )
                })}
              </div>
              <div className="btn-row">
                <button className="btn btn-outline sm" onClick={() => setOpen(isOpen ? null : d.key)} aria-expanded={isOpen}>
                  {isOpen ? 'Hide medicines' : 'Check medicine availability'}
                </button>
                <button className="btn btn-primary sm" onClick={() => go('my-booking')}>
                  Pre-book a slot
                </button>
              </div>
              {isOpen && (
                <div className="avail">
                  {meds.length === 0 && <p className="muted small">No medicines have been loaded for this deployment yet.</p>}
                  {meds.map(({ m, qty, state }) => (
                    <div key={m.id} className="avail-row">
                      <span className="grow">
                        <b>
                          {m.name} {m.strength}
                        </b>
                        <small className="muted">{m.purpose}</small>
                      </span>
                      <span className={`pill ${state === 'Available' ? 'pill-ok' : state === 'Limited' ? 'pill-wait' : 'pill-no'}`}>{state === 'Available' ? `${qty} available` : state}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )
        })}
      </div>
    </div>
  )
}

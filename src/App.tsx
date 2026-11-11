import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { AlertTriangle, UserCheck, ClipboardPlus, Syringe, UserCog, CalendarClock, Megaphone, Ticket as TicketIcon, LifeBuoy } from 'lucide-react'
import { DataProvider, useStore } from './lib/store'
import { ToastProvider } from './components/ui'
import { Layout, type NavItem, type Notice } from './components/Layout'
import { can, currentSession, logout, normEmail, type Permission, type Session } from './lib/auth'
import { medicineStatus, isoDate, fmtDate } from './lib/utils'
import { useReadState } from './lib/readState'
import { ResidentContext } from './pages/resident/context'
import type { StaffRole } from './lib/types'
import Home from './pages/Home'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Residents from './pages/Residents'
import Inventory from './pages/Inventory'
import Services from './pages/Services'
import Dispensing from './pages/Dispensing'
import Consultations from './pages/Consultations'
import Vaccinations from './pages/Vaccinations'
import Botika from './pages/Botika'
import Announcements from './pages/Announcements'
import Analytics from './pages/Analytics'
import StaffPage from './pages/Staff'
import Preferences from './pages/Preferences'
import RHome from './pages/resident/RHome'
import RSchedule from './pages/resident/RSchedule'
import RBooking from './pages/resident/RBooking'
import RHistory from './pages/resident/RHistory'
import RProfile from './pages/resident/RProfile'
import RAnnouncements from './pages/resident/RAnnouncements'
import AskSmile from './pages/resident/AskSmile'
import RHelp from './pages/resident/RHelp'

/* ---------- navigation ---------- */
const STAFF_NAV: (NavItem & { perm: Permission })[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'dashboard', short: 'Home', perm: 'dashboard' },
  { id: 'residents', label: 'Residents', icon: 'residents', perm: 'residents' },
  { id: 'inventory', label: 'Medicine Inventory', icon: 'inventory', short: 'Inventory', perm: 'inventory' },
  { id: 'services', label: 'Health Services', icon: 'services', short: 'Services', perm: 'services' },
  { id: 'dispensing', label: 'Medicine Dispensing', icon: 'dispensing', short: 'Dispense', perm: 'dispensing' },
  { id: 'consultations', label: 'Consultations', icon: <ClipboardPlus size={24} strokeWidth={1.5} />, short: 'Consults', perm: 'consultations' },
  { id: 'vaccinations', label: 'Vaccinations', icon: <Syringe size={24} strokeWidth={1.5} />, short: 'Vaccines', perm: 'vaccinations' },
  { id: 'botika', label: 'Rolling Botika & E-Pila', icon: 'botika', short: 'Botika', perm: 'botika' },
  { id: 'announcements', label: 'Announcements', icon: 'r-announce', short: 'News', perm: 'announcements' },
  { id: 'analytics', label: 'Analytics & Reports', icon: 'analytics', short: 'Reports', perm: 'analytics' },
  { id: 'staff', label: 'Staff & Roles', icon: <UserCog size={24} strokeWidth={1.5} />, short: 'Staff', perm: 'staff' },
]
const STAFF_BOTTOM_ORDER = ['dashboard', 'residents', 'dispensing', 'inventory', 'consultations', 'botika']
const SETTINGS: NavItem = { id: 'preferences', label: 'Settings', icon: 'settings' }

const RESIDENT_NAV: NavItem[] = [
  { id: 'my-home', label: 'Home', icon: 'dashboard' },
  { id: 'my-schedule', label: 'Schedule', icon: 'r-schedule' },
  { id: 'my-booking', label: 'Appointment & E-Pila', icon: 'r-appointment', short: 'E-Pila' },
  { id: 'my-history', label: 'Health History', icon: 'r-history', short: 'History' },
  { id: 'my-profile', label: 'Profile & QR ID', icon: 'r-profile', short: 'Profile' },
  { id: 'my-announcements', label: 'Announcements', icon: 'r-announce', short: 'News' },
  { id: 'ask-smile', label: 'Ask SMILE', icon: 'r-ask' },
]
const RESIDENT_BOTTOM = ['my-home', 'my-schedule', 'my-booking', 'my-history']
const RESIDENT_ROUTES = new Set([...RESIDENT_NAV.map((n) => n.id), 'my-help'])
const STAFF_ROUTES = new Set([...STAFF_NAV.map((n) => n.id), 'preferences'])

const readHash = () => window.location.hash.replace(/^#/, '')

export default function App() {
  return (
    <ToastProvider>
      <DataProvider>
        <Router />
      </DataProvider>
    </ToastProvider>
  )
}

function Router() {
  const store = useStore()
  const { data, loaded, setActor } = store
  const [stored, setStored] = useState<Session | null>(() => currentSession())
  const [route, setRoute] = useState(readHash)

  useEffect(() => {
    const on = () => setRoute(readHash())
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])

  const go = useCallback((r: string) => {
    if (readHash() !== r) window.location.hash = r
    setRoute(r)
    window.scrollTo({ top: 0 })
  }, [])

  /* Re-check the session against the shared records: role changes and deactivation apply at once. */
  const session = useMemo<Session | null>(() => {
    if (!stored || !loaded) return stored
    if (stored.kind === 'staff') {
      const m = data.staff.find((s) => normEmail(s.email) === stored.email)
      if (!m || !m.active) return null
      return { ...stored, name: m.name, role: m.role as StaffRole, title: m.title }
    }
    const r = data.residents.find((x) => x.id === stored.residentId)
    return r ? { ...stored, name: r.name } : null
  }, [stored, loaded, data])

  useEffect(() => {
    if (stored && loaded && !session) {
      logout()
      setStored(null)
    }
  }, [stored, loaded, session])

  useEffect(() => {
    setActor(session ? { name: session.name, role: session.role } : null)
  }, [session, setActor])

  const signOut = () => {
    store.log('logout', 'session', `${session?.name ?? 'User'} signed out`)
    logout()
    setStored(null)
    go('login')
  }

  // Route guards
  useEffect(() => {
    if (!session) return
    if (session.kind === 'resident' && !RESIDENT_ROUTES.has(route)) go('my-home')
    if (session.kind === 'staff') {
      const allowed = STAFF_NAV.find((n) => n.id === route)
      if (route === 'preferences') return
      if (!allowed || !can(session, allowed.perm)) go('dashboard')
    }
  }, [session, route, go])

  if (!session) {
    if (route === 'login' || route === 'staff-login' || STAFF_ROUTES.has(route) || RESIDENT_ROUTES.has(route))
      return <Login key={route} initialKind={route === 'staff-login' || STAFF_ROUTES.has(route) ? 'staff' : 'resident'} onBack={() => go('home')} onLogin={(s) => { setStored(s); go(s.kind === 'staff' ? 'dashboard' : 'my-home') }} />
    return <Home onLogin={(k) => go(k === 'staff' ? 'staff-login' : 'login')} />
  }

  if (session.kind === 'resident') return <ResidentApp session={session} route={route} go={go} onLogout={signOut} />
  return <StaffApp session={session} route={route} go={go} onLogout={signOut} onSession={setStored} />
}

/* ---------------- Staff (administrative platform) ---------------- */
function StaffApp({ session, route, go, onLogout, onSession }: { session: Session; route: string; go: (r: string) => void; onLogout: () => void; onSession: (s: Session) => void }) {
  const { data } = useStore()
  const nav = STAFF_NAV.filter((n) => can(session, n.perm))
  const bottom = STAFF_BOTTOM_ORDER.map((id) => nav.find((n) => n.id === id)).filter(Boolean).slice(0, 4) as NavItem[]

  const notices = useMemo<Notice[]>(() => {
    const n: Notice[] = []
    if (can(session, 'inventory'))
      for (const m of data.medicines) {
        const st = medicineStatus(m)
        if (st !== 'GOOD') n.push({ key: m.id, icon: <AlertTriangle size={18} />, title: `${m.name} ${m.strength}`, text: st === 'LOW STOCK' ? `Low stock • ${m.stock} ${m.unit} left` : st.charAt(0) + st.slice(1).toLowerCase(), to: 'inventory' })
      }
    const pending = data.residents.filter((r) => r.status === 'PENDING').length
    if (pending && can(session, 'residents')) n.push({ key: 'res', icon: <UserCheck size={18} />, title: `${pending} verification request${pending > 1 ? 's' : ''}`, text: 'Residents awaiting review', to: 'residents' })
    const reqs = data.appointments.filter((a) => a.status === 'PENDING').length
    if (reqs && (can(session, 'services') || can(session, 'dispensing')))
      n.push({ key: 'apt', icon: <CalendarClock size={18} />, title: `${reqs} booking${reqs > 1 ? 's' : ''} to confirm`, text: 'Appointments and medicine requests from residents', to: can(session, 'services') ? 'services' : 'dispensing' })
    const tickets = data.support.filter((s) => s.status === 'OPEN').length
    if (tickets && can(session, 'staff')) n.push({ key: 'sup', icon: <LifeBuoy size={18} />, title: `${tickets} support request${tickets > 1 ? 's' : ''}`, text: 'Messages from residents', to: 'staff' })
    return n
  }, [data, session])

  const pages: Record<string, ReactNode> = {
    dashboard: <Dashboard go={go} session={session} />,
    residents: <Residents session={session} />,
    inventory: <Inventory />,
    services: <Services />,
    dispensing: <Dispensing session={session} />,
    consultations: <Consultations session={session} />,
    vaccinations: <Vaccinations session={session} />,
    botika: <Botika />,
    announcements: <Announcements session={session} />,
    analytics: <Analytics />,
    staff: <StaffPage session={session} />,
    preferences: <Preferences session={session} onSession={onSession} onLogout={onLogout} />,
  }
  return (
    <Layout route={route} go={go} name={session.name} subtitle={session.title ? `${session.role} • ${session.title}` : session.role} nav={nav} footerNav={[SETTINGS]} bottom={bottom} notices={notices} onLogout={onLogout} onProfile={() => go('preferences')}>
      {pages[route] ?? pages.dashboard}
    </Layout>
  )
}

/* ---------------- Residents (resident platform) ---------------- */
function ResidentApp({ session, route, go, onLogout }: { session: Session; route: string; go: (r: string) => void; onLogout: () => void }) {
  const { data } = useStore()
  const { read, markRead } = useReadState(session.residentId ?? session.email)
  const resident = data.residents.find((r) => r.id === session.residentId)

  const notices = useMemo<Notice[]>(() => {
    if (!resident) return []
    const n: Notice[] = []
    if (resident.status === 'PENDING') n.push({ key: 'ver', icon: <UserCheck size={18} />, title: 'Verification in progress', text: 'The Municipal Health Office is reviewing your documents.', to: 'my-profile' })
    if (resident.status === 'REJECTED') n.push({ key: 'ver', icon: <UserCheck size={18} />, title: 'Verification needs attention', text: resident.remarks || 'Please update your documents.', to: 'my-profile' })
    const today = isoDate()
    const soon = isoDate(new Date(Date.now() + 3 * 86400000))
    for (const a of data.appointments.filter((x) => x.residentId === resident.id && x.status === 'CONFIRMED' && x.date >= today && x.date <= soon))
      n.push({ key: a.id, icon: <CalendarClock size={18} />, title: `Upcoming: ${a.serviceName ?? 'Medicine pickup'}`, text: `${fmtDate(a.date)} • ${a.location}`, to: 'my-booking' })
    for (const t of data.tickets.filter((x) => x.residentId === resident.id && (x.status === 'WAITING' || x.status === 'SERVING')))
      n.push({ key: t.id, icon: <TicketIcon size={18} />, title: t.status === 'SERVING' ? `It's your turn! #${t.number}` : `E-Pila #${t.number}`, text: t.unitName, to: 'my-booking' })
    for (const a of [...data.announcements].sort((x, y) => y.date.localeCompare(x.date)).slice(0, 8))
      n.push({ key: a.id, icon: <Megaphone size={18} />, title: a.title, text: a.category.charAt(0) + a.category.slice(1).toLowerCase(), to: 'my-announcements', unread: !read.has(a.id) })
    return n
  }, [data, resident, read])

  if (!resident)
    return (
      <div className="auth-page">
        <div className="card narrow stack">
          <h2>Loading your SMILECare record…</h2>
          <p className="muted">If this doesn't load, your resident record may have been removed. Please contact the Municipal Health Office.</p>
          <button className="btn btn-outline" onClick={onLogout}>Sign out</button>
        </div>
      </div>
    )

  const pages: Record<string, ReactNode> = {
    'my-home': <RHome />,
    'my-schedule': <RSchedule />,
    'my-booking': <RBooking />,
    'my-history': <RHistory />,
    'my-profile': <RProfile />,
    'my-announcements': <RAnnouncements />,
    'ask-smile': <AskSmile />,
    'my-help': <RHelp />,
  }
  const bottom = RESIDENT_BOTTOM.map((id) => RESIDENT_NAV.find((n) => n.id === id)!)
  return (
    <ResidentContext.Provider value={{ session, resident, go, read, markRead }}>
      <Layout
        route={route}
        go={go}
        name={resident.name}
        subtitle={resident.status === 'APPROVED' ? 'Verified resident' : resident.status === 'PENDING' ? 'Verification pending' : 'Verification rejected'}
        nav={RESIDENT_NAV}
        bottom={bottom}
        notices={notices}
        helpRoute="my-help"
        onLogout={onLogout}
        onProfile={() => go('my-profile')}
      >
        {pages[route] ?? pages['my-home']}
      </Layout>
    </ResidentContext.Provider>
  )
}

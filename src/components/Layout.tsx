import { useMemo, useState, type ReactNode } from 'react'
import { Menu, X, AlertTriangle, UserCheck } from 'lucide-react'
import { Icon, BellIcon, type IconName } from './Icon'
import { useStore } from '../lib/store'
import type { Session } from '../lib/auth'
import { initials, medicineStatus } from '../lib/utils'
import { Modal } from './ui'
import { SUPPORT } from '../config'

export const NAV: readonly { id: string; label: string; icon: IconName }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
  { id: 'residents', label: 'Residents', icon: 'residents' },
  { id: 'inventory', label: 'Medicine Inventory', icon: 'inventory' },
  { id: 'services', label: 'Health Services', icon: 'services' },
  { id: 'dispensing', label: 'Medicine Dispensing', icon: 'dispensing' },
  { id: 'botika', label: 'Rolling Botika & E-Pila', icon: 'botika' },
  { id: 'analytics', label: 'Analytics & Reports', icon: 'analytics' },
]

const BOTTOM: readonly { id: string; label: string; icon: IconName }[] = [
  { id: 'dashboard', label: 'Home', icon: 'dashboard' },
  { id: 'residents', label: 'Residents', icon: 'residents' },
  { id: 'inventory', label: 'Inventory', icon: 'inventory' },
  { id: 'dispensing', label: 'Dispense', icon: 'dispensing' },
]

export function Logo({ light }: { light?: boolean }) {
  return (
    <div className={`logo ${light ? 'logo-light' : ''}`}>
      <svg width="36" height="36" viewBox="0 0 36 36" aria-hidden="true">
        <rect width="36" height="36" rx="10" fill="currentColor" opacity=".14" />
        <path d="M18 9v18M9 18h18" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
        <path d="M11.5 22.5c3.6 3.4 9.4 3.4 13 0" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" fill="none" opacity=".7" />
      </svg>
      <span>
        SMILE<b>Care</b>
      </span>
    </div>
  )
}

export function Layout({
  route,
  go,
  session,
  onLogout,
  children,
}: {
  route: string
  go: (r: string) => void
  session: Session
  onLogout: () => void
  children: ReactNode
}) {
  const { data, backend, stale, error } = useStore()
  const [drawer, setDrawer] = useState(false)
  const [bellOpen, setBellOpen] = useState(false)
  const [help, setHelp] = useState(false)

  const notifications = useMemo(() => {
    const n: { key: string; icon: ReactNode; title: string; text: string; to: string }[] = []
    for (const m of data.medicines) {
      const st = medicineStatus(m)
      if (st !== 'GOOD')
        n.push({
          key: m.id,
          icon: <AlertTriangle size={18} />,
          title: `${m.name} ${m.strength}`,
          text: st === 'OUT OF STOCK' ? 'Out of stock' : st === 'LOW STOCK' ? `Low stock • ${m.stock} ${m.unit} left` : st === 'EXPIRED' ? 'Expired' : 'Expiring soon',
          to: 'inventory',
        })
    }
    const pending = data.residents.filter((r) => r.status === 'PENDING').length
    if (pending)
      n.push({ key: 'res', icon: <UserCheck size={18} />, title: `${pending} verification request${pending > 1 ? 's' : ''}`, text: 'Residents awaiting review', to: 'residents' })
    return n
  }, [data.medicines, data.residents])

  const nav = (id: string) => {
    go(id)
    setDrawer(false)
  }

  const statusText =
    backend === 'connecting'
      ? 'Connecting…'
      : backend === 'local'
        ? 'Offline demo • Saved in this browser'
        : error
          ? 'Sync error • Changes may not save'
          : stale
            ? 'Reconnecting • Data may be out of date'
            : 'Online • Synced live'
  const statusTone = backend === 'shared' && !error && !stale ? 'ok' : backend === 'connecting' || stale ? 'warn' : 'off'

  return (
    <div className="shell">
      <aside className={`sidebar ${drawer ? 'open' : ''}`}>
        <div className="sidebar-top">
          <Logo />
          <button className="icon-btn only-mobile" onClick={() => setDrawer(false)} aria-label="Close menu">
            <X size={22} />
          </button>
        </div>
        <nav className="nav">
          {NAV.map(({ id, label, icon }) => (
            <button key={id} className={`nav-item ${route === id ? 'active' : ''}`} onClick={() => nav(id)}>
              <span className="nav-ic"><Icon name={icon} /></span>
              <span>{label}</span>
            </button>
          ))}
          <button className={`nav-item ${route === 'preferences' ? 'active' : ''}`} onClick={() => nav('preferences')}>
            <span className="nav-ic"><Icon name="settings" /></span>
            <span>Settings</span>
          </button>
        </nav>
        <div className="nav-bottom">
          <button className="nav-help" onClick={() => setHelp(true)}>
            <span className="nav-ic"><Icon name="help" /></span>
            <span>
              <b>Need help?</b>
              <small>Contact IT Support</small>
            </span>
          </button>
          <button className="nav-item signout" onClick={onLogout}>
            <span className="nav-ic"><Icon name="logout" /></span>
            <span>Sign out</span>
          </button>
        </div>
      </aside>
      {drawer && <div className="scrim" onClick={() => setDrawer(false)} />}

      <div className="main">
        <header className="header">
          <span className="only-mobile header-logo"><Logo /></span>
          <div className={`sync sync-${statusTone}`}>
            <span className="dot" />
            {statusText}
          </div>
          <div className="header-right">
            <div className="bell-wrap">
              <button className="icon-btn bell" onClick={() => setBellOpen((v) => !v)} aria-label={`Notifications (${notifications.length})`}>
                <BellIcon />
                {notifications.length > 0 && <span className="bell-count">{notifications.length}</span>}
              </button>
              {bellOpen && (
                <>
                  <div className="click-away" onClick={() => setBellOpen(false)} />
                  <div className="dropdown">
                    <div className="dropdown-head">Notifications</div>
                    {notifications.length === 0 && <div className="dropdown-empty">You're all caught up.</div>}
                    {notifications.map((n) => (
                      <button
                        key={n.key}
                        className="dropdown-item"
                        onClick={() => {
                          setBellOpen(false)
                          go(n.to)
                        }}
                      >
                        <span className="di-icon">{n.icon}</span>
                        <span>
                          <b>{n.title}</b>
                          <small>{n.text}</small>
                        </span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <button className="profile" onClick={() => go('preferences')}>
              <span className="avatar">{initials(session.name)}</span>
              <span className="profile-text">
                <b>{session.name}</b>
                <small>{session.role}</small>
              </span>
            </button>
          </div>
        </header>
        <main className="content">{children}</main>
      </div>

      <nav className="bottom-nav" aria-label="Main">
        {BOTTOM.map(({ id, label, icon }) => (
          <button key={id} className={`bn-item ${route === id ? 'active' : ''}`} onClick={() => nav(id)} aria-current={route === id ? 'page' : undefined}>
            <span className="bn-ic"><Icon name={icon} /></span>
            <span>{label}</span>
          </button>
        ))}
        <button className={`bn-item ${drawer || !BOTTOM.some((b) => b.id === route) ? 'active' : ''}`} onClick={() => setDrawer((v) => !v)} aria-expanded={drawer} aria-label="More pages">
          <span className="bn-ic"><Menu size={24} strokeWidth={1.6} /></span>
          <span>More</span>
        </button>
      </nav>

      <Modal open={help} title="IT Support" subtitle="SMILECare Municipal Health Office" onClose={() => setHelp(false)}>
        <div className="stack">
          <p>For account, access or system issues, reach the SMILECare IT desk:</p>
          {!SUPPORT.email && !SUPPORT.phone && (
            <p className="muted">Support contact details haven't been set up yet. Please ask your SMILECare administrator.</p>
          )}
          {SUPPORT.email && (
            <div className="info-row">
              <span className="muted">Email</span>
              <a href={`mailto:${SUPPORT.email}`}>{SUPPORT.email}</a>
            </div>
          )}
          {SUPPORT.phone && (
            <div className="info-row">
              <span className="muted">Hotline</span>
              <b>{SUPPORT.phone}</b>
            </div>
          )}
          <div className="info-row">
            <span className="muted">Hours</span>
            <b>{SUPPORT.hours}</b>
          </div>
        </div>
      </Modal>
    </div>
  )
}

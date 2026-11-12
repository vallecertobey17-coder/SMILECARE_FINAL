import { isValidElement, useState, type ReactElement, type ReactNode } from 'react'
import { Menu, X } from 'lucide-react'
import { Icon, BellIcon, type IconName } from './Icon'
import { useStore } from '../lib/store'
import { initials } from '../lib/utils'
import { Modal } from './ui'
import { PROJECT } from '../config'
import { BrandLogo } from './BrandMark'

export interface NavItem {
  id: string
  label: string
  icon: IconName | ReactElement
  short?: string // label used in the mobile tab bar
}
export interface Notice {
  key: string
  icon: ReactNode
  title: string
  text: string
  to: string
  unread?: boolean
}

const renderIcon = (icon: NavItem['icon']) => (isValidElement(icon) ? icon : <Icon name={icon as IconName} />)

export function Logo({ light }: { light?: boolean }) {
  return <BrandLogo size={light ? 56 : 46} light={light} />
}

export function Layout({
  route,
  go,
  name,
  subtitle,
  nav,
  bottom,
  footerNav,
  notices,
  onNoticesOpen,
  onLogout,
  onProfile,
  helpRoute,
  children,
}: {
  route: string
  go: (r: string) => void
  name: string
  subtitle: string
  nav: NavItem[]
  bottom: NavItem[]
  footerNav?: NavItem[]
  notices: Notice[]
  onNoticesOpen?: () => void
  onLogout: () => void
  onProfile: () => void
  helpRoute?: string
  children: ReactNode
}) {
  const { backend, stale, error, online, pending } = useStore()
  const [drawer, setDrawer] = useState(false)
  const [bellOpen, setBellOpen] = useState(false)
  const [help, setHelp] = useState(false)
  const unread = notices.filter((n) => n.unread !== false).length

  const navTo = (id: string) => {
    go(id)
    setDrawer(false)
  }

  const statusText = !online
    ? `Offline • ${pending ? `${pending} change${pending > 1 ? 's' : ''} will sync` : 'Changes will sync later'}`
    : pending
      ? `Syncing ${pending} offline change${pending > 1 ? 's' : ''}…`
      : backend === 'connecting'
        ? 'Connecting…'
        : backend === 'local'
          ? 'Demo mode • Saved in this browser'
          : error
            ? 'Sync error • Changes may not save'
            : stale
              ? 'Reconnecting • Data may be out of date'
              : 'Online • Synced just now'
  const statusTone = !online || pending ? 'warn' : backend === 'shared' && !error && !stale ? 'ok' : backend === 'connecting' || stale ? 'warn' : 'off'

  const item = ({ id, label, icon }: NavItem) => (
    <button key={id} className={`nav-item ${route === id ? 'active' : ''}`} onClick={() => navTo(id)} aria-current={route === id ? 'page' : undefined}>
      <span className="nav-ic">{renderIcon(icon)}</span>
      <span>{label}</span>
    </button>
  )

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
          {nav.map(item)}
          {footerNav?.map(item)}
        </nav>
        <div className="nav-bottom">
          <button className="nav-help" onClick={() => (helpRoute ? navTo(helpRoute) : setHelp(true))}>
            <span className="nav-ic">
              <Icon name="help" />
            </span>
            <span>
              <b>Need help?</b>
              <small>Contact IT Support</small>
            </span>
          </button>
          <button className="nav-item signout" onClick={onLogout}>
            <span className="nav-ic">
              <Icon name="logout" />
            </span>
            <span>Sign out</span>
          </button>
        </div>
      </aside>
      {drawer && <div className="scrim" onClick={() => setDrawer(false)} />}

      <div className="main">
        <header className="header">
          <button className="icon-btn only-mobile menu-btn" onClick={() => setDrawer(true)} aria-label="Open menu">
            <Menu size={28} strokeWidth={2.4} />
          </button>
          <span className="only-mobile header-logo">
            <Logo />
          </span>
          <div className={`sync sync-${statusTone}`}>
            <span className="dot" />
            {statusText}
          </div>
          <div className="header-right">
            <div className="bell-wrap">
              <button
                className="icon-btn bell"
                onClick={() => {
                  setBellOpen((v) => !v)
                  onNoticesOpen?.()
                }}
                aria-label={`Notifications (${unread} unread)`}
              >
                <BellIcon />
                {unread > 0 && <span className="bell-count">{unread}</span>}
              </button>
              {bellOpen && (
                <>
                  <div className="click-away" onClick={() => setBellOpen(false)} />
                  <div className="dropdown">
                    <div className="dropdown-head">Notifications</div>
                    {notices.length === 0 && <div className="dropdown-empty">You're all caught up.</div>}
                    {notices.map((n) => (
                      <button
                        key={n.key}
                        className={`dropdown-item ${n.unread === false ? 'read' : ''}`}
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
            <button className="profile" onClick={onProfile}>
              <span className="avatar">{initials(name)}</span>
              <span className="profile-text">
                <b>{name}</b>
                <small>{subtitle}</small>
              </span>
            </button>
          </div>
        </header>
        {!online && (
          <div className="offline-bar" role="status">
            You're offline. You can keep recording transactions — they'll sync automatically when the connection returns.
          </div>
        )}
        <main className="content">{children}</main>
      </div>

      <nav className="bottom-nav" aria-label="Main">
        {bottom.map(({ id, label, short, icon }) => (
          <button key={id} className={`bn-item ${route === id ? 'active' : ''}`} onClick={() => navTo(id)} aria-current={route === id ? 'page' : undefined}>
            <span className="bn-ic">{renderIcon(icon)}</span>
            <span>{short ?? label}</span>
          </button>
        ))}
        <button className={`bn-item ${drawer || !bottom.some((b) => b.id === route) ? 'active' : ''}`} onClick={() => setDrawer((v) => !v)} aria-expanded={drawer} aria-label="More pages">
          <span className="bn-ic">
            <Menu size={24} strokeWidth={1.6} />
          </span>
          <span>More</span>
        </button>
      </nav>

      <Modal open={help} title="IT Support" subtitle={`${PROJECT.name} • Municipality of Taytay`} onClose={() => setHelp(false)}>
        <div className="stack">
          <p>For account, access or system issues, reach the SMILECare IT support team:</p>
          <div className="info-row">
            <span className="muted">Email</span>
            <b>{PROJECT.supportEmail}</b>
          </div>
          <div className="info-row">
            <span className="muted">Phone</span>
            <b>{PROJECT.supportPhone}</b>
          </div>
          <div className="info-row">
            <span className="muted">Address</span>
            <b>{PROJECT.supportAddress}</b>
          </div>
          <div className="info-row">
            <span className="muted">Hours</span>
            <b>{PROJECT.supportHours}</b>
          </div>
        </div>
      </Modal>
    </div>
  )
}

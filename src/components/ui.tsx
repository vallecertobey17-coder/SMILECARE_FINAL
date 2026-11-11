import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { X, Inbox } from 'lucide-react'
import { Icon } from './Icon'

/* ---------- Toasts ---------- */
type Toast = { id: number; text: string; tone: 'ok' | 'err' }
const ToastCtx = createContext<(text: string, tone?: 'ok' | 'err') => void>(() => {})
export const useToast = () => useContext(ToastCtx)
export function ToastProvider({ children }: { children: ReactNode }) {
  const [list, setList] = useState<Toast[]>([])
  const push = useCallback((text: string, tone: 'ok' | 'err' = 'ok') => {
    const id = Date.now() + Math.random()
    setList((l) => [...l, { id, text, tone }])
    setTimeout(() => setList((l) => l.filter((t) => t.id !== id)), 3800)
  }, [])
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {list.map((t) => (
          <div key={t.id} className={`toast toast-${t.tone}`}>
            {t.text}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}

/* ---------- Modal ---------- */
export function Modal({
  open,
  title,
  subtitle,
  onClose,
  children,
  footer,
  wide,
}: {
  open: boolean
  title: string
  subtitle?: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  wide?: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    ref.current?.querySelector<HTMLElement>('input,select,textarea,button')?.focus()
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${wide ? 'modal-wide' : ''}`} role="dialog" aria-modal="true" aria-label={title} ref={ref}>
        <div className="modal-head">
          <div>
            <h2>{title}</h2>
            {subtitle && <p className="muted">{subtitle}</p>}
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  )
}

export function Confirm({
  open,
  title,
  text,
  confirmLabel = 'Delete',
  onConfirm,
  onClose,
}: {
  open: boolean
  title: string
  text: string
  confirmLabel?: string
  onConfirm: () => void
  onClose: () => void
}) {
  return (
    <Modal
      open={open}
      title={title}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-danger"
            onClick={() => {
              onConfirm()
              onClose()
            }}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <p>{text}</p>
    </Modal>
  )
}

/* ---------- Row "•••" menu ---------- */
export type MenuItem = { label: string; onClick: () => void; danger?: boolean; hidden?: boolean; icon?: ReactNode }
export function RowMenu({ items, label }: { items: MenuItem[]; label: string }) {
  const [open, setOpen] = useState(false)
  const btn = useRef<HTMLButtonElement>(null)
  const [pos, setPos] = useState<{ top: number; right: number; up: boolean }>({ top: 0, right: 0, up: false })
  const visible = items.filter((i) => !i.hidden)
  if (!visible.length) return null
  const toggle = () => {
    const r = btn.current!.getBoundingClientRect()
    const up = window.innerHeight - r.bottom < 60 + visible.length * 44
    setPos({ top: up ? r.top - 6 : r.bottom + 6, right: window.innerWidth - r.right, up })
    setOpen((v) => !v)
  }
  return (
    <>
      <button ref={btn} className="dots-btn" onClick={(e) => { e.stopPropagation(); toggle() }} aria-label={label} aria-haspopup="menu" aria-expanded={open}>
        <Icon name="dots" />
      </button>
      {open && (
        <>
          <div className="click-away" onClick={(e) => { e.stopPropagation(); setOpen(false) }} />
          <div className={`row-menu ${pos.up ? 'up' : ''}`} role="menu" style={{ top: pos.top, right: pos.right }} onClick={(e) => e.stopPropagation()}>
            {visible.map((i) => (
              <button key={i.label} role="menuitem" className={i.danger ? 'danger' : ''} onClick={() => { setOpen(false); i.onClick() }}>
                {i.icon}
                {i.label}
              </button>
            ))}
          </div>
        </>
      )}
    </>
  )
}

/* ---------- Form field ---------- */
export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  )
}

/* ---------- Status badge ---------- */
const toneFor: Record<string, string> = {
  APPROVED: 'green',
  GOOD: 'green',
  COMPLETED: 'green',
  OPEN: 'green',
  PENDING: 'amber',
  'LOW STOCK': 'amber',
  SCHEDULED: 'blue',
  'IN PROGRESS': 'blue',
  ONGOING: 'violet',
  'EXPIRING SOON': 'orange',
  REJECTED: 'red',
  'OUT OF STOCK': 'red',
  EXPIRED: 'red',
  ERROR: 'red',
  CLOSED: 'gray',
  ACTIVE: 'green',
  INACTIVE: 'gray',
  CANCELLED: 'gray',
  WAITING: 'amber',
  SERVING: 'blue',
  DONE: 'green',
  CONFIRMED: 'green',
}
export function Badge({ status }: { status: string }) {
  return <span className={`badge badge-${toneFor[status] ?? 'gray'}`}>{status}</span>
}

/* ---------- Stat card ---------- */
export function StatCard({
  icon,
  label,
  value,
  note,
  tone = 'teal',
  onClick,
  active,
}: {
  icon: ReactNode
  label: string
  value: ReactNode
  note?: ReactNode
  tone?: string
  onClick?: () => void
  active?: boolean
}) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag className={`stat ${onClick ? 'stat-click' : ''} ${active ? 'stat-active' : ''}`} onClick={onClick}>
      <div className={`stat-icon tone-${tone}`}>{icon}</div>
      <div className="stat-body">
        <div className="stat-label">{label}</div>
        <div className="stat-value">{value}</div>
        {note && <div className="stat-note">{note}</div>}
      </div>
    </Tag>
  )
}

/* ---------- Page heading ---------- */
export function PageHead({ title, subtitle, eyebrow, actions }: { title: string; subtitle?: string; eyebrow?: string; actions?: ReactNode }) {
  return (
    <div className="page-head">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        {subtitle && <p className="muted">{subtitle}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  )
}

/* ---------- Toolbar: search + status + filters + primary ---------- */
export function Toolbar({
  search,
  onSearch,
  placeholder,
  status,
  onStatus,
  statuses,
  filtersOpen,
  onToggleFilters,
  filterCount,
  action,
  allLabel = 'All Statuses',
}: {
  search: string
  onSearch: (v: string) => void
  placeholder: string
  status: string
  onStatus: (v: string) => void
  statuses: string[]
  filtersOpen?: boolean
  onToggleFilters?: () => void
  filterCount?: number
  action?: ReactNode
  allLabel?: string
}) {
  return (
    <div className="toolbar">
      <div className="search">
        <Icon name="search" className="ic-blue" />
        <input value={search} onChange={(e) => onSearch(e.target.value)} placeholder={placeholder} aria-label={placeholder} />
        {search && (
          <button className="icon-btn sm" onClick={() => onSearch('')} aria-label="Clear search">
            <X size={14} />
          </button>
        )}
      </div>
      <div className="select-wrap">
        <select value={status} onChange={(e) => onStatus(e.target.value)} aria-label="Status filter">
          <option value="">{allLabel}</option>
          {statuses.map((s) => (
            <option key={s} value={s}>
              {s === s.toUpperCase() ? s.charAt(0) + s.slice(1).toLowerCase() : s}
            </option>
          ))}
        </select>
        <Icon name="chevron" className="select-chev" />
      </div>
      {onToggleFilters && (
        <button className={`btn btn-primary btn-filter ${filtersOpen ? 'is-on' : ''}`} onClick={onToggleFilters} aria-expanded={filtersOpen}>
          <Icon name="filter" /> Filters{filterCount ? ` (${filterCount})` : ''}
        </button>
      )}
      {action && <div className="toolbar-action">{action}</div>}
    </div>
  )
}

export function Empty({ text, action }: { text: string; action?: ReactNode }) {
  return (
    <div className="empty">
      <Inbox size={36} />
      <p>{text}</p>
      {action}
    </div>
  )
}

export function Pager({ page, pages, total, onPage }: { page: number; pages: number; total: number; onPage: (p: number) => void }) {
  if (pages <= 1) return <div className="pager muted">{total} record{total === 1 ? '' : 's'}</div>
  return (
    <div className="pager">
      <span className="muted">
        Page {page} of {pages} · {total} records
      </span>
      <div className="pager-btns">
        <button className="btn btn-outline sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          Previous
        </button>
        <button className="btn btn-outline sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>
          Next
        </button>
      </div>
    </div>
  )
}

export function usePaged<T>(rows: T[], size = 8, resetKey = '') {
  const [page, setPage] = useState(1)
  useEffect(() => {
    setPage(1)
  }, [resetKey])
  const pages = Math.max(1, Math.ceil(rows.length / size))
  const p = Math.min(page, pages)
  return { page: p, pages, setPage, slice: rows.slice((p - 1) * size, p * size), total: rows.length }
}

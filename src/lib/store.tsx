import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { COLLECTIONS, type CollectionName, type Collections } from './types'
import { seed } from './seed'

/* ---------- platform bridge (claude.ai artifact runtime) ---------- */
type AnyFn = (...a: any[]) => any
type DbLike = { collection(p: string): any; doc(p: string): any }
declare global {
  interface Window {
    claude?: { use(name: string): Promise<any> }
  }
}
export async function getCapability<T = any>(name: string): Promise<T | null> {
  try {
    if (!window.claude || typeof window.claude.use !== 'function') return null
    return (await window.claude.use(name)) as T | null
  } catch {
    return null
  }
}

/* ---------- local storage helpers ---------- */
const LS_PREFIX = 'smilecare:v4:data:'
const OUTBOX = 'smilecare:v4:outbox'
function lsGet<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}
function lsSet(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* storage unavailable or full */
  }
}
export const uid = () =>
  (crypto as any).randomUUID?.() ?? Math.random().toString(36).slice(2) + Date.now().toString(36)

function localInitial(): State {
  const s = {} as State
  for (const c of COLLECTIONS) {
    let rows = lsGet<any[]>(LS_PREFIX + c)
    if (!rows) {
      rows = ((seed as any)[c] ?? []).map((r: any) => ({ id: r.id ?? uid(), ...r }))
      lsSet(LS_PREFIX + c, rows)
    }
    ;(s as any)[c] = rows
  }
  return s
}

/* ---------- types ---------- */
type State = { [K in CollectionName]: Collections[K][] }
export type Backend = 'connecting' | 'shared' | 'local'
type Op = { c: CollectionName; kind: 'set' | 'update' | 'delete'; id: string; data?: Record<string, unknown> }
export interface Actor {
  name: string
  role: string
}

interface Store {
  data: State
  backend: Backend
  loaded: boolean
  stale: boolean
  online: boolean
  pending: number // changes waiting to sync
  readOnly: boolean
  error: string | null
  add<K extends CollectionName>(c: K, row: Omit<Collections[K], 'id'>, opts?: { id?: string; silent?: boolean }): Promise<string>
  update<K extends CollectionName>(c: K, id: string, patch: Partial<Collections[K]>, opts?: { silent?: boolean }): Promise<void>
  remove(c: CollectionName, id: string, opts?: { silent?: boolean }): Promise<void>
  log(action: string, entity: string, summary: string): void
  setActor(a: Actor | null): void
  restore(snapshot: Partial<State>): Promise<number>
  resetLocal(): void
}

const empty = Object.fromEntries(COLLECTIONS.map((c) => [c, []])) as unknown as State
const Ctx = createContext<Store | null>(null)

function clean(obj: Record<string, unknown>) {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) if (k !== 'id' && v !== undefined) out[k] = v
  return JSON.parse(JSON.stringify(out))
}

/** Short human label for a record, used in the audit trail. */
function describe(_c: CollectionName, row: any): string {
  if (!row) return ''
  return row.name || row.ref || row.title || row.residentName || row.txId || row.vaccine || row.email || ''
}

const AUDIT_LIMIT = 600

function applyOps(base: State, ops: Op[]): State {
  if (!ops.length) return base
  const next = { ...base } as any
  for (const op of ops) {
    const rows: any[] = [...(next[op.c] ?? [])]
    const i = rows.findIndex((r) => r.id === op.id)
    if (op.kind === 'delete') {
      if (i >= 0) rows.splice(i, 1)
    } else if (op.kind === 'set') {
      const row = { ...op.data, id: op.id }
      if (i >= 0) rows[i] = row
      else rows.push(row)
    } else if (i >= 0) rows[i] = { ...rows[i], ...op.data }
    next[op.c] = rows
  }
  return next
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [base, setBase] = useState<State>(empty)
  const [backend, setBackend] = useState<Backend>('connecting')
  const [loadedSet, setLoadedSet] = useState<Set<string>>(new Set())
  const [stale, setStale] = useState(false)
  const [readOnly, setReadOnly] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine))
  const [outbox, setOutbox] = useState<Op[]>(() => lsGet<Op[]>(OUTBOX) ?? [])
  const dbRef = useRef<DbLike | null>(null)
  const actorRef = useRef<Actor | null>(null)
  const flushing = useRef(false)

  /* connect */
  useEffect(() => {
    let cancelled = false
    const unsubs: AnyFn[] = []
    let timer: ReturnType<typeof setTimeout> | undefined
    const goLocal = () => {
      if (cancelled) return
      dbRef.current = null
      setBase(localInitial())
      setLoadedSet(new Set(COLLECTIONS))
      setBackend('local')
    }
    ;(async () => {
      const db = await getCapability<DbLike>('db')
      if (cancelled) return
      if (!db) return goLocal()
      dbRef.current = db
      setBackend('shared')
      const user = await getCapability<any>('user')
      try {
        const can = user?.can ? await user.can('data.write') : null
        if (can === false) setReadOnly(true)
      } catch {
        /* unknown */
      }
      timer = setTimeout(() => setStale(true), 10000)
      const confirmed = new Set<string>()
      for (const c of COLLECTIONS) {
        const q = c === 'audit' ? db.collection(c).orderBy('at', 'desc').limit(AUDIT_LIMIT) : db.collection(c)
        const unsub = q.onSnapshot(
          (snap: any) => {
            const rows = snap.docs.map((d: any) => ({ ...(d.data() as object), id: d.id }))
            setBase((prev) => ({ ...prev, [c]: rows }))
            setLoadedSet((prev) => (prev.has(c) ? prev : new Set(prev).add(c)))
            if (!snap.metadata?.fromCache) {
              confirmed.add(c)
              if (confirmed.size === COLLECTIONS.length) {
                clearTimeout(timer)
                setStale(false)
              }
            }
          },
          (e: any) => {
            setLoadedSet((prev) => new Set(prev).add(c))
            setError(e?.message || 'The shared database could not be reached.')
          },
        )
        unsubs.push(unsub)
      }
    })()
    return () => {
      cancelled = true
      clearTimeout(timer)
      unsubs.forEach((u) => u())
    }
  }, [])

  /* connectivity */
  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])

  const saveOutbox = (ops: Op[]) => {
    lsSet(OUTBOX, ops)
    setOutbox(ops)
  }

  const send = async (db: DbLike, op: Op) => {
    const ref = db.collection(op.c).doc(op.id)
    if (op.kind === 'set') await ref.set(op.data)
    else if (op.kind === 'update') await ref.update(op.data)
    else await ref.delete()
  }

  /* flush queued offline changes when back online */
  const flush = useCallback(async () => {
    const db = dbRef.current
    if (!db || flushing.current) return
    const ops = lsGet<Op[]>(OUTBOX) ?? []
    if (!ops.length) return
    flushing.current = true
    const left: Op[] = []
    for (let i = 0; i < ops.length; i++) {
      try {
        await send(db, ops[i])
      } catch (e: any) {
        if (e?.code === 'unavailable' || !navigator.onLine) {
          left.push(...ops.slice(i))
          break
        } // other errors: drop the op (it can never succeed)
      }
    }
    saveOutbox(left)
    flushing.current = false
  }, [])

  useEffect(() => {
    if (online && backend === 'shared' && outbox.length) flush()
  }, [online, backend, outbox.length, flush])

  const data = useMemo(() => applyOps(base, outbox), [base, outbox])

  const store = useMemo<Store>(() => {
    const fail = (e: any): never => {
      if (e?.code === 'invalid_argument') setReadOnly(true)
      throw new Error(
        e?.code === 'quota_exceeded'
          ? 'Storage is full. Delete old records to add new ones.'
          : e?.code === 'invalid_argument'
            ? 'You have view-only access to this workspace.'
            : e?.message || 'Could not save. Please try again.',
      )
    }
    const localWrite = (op: Op) => {
      setBase((prev) => {
        const next = applyOps(prev, [op])
        lsSet(LS_PREFIX + op.c, next[op.c])
        return next
      })
    }
    /** Write one op: locally, to the shared db, or into the offline outbox. */
    const write = async (op: Op) => {
      const db = dbRef.current
      if (!db) return localWrite(op)
      if (!navigator.onLine) return saveOutbox([...(lsGet<Op[]>(OUTBOX) ?? []), op])
      try {
        await send(db, op)
      } catch (e: any) {
        if (e?.code === 'unavailable') return saveOutbox([...(lsGet<Op[]>(OUTBOX) ?? []), op])
        fail(e)
      }
    }
    const log = (action: string, entity: string, summary: string) => {
      const a = actorRef.current
      const entry = { at: new Date().toISOString(), actor: a?.name ?? 'System', role: a?.role ?? '', action, entity, summary }
      write({ c: 'audit', kind: 'set', id: uid(), data: entry }).catch(() => {})
    }
    return {
      data,
      backend,
      loaded: loadedSet.size === COLLECTIONS.length,
      stale,
      online,
      pending: outbox.length,
      readOnly,
      error,
      log,
      setActor(a) {
        actorRef.current = a
      },
      async add(c, row, opts) {
        const id = opts?.id ?? uid()
        await write({ c, kind: 'set', id, data: clean(row as any) })
        if (c !== 'audit' && !opts?.silent) log('create', c, describe(c, row))
        return id
      },
      async update(c, id, patch, opts) {
        await write({ c, kind: 'update', id, data: clean(patch as any) })
        if (c !== 'audit' && !opts?.silent) {
          const row = (data[c] as any[]).find((r) => r.id === id)
          const fields = Object.keys(patch).filter((k) => k !== 'id').join(', ')
          log('update', c, `${describe(c, row)}${fields ? ` (${fields})` : ''}`)
        }
      },
      async remove(c, id, opts) {
        const row = (data[c] as any[]).find((r) => r.id === id)
        await write({ c, kind: 'delete', id })
        if (c !== 'audit' && !opts?.silent) log('delete', c, describe(c, row))
      },
      async restore(snapshot) {
        let n = 0
        for (const c of COLLECTIONS) {
          if (c === 'audit' || !Array.isArray(snapshot[c])) continue
          const incoming = snapshot[c] as any[]
          const keep = new Set(incoming.map((r) => r.id))
          for (const r of data[c] as any[]) if (!keep.has(r.id)) await write({ c, kind: 'delete', id: r.id })
          for (const r of incoming) {
            if (!r || typeof r.id !== 'string') continue
            await write({ c, kind: 'set', id: r.id, data: clean(r) })
            n++
          }
        }
        log('restore', 'backup', `Restored ${n} records from backup`)
        return n
      },
      resetLocal() {
        for (const c of COLLECTIONS) {
          try {
            localStorage.removeItem(LS_PREFIX + c)
          } catch {
            /* ignore */
          }
        }
        setBase(localInitial())
      },
    }
  }, [data, backend, loadedSet, stale, online, outbox.length, readOnly, error])

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>
}

export function useStore() {
  const s = useContext(Ctx)
  if (!s) throw new Error('useStore outside DataProvider')
  return s
}

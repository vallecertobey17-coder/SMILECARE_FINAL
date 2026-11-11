import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
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

/* ---------- local fallback ---------- */
const LS_PREFIX = 'smilecare:data:'
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
    /* storage unavailable */
  }
}
export const uid = () =>
  (crypto as any).randomUUID?.() ?? Math.random().toString(36).slice(2) + Date.now().toString(36)

function localInitial(): State {
  const s = {} as State
  for (const c of COLLECTIONS) {
    let rows = lsGet<any[]>(LS_PREFIX + c)
    if (!rows) {
      rows = (seed[c] as any[]).map((r) => ({ ...r, id: uid() }))
      lsSet(LS_PREFIX + c, rows)
    }
    ;(s as any)[c] = rows
  }
  return s
}

/* ---------- context ---------- */
type State = { [K in CollectionName]: Collections[K][] }
export type Backend = 'connecting' | 'shared' | 'local'

interface Store {
  data: State
  backend: Backend
  loaded: boolean
  stale: boolean
  readOnly: boolean
  error: string | null
  add<K extends CollectionName>(c: K, row: Omit<Collections[K], 'id'>): Promise<string>
  update<K extends CollectionName>(c: K, id: string, patch: Partial<Collections[K]>): Promise<void>
  remove(c: CollectionName, id: string): Promise<void>
  resetLocal(): void
}

const empty = Object.fromEntries(COLLECTIONS.map((c) => [c, []])) as unknown as State
const Ctx = createContext<Store | null>(null)

function cleanForWrite(obj: Record<string, unknown>) {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) if (k !== 'id' && v !== undefined) out[k] = v
  return JSON.parse(JSON.stringify(out))
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<State>(empty)
  const [backend, setBackend] = useState<Backend>('connecting')
  const [loadedSet, setLoadedSet] = useState<Set<string>>(new Set())
  const [stale, setStale] = useState(false)
  const [readOnly, setReadOnly] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const dbRef = useRef<DbLike | null>(null)

  useEffect(() => {
    let cancelled = false
    const unsubs: AnyFn[] = []
    let timer: ReturnType<typeof setTimeout> | undefined

    const goLocal = () => {
      if (cancelled) return
      dbRef.current = null
      setData(localInitial())
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
        /* unknown, keep inputs */
      }
      timer = setTimeout(() => setStale(true), 10000)
      const confirmed = new Set<string>()
      for (const c of COLLECTIONS) {
        const unsub = db.collection(c).onSnapshot(
          (snap: any) => {
            const rows = snap.docs.map((d: any) => ({ ...(d.data() as object), id: d.id }))
            setData((prev) => ({ ...prev, [c]: rows }))
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
            clearTimeout(timer)
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

  const store = useMemo<Store>(() => {
    const handleWriteError = (e: any): never => {
      if (e?.code === 'invalid_argument') setReadOnly(true)
      const msg =
        e?.code === 'quota_exceeded'
          ? 'Storage is full. Delete old records to add new ones.'
          : e?.code === 'invalid_argument'
            ? 'You have view-only access to this workspace.'
            : e?.message || 'Could not save. Please try again.'
      throw new Error(msg)
    }
    const localWrite = (c: CollectionName, fn: (rows: any[]) => any[]) => {
      setData((prev) => {
        const next = { ...prev, [c]: fn(prev[c] as any[]) }
        lsSet(LS_PREFIX + c, next[c])
        return next
      })
    }
    return {
      data,
      backend,
      loaded: loadedSet.size === COLLECTIONS.length,
      stale,
      readOnly,
      error,
      async add(c, row) {
        const db = dbRef.current
        if (!db) {
          const id = uid()
          localWrite(c, (rows) => [...rows, { ...row, id }])
          return id
        }
        try {
          const ref = db.collection(c).doc()
          await ref.set(cleanForWrite(row as any))
          return ref.id as string
        } catch (e) {
          return handleWriteError(e)
        }
      },
      async update(c, id, patch) {
        const db = dbRef.current
        if (!db) return localWrite(c, (rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)))
        try {
          await db.collection(c).doc(id).update(cleanForWrite(patch as any))
        } catch (e) {
          handleWriteError(e)
        }
      },
      async remove(c, id) {
        const db = dbRef.current
        if (!db) return localWrite(c, (rows) => rows.filter((r) => r.id !== id))
        try {
          await db.collection(c).doc(id).delete()
        } catch (e) {
          handleWriteError(e)
        }
      },
      resetLocal() {
        for (const c of COLLECTIONS) {
          try {
            localStorage.removeItem(LS_PREFIX + c)
          } catch {
            /* ignore */
          }
        }
        setData(localInitial())
      },
    }
  }, [data, backend, loadedSet, stale, readOnly, error])

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>
}

export function useStore() {
  const s = useContext(Ctx)
  if (!s) throw new Error('useStore outside DataProvider')
  return s
}

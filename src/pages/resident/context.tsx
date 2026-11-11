import { createContext, useContext } from 'react'
import type { Session } from '../../lib/auth'
import type { Resident } from '../../lib/types'

export interface ResidentCtx {
  session: Session
  resident: Resident
  go: (route: string) => void
  read: Set<string>
  markRead: (ids: string[]) => void
}
export const ResidentContext = createContext<ResidentCtx | null>(null)
export function useResident() {
  const c = useContext(ResidentContext)
  if (!c) throw new Error('useResident outside resident portal')
  return c
}

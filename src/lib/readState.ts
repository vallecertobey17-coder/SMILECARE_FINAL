// Which announcements a resident has read (kept per browser).
import { useCallback, useState } from 'react'

const key = (who: string) => `smilecare:read:${who}`
function load(who: string): string[] {
  try {
    return JSON.parse(localStorage.getItem(key(who)) || '[]')
  } catch {
    return []
  }
}

export function useReadState(who: string) {
  const [read, setRead] = useState<Set<string>>(() => new Set(load(who)))
  const markRead = useCallback(
    (ids: string[]) => {
      setRead((prev) => {
        const next = new Set(prev)
        ids.forEach((i) => next.add(i))
        try {
          localStorage.setItem(key(who), JSON.stringify([...next]))
        } catch {
          /* ignore */
        }
        return next
      })
    },
    [who],
  )
  return { read, markRead }
}

import { useCallback, useEffect, useState } from 'react'
import { DataProvider } from './lib/store'
import { ToastProvider } from './components/ui'
import { Layout, NAV } from './components/Layout'
import { currentSession, logout, type Session } from './lib/auth'
import Home from './pages/Home'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Residents from './pages/Residents'
import Inventory from './pages/Inventory'
import Services from './pages/Services'
import Dispensing from './pages/Dispensing'
import Botika from './pages/Botika'
import Analytics from './pages/Analytics'
import Preferences from './pages/Preferences'

const APP_ROUTES = new Set<string>([...NAV.map((n) => n.id), 'preferences'])
const readHash = () => window.location.hash.replace(/^#/, '')

export default function App() {
  const [session, setSession] = useState<Session | null>(() => currentSession())
  const [route, setRoute] = useState(readHash)

  useEffect(() => {
    const on = () => setRoute(readHash())
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])

  const go = useCallback((r: string) => {
    if (readHash() !== r) window.location.hash = r
    setRoute(r)
    document.querySelector('.content')?.scrollTo({ top: 0 })
    window.scrollTo({ top: 0 })
  }, [])

  useEffect(() => {
    if (session && !APP_ROUTES.has(route)) go('dashboard')
  }, [session, route, go])

  const signOut = () => {
    logout()
    setSession(null)
    go('login')
  }

  let view
  if (!session) {
    view = route === 'login' || APP_ROUTES.has(route) ? (
      <Login onBack={() => go('home')} onLogin={(s) => { setSession(s); go(APP_ROUTES.has(route) ? route : 'dashboard') }} />
    ) : (
      <Home onLogin={() => go('login')} />
    )
  } else if (!APP_ROUTES.has(route)) {
    // Signed in: home/login/unknown hashes land on the dashboard
    view = null
  } else {
    const firstName = session.name.replace(/^(Dr\.|Dra\.)\s*/i, '').split(' ')[0]
    const page =
      route === 'residents' ? <Residents /> :
      route === 'inventory' ? <Inventory /> :
      route === 'services' ? <Services /> :
      route === 'dispensing' ? <Dispensing /> :
      route === 'botika' ? <Botika /> :
      route === 'analytics' ? <Analytics /> :
      route === 'preferences' ? <Preferences session={session} onSession={setSession} onLogout={signOut} /> :
      <Dashboard go={go} firstName={firstName} />
    view = (
      <Layout route={route} go={go} session={session} onLogout={signOut}>
        {page}
      </Layout>
    )
  }

  return (
    <ToastProvider>
      <DataProvider>{view}</DataProvider>
    </ToastProvider>
  )
}

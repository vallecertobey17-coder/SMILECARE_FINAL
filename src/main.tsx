import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { BRAND_MARK_DATA_URI } from './components/BrandMark'

// Browser tab icon: the official SMILECare mark
const icon = document.querySelector<HTMLLinkElement>('link[rel="icon"]') ?? document.head.appendChild(Object.assign(document.createElement('link'), { rel: 'icon' }))
icon.type = 'image/svg+xml'
icon.href = BRAND_MARK_DATA_URI

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.tsx'

function isLocalhost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1'
}

function canRegisterServiceWorker(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false
  }

  if (!('serviceWorker' in navigator)) {
    return false
  }

  // iOS Safari requires secure contexts for service workers except localhost.
  return window.isSecureContext || isLocalhost(window.location.hostname)
}

if (canRegisterServiceWorker()) {
  try {
    registerSW({
      immediate: true,
    })
  } catch (error) {
    console.warn('Skipping service worker registration:', error)
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

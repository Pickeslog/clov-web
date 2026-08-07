import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/tokens.css'
import './assets/fonts/fonts.css'
import App from './App.jsx'
import { initAppBackground } from './lib/appBackground'
import { initTheme } from './lib/theme'
import { initMascotSize } from './lib/mascotSize'

// 저장된 배경·라이트/다크 테마·마스코트 크기를 첫 페인트 전에 적용(깜빡임 방지).
initAppBackground()
initTheme()
initMascotSize()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

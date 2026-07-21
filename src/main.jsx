import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/tokens.css'
import App from './App.jsx'
import { initAppBackground } from './lib/appBackground'

// 저장된 배경 테마를 첫 페인트 전에 적용(깜빡임 방지).
initAppBackground()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

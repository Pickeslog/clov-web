import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import './Header.css'
import { getMe } from '../../api/user'
import { useAuthStore } from '../../stores/authStore'
import Settings from '../Settings/Settings'
import Notifications from '../../pages/notifications/Notifications/Notifications'

// 방 내부 네비 탭 — 프로토타입 clov-header main 타입.
const TABS = [
  { id: 'space', label: '우정공간', path: '', icon: <path d="M3 10.5 12 3l9 7.5M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5" /> },
  { id: 'feed', label: '추억피드', path: 'feed', icon: <path d="M4 8a2 2 0 0 1 2-2h1l1.5-2h7L17 6h1a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8zM12 13a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z" /> },
  { id: 'letter', label: '행운편지', path: 'letters', icon: <path d="M3 5h18v14H3zM3 7l9 6 9-6" /> },
  { id: 'schedule', label: '일정계획', path: 'schedule', icon: <path d="M3 5h18v16H3zM3 10h18M8 3v4M16 3v4" /> },
]

const NavIcon = ({ children }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{children}</svg>
)
const initialOf = (name) => (name || '나').trim().slice(0, 1)

/**
 * 공통 앱 헤더.
 * @param variant  'room'(방 내부 · 네비 탭) | 'home'(방 목록 · 탭 없음)
 * @param roomId   variant='room'일 때 네비 링크 대상
 * @param activeTab 'space' | 'feed' | 'letter' | 'schedule'
 */
export default function Header({ variant = 'room', roomId, activeTab }) {
  const navigate = useNavigate()
  const clear = useAuthStore((state) => state.clear)
  const me = useQuery({ queryKey: ['me'], queryFn: getMe })

  const [menuOpen, setMenuOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)

  useEffect(() => {
    if (!menuOpen) return undefined
    const onDoc = (e) => { if (!e.target.closest('.clov-hdr-avatar-wrap')) setMenuOpen(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [menuOpen])

  const goTab = (tab) => navigate(`/rooms/${roomId}${tab.path ? `/${tab.path}` : ''}`)

  return (
    <>
    <header className="clov-hdr">
      <div className="clov-hdr-left">
        {variant === 'room' && (
          <button type="button" className="clov-hdr-back" onClick={() => navigate('/')} title="우정공간 목록으로" aria-label="목록으로">‹</button>
        )}
        <button
          type="button"
          className="clov-hdr-logo"
          onClick={() => navigate(variant === 'room' && roomId ? `/rooms/${roomId}` : '/')}
        >
          🍀 Clov.
        </button>
      </div>

      <div className="clov-hdr-right">
        {variant === 'room' && (
          <nav className="clov-hdr-nav">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`clov-hdr-nav-btn ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => goTab(tab)}
              >
                <NavIcon>{tab.icon}</NavIcon>
                <span>{tab.label}</span>
              </button>
            ))}
            <button
              type="button"
              className="clov-hdr-nav-btn clov-hdr-nav-icon-btn"
              onClick={() => setNotificationsOpen(true)}
              title="알림"
              aria-label="알림"
            >
              <NavIcon><path d="M6 8a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6M10 20a2 2 0 0 0 4 0" /></NavIcon>
            </button>
          </nav>
        )}

        <div className="clov-hdr-avatar-wrap">
          <button type="button" className="clov-hdr-avatar" onClick={() => setMenuOpen((v) => !v)} aria-haspopup="menu" title="내 계정">
            {me.data?.profileImageUrl ? <img src={me.data.profileImageUrl} alt="" /> : initialOf(me.data?.nickname)}
          </button>
          {menuOpen && (
            <ul className="clov-hdr-dropdown" role="menu">
              <li><button type="button" onClick={() => { setSettingsOpen(true); setMenuOpen(false) }}>⚙️ 사용자 설정</button></li>
              <li><button type="button" onClick={clear}>로그아웃</button></li>
            </ul>
          )}
        </div>
      </div>

    </header>
    {/* Settings 오버레이는 header 밖에 둔다 — header의 backdrop-filter가 fixed 오버레이의
        컨테이닝 블록이 되어 모달이 56px 헤더 안에 갇히는 오버플로우를 방지. */}
    {settingsOpen && <Settings onClose={() => setSettingsOpen(false)} />}
    {notificationsOpen && <Notifications onClose={() => setNotificationsOpen(false)} />}
    </>
  )
}

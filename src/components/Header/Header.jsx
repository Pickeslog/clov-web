import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import './Header.css'
import { getMe } from '../../api/user'
import { getWallet } from '../../api/shop'
import { useAuthStore } from '../../stores/authStore'
import { useSettingsStore } from '../../stores/settingsStore'
import { useGuideStore } from '../../stores/guideStore'
import clovLogo from '../../assets/clov_logo.png'
import Settings from '../Settings/Settings'
import Notifications from '../../pages/notifications/Notifications/Notifications'
import MascotWardrobe from './MascotWardrobe'
import RoomSwitcher from './RoomSwitcher'

// 방 내부 네비 탭 — 프로토타입 clov-header main 타입.
const TABS = [
  { id: 'space', label: '우정공간', path: '', icon: <path d="M3 10.5 12 3l9 7.5M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5" /> },
  { id: 'feed', label: '추억피드', path: 'feed', icon: <path d="M4 8a2 2 0 0 1 2-2h1l1.5-2h7L17 6h1a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8zM12 13a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z" /> },
  { id: 'letter', label: '행운편지', path: 'letters', icon: <path d="M3 5h18v14H3zM3 7l9 6 9-6" /> },
  { id: 'schedule', label: '일정계획', path: 'schedule', icon: <path d="M3 5h18v16H3zM3 10h18M8 3v4M16 3v4" /> },
]

const NavIcon = ({ children, size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{children}</svg>
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
  const location = useLocation()
  const clear = useAuthStore((state) => state.clear)
  const me = useQuery({ queryKey: ['me'], queryFn: getMe })
  // 헤더 골드는 상점에서 구매하면 즉시 반영돼야 한다 — Shop이 같은 키를 무효화한다.
  const wallet = useQuery({ queryKey: ['wallet'], queryFn: getWallet })
  const onShop = location.pathname === '/shop'

  const [menuOpen, setMenuOpen] = useState(false)
  // 설정 모달만 스토어다 — 상점 카드("설정에서 적용")가 형제 컴포넌트라 여기 state 에 못 닿는다.
  const settingsOpen = useSettingsStore((s) => s.open)
  const openSettings = useSettingsStore((s) => s.openSettings)
  const closeSettings = useSettingsStore((s) => s.closeSettings)
  const replayGuide = useGuideStore((s) => s.replayGuide)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [switcherOpen, setSwitcherOpen] = useState(false)

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
          <img className="clov-hdr-logo-mark" src={clovLogo} alt="Clov 로고" />
          Clov.
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

        {/* 상점(버튼+골드 표시) — 방 안/밖 어디서든 보인다.
            예전엔 방 목록(home)에서 통째로 감췄는데, 지갑은 방이 아니라 사용자에 붙어 있어서
            (router.jsx: "상점은 재화가 사용자 단위라 방에 속하지 않는다") 진입점만 방 안으로
            묶여 있는 게 모델과 어긋났다. 실제 구멍도 있었다:
            - 방이 0개인 신규 사용자는 들어갈 방이 없어 상점에 사실상 못 갔다
              (남은 길은 아바타 → 마스코트 꾸미기 → "상점으로 이동" 3단계뿐)
            - 홈에서 상점에 들어가면 Shop.jsx가 variant="home"을 써서 정작 물건 사는
              화면의 헤더에 잔액이 안 보였다 */}
        <button
          type="button"
          className={`clov-hdr-shop${onShop ? ' active' : ''}`}
          onClick={() => navigate('/shop', { state: roomId ? { fromRoomId: roomId } : undefined })}
          title="상점"
          aria-current={onShop ? 'page' : undefined}
        >
          <NavIcon><path d="M4 8h16l-1.2 10a2 2 0 0 1-2 1.8H7.2a2 2 0 0 1-2-1.8L4 8zM8.5 8V6a3.5 3.5 0 0 1 7 0v2" /></NavIcon>
          <span className="clov-hdr-shop-label">상점</span>
          {/* balance가 비면 헤더가 통째로 죽는다 — Shop.jsx도 같은 이유로 ?? 0을 쓴다(#208). */}
          {wallet.data && <span className="clov-hdr-gold"><i aria-hidden="true">G</i>{(wallet.data.balance ?? 0).toLocaleString()}</span>}
        </button>

        <div className="clov-hdr-avatar-wrap">
          <button type="button" className="clov-hdr-avatar" onClick={() => setMenuOpen((v) => !v)} aria-haspopup="menu" title="내 계정">
            {me.data?.profileImageUrl ? <img src={me.data.profileImageUrl} alt="" /> : initialOf(me.data?.nickname)}
          </button>
          {menuOpen && (
            <ul className="clov-hdr-dropdown" role="menu">
              <MascotWardrobe onNavigateShop={() => { setMenuOpen(false); navigate('/shop', { state: roomId ? { fromRoomId: roomId } : undefined }) }} />
              {variant === 'room' && (
                <li><button type="button" onClick={() => { setSwitcherOpen(true); setMenuOpen(false) }}><i className="ti ti-repeat" aria-hidden="true" /> 방 변경하기</button></li>
              )}
              <li><button type="button" onClick={() => { openSettings(); setMenuOpen(false) }}><i className="ti ti-settings" aria-hidden="true" /> 사용자 설정</button></li>
              {/* 가이드는 방 목록에만 붙어 있다(OnboardingGuide 는 RoomList 가 렌더한다).
                  방 안에서 눌러도 되도록 먼저 방 목록으로 보내고 스토어를 연다 —
                  이미 방 목록이면 navigate 는 아무 일도 안 하고 스토어만 열린다.
                  replayGuide 에 id 를 넘기는 이유는 저장 키가 계정별이라서다(#362). */}
              <li><button type="button" onClick={() => { setMenuOpen(false); navigate('/'); replayGuide(me.data?.id) }}><i className="ti ti-help-circle" aria-hidden="true" /> 가이드 다시 보기</button></li>
              <li><button type="button" onClick={() => { setMenuOpen(false); clear(); navigate('/login', { viewTransition: true, replace: true }) }}><i className="ti ti-logout" aria-hidden="true" /> 로그아웃</button></li>
            </ul>
          )}
        </div>
      </div>

    </header>

    {/* 모바일 하단 탭바 — 좁은 화면에서만 보인다(Header.css의 640px 미디어쿼리).
        헤더 안의 네비 탭은 375px에서 52px밖에 못 받는데 158px이 필요해 뭉개졌다(#164에서
        가로 스크롤로 임시 대응했지만 "스크롤해야 보이는 주요 이동"이라 근본 해결이 아니었다).
        엄지 도달 범위이기도 해서 이동은 아래로 내리고 헤더에는 로고·알림·상점·아바타만 남긴다.

        ★ header 밖(형제)에 둔다 — .clov-hdr의 backdrop-filter가 position:fixed 자식의
          컨테이닝 블록이 돼서 안에 두면 탭바가 헤더 높이 안에 갇힌다(Settings 오버레이와 같은 이유). */}
    {variant === 'room' && (
      <nav className="clov-hdr-tabbar" aria-label="방 메뉴">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`clov-hdr-tabbar-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => goTab(tab)}
            aria-current={activeTab === tab.id ? 'page' : undefined}
          >
            <NavIcon size={21}>{tab.icon}</NavIcon>
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>
    )}

    {/* Settings 오버레이는 header 밖에 둔다 — header의 backdrop-filter가 fixed 오버레이의
        컨테이닝 블록이 되어 모달이 56px 헤더 안에 갇히는 오버플로우를 방지. */}
    {settingsOpen && <Settings onClose={closeSettings} />}
    {notificationsOpen && <Notifications onClose={() => setNotificationsOpen(false)} />}
    {switcherOpen && <RoomSwitcher currentRoomId={roomId} onClose={() => setSwitcherOpen(false)} />}
    </>
  )
}

import { createBrowserRouter, Navigate, Outlet, ScrollRestoration } from 'react-router-dom'
import ProtectedRoute from './routes/ProtectedRoute'
import RouteErrorScreen from './components/ErrorBoundary/RouteErrorScreen'
import Login from './pages/auth/Login/Login'
import Signup from './pages/auth/Signup/Signup'
import OAuthRedirect from './pages/auth/OAuthRedirect/OAuthRedirect'
import ForgotPassword from './pages/auth/PasswordReset/ForgotPassword'
import ResetPassword from './pages/auth/PasswordReset/ResetPassword'
import RoomList from './pages/rooms/RoomList/RoomList'
import Dashboard from './pages/rooms/Dashboard/Dashboard'
import Feed from './pages/feed/Feed/Feed'
import Letters from './pages/letters/Letters/Letters'
import Notifications from './pages/notifications/Notifications/Notifications'
import Schedule from './pages/schedule/Schedule/Schedule'
import Shop from './pages/shop/Shop/Shop'

// 라우팅 골격. 보호 라우트는 ProtectedRoute 하위에 둔다.
//
// 최상위는 경로 없는 래퍼 라우트다. 화면을 하나 더 끼우려는 게 아니라 errorElement를
// 걸 자리를 만들려는 것 — 여기 하나면 아래 모든 화면의 렌더 예외가 잡힌다. 라우트마다
// errorElement를 달면 새 라우트를 추가하는 사람이 빠뜨리기 쉽다.
export const router = createBrowserRouter([
  {
    // ScrollRestoration 없이는 탭 이동·새로고침 시 이전 스크롤 위치가 새 화면에 그대로
    // 남아 엉뚱한 지점(예: 우정공간의 "참여자별 추억 증거 카드")에서 시작한다(#240).
    element: <><Outlet /><ScrollRestoration /></>,
    errorElement: <RouteErrorScreen />,
    children: [
      { path: '/login', element: <Login /> },
      { path: '/signup', element: <Signup /> },
      { path: '/oauth2/redirect', element: <OAuthRedirect /> },
      // 비밀번호 재설정(계약 §4-4) — 비로그인 상태로 들어오는 화면이라 보호 라우트 밖이다.
      { path: '/forgot-password', element: <ForgotPassword /> },
      { path: '/reset-password', element: <ResetPassword /> },
      {
        element: <ProtectedRoute />,
        children: [
          { path: '/', element: <RoomList /> },
          // 초대 코드는 전용 페이지가 아니라 방 목록 위 모달이다 — 딥링크로 들어와도
          // 뒤에 목록이 남아야 "지금 어디에 있는지"가 유지된다. RoomList가 경로를 보고
          // 모달을 열고, 닫을 때 '/'로 되돌린다. 폼 구현은 JoinRoomModal 하나뿐이다.
          { path: '/join', element: <RoomList /> },
          { path: '/join/:code', element: <RoomList /> },
          // 상점은 재화가 사용자 단위라 방에 속하지 않는다 — 방 안/밖 어디서든 같은 경로.
          { path: '/shop', element: <Shop /> },
          { path: '/rooms/:roomId', element: <Dashboard /> },
          { path: '/rooms/:roomId/feed', element: <Feed /> },
          { path: '/rooms/:roomId/letters', element: <Letters /> },
          { path: '/rooms/:roomId/schedule', element: <Schedule /> },
          { path: '/rooms/:roomId/notifications', element: <Notifications /> },
        ],
      },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])

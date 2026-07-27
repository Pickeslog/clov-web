import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { rememberReturnTo } from '../lib/returnUrl'

// 토큰이 없으면 로그인으로 보낸다. 보호 라우트는 이 요소의 자식으로 둔다.
// 보내기 전에 원래 가려던 경로를 남겨서, 로그인 후 그 자리로 돌아오게 한다(#137).
// 초대 링크처럼 "로그아웃 상태로 받는 링크"는 이게 없으면 로그인 후 코드가 사라진 채 홈으로 떨어진다.
export default function ProtectedRoute() {
  const accessToken = useAuthStore((state) => state.accessToken)
  const location = useLocation()

  if (!accessToken) {
    rememberReturnTo(location.pathname + location.search)
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}

import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'

// 토큰이 없으면 로그인으로 보낸다. 보호 라우트는 이 요소의 자식으로 둔다.
export default function ProtectedRoute() {
  const accessToken = useAuthStore((state) => state.accessToken)

  if (!accessToken) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}

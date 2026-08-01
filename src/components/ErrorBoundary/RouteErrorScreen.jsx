import { useRouteError } from 'react-router-dom'
import ErrorScreen from './ErrorScreen'

// 라우트 렌더 중 난 예외를 받는 자리(router.jsx의 errorElement).
// 여기서 잡히면 RouterProvider는 살아 있어서 이동이 가능하다 — 그래서 클래스
// ErrorBoundary보다 이쪽이 먼저 잡는 게 낫다.
export default function RouteErrorScreen() {
  const error = useRouteError()
  console.error('[RouteError]', error)
  return <ErrorScreen error={error} />
}

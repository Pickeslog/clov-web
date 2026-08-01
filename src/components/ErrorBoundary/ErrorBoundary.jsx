import { Component } from 'react'
import ErrorScreen from './ErrorScreen'

/**
 * 최후의 방어선 — 라우터 "바깥"(프로바이더, RouterProvider 자체)에서 난 렌더 예외를 잡는다.
 * 라우트 안에서 난 예외는 router.jsx의 errorElement가 먼저 잡으므로 여기까지 오지 않는다
 * (그쪽이 라우터가 살아 있어 이동이 가능해서 더 낫다).
 *
 * 에러 바운더리는 React 19에서도 클래스로만 만들 수 있고, 이 저장소는 새 패키지 추가에
 * 팀 확인이 필요해서(AGENTS.md) react-error-boundary 없이 직접 둔다.
 *
 * ⚠️ 이게 없으면 렌더 예외 하나에 React가 트리 전체를 언마운트해서 화면이 백지가 된다.
 */
export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    // 원격 수집처가 아직 없어서 콘솔에만 남긴다. 나중에 붙이면 이 자리다.
    console.error('[ErrorBoundary]', error, info?.componentStack)
  }

  render() {
    if (this.state.error) {
      return <ErrorScreen error={this.state.error} />
    }
    return this.props.children
  }
}

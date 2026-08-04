import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router-dom'
import { queryClient } from './lib/queryClient'
import { router } from './router'
import { ConfirmDialogProvider } from './components/ConfirmDialog/ConfirmDialogProvider'
import ErrorBoundary from './components/ErrorBoundary/ErrorBoundary'
import FontTestPanel from './components/FontTestPanel/FontTestPanel'

// 앱 셸: 에러 바운더리 + 서버상태 프로바이더(Query) + 확인 다이얼로그 프로바이더 + 라우터.
// 화면은 라우트가 올라탄다.
//
// 바깥의 ErrorBoundary는 프로바이더·RouterProvider 자체에서 난 예외용이다. 화면 렌더 중
// 난 예외는 router.jsx의 errorElement가 먼저 잡는다(그쪽은 라우터가 살아 있어 이동이 된다).
//
// FontTestPanel: test/font-comparison-panel 브랜치 전용 스크래치 — 폰트 정해지면 이 줄과
// 컴포넌트 통째로 지운다. 어느 라우트에서도 뜨도록 라우터 바깥, 앱 셸 레벨에 둔다.
export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ConfirmDialogProvider>
          <RouterProvider router={router} />
          <FontTestPanel />
        </ConfirmDialogProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}

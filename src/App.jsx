import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router-dom'
import { queryClient } from './lib/queryClient'
import { router } from './router'
import { ConfirmDialogProvider } from './components/ConfirmDialog/ConfirmDialogProvider'

// 앱 셸: 서버상태 프로바이더(Query) + 확인 다이얼로그 프로바이더 + 라우터. 화면은 라우트가 올라탄다.
export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ConfirmDialogProvider>
        <RouterProvider router={router} />
      </ConfirmDialogProvider>
    </QueryClientProvider>
  )
}

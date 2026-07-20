import { QueryClient } from '@tanstack/react-query'

// 서버 상태 전용 클라이언트. 컴포넌트는 이 인스턴스를 통해서만 서버 데이터를 다룬다.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
})

import { QueryClient } from '@tanstack/react-query'

// 서버 상태 전용 클라이언트. 컴포넌트는 이 인스턴스를 통해서만 서버 데이터를 다룬다.
//
// #314 — 이동 중 네트워크가 한 번 끊기면(지하철·엘리베이터·백그라운드 전환) 요청이
// 실패하고, retry도 실패하면 isError로 굳는다. refetchOnWindowFocus가 꺼져 있어서
// 앱으로 돌아와도 재요청이 없었다 — 새로고침 전까지 그 화면은 실패 상태로 고정됐다.
// 켜면 포커스 복귀 시 자동으로 다시 불러온다. staleTime(30초)이 있어 매 포커스마다
// 요청이 나가진 않는다 — 30초 이내 재포커스는 캐시를 그대로 쓴다.
// retry도 1 → 2로 늘려 모바일의 일시적 단절에 조금 더 버티게 한다.
//
// ⚠️ 전역 기본값이라 영향범위가 앱 전체다. 배포 후 요청량이 얼마나 늘었는지
// (특히 마스코트처럼 사용자가 빠르게 여러 번 누르는 화면) 별도로 확인할 것.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: true,
      staleTime: 30_000,
    },
  },
})

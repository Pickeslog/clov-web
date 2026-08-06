import { QueryClient } from '@tanstack/react-query'

/* 랩 전용 QueryClient. 백엔드를 안 탄다 — preferences 를 직접 심고 다시 안 불러온다.
   그래서 이 페이지는 로그인도, 8080 도 필요 없다. */
export const labQueryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, staleTime: Infinity, refetchOnMount: false, refetchOnWindowFocus: false },
  },
})

/** 가이드가 읽는 preferences 를 갈아끼운다. setQueryData 는 구독자에게 바로 알린다. */
export function setLabMascot(mascotType) {
  labQueryClient.setQueryData(['preferences'], { mascotType, equippedItem: null })
}

setLabMascot('crobi')

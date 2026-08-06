import { QueryClient } from '@tanstack/react-query'

/* 랩 전용 QueryClient. 백엔드를 안 탄다 — me·preferences 를 직접 심고 다시 안 불러온다.
   그래서 이 페이지는 로그인도, 8080 도 필요 없다. */
export const labQueryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, staleTime: Infinity, refetchOnMount: false, refetchOnWindowFocus: false },
  },
})

/* 가이드는 저장 키를 계정별로 나누므로(#362) 랩에도 사용자 하나가 필요하다.
   실제 계정과 안 겹치게 접두사를 붙였다 — 랩에서 "다시는 안 보기"를 눌러도
   같은 브라우저의 진짜 계정 상태를 건드리지 않는다. */
export const LAB_USER_ID = 'lab-user'

labQueryClient.setQueryData(['me'], { id: LAB_USER_ID, nickname: '랩', profileImageUrl: null })

/** 가이드가 읽는 preferences 를 갈아끼운다. setQueryData 는 구독자에게 바로 알린다. */
export function setLabMascot(mascotType) {
  labQueryClient.setQueryData(['preferences'], { mascotType, equippedItem: null })
}

setLabMascot('crobi')

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// 인증 토큰만 담는 클라 전역 상태. 서버 데이터는 여기 두지 않는다(TanStack Query 담당).
// refresh 토큰을 본문으로 주고받는 계약(§4-1)이라 프론트가 두 토큰을 로컬 유지한다.
export const useAuthStore = create(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      setTokens: ({ accessToken, refreshToken }) => set({ accessToken, refreshToken }),
      clear: () => set({ accessToken: null, refreshToken: null }),
    }),
    { name: 'clov-auth' },
  ),
)

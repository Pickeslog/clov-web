import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

const STORAGE_KEY = 'clov-auth'
const REMEMBER_KEY = 'clov-auth-remember'

// "로그인 유지" 여부는 항상 localStorage에 둔다 — 이 값 자체가 "토큰을 어디서 읽을지" 가리키는
// 이정표라, sessionStorage에 두면 탭을 닫는 순간 다음 방문 때 뭘 읽어야 할지 알 수 없어진다.
const readRemember = () => {
  try {
    return localStorage.getItem(REMEMBER_KEY) !== '0'
  } catch {
    return true
  }
}

const writeRemember = (remember) => {
  try {
    localStorage.setItem(REMEMBER_KEY, remember ? '1' : '0')
  } catch {
    // 프라이빗 모드 등에서 저장이 막힐 수 있다. 이번 세션은 기본값(영구)으로 동작한다.
  }
}

const clearBothStorages = () => {
  try { localStorage.removeItem(STORAGE_KEY) } catch { /* 프라이빗 모드 등 */ }
  try { sessionStorage.removeItem(STORAGE_KEY) } catch { /* 프라이빗 모드 등 */ }
}

// zustand persist의 storage는 스토어 생성 시점에 고정된다. 로그인마다 실제로 갈아끼우려면,
// 매 호출마다 REMEMBER_KEY를 보고 그때그때 storage를 고르는 어댑터가 필요하다.
const dynamicStorage = {
  getItem: (name) => {
    try {
      return (readRemember() ? localStorage : sessionStorage).getItem(name)
    } catch {
      return null
    }
  },
  setItem: (name, value) => {
    try {
      ;(readRemember() ? localStorage : sessionStorage).setItem(name, value)
    } catch {
      // 프라이빗 모드 등에서 저장이 막힐 수 있다. 로그인 자체는 막지 않는다.
    }
  },
  removeItem: clearBothStorages,
}

// 인증 토큰만 담는 클라 전역 상태. 서버 데이터는 여기 두지 않는다(TanStack Query 담당).
// refresh 토큰을 본문으로 주고받는 계약(§4-1)이라 프론트가 두 토큰을 로컬 유지한다.
export const useAuthStore = create(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      // remember=false면 다음 방문부터 sessionStorage만 읽는다(탭을 닫으면 로그아웃).
      // 이전에 remember=true로 로그인한 적이 있으면 localStorage에 토큰이 남아 있어 꺼도
      // 로그인이 유지돼버리므로, 매번 양쪽을 먼저 지우고 고른 storage에만 새로 쓴다.
      // 토큰 갱신(client.js)·가입·소셜 교환은 remember를 안 넘기고 이 함수를 부른다 — 그때
      // 기본값을 true로 두면 "유지 꺼둔" 사용자도 액세스 토큰이 갱신되는 순간(30분 TTL) 영구
      // 로그인으로 바뀐다. 명시적으로 넘긴 경우(로그인 화면)만 기준을 바꾸고, 나머지는 현재
      // 선택을 그대로 이어가도록 기본값을 readRemember()로 둔다.
      setTokens: ({ accessToken, refreshToken }, { remember = readRemember() } = {}) => {
        writeRemember(remember)
        clearBothStorages()
        set({ accessToken, refreshToken })
      },
      clear: () => {
        set({ accessToken: null, refreshToken: null })
        clearBothStorages()
      },
    }),
    { name: STORAGE_KEY, storage: createJSONStorage(() => dynamicStorage) },
  ),
)

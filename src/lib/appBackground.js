/* =====================================================================
   앱 전역 배경 테마 — 프로토타입 "사용자설정 > 배경"(CLOV_APP_BACKGROUNDS) 이식.
   사진 배경은 번들(public/backgrounds/*.webp, sharp로 1920px·WebP 최적화).
   기본값 = '기본(심플)' CSS 그라디언트(0바이트). 사진 6종·물감색은 설정에서 선택.
   선택값은 프로토타입과 동일하게 기기-로컬(localStorage)에 저장한다.
   적용: :root 에 --clov-app-bg / -size / -pos 를 세팅 → body/이식 화면이 읽음.
   ===================================================================== */

// 썸네일·사진 모두 번들. '심플'만 그라디언트(image 없음).
export const APP_BACKGROUNDS = [
  { id: 'default', name: '기본 (심플)', thumb: '/bg-thumbs/default.png', image: null },
  { id: 'lp-wood-desk', name: 'LP 우드 데스크', thumb: '/bg-thumbs/lp-wood-desk.png', image: '/backgrounds/lp-wood-desk.webp' },
  { id: 'clover-coast', name: '클로버 해안 엽서', thumb: '/bg-thumbs/clover-coast.png', image: '/backgrounds/clover-coast.webp' },
  { id: 'neon-city', name: '네온 클로버 시티', thumb: '/bg-thumbs/neon-city.png', image: '/backgrounds/neon-city.webp' },
  { id: 'minimal-clover', name: '미니멀 클로버', thumb: '/bg-thumbs/minimal-clover.png', image: '/backgrounds/minimal-clover.webp' },
  { id: 'botanical', name: '보태니컬 청사진', thumb: '/bg-thumbs/botanical.png', image: '/backgrounds/botanical.webp' },
]

const STORAGE_KEY = 'clov_appBgTheme'
const COLOR_KEY = 'clov_appBgColor'
const DEFAULT_ID = 'default'
const DEFAULT_COLOR = '#2C5F4A'

export function getCustomColor() {
  try { return localStorage.getItem(COLOR_KEY) || DEFAULT_COLOR } catch { return DEFAULT_COLOR }
}

export function getAppBackgroundId() {
  try {
    const id = localStorage.getItem(STORAGE_KEY)
    if (id === 'custom' || APP_BACKGROUNDS.some((b) => b.id === id)) return id
    return DEFAULT_ID
  } catch {
    return DEFAULT_ID
  }
}

// :root 변수만 세팅/해제한다. default 는 변수 제거 → CSS의 그라디언트 기본값으로 폴백.
export function applyAppBackground(id, { persist = true } = {}) {
  const root = document.documentElement
  if (id === 'custom') {
    // solid 색은 background-image에 그대로 못 넣으므로 단색 그라디언트로 감싼다(유효한 이미지값).
    const c = getCustomColor()
    root.style.setProperty('--clov-app-bg', `linear-gradient(${c}, ${c})`)
    root.style.setProperty('--clov-app-bg-size', 'auto')
    root.style.removeProperty('--clov-app-bg-pos')
    if (persist) { try { localStorage.setItem(STORAGE_KEY, 'custom') } catch { /* 무시 */ } }
    return 'custom'
  }
  const bg = APP_BACKGROUNDS.find((b) => b.id === id) ?? APP_BACKGROUNDS[0]
  if (bg.image) {
    root.style.setProperty('--clov-app-bg', `url("${bg.image}")`)
    root.style.setProperty('--clov-app-bg-size', 'cover')
    root.style.setProperty('--clov-app-bg-pos', 'center')
  } else {
    root.style.removeProperty('--clov-app-bg')
    root.style.removeProperty('--clov-app-bg-size')
    root.style.removeProperty('--clov-app-bg-pos')
  }
  if (persist) {
    try { localStorage.setItem(STORAGE_KEY, bg.id) } catch { /* storage 차단 무시 */ }
  }
  return bg.id
}

// 커스텀 배경 색상(사용자설정 물감) 적용 + 저장.
export function applyCustomColor(color) {
  try { localStorage.setItem(COLOR_KEY, color) } catch { /* 무시 */ }
  return applyAppBackground('custom')
}

// 앱 부팅 시 1회 호출 — 저장된 선택을 적용(없으면 기본 그라디언트).
export function initAppBackground() {
  applyAppBackground(getAppBackgroundId(), { persist: false })
}

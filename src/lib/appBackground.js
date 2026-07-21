/* =====================================================================
   앱 전역 배경 테마 — 프로토타입 "사용자설정 > 배경"(CLOV_APP_BACKGROUNDS) 이식.
   기본(우드&클로버)은 CSS 그라디언트(0바이트), 선택형 사진 배경은 R2 호스팅 URL.
   선택값은 프로토타입과 동일하게 기기-로컬(localStorage)에 저장한다.
   적용: :root 에 --clov-app-bg / -size / -pos 를 세팅 → 이식된 화면(.proto-*)이 읽음.
   ===================================================================== */

// clov-media 버킷 공개 베이스(clov-api application-secret.yaml public-base-url와 동일).
const R2_BASE = 'https://pub-809fa22c1b844b338e5eb73dd0a10c90.r2.dev'
const R2_BG_DIR = `${R2_BASE}/app-backgrounds`

// 썸네일은 번들(public/bg-thumbs), 실제 배경 사진은 R2. default 는 그라디언트(image 없음).
export const APP_BACKGROUNDS = [
  { id: 'default', name: '우드 & 클로버', thumb: '/bg-thumbs/default.png', image: null },
  { id: 'lp-wood-desk', name: 'LP 우드 데스크', thumb: '/bg-thumbs/lp-wood-desk.png', image: `${R2_BG_DIR}/lp-wood-desk.webp` },
  { id: 'clover-coast', name: '클로버 해안 엽서', thumb: '/bg-thumbs/clover-coast.png', image: `${R2_BG_DIR}/clover-coast.webp` },
  { id: 'neon-city', name: '네온 클로버 시티', thumb: '/bg-thumbs/neon-city.png', image: `${R2_BG_DIR}/neon-city.webp` },
  { id: 'minimal-clover', name: '미니멀 클로버', thumb: '/bg-thumbs/minimal-clover.png', image: `${R2_BG_DIR}/minimal-clover.webp` },
  { id: 'botanical', name: '보태니컬 청사진', thumb: '/bg-thumbs/botanical.png', image: `${R2_BG_DIR}/botanical.webp` },
]

const STORAGE_KEY = 'clov_appBgTheme'
const DEFAULT_ID = 'default'

export function getAppBackgroundId() {
  try {
    const id = localStorage.getItem(STORAGE_KEY)
    return APP_BACKGROUNDS.some((b) => b.id === id) ? id : DEFAULT_ID
  } catch {
    return DEFAULT_ID
  }
}

// :root 변수만 세팅/해제한다. default 는 변수 제거 → CSS의 그라디언트 기본값으로 폴백.
export function applyAppBackground(id, { persist = true } = {}) {
  const bg = APP_BACKGROUNDS.find((b) => b.id === id) ?? APP_BACKGROUNDS[0]
  const root = document.documentElement
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

// 앱 부팅 시 1회 호출 — 저장된 선택을 적용(없으면 기본 그라디언트).
export function initAppBackground() {
  applyAppBackground(getAppBackgroundId(), { persist: false })
}

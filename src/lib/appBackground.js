/* =====================================================================
   앱 전역 배경 테마 — 프로토타입 "사용자설정 > 배경"(CLOV_APP_BACKGROUNDS) 이식.
   사진 배경은 번들(public/backgrounds/*.webp, sharp로 1920px·WebP 최적화).
   기본값 = '기본(심플)' CSS 그라디언트(0바이트). 사진 6종·물감색은 설정에서 선택.
   선택값은 프로토타입과 동일하게 기기-로컬(localStorage)에 저장한다.
   적용: :root 에 --clov-app-bg / -size / -pos 를 세팅 → body/이식 화면이 읽음.
   ===================================================================== */

// 썸네일·사진 모두 번들. '심플'만 그라디언트(image 없음).
//
// itemCode 가 있으면 상점 유료 상품이다(shop_items.code 와 같은 값). 없으면 기본 제공이다.
// 기존 5종과 '기본(심플)'은 무료로 남긴다 — 무료였던 걸 유료로 바꾸는 건 뺏는 것이고
// 되돌릴 수 없다(리더 확정 2026-08-04). shop_items 에 행 자체가 없으므로 "판매 종료된
// 유료 상품(RETIRED)"이 아니라 "상점 밖 기본 제공"이다.
//
// ⚠️ 소유 판정은 Settings 의 그리기 단계에서만 한다. 여기서 막지 않는 건 의도다 —
//   선택값은 localStorage 이고 적용은 CSS 변수라, 브라우저 콘솔로 얼마든지 바꿀 수 있다.
//   즉 이건 보안 경계가 아니라 화면 안내다. 서버가 지켜야 할 건 '구매'뿐이고 그건
//   shop_items/user_inventory_items 가 이미 지킨다.
export const APP_BACKGROUNDS = [
  { id: 'default', name: '기본 (심플)', thumb: '/bg-thumbs/default.png', image: null },
  { id: 'lp-wood-desk', name: 'LP 우드 데스크', thumb: '/bg-thumbs/lp-wood-desk.png', image: '/backgrounds/lp-wood-desk.webp' },
  { id: 'clover-coast', name: '클로버 해안 엽서', thumb: '/bg-thumbs/clover-coast.png', image: '/backgrounds/clover-coast.webp' },
  { id: 'neon-city', name: '네온 클로버 시티', thumb: '/bg-thumbs/neon-city.png', image: '/backgrounds/neon-city.webp' },
  { id: 'minimal-clover', name: '미니멀 클로버', thumb: '/bg-thumbs/minimal-clover.png', image: '/backgrounds/minimal-clover.webp' },
  { id: 'botanical', name: '보태니컬 청사진', thumb: '/bg-thumbs/botanical.png', image: '/backgrounds/botanical.webp' },
  // 사계절 4종 — 상점 유료(BACKGROUND · RARE 2,800). itemCode 는 shop_items.code 와 같아야 한다.
  { id: 'spring-rain-city', name: '봄비 뒤 벚꽃 운하', thumb: '/bg-thumbs/spring-rain-city.png', image: '/backgrounds/spring-rain-city.webp', itemCode: 'BACKGROUND_SPRING_RAIN_CITY' },
  { id: 'midsummer-cove', name: '한여름 비밀 만', thumb: '/bg-thumbs/midsummer-cove.png', image: '/backgrounds/midsummer-cove.webp', itemCode: 'BACKGROUND_MIDSUMMER_COVE' },
  { id: 'autumn-watercolor-path', name: '단풍빛 돌길', thumb: '/bg-thumbs/autumn-watercolor-path.png', image: '/backgrounds/autumn-watercolor-path.webp', itemCode: 'BACKGROUND_AUTUMN_WATERCOLOR_PATH' },
  { id: 'winter-moonlit-forest', name: '토렐로의 겨울 골목', thumb: '/bg-thumbs/winter-moonlit-forest.png', image: '/backgrounds/winter-moonlit-forest.webp', itemCode: 'BACKGROUND_WINTER_MOONLIT_FOREST' },
  // 한정 — 상점 유료(BACKGROUND · LEGENDARY 9,800 · 할인 80%). 다른 배경과 달리 CSS 별
  // 반짝임 레이어가 붙는다(index.css의 [data-app-bg="developer-gemini-night"]).
  // ★ 그 레이어가 이 배경만 LEGENDARY인 근거다 — 빼면 RARE 2,800으로 내려야 한다.
  { id: 'developer-gemini-night', name: '은하수 아래 개발자의 밤', thumb: '/bg-thumbs/developer-gemini-night.png', image: '/backgrounds/developer-gemini-night.webp', itemCode: 'BACKGROUND_DEVELOPER_GEMINI_NIGHT' },
]

// 보유 code 집합을 받아 "고를 수 있는가"를 답한다. 화면 안내용 판정이고 보안 경계가 아니다.
// ★ 규칙을 화면마다 다시 쓰지 않게 한 곳에 둔다 — 잠금 표시와 클릭 허용이 서로 다른
//   조건을 쓰면 "자물쇠가 붙었는데 눌리는" 상태가 생기고, 그건 에러 없이 조용하다.
export function isBackgroundUnlocked(bg, ownedCodes) {
  if (!bg?.itemCode) return true
  return ownedCodes instanceof Set && ownedCodes.has(bg.itemCode)
}

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
    root.dataset.appBg = 'custom'
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
  // 배경별 연출을 CSS에서 걸 수 있게 선택된 id를 노출한다(index.css의 별 반짝임 레이어).
  // CSS 변수만으로는 "어느 배경이 선택됐는지"를 선택자로 쓸 수 없어서 속성을 따로 둔다.
  root.dataset.appBg = bg.id
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

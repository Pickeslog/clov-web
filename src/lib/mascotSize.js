/* =====================================================================
   마스코트 크기 — 사용자설정 > 테마에서 고른다.
   선택값은 배경 테마·라이트/다크와 같이 기기-로컬(localStorage)에 저장한다.
   화면에서 얼마나 크게 보이는지는 모니터 크기에 딸린 취향이라 계정보다
   기기에 묶는 쪽이 자연스럽고, user_preferences 컬럼을 늘리지 않아도 된다.
   적용: :root 에 --clov-mascot-size 를 세팅 → Mascot.css 가 읽는다.
   ===================================================================== */

// 원본 스프라이트가 640px 높이라 220px도 2.9배 오버샘플이다 — 흐려지지 않는다.
export const MASCOT_SIZES = [
  { value: 'sm', label: '작게', px: 140, img: '/settings-options/mascot-size-sm.png' },
  { value: 'md', label: '보통', px: 180, img: '/settings-options/mascot-size-md.png' },
  { value: 'lg', label: '크게', px: 220, img: '/settings-options/mascot-size-lg.png' },
]

const STORAGE_KEY = 'clov_mascotSize'
const DEFAULT_VALUE = 'md'

export function getMascotSize() {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    return MASCOT_SIZES.some((s) => s.value === v) ? v : DEFAULT_VALUE
  } catch {
    return DEFAULT_VALUE
  }
}

export function applyMascotSize(value, { persist = true } = {}) {
  const size = MASCOT_SIZES.find((s) => s.value === value) ?? MASCOT_SIZES.find((s) => s.value === DEFAULT_VALUE)
  document.documentElement.style.setProperty('--clov-mascot-size', `${size.px}px`)
  if (persist) {
    try { localStorage.setItem(STORAGE_KEY, size.value) } catch { /* storage 차단 무시 */ }
  }
  return size.value
}

export function initMascotSize() {
  applyMascotSize(getMascotSize(), { persist: false })
}

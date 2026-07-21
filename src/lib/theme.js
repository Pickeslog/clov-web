/* =====================================================================
   라이트/다크 테마 — 기기-로컬(localStorage) + body 클래스.
   기본 = 다크(이식 화면들이 다크 팔레트). 라이트는 body.light-mode로 덧입힘.
   ===================================================================== */
const KEY = 'clov_darkMode'

export function getDark() {
  try {
    const v = localStorage.getItem(KEY)
    return v == null ? true : v === 'true'
  } catch {
    return true
  }
}

// dark=true → 다크(클래스 없음), dark=false → 라이트(body.light-mode).
export function applyTheme(dark) {
  document.body.classList.toggle('light-mode', !dark)
  try { localStorage.setItem(KEY, dark ? 'true' : 'false') } catch { /* storage 차단 무시 */ }
}

export function initTheme() {
  applyTheme(getDark())
}

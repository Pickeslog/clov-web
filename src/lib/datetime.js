/* =====================================================================
   날짜·시각 공통 유틸.
   백엔드는 오프셋 없는 UTC(LocalDateTime, 예: 2026-07-24T00:13:04)를 준다.
   Z를 붙여 파싱해야 한국 시각으로 맞는다 — 안 붙이면 9시간 밀린다.
   값이 없거나 잘못돼도 절대 예외를 던지지 않는다(타임스탬프 하나로 화면 전체가 죽으면 안 된다).
   ===================================================================== */

const isValidDate = (d) => d instanceof Date && !Number.isNaN(d.getTime())

export function parseUtc(value) {
  if (!value) return null
  const d = new Date(String(value).endsWith('Z') ? value : `${value}Z`)
  return isValidDate(d) ? d : null
}

export function formatDate(value) {
  const d = parseUtc(value)
  return d
    ? d.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\. /g, '. ').replace(/\.$/, '')
    : ''
}

export function formatTime(value) {
  const d = parseUtc(value)
  return d ? d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false }) : ''
}

// 오늘과의 날짜 차이(숫자)만 반환한다. 'D-3' 같은 라벨 문자열은 각 화면이 만든다.
export function ddayDiff(dateStr) {
  const m = String(dateStr || '').match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/)
  if (!m) return null
  const target = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  if (!isValidDate(target)) return null
  const today = new Date()
  target.setHours(0, 0, 0, 0)
  today.setHours(0, 0, 0, 0)
  return Math.round((target - today) / 86400000)
}

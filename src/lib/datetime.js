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

/* ---------------------------------------------------------------------
   생일 — "MM-DD" 에서 다음 생일 날짜를 만든다 (clov-web#376 · clov-api#143).

   ★ 왜 연도가 없는 값을 받나 — RoomMember.birthMonthDay 가 월·일만 준다(계약 §6).
     서버는 UTC라 "오늘"을 못 준다(KST 00~09시엔 서버 기준 어제). 그래서 판단을
     브라우저 로컬 날짜로 미룬 것이고, 여기서도 로컬 기준으로만 계산한다.

   ★ 생일은 Plan 행으로 저장하지 않는다 — 매년 돌아오는 걸 저장하면 생성·멱등·
     반복이 전부 문제가 되지만, 계산하면 그냥 "다음 생일"이다(clov-api#143 결정).
   --------------------------------------------------------------------- */
export function nextBirthdayDate(monthDay) {
  const m = String(monthDay || '').match(/^(\d{1,2})-(\d{1,2})$/)
  if (!m) return null
  const month = Number(m[1])
  const day = Number(m[2])
  if (month < 1 || month > 12 || day < 1 || day > 31) return null

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  // 올해 → 내년 순으로 본다. 오늘이 생일이면 오늘을 준다(ddayDiff 가 0 = D-DAY).
  for (const year of [today.getFullYear(), today.getFullYear() + 1]) {
    const d = new Date(year, month - 1, day)
    if (!isValidDate(d)) continue
    d.setHours(0, 0, 0, 0)
    // ⚠️ 2/29 생일은 평년에 Date 가 3/1 로 넘긴다. 그 동작을 그대로 쓴다 —
    //    "없는 날"에 안 띄우는 것보다 하루 뒤에라도 축하하는 쪽이 맞다.
    //    넘어간 결과가 오늘보다 과거일 수 있어(예: 오늘 3/5, 생일 2/29 → 3/1)
    //    비교를 통과 못 하면 다음 해로 넘어간다.
    if (d >= today) return toDateKey(d)
  }
  return null
}

const pad2 = (n) => String(n).padStart(2, '0')
// Date → "YYYY-MM-DD" (로컬 기준). toISOString 은 UTC 라 한국 자정 직후 하루가 밀린다.
function toDateKey(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

// dateStr(YYYY-MM-DD 등 ddayDiff와 같은 형식)의 월-일이 monthDay("MM-DD", 계약 §6
// birthMonthDay)와 같은지. 생일처럼 연도 없이 월-일만 비교해야 하는 화면에서 쓴다.
export function isSameMonthDay(dateStr, monthDay) {
  const m = String(dateStr || '').match(/\d{4}\D+(\d{1,2})\D+(\d{1,2})/)
  if (!m || !monthDay) return false
  const [, month, day] = m
  return `${month.padStart(2, '0')}-${day.padStart(2, '0')}` === monthDay
}

// 오늘이 monthDay("MM-DD")와 같은 날인지 — 로컬 기준(위 nextBirthdayDate와 같은 이유).
export function isTodayMonthDay(monthDay) {
  const today = new Date()
  return isSameMonthDay(toDateKey(today), monthDay)
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

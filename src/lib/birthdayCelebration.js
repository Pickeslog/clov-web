/* =====================================================================
   생일 축하 모달을 오늘 이미 봤는지 (#383).

   ★ 왜 날짜를 키에 넣나 — 그러면 만료 처리가 필요 없다. 다음 생일은 다른 날짜라
     자동으로 새 키가 되고, 그해에는 한 번만 뜬다. "언제 봤는지"를 값으로 저장하고
     비교하는 방식보다 읽기 쉽고 틀릴 여지가 없다.

   ★ 계정별이다 — onboardingGuide.js 와 같은 이유. 브라우저 하나를 여러 계정이
     쓰면(개발 중에 실제로 그런다) 한 사람이 본 걸로 다른 사람이 못 보게 된다.

   ⚠️ 저장소가 막힌 환경(사파리 프라이빗 등)에서는 전부 조용히 넘어간다. 그때는
      "매번 뜬다"가 되는데, 축하 모달이 한 번 더 뜨는 건 화면이 죽는 것보다 낫다.
   ===================================================================== */

const PREFIX = 'clov-birthday-seen'
const keyOf = (userId, dateKey) => `${PREFIX}:${String(userId)}:${dateKey}`

/** 로컬 기준 "YYYY-MM-DD". toISOString 은 UTC 라 한국 자정 직후 하루가 밀린다. */
export function todayKey(now = new Date()) {
  const p = (n) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`
}

export function shouldShowCelebration(userId, dateKey = todayKey()) {
  // ★ 모르면 안 띄운다. ['me'] 가 오기 전에 띄우면 "모르는 사람" 키로 저장돼
  //   진짜 사용자가 자기 생일에 못 본다(가이드에서 같은 자리를 밟았다 — #362).
  if (userId == null) return false
  try {
    return localStorage.getItem(keyOf(userId, dateKey)) !== '1'
  } catch {
    return true
  }
}

export function markCelebrationSeen(userId, dateKey = todayKey()) {
  if (userId == null) return
  try {
    localStorage.setItem(keyOf(userId, dateKey), '1')
    dropOldKeys(userId, dateKey)
  } catch { /* 저장소가 막혀 있으면 그냥 다음에 또 뜬다 */ }
}

/** 같은 사용자의 지난 날짜 키를 지운다 — 안 지우면 해마다 하나씩 영원히 쌓인다. */
function dropOldKeys(userId, keepDateKey) {
  const mine = `${PREFIX}:${String(userId)}:`
  const keep = keyOf(userId, keepDateKey)
  try {
    // 순회 중에 지우면 인덱스가 밀리므로 먼저 모아서 지운다.
    const doomed = []
    for (let i = 0; i < localStorage.length; i += 1) {
      const k = localStorage.key(i)
      if (k && k.startsWith(mine) && k !== keep) doomed.push(k)
    }
    doomed.forEach((k) => localStorage.removeItem(k))
  } catch { /* 무시 */ }
}

/* =====================================================================
   온보딩 가이드가 다시 뜰지 말지 — 저장소를 둘로 나누고, 키를 계정별로 나눈다.

   건너뛰기 · X            이번 방문만   sessionStorage  clov-guide-skipped:<userId>
   "다시는 안 보기"         영구          localStorage    clov-guide-done:<userId>
   끝까지 보고 "시작하기"    영구          localStorage    clov-guide-done:<userId>
   프로필 → 가이드 다시 보기  둘 다 지운다

   ★ 저장소를 둘로 나눈 이유 — 하나로 합치면 한쪽이 손해를 본다. 급해서 건너뛴 사람은
     다시 볼 기회가, 확실히 필요 없는 사람은 영구 차단이 필요하다. 그리고 되돌릴
     길("가이드 다시 보기")이 없으면 "다시는 안 보기"는 일방통행이 된다.

   ★★ 키를 계정별로 나눈 이유 (#362) — 처음엔 기기-로컬로 뒀다. "이 기기에서 이 화면을
      처음 보는가"라 테마·마스코트 크기처럼 기기에 묶는 게 자연스럽다고 봤는데 **틀렸다.**
      테마·크기는 화면 속성이지만 **온보딩은 "이 사람이 처음인가"에 대한 답**이다.
      로그아웃은 clov-auth 만 지우므로(authStore), 공용 PC에서 A가 가이드를 끝내면
      **B는 가이드를 영영 못 봤다.**

   ⚠️ userId 를 모르는 동안에는 아무 판단도 하지 않는다. 모르는 채로 "안 봤다"고 하면
      로그인 직후 잠깐 떴다가 사라지고, "봤다"고 하면 신규 사용자가 못 본다.

   ⚠️ 사파리 프라이빗 등에서 storage 접근이 통째로 throw 한다. 전부 try/catch 로 감싸고,
      못 읽으면 "안 봤다"로 떨어뜨린다 — 가이드가 한 번 더 뜨는 건 사소하지만 첫 화면이
      예외로 죽는 건 사소하지 않다.
   ===================================================================== */

const DONE_PREFIX = 'clov-guide-done'
const SKIPPED_PREFIX = 'clov-guide-skipped'

// 서버가 id 를 문자열로 준다. 숫자로 들어와도 같은 키가 되도록 맞춘다.
const keyOf = (prefix, userId) => `${prefix}:${String(userId)}`

/**
 * 접미사 없는 옛 키를 지운다(#362 이전 형식).
 * 어느 계정 것인지 알 수 없어 이전이 불가능하다 — 남겨두면 영영 안 지워진다.
 * 그 결과 기존 사용자도 가이드를 한 번 더 보게 되는데, 마침 4단계 → 5단계로
 * 바뀐 참이라 오히려 맞다.
 */
export function dropLegacyGuideKeys() {
  try {
    localStorage.removeItem(DONE_PREFIX)
    sessionStorage.removeItem(SKIPPED_PREFIX)
  } catch { /* 프라이빗 모드 등 — 못 지워도 아래 판정은 새 키만 본다 */ }
}

/** 이 계정에게 가이드를 자동으로 띄워야 하는가. userId 를 모르면 판단하지 않는다. */
export function shouldShowGuide(userId) {
  if (userId == null) return false
  try {
    return localStorage.getItem(keyOf(DONE_PREFIX, userId)) !== '1'
      && sessionStorage.getItem(keyOf(SKIPPED_PREFIX, userId)) !== '1'
  } catch {
    return true
  }
}

/** 영구 — 다 봤거나 "다시는 안 보기"를 눌렀다. */
export function markGuideDone(userId) {
  if (userId == null) return
  try { localStorage.setItem(keyOf(DONE_PREFIX, userId), '1') } catch { /* 저장 못 해도 화면은 닫힌다 */ }
}

/** 이번 방문만 — 건너뛰기·X. 탭을 닫으면 사라진다. */
export function markGuideSkipped(userId) {
  if (userId == null) return
  try { sessionStorage.setItem(keyOf(SKIPPED_PREFIX, userId), '1') } catch { /* 위와 같다 */ }
}

/** 프로필 → "가이드 다시 보기". 둘 다 지워야 영구 차단이 풀린다. */
export function resetGuide(userId) {
  if (userId == null) return
  try {
    localStorage.removeItem(keyOf(DONE_PREFIX, userId))
    sessionStorage.removeItem(keyOf(SKIPPED_PREFIX, userId))
  } catch { /* 못 지워도 스토어가 즉시 열어준다 */ }
}

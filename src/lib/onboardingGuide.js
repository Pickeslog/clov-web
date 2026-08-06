/* =====================================================================
   온보딩 가이드가 다시 뜰지 말지 — 저장소를 둘로 나눈다.

   건너뛰기 · X            이번 방문만   sessionStorage  clov-guide-skipped
   "다시는 안 보기"         영구          localStorage    clov-guide-done
   끝까지 보고 "시작하기"    영구          localStorage    clov-guide-done
   프로필 → 가이드 다시 보기  둘 다 지운다

   ★ 하나로 합치면 한쪽이 손해를 본다. 급해서 건너뛴 사람은 다시 볼 기회가,
     확실히 필요 없는 사람은 영구 차단이 필요하다. 그리고 되돌릴 길("가이드 다시
     보기")이 없으면 "다시는 안 보기"는 일방통행이 된다.

   기기-로컬에 두는 이유는 백엔드 작업이 없어서만이 아니다 — 가이드는 "이 기기에서
   이 화면을 처음 보는가"에 대한 답이라 계정보다 기기에 묶이는 게 자연스럽다.
   테마·배경·마스코트 크기(mascotSize.js)와 같은 판단이다.

   ⚠️ 사파리 프라이빗 등에서 storage 접근이 통째로 throw 한다. 전부 try/catch 로
     감싸고, 못 읽으면 "안 봤다"로 떨어뜨린다 — 가이드가 한 번 더 뜨는 건 사소하지만
     첫 화면이 예외로 죽는 건 사소하지 않다.
   ===================================================================== */

export const GUIDE_DONE_KEY = 'clov-guide-done'
export const GUIDE_SKIPPED_KEY = 'clov-guide-skipped'

/** 이 기기에서 가이드를 자동으로 띄워야 하는가. */
export function shouldShowGuide() {
  try {
    return localStorage.getItem(GUIDE_DONE_KEY) !== '1'
      && sessionStorage.getItem(GUIDE_SKIPPED_KEY) !== '1'
  } catch {
    return true
  }
}

/** 영구 — 다 봤거나 "다시는 안 보기"를 눌렀다. */
export function markGuideDone() {
  try { localStorage.setItem(GUIDE_DONE_KEY, '1') } catch { /* 저장 못 해도 화면은 그대로 닫힌다 */ }
}

/** 이번 방문만 — 건너뛰기·X. 탭을 닫으면 사라진다. */
export function markGuideSkipped() {
  try { sessionStorage.setItem(GUIDE_SKIPPED_KEY, '1') } catch { /* 위와 같다 */ }
}

/** 프로필 → "가이드 다시 보기". 둘 다 지워야 영구 차단이 풀린다. */
export function resetGuide() {
  try {
    localStorage.removeItem(GUIDE_DONE_KEY)
    sessionStorage.removeItem(GUIDE_SKIPPED_KEY)
  } catch { /* 못 지워도 아래에서 스토어가 즉시 열어준다 */ }
}

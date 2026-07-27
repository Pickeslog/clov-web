// 보호 라우트에 로그아웃 상태로 들어왔을 때 "원래 가려던 곳"을 기억했다가 로그인 후 돌려보낸다.
//
// router의 location.state가 아니라 sessionStorage를 쓰는 이유:
// 소셜 로그인은 백엔드(/oauth2/authorization/...)로 **전체 페이지 이동**을 했다가 돌아오기 때문에
// 라우터 state가 그 왕복에서 사라진다. 세 경로(이메일 로그인·회원가입·소셜)가 같은 방식으로
// 읽게 하려면 브라우저 저장소에 두는 쪽이 맞다. 탭을 닫으면 같이 사라지는 sessionStorage면 충분하다.
const KEY = 'clov-return-to'

// 우리 앱 안의 경로만 허용한다. "//evil.com"(프로토콜 상대 URL)이나 "http://..."를 그대로 넘기면
// 로그인 직후 외부로 튕겨나가는 통로가 된다. 저장하는 쪽도 우리 코드지만, 읽을 때 한 번 더 막는다.
const isSafeInternalPath = (value) =>
  typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') && !value.startsWith('/\\')

/** 보호 라우트가 로그인 화면으로 돌려보내기 직전에 호출한다. */
export function rememberReturnTo(path) {
  if (!isSafeInternalPath(path)) return
  try {
    sessionStorage.setItem(KEY, path)
  } catch {
    // 프라이빗 모드 등에서 저장이 막힐 수 있다. 돌아가기는 포기하되 로그인 자체를 막지는 않는다.
  }
}

/** 로그인·가입 성공 직후에 호출한다. 한 번 읽으면 지운다(다음 로그인에 딸려오지 않게). */
export function takeReturnTo(fallback = '/') {
  try {
    const stored = sessionStorage.getItem(KEY)
    sessionStorage.removeItem(KEY)
    return isSafeInternalPath(stored) ? stored : fallback
  } catch {
    return fallback
  }
}

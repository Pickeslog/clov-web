// 로그인 안 된 상태로 초대 링크(/join/:code)를 탄 친구를 위한 임시 보관소.
// JoinRoom이 코드를 넣어두고, 로그인 후 처음 도달하는 RoomList가 한 번 꺼내
// /join/:code로 되돌려보낸다 → 어떤 로그인 경로(비번·소셜)든 코드가 유실되지 않는다.
// sessionStorage라 탭을 닫으면 사라진다(장기 저장 아님).
const KEY = 'clov:pendingJoin'

export const setPendingJoin = (code) => {
  try {
    if (code) sessionStorage.setItem(KEY, code)
  } catch {
    /* 프라이빗 모드 등 sessionStorage 미지원 — 무시 */
  }
}

// 값을 읽고 즉시 비운다(1회용). 없으면 null.
export const takePendingJoin = () => {
  try {
    const code = sessionStorage.getItem(KEY)
    if (code) sessionStorage.removeItem(KEY)
    return code
  } catch {
    return null
  }
}

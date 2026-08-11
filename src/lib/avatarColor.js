// 프로필 이미지가 없을 때 이니셜 아바타의 배경색. 우정공간 정원(최대 8명)과 개수를 맞춰
// 정원이 꽉 차도 안 겹친다. 예전엔 화면마다(Letters.jsx/RoomPreviewModal.jsx/Dashboard.jsx
// 등) 초록 계열 팔레트를 따로 들고 있어서 4~5색뿐이라 겹쳤고, 그마저도 없는 화면(경험치
// 히스토리·추억피드 댓글 등)은 전부 같은 초록 하나였다(사용자 지적) — 초록에 묶지 말고
// 다양하게, 그리고 같은 사람은 화면이 달라도 항상 같은 색으로 보이게 해달라는 요청.
export const AVATAR_COLORS = [
  '#e0645c', // 코랄
  '#e0913f', // 오렌지
  '#c9a227', // 앰버
  '#52b788', // 그린(브랜드)
  '#369e96', // 틸
  '#4c86d6', // 블루
  '#8c6fd6', // 퍼플
  '#d66fa0', // 핑크
]

// 목록 순번이 아니라 사용자 식별자(id/닉네임)로 색을 정한다 — 같은 사람이 여러 목록
// (참여 멤버/경험치 히스토리/추억피드 댓글 등)에 나올 때마다 순번이 달라져 색이 바뀌던
// 문제를 없앤다. 단순 문자열 해시라 암호학적 분산은 아니지만 아바타 색 배정엔 충분하다.
export function avatarColorForKey(key) {
  const str = String(key ?? '')
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

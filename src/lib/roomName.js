// 방 이름 검증 규칙(계약 §6, clov-api #78) — trim 후 2~20자, 문자 종류 제한 없음.
// 목업 정규식(한글/영문/숫자만)은 채택하지 않는다 — "제주 가자!"·"캠핑 크루 🏕️"·"D-16 스터디"처럼
// 실제 방 이름은 구두점·이모지를 흔히 쓴다(clov-api #74 코멘트 참고).
export const ROOM_NAME_MIN = 2
export const ROOM_NAME_MAX = 20

export function validateRoomName(name) {
  const trimmed = name.trim()
  if (trimmed.length < ROOM_NAME_MIN || trimmed.length > ROOM_NAME_MAX) {
    return `방 이름은 공백 제외 ${ROOM_NAME_MIN}~${ROOM_NAME_MAX}자로 입력해주세요.`
  }
  return null
}

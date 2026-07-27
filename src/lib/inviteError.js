// 초대 코드 입장 실패를 공용으로 해석한다. JoinRoom·RoomList 인라인 입장 양쪽에서 재사용.
export function describeInviteError(error) {
  switch (error.code) {
    case 'INVITE_EXPIRED':
      return '만료되었거나 존재하지 않는 초대 코드입니다.'
    case 'ROOM_MEMBER_ALREADY_JOINED':
    case 'ROOM_MEMBER_NOT_FOUND':
      return '이미 참여 중인 우정공간이거나 참여할 수 없습니다.'
    default:
      return error.message ?? '가입 신청에 실패했습니다.'
  }
}

// ROOM_MEMBER_ALREADY_JOINED(신규, clov-api #77)에만 error.details로 roomId가 실려 온다.
// 레거시 ROOM_MEMBER_NOT_FOUND는 details가 없어 null — 자동 이동 대신 안내 문구만 보여준다.
export function extractJoinedRoomId(error) {
  if (error.code !== 'ROOM_MEMBER_ALREADY_JOINED') return null
  return error.details?.find((detail) => detail.field === 'roomId')?.reason ?? null
}

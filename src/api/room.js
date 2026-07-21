import { api } from './client'

// 우정공간(room) 도메인 호출. 컴포넌트는 fetch를 직접 쓰지 않고 이 함수들을 통해서만 호출한다.
// 응답은 client.js 인터셉터가 언래핑한 data가 그대로 반환된다(계약 §6·§12).
// 주의: "내 우정공간 목록"(GET /rooms)은 계약 갭으로 아직 없음 — 목록/그룹전환은 병행 추가 예정.
export const createRoom = (payload) => api.post('/rooms', payload)
export const getRoom = (roomId) => api.get(`/rooms/${roomId}`)
export const getRoomMembers = (roomId) => api.get(`/rooms/${roomId}/members`)
export const getRoomLevel = (roomId) => api.get(`/rooms/${roomId}/level`)
export const leaveRoom = (roomId) => api.delete(`/rooms/${roomId}/members/me`)
export const toggleRoomFavorite = (roomId, isFavorite) =>
  api.patch(`/rooms/${roomId}/favorite`, { isFavorite })

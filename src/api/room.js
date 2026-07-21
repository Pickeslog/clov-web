import { api } from './client'

// 우정공간(room) 도메인 호출. 컴포넌트는 fetch를 직접 쓰지 않고 이 함수들을 통해서만 호출한다.
// 응답은 client.js 인터셉터가 언래핑한 data가 그대로 반환된다(계약 §6·§12).
// GET /rooms = 내가 ACTIVE 멤버인 ACTIVE 방 목록(즐겨찾기 우선·최근순, 서버 고정 정렬 — 파라미터 없음).
// 응답 data = { items: RoomSummary[] }(계약 §6-1). 백엔드 clov-api #32 머지 후 라이브.
export const getRooms = () => api.get('/rooms')
export const createRoom = (payload) => api.post('/rooms', payload)
export const getRoom = (roomId) => api.get(`/rooms/${roomId}`)
export const getRoomMembers = (roomId) => api.get(`/rooms/${roomId}/members`)
export const getRoomLevel = (roomId) => api.get(`/rooms/${roomId}/level`)
export const leaveRoom = (roomId) => api.delete(`/rooms/${roomId}/members/me`)
export const toggleRoomFavorite = (roomId, isFavorite) =>
  api.patch(`/rooms/${roomId}/favorite`, { isFavorite })

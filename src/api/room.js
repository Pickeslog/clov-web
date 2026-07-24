import { api } from './client'

// 우정공간(room) 도메인 호출. 컴포넌트는 fetch를 직접 쓰지 않고 이 함수들을 통해서만 호출한다.
// 응답은 client.js 인터셉터가 언래핑한 data가 그대로 반환된다(계약 §6·§12).
// GET /rooms = 내가 ACTIVE 멤버인 ACTIVE 방 목록(즐겨찾기 우선·최근순, 서버 고정 정렬 — 파라미터 없음).
// 응답 data = { items: RoomSummary[] }(계약 §6-1). 백엔드 clov-api #32 머지 후 라이브.
export const getRooms = () => api.get('/rooms')
export const createRoom = (payload) => api.post('/rooms', payload)
export const getRoom = (roomId) => api.get(`/rooms/${roomId}`)
// 방 프로필 수정(부분) — name·description·themeColor·transportType 등(계약 §6·PATCH /rooms/{id}).
export const updateRoom = (roomId, payload) => api.patch(`/rooms/${roomId}`, payload)
export const getRoomMembers = (roomId) => api.get(`/rooms/${roomId}/members`)
export const getRoomLevel = (roomId) => api.get(`/rooms/${roomId}/level`)
// 경험치 히스토리(계약 §12) — 목록 봉투, items = ExpLog[](최신순).
export const getExpLogs = (roomId) => api.get(`/rooms/${roomId}/exp-logs`)
// 마스코트 교감(+2 XP). 하루 3회 초과 시 429 MASCOT_INTERACTION_LIMIT_REACHED(계약 §12).
export const interactMascot = (roomId) => api.post(`/rooms/${roomId}/mascot/interact`)
export const leaveRoom = (roomId) => api.delete(`/rooms/${roomId}/members/me`)
export const toggleRoomFavorite = (roomId, isFavorite) =>
  api.patch(`/rooms/${roomId}/favorite`, { isFavorite })
// 내 상태 메시지(대시보드 표시·편집, 계약 §12). PATCH → { statusMessage } 반환.
export const updateStatusMessage = (roomId, statusMessage) =>
  api.patch(`/rooms/${roomId}/members/me/status-message`, { statusMessage })
// 대표 커버 이미지 presign(계약 §6). 발급 후 R2로 PUT → PATCH /rooms/{id} coverPhotoUrl로 커밋.
export const presignRoomCover = (roomId, payload) => api.post(`/rooms/${roomId}/cover-image/presign`, payload)

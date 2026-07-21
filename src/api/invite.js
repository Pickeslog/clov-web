import { api } from './client'

// invite(초대·가입신청) 도메인 호출. 컴포넌트는 fetch를 직접 쓰지 않고 이 함수들을 통해서만 호출한다.
// 응답은 client.js 인터셉터가 언래핑한 data가 그대로 반환된다(계약 §7).
export const createInvite = (roomId, payload) => api.post(`/rooms/${roomId}/invites`, payload)
export const getInvites = (roomId) => api.get(`/rooms/${roomId}/invites`)
export const cancelInvite = (inviteId) => api.delete(`/invites/${inviteId}`)
export const requestJoin = (payload) => api.post('/invites/accept', payload)
export const getJoinRequests = (roomId) => api.get(`/rooms/${roomId}/join-requests`)
// 내가 보낸 가입신청(요청한 방) — PENDING·REJECTED + roomName·roomStatus.
export const getMyJoinRequests = () => api.get('/join-requests/mine')
export const acceptJoinRequest = (joinRequestId) => api.post(`/join-requests/${joinRequestId}/accept`)
export const rejectJoinRequest = (joinRequestId) => api.post(`/join-requests/${joinRequestId}/reject`)
export const undoJoinRequest = (joinRequestId) => api.post(`/join-requests/${joinRequestId}/undo`)

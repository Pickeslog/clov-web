import { api } from './client'

// 추억(memory) 도메인 호출. 컴포넌트는 fetch를 직접 쓰지 않고 이 함수들을 통해서만 호출한다.
// 응답은 client.js 인터셉터가 언래핑한 data가 그대로 반환된다(계약 §10 — R1 FREE MEMORY·피드·상세·작성 + R2 댓글).
export const getMemories = (roomId, params = {}) => api.get(`/rooms/${roomId}/memories`, { params })
export const getMemory = (memoryId) => api.get(`/memories/${memoryId}`)
// FREE MEMORY(약속 없이 방 단위) 작성.
export const createMemory = (roomId, payload) => api.post(`/rooms/${roomId}/memories`, payload)
// 약속 연결 추억 작성(계약 §10 — plan memory_status=CANDIDATE/WRITTEN만, NONE→409 PLAN_NOT_COMPLETED, 중복→409 MEMORY_ALREADY_WRITTEN).
export const createPlanMemory = (planId, payload) => api.post(`/plans/${planId}/memories`, payload)
export const updateMemory = (memoryId, payload) => api.patch(`/memories/${memoryId}`, payload)
export const deleteMemory = (memoryId) => api.delete(`/memories/${memoryId}`)
export const getComments = (memoryId) => api.get(`/memories/${memoryId}/comments`)
export const createComment = (memoryId, payload) => api.post(`/memories/${memoryId}/comments`, payload)
// 한 줄 메시지 수정(작성자 본인). 추억당 작성자 1인 1개라 재작성 대신 이걸로 고친다(계약 §10, clov-api #68).
export const updateComment = (commentId, payload) => api.patch(`/comments/${commentId}`, payload)
export const deleteComment = (commentId) => api.delete(`/comments/${commentId}`)
// 이미지(계약 §10 R2): presign → R2 PUT → commit. 삭제.
//
// 순서 재정렬(PATCH /memories/{id}/images/order)은 여기 없다 — 수정 모달이 목업대로
// 그리드+개별 ✕로 바뀌면서 ◀/▶ 순서 이동을 뺐고(#181/#192), 부르는 화면이 없어졌다.
// 서버 엔드포인트는 남아 있으니 순서 UI가 다시 필요해지면 이 줄만 되살리면 된다.
export const presignMemoryImage = (memoryId, payload) => api.post(`/memories/${memoryId}/images/presign`, payload)
export const commitMemoryImage = (memoryId, payload) => api.post(`/memories/${memoryId}/images`, payload)
export const deleteMemoryImage = (imageId) => api.delete(`/memory-images/${imageId}`)

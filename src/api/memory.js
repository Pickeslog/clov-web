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
export const deleteComment = (commentId) => api.delete(`/comments/${commentId}`)
// 이미지(계약 §10 R2): presign → R2 PUT → commit. 삭제·순서 재정렬.
export const presignMemoryImage = (memoryId, payload) => api.post(`/memories/${memoryId}/images/presign`, payload)
export const commitMemoryImage = (memoryId, payload) => api.post(`/memories/${memoryId}/images`, payload)
export const deleteMemoryImage = (imageId) => api.delete(`/memory-images/${imageId}`)
export const reorderMemoryImages = (memoryId, payload) => api.patch(`/memories/${memoryId}/images/order`, payload)

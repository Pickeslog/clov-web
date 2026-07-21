import { api } from './client'

// 추억(memory) 도메인 호출. 컴포넌트는 fetch를 직접 쓰지 않고 이 함수들을 통해서만 호출한다.
// 응답은 client.js 인터셉터가 언래핑한 data가 그대로 반환된다(계약 §10, R1 = FREE MEMORY·피드·상세·작성만).
export const getMemories = (roomId, params = {}) => api.get(`/rooms/${roomId}/memories`, { params })
export const getMemory = (memoryId) => api.get(`/memories/${memoryId}`)
export const createMemory = (roomId, payload) => api.post(`/rooms/${roomId}/memories`, payload)
export const updateMemory = (memoryId, payload) => api.patch(`/memories/${memoryId}`, payload)
export const deleteMemory = (memoryId) => api.delete(`/memories/${memoryId}`)

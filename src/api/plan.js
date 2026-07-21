import { api } from './client'

// 일정계획(plan) 도메인 호출. 컴포넌트는 fetch를 직접 쓰지 않고 이 함수들을 통해서만 호출한다.
// 응답은 client.js 인터셉터가 언래핑한 data가 그대로 반환된다(계약 §8·§9).
// 인생4컷(stage-photos)은 오브젝트 스토리지 셋업(clov-api #38) 후 별도 추가 — 여기선 텍스트 기능만.
export const getPlans = (roomId, params = {}) => api.get(`/rooms/${roomId}/plans`, { params })
export const getPlan = (planId) => api.get(`/plans/${planId}`)
export const createPlan = (roomId, payload) => api.post(`/rooms/${roomId}/plans`, payload)
export const updatePlan = (planId, payload) => api.patch(`/plans/${planId}`, payload)
export const deletePlan = (planId) => api.delete(`/plans/${planId}`)
export const completePlan = (planId) => api.post(`/plans/${planId}/complete`)
export const cancelPlan = (planId) => api.post(`/plans/${planId}/cancel`)
export const skipPlanMemory = (planId) => api.post(`/plans/${planId}/skip-memory`)

export const addChecklist = (planId, payload) => api.post(`/plans/${planId}/checklists`, payload)
export const updateChecklist = (checklistId, payload) => api.patch(`/checklists/${checklistId}`, payload)
export const deleteChecklist = (checklistId) => api.delete(`/checklists/${checklistId}`)

// 인생4컷(stage-photos, 계약 §9): 4단계 인증현황·presign(직전 단계 미완료 시 423 STAGE_LOCKED)·커밋(재업로드 409 STAGE_ALREADY_UPLOADED).
export const getStagePhotos = (planId) => api.get(`/plans/${planId}/stage-photos`)
export const presignStagePhoto = (planId, payload) => api.post(`/plans/${planId}/stage-photos/presign`, payload)
export const commitStagePhoto = (planId, payload) => api.post(`/plans/${planId}/stage-photos`, payload)

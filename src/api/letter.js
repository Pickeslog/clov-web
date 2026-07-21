import { api } from './client'

// 행운편지(letter) 도메인 호출. 컴포넌트는 fetch를 직접 쓰지 않고 이 함수들을 통해서만 호출한다.
// 응답은 client.js 인터셉터가 언래핑한 data가 그대로 반환된다(계약 §11).
export const sendLetter = (roomId, payload) => api.post(`/rooms/${roomId}/letters`, payload)
export const getLetters = (roomId, box) => api.get(`/rooms/${roomId}/letters`, { params: { box } })
export const markRead = (letterId) => api.patch(`/letters/${letterId}/read`)
export const toggleFavorite = (letterId) => api.patch(`/letters/${letterId}/favorite`)

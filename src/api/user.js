import { api } from './client'

// 내 정보/설정(user) 도메인 호출. 컴포넌트는 fetch를 직접 쓰지 않고 이 함수들을 통해서만 호출한다.
// 응답은 client.js 인터셉터가 언래핑한 data가 그대로 반환된다(계약 §5).
export const getMe = () => api.get('/users/me')
export const updateProfile = (payload) => api.patch('/users/me', payload)
export const changePassword = (payload) => api.patch('/users/me/password', payload)
export const deleteAccount = () => api.delete('/users/me')
export const getPreferences = () => api.get('/users/me/preferences')
export const updatePreferences = (payload) => api.patch('/users/me/preferences', payload)

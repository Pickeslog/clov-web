import { api } from './client'

// 인증 도메인 호출. 컴포넌트는 fetch를 직접 쓰지 않고 이 함수들을 통해서만 호출한다.
// 응답은 client.js 인터셉터가 언래핑한 data가 그대로 반환된다(§4-1).
export const signup = (payload) => api.post('/auth/signup', payload)
export const login = (payload) => api.post('/auth/login', payload)
export const logout = (refreshToken) => api.post('/auth/logout', { refreshToken })
export const exchangeOAuthCode = (code) => api.post('/auth/oauth/exchange', { code })
export const submitOAuthConsent = (registrationToken, agreements) =>
  api.post('/auth/oauth/consent', { registrationToken, agreements })

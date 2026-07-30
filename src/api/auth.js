import { api } from './client'

// 인증 도메인 호출. 컴포넌트는 fetch를 직접 쓰지 않고 이 함수들을 통해서만 호출한다.
// 응답은 client.js 인터셉터가 언래핑한 data가 그대로 반환된다(§4-1).
export const signup = (payload) => api.post('/auth/signup', payload)
export const login = (payload) => api.post('/auth/login', payload)
export const logout = (refreshToken) => api.post('/auth/logout', { refreshToken })
export const exchangeOAuthCode = (code) => api.post('/auth/oauth/exchange', { code })
export const submitOAuthConsent = (registrationToken, agreements) =>
  api.post('/auth/oauth/consent', { registrationToken, agreements })

// 비밀번호 재설정(§4-4).
// forgot은 계정 유무·소셜 전용 여부와 무관하게 항상 200이다 — 호출부에서 성공/실패로 갈라
// 계정 존재 여부를 드러내지 말 것.
export const forgotPassword = (email) => api.post('/auth/password/forgot', { email })
// 재설정 토큰은 메일 링크로만 오므로 쿼리스트링이 유일한 전달 수단이다. 액세스·리프레시
// 토큰 금지 규칙(§4-2)의 계약상 예외이며, 단수명·1회용·권한이 재설정 하나뿐이라 상쇄된다.
export const verifyPasswordResetToken = (token) => api.get('/auth/password/reset', { params: { token } })
export const resetPassword = ({ token, newPassword }) =>
  api.post('/auth/password/reset', { token, newPassword })

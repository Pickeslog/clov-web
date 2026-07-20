import axios from 'axios'
import { useAuthStore } from '../stores/authStore'

// baseURL은 환경변수 우선, 없으면 개발 기본값(백엔드 8080). 시크릿 아님.
const baseURL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api/v1'

export const api = axios.create({ baseURL })

// 소셜 로그인 시작 URL — 백엔드 루트(/oauth2/...)라 /api/v1 base가 아니다.
const apiOrigin = baseURL.replace(/\/api\/v1\/?$/, '')
export const oauthAuthorizeUrl = (provider) => `${apiOrigin}/oauth2/authorization/${provider}`

// refresh 전용 인스턴스 — 인터셉터 없음(재귀 방지).
const refreshClient = axios.create({ baseURL })

// 요청마다 Authorization 주입.
api.interceptors.request.use((config) => {
  const { accessToken } = useAuthStore.getState()
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }
  return config
})

// 응답 봉투 언래핑을 이 한 곳에서만 한다: {success,data} → data / {success,error} → throw.
// 401이면 refresh로 한 번 재시도한다.
api.interceptors.response.use(
  (response) => unwrap(response.data),
  async (error) => {
    const { config, response } = error

    if (response?.status === 401 && config && !config.__isRetry) {
      const { refreshToken, setTokens, clear } = useAuthStore.getState()
      if (refreshToken) {
        try {
          const refreshed = await refreshClient.post('/auth/refresh', { refreshToken })
          setTokens(refreshed.data.data)
          config.__isRetry = true
          return api(config)
        } catch {
          clear()
        }
      } else {
        clear()
      }
    }

    return Promise.reject(normalizeError(error))
  },
)

// 성공 봉투에서 data만 꺼낸다. 봉투가 아니면 그대로 반환.
function unwrap(body) {
  if (body && typeof body === 'object' && 'success' in body) {
    if (body.success) {
      return body.data
    }
    throw normalizeError({ response: { data: body } })
  }
  return body
}

// 계약 error.code/message를 Error에 실어 상위에서 code로 분기할 수 있게 한다.
function normalizeError(error) {
  const apiError = error?.response?.data?.error
  if (apiError) {
    const normalized = new Error(apiError.message ?? '요청을 처리하지 못했습니다.')
    normalized.code = apiError.code
    normalized.details = apiError.details ?? null
    return normalized
  }
  return error instanceof Error ? error : new Error('네트워크 오류가 발생했습니다.')
}

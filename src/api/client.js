import axios from 'axios'
import { useAuthStore } from '../stores/authStore'

// baseURL은 환경변수 우선, 없으면 개발 기본값(백엔드 8080). 시크릿 아님.
const baseURL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api/v1'

export const api = axios.create({ baseURL })

// 소셜 로그인 시작 URL — 백엔드 루트(/oauth2/...)라 /api/v1 base가 아니다.
// 운영 빌드는 nginx가 프론트·백엔드를 같은 도메인에서 서빙하므로 상대경로면 충분하다 —
// VITE_API_BASE_URL(clovlabcalss.store 등 팀 공용 값)에서 오리진을 뽑아 쓰면, 지금 어느
// 도메인에 있든(clovlov.xyz 등) 로그인 시작과 동시에 그 팀 공용 도메인으로 튕겨나간다(#390).
// dev는 프론트(5173)·백엔드(8080)가 실제로 다른 오리진이라 절대경로가 필요하다.
const apiOrigin = import.meta.env.DEV ? baseURL.replace(/\/api\/v1\/?$/, '') : ''
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

// 진행 중인 갱신 요청. 401이 동시에 여러 개 나도 /auth/refresh는 한 번만 부른다.
//
// 서버(AuthService.refresh)는 리프레시 토큰을 1회용으로 회수한다. 그래서 401 난 요청들이
// 각자 갱신을 부르면 하나만 200이고 나머지는 401 TOKEN_EXPIRED로 떨어지는데, 그 실패가
// catch의 clear()를 돌려 방금 성공한 갱신이 저장한 토큰까지 지워버린다 → 로그아웃.
// 대시보드는 진입 시 쿼리를 7개 쏘므로 만료 상태로 들어가면 매번 이 상황이 된다(#158).
let refreshInFlight = null

function refreshAccessToken(refreshToken) {
  refreshInFlight ??= refreshClient
    .post('/auth/refresh', { refreshToken })
    .then((refreshed) => {
      // remember를 넘기지 않아야 authStore가 현재 "로그인 유지" 선택을 그대로 이어간다(#144).
      useAuthStore.getState().setTokens(refreshed.data.data)
    })
    .finally(() => {
      refreshInFlight = null
    })
  return refreshInFlight
}

// 응답 봉투 언래핑을 이 한 곳에서만 한다: {success,data} → data / {success,error} → throw.
// 401이면 refresh로 한 번 재시도한다.
api.interceptors.response.use(
  (response) => unwrap(response.data),
  async (error) => {
    const { config, response } = error

    if (response?.status === 401 && config && !config.__isRetry) {
      const { refreshToken, clear } = useAuthStore.getState()
      if (refreshToken) {
        try {
          await refreshAccessToken(refreshToken)
          // 재시도는 요청 인터셉터를 다시 타므로 새 액세스 토큰이 자동으로 실린다.
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

// 성공 봉투에서 data만 꺼낸다.
//
// 봉투가 아니면 그대로 반환하지 않고 던진다(#209). 이 인스턴스를 지나는 응답은 계약상
// 전부 봉투다 — 컨트롤러는 모두 ApiResponse를 반환하고(DELETE 10개도 200 + success(null)),
// 예외는 GlobalExceptionHandler가 봉투로 감싸며, R2 PUT은 lib/uploadImage.js가 순수
// fetch로 우회한다. 그래서 봉투가 아닌 200은 서버가 아니라 앞단이 답한 것이다.
// nginx가 /api/* 에 index.html을 돌려주는 경우가 대표적이다.
//
// 그대로 통과시키면 TanStack Query가 그 HTML 문자열을 정상 데이터로 캐시하고, 화면은
// 한참 뒤 .map이나 .balance에서 죽는다. 네트워크 탭은 전부 200 초록인데 화면만 깨져
// 원인까지 매번 되짚어야 한다. 실패 지점을 원인 지점으로 끌어온다.
function unwrap(body) {
  if (body && typeof body === 'object' && 'success' in body) {
    if (body.success) {
      return body.data
    }
    throw normalizeError({ response: { data: body } })
  }
  throw new Error('서버 응답 형식이 올바르지 않습니다. 잠시 후 다시 시도해 주세요.')
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

  // 여기부터는 계약 봉투가 아니다. 예전에는 axios 오류를 그대로 돌려줬는데(AxiosError도
  // Error의 인스턴스라 삼항의 앞쪽으로 빠졌다), 화면들이 error.message를 그대로 렌더하므로
  // 사용자에게 "Network Error"·"Request failed with status code 502" 같은 영어 원문이
  // 그대로 나갔다(#212). 준비해 둔 한국어 문구는 사실상 도달하지 않는 코드였다.
  //
  // 원본은 cause에 남긴다 — 콘솔에서 원래 원인을 볼 수 있어야 한다.
  const message = error?.response
    ? '요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.' // 응답은 왔는데 봉투가 아니다(프록시 5xx 등)
    : '서버에 연결하지 못했습니다. 네트워크 상태를 확인해 주세요.' // 응답 자체가 없다(연결 실패·CORS 차단)
  return new Error(message, { cause: error })
}

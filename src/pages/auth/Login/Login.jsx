import { useLayoutEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import './login.proto.css'
import { login } from '../../../api/auth'
import { oauthAuthorizeUrl } from '../../../api/client'
import { useAuthStore } from '../../../stores/authStore'
import { takeReturnTo } from '../../../lib/returnUrl'
import SuccessOverlay from '../../../components/SuccessOverlay/SuccessOverlay'
import logo from '../../../assets/clov_logo.png'

const EMAIL_RE = /\S+@\S+\.\S+/

const SOCIALS = [
  { provider: 'kakao', label: '카카오 로그인' },
  { provider: 'naver', label: '네이버 로그인' },
  { provider: 'google', label: '구글 로그인' },
]

export default function Login() {
  const navigate = useNavigate()
  const setTokens = useAuthStore((state) => state.setTokens)

  // 이미 로그인된 상태로 /login에 들어온 경우 즉시 돌려보낸다(login.md §2).
  // "마운트 시점에 이미 로그인이었나"만 본다 — 로그인 성공으로 토큰이 막 생기는 경우는
  // handleLogin이 이미 navigate(takeReturnTo())로 처리하므로 여기서 또 반응하면 안 된다.
  // accessToken을 의존성/구독에 넣으면 로그인 성공 직후 이 effect가 다시 돌아
  // takeReturnTo()가 두 번 불려 두 번째는 값을 잃고 '/'로 덮어쓴다(리뷰에서 실측된 회귀).
  const wasLoggedInOnMount = useRef(Boolean(useAuthStore.getState().accessToken))
  const redirectedRef = useRef(false)
  // useEffect는 페인트 뒤에 돌아 폼이 한 번 그려졌다 사라질 수 있어 useLayoutEffect 사용.
  useLayoutEffect(() => {
    if (!wasLoggedInOnMount.current || redirectedRef.current) return
    redirectedRef.current = true
    navigate(takeReturnTo(), { replace: true })
  }, [navigate])

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [message, setMessage] = useState('')
  const [shake, setShake] = useState({ email: false, password: false })
  const [submitting, setSubmitting] = useState(false)
  const [remember, setRemember] = useState(true)
  // null이면 오버레이 없음. 로그인 성공 시에만 채워진다(#152).
  const [successOverlay, setSuccessOverlay] = useState(null)

  const handleLogin = async () => {
    setMessage('')
    if (!EMAIL_RE.test(email.trim())) {
      setShake((prev) => ({ ...prev, email: true }))
      return
    }
    if (!password) {
      setShake((prev) => ({ ...prev, password: true }))
      return
    }

    setSubmitting(true)
    try {
      const data = await login({ email: email.trim(), password })
      setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken }, { remember })
      // takeReturnTo()는 소비형이라 오버레이 시작 전에 부르면 안 된다 — 오버레이가 도는 동안
      // 새로고침/탭 종료 시 returnTo가 이미 사라진 채 홈으로 떨어진다. 오버레이 완료 콜백에서 부른다.
      setSuccessOverlay({ nickname: data.user?.nickname })
    } catch (error) {
      setMessage(
        error.code === 'INVALID_CREDENTIALS'
          ? '이메일 또는 비밀번호가 올바르지 않습니다.'
          : (error.message ?? '로그인에 실패했습니다.'),
      )
    } finally {
      setSubmitting(false)
    }
  }

  const handleEnter = (event, submit) => {
    if (event.key !== 'Enter') return
    event.preventDefault()
    submit()
  }

  const startSocialLogin = (provider) => {
    window.location.assign(oauthAuthorizeUrl(provider))
  }

  if (successOverlay) {
    return (
      <SuccessOverlay
        nickname={successOverlay.nickname}
        durationMs={1600}
        onDone={() => navigate(takeReturnTo(), { replace: true })}
      />
    )
  }

  return (
    <main className="proto-login">
      <div className="login-shell">
        <section className="login-memory-panel" aria-label="Clov 소개">
          <div className="login-brand">
            <div className="login-brand-mark">
              <img src={logo} alt="Clov 로고" />
            </div>
            <span>Clov.</span>
          </div>
          <div className="login-panel-copy">
            <div className="login-panel-badge">우정이 자라는 공간, Clov!</div>
            <h1 className="login-panel-title">
              친구와 기록한
              <br />
              순간으로 떠나는 여행
            </h1>
            <p className="login-panel-text">
              약속, 기록, 편지를 한 곳에서
              <br />
              다시 열어보고 우정을 이어갈 수 있어요.
            </p>
            <div className="login-memory-stack" aria-hidden="true">
              <div className="login-memory-note">
                <div className="login-note-date">나</div>
                <div className="login-note-text">우리 사진 찍은거 언제 올려??</div>
              </div>
              <div className="login-memory-note">
                <div className="login-note-date">정우</div>
                <div className="login-note-text">Clov.에 올려둘게!</div>
              </div>
            </div>
          </div>
        </section>

        <section className="login-form-panel">
          <div className="login-form-box">
            <div className="login-form-kicker">Welcome Back</div>
            <h2 className="login-form-title">로그인</h2>
            <p className="login-form-desc">이메일과 비밀번호로 Clov.에 다시 입장해 주세요.</p>

            <div className="login-input-group">
              <label className="login-input-label" htmlFor="email">이메일</label>
              <div className="login-input-wrap">
                <span className="input-icon">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="5" width="18" height="14" rx="2" />
                    <path d="m3 7 9 6 9-6" />
                  </svg>
                </span>
                <input
                  id="email"
                  type="email"
                  className={`login-input${shake.email ? ' is-shake' : ''}`}
                  value={email}
                  placeholder="사용자님의 이메일을 입력해주세요."
                  autoComplete="email"
                  onChange={(event) => setEmail(event.target.value)}
                  onKeyDown={(event) => handleEnter(event, () => document.getElementById('password')?.focus())}
                  onAnimationEnd={() => setShake((prev) => ({ ...prev, email: false }))}
                />
              </div>
            </div>

            <div className="login-input-group">
              <div className="login-input-label-row">
                <label className="login-input-label" htmlFor="password">비밀번호</label>
                <span className={`login-input-status${showPassword ? ' is-show' : ''}`}>조심하세요! 비밀번호가 보여요!</span>
              </div>
              <div className="login-input-wrap">
                <span className="input-icon">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="4" y="11" width="16" height="10" rx="2" />
                    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                  </svg>
                </span>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className={`login-input${shake.password ? ' is-shake' : ''}`}
                  value={password}
                  placeholder="비밀번호를 입력해주세요"
                  autoComplete="current-password"
                  onChange={(event) => setPassword(event.target.value)}
                  onKeyDown={(event) => handleEnter(event, handleLogin)}
                  onAnimationEnd={() => setShake((prev) => ({ ...prev, password: false }))}
                />
                <button
                  type="button"
                  className="login-input-suffix"
                  aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 보이기'}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((prev) => !prev)}
                >
                  {showPassword ? (
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M3 3l18 18" />
                      <path d="M10.6 10.6A2 2 0 0 0 13.4 13.4" />
                      <path d="M9.9 5.2A10.7 10.7 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.1 4.1" />
                      <path d="M6.6 6.7C3.6 8.7 2 12 2 12s3.5 7 10 7a9.8 9.8 0 0 0 4.2-.9" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="login-form-options">
              <label className="login-remember">
                <input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} />
                <span>로그인 유지</span>
              </label>
              <button
                type="button"
                className="login-sublink"
                onClick={() => setMessage('비밀번호 찾기는 추후 연결될 예정입니다.')}
              >
                비밀번호 찾기
              </button>
            </div>

            <button type="button" className="login-btn-primary" onClick={handleLogin} disabled={submitting}>
              {submitting ? '입장 중…' : 'Clov. 입장하기'}
            </button>
            <div className={`login-message${message ? ' is-show' : ''}`} role="alert">
              {message}
            </div>

            <div className="login-divider">간편 로그인</div>
            <div className="login-social-row">
              {SOCIALS.map(({ provider, label }) => (
                <button
                  key={provider}
                  type="button"
                  className="login-social-btn"
                  data-label={label}
                  aria-label={`${label} (OAuth2)`}
                  onClick={() => startSocialLogin(provider)}
                >
                  <span className={`social-logo provider-${provider}`} aria-hidden="true">
                    {provider === 'kakao' && (
                      <svg viewBox="0 0 32 32" role="img">
                        <path d="M16 7.2c-5.55 0-10.05 3.55-10.05 7.93 0 2.83 1.9 5.32 4.75 6.72l-.86 3.15c-.08.3.26.54.52.37l3.77-2.49c.6.09 1.22.14 1.87.14 5.55 0 10.05-3.55 10.05-7.93S21.55 7.2 16 7.2Z" fill="#191919" />
                      </svg>
                    )}
                    {provider === 'naver' && (
                      <svg viewBox="0 0 32 32" role="img">
                        <path d="M18.5 16.4 13.25 8.8H8.8v14.4h4.7v-7.6l5.25 7.6h4.45V8.8h-4.7v7.6Z" fill="#fff" />
                      </svg>
                    )}
                    {provider === 'google' && (
                      <svg viewBox="0 0 32 32" role="img">
                        <path d="M28.1 16.32c0-.86-.08-1.68-.22-2.48H16.3v4.69h6.63a5.66 5.66 0 0 1-2.46 3.72v3.04h3.98c2.33-2.15 3.65-5.31 3.65-8.97Z" fill="#4285f4" />
                        <path d="M16.3 28.2c3.33 0 6.12-1.1 8.15-2.91l-3.98-3.04c-1.1.74-2.52 1.18-4.17 1.18-3.2 0-5.92-2.16-6.89-5.07H5.3v3.14a12.28 12.28 0 0 0 11 6.7Z" fill="#34a853" />
                        <path d="M9.41 18.36a7.36 7.36 0 0 1 0-4.72V10.5H5.3a12.32 12.32 0 0 0 0 11l4.11-3.14Z" fill="#fbbc05" />
                        <path d="M16.3 8.57c1.81 0 3.44.62 4.72 1.85l3.52-3.52A11.98 11.98 0 0 0 16.3 3.8a12.28 12.28 0 0 0-11 6.7l4.11 3.14c.97-2.91 3.69-5.07 6.89-5.07Z" fill="#ea4335" />
                      </svg>
                    )}
                  </span>
                </button>
              ))}
            </div>

            <div className="login-signup-link">
              아직 계정이 없으신가요? <Link to="/signup">회원가입</Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}

import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import * as S from './Login.style'
import { login } from '../../../api/auth'
import { oauthAuthorizeUrl } from '../../../api/client'
import { useAuthStore } from '../../../stores/authStore'
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

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [message, setMessage] = useState('')
  const [shake, setShake] = useState({ email: false, password: false })
  const [submitting, setSubmitting] = useState(false)

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
      setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken })
      navigate('/', { replace: true })
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

  return (
    <S.Page>
      <S.Shell>
        <S.MemoryPanel aria-label="Clov 소개">
          <S.Brand>
            <S.BrandMark>
              <img src={logo} alt="Clov 로고" />
            </S.BrandMark>
            <span>Clov.</span>
          </S.Brand>
          <S.PanelCopy>
            <S.PanelBadge>우정이 자라는 공간, Clov!</S.PanelBadge>
            <S.PanelTitle>
              친구와 기록한
              <br />
              순간으로 떠나는 여행
            </S.PanelTitle>
            <S.PanelText>
              약속, 기록, 편지를 한 곳에서
              <br />
              다시 열어보고 우정을 이어갈 수 있어요.
            </S.PanelText>
            <S.MemoryStack aria-hidden="true">
              <S.MemoryNote>
                <S.NoteDate>나</S.NoteDate>
                <S.NoteText>우리 사진 찍은거 언제 올려??</S.NoteText>
              </S.MemoryNote>
              <S.MemoryNote>
                <S.NoteDate>정우</S.NoteDate>
                <S.NoteText>Clov.에 올려둘게!</S.NoteText>
              </S.MemoryNote>
            </S.MemoryStack>
          </S.PanelCopy>
        </S.MemoryPanel>

        <S.FormPanel>
          <S.FormBox>
            <S.FormKicker>Welcome Back</S.FormKicker>
            <S.FormTitle>로그인</S.FormTitle>
            <S.FormDesc>이메일과 비밀번호로 Clov.에 다시 입장해 주세요.</S.FormDesc>

            <S.InputGroup>
              <S.InputLabel htmlFor="email">이메일</S.InputLabel>
              <S.InputWrap>
                <S.InputIcon className="input-icon">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="5" width="18" height="14" rx="2" />
                    <path d="m3 7 9 6 9-6" />
                  </svg>
                </S.InputIcon>
                <S.Input
                  id="email"
                  type="email"
                  value={email}
                  placeholder="사용자님의 이메일을 입력해주세요."
                  autoComplete="email"
                  $shake={shake.email}
                  onChange={(event) => setEmail(event.target.value)}
                  onKeyDown={(event) => handleEnter(event, () => document.getElementById('password')?.focus())}
                  onAnimationEnd={() => setShake((prev) => ({ ...prev, email: false }))}
                />
              </S.InputWrap>
            </S.InputGroup>

            <S.InputGroup>
              <S.InputLabelRow>
                <S.InputLabel htmlFor="password">비밀번호</S.InputLabel>
                <S.InputStatus $show={showPassword}>조심하세요! 비밀번호가 보여요!</S.InputStatus>
              </S.InputLabelRow>
              <S.InputWrap>
                <S.InputIcon className="input-icon">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="4" y="11" width="16" height="10" rx="2" />
                    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                  </svg>
                </S.InputIcon>
                <S.Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  placeholder="비밀번호를 입력해주세요"
                  autoComplete="current-password"
                  $shake={shake.password}
                  onChange={(event) => setPassword(event.target.value)}
                  onKeyDown={(event) => handleEnter(event, handleLogin)}
                  onAnimationEnd={() => setShake((prev) => ({ ...prev, password: false }))}
                />
                <S.InputSuffix
                  type="button"
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
                </S.InputSuffix>
              </S.InputWrap>
            </S.InputGroup>

            <S.FormOptions>
              <S.Remember>
                <input type="checkbox" defaultChecked />
                <span>로그인 유지</span>
              </S.Remember>
              <S.SubLink
                type="button"
                onClick={() => setMessage('비밀번호 찾기는 추후 연결될 예정입니다.')}
              >
                비밀번호 찾기
              </S.SubLink>
            </S.FormOptions>

            <S.BtnPrimary type="button" onClick={handleLogin} disabled={submitting}>
              {submitting ? '입장 중…' : 'Clov. 입장하기'}
            </S.BtnPrimary>
            <S.Message $show={Boolean(message)} role="alert">
              {message}
            </S.Message>

            <S.Divider>간편 로그인</S.Divider>
            <S.SocialRow>
              {SOCIALS.map(({ provider, label }) => (
                <S.SocialBtn
                  key={provider}
                  type="button"
                  data-label={label}
                  aria-label={`${label} (OAuth2)`}
                  onClick={() => startSocialLogin(provider)}
                >
                  <S.SocialLogo className="social-logo" $provider={provider} aria-hidden="true">
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
                  </S.SocialLogo>
                </S.SocialBtn>
              ))}
            </S.SocialRow>

            <S.SignupLink>
              아직 계정이 없으신가요? <Link to="/signup">회원가입</Link>
            </S.SignupLink>
          </S.FormBox>
        </S.FormPanel>
      </S.Shell>
    </S.Page>
  )
}

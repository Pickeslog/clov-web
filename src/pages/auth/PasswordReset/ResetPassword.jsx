import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import PasswordResetShell from './PasswordResetShell'
import { resetPassword, verifyPasswordResetToken } from '../../../api/auth'
import { useAuthStore } from '../../../stores/authStore'

/** Signup과 같은 규칙(계약 §4-1: 8~20자, 영문·숫자·특수문자 중 2종 이상). */
function passwordChecks(value) {
  const typeCount = [/[A-Za-z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((re) => re.test(value)).length
  const lengthOk = value.length >= 8 && value.length <= 20
  return { lengthOk, comboOk: typeCount >= 2, ok: lengthOk && typeCount >= 2 }
}

/**
 * 비밀번호 재설정 — 메일 링크로 진입한다(계약 §4-4).
 *
 * <p>진입 즉시 토큰을 검증한다. 이게 없으면 사용자가 새 비밀번호를 두 번 입력하고 제출한
 * <b>뒤에야</b> "만료된 링크"를 알게 된다.
 *
 * <p>로그인 가드는 일부러 붙이지 않았다 — 로그인한 채로 메일 링크를 열 수 있고, 재설정에
 * 성공하면 서버가 refresh를 전부 revoke하므로 어차피 세션이 끊긴다. 대신 성공 시 로컬
 * 토큰도 지워 "반쯤 로그인된" 상태를 남기지 않는다.
 */
export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [shake, setShake] = useState({ password: false, confirm: false })
  const [done, setDone] = useState(false)
  // 제출 단계에서 토큰이 죽은 것으로 판명된 경우(검증 이후 만료·타 기기에서 사용).
  const [tokenDead, setTokenDead] = useState(false)

  const verification = useQuery({
    queryKey: ['passwordResetToken', token],
    queryFn: () => verifyPasswordResetToken(token),
    enabled: Boolean(token),
    retry: false,
    staleTime: Infinity,
  })

  const checks = passwordChecks(password)
  const linkBroken = !token || verification.isError || tokenDead

  const handleSubmit = async () => {
    setMessage('')
    if (!checks.ok) {
      setShake((prev) => ({ ...prev, password: true }))
      return
    }
    if (password !== confirm) {
      setShake((prev) => ({ ...prev, confirm: true }))
      setMessage('비밀번호가 서로 다릅니다.')
      return
    }

    setSubmitting(true)
    try {
      await resetPassword({ token, newPassword: password })
      // 서버가 이 계정의 refresh를 전부 revoke했다. 로컬에 남은 토큰도 함께 정리한다.
      useAuthStore.getState().clear()
      setDone(true)
    } catch (error) {
      if (error.code === 'PASSWORD_RESET_TOKEN_INVALID') {
        setTokenDead(true)
        return
      }
      setMessage(error.message ?? '비밀번호 변경에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <PasswordResetShell
      badge="새 비밀번호 만들기"
      title={<>다시 열쇠를<br />만들어 볼까요</>}
      text={<>새 비밀번호를 정하면<br />모든 기기에서 다시 로그인해야 해요.</>}
    >
      <div className="login-form-kicker">Reset Password</div>
      <h2 className="login-form-title">비밀번호 재설정</h2>

      {done ? (
        <>
          <p className="login-form-desc">이제 새 비밀번호로 입장하실 수 있어요.</p>
          <div className="pwreset-notice">
            <div className="pwreset-notice-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </div>
            <p className="pwreset-notice-title">비밀번호가 변경되었습니다</p>
            <p className="pwreset-notice-text">
              보안을 위해 <strong>기존에 로그인된 모든 기기</strong>에서 로그아웃되었습니다. 새 비밀번호로 다시 로그인해 주세요.
            </p>
          </div>
          <Link to="/login" className="login-btn-primary" style={{ display: 'grid', placeItems: 'center', marginTop: 18, textDecoration: 'none' }}>
            로그인하러 가기
          </Link>
        </>
      ) : linkBroken ? (
        <>
          <p className="login-form-desc">링크를 다시 받아야 합니다.</p>
          <div className="pwreset-notice">
            <div className="pwreset-notice-icon is-warn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 8v5" />
                <path d="M12 16h.01" />
              </svg>
            </div>
            <p className="pwreset-notice-title">사용할 수 없는 링크예요</p>
            <p className="pwreset-notice-text">
              만료되었거나 이미 사용된 링크입니다. 재설정 링크는 <strong>1시간</strong> 동안, <strong>한 번만</strong> 쓸 수 있어요.
              아래에서 다시 요청해 주세요.
            </p>
          </div>
          <Link to="/forgot-password" className="login-btn-primary" style={{ display: 'grid', placeItems: 'center', marginTop: 18, textDecoration: 'none' }}>
            재설정 링크 다시 받기
          </Link>
        </>
      ) : verification.isPending ? (
        <div className="pwreset-checking" role="status">링크를 확인하고 있어요…</div>
      ) : (
        <>
          <p className="login-form-desc">새로 사용할 비밀번호를 입력해 주세요.</p>

          <div className="login-input-group">
            <div className="login-input-label-row">
              <label className="login-input-label" htmlFor="reset-password">새 비밀번호</label>
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
                id="reset-password"
                type={showPassword ? 'text' : 'password'}
                className={`login-input${shake.password ? ' is-shake' : ''}`}
                value={password}
                placeholder="8~20자, 영문/숫자/특수문자 중 2가지 이상"
                autoComplete="new-password"
                onChange={(event) => setPassword(event.target.value)}
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
            <div className="pwreset-rules" aria-hidden="true">
              <span className={`pwreset-rule${checks.lengthOk ? ' is-met' : ''}`}>8~20자</span>
              <span className={`pwreset-rule${checks.comboOk ? ' is-met' : ''}`}>영문·숫자·특수문자 중 2종 이상</span>
            </div>
          </div>

          <div className="login-input-group">
            <label className="login-input-label" htmlFor="reset-confirm">비밀번호 확인</label>
            <div className="login-input-wrap">
              <span className="input-icon">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="4" y="11" width="16" height="10" rx="2" />
                  <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                </svg>
              </span>
              <input
                id="reset-confirm"
                type={showPassword ? 'text' : 'password'}
                className={`login-input${shake.confirm ? ' is-shake' : ''}`}
                value={confirm}
                placeholder="한 번 더 입력해주세요"
                autoComplete="new-password"
                onChange={(event) => setConfirm(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key !== 'Enter') return
                  event.preventDefault()
                  handleSubmit()
                }}
                onAnimationEnd={() => setShake((prev) => ({ ...prev, confirm: false }))}
              />
            </div>
          </div>

          <button type="button" className="login-btn-primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? '변경 중…' : '비밀번호 변경하기'}
          </button>
          <div className={`login-message${message ? ' is-show' : ''}`} role="alert">
            {message}
          </div>
        </>
      )}
    </PasswordResetShell>
  )
}

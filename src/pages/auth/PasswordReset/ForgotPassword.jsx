import { useState } from 'react'
import { Link } from 'react-router-dom'
import PasswordResetShell from './PasswordResetShell'
import { forgotPassword } from '../../../api/auth'

const EMAIL_RE = /\S+@\S+\.\S+/

/**
 * 비밀번호 찾기 — 이메일을 받아 재설정 링크 발송을 요청한다(계약 §4-4).
 *
 * ⚠️ 계정이 있든 없든, 소셜 전용이든 <b>화면에 같은 안내</b>를 띄운다. 서버가 세 경우에
 * 똑같이 200을 주는 이유가 계정 열거 방지인데, 프론트에서 "가입되지 않은 이메일입니다"처럼
 * 갈라 보여주면 그 방어가 그대로 무너진다.
 */
export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)
  const [message, setMessage] = useState('')
  const [shake, setShake] = useState(false)

  const handleSubmit = async () => {
    setMessage('')
    if (!EMAIL_RE.test(email.trim())) {
      setShake(true)
      return
    }

    setSubmitting(true)
    try {
      await forgotPassword(email.trim())
      setSent(true)
    } catch (error) {
      // 여기 오는 것은 계정 유무와 무관한 실패뿐이다(속도 제한·검증·네트워크).
      setMessage(
        error.code === 'RATE_LIMITED'
          ? '요청이 너무 잦습니다. 잠시 후 다시 시도해 주세요.'
          : (error.message ?? '요청에 실패했습니다. 잠시 후 다시 시도해 주세요.'),
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <PasswordResetShell
      badge="비밀번호를 잊으셨나요?"
      title={<>메일로 다시<br />열쇠를 보내드려요</>}
      text={<>가입하신 이메일을 입력하시면<br />재설정 링크를 보내드립니다.</>}
    >
      <div className="login-form-kicker">Forgot Password</div>
      <h2 className="login-form-title">비밀번호 찾기</h2>

      {sent ? (
        <>
          <p className="login-form-desc">메일이 발송되었습니다.</p>
          <div className="pwreset-notice">
            <div className="pwreset-notice-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <path d="m3 7 9 6 9-6" />
              </svg>
            </div>
            <p className="pwreset-notice-title">재설정 링크를 보냈어요</p>
            <p className="pwreset-notice-text">
              입력하신 주소로 재설정 링크를 보냈습니다. 메일이 보이지 않으면 <strong>스팸함</strong>도 확인해 주세요.
              링크는 <strong>1시간</strong> 동안, <strong>한 번만</strong> 사용할 수 있습니다.
            </p>
            <div className="pwreset-notice-actions">
              <button
                type="button"
                className="login-sublink"
                onClick={() => {
                  setSent(false)
                  setMessage('')
                }}
              >
                다른 이메일로 다시 요청하기
              </button>
            </div>
          </div>
        </>
      ) : (
        <>
          <p className="login-form-desc">가입하실 때 사용한 이메일을 입력해 주세요.</p>

          <div className="login-input-group">
            <label className="login-input-label" htmlFor="forgot-email">이메일</label>
            <div className="login-input-wrap">
              <span className="input-icon">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="5" width="18" height="14" rx="2" />
                  <path d="m3 7 9 6 9-6" />
                </svg>
              </span>
              <input
                id="forgot-email"
                type="email"
                className={`login-input${shake ? ' is-shake' : ''}`}
                value={email}
                placeholder="사용자님의 이메일을 입력해주세요."
                autoComplete="email"
                onChange={(event) => setEmail(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key !== 'Enter') return
                  event.preventDefault()
                  handleSubmit()
                }}
                onAnimationEnd={() => setShake(false)}
              />
            </div>
          </div>

          <button type="button" className="login-btn-primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? '보내는 중…' : '재설정 링크 받기'}
          </button>
          <div className={`login-message${message ? ' is-show' : ''}`} role="alert">
            {message}
          </div>
        </>
      )}

      <div className="login-signup-link">
        비밀번호가 기억나셨나요? <Link to="/login">로그인</Link>
      </div>
    </PasswordResetShell>
  )
}

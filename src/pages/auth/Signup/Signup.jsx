import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import './signup.proto.css'
import { SERVICE_TERMS, PRIVACY_TERMS } from './termsContent'
import { signup } from '../../../api/auth'
import { oauthAuthorizeUrl } from '../../../api/client'
import { useAuthStore } from '../../../stores/authStore'
import { takeReturnTo } from '../../../lib/returnUrl'
import logo from '../../../assets/clov_logo.png'

const EMAIL_RE = /\S+@\S+\.\S+/
const NICKNAME_RE = /^[가-힣A-Za-z0-9]{1,12}$/
const STEP_COUNT = 4

const SOCIALS = [
  { provider: 'kakao', label: '카카오 회원가입' },
  { provider: 'naver', label: '네이버 회원가입' },
  { provider: 'google', label: '구글 회원가입' },
]

function passwordChecks(value) {
  const hasLetter = /[A-Za-z]/.test(value)
  const hasNumber = /[0-9]/.test(value)
  const hasSpecial = /[^A-Za-z0-9]/.test(value)
  const typeCount = [hasLetter, hasNumber, hasSpecial].filter(Boolean).length
  const lengthOk = value.length >= 8 && value.length <= 20
  return { lengthOk, comboOk: typeCount >= 2, ok: lengthOk && typeCount >= 2 }
}

function passwordStrength(value) {
  const { comboOk } = passwordChecks(value)
  let score = 0
  if (value.length >= 8) score++
  if (comboOk) score++
  if (value.length >= 12) score++
  if (/[^A-Za-z0-9]/.test(value) && comboOk) score++
  const level = score <= 1 ? 'weak' : score <= 2 ? 'mid' : 'strong'
  return { score, level }
}

const pad2 = (n) => String(n).padStart(2, '0')

export default function Signup() {
  const navigate = useNavigate()
  const setTokens = useAuthStore((state) => state.setTokens)

  const [step, setStep] = useState(0)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [agreements, setAgreements] = useState({ service: false, privacy: false, marketing: false })
  const [openPanel, setOpenPanel] = useState(null)
  const [nickname, setNickname] = useState('')
  const [birthdate, setBirthdate] = useState('')
  const [birthModalOpen, setBirthModalOpen] = useState(false)
  const [nudgeOpen, setNudgeOpen] = useState(false)
  const [shake, setShake] = useState({ email: false, password: false, nickname: false })
  const [termsShake, setTermsShake] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')

  const checks = passwordChecks(password)
  const { score, level } = passwordStrength(password)
  const allAgreed = agreements.service && agreements.privacy && agreements.marketing
  const years = useMemo(() => {
    const now = new Date().getFullYear()
    return Array.from({ length: now - 1899 }, (_, i) => now - i)
  }, [])

  const clearShake = (field) => setShake((prev) => ({ ...prev, [field]: false }))

  // $shake는 클래스명 하나로 켜고 끈다. 이미 true인 상태에서 다시 true를 set하면
  // 값이 안 바뀌어(true → true) 클래스도 안 바뀌고, 브라우저는 진행 중인 애니메이션을 그대로
  // 이어갈 뿐 재시작하지 않는다(0.4s 안에 연속 실패 시 두 번째 shake가 무시됨, #262).
  // false로 먼저 커밋해 애니메이션을 실제로 제거한 뒤 다음 프레임에 true로 다시 커밋해
  // 재생을 강제한다. 단일 rAF는 "false 커밋"과 "다음 프레임"이 브라우저 스타일 재계산
  // 한 번으로 합쳐질 위험이 있어(#269), 바깥쪽 rAF로 false가 실제로 반영된 뒤임을
  // 보장하고 안쪽 rAF에서 true를 커밋하는 중첩(double) rAF를 쓴다.
  const triggerShake = (field) => {
    setShake((prev) => ({ ...prev, [field]: false }))
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setShake((prev) => ({ ...prev, [field]: true })))
    })
  }

  const triggerTermsShake = () => {
    setTermsShake(false)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setTermsShake(true))
    })
  }

  const handleEnter = (event, submit) => {
    if (event.key !== 'Enter') return
    event.preventDefault()
    submit()
  }

  // 스텝을 옮길 때는 항상 이 함수로 — 이전 스텝에서 난 실패 메시지가 다음 스텝까지
  // 따라와서 맥락 없이 보이는 걸 막는다(뒤로가기 포함, #271).
  const goToStep = (step) => {
    setMessage('')
    setStep(step)
  }

  const goStep1 = () => {
    setMessage('')
    if (!EMAIL_RE.test(email.trim())) return triggerShake('email')
    if (!checks.ok) return triggerShake('password')
    goToStep(1)
  }

  const goStep2 = () => {
    if (!agreements.service || !agreements.privacy) {
      triggerTermsShake()
      return
    }
    goToStep(2)
  }

  const submit = async ({ skipBirthNudge = false } = {}) => {
    if (!NICKNAME_RE.test(nickname.trim())) return triggerShake('nickname')
    if (!birthdate.trim() && !skipBirthNudge) {
      setNudgeOpen(true)
      return
    }
    setSubmitting(true)
    setMessage('')
    try {
      const payload = {
        email: email.trim(),
        password,
        nickname: nickname.trim(),
        agreements,
      }
      if (birthdate.trim()) payload.birthdate = birthdate.trim()
      const data = await signup(payload)
      setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken })
      setStep(3)
    } catch (error) {
      if (error.code === 'EMAIL_DUPLICATED') {
        setMessage('이미 사용 중인 이메일입니다.')
        setStep(0)
      } else {
        setMessage(error.message ?? '가입에 실패했습니다.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const toggleAll = () => {
    const next = !allAgreed
    setAgreements({ service: next, privacy: next, marketing: next })
  }
  const toggleOne = (key) => setAgreements((prev) => ({ ...prev, [key]: !prev[key] }))
  const togglePanel = (kind) => setOpenPanel((prev) => (prev === kind ? null : kind))
  const handleTermsKey = (event, action) => {
    if (event.target !== event.currentTarget) return
    if (event.key !== ' ' && event.key !== 'Enter') return
    event.preventDefault()
    action()
  }

  const startSocialLogin = (provider) => {
    window.location.assign(oauthAuthorizeUrl(provider))
  }

  return (
    <main className="proto-signup">
      <div className="signup-card">
        <div className="signup-logo-area">
          <div className="signup-logo-icon">
            <img src={logo} alt="Clov 로고" />
          </div>
          <div className="signup-logo-text">Clov.</div>
          <div className="signup-logo-sub">약속이 추억으로 자라는 친구 전용 기록공간</div>
        </div>

        <div className="signup-step-bar">
          {Array.from({ length: STEP_COUNT }, (_, i) => (
            <div key={i} className={`signup-step-dot${i === step ? ' is-active' : ''}${i < step ? ' is-done' : ''}`} />
          ))}
        </div>

        {/* STEP 0 — 이메일/비밀번호 */}
        {step === 0 && (
          <div>
            <div className="signup-input-grid">
              <div className="signup-input-group">
                <label className="signup-input-label" htmlFor="email">이메일</label>
                <div className="signup-input-wrap">
                  <span className="input-icon">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>
                  </span>
                  <input
                    id="email" type="email" className={`signup-input${shake.email ? ' is-shake' : ''}`}
                    value={email} placeholder="example@email.com" autoComplete="email"
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => handleEnter(e, () => document.getElementById('pw')?.focus())}
                    onAnimationEnd={() => clearShake('email')}
                  />
                </div>
              </div>

              <div className="signup-input-group">
                <div className="signup-input-label-row">
                  <label className="signup-input-label" htmlFor="pw">비밀번호</label>
                  <span className={`signup-input-status${showPassword ? ' is-show' : ''}`}>조심하세요! 비밀번호가 보여요!</span>
                </div>
                <div className="signup-input-wrap">
                  <span className="input-icon">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
                  </span>
                  <input
                    id="pw" type={showPassword ? 'text' : 'password'} className={`signup-input${shake.password ? ' is-shake' : ''}`}
                    value={password}
                    placeholder="8~20자, 영문/숫자/특수문자 중 2가지 이상" autoComplete="new-password"
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => handleEnter(e, goStep1)}
                    onAnimationEnd={() => clearShake('password')}
                  />
                  <button type="button" className="signup-input-suffix" aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 보이기'} aria-pressed={showPassword} onClick={() => setShowPassword((v) => !v)}>
                    {showPassword ? (
                      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18" /><path d="M10.6 10.6A2 2 0 0 0 13.4 13.4" /><path d="M9.9 5.2A10.7 10.7 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.1 4.1" /><path d="M6.6 6.7C3.6 8.7 2 12 2 12s3.5 7 10 7a9.8 9.8 0 0 0 4.2-.9" /></svg>
                    ) : (
                      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></svg>
                    )}
                  </button>
                </div>
                <div className="signup-pw-strength">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className={`signup-pw-seg${i < score && level ? ` is-${level}` : ''}`} />
                  ))}
                </div>
                <div className="signup-pw-rules">
                  <span className={`signup-pw-rule${checks.lengthOk ? ' is-met' : ''}`}>8~20자</span>
                  <span className={`signup-pw-rule${checks.comboOk ? ' is-met' : ''}`}>영문/숫자/특수문자 중 2가지 이상</span>
                </div>
              </div>
            </div>
            <button type="button" className="signup-btn-primary" onClick={goStep1}>다음 단계 →</button>
            <div className={`signup-message${message ? ' is-show' : ''}`} role="alert">{message}</div>
          </div>
        )}

        {/* STEP 1 — 약관 */}
        {step === 1 && (
          <div>
            <div className="signup-form-title">거의 다 왔어요!</div>
            <div className="signup-form-desc">아래 약관에 동의하시면<br />Clov. 여정이 시작됩니다.</div>
            <div className={`signup-terms-box${termsShake ? ' is-shake' : ''}`} onAnimationEnd={() => setTermsShake(false)}>
              <div className="signup-terms-row" role="checkbox" aria-checked={allAgreed} tabIndex={0} onClick={toggleAll} onKeyDown={(e) => handleTermsKey(e, toggleAll)}>
                <div className={`signup-terms-check${allAgreed ? ' is-checked' : ''}`}>✓</div>
                <div className="signup-terms-label is-strong"><strong>전체 동의</strong> (필수 + 선택 포함)</div>
              </div>
              <div className="signup-terms-divider" />

              <div className="signup-terms-item">
                <div className="signup-terms-row" role="checkbox" aria-checked={agreements.service} tabIndex={0} onClick={() => toggleOne('service')} onKeyDown={(e) => handleTermsKey(e, () => toggleOne('service'))}>
                  <div className={`signup-terms-check${agreements.service ? ' is-checked' : ''}`}>✓</div>
                  <div className="signup-terms-label"><strong>[필수]</strong> 서비스 이용약관 동의</div>
                  <button type="button" className={`signup-terms-toggle${openPanel === 'service' ? ' is-open' : ''}`} aria-expanded={openPanel === 'service'} aria-label="서비스 이용약관 내용 보기" onClick={(e) => { e.stopPropagation(); togglePanel('service') }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                  </button>
                </div>
                <div className={`signup-terms-panel${openPanel === 'service' ? ' is-open' : ''}`}>
                  <div className="signup-terms-panel-inner" dangerouslySetInnerHTML={{ __html: SERVICE_TERMS }} />
                </div>
              </div>

              <div className="signup-terms-item">
                <div className="signup-terms-row" role="checkbox" aria-checked={agreements.privacy} tabIndex={0} onClick={() => toggleOne('privacy')} onKeyDown={(e) => handleTermsKey(e, () => toggleOne('privacy'))}>
                  <div className={`signup-terms-check${agreements.privacy ? ' is-checked' : ''}`}>✓</div>
                  <div className="signup-terms-label"><strong>[필수]</strong> 개인정보 처리방침 동의</div>
                  <button type="button" className={`signup-terms-toggle${openPanel === 'privacy' ? ' is-open' : ''}`} aria-expanded={openPanel === 'privacy'} aria-label="개인정보 처리방침 내용 보기" onClick={(e) => { e.stopPropagation(); togglePanel('privacy') }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                  </button>
                </div>
                <div className={`signup-terms-panel${openPanel === 'privacy' ? ' is-open' : ''}`}>
                  <div className="signup-terms-panel-inner" dangerouslySetInnerHTML={{ __html: PRIVACY_TERMS }} />
                </div>
              </div>

              <div className="signup-terms-row" role="checkbox" aria-checked={agreements.marketing} tabIndex={0} onClick={() => toggleOne('marketing')} onKeyDown={(e) => handleTermsKey(e, () => toggleOne('marketing'))} style={{ marginTop: 8 }}>
                <div className={`signup-terms-check${agreements.marketing ? ' is-checked' : ''}`}>✓</div>
                <div className="signup-terms-label"><strong>[선택]</strong> 마케팅 정보 수신 동의</div>
              </div>
            </div>
            <button type="button" className="signup-btn-primary" onClick={goStep2} style={{ marginTop: 0 }}>Clov. 시작하기</button>
            <button type="button" className="signup-btn-secondary" onClick={() => goToStep(0)}>← 이전으로</button>
          </div>
        )}

        {/* STEP 2 — 닉네임/생년월일 */}
        {step === 2 && (
          <div>
            <div className="signup-profile-setup">
              <div className="signup-profile-title">닉네임과 생년월일을 알려주세요</div>
              <div className="signup-profile-desc">친구들에게 보여질 이름과<br />생일(선택)을 정해주세요.</div>
            </div>
            <div className="signup-profile-fields-box">
              <div className="signup-input-group">
                <label className="signup-input-label" htmlFor="nickname">닉네임</label>
                <div className="signup-input-wrap">
                  <span className="input-icon">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.5-6.5 8-6.5s8 2.5 8 6.5" /></svg>
                  </span>
                  <input
                    id="nickname" type="text" className={`signup-input${shake.nickname ? ' is-shake' : ''}`}
                    value={nickname} placeholder="친구들이 부를 이름" autoComplete="nickname"
                    onChange={(e) => setNickname(e.target.value)}
                    onKeyDown={(e) => handleEnter(e, () => submit())}
                    onAnimationEnd={() => clearShake('nickname')}
                  />
                </div>
              </div>
              <div className="signup-input-group">
                <label className="signup-input-label" htmlFor="birthdate">생년월일 <span className="signup-optional-tag">선택</span></label>
                <div className="signup-input-wrap">
                  <span className="input-icon">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>
                  </span>
                  <input
                    id="birthdate" type="text" className="signup-input" value={birthdate} placeholder="YYYY-MM-DD" readOnly
                    onClick={() => setBirthModalOpen(true)}
                    onKeyDown={(e) => handleEnter(e, () => setBirthModalOpen(true))}
                  />
                </div>
              </div>
            </div>
            <button type="button" className="signup-btn-primary" onClick={() => submit()} disabled={submitting}>
              {submitting ? '가입 중…' : '프로필 저장하기 →'}
            </button>
            <div className={`signup-message${message ? ' is-show' : ''}`} role="alert">{message}</div>
            <button type="button" className="signup-btn-secondary" onClick={() => goToStep(1)}>← 이전으로</button>
          </div>
        )}

        {/* STEP 3 — 완료 */}
        {step === 3 && (
          <div className="signup-success-wrap">
            <div className="signup-success-icon">✓</div>
            <div className="signup-success-title">가입 완료!</div>
            <div className="signup-success-sub">
              {nickname.trim() || '클로버'}님의 우정공간이 준비됐어요.<br />
              이제 친구를 초대하고 첫 약속을 만들어 볼까요? 🌱
            </div>
            <button type="button" className="signup-btn-primary" onClick={() => navigate(takeReturnTo(), { replace: true })} style={{ marginTop: 0 }}>
              시작하기 →
            </button>
          </div>
        )}

        {/* 소셜 — step 0에서만 */}
        {step === 0 && (
          <>
            <div className="signup-divider">또는</div>
            <div className="signup-social-row">
              {SOCIALS.map(({ provider, label }) => (
                <button key={provider} type="button" className="signup-social-btn" data-label={label} aria-label={`${label} (OAuth2)`} onClick={() => startSocialLogin(provider)}>
                  <span className={`social-logo provider-${provider}`} aria-hidden="true">
                    {provider === 'kakao' && <svg viewBox="0 0 32 32" role="img"><path d="M16 7.2c-5.55 0-10.05 3.55-10.05 7.93 0 2.83 1.9 5.32 4.75 6.72l-.86 3.15c-.08.3.26.54.52.37l3.77-2.49c.6.09 1.22.14 1.87.14 5.55 0 10.05-3.55 10.05-7.93S21.55 7.2 16 7.2Z" fill="#191919" /></svg>}
                    {provider === 'naver' && <svg viewBox="0 0 32 32" role="img"><path d="M18.5 16.4 13.25 8.8H8.8v14.4h4.7v-7.6l5.25 7.6h4.45V8.8h-4.7v7.6Z" fill="#fff" /></svg>}
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
          </>
        )}

        <div className="signup-login-link">이미 계정이 있으신가요? <Link to="/login">로그인</Link></div>
      </div>

      {/* 생년월일 모달 */}
      {birthModalOpen && (
        <BirthModal
          years={years}
          value={birthdate}
          onClose={() => setBirthModalOpen(false)}
          onSave={(v) => { setBirthdate(v); setBirthModalOpen(false) }}
        />
      )}

      {/* 생일 넛지 모달 */}
      {nudgeOpen && (
        <div className="signup-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setNudgeOpen(false) }}>
          <div className="signup-modal-box is-nudge">
            <div className="signup-nudge-title">잠깐!</div>
            <div className="signup-nudge-desc">생년월일을 입력하지 않았어요.<br />선택사항이지만 Clov.와 친구들의 축하를 받을 수 없게 돼요.</div>
            <button type="button" className="signup-btn-primary" style={{ marginTop: 0 }} onClick={() => { setNudgeOpen(false); setBirthModalOpen(true) }}>지금 설정하기</button>
            <button type="button" className="signup-btn-secondary" onClick={() => { setNudgeOpen(false); submit({ skipBirthNudge: true }) }}>다음에 할게요</button>
          </div>
        </div>
      )}
    </main>
  )
}

function BirthModal({ years, value, onClose, onSave }) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  const [year, setYear] = useState(match ? match[1] : '2007')
  const [month, setMonth] = useState(match ? match[2] : '01')
  const [day, setDay] = useState(match ? match[3] : '01')

  return (
    <div className="signup-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="signup-modal-box">
        <div className="signup-modal-head">
          <button type="button" className="signup-modal-close" aria-label="닫기" onClick={onClose}>×</button>
        </div>
        <div className="signup-birth-wheel">
          <div>
            <select value={year} onChange={(e) => setYear(e.target.value)}>
              {years.map((y) => <option key={y} value={String(y)}>{y}</option>)}
            </select>
            <span className="signup-birth-wheel-label">년</span>
          </div>
          <div>
            <select value={month} onChange={(e) => setMonth(e.target.value)}>
              {Array.from({ length: 12 }, (_, i) => pad2(i + 1)).map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
            <span className="signup-birth-wheel-label">월</span>
          </div>
          <div>
            <select value={day} onChange={(e) => setDay(e.target.value)}>
              {Array.from({ length: 31 }, (_, i) => pad2(i + 1)).map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            <span className="signup-birth-wheel-label">일</span>
          </div>
        </div>
        <button type="button" className="signup-btn-primary" onClick={() => onSave(`${year}-${month}-${day}`)}>저장하기</button>
      </div>
    </div>
  )
}

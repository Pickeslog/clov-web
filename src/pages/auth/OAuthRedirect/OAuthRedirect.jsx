import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import './oauthredirect.proto.css'
import { confirmOAuthLink, exchangeOAuthCode, submitOAuthConsent } from '../../../api/auth'
import { useAuthStore } from '../../../stores/authStore'
import { takeReturnTo } from '../../../lib/returnUrl'

const initialAgreements = { service: false, privacy: false, marketing: false }
const exchangeRequests = new Map()

export default function OAuthRedirect() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const setTokens = useAuthStore((state) => state.setTokens)
  const [status, setStatus] = useState('exchanging')
  const [registration, setRegistration] = useState(null)
  // (C) 이메일 매칭 계정 연결 후보(§4-2, web-design-repository#90) — registration과 별도 상태.
  // registrationToken은 같은 필드명이지만 가리키는 대상이 다르다(신규 프로필 vs 연결 확인).
  const [linkCandidate, setLinkCandidate] = useState(null)
  const [agreements, setAgreements] = useState(initialAgreements)
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const code = searchParams.get('code')

  useEffect(() => {
    if (!code) return

    let active = true
    const exchange = async () => {
      try {
        const exchangeResult = await exchangeOnce(code)
        if (!active) return

        if (exchangeResult.authenticated) {
          setTokens({ accessToken: exchangeResult.accessToken, refreshToken: exchangeResult.refreshToken })
          // 소셜은 백엔드로 전체 페이지 이동을 했다 돌아온다 — 목적지가 sessionStorage에 있어 살아남는다(#137).
          navigate(takeReturnTo(), { replace: true })
          return
        }

        if (exchangeResult.linkCandidate) {
          setLinkCandidate({ registrationToken: exchangeResult.registrationToken, maskedEmail: exchangeResult.maskedEmail })
          setStatus('link-confirm')
          return
        }

        setRegistration({ registrationToken: exchangeResult.registrationToken, profile: exchangeResult.profile })
        setStatus('consent')
      } catch (error) {
        if (!active) return
        setStatus('error')
        setMessage(errorMessage(error))
      }
    }

    exchange()
    return () => {
      active = false
    }
  }, [code, navigate, setTokens])

  const toggleAgreement = (key) => {
    setAgreements((current) => ({ ...current, [key]: !current[key] }))
  }

  const submitConsent = async () => {
    if (!agreements.service || !agreements.privacy) {
      setMessage('서비스 이용약관과 개인정보 처리방침에 동의해주세요.')
      return
    }

    setSubmitting(true)
    setMessage('')
    try {
      const result = await submitOAuthConsent(registration.registrationToken, agreements)
      setTokens({ accessToken: result.accessToken, refreshToken: result.refreshToken })
      navigate(takeReturnTo(), { replace: true })
    } catch (error) {
      setMessage(errorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  const confirmLink = async () => {
    setSubmitting(true)
    setMessage('')
    try {
      const result = await confirmOAuthLink(linkCandidate.registrationToken)
      setTokens({ accessToken: result.accessToken, refreshToken: result.refreshToken })
      navigate(takeReturnTo(), { replace: true })
    } catch (error) {
      setMessage(errorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  if (status === 'exchanging') {
    return (
      <main className="proto-oauthredirect">
        <section className="oauthredirect-panel" aria-live="polite">
          <div className="oauthredirect-loading-mark" aria-hidden="true" />
          <h1 className="oauthredirect-title">로그인 정보를 확인하고 있어요</h1>
          <p className="oauthredirect-description">잠시만 기다려주세요.</p>
        </section>
      </main>
    )
  }

  if (!code || status === 'error') {
    return (
      <main className="proto-oauthredirect">
        <section className="oauthredirect-panel">
          <p className="oauthredirect-kicker">소셜 로그인</p>
          <h1 className="oauthredirect-title">로그인을 완료하지 못했어요</h1>
          <p className="oauthredirect-description">{message || '소셜 로그인 정보가 없습니다. 다시 시도해주세요.'}</p>
          <Link className="oauthredirect-login-link" to="/login">로그인 화면으로 돌아가기</Link>
        </section>
      </main>
    )
  }

  if (status === 'link-confirm') {
    return (
      <main className="proto-oauthredirect">
        <section className="oauthredirect-panel">
          <p className="oauthredirect-kicker">계정 연결 확인</p>
          <h1 className="oauthredirect-title">이 계정으로 연결할까요?</h1>
          <p className="oauthredirect-description">
            <strong>{linkCandidate.maskedEmail}</strong> 이메일로 이미 가입된 계정이 있어요.
            같은 사람이 맞다면 연결해서 기존 우정공간·기록을 그대로 이어서 쓸 수 있어요.
          </p>

          {message && <p className="oauthredirect-message" role="alert">{message}</p>}
          <button type="button" className="oauthredirect-confirm-btn" onClick={confirmLink} disabled={submitting}>
            {submitting ? '연결하는 중...' : '이 계정으로 연결하기'}
          </button>
          <Link className="oauthredirect-login-link" to="/login">다른 계정으로 로그인</Link>
        </section>
      </main>
    )
  }

  return (
    <main className="proto-oauthredirect">
      <section className="oauthredirect-panel">
        <p className="oauthredirect-kicker">{registration.profile.provider}로 시작하기</p>
        <h1 className="oauthredirect-title">Clov.에 오신 것을 환영해요</h1>
        <p className="oauthredirect-description">
          <strong>{registration.profile.nickname}</strong>님, 서비스 이용을 위해 아래 약관에 동의해주세요.
        </p>
        <p className="oauthredirect-email">{registration.profile.email}</p>

        <div className="oauthredirect-agreement-list">
          <AgreementRow
            checked={agreements.service}
            label="서비스 이용약관 동의"
            required
            onChange={() => toggleAgreement('service')}
          />
          <AgreementRow
            checked={agreements.privacy}
            label="개인정보 처리방침 동의"
            required
            onChange={() => toggleAgreement('privacy')}
          />
          <AgreementRow
            checked={agreements.marketing}
            label="마케팅 정보 수신 동의"
            onChange={() => toggleAgreement('marketing')}
          />
        </div>

        {message && <p className="oauthredirect-message" role="alert">{message}</p>}
        <button type="button" className="oauthredirect-confirm-btn" onClick={submitConsent} disabled={submitting}>
          {submitting ? '가입하는 중...' : '동의하고 시작하기'}
        </button>
        <Link className="oauthredirect-login-link" to="/login">다른 계정으로 로그인</Link>
      </section>
    </main>
  )
}

function exchangeOnce(code) {
  if (!exchangeRequests.has(code)) {
    exchangeRequests.set(code, exchangeOAuthCode(code))
  }
  return exchangeRequests.get(code)
}

function AgreementRow({ checked, label, required = false, onChange }) {
  return (
    <label className="oauthredirect-agreement-row">
      <input type="checkbox" className="oauthredirect-checkbox" checked={checked} onChange={onChange} />
      <span className="oauthredirect-agreement-label">
        {label} {required && <span className="oauthredirect-required">필수</span>}
      </span>
    </label>
  )
}

function errorMessage(error) {
  if (error?.code === 'OAUTH_CODE_INVALID') return '인증 시간이 만료되었어요. 다시 로그인해주세요.'
  if (error?.code === 'OAUTH_EMAIL_REQUIRED') return '소셜 계정의 이메일 정보를 받을 수 없어요.'
  return error?.message ?? '소셜 로그인 처리 중 문제가 발생했어요.'
}

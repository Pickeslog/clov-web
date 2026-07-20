import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { exchangeOAuthCode, submitOAuthConsent } from '../../../api/auth'
import { useAuthStore } from '../../../stores/authStore'
import * as S from './OAuthRedirect.style'

const initialAgreements = { service: false, privacy: false, marketing: false }

export default function OAuthRedirect() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const setTokens = useAuthStore((state) => state.setTokens)
  const exchangedCodeRef = useRef(null)
  const [status, setStatus] = useState('exchanging')
  const [registration, setRegistration] = useState(null)
  const [agreements, setAgreements] = useState(initialAgreements)
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const code = searchParams.get('code')

  useEffect(() => {
    if (!code) return

    if (exchangedCodeRef.current === code) return
    exchangedCodeRef.current = code

    let active = true
    const exchange = async () => {
      try {
        const result = await exchangeOAuthCode(code)
        if (!active) return

        if (result.authenticated) {
          setTokens({ accessToken: result.accessToken, refreshToken: result.refreshToken })
          navigate('/', { replace: true })
          return
        }

        setRegistration({ registrationToken: result.registrationToken, profile: result.profile })
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
      navigate('/', { replace: true })
    } catch (error) {
      setMessage(errorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  if (status === 'exchanging') {
    return (
      <S.Page>
        <S.Panel aria-live="polite">
          <S.LoadingMark aria-hidden="true" />
          <S.Title>로그인 정보를 확인하고 있어요</S.Title>
          <S.Description>잠시만 기다려주세요.</S.Description>
        </S.Panel>
      </S.Page>
    )
  }

  if (!code || status === 'error') {
    return (
      <S.Page>
        <S.Panel>
          <S.Kicker>소셜 로그인</S.Kicker>
          <S.Title>로그인을 완료하지 못했어요</S.Title>
          <S.Description>{message || '소셜 로그인 정보가 없습니다. 다시 시도해주세요.'}</S.Description>
          <S.LoginLink as={Link} to="/login">로그인 화면으로 돌아가기</S.LoginLink>
        </S.Panel>
      </S.Page>
    )
  }

  return (
    <S.Page>
      <S.Panel>
        <S.Kicker>{registration.profile.provider}로 시작하기</S.Kicker>
        <S.Title>Clov.에 오신 것을 환영해요</S.Title>
        <S.Description>
          <strong>{registration.profile.nickname}</strong>님, 서비스 이용을 위해 아래 약관에 동의해주세요.
        </S.Description>
        <S.Email>{registration.profile.email}</S.Email>

        <S.AgreementList>
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
        </S.AgreementList>

        {message && <S.Message role="alert">{message}</S.Message>}
        <S.ConfirmButton type="button" onClick={submitConsent} disabled={submitting}>
          {submitting ? '가입하는 중...' : '동의하고 시작하기'}
        </S.ConfirmButton>
        <S.LoginLink as={Link} to="/login">다른 계정으로 로그인</S.LoginLink>
      </S.Panel>
    </S.Page>
  )
}

function AgreementRow({ checked, label, required = false, onChange }) {
  return (
    <S.AgreementRow>
      <S.Checkbox type="checkbox" checked={checked} onChange={onChange} />
      <S.AgreementLabel>
        {label} {required && <S.Required>필수</S.Required>}
      </S.AgreementLabel>
    </S.AgreementRow>
  )
}

function errorMessage(error) {
  if (error?.code === 'OAUTH_CODE_INVALID') return '인증 시간이 만료되었어요. 다시 로그인해주세요.'
  if (error?.code === 'OAUTH_EMAIL_REQUIRED') return '소셜 계정의 이메일 정보를 받을 수 없어요.'
  return error?.message ?? '소셜 로그인 처리 중 문제가 발생했어요.'
}

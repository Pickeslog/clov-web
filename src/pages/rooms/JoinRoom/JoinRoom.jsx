import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import * as S from './JoinRoom.style'
import { requestJoin } from '../../../api/invite'
import { useAuthStore } from '../../../stores/authStore'
import { setPendingJoin } from '../../../lib/pendingJoin'

const describeError = (error) => {
  switch (error.code) {
    case 'INVITE_EXPIRED':
      return '만료되었거나 존재하지 않는 초대 코드입니다.'
    case 'INVITE_ALREADY_USED':
      return '이미 사용된 초대 코드입니다.'
    case 'ROOM_MEMBER_NOT_FOUND':
      return '이미 참여 중인 우정공간이거나 참여할 수 없습니다.'
    default:
      return error.message ?? '가입 신청에 실패했습니다.'
  }
}

// 초대 코드로 가입을 "신청"하는 화면(계약 §7) — 신청 즉시 입장이 아니라 PENDING 생성.
// 진입 경로 2가지:
//  - /join/:code (공유 링크) → 로그인돼 있으면 자동 원탭 신청, 아니면 코드 기억 후 로그인 유도.
//  - /join       (수동 입력, 보호 라우트) → 코드를 직접 입력해 신청.
export default function JoinRoom() {
  const { code: codeParam } = useParams()
  const linkCode = codeParam ? codeParam.trim().toUpperCase() : ''
  const accessToken = useAuthStore((state) => state.accessToken)

  const [inviteCode, setInviteCode] = useState(linkCode)
  const [message, setMessage] = useState('')
  const autoFired = useRef(false)

  const { mutate, isPending, isSuccess } = useMutation({
    mutationFn: (value) => requestJoin({ inviteCode: (value ?? inviteCode).trim().toUpperCase() }),
    onSuccess: () => setMessage(''),
    onError: (error) => setMessage(describeError(error)),
  })

  // 링크로 들어온 경우: 로그인돼 있으면 즉시 1회 자동 신청("탭 한 번"), 아니면 코드를 기억해 둔다.
  useEffect(() => {
    if (!linkCode || autoFired.current) return
    autoFired.current = true
    if (accessToken) mutate(linkCode)
    else setPendingJoin(linkCode)
  }, [linkCode, accessToken, mutate])

  const handleSubmit = () => {
    setMessage('')
    if (!inviteCode.trim()) {
      setMessage('초대 코드를 입력해주세요.')
      return
    }
    mutate()
  }

  // 미로그인 상태로 초대 링크를 탄 친구 = 초대 랜딩(로그인/가입 유도).
  if (linkCode && !accessToken) {
    return (
      <S.Page>
        <S.TopBar>
          <Link to="/" style={{ textDecoration: 'none' }}>
            <S.Brand>Clov.</S.Brand>
          </Link>
        </S.TopBar>
        <S.Body>
          <S.Card>
            <S.Title>우정공간에 초대받았어요</S.Title>
            <S.Desc>로그인하면 이 초대 코드로 바로 가입 신청이 접수돼요.</S.Desc>
            <div
              style={{
                padding: '14px 16px',
                border: '1px dashed var(--mint)',
                borderRadius: 14,
                background: 'var(--glow)',
                color: 'var(--forest)',
                fontWeight: 900,
                letterSpacing: '0.06em',
                textAlign: 'center',
              }}
            >
              {linkCode}
            </div>
            <S.SubmitBtn
              as={Link}
              to="/login"
              style={{ display: 'grid', placeItems: 'center', textDecoration: 'none' }}
            >
              로그인하고 참여하기
            </S.SubmitBtn>
            <S.BackLink as={Link} to="/signup">
              아직 계정이 없다면 회원가입
            </S.BackLink>
          </S.Card>
        </S.Body>
      </S.Page>
    )
  }

  return (
    <S.Page>
      <S.TopBar>
        <Link to="/" style={{ textDecoration: 'none' }}>
          <S.Brand>Clov.</S.Brand>
        </Link>
      </S.TopBar>

      <S.Body>
        <S.Card>
          <S.Title>초대 코드로 참여하기</S.Title>
          <S.Desc>친구에게 받은 초대 코드를 입력하면 가입 신청이 접수됩니다.</S.Desc>

          {isSuccess ? (
            <S.SuccessBox>
              가입 신청이 접수되었습니다! 공간 멤버가 수락하면 참여가 확정됩니다.
              <div style={{ marginTop: 10 }}>
                <S.BackLink as={Link} to="/">
                  우정공간 목록으로
                </S.BackLink>
              </div>
            </S.SuccessBox>
          ) : linkCode && isPending ? (
            <S.SuccessBox>초대 코드 {linkCode} 로 가입 신청하는 중…</S.SuccessBox>
          ) : (
            <>
              <S.Field>
                <S.Label htmlFor="invite-code">초대 코드</S.Label>
                <S.Input
                  id="invite-code"
                  value={inviteCode}
                  placeholder="CLV-JOIN-XXXXXX"
                  onChange={(event) => setInviteCode(event.target.value)}
                />
              </S.Field>
              <S.SubmitBtn type="button" onClick={handleSubmit} disabled={isPending}>
                {isPending ? '신청하는 중…' : '가입 신청하기'}
              </S.SubmitBtn>
              {message && <S.Message role="alert">{message}</S.Message>}
            </>
          )}
        </S.Card>
      </S.Body>
    </S.Page>
  )
}

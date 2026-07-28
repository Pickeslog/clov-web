import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import * as S from './JoinRoom.style'
import { requestJoin } from '../../../api/invite'
import { describeInviteError, extractJoinedRoomId } from '../../../lib/inviteError'

// 초대 코드로 가입을 "신청"하는 화면(계약 §7) — 신청 즉시 입장이 아니라 PENDING 생성.
export default function JoinRoom() {
  const navigate = useNavigate()
  const { code } = useParams()
  const [searchParams] = useSearchParams()
  // 공유 링크는 경로(/join/:code)와 쿼리(?code=/?roomCode=) 두 형식이 모두 쓰인다 — 둘 다 지원.
  // 코드만 채워주고 제출은 하지 않는다: 가입 신청은 5분 되돌리기가 붙는 부수효과가 있어 사용자가 직접 눌러야 한다.
  const [inviteCode, setInviteCode] = useState(
    () => code ?? searchParams.get('code') ?? searchParams.get('roomCode') ?? '',
  )
  const [message, setMessage] = useState('')

  const { mutate, isPending, isSuccess } = useMutation({
    mutationFn: () => requestJoin({ inviteCode: inviteCode.trim().toUpperCase() }),
    onSuccess: () => setMessage(''),
    onError: (error) => {
      const roomId = extractJoinedRoomId(error)
      if (roomId) {
        navigate(`/rooms/${roomId}`)
        return
      }
      setMessage(describeInviteError(error))
    },
  })

  const handleSubmit = () => {
    setMessage('')
    if (!inviteCode.trim()) {
      setMessage('초대 코드를 입력해주세요.')
      return
    }
    mutate()
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

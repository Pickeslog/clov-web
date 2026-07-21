import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as S from './Invite.style'
import {
  acceptJoinRequest,
  cancelInvite,
  createInvite,
  getInvites,
  getJoinRequests,
  rejectJoinRequest,
  undoJoinRequest,
} from '../../../api/invite'

const EXPIRY_OPTIONS = [
  { value: '', label: '기본(72시간)' },
  { value: '24', label: '24시간' },
  { value: '168', label: '7일' },
]

// 백엔드는 UTC LocalDateTime을 오프셋 없이 내려준다(예: 2026-07-20T11:05:00) — UTC로 명시 파싱해야 카운트다운이 정확하다.
const parseUtc = (value) => new Date(value.endsWith('Z') ? value : `${value}Z`)

const describeError = (error) => {
  switch (error.code) {
    case 'ROOM_CAPACITY_EXCEEDED':
      return '우정공간 정원(8명)이 가득 찼습니다.'
    case 'JOIN_REQUEST_ALREADY_PROCESSED':
      return '이미 다른 멤버가 처리한 신청입니다.'
    case 'JOIN_REQUEST_UNDO_EXPIRED':
      return '되돌리기 가능 시간(5분)이 지났습니다.'
    default:
      return error.message ?? '요청을 처리하지 못했습니다.'
  }
}

export default function Invite() {
  const { roomId } = useParams()
  const queryClient = useQueryClient()

  const [expiresInHours, setExpiresInHours] = useState('')
  const [message, setMessage] = useState('')
  const [acceptedList, setAcceptedList] = useState([])
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (acceptedList.length === 0) return undefined
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [acceptedList.length])

  const invites = useQuery({ queryKey: ['invites', roomId], queryFn: () => getInvites(roomId) })
  const joinRequests = useQuery({ queryKey: ['joinRequests', roomId], queryFn: () => getJoinRequests(roomId) })

  const invalidateInvites = () => queryClient.invalidateQueries({ queryKey: ['invites', roomId] })
  const invalidateJoinRequests = () => queryClient.invalidateQueries({ queryKey: ['joinRequests', roomId] })

  const createMutation = useMutation({
    mutationFn: () => createInvite(roomId, expiresInHours ? { expiresInHours: Number(expiresInHours) } : {}),
    onSuccess: () => {
      setMessage('')
      invalidateInvites()
    },
    onError: (error) => setMessage(describeError(error)),
  })

  const cancelMutation = useMutation({
    mutationFn: (inviteId) => cancelInvite(inviteId),
    onSuccess: invalidateInvites,
    onError: (error) => setMessage(describeError(error)),
  })

  const acceptMutation = useMutation({
    mutationFn: (joinRequestId) => acceptJoinRequest(joinRequestId),
    onSuccess: (result, joinRequestId) => {
      const item = joinItems.find((request) => request.id === joinRequestId)
      setAcceptedList((list) => [
        ...list,
        { id: joinRequestId, applicant: item?.applicant, undoDeadlineAt: result.undoDeadlineAt },
      ])
      setMessage('')
      invalidateJoinRequests()
    },
    onError: (error) => setMessage(describeError(error)),
  })

  const rejectMutation = useMutation({
    mutationFn: (joinRequestId) => rejectJoinRequest(joinRequestId),
    onSuccess: () => {
      setMessage('')
      invalidateJoinRequests()
    },
    onError: (error) => setMessage(describeError(error)),
  })

  const undoMutation = useMutation({
    mutationFn: (joinRequestId) => undoJoinRequest(joinRequestId),
    onSuccess: (_, joinRequestId) => {
      setAcceptedList((list) => list.filter((entry) => entry.id !== joinRequestId))
      setMessage('')
      invalidateJoinRequests()
    },
    onError: (error) => setMessage(describeError(error)),
  })

  const inviteItems = invites.data?.items ?? []
  const joinItems = joinRequests.data?.items ?? []

  return (
    <S.Page>
      <S.TopBar>
        <Link to={`/rooms/${roomId}`} style={{ textDecoration: 'none' }}>
          <S.Brand>Clov.</S.Brand>
        </Link>
      </S.TopBar>

      <S.Header>
        <S.Title>초대하기</S.Title>
        <S.Desc>초대 코드를 만들어 친구를 우정공간에 초대하세요.</S.Desc>
      </S.Header>

      {message && <S.Message role="alert">{message}</S.Message>}

      <S.Section>
        <S.SectionTitle>초대 코드</S.SectionTitle>

        <S.CreateRow>
          <S.Select value={expiresInHours} onChange={(event) => setExpiresInHours(event.target.value)}>
            {EXPIRY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </S.Select>
          <S.CreateBtn type="button" onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
            {createMutation.isPending ? '생성 중…' : '코드 생성'}
          </S.CreateBtn>
        </S.CreateRow>

        {invites.isPending ? (
          <S.State>불러오는 중…</S.State>
        ) : invites.isError ? (
          <S.State>초대 코드를 불러오지 못했습니다.</S.State>
        ) : inviteItems.length === 0 ? (
          <S.Empty>아직 만든 초대 코드가 없습니다.</S.Empty>
        ) : (
          <S.List>
            {inviteItems.map((invite) => (
              <S.Card key={invite.id}>
                <S.CodeText>{invite.inviteCode}</S.CodeText>
                <S.Meta>
                  {invite.status === 'ACTIVE'
                    ? `만료 ${parseUtc(invite.expiresAt).toLocaleString()}`
                    : invite.status}
                </S.Meta>
                {invite.status === 'ACTIVE' && (
                  <S.CancelBtn
                    type="button"
                    onClick={() => cancelMutation.mutate(invite.id)}
                    disabled={cancelMutation.isPending}
                  >
                    취소
                  </S.CancelBtn>
                )}
              </S.Card>
            ))}
          </S.List>
        )}
      </S.Section>

      <S.Section>
        <S.SectionTitle>대기 중인 가입 신청</S.SectionTitle>

        {acceptedList.length > 0 && (
          <S.List>
            {acceptedList.map((entry) => {
              const remainingMs = parseUtc(entry.undoDeadlineAt).getTime() - now
              const expired = remainingMs <= 0
              const remainingSec = Math.max(0, Math.floor(remainingMs / 1000))
              return (
                <S.UndoCard key={entry.id}>
                  <S.UndoInfo>
                    <S.UndoName>{entry.applicant?.nickname ?? '알 수 없음'}님 수락됨</S.UndoName>
                    <S.UndoTimer>
                      {expired ? '되돌리기 시간이 지났습니다.' : `${Math.floor(remainingSec / 60)}:${String(remainingSec % 60).padStart(2, '0')} 남음`}
                    </S.UndoTimer>
                  </S.UndoInfo>
                  <S.UndoBtn
                    type="button"
                    onClick={() => undoMutation.mutate(entry.id)}
                    disabled={expired || undoMutation.isPending}
                  >
                    되돌리기
                  </S.UndoBtn>
                </S.UndoCard>
              )
            })}
          </S.List>
        )}

        {joinRequests.isPending ? (
          <S.State>불러오는 중…</S.State>
        ) : joinRequests.isError ? (
          <S.State>가입 신청 목록을 불러오지 못했습니다.</S.State>
        ) : joinItems.length === 0 ? (
          <S.Empty>대기 중인 가입 신청이 없습니다.</S.Empty>
        ) : (
          <S.List>
            {joinItems.map((request) => (
              <S.Card key={request.id}>
                <S.ApplicantRow>
                  <S.Avatar>{request.applicant?.nickname?.[0] ?? '?'}</S.Avatar>
                  <S.ApplicantName>{request.applicant?.nickname}</S.ApplicantName>
                </S.ApplicantRow>
                <S.ActionRow>
                  <S.AcceptBtn
                    type="button"
                    onClick={() => acceptMutation.mutate(request.id)}
                    disabled={acceptMutation.isPending || rejectMutation.isPending}
                  >
                    수락
                  </S.AcceptBtn>
                  <S.RejectBtn
                    type="button"
                    onClick={() => rejectMutation.mutate(request.id)}
                    disabled={acceptMutation.isPending || rejectMutation.isPending}
                  >
                    거절
                  </S.RejectBtn>
                </S.ActionRow>
              </S.Card>
            ))}
          </S.List>
        )}
      </S.Section>

      <S.Spacer />
    </S.Page>
  )
}

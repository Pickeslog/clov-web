import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import './notifications.proto.css'
import { getNotifications, markNotificationRead } from '../../../api/notification'
import {
  acceptJoinRequest,
  getJoinRequests,
  rejectJoinRequest,
  undoJoinRequest,
} from '../../../api/invite'
import { parseUtc, formatDate, formatTime } from '../../../lib/datetime'

const TABS = [
  { id: 'NOTICE', label: '관리진 공지', icon: '📣' },
  { id: 'FRIEND', label: '친구들 알림', icon: '♧' },
  { id: 'JOIN', label: '가입 신청', icon: '♧' },
]

const describeError = (error) => {
  switch (error.code) {
    case 'ROOM_CAPACITY_EXCEEDED': return '우정공간 정원(8명)이 가득 찼습니다.'
    case 'JOIN_REQUEST_ALREADY_PROCESSED': return '이미 다른 멤버가 처리한 신청입니다.'
    case 'JOIN_REQUEST_UNDO_EXPIRED': return '되돌리기 가능 시간(5분)이 지났습니다.'
    default: return error.message ?? '요청을 처리하지 못했습니다.'
  }
}

// 계약 §13 이벤트 카탈로그대로 subType별 문구. LEVEL_UP은 actor가 없다(방 전체 이벤트) —
// actor.nickname을 그냥 읽으면 크래시나므로 반드시 subType을 먼저 분기한다.
const messageFor = (notification) => {
  const { subType, actor, payload } = notification
  switch (subType) {
    case 'MEMORY_WRITE': return `${actor?.nickname}님이 추억을 남겼어요`
    case 'PLAN_CREATE': return `${actor?.nickname}님이 새 약속을 만들었어요`
    case 'PLAN_COMPLETE': return `${actor?.nickname}님이 약속을 완료했어요`
    case 'ROOM_UPDATE': return `${actor?.nickname}님이 우정공간 정보를 바꿨어요`
    case 'LEVEL_UP': return `우정공간이 Lv.${payload?.level}이 됐어요! 🎉`
    default: return actor?.nickname ? `${actor.nickname}님의 새로운 활동이 있습니다.` : '새로운 알림이 있습니다.'
  }
}

const titleFor = (notification) => (notification.type === 'NOTICE' ? '[공지] Clov. 새로운 소식' : '우정공간 새 소식')

export default function Notifications({ onClose }) {
  const { roomId } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('NOTICE')
  const [acceptedList, setAcceptedList] = useState([])
  const [message, setMessage] = useState('')
  const [now, setNow] = useState(() => Date.now())

  const notificationsQuery = useQuery({
    queryKey: ['notifications', roomId, activeTab],
    queryFn: () => getNotifications(roomId, activeTab),
    enabled: activeTab !== 'JOIN',
  })
  const joinRequestsQuery = useQuery({ queryKey: ['joinRequests', roomId], queryFn: () => getJoinRequests(roomId) })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['notifications', roomId] })
    queryClient.invalidateQueries({ queryKey: ['joinRequests', roomId] })
  }

  // 수락·되돌리기는 멤버 구성을 바꾸므로 방 상세(인원수)·멤버 목록·방 목록 캐시까지 무효화한다.
  // ['room', roomId]는 접두 일치라 ['room', roomId, 'members']·['room', roomId, 'level']도 함께 갱신된다.
  const invalidateMembership = () => {
    invalidate()
    queryClient.invalidateQueries({ queryKey: ['room', roomId] })
    queryClient.invalidateQueries({ queryKey: ['rooms'] })
  }

  const readMutation = useMutation({ mutationFn: markNotificationRead, onSuccess: invalidate })
  const acceptMutation = useMutation({
    mutationFn: acceptJoinRequest,
    onSuccess: (result, requestId) => {
      const request = joinItems.find((item) => item.id === requestId)
      setAcceptedList((items) => [...items, { id: requestId, applicant: request?.applicant, applicantName: request?.applicantName, undoUntil: result.undoUntil ?? result.undoDeadlineAt }])
      setMessage('')
      invalidateMembership()
    },
    onError: (error) => setMessage(describeError(error)),
  })
  const rejectMutation = useMutation({ mutationFn: rejectJoinRequest, onSuccess: () => { setMessage(''); invalidate() }, onError: (error) => setMessage(describeError(error)) })
  const undoMutation = useMutation({
    mutationFn: undoJoinRequest,
    onSuccess: (_, requestId) => { setAcceptedList((items) => items.filter((item) => item.id !== requestId)); setMessage(''); invalidateMembership() },
    onError: (error) => setMessage(describeError(error)),
  })

  const joinItems = joinRequestsQuery.data?.items ?? []
  const pendingRequests = joinItems.filter((request) => request.status === 'PENDING' || !request.status)
  const notifications = Array.isArray(notificationsQuery.data) ? notificationsQuery.data : (notificationsQuery.data?.items ?? [])

  useEffect(() => {
    if (acceptedList.length === 0) return undefined
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [acceptedList.length])

  const close = useCallback(() => {
    if (onClose) {
      onClose()
      return
    }
    navigate(`/rooms/${roomId}`)
  }, [navigate, onClose, roomId])

  useEffect(() => {
    const handleEscape = (event) => { if (event.key === 'Escape') close() }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [close])

  return (
    <main className="proto-notifications">
      <div className="noti-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) close() }}>
        <section className="noti-modal" role="dialog" aria-modal="true" aria-labelledby="notifications-title">
          <header className="noti-head">
            <h1 id="notifications-title"><BellIcon />알림</h1>
            <button className="noti-close" type="button" onClick={close}>✕ 닫기</button>
          </header>
          <nav className="noti-tabs" aria-label="알림 분류">
            {TABS.map((tab) => (
              <button key={tab.id} className={`noti-tab${activeTab === tab.id ? ' on' : ''}`} type="button" onClick={() => { setMessage(''); setActiveTab(tab.id) }}>
                <span aria-hidden="true">{tab.icon} </span>{tab.label}
                {tab.id === 'JOIN' && pendingRequests.length > 0 && <span className="noti-count">{pendingRequests.length}</span>}
              </button>
            ))}
          </nav>
          <div className="noti-body">
            {message && <div className="noti-empty noti-error" role="alert">{message}</div>}
            {activeTab === 'JOIN' ? (
              <JoinRequests
                requests={pendingRequests}
                acceptedList={acceptedList}
                now={now}
                isLoading={joinRequestsQuery.isPending}
                isError={joinRequestsQuery.isError}
                busy={acceptMutation.isPending || rejectMutation.isPending || undoMutation.isPending}
                onAccept={(id) => acceptMutation.mutate(id)}
                onReject={(id) => rejectMutation.mutate(id)}
                onUndo={(id) => undoMutation.mutate(id)}
              />
            ) : (
              <NotificationList
                activeTab={activeTab}
                notifications={notifications}
                pendingCount={pendingRequests.length}
                isLoading={notificationsQuery.isPending}
                isError={notificationsQuery.isError}
                reading={readMutation.isPending}
                onRead={(notification) => { if (!notification.isRead && !notification.readAt) readMutation.mutate(notification.id) }}
                onOpenJoin={() => setActiveTab('JOIN')}
              />
            )}
          </div>
        </section>
      </div>
    </main>
  )
}

function NotificationList({ activeTab, notifications, pendingCount, isLoading, isError, reading, onRead, onOpenJoin }) {
  if (isLoading) return <Empty text="알림을 불러오는 중…" />
  if (isError) return <Empty text="알림을 불러오지 못했습니다." />
  if (activeTab === 'FRIEND' && pendingCount > 0) {
    return <>
      <button className="noti-friend-card noti-join-banner" type="button" onClick={onOpenJoin}>
        <span className="noti-friend-title">대기 중인 가입 신청이 {pendingCount}건 있습니다! <span className="noti-new">클릭하여 확인</span></span>
        <span className="noti-message">참여 멤버 중 1명이 수락하면 새 멤버가 우정공간에 입장합니다.</span>
      </button>
      {notifications.map((notification) => <NotificationCard key={notification.id} notification={notification} reading={reading} onRead={onRead} />)}
    </>
  }
  // NOTICE(관리진 공지)는 아직 발행 기능이 없어 실제로 항상 빈 상태다 — 가짜 공지를 보여주지 않는다.
  if (notifications.length === 0) return <Empty text={activeTab === 'NOTICE' ? '아직 공지가 없어요.' : '새로운 친구 알림이 없습니다.'} />
  return notifications.map((notification) => <NotificationCard key={notification.id} notification={notification} reading={reading} onRead={onRead} />)
}

function NotificationCard({ notification, reading, onRead }) {
  const unread = !notification.isRead && !notification.readAt
  return (
    <button className={`noti-card${unread ? ' unread' : ''}`} type="button" disabled={reading} onClick={() => onRead(notification)}>
      <span className="noti-card-title">{titleFor(notification)}{unread && <span className="noti-new">NEW</span>}</span>
      <span className="noti-card-body">{messageFor(notification)}</span>
      <span className="noti-card-date">{formatDate(notification.createdAt)}</span>
    </button>
  )
}

function JoinRequests({ requests, acceptedList, now, isLoading, isError, busy, onAccept, onReject, onUndo }) {
  if (isLoading) return <Empty text="가입 신청을 불러오는 중…" />
  if (isError) return <Empty text="가입 신청을 불러오지 못했습니다." />
  return <>
    {acceptedList.map((entry) => {
      const remaining = entry.undoUntil ? Math.max(0, parseUtc(entry.undoUntil).getTime() - now) : 0
      const expired = remaining <= 0
      const name = entry.applicant?.nickname ?? entry.applicantName ?? '새 멤버'
      return <article className="noti-friend-card undo-card" key={entry.id}>
        <div className="join-card-head"><span>✓ <b>{name}</b>님 수락함</span><span className="join-card-time">되돌리기 {Math.floor(remaining / 60000)}:{String(Math.floor(remaining / 1000) % 60).padStart(2, '0')}</span></div>
        <div className="noti-message">실수로 수락했다면 5분 안에 되돌릴 수 있어요. 방장이 없으니 강퇴 대신 되돌리기로만 취소해요.</div>
        <button className="join-undo" type="button" disabled={expired || busy} onClick={() => onUndo(entry.id)}>{expired ? '되돌리기 시간이 지났습니다' : '↶ 수락 취소하기'}</button>
      </article>
    })}
    {requests.length === 0 && acceptedList.length === 0 ? <Empty text="대기 중인 가입 신청이 없습니다." /> : requests.map((request) => <JoinRequestCard key={request.id} request={request} busy={busy} onAccept={onAccept} onReject={onReject} />)}
  </>
}

function JoinRequestCard({ request, busy, onAccept, onReject }) {
  const name = request.applicant?.nickname ?? request.applicantName ?? '알 수 없음'
  const invitePath = request.invitePath === 'INVITED' ? '초대로 신청' : '코드로 직접 신청'
  return <article className="noti-friend-card join-card">
    <div className="join-card-head"><span>♧ 우정공간 가입 신청 <span className="noti-count">NEW</span></span><span className="join-card-time">{formatTime(request.requestedAt)}</span></div>
    <div className="join-card-body"><strong>{name}</strong>님이 우정공간 입장을 신청했습니다.<br /><span className="join-path">⌁ {invitePath}</span><div className="join-policy"><b>방장 권한 없음:</b> 참여 멤버 중 1명만 수락해도 즉시 방에 입장할 수 있습니다.</div></div>
    <div className="join-actions"><button className="join-accept" type="button" disabled={busy} onClick={() => onAccept(request.id)}>✓ 수락하고 입장시키기</button><button className="join-reject" type="button" disabled={busy} onClick={() => onReject(request.id)}>거절</button></div>
  </article>
}

function Empty({ text }) { return <div className="noti-empty"><div className="noti-empty-icon">✉</div>{text}</div> }
function BellIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 8a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6" /><path d="M10 20a2 2 0 0 0 4 0" /></svg> }

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

const TABS = [
  { id: 'NOTICE', label: '관리진 공지', icon: '📣' },
  { id: 'FRIEND', label: '친구들 알림', icon: '♧' },
  { id: 'JOIN', label: '가입 신청', icon: '♧' },
]

// 운영 공지가 아직 발행되지 않은 방도 프로토타입의 공지 탭이 빈 상태로 보이지 않도록 한다.
// 실제 NOTICE가 도착하면 서버 데이터만 렌더한다.
const PROTOTYPE_NOTICES = [
  { id: 'prototype-update', prototype: true, type: 'NOTICE', isRead: true, createdAt: '2026-06-30T00:00:00Z', payload: { title: '[업데이트] ➕ 새로운 방 추가 기능이 적용되었습니다!', content: "이제 번거로운 친구 초대코드 대신 '새로운 방 추가' 기능을 통해 코드를 적고 간편하게 방에 접속할 수 있습니다." } },
  { id: 'prototype-open', prototype: true, type: 'NOTICE', isRead: true, createdAt: '2026-06-29T00:00:00Z', payload: { title: '[공지] Clov v2.0 정식 오픈 안내 🎉', content: '일대일 단짝 연동 기능과 다크 모드 동기화 기능이 대폭 개선되었습니다. 더욱 안정적인 환경에서 소중한 추억을 기록해 보세요.' } },
]

// 백엔드는 오프셋 없는 UTC(LocalDateTime)를 반환 → Z 붙여 파싱. 값이 없으면 null(크래시 방지).
const parseUtc = (value) => (value ? new Date(String(value).endsWith('Z') ? value : `${value}Z`) : null)
const isValid = (d) => d && !Number.isNaN(d.getTime())
const formatDate = (value) => {
  const d = parseUtc(value)
  return isValid(d) ? d.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\. /g, '. ').replace(/\.$/, '') : ''
}
const formatTime = (value) => {
  const d = parseUtc(value)
  return isValid(d) ? d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false }) : ''
}

const describeError = (error) => {
  switch (error.code) {
    case 'ROOM_CAPACITY_EXCEEDED': return '우정공간 정원(8명)이 가득 찼습니다.'
    case 'JOIN_REQUEST_ALREADY_PROCESSED': return '이미 다른 멤버가 처리한 신청입니다.'
    case 'JOIN_REQUEST_UNDO_EXPIRED': return '되돌리기 가능 시간(5분)이 지났습니다.'
    default: return error.message ?? '요청을 처리하지 못했습니다.'
  }
}

const messageFor = (notification) => {
  const name = notification.actor?.nickname ?? notification.payload?.actorName
  if (notification.type === 'FRIEND') return name ? `${name}님의 새로운 활동이 있습니다.` : '친구의 새로운 활동 알림이 있습니다.'
  if (notification.type === 'NOTICE') return notification.payload?.content ?? 'Clov.의 새로운 소식을 확인해 보세요.'
  return '새로운 알림이 있습니다.'
}

const titleFor = (notification) => {
  if (notification.type === 'NOTICE') return notification.payload?.title ?? '[공지] Clov. 새로운 소식'
  return notification.payload?.title ?? '우정공간 새 소식'
}

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

  const readMutation = useMutation({ mutationFn: markNotificationRead, onSuccess: invalidate })
  const acceptMutation = useMutation({
    mutationFn: acceptJoinRequest,
    onSuccess: (result, requestId) => {
      const request = joinItems.find((item) => item.id === requestId)
      setAcceptedList((items) => [...items, { id: requestId, applicant: request?.applicant, applicantName: request?.applicantName, undoUntil: result.undoUntil ?? result.undoDeadlineAt }])
      setMessage('')
      invalidate()
    },
    onError: (error) => setMessage(describeError(error)),
  })
  const rejectMutation = useMutation({ mutationFn: rejectJoinRequest, onSuccess: () => { setMessage(''); invalidate() }, onError: (error) => setMessage(describeError(error)) })
  const undoMutation = useMutation({
    mutationFn: undoJoinRequest,
    onSuccess: (_, requestId) => { setAcceptedList((items) => items.filter((item) => item.id !== requestId)); setMessage(''); invalidate() },
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
                onRead={(notification) => { if (!notification.prototype && !notification.isRead && !notification.readAt) readMutation.mutate(notification.id) }}
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
  if (notifications.length === 0 && activeTab === 'NOTICE') return PROTOTYPE_NOTICES.map((notification) => <NotificationCard key={notification.id} notification={notification} reading={reading} onRead={onRead} />)
  if (notifications.length === 0) return <Empty text="새로운 친구 알림이 없습니다." />
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

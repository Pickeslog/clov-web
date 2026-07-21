import { useQuery } from '@tanstack/react-query'
import { getRoom, getRoomMembers, getRoomLevel } from '../../../api/room'
import { getNotifications } from '../../../api/notification'

// 방 미리보기 모달 — 프로토타입 #room-preview-modal(무탭 소식 피드) 이식.
// 소식 피드 = 실제 알림(FRIEND=편지 / JOIN=합류 / NOTICE=공지).

const HEX6 = /^#[0-9a-fA-F]{6}$/
const TRANSPORT_ICON = { airplane: 'ti-plane', train: 'ti-train', car: 'ti-car', ship: 'ti-ship' }
const AVATAR_COLORS = ['#5a7a3e', '#357a58', '#6a7e73', '#52b788']

const parseUtc = (v) => new Date(String(v).endsWith('Z') ? v : `${v}Z`)
const relTime = (v) => {
  if (!v) return ''
  const diff = Date.now() - parseUtc(v).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return '방금'
  if (m < 60) return `${m}분 전`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}시간 전`
  const d = Math.floor(h / 24)
  return d === 1 ? '어제' : `${d}일 전`
}

// 알림 타입 → 피드 표시(아이콘/색 클래스/문구). who는 강조 스팬으로 렌더.
const FEED_META = {
  FRIEND: { cls: 'letter', icon: 'ti-mail', tail: '님의 행운편지', fallback: '새 편지가 도착했어요' },
  JOIN: { cls: 'join', icon: 'ti-user-plus', tail: '님이 합류했어요', fallback: '새 가입 신청이 있어요' },
  NOTICE: { cls: 'sched', icon: 'ti-calendar-heart', tail: '님의 공지', fallback: '새 공지가 등록됐어요' },
}
const metaFor = (type) => FEED_META[type] ?? { cls: 'member', icon: 'ti-bell', tail: '님의 새 소식', fallback: '새 소식이 있어요' }

const initialOf = (name) => (name === '나' ? '나' : (name?.slice(-2, -1) || name?.slice(0, 1) || '?'))
const asList = (data) => (Array.isArray(data) ? data : (data?.items ?? []))

export default function RoomPreviewModal({ roomId, onClose, onEnter, onInvite }) {
  const room = useQuery({ queryKey: ['room', roomId], queryFn: () => getRoom(roomId), enabled: !!roomId })
  const level = useQuery({ queryKey: ['room', roomId, 'level'], queryFn: () => getRoomLevel(roomId), enabled: !!roomId })
  const members = useQuery({ queryKey: ['room', roomId, 'members'], queryFn: () => getRoomMembers(roomId), enabled: !!roomId })
  const notis = useQuery({ queryKey: ['room', roomId, 'preview-noti'], queryFn: () => getNotifications(roomId, undefined, 0, 5), enabled: !!roomId })

  const r = room.data
  const memberList = asList(members.data)
  const memberCount = r?.memberCount ?? memberList.length
  const feed = asList(notis.data)
  const unread = feed.filter((n) => !n.isRead).length
  const lastActive = feed[0]?.createdAt

  const icon = TRANSPORT_ICON[r?.transportType] ?? 'ti-plane'
  const iconBg = r?.themeColor && HEX6.test(r.themeColor) ? r.themeColor : 'var(--primary)'

  return (
    <div className="rp-backdrop" onClick={onClose}>
      <div className="rp-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="rp-head">
          <div className="rp-title"><i className="ti ti-home-heart" aria-hidden="true" /> {r?.name ?? '우정공간'}</div>
          <div className="rp-head-actions">
            <button type="button" className="rp-close" onClick={onClose} aria-label="닫기"><i className="ti ti-x" aria-hidden="true" /></button>
          </div>
        </div>

        <div className="rp-body">
          {room.isError ? (
            <div className="rp-state">방 정보를 불러오지 못했어요.</div>
          ) : room.isPending ? (
            <div className="rp-state">불러오는 중…</div>
          ) : (
            <>
              <div className="rp-inforow">
                <div className="rp-ico" style={{ background: iconBg }}>
                  {r.coverPhotoUrl ? <img src={r.coverPhotoUrl} alt="" /> : <i className={`ti ${icon}`} aria-hidden="true" />}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div className="rp-intro">{r.description || '등록된 소개글이 없어요'}</div>
                  <div className="rp-lvrow">
                    <span className="rp-lv">Lv.{level.data?.level ?? r.friendshipLevel ?? 1}</span>
                    {lastActive && <span className="rp-lvsub">· 활동 {relTime(lastActive)}</span>}
                  </div>
                </div>
              </div>

              <div className="rp-mrow">
                {memberList.slice(0, 6).map((m, i) => (
                  <span key={m.id ?? m.memberId ?? i} className="rp-av" style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}>
                    {initialOf(m.nickname)}
                  </span>
                ))}
                <span className="rp-mrow-n">{memberCount}명 참여 중</span>
              </div>

              <div className="rp-sechd">
                <span className="l"><i className="ti ti-history" aria-hidden="true" /> 새 소식</span>
                <span className="r">{unread > 0 ? unread : ''}</span>
              </div>

              {notis.isPending ? (
                <div className="preview-empty">소식을 불러오는 중…</div>
              ) : feed.length === 0 ? (
                <div className="preview-empty"><i className="ti ti-history" style={{ fontSize: 28, display: 'block', marginBottom: 8 }} aria-hidden="true" />아직 소식이 없어요.</div>
              ) : (
                <div className="rp-feed">
                  {feed.slice(0, 3).map((n) => {
                    const meta = metaFor(n.type)
                    const who = n.actor?.nickname
                    return (
                      <div key={n.id} className={`rp-fi${!n.isRead ? ' unread' : ''}`}>
                        <div className={`rp-fi-ic ${meta.cls}`}><i className={`ti ${meta.icon}`} aria-hidden="true" /></div>
                        <div className="rp-fi-tx">
                          <div className="rp-fi-t">
                            {who ? <><span className="who">{who}</span>{meta.tail}</> : meta.fallback}
                          </div>
                        </div>
                        <span className="rp-fi-time">{relTime(n.createdAt)}</span>
                      </div>
                    )
                  })}
                </div>
              )}
              {feed.length > 3 && (
                <button type="button" className="rp-more" onClick={onEnter}>소식 더 보기</button>
              )}

              <button type="button" className="rp-invite-btn" onClick={onInvite}><i className="ti ti-link" aria-hidden="true" /> 친구 초대하기</button>
              <button type="button" className="rp-enter" onClick={onEnter}><i className="ti ti-rocket" aria-hidden="true" /> 우정공간 입장하기</button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

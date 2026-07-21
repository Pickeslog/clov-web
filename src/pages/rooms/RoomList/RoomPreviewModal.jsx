import { useEffect, useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getRoom, getRoomMembers, getRoomLevel, updateRoom } from '../../../api/room'
import { getInvites, createInvite } from '../../../api/invite'
import { getNotifications } from '../../../api/notification'

// 방 미리보기 모달 — 프로토타입 #room-preview-modal(무탭 소식 피드 + 방 프로필 편집 + 친구 초대) 이식.
// 소식 피드 = 실제 알림(FRIEND=편지 / JOIN=합류 / NOTICE=공지).

const HEX6 = /^#[0-9a-fA-F]{6}$/
const AVATAR_COLORS = ['#5a7a3e', '#357a58', '#6a7e73', '#52b788']
const VEHICLES = [
  { value: 'airplane', label: '비행기', icon: 'ti-plane' },
  { value: 'train', label: '기차', icon: 'ti-train' },
  { value: 'car', label: '자동차', icon: 'ti-car' },
  { value: 'ship', label: '배', icon: 'ti-ship' },
]
const vehicleIcon = (v) => (VEHICLES.find((x) => x.value === v) ?? VEHICLES[0]).icon
// 보딩패스 톤(프로토타입 TICKET_TONES 대표색).
const ROOM_THEME_COLORS = ['#22705a', '#1f6b6b', '#4a6b3a', '#6b8f71', '#2563a8', '#7c5cbf', '#d1603d', '#c98a2e', '#c94f7c']

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

const FEED_META = {
  FRIEND: { cls: 'letter', icon: 'ti-mail', tail: '님의 행운편지', fallback: '새 편지가 도착했어요' },
  JOIN: { cls: 'join', icon: 'ti-user-plus', tail: '님이 합류했어요', fallback: '새 가입 신청이 있어요' },
  NOTICE: { cls: 'sched', icon: 'ti-calendar-heart', tail: '님의 공지', fallback: '새 공지가 등록됐어요' },
}
const metaFor = (type) => FEED_META[type] ?? { cls: 'member', icon: 'ti-bell', tail: '님의 새 소식', fallback: '새 소식이 있어요' }
const initialOf = (name) => (name === '나' ? '나' : (name?.slice(-2, -1) || name?.slice(0, 1) || '?'))
const asList = (data) => (Array.isArray(data) ? data : (data?.items ?? []))

export default function RoomPreviewModal({ roomId, onClose, onEnter }) {
  const queryClient = useQueryClient()
  const [view, setView] = useState('main')

  const room = useQuery({ queryKey: ['room', roomId], queryFn: () => getRoom(roomId), enabled: !!roomId })
  const level = useQuery({ queryKey: ['room', roomId, 'level'], queryFn: () => getRoomLevel(roomId), enabled: !!roomId })
  const members = useQuery({ queryKey: ['room', roomId, 'members'], queryFn: () => getRoomMembers(roomId), enabled: !!roomId })
  const notis = useQuery({ queryKey: ['room', roomId, 'preview-noti'], queryFn: () => getNotifications(roomId, undefined, 0, 5), enabled: !!roomId })

  const r = room.data
  const memberList = asList(members.data)
  const memberCount = r?.memberCount ?? memberList.length

  const title = view === 'invite'
    ? <><i className="ti ti-link" aria-hidden="true" /> 친구 초대하기</>
    : view === 'edit'
      ? '방 프로필 편집'
      : <><i className="ti ti-home-heart" aria-hidden="true" /> {r?.name ?? '우정공간'}</>

  return (
    <div className="rp-backdrop" onClick={onClose}>
      <div className="rp-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="rp-head">
          <div className="rp-title">
            {view !== 'main' && (
              <button type="button" className="rp-gear" onClick={() => setView('main')} aria-label="뒤로"><i className="ti ti-arrow-left" aria-hidden="true" /></button>
            )}
            {title}
          </div>
          <div className="rp-head-actions">
            {view === 'main' && (
              <button type="button" className="rp-gear" onClick={() => setView('edit')} aria-label="방 프로필 편집"><i className="ti ti-settings" aria-hidden="true" /></button>
            )}
            <button type="button" className="rp-close" onClick={onClose} aria-label="닫기"><i className="ti ti-x" aria-hidden="true" /></button>
          </div>
        </div>

        <div className="rp-body">
          {room.isError ? (
            <div className="rp-state">방 정보를 불러오지 못했어요.</div>
          ) : room.isPending ? (
            <div className="rp-state">불러오는 중…</div>
          ) : view === 'invite' ? (
            <InviteView roomId={roomId} />
          ) : view === 'edit' ? (
            <EditView room={r} roomId={roomId} onDone={() => setView('main')}
              onSaved={() => { queryClient.invalidateQueries({ queryKey: ['room', roomId] }); queryClient.invalidateQueries({ queryKey: ['rooms'] }) }} />
          ) : (
            <MainView r={r} level={level.data} memberList={memberList} memberCount={memberCount}
              feed={asList(notis.data)} feedPending={notis.isPending}
              onInvite={() => setView('invite')} onEnter={onEnter} />
          )}
        </div>
      </div>
    </div>
  )
}

function MainView({ r, level, memberList, memberCount, feed, feedPending, onInvite, onEnter }) {
  const unread = feed.filter((n) => !n.isRead).length
  const lastActive = feed[0]?.createdAt
  const icon = vehicleIcon(r.transportType)
  const iconBg = r.themeColor && HEX6.test(r.themeColor) ? r.themeColor : 'var(--primary)'
  return (
    <>
      <div className="rp-inforow">
        <div className="rp-ico" style={{ background: iconBg }}>
          {r.coverPhotoUrl ? <img src={r.coverPhotoUrl} alt="" /> : <i className={`ti ${icon}`} aria-hidden="true" />}
        </div>
        <div style={{ minWidth: 0 }}>
          <div className="rp-intro">{r.description || '등록된 소개글이 없어요'}</div>
          <div className="rp-lvrow">
            <span className="rp-lv">Lv.{level?.level ?? r.friendshipLevel ?? 1}</span>
            {lastActive && <span className="rp-lvsub">· 활동 {relTime(lastActive)}</span>}
          </div>
        </div>
      </div>

      <div className="rp-mrow">
        {memberList.slice(0, 6).map((m, i) => (
          <span key={m.id ?? m.memberId ?? i} className="rp-av" style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}>{initialOf(m.nickname)}</span>
        ))}
        <span className="rp-mrow-n">{memberCount}명 참여 중</span>
      </div>

      <div className="rp-sechd">
        <span className="l"><i className="ti ti-history" aria-hidden="true" /> 새 소식</span>
        <span className="r">{unread > 0 ? unread : ''}</span>
      </div>

      {feedPending ? (
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
                <div className="rp-fi-tx"><div className="rp-fi-t">{who ? <><span className="who">{who}</span>{meta.tail}</> : meta.fallback}</div></div>
                <span className="rp-fi-time">{relTime(n.createdAt)}</span>
              </div>
            )
          })}
        </div>
      )}

      <button type="button" className="rp-invite-btn" onClick={onInvite}><i className="ti ti-link" aria-hidden="true" /> 친구 초대하기</button>
      <button type="button" className="rp-enter" onClick={onEnter}><i className="ti ti-rocket" aria-hidden="true" /> 우정공간 입장하기</button>
    </>
  )
}

function InviteView({ roomId }) {
  const queryClient = useQueryClient()
  const invites = useQuery({ queryKey: ['invites', roomId], queryFn: () => getInvites(roomId) })
  const list = asList(invites.data)
  const active = list.find((i) => i.status === 'ACTIVE') ?? list[0]
  const code = active?.inviteCode
  const link = code ? `${window.location.origin}/join/${code}` : ''
  const [copied, setCopied] = useState('')
  const ensured = useRef(false)

  const createMut = useMutation({
    mutationFn: () => createInvite(roomId, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['invites', roomId] }),
  })

  // 활성 코드가 없으면 1회 자동 발급(프로토타입은 항상 코드가 보임).
  useEffect(() => {
    if (invites.isSuccess && !code && !ensured.current) { ensured.current = true; createMut.mutate() }
  }, [invites.isSuccess, code, createMut])

  const copy = (text, which) => {
    navigator.clipboard?.writeText(text).then(() => { setCopied(which); setTimeout(() => setCopied(''), 1500) }).catch(() => {})
  }
  const share = () => {
    if (navigator.share) navigator.share({ title: '우정공간 초대', url: link }).catch(() => {})
    else copy(link, 'link')
  }

  if (invites.isPending || (!code && createMut.isPending)) return <div className="rp-state">초대 코드를 준비하는 중…</div>
  if (!code) return <div className="rp-state">초대 코드를 만들지 못했어요.</div>

  return (
    <>
      <p className="rp-invite-desc">링크를 보내면 친구가 탭 한 번으로 <b>가입 신청</b>할 수 있어요. 참여 멤버 1명이 수락하면 바로 입장해요.</p>
      <div className="link-box">
        <span className="link-url">{link}</span>
        <button type="button" className="mini-copy" onClick={() => copy(link, 'link')}><i className="ti ti-copy" aria-hidden="true" /> {copied === 'link' ? '복사됨' : '복사'}</button>
      </div>
      <button type="button" className="share-btn" onClick={share}><i className="ti ti-send" aria-hidden="true" /> 링크 공유하기</button>
      <div className="or-div">또는 코드로</div>
      <div className="link-box">
        <span className="code-big">{code}</span>
        <button type="button" className="mini-copy" style={{ marginLeft: 'auto' }} onClick={() => copy(code, 'code')}><i className="ti ti-copy" aria-hidden="true" /> {copied === 'code' ? '복사됨' : '복사'}</button>
      </div>
      <button type="button" className="regen" disabled={createMut.isPending} onClick={() => createMut.mutate()}>
        <i className="ti ti-refresh" aria-hidden="true" /> {createMut.isPending ? '재발급 중…' : '코드 재발급 · 유출되면 옛 코드가 무효화돼요'}
      </button>
    </>
  )
}

function EditView({ room, roomId, onDone, onSaved }) {
  const [name, setName] = useState(room.name ?? '')
  const [description, setDescription] = useState(room.description ?? '')
  const [themeColor, setThemeColor] = useState(HEX6.test(room.themeColor ?? '') ? room.themeColor : ROOM_THEME_COLORS[0])
  const [transportType, setTransportType] = useState(room.transportType ?? 'airplane')
  const [message, setMessage] = useState('')

  const { mutate, isPending } = useMutation({
    mutationFn: () => updateRoom(roomId, { name: name.trim(), description: description.trim() || null, themeColor, transportType }),
    onSuccess: () => { onSaved(); onDone() },
    onError: (error) => setMessage(error.message ?? '방 정보를 저장하지 못했어요.'),
  })
  const submit = () => {
    if (!name.trim()) { setMessage('방 이름을 입력해주세요.'); return }
    setMessage('')
    mutate()
  }

  return (
    <>
      <div className="ed-lbl">대표 사진 <span className="h mute">이동수단 아이콘 + 테마 색상으로 표시돼요</span></div>
      <div className="ed-photo" style={{ background: `linear-gradient(150deg, ${themeColor}, rgba(0,0,0,0.3))` }}>
        <i className={`ti ${vehicleIcon(transportType)}`} aria-hidden="true" />
      </div>

      <div className="ed-lbl">테마 색상 <span className="h mute">대표 사진 · 보딩패스 카드 배경</span></div>
      <div className="ed-swatches">
        {ROOM_THEME_COLORS.map((c) => (
          <button type="button" key={c} className={`ed-swatch${themeColor === c ? ' on' : ''}`} style={{ background: c }} aria-label={`색상 ${c}`} onClick={() => setThemeColor(c)} />
        ))}
      </div>

      <div className="ed-lbl">이동수단 <span className="h mute">대표 사진 · 보딩패스 카드 아이콘</span></div>
      <div className="ed-chips">
        {VEHICLES.map((v) => (
          <button type="button" key={v.value} className={`ed-chip${transportType === v.value ? ' on' : ''}`} onClick={() => setTransportType(v.value)}>
            <i className={`ti ${v.icon}`} aria-hidden="true" /> {v.label}
          </button>
        ))}
      </div>

      <div className="ed-lbl">우정공간 이름 <span className="h">바꾸면 멤버에게 알림</span></div>
      <input className="ed-in" value={name} maxLength={100} placeholder="방 이름 (2~20자)" onChange={(e) => setName(e.target.value)} />

      <div className="ed-lbl">소개글 <span className="h mute">공용 메모 · 60자</span></div>
      <textarea className="ed-in" value={description} maxLength={60} onChange={(e) => setDescription(e.target.value)} />
      <div className="cnt">{description.length} / 60</div>

      <div className="notify-b">
        <i className="ti ti-bell-ringing" aria-hidden="true" />
        <span>여기서 바꾼 내용은 <b>모든 멤버에게 알림</b>으로 남아요. 방장이 없으니 몰래 바뀌지 않게요.</span>
      </div>

      {message && <div className="err-msg" role="alert" style={{ marginTop: 10 }}>{message}</div>}
      <div className="ed-actions">
        <button type="button" className="ed-cancel" onClick={onDone}>취소</button>
        <button type="button" className="ed-save" disabled={isPending} onClick={submit}>{isPending ? '저장 중…' : '저장하기'}</button>
      </div>
    </>
  )
}

import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import './roomlist.proto.css'
import { getRooms, createRoom, toggleRoomFavorite, leaveRoom } from '../../../api/room'
import { getMyJoinRequests, requestJoin, cancelJoinRequest } from '../../../api/invite'
import { getMe } from '../../../api/user'
import { useAuthStore } from '../../../stores/authStore'
import Settings from '../../../components/Settings/Settings'
import RoomPreviewModal from './RoomPreviewModal'

const DAY = 86400000
const PAGE_SIZE = 9
const ORDER_KEY = 'clov-room-order'

const ddayOf = (planDate) => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((new Date(`${planDate}T00:00:00`).getTime() - today.getTime()) / DAY)
}
const ddayLabel = (n) => (n === 0 ? 'D-DAY' : n > 0 ? `D-${n}` : `D+${-n}`)
// 목적지 헤드라인 = 다음 약속 제목의 첫 단어(최대 6자), 없으면 "자유".
const shortDest = (label) => (label || '').trim().split(/\s+/)[0].slice(0, 6)

// 이동수단 = 프로토타입과 동일(비행기/시외버스/배/기차).
const TRANSPORTS = [
  { value: 'airplane', label: '비행기', icon: 'ti-plane' },
  { value: 'bus', label: '시외버스', icon: 'ti-bus' },
  { value: 'ship', label: '배', icon: 'ti-ship' },
  { value: 'train', label: '기차', icon: 'ti-train' },
]
// 렌더용 아이콘 — 레거시 값(car 등)도 안전하게 매핑.
const VEHICLE_ICON = { airplane: 'ti-plane', plane: 'ti-plane', bus: 'ti-bus', ship: 'ti-ship', train: 'ti-train', car: 'ti-car' }
const vehicleIcon = (v) => VEHICLE_ICON[v] ?? 'ti-plane'
const THEME_COLORS = ['#7CC6A6', '#8e4585', '#2a6f7d', '#b5761f', '#3a7d44', '#d4537e']

const SORTS = [
  { key: 'default', label: '내 순서', icon: 'ti-layout-grid' },
  { key: 'latest', label: '최신순', icon: 'ti-clock' },
  { key: 'oldest', label: '오래된 순', icon: 'ti-history' },
  { key: 'favorite', label: '즐겨찾기', icon: 'ti-star' },
]

// 티켓 헤드 톤 — 프로토타입 TICKET_TONES(방 색이 없을 때) / 방 themeColor(있으면 그 색으로 그라디언트).
const TICKET_TONES = [
  { grad: 'linear-gradient(150deg,#22705a,#123f31)', kick: '#a7d3bf' },
  { grad: 'linear-gradient(150deg,#1f6b6b,#0f3d3d)', kick: '#9ecfcf' },
  { grad: 'linear-gradient(150deg,#4a6b3a,#2a4020)', kick: '#c1d3a5' },
  { grad: 'linear-gradient(150deg,#6b8f71,#3f5c43)', kick: '#dcebde' },
  { grad: 'linear-gradient(150deg,#2563a8,#123a63)', kick: '#aecdec' },
  { grad: 'linear-gradient(150deg,#7c5cbf,#432f73)', kick: '#ddd0f2' },
  { grad: 'linear-gradient(150deg,#d1603d,#8a3820)', kick: '#f6cdb4' },
  { grad: 'linear-gradient(150deg,#c98a2e,#7a5216)', kick: '#f3ddaa' },
  { grad: 'linear-gradient(150deg,#c94f7c,#7a2c4a)', kick: '#f5c3d6' },
]
const HEX6 = /^#[0-9a-fA-F]{6}$/
const clampByte = (v) => Math.max(0, Math.min(255, Math.round(v)))
const hexToRgb = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255] }
const rgbToHex = (r, g, b) => '#' + [r, g, b].map((v) => clampByte(v).toString(16).padStart(2, '0')).join('')
const darken = (h, f) => { const [r, g, b] = hexToRgb(h); return rgbToHex(r * f, g * f, b * f) }
const lighten = (h, f) => { const [r, g, b] = hexToRgb(h); return rgbToHex(r + (255 - r) * f, g + (255 - g) * f, b + (255 - b) * f) }
const hashIdx = (id, n) => { const s = String(id); let h = 0; for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h % n }
const headTone = (room) => {
  const c = room.themeColor
  if (c && HEX6.test(c)) return { grad: `linear-gradient(150deg, ${c}, ${darken(c, 0.55)})`, kick: lighten(c, 0.55) }
  return TICKET_TONES[hashIdx(room.id, TICKET_TONES.length)]
}

// 방 id 기반 결정적 스카이라인 — 프로토타입 buildSkyline과 동일(6~7개 넓은 막대 + 오른쪽 여백).
const skyline = (seed) => {
  const base = hashIdx(seed, 997) + 1
  let s = base * 9301 + 49297
  const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280 }
  const n = 6 + (base % 2)
  return Array.from({ length: n }, () => ({ w: 7 + Math.floor(rnd() * 5), h: 12 + Math.floor(rnd() * 15) }))
}
const BARCODE = [2, 1, 3, 1, 2, 1, 3, 1, 2]

const Icon = ({ name, style }) => <i className={`ti ${name}`} style={style} aria-hidden="true" />

export default function RoomList() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const clear = useAuthStore((state) => state.clear)

  const [settingsOpen, setSettingsOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [previewId, setPreviewId] = useState(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [dragId, setDragId] = useState(null)
  const [overId, setOverId] = useState(null)

  const me = useQuery({ queryKey: ['me'], queryFn: getMe })

  // 아바타 드롭다운 바깥 클릭 시 닫기.
  useEffect(() => {
    if (!menuOpen) return undefined
    const onDocClick = (e) => { if (!e.target.closest('.rl-avatar-wrap')) setMenuOpen(false) }
    document.addEventListener('click', onDocClick)
    return () => document.removeEventListener('click', onDocClick)
  }, [menuOpen])

  // 모바일 터치 드래그 — document에 non-passive touchmove(React onTouchMove는 passive라 preventDefault 불가).
  // 드래그 중이면 스크롤 차단 + 손가락 밑 카드를 대상으로 표시.
  const touchRef = useRef({ id: null, timer: null, startY: 0 })
  useEffect(() => {
    const onTouchMove = (e) => {
      const d = touchRef.current
      const t = e.touches[0]
      if (!t) return
      if (d.id == null) {
        if (d.timer != null && Math.abs(t.clientY - d.startY) > 10) { clearTimeout(d.timer); d.timer = null }
        return
      }
      e.preventDefault()
      const el = document.elementFromPoint(t.clientX, t.clientY)
      const card = el && el.closest('.room-card[data-room-id]')
      setOverId(card ? card.getAttribute('data-room-id') : null)
    }
    document.addEventListener('touchmove', onTouchMove, { passive: false })
    return () => document.removeEventListener('touchmove', onTouchMove)
  }, [])
  const [sort, setSort] = useState('default')
  const [joinCode, setJoinCode] = useState('')
  const [joinMessage, setJoinMessage] = useState('')
  const [page, setPage] = useState(0)
  const [editMode, setEditMode] = useState(false)
  const [dismissed, setDismissed] = useState([])
  const [roomOrder, setRoomOrder] = useState(() => {
    try { return JSON.parse(localStorage.getItem(ORDER_KEY) || '[]') } catch { return [] }
  })
  const saveOrder = (ids) => {
    setRoomOrder(ids)
    try { localStorage.setItem(ORDER_KEY, JSON.stringify(ids)) } catch { /* storage 차단 무시 */ }
  }

  const rooms = useQuery({ queryKey: ['rooms'], queryFn: getRooms })
  const myRequests = useQuery({ queryKey: ['join-requests', 'mine'], queryFn: getMyJoinRequests })
  const requestItems = (myRequests.data?.items ?? []).filter((r) => !dismissed.includes(r.id))

  const sortedRooms = useMemo(() => {
    const list = [...(rooms.data?.items ?? [])]
    if (sort === 'latest') return list.sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
    if (sort === 'oldest') return list.sort((a, b) => (a.createdAt ?? '').localeCompare(b.createdAt ?? ''))
    if (sort === 'favorite') return list.filter((r) => r.isFavorite)
    if (roomOrder.length) {
      return list.sort((a, b) => {
        const ia = roomOrder.indexOf(a.id)
        const ib = roomOrder.indexOf(b.id)
        if (ia === -1 && ib === -1) return 0
        if (ia === -1) return 1
        if (ib === -1) return -1
        return ia - ib
      })
    }
    return list
  }, [rooms.data, sort, roomOrder])

  const totalPages = Math.max(1, Math.ceil(sortedRooms.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages - 1)
  const visibleRooms = editMode ? sortedRooms : sortedRooms.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE)

  const favoriteMutation = useMutation({
    mutationFn: ({ roomId, isFavorite }) => toggleRoomFavorite(roomId, isFavorite),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rooms'] }),
  })
  const joinMutation = useMutation({
    mutationFn: () => requestJoin({ inviteCode: joinCode.trim().toUpperCase() }),
    onSuccess: () => {
      setJoinCode('')
      setJoinMessage('가입 신청이 접수됐어요. 멤버가 수락하면 참여가 확정돼요.')
      queryClient.invalidateQueries({ queryKey: ['join-requests', 'mine'] })
    },
    onError: (error) => setJoinMessage(error.message ?? '참여에 실패했어요.'),
  })
  const cancelReqMutation = useMutation({
    mutationFn: (id) => cancelJoinRequest(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['join-requests', 'mine'] }),
  })

  const leaveMutation = useMutation({
    mutationFn: (id) => leaveRoom(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rooms'] }),
  })
  const handleLeave = (room) => {
    const msg = (room.memberCount ?? 1) <= 1
      ? `"${room.name}"에서 나갈까요? 지금 마지막 멤버라 30일간 보관되고, 코드로 되살릴 수 있어요.`
      : `"${room.name}"에서 나갈까요? 남은 멤버에게 나갔다고 알림이 가요.`
    if (window.confirm(msg)) leaveMutation.mutate(room.id)
  }

  // 드래그 앤 드롭 재정렬 — 프로토타입과 동일(끈 방을 놓은 카드의 자리에 꽂음 → "내 순서" 저장).
  const reorder = (srcId, tgtId) => {
    if (srcId == null || srcId === tgtId) return
    const ids = sortedRooms.map((r) => r.id)
    const from = ids.indexOf(srcId)
    const to = ids.indexOf(tgtId)
    if (from === -1 || to === -1) return
    const [moved] = ids.splice(from, 1)
    ids.splice(to, 0, moved)
    saveOrder(ids)
    if (sort !== 'default') setSort('default')
  }

  // 모바일: 롱프레스(300ms)로 드래그 시작, 손 떼면 놓은 카드 자리에 재정렬.
  const onCardTouchStart = (room) => (e) => {
    const y = e.touches[0]?.clientY ?? 0
    if (touchRef.current.timer != null) clearTimeout(touchRef.current.timer)
    const timer = setTimeout(() => { touchRef.current.id = room.id; setDragId(room.id) }, 300)
    touchRef.current = { id: null, timer, startY: y }
  }
  const resetTouch = () => {
    if (touchRef.current.timer != null) clearTimeout(touchRef.current.timer)
    touchRef.current = { id: null, timer: null, startY: 0 }
    setDragId(null)
    setOverId(null)
  }
  const onCardTouchEnd = (e) => {
    const d = touchRef.current
    if (d.timer != null) clearTimeout(d.timer)
    if (d.id != null) {
      const t = e.changedTouches[0]
      const el = t && document.elementFromPoint(t.clientX, t.clientY)
      const card = el && el.closest('.room-card[data-room-id]')
      const attr = card && card.getAttribute('data-room-id')
      const target = attr != null ? sortedRooms.find((r) => String(r.id) === attr) : null
      if (target) reorder(d.id, target.id)
    }
    touchRef.current = { id: null, timer: null, startY: 0 }
    setDragId(null)
    setOverId(null)
  }

  return (
    <div className="proto-roomlist">
      <header className="rl-header">
        <div className="rl-brand"><Icon name="ti-clover" /> Clov.</div>
        <div className="rl-header-right">
          <div className="rl-avatar-wrap">
            <button type="button" className="rl-avatar" onClick={() => setMenuOpen((v) => !v)}
              aria-haspopup="true" aria-expanded={menuOpen} aria-label="내 메뉴">
              {me.data?.profileImageUrl
                ? <img src={me.data.profileImageUrl} alt="" />
                : (me.data?.nickname?.trim()?.[0] ?? '나')}
            </button>
            {menuOpen && (
              <ul className="rl-dropdown" role="menu">
                <li role="menuitem" tabIndex={0}
                  onClick={() => { setMenuOpen(false); setSettingsOpen(true) }}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setMenuOpen(false); setSettingsOpen(true) } }}>
                  <Icon name="ti-settings" /> 사용자설정
                </li>
                <li role="menuitem" tabIndex={0}
                  onClick={() => { setMenuOpen(false); clear() }}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setMenuOpen(false); clear() } }}>
                  로그아웃
                </li>
              </ul>
            )}
          </div>
        </div>
      </header>

      <main className="main">
        <div className="toolbar">
          <div className="greeting"><Icon name="ti-users" /> 우리 우정공간들이에요</div>
        </div>

        {editMode && (
          <div className="edit-banner show">
            <Icon name="ti-arrows-move" /> 카드를 끌어다 원하는 자리에 놓으면 &quot;내 순서&quot;로 저장돼요. 🗑️로 방에서 나갈 수 있어요.
          </div>
        )}

        {requestItems.length > 0 && (
          <div className="req-section">
            <div className="req-head"><Icon name="ti-mailbox" /> 요청한 방</div>
            <div className="req-grid">
              {requestItems.map((r) => {
                const gone = r.roomStatus !== 'ACTIVE'
                const kind = gone ? 'vanished' : r.status === 'REJECTED' ? 'rejected' : 'pending'
                const label = gone ? '사라진 방' : r.status === 'REJECTED' ? '거절됨' : '수락 대기 중'
                const statusIcon = gone ? 'ti-bubble' : r.status === 'REJECTED' ? 'ti-x' : 'ti-clock'
                return (
                  <div className={`req-card ${kind}`} key={r.id}>
                    <span className={`req-status ${kind}`}><Icon name={statusIcon} /> {label}</span>
                    <div className="req-name">{r.roomName}</div>
                    {kind === 'pending'
                      ? <div className="req-meta">멤버가 수락하면 참여가 확정돼요</div>
                      : <div className="req-note">{gone ? '모든 멤버가 나가 방이 사라졌어요. 신청도 취소됐어요.' : '신청이 거절됐어요.'}</div>}
                    <div className="req-actions">
                      {kind === 'pending' && (
                        <button type="button" className="req-btn" disabled={cancelReqMutation.isPending}
                          onClick={() => cancelReqMutation.mutate(r.id)}>요청 취소</button>
                      )}
                      {kind === 'rejected' && (
                        <button type="button" className="req-btn primary" onClick={() => navigate('/join')}>재요청</button>
                      )}
                      {kind !== 'pending' && (
                        <button type="button" className="req-btn" onClick={() => setDismissed((d) => [...d, r.id])}>지우기</button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div className="filter-row">
          <div className="filter-tabs">
            {SORTS.map((s) => (
              <button type="button" key={s.key} className={`filter-btn${sort === s.key ? ' active' : ''}`} onClick={() => setSort(s.key)}>
                <Icon name={s.icon} /> {s.label}
              </button>
            ))}
          </div>
          <div className="toolbar-right">
            <input
              className="code-input"
              value={joinCode}
              maxLength={20}
              placeholder="방 코드 입력"
              onChange={(e) => { setJoinCode(e.target.value); setJoinMessage('') }}
              onKeyDown={(e) => e.key === 'Enter' && joinCode.trim() && joinMutation.mutate()}
            />
            <button type="button" className="btn-enter" disabled={!joinCode.trim() || joinMutation.isPending} onClick={() => joinMutation.mutate()}>입장</button>
            <button type="button" className="btn-create" onClick={() => setCreateOpen(true)}><Icon name="ti-plus" /> 방 만들기</button>
            <button type="button" className={`btn-edit${editMode ? ' active' : ''}`} onClick={() => setEditMode((v) => !v)}>{editMode ? '완료' : '편집'}</button>
          </div>
        </div>
        {joinMessage && <div className="rl-msg" role="alert">{joinMessage}</div>}

        {rooms.isPending && <div className="rl-state">불러오는 중…</div>}
        {rooms.isError && <div className="rl-state">목록을 불러오지 못했습니다. {rooms.error?.message}</div>}
        {rooms.isSuccess && sortedRooms.length === 0 && (
          <div className="rl-state">{sort === 'favorite' ? '즐겨찾기한 우정공간이 없어요.' : '아직 우정공간이 없어요. "방 만들기"로 첫 공간을 만들어보세요.'}</div>
        )}

        {sortedRooms.length > 0 && (
          <div className="room-grid">
            {visibleRooms.map((room) => {
              const tone = headTone(room)
              const hasPlan = Boolean(room.nextPlan?.planDate)
              const dday = hasPlan ? ddayLabel(ddayOf(room.nextPlan.planDate)) : null
              const sky = skyline(room.id)
              return (
                <div
                  key={room.id}
                  data-room-id={room.id}
                  className={`room-card ticket${editMode ? ' edit-mode' : ''}${dragId === room.id ? ' dragging' : ''}${String(overId) === String(room.id) ? ' drag-over' : ''}`}
                  role={editMode ? undefined : 'button'}
                  tabIndex={editMode ? undefined : 0}
                  draggable={editMode || undefined}
                  onClick={() => !editMode && setPreviewId(room.id)}
                  onKeyDown={(e) => { if (!editMode && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); setPreviewId(room.id) } }}
                  onDragStart={editMode ? (e) => { setDragId(room.id); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(room.id)) } : undefined}
                  onDragOver={editMode ? (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; if (dragId != null && room.id !== dragId) setOverId(room.id) } : undefined}
                  onDragLeave={editMode ? () => setOverId((o) => (o === room.id ? null : o)) : undefined}
                  onDrop={editMode ? (e) => { e.preventDefault(); reorder(dragId, room.id); setDragId(null); setOverId(null) } : undefined}
                  onDragEnd={editMode ? () => { setDragId(null); setOverId(null) } : undefined}
                  onTouchStart={editMode ? onCardTouchStart(room) : undefined}
                  onTouchEnd={editMode ? onCardTouchEnd : undefined}
                  onTouchCancel={editMode ? resetTouch : undefined}
                >
                  {editMode && (
                    <button type="button" className="edit-del-btn" aria-label={`${room.name} 나가기`}
                      onClick={(e) => { e.stopPropagation(); handleLeave(room) }}
                      onTouchStart={(e) => e.stopPropagation()} onDragStart={(e) => e.preventDefault()}>
                      <Icon name="ti-trash" />
                    </button>
                  )}
                  <div className="tk-body">
                    <div className="tk-head" style={{ background: tone.grad }}>
                      <div className="tk-route">
                        <div>
                          <div className="tk-kick" style={{ color: tone.kick }}>오늘</div>
                          <div className="tk-code">CLOV</div>
                        </div>
                        <div className="tk-mid" style={{ color: tone.kick }}>┈<Icon name={vehicleIcon(room.transportType)} />┈</div>
                        <div className="tk-dest">
                          <div className="tk-kick" style={{ color: tone.kick }}>{hasPlan ? dday : '약속 없음'}</div>
                          <div className="tk-code" style={hasPlan ? undefined : { fontSize: '13px' }}>{hasPlan ? shortDest(room.nextPlan.title) : '자유'}</div>
                        </div>
                      </div>
                      <div className="tk-skyline">
                        {sky.map((b, k) => (<i key={k} style={{ width: `${b.w}px`, height: `${b.h}px` }} />))}
                        <i style={{ flex: 1, background: 'none' }} />
                      </div>
                    </div>

                    <div className="tk-pax">
                      <div style={{ minWidth: 0 }}>
                        <div className="tk-pax-kick">우정공간</div>
                        <div className="tk-name">{room.name}</div>
                        <div className="tk-avs">
                          <span className="tk-av" style={{ background: 'var(--primary)' }}>나</span>
                          {room.memberCount > 1 && <span className="tk-av" style={{ background: '#6a7e73' }}>+{room.memberCount - 1}</span>}
                        </div>
                      </div>
                      <div className="tk-corner">
                        <button type="button" className="tk-star"
                          aria-label={room.isFavorite ? '즐겨찾기 해제' : '즐겨찾기'}
                          onClick={(e) => { e.stopPropagation(); favoriteMutation.mutate({ roomId: room.id, isFavorite: !room.isFavorite }) }}>
                          <Icon name={room.isFavorite ? 'ti-star-filled' : 'ti-star'} style={{ color: room.isFavorite ? '#e6a23c' : '#c8c2b4' }} />
                        </button>
                      </div>
                    </div>

                    {hasPlan ? (
                      <div className="tk-grid">
                        <div>
                          <div className="tk-cell-lbl">다음 약속</div>
                          <div className="tk-cell-val">{room.nextPlan.title}</div>
                        </div>
                        <div>
                          <div className="tk-cell-lbl">D-DAY</div>
                          <div className="tk-cell-val accent">{dday}</div>
                        </div>
                      </div>
                    ) : (
                      <div className="tk-grid single">
                        <div className="tk-cell-lbl">다음 약속</div>
                        <div className="tk-cell-val empty"><Icon name="ti-plus" /> 약속을 정해보세요</div>
                      </div>
                    )}

                    <div className="tk-perf" />
                    <div
                      className="tk-stub"
                      role={editMode ? undefined : 'button'}
                      tabIndex={editMode ? undefined : 0}
                      aria-label={editMode ? undefined : `${room.name} 바로 입장`}
                      onClick={editMode ? undefined : (e) => { e.stopPropagation(); navigate(`/rooms/${room.id}`) }}
                      onKeyDown={editMode ? undefined : (e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); e.preventDefault(); navigate(`/rooms/${room.id}`) } }}
                    >
                      <div className="tk-barcode">{BARCODE.map((w, k) => <i key={k} style={{ width: `${w}px` }} />)}</div>
                      <span className="tk-enter">입장 <Icon name="ti-chevron-right" /></span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {!editMode && totalPages > 1 && (
          <div className="pagination">
            <button type="button" className="page-btn" disabled={safePage === 0} onClick={() => setPage(safePage - 1)} aria-label="이전"><Icon name="ti-chevron-left" /></button>
            {Array.from({ length: totalPages }, (_, i) => (
              <button type="button" key={i} className={`page-btn${safePage === i ? ' active' : ''}`} onClick={() => setPage(i)}>{i + 1}</button>
            ))}
            <button type="button" className="page-btn" disabled={safePage === totalPages - 1} onClick={() => setPage(safePage + 1)} aria-label="다음"><Icon name="ti-chevron-right" /></button>
          </div>
        )}
      </main>

      {createOpen && (
        <CreateRoomModal
          onClose={() => setCreateOpen(false)}
          onCreated={(room) => { queryClient.invalidateQueries({ queryKey: ['rooms'] }); navigate(`/rooms/${room.id}`) }}
        />
      )}
      {settingsOpen && <Settings onClose={() => setSettingsOpen(false)} />}
      {previewId != null && (
        <RoomPreviewModal
          roomId={previewId}
          onClose={() => setPreviewId(null)}
          onEnter={() => navigate(`/rooms/${previewId}`)}
        />
      )}
    </div>
  )
}

function CreateRoomModal({ onClose, onCreated }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [transportType, setTransportType] = useState('airplane')
  const [themeColor, setThemeColor] = useState(THEME_COLORS[0])
  const [message, setMessage] = useState('')

  const { mutate, isPending } = useMutation({
    mutationFn: createRoom,
    onSuccess: onCreated,
    onError: (error) => setMessage(error.message ?? '우정공간을 만들지 못했습니다.'),
  })

  const submit = () => {
    setMessage('')
    if (!name.trim()) { setMessage('공간 이름을 입력해주세요.'); return }
    mutate({ name: name.trim(), description: description.trim() || null, themeColor, transportType, coverPhotoUrl: null, coverTitle: null })
  }

  return (
    <div className="rl-overlay" onClick={onClose}>
      <div className="rl-modal" onClick={(e) => e.stopPropagation()}>
        <div className="rl-modal-head">
          <div className="rl-modal-title"><Icon name="ti-plus" /> 새 우정공간 만들기</div>
          <button type="button" className="rl-modal-close" onClick={onClose} aria-label="닫기"><Icon name="ti-x" /></button>
        </div>
        <div className="rl-modal-sub">친구들과 함께할 공간을 만들어보세요.</div>

        <div className="field-wrap">
          <div className="field-label">대표 사진 <span className="field-hint">이동수단 아이콘 + 테마 색상으로 표시돼요</span></div>
          <div className="cover-preview" style={{ background: `linear-gradient(135deg, ${themeColor}, rgba(0,0,0,0.28))` }}>
            <Icon name={vehicleIcon(transportType)} />
          </div>
        </div>

        <div className="field-wrap">
          <div className="field-label">테마 색상</div>
          <div className="swatches">
            {THEME_COLORS.map((c) => (
              <button type="button" key={c} className={`swatch${themeColor === c ? ' on' : ''}`} style={{ background: c }}
                aria-label={`색상 ${c}`} onClick={() => setThemeColor(c)} />
            ))}
          </div>
        </div>

        <div className="field-wrap">
          <div className="field-label">이동 수단</div>
          <div className="chips">
            {TRANSPORTS.map((t) => (
              <button type="button" key={t.value} className={`chip${transportType === t.value ? ' on' : ''}`} onClick={() => setTransportType(t.value)}>
                <Icon name={t.icon} /> {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="field-wrap">
          <div className="field-label"><label htmlFor="room-name">우정공간 이름 *</label></div>
          <input className="text-input" id="room-name" value={name} placeholder="예: 제주 가치가자" maxLength={100} onChange={(e) => setName(e.target.value)} autoFocus />
        </div>

        <div className="field-wrap">
          <div className="field-label"><label htmlFor="room-desc">소개글 (선택, 60자)</label></div>
          <input className="text-input" id="room-desc" value={description} placeholder="우리 공간을 한 줄로 소개해보세요" maxLength={60} onChange={(e) => setDescription(e.target.value)} />
        </div>

        {message && <div className="err-msg" role="alert">{message}</div>}
        <button type="button" className="btn-submit" onClick={submit} disabled={isPending}>
          {isPending ? '만드는 중…' : '우정공간 만들기'}
        </button>
      </div>
    </div>
  )
}

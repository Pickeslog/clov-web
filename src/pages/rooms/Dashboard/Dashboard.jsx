import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import './dashboard.proto.css'
import { getRoom, getRoomLevel, getRoomMembers, updateStatusMessage } from '../../../api/room'
import { getPlans } from '../../../api/plan'
import { getMemories } from '../../../api/memory'
import { useAuthStore } from '../../../stores/authStore'
import { currentUserIdFromToken } from '../../../lib/jwt'
import Settings from '../../../components/Settings/Settings'

// 우정 성장 티어(프로토타입 desktop.js 정본). 레벨은 111×7=777 → 7티어로 묶음.
const TIERS = [
  { name: '씨앗의 우정', icon: '🌱', max: 111 },
  { name: '새싹의 우정', icon: '🌿', max: 222 },
  { name: '초록 클로버 우정', icon: '💚', max: 333 },
  { name: '무성한 클로버 들판', icon: '🍀', max: 444 },
  { name: '반짝이는 클로버 우정', icon: '🌟', max: 555 },
  { name: '황금빛 클로버 우정', icon: '👑', max: 666 },
  { name: '전설의 클로버 우정', icon: '💎', max: 777 },
]
const tierFor = (level) => TIERS.find((t) => (level ?? 1) <= t.max) ?? TIERS[TIERS.length - 1]

const MINI_AV_COLORS = ['#1b4332', '#52b788', '#74c69d', '#95d5b2']

const DAY = 86400000
// 백엔드는 오프셋 없는 UTC(LocalDateTime)를 반환 → Z 붙여 파싱.
const parseUtc = (value) => new Date(value.endsWith('Z') ? value : `${value}Z`)
// 계절: 이미지 키 + 한글 라벨.
const seasonKey = (month) => (month >= 3 && month <= 5 ? 'spring' : month >= 6 && month <= 8 ? 'summer' : month >= 9 && month <= 11 ? 'fall' : 'winter')
const SEASON_LABEL = { spring: '봄', summer: '여름', fall: '가을', winter: '겨울' }

const daysTogether = (createdAt) => {
  if (!createdAt) return 1
  return Math.floor((Date.now() - parseUtc(createdAt).getTime()) / DAY) + 1
}
const ddayOf = (planDate) => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((new Date(`${planDate}T00:00:00`).getTime() - today.getTime()) / DAY)
}
const ddayLabel = (n) => (n === 0 ? 'D-DAY' : n > 0 ? `D-${n}` : `D+${-n}`)
const initialOf = (name) => (name || '?').trim().slice(0, 1)
// 상태 메시지 가중 길이(한글 2, 그 외 1) — 프로토타입 "한글 20자 / 영어 40자".
const weightedLen = (s) => [...(s || '')].reduce((n, ch) => n + (/[㄰-㆏가-힣]/.test(ch) ? 2 : 1), 0)
const STATUS_MAX = 40

export default function Dashboard() {
  const { roomId } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const clear = useAuthStore((state) => state.clear)
  const accessToken = useAuthStore((state) => state.accessToken)
  const currentUserId = currentUserIdFromToken(accessToken)

  const room = useQuery({ queryKey: ['room', roomId], queryFn: () => getRoom(roomId) })
  const level = useQuery({ queryKey: ['room', roomId, 'level'], queryFn: () => getRoomLevel(roomId) })
  const members = useQuery({ queryKey: ['room', roomId, 'members'], queryFn: () => getRoomMembers(roomId) })
  const plans = useQuery({ queryKey: ['plans', roomId, { status: 'SCHEDULED' }], queryFn: () => getPlans(roomId, { status: 'SCHEDULED' }) })
  const memories = useQuery({ queryKey: ['memories', roomId], queryFn: () => getMemories(roomId) })

  // null = 미편집(서버값 표시). 문자열 = 사용자가 편집 중.
  const [statusDraft, setStatusDraft] = useState(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [membersOpen, setMembersOpen] = useState(false)

  useEffect(() => {
    if (!menuOpen) return undefined
    const onDoc = (e) => { if (!e.target.closest('.clov-hdr-avatar-wrap')) setMenuOpen(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [menuOpen])

  const statusMutation = useMutation({
    mutationFn: (message) => updateStatusMessage(roomId, message),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['room', roomId] })
      setStatusDraft(null) // 서버값으로 재동기화
    },
  })

  if (room.isPending) {
    return <div className="proto-dashboard"><div className="dash-main"><div className="dash-state">불러오는 중…</div></div></div>
  }
  if (room.isError) {
    return (
      <div className="proto-dashboard">
        <div className="dash-main">
          <div className="dash-state">
            우정공간을 불러오지 못했습니다.
            <button type="button" onClick={() => navigate('/')}>돌아가기</button>
          </div>
        </div>
      </div>
    )
  }

  const data = room.data
  const lv = level.data
  const levelNum = lv?.friendshipLevel ?? data.friendshipLevel ?? 1
  const tier = tierFor(levelNum)
  const progress = lv?.expForNextLevel ? Math.min(100, Math.round((lv.expPoint / lv.expForNextLevel) * 100)) : 0
  const memberItems = members.data?.items ?? []
  const days = daysTogether(data.createdAt)
  const sKey = seasonKey(new Date().getMonth() + 1)
  const track = (memories.data?.items ?? []).length || 1

  const upcoming = (plans.data?.items ?? [])
    .filter((p) => p.planDate && ddayOf(p.planDate) >= 0)
    .sort((a, b) => a.planDate.localeCompare(b.planDate))
    .slice(0, 3)
  const memoryItems = (memories.data?.items ?? []).slice(0, 6)

  const savedStatus = data.myStatusMessage ?? ''
  const statusValue = statusDraft ?? savedStatus
  const statusWeight = weightedLen(statusValue)
  const statusDirty = statusDraft !== null && statusDraft.trim() !== savedStatus.trim()
  const statusOver = statusWeight > STATUS_MAX
  const go = (path) => navigate(`/rooms/${roomId}/${path}`)

  return (
    <div className="proto-dashboard">
      <div className="dash-main">
        {/* 헤더 */}
        <header className="clov-hdr">
          <div className="clov-hdr-left">
            <button type="button" className="clov-hdr-logo" onClick={() => navigate('/')}>🍀 Clov.</button>
            <nav className="clov-hdr-nav">
              <button type="button" className="clov-hdr-nav-btn active">우정공간</button>
              <button type="button" className="clov-hdr-nav-btn" onClick={() => go('feed')}>추억피드</button>
              <button type="button" className="clov-hdr-nav-btn" onClick={() => go('letters')}>행운편지</button>
              <button type="button" className="clov-hdr-nav-btn" onClick={() => go('schedule')}>일정계획</button>
            </nav>
          </div>
          <div className="clov-hdr-right">
            <button type="button" className="clov-hdr-icon-btn" aria-label="알림" onClick={() => go('notifications')}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            </button>
            <div className="clov-hdr-avatar-wrap">
              <button type="button" className="clov-hdr-avatar" onClick={() => setMenuOpen((v) => !v)} aria-haspopup="menu">
                {initialOf(memberItems.find((m) => String(m.userId) === String(currentUserId))?.nickname) || '나'}
              </button>
              {menuOpen && (
                <ul className="clov-hdr-dropdown" role="menu">
                  <li><button type="button" onClick={() => { setSettingsOpen(true); setMenuOpen(false) }}>⚙️ 사용자 설정</button></li>
                  <li><button type="button" onClick={clear}>로그아웃</button></li>
                </ul>
              )}
            </div>
          </div>
        </header>

        {/* 성장 배너 */}
        <div className="v5-scene">
          <div className="scene-sky" style={{ backgroundImage: `url('/banners/lp-${sKey}.png')` }} />
          <div className="banner-hud">
            <div>
              <p className="hud-eyebrow">우리 함께한 지</p>
              <p className="hud-dday">D+{days}<span>일째</span></p>
            </div>
            <div className="hud-bottom">
              <div className="v5-photo-chip">
                <span className="v5-photo-chip-dot" />
                <span className="v5-photo-chip-text">{SEASON_LABEL[sKey]} 추억 재생 중 · {track}번째 트랙</span>
              </div>
              <div className="lv-pill">
                <div className="lv-pill-bg" style={{ width: `${progress}%` }} />
                <div className="lv-pill-content">
                  <span className="lv-badge-icon">Lv.{levelNum}</span>
                  <span className="lv-badge-name">{tier.icon} {tier.name}</span>
                  <span className="lv-pct">{progress}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 대표 커버 카드 */}
        <div className="main-photo-card">
          <div className="main-photo-wrapper">
            {data.coverPhotoUrl ? (
              <img src={data.coverPhotoUrl} alt="대표 사진" />
            ) : (
              <div className="main-photo-empty">🍀</div>
            )}
          </div>
          <div className="cover-summary">
            <div className="cover-title-row">
              <div className="title-input-box" onClick={(e) => e.currentTarget.querySelector('input')?.focus()}>
                <input
                  className="cover-status-input"
                  value={statusValue}
                  maxLength={40}
                  placeholder="상태 메시지를 남겨보세요"
                  onChange={(e) => setStatusDraft(e.target.value)}
                />
                <span className="cover-status-count">{statusWeight} / {STATUS_MAX}</span>
                <span className="cover-status-hint">(한글 20자 / 영어 40자)</span>
                {statusDirty && (
                  <button
                    type="button"
                    className="cover-status-save"
                    disabled={statusOver || statusMutation.isPending}
                    onClick={() => statusMutation.mutate(statusDraft.trim())}
                  >
                    {statusMutation.isPending ? '저장 중…' : '저장'}
                  </button>
                )}
              </div>
            </div>
            <div className="cover-meta-grid">
              <div className="member-highlight-card" onClick={() => setMembersOpen(true)} title="참여 멤버 보기">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div className="member-mini-avatars">
                    {memberItems.slice(0, 4).map((m, i) => (
                      <span key={m.membershipId ?? m.userId} className="mini-av" style={{ background: MINI_AV_COLORS[i % MINI_AV_COLORS.length] }}>
                        {m.profileImageUrl ? <img src={m.profileImageUrl} alt="" /> : initialOf(m.nickname)}
                      </span>
                    ))}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                    <span className="member-meta-label">참여 멤버</span>
                    <span className="member-meta-value">{data.memberCount}명 함께하는 중</span>
                  </div>
                </div>
                <span className="member-see">멤버 보기 ➔</span>
              </div>
            </div>
          </div>
        </div>

        {/* 다가오는 D-day */}
        <div className="section-title">
          <span>다가오는 D-day</span>
          <div className="section-actions">
            <button type="button" className="btn-schedule-new" onClick={() => go('schedule')}>+ 새 D-day 만들기</button>
          </div>
        </div>
        {upcoming.length === 0 ? (
          <div className="schedule-empty">예정된 약속이 없어요. 새 D-day를 만들어보세요.</div>
        ) : (
          <div className="schedule-grid">
            {upcoming.map((p) => (
              <div key={p.id} className="schedule-banner" onClick={() => go('schedule')}>
                <div className="schedule-info">
                  <span className="schedule-icon">📅</span>
                  <span className="schedule-title">{p.title}</span>
                  <span className="schedule-date">{p.planDate}</span>
                </div>
                <span className="schedule-dday-badge">{ddayLabel(ddayOf(p.planDate))}</span>
              </div>
            ))}
          </div>
        )}

        {/* 참여자별 추억 증거 카드 */}
        <div className="section-title">
          <span>참여자별 추억 증거 카드</span>
          <div className="section-actions">
            <button type="button" className="btn-memory-write" onClick={() => go('feed')}>✎ 글쓰기</button>
            <button type="button" className="btn-action-sm" onClick={() => go('feed')}>전체 피드 보기</button>
          </div>
        </div>
        {memoryItems.length === 0 ? (
          <div className="memory-empty">아직 추억이 없어요. 피드에서 첫 추억을 남겨보세요.</div>
        ) : (
          <div className="space-memory-grid">
            {memoryItems.map((m) => {
              const isMine = String(m.writer?.id) === String(currentUserId)
              return (
                <div key={m.id} className="mini-polaroid" onClick={() => go('feed')}>
                  <div
                    className={`mini-polaroid-photo ${m.thumbnailUrl ? '' : 'is-empty'}`}
                    style={m.thumbnailUrl ? { backgroundImage: `url('${m.thumbnailUrl}')` } : undefined}
                  >
                    <span className="mini-polaroid-badge">{isMine ? '내 기록' : `${m.writer?.nickname}의 기록`}</span>
                    {!m.thumbnailUrl && '🍀'}
                  </div>
                  <div className="mini-polaroid-cap">
                    <div className="mini-polaroid-title">{m.title}</div>
                    {m.memoryDate && <div className="mini-polaroid-date">{m.memoryDate}</div>}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {membersOpen && (
        <div className="member-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setMembersOpen(false) }}>
          <div className="member-modal" role="dialog" aria-modal="true" aria-label="참여 멤버">
            <div className="member-modal-head">
              <span className="member-modal-title">참여 멤버 · {data.memberCount}명</span>
              <button type="button" className="member-modal-close" onClick={() => setMembersOpen(false)} aria-label="닫기">✕</button>
            </div>
            {memberItems.map((m, i) => (
              <div className="member-row" key={m.membershipId ?? m.userId}>
                <span className="member-row-av" style={{ background: MINI_AV_COLORS[i % MINI_AV_COLORS.length] }}>
                  {m.profileImageUrl ? <img src={m.profileImageUrl} alt="" /> : initialOf(m.nickname)}
                </span>
                <div>
                  <div className="member-row-name">{m.nickname}{String(m.userId) === String(currentUserId) ? ' (나)' : ''}</div>
                  {m.statusMessage && <div className="member-row-status">{m.statusMessage}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {settingsOpen && <Settings onClose={() => setSettingsOpen(false)} />}
    </div>
  )
}

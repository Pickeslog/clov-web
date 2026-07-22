import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import './dashboard.proto.css'
import { getRoom, getRoomLevel, getRoomMembers, updateStatusMessage, updateRoom, presignRoomCover } from '../../../api/room'
import { createPlan, getPlans } from '../../../api/plan'
import { getMemories } from '../../../api/memory'
import { getMe } from '../../../api/user'
import { uploadImage } from '../../../lib/uploadImage'
import { useCreateMemory } from '../../../hooks/useCreateMemory'
import { useAuthStore } from '../../../stores/authStore'
import { currentUserIdFromToken } from '../../../lib/jwt'
import Header from '../../../components/Header/Header'
import Button from '../../../components/Button/Button'
// 우정공간에서 작성 모달을 인라인으로 띄우기 위해 각 화면의 모달을 재사용.
import { ScheduleEditorModal } from '../../schedule/Schedule/Schedule'
import { SCHEDULE_LIGHT_PALETTE } from '../../schedule/Schedule/palette'
import { CreateMemoryModal } from '../../feed/Feed/Feed'

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

// 계절 파티클 스펙(프로토타입 v5buildParticles 이식) — 장식, 위치·타이밍 랜덤.
const PARTICLE_CFG = {
  spring: { type: 'blossom', count: 18, colors: ['#ffb7d5', '#ffc8e0', '#ffd2e8', '#ffdff0'] },
  summer: { type: 'firefly', count: 15 },
  fall: { type: 'leaf', count: 15, colors: ['#e67e22', '#c0392b', '#d35400', '#e8a030'] },
  winter: { type: 'snow', count: 30, sizes: [3, 4, 4, 5, 5, 6, 7] },
}
function buildParticles(season) {
  const cfg = PARTICLE_CFG[season]
  if (!cfg) return []
  return Array.from({ length: cfg.count }, (_, i) => {
    const dur = 4.5 + Math.random() * 6
    const style = { '--d': `${dur}s`, '--dl': `${-Math.random() * dur}s`, '--dx': `${(Math.random() - 0.5) * 65}px` }
    if (cfg.type === 'blossom') {
      const sz = 6 + Math.random() * 5
      Object.assign(style, { left: `${Math.random() * 100}%`, top: '-12px', width: `${sz}px`, height: `${sz}px`, background: cfg.colors[i % cfg.colors.length] })
    } else if (cfg.type === 'firefly') {
      Object.assign(style, { left: `${Math.random() * 88}%`, top: `${18 + Math.random() * 62}%`, '--dy': `${-8 - Math.random() * 18}px`, '--dl2': `${-Math.random() * 3}s` })
    } else if (cfg.type === 'leaf') {
      const sz = 8 + Math.random() * 6
      Object.assign(style, { left: `${Math.random() * 100}%`, top: '-12px', width: `${sz}px`, height: `${sz}px`, background: cfg.colors[i % cfg.colors.length], '--dr': `${80 + Math.random() * 260}deg` })
    } else if (cfg.type === 'snow') {
      const sz = cfg.sizes[i % cfg.sizes.length]
      Object.assign(style, { left: `${Math.random() * 100}%`, top: '-10px', width: `${sz}px`, height: `${sz}px` })
    }
    return { type: cfg.type, style }
  })
}
// LP 레코드판 원본 좌표(970x215 기준) → 렌더 크기에 스케일해 샤인을 겹친다(프로토타입 v5PositionPhotoRec).
const REC_SRC = { w: 970, h: 215 }
const REC_POS = { x: 619, y: -14, size: 279 }

// 오늘이 내 생일인가(getMe.birthdate의 월·일 일치). 멤버 목록엔 생일이 없어 본인 기준.
function isTodayBirthday(birthdate) {
  const m = String(birthdate || '').match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return false
  const now = new Date()
  return Number(m[2]) === now.getMonth() + 1 && Number(m[3]) === now.getDate()
}
// 생일 색종이(프로토타입 confetti 분기 이식).
function buildConfetti() {
  const colors = ['#ff7675', '#74b9ff', '#55efc4', '#ffeaa7', '#a29bfe', '#fd79a8', '#ff9ff3']
  return Array.from({ length: 45 }, (_, i) => {
    const dur = 3.5 + Math.random() * 5
    const w = 4 + Math.random() * 5
    const style = {
      '--d': `${dur}s`, '--dl': `${-Math.random() * dur}s`, '--dx': `${(Math.random() - 0.5) * 150}px`,
      '--dr': `${Math.random() * 720}deg`, '--drx': `${Math.random() * 720}deg`, '--dry': `${Math.random() * 720}deg`,
      left: `${Math.random() * 100}%`, top: '-20px', width: `${w}px`,
      height: `${Math.random() > 0.4 ? w : 7 + Math.random() * 7}px`, background: colors[i % colors.length],
    }
    if (Math.random() > 0.6) style.borderRadius = '50%'
    return { type: 'confetti', style }
  })
}
// 생일 풍선(프로토타입 v5buildBalloons 이식).
function buildBalloons() {
  const colors = ['#ff7675', '#74b9ff', '#ffeaa7', '#a29bfe', '#55efc4', '#fd79a8']
  return Array.from({ length: 7 }, (_, i) => {
    const dur = 10 + Math.random() * 10
    return {
      style: {
        '--bc': colors[i % colors.length], left: `${5 + Math.random() * 90}%`,
        '--bd': `${dur}s`, '--bdl': `${-Math.random() * dur}s`, '--bx': `${(Math.random() - 0.5) * 60}px`,
        transform: `scale(${0.75 + Math.random() * 0.5})`,
      },
    }
  })
}

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
  const accessToken = useAuthStore((state) => state.accessToken)
  const currentUserId = currentUserIdFromToken(accessToken)

  const room = useQuery({ queryKey: ['room', roomId], queryFn: () => getRoom(roomId) })
  const level = useQuery({ queryKey: ['room', roomId, 'level'], queryFn: () => getRoomLevel(roomId) })
  const members = useQuery({ queryKey: ['room', roomId, 'members'], queryFn: () => getRoomMembers(roomId) })
  const plans = useQuery({ queryKey: ['plans', roomId, { status: 'SCHEDULED' }], queryFn: () => getPlans(roomId, { status: 'SCHEDULED' }) })
  const memories = useQuery({ queryKey: ['memories', roomId], queryFn: () => getMemories(roomId) })
  const me = useQuery({ queryKey: ['me'], queryFn: getMe })

  // null = 미편집(서버값 표시). 문자열 = 사용자가 편집 중.
  const [statusDraft, setStatusDraft] = useState(null)
  const [membersOpen, setMembersOpen] = useState(false)
  const [coverViewOpen, setCoverViewOpen] = useState(false)
  const [uploadOpen, setUploadOpen] = useState(false)
  // 우정공간에서 바로 여는 작성 모달(일정계획 새 D-day / 추억 글쓰기).
  const [composeSchedule, setComposeSchedule] = useState(false)
  const [composeMemory, setComposeMemory] = useState(false)

  const createPlanMutation = useMutation({
    mutationFn: (payload) => createPlan(roomId, payload),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['plans', roomId] }); setComposeSchedule(false) },
  })
  const createMemoryMutation = useCreateMemory(roomId, { onSuccess: () => setComposeMemory(false) })

  // 배너 데코 — 생일이면 색종이+풍선, 아니면 계절 파티클. + 레코드판 샤인.
  const sKey = seasonKey(new Date().getMonth() + 1)
  const isBirthday = isTodayBirthday(me.data?.birthdate)
  const particles = useMemo(() => (isBirthday ? buildConfetti() : buildParticles(sKey)), [isBirthday, sKey])
  const balloons = useMemo(() => (isBirthday ? buildBalloons() : []), [isBirthday])
  const [recStyle, setRecStyle] = useState(null)
  const sceneRef = useCallback((node) => {
    if (!node) return undefined
    const compute = () => {
      const w = node.clientWidth
      const h = node.clientHeight || REC_SRC.h
      if (!w) return
      const scale = Math.max(w / REC_SRC.w, h / REC_SRC.h)
      const offsetX = (w - REC_SRC.w * scale) / 2
      const offsetY = (h - REC_SRC.h * scale) / 2
      setRecStyle({
        left: `${offsetX + REC_POS.x * scale}px`,
        top: `${offsetY + REC_POS.y * scale}px`,
        width: `${REC_POS.size * scale}px`,
        height: `${REC_POS.size * scale}px`,
      })
    }
    compute()
    const ro = new ResizeObserver(compute)
    ro.observe(node)
    return () => ro.disconnect()
  }, [])

  const statusMutation = useMutation({
    mutationFn: (message) => updateStatusMessage(roomId, message),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['room', roomId] })
      setStatusDraft(null) // 서버값으로 재동기화
    },
  })

  // 대표 커버 이미지: presign → R2 PUT → PATCH coverPhotoUrl 로 커밋.
  const coverMutation = useMutation({
    mutationFn: async (file) => {
      const imageUrl = await uploadImage((base) => presignRoomCover(roomId, base), file)
      return updateRoom(roomId, { coverPhotoUrl: imageUrl })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['room', roomId] })
      setUploadOpen(false)
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
  const track = (memories.data?.items ?? []).length || 1

  const upcoming = (plans.data?.items ?? [])
    .filter((p) => p.planDate && ddayOf(p.planDate) >= 0)
    .sort((a, b) => a.planDate.localeCompare(b.planDate))
    .slice(0, 3)
  const memoryItems = (memories.data?.items ?? []).slice(0, 24)

  const savedStatus = data.myStatusMessage ?? ''
  const statusValue = statusDraft ?? savedStatus
  const statusWeight = weightedLen(statusValue)
  const statusDirty = statusDraft !== null && statusDraft.trim() !== savedStatus.trim()
  const statusOver = statusWeight > STATUS_MAX
  const go = (path) => navigate(`/rooms/${roomId}/${path}`)

  return (
    <>
    <div className="proto-dashboard">
      <Header variant="room" roomId={roomId} activeTab="space" />
      <div className="dash-main">
        {/* 성장 배너 */}
        <div className="v5-scene" ref={sceneRef} data-season={sKey} data-level={levelNum} data-event={isBirthday ? 'my_birthday' : 'none'}>
          <div className="scene-sky" style={{ backgroundImage: `url('/banners/lp-${sKey}.png')` }} />
          <div className="season-particles" aria-hidden="true">
            {particles.map((p, i) => (
              <span key={i} className={`ptcl ${p.type}`} style={p.style} />
            ))}
          </div>
          {balloons.length > 0 && (
            <div className="scene-balloons" aria-hidden="true">
              {balloons.map((b, i) => (
                <div key={i} className="balloon" style={b.style} />
              ))}
            </div>
          )}
          {recStyle && (
            <div className="v5-photo-rec" style={recStyle} aria-hidden="true">
              <div className="v5-photo-rec-shine" />
            </div>
          )}
          <div className="banner-hud">
            <div>
              <p className={`hud-eyebrow ${isBirthday ? 'is-birthday' : ''}`}>
                {isBirthday ? '🎂 생일 축하해요!' : '우리 함께한 지'}
              </p>
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
              <img
                src={data.coverPhotoUrl}
                alt="대표 사진"
                className="cover-photo-img"
                title="클릭하면 전체 보기"
                onClick={() => setCoverViewOpen(true)}
              />
            ) : (
              <div className="main-photo-empty" title="대표 사진 추가" onClick={() => setUploadOpen(true)}>🍀</div>
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
              <button type="button" className="cover-camera-btn" title="대표 사진 변경" aria-label="대표 사진 변경" onClick={() => setUploadOpen(true)}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 8a2 2 0 0 1 2-2h1l1.5-2h7L17 6h1a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8z" /><circle cx="12" cy="13" r="3.5" /></svg>
              </button>
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
            <Button variant="dashed" size="sm" onClick={() => setComposeSchedule(true)}>+ 새 D-day 만들기</Button>
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
            <Button variant="dashed" size="sm" onClick={() => setComposeMemory(true)}>✎ 글쓰기</Button>
            <Button variant="action" size="sm" onClick={() => go('feed')}>전체 피드 보기</Button>
          </div>
        </div>
        {memoryItems.length === 0 ? (
          <div className="memory-empty">아직 추억이 없어요. 피드에서 첫 추억을 남겨보세요.</div>
        ) : (
          <EvidenceViewer memories={memoryItems} onOpen={() => go('feed')} />
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

      {coverViewOpen && data.coverPhotoUrl && (
        <div className="cover-view-backdrop" onClick={() => setCoverViewOpen(false)}>
          <div className="cover-view-flip" onClick={(e) => e.stopPropagation()}>
            <img src={data.coverPhotoUrl} alt="대표 사진 전체 보기" />
            <button type="button" className="cover-view-close" onClick={() => setCoverViewOpen(false)} aria-label="닫기">✕</button>
          </div>
        </div>
      )}

      {uploadOpen && (
        <CoverUploadModal
          uploading={coverMutation.isPending}
          errorMessage={coverMutation.error?.message}
          onCancel={() => setUploadOpen(false)}
          onSubmit={(file) => coverMutation.mutate(file)}
        />
      )}
    </div>

    {/* 우정공간에 머문 채 작성 모달을 인라인으로. 각 화면의 스코프·팔레트를 래퍼로 공급.
        .proto-dashboard 밖 형제로 둬 대시보드 CSS와 격리(min-height는 0으로 눌러 빈 공간 방지). */}
    {composeSchedule && (
      <div className="proto-schedule" style={{ ...SCHEDULE_LIGHT_PALETTE, minHeight: 0 }}>
        <ScheduleEditorModal
          plan={null}
          submitting={createPlanMutation.isPending}
          errorMessage={createPlanMutation.error?.message}
          onClose={() => setComposeSchedule(false)}
          onSubmit={(payload) => createPlanMutation.mutate(payload)}
        />
      </div>
    )}
    {composeMemory && (
      <div className="proto-feed" style={{ minHeight: 0 }}>
        <CreateMemoryModal
          roomId={roomId}
          members={memberItems.filter((m) => String(m.userId) !== String(currentUserId))}
          submitting={createMemoryMutation.isPending}
          errorMessage={createMemoryMutation.error?.message}
          onCancel={() => setComposeMemory(false)}
          onSubmit={(planId, payload, files) => createMemoryMutation.mutate({ planId, payload, files })}
        />
      </div>
    )}
    </>
  )
}

// 대표 사진 변경 모달 — 드래그&드롭 또는 클릭 파일 선택 → 미리보기 → 확인 시 업로드.
function CoverUploadModal({ uploading, errorMessage, onCancel, onSubmit }) {
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef(null)

  const pick = (f) => {
    if (!f || !f.type.startsWith('image/')) return
    if (preview) URL.revokeObjectURL(preview)
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])

  return (
    <div className="cover-upload-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onCancel() }}>
      <div className="cover-upload-modal" role="dialog" aria-modal="true" aria-label="대표 사진 변경">
        <div className="cover-upload-title">대표 사진 변경</div>
        <div
          className={`cover-upload-drop ${dragOver ? 'over' : ''}`}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); pick(e.dataTransfer.files?.[0]) }}
        >
          {preview ? (
            <img src={preview} alt="미리보기" className="cover-upload-preview" />
          ) : (
            <>
              <span className="cover-upload-icon">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 8a2 2 0 0 1 2-2h1l1.5-2h7L17 6h1a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8z" /><circle cx="12" cy="13" r="3.5" /></svg>
              </span>
              <span>새 이미지를 이 곳으로 드래그하거나<br /><strong>클릭하여 파일 선택</strong></span>
            </>
          )}
        </div>
        <input ref={inputRef} type="file" accept="image/*" hidden onChange={(e) => { pick(e.target.files?.[0]); e.target.value = '' }} />
        {errorMessage && <div className="cover-upload-error" role="alert">{errorMessage}</div>}
        <div className="cover-upload-actions">
          <Button variant="secondary" size="sm" onClick={onCancel}>취소</Button>
          <Button variant="primary" size="sm" disabled={!file || uploading} onClick={() => onSubmit(file)}>
            {uploading ? '업로드 중…' : '확인'}
          </Button>
        </div>
      </div>
    </div>
  )
}

// 빨래집게 SVG(프로토타입 clothespinSvg 이식).
function Clothespin() {
  return (
    <svg className="cline-clip-svg" viewBox="0 0 28 48" aria-hidden="true">
      <defs>
        <linearGradient id="clipBody" x1="5" y1="0" x2="23" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#f2f5f7" /><stop offset="0.18" stopColor="#b8c0c8" />
          <stop offset="0.55" stopColor="#d8dde2" /><stop offset="1" stopColor="#8d969e" />
        </linearGradient>
        <linearGradient id="clipDark" x1="0" y1="0" x2="0" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#aeb6bd" /><stop offset="1" stopColor="#6f7982" />
        </linearGradient>
      </defs>
      <rect x="8" y="1" width="12" height="11" rx="2" fill="url(#clipBody)" stroke="#7e8790" strokeWidth="1" />
      <circle cx="14" cy="6.5" r="3.1" fill="#1a1f24" stroke="#dfe4e8" strokeWidth="1.1" />
      <circle cx="14" cy="6.5" r="1.25" fill="#8e98a2" />
      <rect x="6" y="12" width="16" height="7" rx="1.5" fill="#a0a8b0" stroke="#7c858d" strokeWidth="1" />
      <circle cx="10" cy="15.5" r="1.4" fill="#707981" /><circle cx="18" cy="15.5" r="1.4" fill="#707981" />
      <rect x="5" y="19" width="18" height="19" rx="2.5" fill="url(#clipBody)" stroke="#7b858e" strokeWidth="1" />
      <circle cx="10.5" cy="27" r="2.2" fill="#87919a" stroke="#eef2f5" strokeWidth=".8" />
      <circle cx="17.5" cy="27" r="2.2" fill="#87919a" stroke="#eef2f5" strokeWidth=".8" />
      <line x1="9.2" y1="27" x2="11.8" y2="27" stroke="#5f6870" strokeWidth=".8" />
      <line x1="16.2" y1="27" x2="18.8" y2="27" stroke="#5f6870" strokeWidth=".8" />
      <rect x="7" y="37" width="14" height="8" rx="1.3" fill="url(#clipDark)" stroke="#6f7880" strokeWidth="1" />
      <path d="M8 45h2l1-2 1 2h2l1-2 1 2h2l1-2 1 2" fill="none" stroke="#d6dce1" strokeWidth=".9" strokeLinecap="round" />
      <line x1="8.5" y1="21" x2="8.5" y2="36" stroke="rgba(255,255,255,.58)" strokeWidth="1" />
      <line x1="19.5" y1="21" x2="19.5" y2="36" stroke="rgba(255,255,255,.26)" strokeWidth="1" />
    </svg>
  )
}

// cline 폴라로이드(빨랫줄 카드).
function ClinePolaroid({ memory, isActive, onOpen }) {
  const dateText = (memory.memoryDate || '').slice(5) // MM-DD
  const tags = (memory.tags ?? []).slice(0, 3)
  return (
    <article
      className={`cline-polaroid ${isActive ? 'is-active' : ''}`}
      onClick={onOpen ? (e) => { e.stopPropagation(); onOpen() } : undefined}
    >
      <div className="cline-card-header">
        <div className="cline-avatars">
          <span className="cline-avatar" style={{ background: '#52b788' }}>{initialOf(memory.writer?.nickname)}</span>
        </div>
        <span className="cline-header-date">{dateText}</span>
      </div>
      <div className="cline-photo">
        {memory.thumbnailUrl ? (
          <img src={memory.thumbnailUrl} alt={memory.title} draggable={false} />
        ) : (
          <div className="cline-no-photo"><span>🍀</span><span className="cline-no-photo-text">사진 없음</span></div>
        )}
      </div>
      <div className="cline-caption">
        <div className="cline-caption-title">{memory.title}</div>
        <div className="cline-tags">{tags.map((t) => <span key={t} className="cline-tag">#{t}</span>)}</div>
      </div>
    </article>
  )
}

// 참여자별 추억 증거 카드 — 빨랫줄+집게 캐러셀 + 필름스트립(프로토타입 cline 뷰어 기본 테마 이식).
// 최신순 memories에서 index=현재("현재"), +delta=과거·-delta=최신 카드를 좌우로 건다.
function EvidenceViewer({ memories, onOpen }) {
  const [index, setIndex] = useState(0)
  const framesRef = useRef(null)
  const drag = useRef({ active: false, startX: 0, startLeft: 0, moved: false })
  const total = memories.length
  const clamp = (i) => Math.min(Math.max(i, 0), total - 1)

  // index가 바뀌면 현재 프레임을 필름 중앙으로 스크롤.
  useEffect(() => {
    const cur = framesRef.current?.querySelector('.cline-film-frame.is-current')
    cur?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [index])

  const SLOTS = [
    { delta: 2, cls: 'far-past' },
    { delta: 1, cls: 'past' },
    { delta: 0, cls: 'current' },
    { delta: -1, cls: 'newer' },
    { delta: -2, cls: 'far-newer' },
  ]

  const onPointerDown = (e) => {
    const el = framesRef.current
    if (!el) return
    drag.current = { active: true, startX: e.clientX, startLeft: el.scrollLeft, moved: false }
  }
  const onPointerMove = (e) => {
    const d = drag.current
    if (!d.active || !framesRef.current) return
    const dx = e.clientX - d.startX
    if (Math.abs(dx) > 4) d.moved = true
    framesRef.current.scrollLeft = d.startLeft - dx
  }
  const onPointerUp = () => { drag.current.active = false }
  const onWheel = (e) => {
    const el = framesRef.current
    if (el && Math.abs(e.deltaY) >= Math.abs(e.deltaX) && e.deltaY) { el.scrollLeft += e.deltaY; e.preventDefault() }
  }

  return (
    <div className="memory-evidence-viewer cline-viewer">
      <div className="cline-stage">
        <div className="cline-wire-area">
          <div className="cline-wire" />
          <div className="cline-cards">
            {SLOTS.map(({ delta, cls }) => {
              const i = index + delta
              if (i < 0 || i >= total) return <div key={cls} className="cline-card-slot cline-slot--empty" />
              const isActive = delta === 0
              return (
                <div
                  key={cls}
                  className={`cline-card-slot cline-slot--${cls} ${isActive ? 'is-active' : ''}`}
                  onClick={isActive ? undefined : () => setIndex(clamp(i))}
                >
                  <Clothespin />
                  <ClinePolaroid memory={memories[i]} isActive={isActive} onOpen={isActive ? () => onOpen(i) : undefined} />
                </div>
              )
            })}
          </div>
        </div>
      </div>
      <div className="cline-film-strip">
        <span className="cline-film-label">과거</span>
        <div
          className="cline-film-frames"
          ref={framesRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onWheel={onWheel}
        >
          <div className="cline-film-track">
            {memories.slice().reverse().map((m, revI) => {
              const orig = total - 1 - revI
              return (
                <button
                  key={m.id}
                  type="button"
                  className={`cline-film-frame ${orig === index ? 'is-current' : ''}`}
                  onClick={() => { if (!drag.current.moved) setIndex(orig) }}
                  aria-label={`${m.title} 보기`}
                >
                  {m.thumbnailUrl && <img src={m.thumbnailUrl} alt="" draggable={false} />}
                </button>
              )
            })}
          </div>
        </div>
        <span className="cline-film-label">현재</span>
      </div>
    </div>
  )
}

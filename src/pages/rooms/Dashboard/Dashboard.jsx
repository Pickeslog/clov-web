import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import './dashboard.proto.css'
import { getRoom, getRoomLevel, getRoomMembers, getExpLogs, updateStatusMessage, updateRoom, presignRoomCover } from '../../../api/room'
import { createPlan, getPlans } from '../../../api/plan'
import { getMemories } from '../../../api/memory'
import { getMe, getPreferences } from '../../../api/user'
import { createInvite, getInvites, cancelInvite } from '../../../api/invite'
import { uploadImage } from '../../../lib/uploadImage'
import { useCreateMemory } from '../../../hooks/useCreateMemory'
import { useMemoryDetail } from '../../../hooks/useMemoryDetail'
import { useAuthStore } from '../../../stores/authStore'
import { currentUserIdFromToken } from '../../../lib/jwt'
import { parseUtc, ddayDiff, formatDate, formatTime } from '../../../lib/datetime'
import Header from '../../../components/Header/Header'
import Button from '../../../components/Button/Button'
import Mascot from '../../../components/Mascot/Mascot'
import { useConfirm } from '../../../components/ConfirmDialog/useConfirm'
// 우정공간에서 작성 모달을 인라인으로 띄우기 위해 각 화면의 모달을 재사용.
import { ScheduleEditorModal } from '../../schedule/Schedule/Schedule'
import { SCHEDULE_LIGHT_PALETTE } from '../../schedule/Schedule/palette'
import { CreateMemoryModal, MemoryDetailModal } from '../../feed/Feed/Feed'

// 우정 성장 티어(프로토타입 desktop.js 정본 — 이름·구간은 그대로, 아이콘만 팀 표준(#123, 팀장
// 확정)에 따라 tabler 웹폰트로 교체). icon은 이제 이모지가 아니라 `ti-<icon>` 접미사 문자열.
const TIERS = [
  { name: '씨앗의 우정', icon: 'seeding', max: 111 },
  { name: '새싹의 우정', icon: 'plant', max: 222 },
  { name: '초록 클로버 우정', icon: 'heart', max: 333 },
  { name: '무성한 클로버 들판', icon: 'clover', max: 444 },
  { name: '반짝이는 클로버 우정', icon: 'star', max: 555 },
  { name: '황금빛 클로버 우정', icon: 'crown', max: 666 },
  { name: '전설의 클로버 우정', icon: 'diamond', max: 777 },
]
const tierFor = (level) => TIERS.find((t) => (level ?? 1) <= t.max) ?? TIERS[TIERS.length - 1]

const MINI_AV_COLORS = ['#1b4332', '#52b788', '#74c69d', '#95d5b2']

const DAY = 86400000
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

// 오늘이 내 생일인가(getMe.birthdate, "YYYY-MM-DD" — 연도 포함).
function isTodayBirthday(birthdate) {
  const m = String(birthdate || '').match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return false
  const now = new Date()
  return Number(m[2]) === now.getMonth() + 1 && Number(m[3]) === now.getDate()
}
// 오늘이 방 멤버의 생일인가(RoomMember.birthMonthDay, "MM-DD" — 계약 §6, 연도 없음).
// 서버는 UTC라 "오늘"을 못 주므로(KST 00~09시엔 서버 기준 어제) 월/일만 받아 브라우저 로컬 날짜로 판단한다.
function isTodayMonthDay(monthDay) {
  const m = String(monthDay || '').match(/^(\d{2})-(\d{2})$/)
  if (!m) return false
  const now = new Date()
  return Number(m[1]) === now.getMonth() + 1 && Number(m[2]) === now.getDate()
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

// 레벨 게이지 진행률(%) — level 쿼리 응답에서 계산. 훅 순서를 지키려면 early return 전에도
// 써야 해서 컴포넌트 밖에 함수로 뺐다(원래 렌더 본문에 있던 계산과 동일 공식).
const MAX_LEVEL = TIERS[TIERS.length - 1].max
const progressFromLevel = (lvData) => (lvData?.expForNextLevel ? Math.min(100, Math.round((lvData.expPoint / lvData.expForNextLevel) * 100)) : 0)

// LP 레코드판 클릭 색종이+음표 폭죽(프로토타입 spawnConfettiBurst 이식) — 계절별 색상, 장식 전용(API 호출 없음).
const BURST_COLORS = {
  spring: ['#e05e8a', '#f4a6c6', '#ffd6e6', '#fff3d6'],
  summer: ['#ffffff', '#a3d5e8', '#8ba84f', '#c9dd9f'],
  fall: ['#c2571e', '#e08a3c', '#f2c078', '#ffe9c2'],
  winter: ['#3f7cb0', '#8ec3e0', '#cfe8f5', '#ffffff'],
}
const NOTE_GLYPHS = ['♪', '♫', '♬', '♩']
// 레코드판 클릭 시 배너 전체에 도는 랜덤 글로우 색(프로토타입 CLOV_PULSE_GLOW_COLORS 이식).
const PULSE_GLOW_COLORS = ['rgba(255,255,255,.6)', 'rgba(182,201,138,.6)', 'rgba(168,216,234,.6)', 'rgba(255,194,209,.6)']
function buildBurst(season) {
  const colors = BURST_COLORS[season] || BURST_COLORS.summer
  const spread = 110
  const confetti = Array.from({ length: 32 }, (_, i) => {
    const ang = Math.random() * Math.PI * 2
    const dist = spread * 0.42 + Math.random() * spread * 0.58
    const sz = 6 + Math.random() * 6
    return {
      id: `c${i}`,
      style: {
        width: `${sz}px`, height: `${sz}px`,
        borderRadius: Math.random() < 0.5 ? '50%' : '2px',
        background: colors[i % colors.length],
        '--dx': `${Math.cos(ang) * dist}px`, '--dy': `${Math.sin(ang) * dist}px`,
        '--dr': `${Math.random() * 540 - 270}deg`,
      },
    }
  })
  const notes = Array.from({ length: 3 }, (_, j) => {
    const spreadX = (Math.random() * 2 - 1) * spread * 0.5
    const rise = -(70 + Math.random() * 60)
    return {
      id: `n${j}`,
      glyph: NOTE_GLYPHS[j % NOTE_GLYPHS.length],
      style: {
        fontSize: `${15 + Math.random() * 11}px`,
        color: j % 2 ? '#fffdf7' : colors[j % colors.length],
        '--nx0': `${spreadX * 0.3}px`, '--nx': `${spreadX}px`, '--ny': `${rise}px`,
        '--nr': `${Math.random() * 50 - 25}deg`,
        animationDuration: `${1.1 + Math.random() * 0.5}s`,
      },
    }
  })
  return { confetti, notes }
}

// 티어업(111 단위)/만렙(777) 축하 폭죽(프로토타입 createBurst 이식) — 화면 임의 지점에서 방사형+
// 중력 낙하로 흩어짐. LP 레코드판 폭죽(buildBurst)과는 색상·규모·용도가 달라 재사용하지 않는다.
// 상태로 렌더해서 언마운트 시 자동 정리되게 한다 — 프로토타입처럼 DOM을 body에 직접 꽂고
// setTimeout으로 지우면 방 전환·언마운트 때 파티클·타이머가 새어나간다(팀장 리뷰).
const TIER_BURST_COLORS = ['#4ade80', '#22c55e', '#16a34a', '#facc15', '#fef08a', '#86efac', '#ffaa00', '#ff00aa']
function buildTierBurstParticles(count, spread) {
  return Array.from({ length: count }, (_, i) => {
    const size = 10 + Math.random() * 15
    const ang = Math.random() * Math.PI * 2
    const dist = 50 + Math.random() * spread
    const tx = Math.cos(ang) * dist
    const ty = Math.sin(ang) * dist + Math.random() * 150
    const rot = Math.random() * 720 - 360
    return {
      id: i,
      style: {
        width: `${size}px`, height: `${size}px`,
        background: TIER_BURST_COLORS[Math.floor(Math.random() * TIER_BURST_COLORS.length)],
        borderRadius: Math.random() > 0.5 ? '50%' : '2px',
        '--tx': `${tx}px`, '--ty': `${ty}px`, '--trot': `${rot}deg`, '--tscale': (0.8 + Math.random()).toFixed(2),
      },
    }
  })
}

const daysTogether = (createdAt) => {
  // parseUtc는 값이 없거나 잘못되면 null을 준다 — 그대로 getTime()을 부르면 화면이 죽는다.
  const created = parseUtc(createdAt)
  if (!created) return 1
  return Math.floor((Date.now() - created.getTime()) / DAY) + 1
}
const ddayLabel = (n) => (n === 0 ? 'D-DAY' : n > 0 ? `D-${n}` : `D+${-n}`)
// 뱃지 색상 구분(프로토타입 getDdayAccent 이식) — 지남=회색, 오늘=장미, 7일 이내=주황, 그 외=초록.
// 'past'(회색)는 D-day 3칸에서는 안 쓰인다(#206) — 다가오는 약속만 채우고 지난 약속으로 채우지 않는다.
const ddayUrgency = (n) => (n == null ? 'far' : n < 0 ? 'past' : n === 0 ? 'today' : n <= 7 ? 'soon' : 'far')
const initialOf = (name) => (name || '?').trim().slice(0, 1)
// 상태 메시지 최대 길이 — 한글/영어 구분 없이 40자 통일(계약은 @Size(max=100)까지 허용하지만
// 프론트 표시 규칙은 40자로 정함, #240).
const STATUS_MAX = 40

// 경험치 히스토리 actionType → 한글 라벨(계약 §12, 이벤트정의서 §9.1).
const EXP_ACTION_LABEL = {
  MEMORY_WRITE: '추억 작성',
  MEMORY_IMAGE_BONUS: '사진 첨부',
  PLAN_CREATE: '약속 등록',
  PLAN_COMPLETE: '약속 완료',
  MASCOT_INTERACT: '마스코트 교감',
}
const expActionLabel = (actionType) => EXP_ACTION_LABEL[actionType] ?? '경험치 적립'
// 사진 여러 장을 한 추억에 올리면 MEMORY_IMAGE_BONUS가 장당 한 행씩 쌓여 히스토리가 도배된다.
// 정렬(최신순)을 유지해야 "언제 무엇을"이 안 흐트러지므로, 같은 추억이면 전부가 아니라
// "바로 인접한" 행만 묶는다 — 시간 차를 두고 같은 추억에 두 번 사진을 올린 경우, 그 사이
// 다른 활동이 끼어 있으면 별개 그룹으로 남아 각자의 시각이 보존된다(팀장 리뷰 결정).
function groupAdjacentImageBonus(items) {
  const groups = []
  for (const log of items) {
    const prev = groups[groups.length - 1]
    const canMerge = prev
      && prev.actionType === 'MEMORY_IMAGE_BONUS'
      && log.actionType === 'MEMORY_IMAGE_BONUS'
      && log.referenceId != null
      && prev.referenceId === log.referenceId
    if (canMerge) {
      prev.expDelta += log.expDelta
      prev.count += 1
    } else {
      groups.push({ ...log, count: 1 })
    }
  }
  return groups
}

export default function Dashboard() {
  const { roomId } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const accessToken = useAuthStore((state) => state.accessToken)
  const currentUserId = currentUserIdFromToken(accessToken)

  const room = useQuery({ queryKey: ['room', roomId], queryFn: () => getRoom(roomId) })
  const level = useQuery({ queryKey: ['room', roomId, 'level'], queryFn: () => getRoomLevel(roomId) })
  const members = useQuery({ queryKey: ['room', roomId, 'members'], queryFn: () => getRoomMembers(roomId) })
  // status 필터 없이 전부 받는다 — D-day 칸을 지난 약속으로도 채우기 때문(#112).
  // 키·호출 형태를 Schedule·Feed(둘 다 ['plans', roomId] + getPlans(roomId))와 맞춰 캐시를 공유한다.
  const plans = useQuery({ queryKey: ['plans', roomId], queryFn: () => getPlans(roomId) })
  const memories = useQuery({ queryKey: ['memories', roomId], queryFn: () => getMemories(roomId) })
  const me = useQuery({ queryKey: ['me'], queryFn: getMe })
  const prefs = useQuery({ queryKey: ['preferences'], queryFn: getPreferences })
  const memoryCardTheme = prefs.data?.memoryCardTheme ?? 'stack'

  // null = 미편집(서버값 표시). 문자열 = 사용자가 편집 중.
  const [statusDraft, setStatusDraft] = useState(null)
  const [membersOpen, setMembersOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [coverViewOpen, setCoverViewOpen] = useState(false)
  const [uploadOpen, setUploadOpen] = useState(false)
  // 우정공간에서 바로 여는 작성 모달(일정계획 새 D-day / 추억 글쓰기).
  const [composeSchedule, setComposeSchedule] = useState(false)
  const [composeMemory, setComposeMemory] = useState(false)
  // 증거 카드에서 바로 여는 추억 상세(피드와 동일한 여권 모달).
  const [selectedMemoryId, setSelectedMemoryId] = useState(null)
  // 친구 초대(초대코드 생성/복사·공유) 모달.
  const [inviteOpen, setInviteOpen] = useState(false)

  const createPlanMutation = useMutation({
    mutationFn: (payload) => createPlan(roomId, payload),
    // 약속 등록은 XP도 준다(PLAN_CREATE, 계약 §12) — room 프리픽스 무효화로 레벨 게이지/히스토리도 갱신.
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans', roomId] })
      queryClient.invalidateQueries({ queryKey: ['room', roomId] })
      setComposeSchedule(false)
    },
  })
  const createMemoryMutation = useCreateMemory(roomId, { onSuccess: () => setComposeMemory(false) })

  // 배너 데코 — 본인 생일=색종이+풍선, 친구 생일=색종이만(풍선 없음), 그 외=계절 파티클. + 레코드판 샤인.
  const sKey = seasonKey(new Date().getMonth() + 1)
  const isMyBirthday = isTodayBirthday(me.data?.birthdate)
  // GET /members는 LEFT 멤버도 함께 반환하므로(계약 §6), 나간 사람의 생일로 배너가 뜨지 않도록 ACTIVE만 본다.
  // 본인도 멤버 목록에 포함되므로 명시적으로 제외 — 안 그러면 me 쿼리가 늦게 도착하는 순간
  // 본인을 "친구"로 착각해 "{내 닉네임}님의 생일입니다!"가 잠깐 뜰 수 있다.
  // 동시에 여러 명이면(드묾) 첫 번째 사람 이름으로만 표시 — 프로토타입도 friendName 단일 값이다.
  const birthdayFriend = (members.data?.items ?? [])
    .find((m) => m.status === 'ACTIVE' && String(m.userId) !== String(currentUserId) && isTodayMonthDay(m.birthMonthDay))
  const isFriendBirthday = Boolean(birthdayFriend)
  const anyBirthday = isMyBirthday || isFriendBirthday
  const particles = useMemo(() => (anyBirthday ? buildConfetti() : buildParticles(sKey)), [anyBirthday, sKey])
  const balloons = useMemo(() => (isMyBirthday ? buildBalloons() : []), [isMyBirthday])
  const [recStyle, setRecStyle] = useState(null)
  // 레코드판 클릭 시 배너 전체에 펄스(scale+글로우)를 주기 위해 DOM 노드를 따로 들고 있는다
  // (프로토타입처럼 클래스 제거→강제 리플로우→재부여 방식으로 연속 클릭에도 애니메이션이 재시작되게).
  const sceneNodeRef = useRef(null)
  const sceneRef = useCallback((node) => {
    sceneNodeRef.current = node
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

  // XP가 실제로 올라간 순간(레벨 쿼리 진행률 증가)에만 게이지를 잠깐 반짝여서 알려준다.
  // early return 전에 불러야 하는 훅이라 level.data를 직접 쓴다(아래 lv/progress와 동일 공식).
  const currentProgress = progressFromLevel(level.data)
  const [xpPulse, setXpPulse] = useState(false)
  const prevProgressRef = useRef(currentProgress)
  useEffect(() => {
    if (currentProgress > prevProgressRef.current) {
      setXpPulse(true)
      const timer = setTimeout(() => setXpPulse(false), 500)
      prevProgressRef.current = currentProgress
      return () => clearTimeout(timer)
    }
    prevProgressRef.current = currentProgress
    return undefined
  }, [currentProgress])

  // LP 레코드판 클릭 → 색종이+음표 폭죽(장식 전용, 레벨업/XP API 호출 없음).
  const [burst, setBurst] = useState(null)
  const burstTimerRef = useRef(null)
  const handleRecordClick = useCallback(() => {
    if (burstTimerRef.current) clearTimeout(burstTimerRef.current)
    setBurst({ key: Date.now(), ...buildBurst(sKey) })
    burstTimerRef.current = setTimeout(() => setBurst(null), 1700)
    // 배너 펄스(scale+글로우) — 클래스를 지웠다가 강제 리플로우 후 다시 붙여야 연속 클릭 때도 재생된다.
    const el = sceneNodeRef.current
    if (el) {
      const glow = PULSE_GLOW_COLORS[Math.floor(Math.random() * PULSE_GLOW_COLORS.length)]
      el.style.setProperty('--pulse-glow', glow)
      el.classList.remove('levelup-pulse')
      void el.offsetWidth
      el.classList.add('levelup-pulse')
    }
  }, [sKey])
  useEffect(() => () => { if (burstTimerRef.current) clearTimeout(burstTimerRef.current) }, [])

  // 티어업(111 단위)/만렙(777) 축하 폭죽 — 진행 중인 웨이브들의 목록. 웨이브마다 자기 타이머로
  // 스스로 사라지므로, 최대 동시 파티클 수가 한 웨이브분(최대 200개)으로 제한된다(팀장 리뷰:
  // 만렙 5단계+마무리를 한꺼번에 렌더하면 최대 600개가 동시에 떠서 무겁다).
  const [tierBursts, setTierBursts] = useState([])
  const tierBurstTimersRef = useRef([])
  // 라우트에 key가 없어 방을 옮겨도 이 컴포넌트가 재마운트되지 않는다 — roomId가 바뀔 때도
  // (언마운트 때와 마찬가지로) 진행 중이던 웨이브 타이머를 정리하고 화면에서 지운다.
  // 안 그러면 만렙 연출 도중 다른 방으로 이동했을 때 그 방 화면에서 남은 폭죽이 떠버린다.
  useEffect(() => () => {
    tierBurstTimersRef.current.forEach(clearTimeout)
    tierBurstTimersRef.current = []
    setTierBursts([])
  }, [roomId])

  const fireTierCelebration = useCallback((isMax) => {
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const mascotEl = document.querySelector('.clov-mascot-sprite') ?? document.querySelector('.clov-mascot')
    const mascotRect = mascotEl?.getBoundingClientRect()
    const bannerRect = sceneNodeRef.current?.getBoundingClientRect()
    const fallback = bannerRect
      ? { x: bannerRect.left + bannerRect.width / 2, y: bannerRect.top + bannerRect.height / 2 }
      : { x: window.innerWidth / 2, y: window.innerHeight / 2 }
    const mascotPoint = mascotRect ? { x: mascotRect.left + mascotRect.width / 2, y: mascotRect.top + mascotRect.height / 2 } : fallback

    const spawnStage = (point, count, spread, delay) => {
      const startTimer = setTimeout(() => {
        const stageId = `${Date.now()}-${Math.random()}`
        setTierBursts((cur) => [...cur, { id: stageId, x: point.x, y: point.y, particles: buildTierBurstParticles(count, spread) }])
        const endTimer = setTimeout(() => setTierBursts((cur) => cur.filter((b) => b.id !== stageId)), 1800)
        tierBurstTimersRef.current.push(endTimer)
      }, delay)
      tierBurstTimersRef.current.push(startTimer)
    }

    if (isMax) {
      // 만렙 6단계(프로토타입 triggerTierUpEvent 그대로): 정중앙(0ms) → 좌상(400) → 우상(800) →
      // 좌하(1200) → 우하(1600) → 마스코트 마무리(2000). 정중앙만 파티클 200개/spread 600으로 더 큼.
      const w = window.innerWidth, h = window.innerHeight
      spawnStage({ x: w / 2, y: h / 2 }, 200, 600, 0)
      spawnStage({ x: w * 0.2, y: h * 0.3 }, 100, 300, 400)
      spawnStage({ x: w * 0.8, y: h * 0.3 }, 100, 300, 800)
      spawnStage({ x: w * 0.3, y: h * 0.7 }, 100, 300, 1200)
      spawnStage({ x: w * 0.7, y: h * 0.7 }, 100, 300, 1600)
      spawnStage(mascotPoint, 150, 400, 2000)
    } else {
      spawnStage(mascotPoint, 100, 400, 0)
    }
  }, [])

  // 마지막으로 본 레벨을 방마다 기기-로컬(localStorage)에 저장해뒀다가 새 값과 비교해서
  // "티어가 바뀌었는지/만렙을 찍었는지" 판정한다. 같은 방을 쓰는 누구의 XP든(내 것이든 친구
  // 것이든) 레벨이 올랐으면 같이 축하한다 — 방 레벨은 개인 것이 아니라 공동 성과다.
  // localStorage를 쓰는 이유: 메모리(ref)만 쓰면 방을 나갔다 오거나(라우트에 key가 없어
  // 재마운트도 안 됨) 새로고침하면 기준값이 사라져서, 밖에 있는 동안 친구가 레벨을 올려도
  // 다시 들어왔을 때 못 잡는다 — localStorage는 페이지를 새로 열어도 남아있어서, 방에 다시
  // 들어왔을 때 "내가 마지막으로 본 값"과 비교해 뒤늦게라도(캐치업) 터뜨릴 수 있다.
  // 오탐 방지: level 쿼리가 로딩 중일 때의 임시값은 절대 안 읽고 안 쓴다(성공 후에만 비교·저장) —
  // 안 그러면 로딩 중 임시값이 기준으로 저장돼 화면 진입할 때마다 잘못 터질 수 있다.
  // 이 방(roomId)을 처음 보는 경우(저장된 값 없음)는 기준값만 저장하고 터뜨리지 않는다 —
  // 막 들어온 방의 기존 레벨을 "방금 달성"으로 오해하면 안 된다.
  useEffect(() => {
    const newLevel = level.data?.friendshipLevel
    if (!level.isSuccess || newLevel == null) return
    const storageKey = `clov-room-${roomId}-last-seen-level`
    let stored = null
    try {
      const raw = localStorage.getItem(storageKey)
      stored = raw != null ? Number(raw) : null
    } catch { /* storage 차단 무시 */ }
    if (stored != null && Number.isFinite(stored) && newLevel > stored) {
      // 배지에 실제로 표시되는 티어(tierFor)가 바뀌는 순간에 터뜨린다. 111의 배수 자체(110→111)로
      // 판정하면 이 저장소의 티어 경계(max 이하, 즉 111은 아직 "씨앗의 우정")랑 한 레벨 어긋나서
      // 두 가지가 깨진다 — ① 폭죽은 110→111에서 터지는데 배지 이름은 111→112에서 바뀌어 화면이
      // 안 맞고, ② 마지막 티어 진입(666→667, "전설의 클로버 우정")이 111의 배수가 아니라서 축하가
      // 아예 안 뜬다(대신 여전히 "황금빛" 상태인 666에서 터짐). tierFor 비교로 배지와 정확히 맞춘다.
      // 777은 tierFor(776) === tierFor(777)(둘 다 마지막 티어)이라 티어 비교만으론 안 잡혀서
      // 만렙 도달 여부를 별도로 OR 해준다(정본 space.js도 tierUp || maxLevelReached로 같은 구조).
      const tierUp = tierFor(newLevel) !== tierFor(stored)
      const maxReached = stored < MAX_LEVEL && newLevel >= MAX_LEVEL
      if (tierUp || maxReached) fireTierCelebration(maxReached)
    }
    try { localStorage.setItem(storageKey, String(newLevel)) } catch { /* storage 차단 무시 */ }
  }, [level.isSuccess, level.data?.friendshipLevel, roomId, fireTierCelebration])

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
  const progress = progressFromLevel(lv)
  const isFull = progress >= 100 && levelNum < MAX_LEVEL
  // GET /members는 LEFT 멤버도 함께 반환한다(계약 §6). 두 목록이 쓰이는 곳이 다르다.
  // - activeMemberItems: 지금 방에 있는 사람을 보여주거나 고르는 자리(명단·아바타·참여자 선택).
  //   헤더 숫자 data.memberCount가 서버에서 ACTIVE만 세므로 이걸 써야 숫자와 행 수가 맞는다.
  // - memberItems(LEFT 포함): 지난 기록에서 이름을 되찾는 자리(추억 상세). 여기서 거르면
  //   나간 사람이 남긴 한 줄 메시지가 통째로 사라진다(Feed.jsx formerComments).
  const memberItems = members.data?.items ?? []
  const activeMemberItems = memberItems.filter((m) => m.status === 'ACTIVE')
  const days = daysTogether(data.createdAt)
  const track = (memories.data?.items ?? []).length || 1

  // D-day 3칸 = 다가오는 약속만(#108/#112). 지난 일정으로 채우지 않는다 — 못 채운 칸은
  // 렌더링 쪽에서 고스트 카드("새로운 약속 만들기")로 채워진다.
  // ddayDiff는 읽을 수 없는 날짜에 null을 준다. null >= 0 은 true라서 명시적으로 걸러야 한다.
  const planItems = plans.data?.items ?? []
  const futurePlans = planItems
    // 다가오는 칸은 아직 안 한 약속만 — 완료/취소된 약속은 "다가오는"이 아니다.
    .filter((p) => p.status === 'SCHEDULED')
    .filter((p) => { const d = ddayDiff(p.planDate); return d !== null && d >= 0 })
    .sort((a, b) => a.planDate.localeCompare(b.planDate))
  const ddaySlots = futurePlans.slice(0, 3)
  const memoryItems = (memories.data?.items ?? []).slice(0, 24)

  const savedStatus = data.myStatusMessage ?? ''
  const statusValue = statusDraft ?? savedStatus
  const statusLen = statusValue.length
  const statusDirty = statusDraft !== null && statusDraft.trim() !== savedStatus.trim()
  const statusOver = statusLen > STATUS_MAX
  const go = (path) => navigate(`/rooms/${roomId}/${path}`)

  return (
    <>
    <div className="proto-dashboard">
      <Header variant="room" roomId={roomId} activeTab="space" />
      <Mascot roomId={roomId} />
      <div className="dash-main">
        {/* 성장 배너 */}
        <div className="v5-scene" ref={sceneRef} data-season={sKey} data-bg-theme="lp-turntable" data-level={levelNum} data-event={isMyBirthday ? 'my_birthday' : isFriendBirthday ? 'friend_birthday' : 'none'}>
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
            <div
              className="v5-photo-rec"
              style={recStyle}
              onClick={handleRecordClick}
              role="button"
              tabIndex={0}
              aria-label="LP 레코드판"
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleRecordClick() } }}
            >
              <div className="v5-photo-rec-shine" />
              {burst && (
                <div className="v5-photo-burst" style={{ left: '50%', top: '50%' }}>
                  {/* key에 burst.key(클릭 타임스탬프)를 섞어야 연속 클릭 시 React가 새 엘리먼트로 보고
                      애니메이션을 재시작한다 — id만 쓰면 같은 노드를 재사용해 애니메이션이 안 터진다. */}
                  {burst.confetti.map((p) => <span key={`${burst.key}-${p.id}`} className="v5-photo-confetti" style={p.style} />)}
                  {burst.notes.map((n) => <span key={`${burst.key}-${n.id}`} className="v5-photo-note" style={n.style}>{n.glyph}</span>)}
                </div>
              )}
            </div>
          )}
          <div className="banner-hud">
            <div>
              <p className={`hud-eyebrow ${anyBirthday ? 'is-birthday' : ''}`}>
                {isMyBirthday ? '🎂 생일 축하해요!' : isFriendBirthday ? `🎉 ${birthdayFriend.nickname}님의 생일입니다!` : '우리 함께한 지'}
              </p>
              <p className="hud-dday">D+{days}<span>일째</span></p>
            </div>
            <div className="hud-bottom">
              <div className="v5-photo-chip">
                <span className="v5-photo-chip-dot" />
                <span className="v5-photo-chip-text">{SEASON_LABEL[sKey]} 추억 재생 중 · {track}번째 트랙</span>
              </div>
              <div className={`lv-pill${isFull ? ' is-full' : ''}`} onClick={() => setHistoryOpen(true)} title="경험치 히스토리 보기">
                <div className={`lv-pill-bg${xpPulse ? ' is-pulse-xp' : ''}`} style={{ width: `${progress}%` }} />
                <div className="lv-pill-content">
                  <span className="lv-badge-icon">Lv.{levelNum}</span>
                  <span className="lv-badge-name"><i className={`ti ti-${tier.icon}`} aria-hidden="true" /> {tier.name}</span>
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
              <div className="main-photo-empty" title="대표 사진 추가" aria-label="대표 사진 추가" onClick={() => setUploadOpen(true)}>
                <i className="ti ti-camera-plus" aria-hidden="true" />
              </div>
            )}
          </div>
          <div className="cover-summary">
            <div className="cover-title-row">
              <div className="title-input-box" onClick={(e) => e.currentTarget.querySelector('input')?.focus()}>
                <input
                  className="cover-status-input"
                  value={statusValue}
                  maxLength={STATUS_MAX}
                  placeholder="상태 메시지를 남겨보세요"
                  onChange={(e) => setStatusDraft(e.target.value)}
                />
                <span className="cover-status-count">{statusLen} / {STATUS_MAX}</span>
                {!statusValue && <span className="cover-status-hint">(최대 {STATUS_MAX}자)</span>}
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
                    {activeMemberItems.slice(0, 4).map((m, i) => (
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
          <span className="section-title-label">다가오는 D-day</span>
          <div className="section-actions">
            <Button variant="dashed" size="sm" onClick={() => setComposeSchedule(true)}>+ 새 D-day 만들기</Button>
          </div>
        </div>
        {/* 항상 3칸 — 다가오는 약속 → 지난 약속 → 그래도 남으면 "새로운 약속 만들기" 고스트 카드
            (정본 top3 로직 이식, #112). 지난 약속은 회색 D+ 배지로 구분된다. */}
        <div className="schedule-grid">
          {[0, 1, 2].map((i) => {
            const p = ddaySlots[i]
            if (!p) {
              return (
                <div key={`ghost-${i}`} className="schedule-banner schedule-banner--ghost" onClick={() => setComposeSchedule(true)}>
                  <div className="schedule-info">
                    <span className="schedule-icon">+</span>
                    <span className="schedule-title">새로운 약속 만들기</span>
                  </div>
                </div>
              )
            }
            return (
              <div key={p.id} className="schedule-banner" onClick={() => go('schedule')}>
                <div className="schedule-info">
                  <i className="ti ti-calendar schedule-icon" aria-hidden="true" />
                  <span className="schedule-title">{p.title}</span>
                  <span className="schedule-date">{p.planDate}</span>
                </div>
                <span className={`schedule-dday-badge is-${ddayUrgency(ddayDiff(p.planDate))}`}>{ddayLabel(ddayDiff(p.planDate))}</span>
              </div>
            )
          })}
        </div>

        {/* 참여자별 추억 증거 카드 */}
        <div className="section-title">
          <span className="section-title-label">참여자별 추억 증거 카드</span>
          <div className="section-actions">
            <Button variant="dashed" size="sm" onClick={() => setComposeMemory(true)}><i className="ti ti-pencil" aria-hidden="true" /> 글쓰기</Button>
            <Button variant="dashed" size="sm" onClick={() => go('feed')}>전체 피드 보기</Button>
          </div>
        </div>
        {memoryItems.length === 0 ? (
          <div className="memory-empty">아직 추억이 없어요. 피드에서 첫 추억을 남겨보세요.</div>
        ) : (
          <EvidenceViewer memories={memoryItems} cardTheme={memoryCardTheme} onOpen={(id) => setSelectedMemoryId(id)} />
        )}
      </div>

      {membersOpen && (
        <div className="member-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setMembersOpen(false) }}>
          <div className="member-modal" role="dialog" aria-modal="true" aria-label="참여 멤버">
            <div className="member-modal-head">
              <span className="member-modal-title">참여 멤버 · {data.memberCount}명</span>
              <button type="button" className="member-modal-close" onClick={() => setMembersOpen(false)} aria-label="닫기">✕</button>
            </div>
            <button type="button" className="member-invite-btn" onClick={() => { setMembersOpen(false); setInviteOpen(true) }}>
              ＋ 친구 초대 (초대코드 보내기)
            </button>
            {activeMemberItems.map((m, i) => (
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

      {inviteOpen && (
        <InviteModal roomId={roomId} roomName={data.name} onClose={() => setInviteOpen(false)} />
      )}

      {historyOpen && (
        <ExpHistoryModal roomId={roomId} onClose={() => setHistoryOpen(false)} />
      )}

      {tierBursts.length > 0 && createPortal(
        <div className="tier-burst-layer" aria-hidden="true">
          {tierBursts.map((wave) => (
            <div key={wave.id} className="tier-burst" style={{ left: wave.x, top: wave.y }}>
              {wave.particles.map((p) => <span key={p.id} className="tier-burst-particle" style={p.style} />)}
            </div>
          ))}
        </div>,
        document.body,
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
          members={activeMemberItems.filter((m) => String(m.userId) !== String(currentUserId))}
          submitting={createMemoryMutation.isPending}
          errorMessage={createMemoryMutation.error?.message}
          onCancel={() => setComposeMemory(false)}
          onSubmit={(planId, payload, files) => createMemoryMutation.mutate({ planId, payload, files })}
        />
      </div>
    )}
    {selectedMemoryId && (
      <div className="proto-feed" style={{ minHeight: 0 }}>
        <DashboardMemoryDetail
          memoryId={selectedMemoryId}
          roomId={roomId}
          currentUserId={currentUserId}
          members={memberItems}
          onClose={() => setSelectedMemoryId(null)}
        />
      </div>
    )}
    </>
  )
}

// 우정공간 증거 카드에서 여는 추억 상세 — 피드와 동일한 여권 상세 모달(MemoryDetailModal)을
// 공용 훅(useMemoryDetail)으로 그대로 재사용한다.
function DashboardMemoryDetail({ memoryId, roomId, currentUserId, members, onClose }) {
  const memoryDetail = useMemoryDetail(memoryId, roomId, { onDeleted: onClose })
  return <MemoryDetailModal {...memoryDetail} roomId={roomId} currentUserId={currentUserId} members={members} onClose={onClose} />
}

// 친구 초대 모달 — 방의 활성 초대코드를 만들어/보여주고 복사·공유(계약 §7).
// 코드로 입장 신청은 상대가 방 목록(RoomList)에서, 수락은 멤버가 알림에서 처리한다.
function InviteModal({ roomId, roomName, onClose }) {
  const queryClient = useQueryClient()
  const confirm = useConfirm()
  const [copied, setCopied] = useState('')

  const invites = useQuery({ queryKey: ['invites', roomId], queryFn: () => getInvites(roomId) })
  const activeInvites = (invites.data?.items ?? []).filter((iv) => iv.status === 'ACTIVE')
  const active = activeInvites[0] ?? null
  const code = active?.inviteCode ?? null

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['invites', roomId] })
  const createMutation = useMutation({ mutationFn: () => createInvite(roomId, {}), onSuccess: invalidate })
  const cancelMutation = useMutation({ mutationFn: (inviteId) => cancelInvite(inviteId), onSuccess: invalidate })

  const shareText = code
    ? `우리 우정공간 "${roomName ?? 'Clov'}"에 초대해요! 🍀\nClov 앱에서 아래 코드로 입장을 신청하세요.\n초대코드: ${code}`
    : ''
  const copy = async (text, key) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(key)
      setTimeout(() => setCopied(''), 1500)
    } catch {
      /* 클립보드 미지원/거부 — 사용자가 직접 선택 복사 */
    }
  }

  return (
    <div className="invite-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="invite-modal" role="dialog" aria-modal="true" aria-label="친구 초대">
        <div className="invite-modal-head">
          <span className="invite-modal-title"><i className="ti ti-user-plus" aria-hidden="true" /> 친구 초대하기</span>
          <button type="button" className="invite-modal-close" onClick={onClose} aria-label="닫기">✕</button>
        </div>
        <div className="invite-icon"><i className="ti ti-mail" aria-hidden="true" /></div>
        <p className="invite-desc">
          아래 초대 코드를 복사해 친구에게 보내세요.<br />
          친구가 코드로 입장을 신청하면, 멤버 누구나 수락할 수 있어요.
        </p>

        {invites.isPending ? (
          <div className="invite-state">불러오는 중…</div>
        ) : code ? (
          <>
            <div className="invite-code-box">
              <span className="invite-code">{code}</span>
              <button type="button" className="invite-copy-btn" onClick={() => copy(code, 'code')}>
                {copied === 'code' ? '복사됨 ✓' : '복사'}
              </button>
            </div>
            <button type="button" className="invite-share-btn" onClick={() => copy(shareText, 'msg')}>
              {copied === 'msg' ? '초대 메시지 복사됨 ✓' : '초대 메시지 복사'}
            </button>
            <button
              type="button"
              className="invite-sub-btn"
              disabled={cancelMutation.isPending}
              onClick={async () => { if (await confirm('이 초대 코드를 만료할까요? 기존 코드로는 더 입장 신청을 못 해요.', { confirmText: '만료', variant: 'danger' })) cancelMutation.mutate(active.id) }}
            >
              이 코드 만료하기
            </button>
          </>
        ) : (
          <>
            <div className="invite-empty">아직 만든 초대 코드가 없어요.</div>
            <button type="button" className="invite-create-btn" disabled={createMutation.isPending} onClick={() => createMutation.mutate()}>
              {createMutation.isPending ? '만드는 중…' : '초대 코드 만들기'}
            </button>
          </>
        )}
        {(createMutation.isError || cancelMutation.isError) && (
          <div className="invite-state" role="alert">잠시 후 다시 시도해 주세요.</div>
        )}
      </div>
    </div>
  )
}

// 경험치 히스토리 — 레벨 배지 클릭으로 열리는 exp-logs 목록(계약 §12). 계약은 전체 이력을 그대로
// 반환하지만(DB는 영구 보존), 화면은 오늘 것만 보여준다 — 팀장 합의로 화면단에서만 거른다.
// 필터는 렌더 시점에만 평가되므로 모달을 열어둔 채 자정을 넘겨도 실시간 갱신은 안 되고,
// 다시 열면 갱신된다.
function ExpHistoryModal({ roomId, onClose }) {
  const logsQuery = useQuery({ queryKey: ['room', roomId, 'exp-logs'], queryFn: () => getExpLogs(roomId) })
  const allItems = logsQuery.data?.items ?? []
  // createdAt은 오프셋 없는 UTC라 문자열을 그대로 잘라 비교하면(slice(0,10)) KST 00~09시 사이엔
  // 하루가 밀린다 — parseUtc로 파싱한 뒤 브라우저 로컬 날짜(연/월/일)로 비교한다.
  // parseUtc는 값이 잘못되면 null을 주므로 필터에서 반드시 걸러야 한다(안 그러면 getFullYear에서 죽는다).
  const now = new Date()
  const items = allItems.filter((log) => {
    const d = parseUtc(log.createdAt)
    return d && d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
  })
  // 그룹핑은 오늘 필터(#116) 결과 위에 얹는다 — 순서가 반대면 어제/오늘 항목이 한 그룹으로
  // 섞인 뒤 대표 시각 하나로 걸러지면서 날짜가 어긋날 수 있다(팀장 리뷰).
  const groupedItems = groupAdjacentImageBonus(items)

  return (
    <div className="member-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="member-modal" role="dialog" aria-modal="true" aria-label="경험치 히스토리">
        <div className="member-modal-head">
          <span className="member-modal-title">경험치 히스토리</span>
          <button type="button" className="member-modal-close" onClick={onClose} aria-label="닫기">✕</button>
        </div>
        {logsQuery.isPending && <div className="exp-history-empty">불러오는 중…</div>}
        {logsQuery.isError && <div className="exp-history-empty">경험치 히스토리를 불러오지 못했습니다.</div>}
        {logsQuery.isSuccess && items.length === 0 && (
          <div className="exp-history-empty">
            {allItems.length === 0 ? '아직 쌓인 경험치가 없어요.' : '오늘 쌓은 경험치가 없어요.'}
          </div>
        )}
        {logsQuery.isSuccess && groupedItems.map((log) => (
          <div className="exp-history-row" key={log.id}>
            <span className="member-row-av exp-history-av">{log.triggeredBy?.profileImageUrl ? <img src={log.triggeredBy.profileImageUrl} alt="" /> : initialOf(log.triggeredBy?.nickname)}</span>
            <div className="exp-history-main">
              <div className="exp-history-label">
                {log.triggeredBy?.nickname ?? '알 수 없음'}님 · {expActionLabel(log.actionType)}{log.count > 1 ? ` ×${log.count}` : ''}
              </div>
              <div className="exp-history-date">{formatDate(log.createdAt)} {formatTime(log.createdAt)}</div>
            </div>
            <span className="exp-history-delta">+{log.expDelta}</span>
          </div>
        ))}
      </div>
    </div>
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

// 카드 아바타 = 작성자(대표) + 나머지 참여자, 중복 제외(Feed.jsx cardAvatars와 동일 규칙, #206).
const memoryAvatars = (memory) => {
  const author = memory.writer
  const others = (memory.participants ?? []).filter((p) => String(p.id) !== String(author?.id))
  return [author, ...others].filter(Boolean)
}

// cline 폴라로이드(빨랫줄 카드).
function ClinePolaroid({ memory, isActive, onOpen }) {
  const dateText = (memory.memoryDate || '').slice(5) // MM-DD
  const tags = (memory.tags ?? []).slice(0, 3)
  const avatars = memoryAvatars(memory)
  return (
    <article
      className={`cline-polaroid ${isActive ? 'is-active' : ''}`}
      onClick={onOpen ? (e) => { e.stopPropagation(); onOpen() } : undefined}
    >
      <div className="cline-card-header">
        <div className="cline-avatars">
          {avatars.map((p, idx) => (
            <span key={p.id ?? idx} className={`cline-avatar ${idx === 0 ? '' : 'is-friend'}`} title={p.nickname}>
              {p.profileImageUrl ? <img src={p.profileImageUrl} alt="" /> : initialOf(p.nickname)}
            </span>
          ))}
        </div>
        <span className="cline-header-date">{dateText}</span>
      </div>
      <div className="cline-photo">
        {memory.thumbnailUrl ? (
          <img src={memory.thumbnailUrl} alt={memory.title} draggable={false} />
        ) : (
          <div className="cline-no-photo"><i className="ti ti-photo-off cline-no-photo-icon" aria-hidden="true" /><span className="cline-no-photo-text">사진 없음</span></div>
        )}
      </div>
      <div className="cline-caption">
        <div className="cline-caption-title">{memory.title}</div>
        <div className="cline-tags">{tags.map((t) => <span key={t} className="cline-tag">#{t}</span>)}</div>
      </div>
    </article>
  )
}

// 일기장 테마의 배경 레이어 — 펼친 책(종이 두께·본문·책등) + 메모지 + 스티커.
// 전부 장식이라 pointer-events는 CSS에서 없애고, 카드 클릭을 가리지 않도록 cline-wire-area 앞에 깐다.
function DiaryStage() {
  return (
    <>
      <div className="diary-page-stack left" />
      <div className="diary-page-stack right" />

      <div className="diary-page-text left-page" />
      <div className="diary-spine" />
      <div className="diary-page-text right-page" />

      <div className="diary-memo" />

      <div className="diary-sticker clover" style={{ top: '8%', left: '6%', transform: 'rotate(-15deg) scale(1.15)' }} />
      <div className="diary-sticker flower" style={{ top: '55%', left: '12%', transform: 'rotate(18deg) scale(1.05)' }} />
      <div className="diary-sticker clover" style={{ bottom: '10%', left: '4%', transform: 'rotate(-8deg) scale(1.2)' }} />

      <div className="diary-sticker flower" style={{ top: '12%', right: '5%', transform: 'rotate(12deg) scale(1.2)' }} />
      <div className="diary-sticker clover" style={{ top: '45%', right: '8%', transform: 'rotate(-5deg) scale(1.8)' }} />
      <div className="diary-sticker flower" style={{ bottom: '8%', right: '8%', transform: 'rotate(22deg) scale(1.15)' }} />
    </>
  )
}

// 참여자별 추억 증거 카드 — 빨랫줄+집게 캐러셀 + 필름스트립(프로토타입 cline 뷰어 기본 테마 이식).
// 최신순 memories에서 index=현재("현재"), +delta=과거·-delta=최신 카드를 좌우로 건다.
// cardTheme: 'clothesline'(빨랫줄, 기본 마크업) | 'stack'(겹침 카드, 빨랫줄/집게 없이 카드가 겹쳐 쌓임)
// | 'diary'(일기장, 펼친 책 위에 카드가 부채꼴로 놓임).
function EvidenceViewer({ memories, cardTheme = 'stack', onOpen }) {
  const [index, setIndex] = useState(0)
  // 겹침 카드 방향성 전환(#114 P2). dir = 정본 space.js:13의 evidenceSlideDirection —
  // 과거로 넘기면 'past', 최신으로 넘기면 'current'.
  // seq는 애니메이션 재시작용이다: 슬롯 <div>는 key={cls}로 고정돼 index가 바뀌어도 같은 DOM 노드가
  // 재사용되기 때문에, 클래스만 그대로면 CSS 애니메이션이 다시 돌지 않는다(같은 방향 연속 클릭).
  // .cline-cards의 key를 갈아 리마운트시켜 정본(innerHTML 재생성)과 같은 재시작을 만든다.
  const [slide, setSlide] = useState({ dir: null, seq: 0 })
  const framesRef = useRef(null)
  const drag = useRef({ active: false, startX: 0, startLeft: 0, moved: false })
  // 지금 기울어져 있는 카드. state가 아니라 ref인 이유는 마우스가 움직일 때마다 리렌더가 나면
  // 안 되기 때문이다 — 각도는 CSS 변수로 DOM에 직접 쓴다(정본 space.js:1330-1360과 같은 방식).
  const tilted = useRef(null)
  const total = memories.length
  const clamp = (i) => Math.min(Math.max(i, 0), total - 1)
  const isStack = cardTheme === 'stack'
  const isDiary = cardTheme === 'diary'
  // 겹침 카드·일기장은 같은 슬롯 구성(±3)에 빨랫줄/집게가 없다. 일기장은 CSS에서 바깥 슬롯을 숨겨 4장만 보인다.
  const isFanned = isStack || isDiary

  // 카드 이동은 전부 이 함수를 거친다(카드 클릭·필름스트립 클릭). 방향을 여기서 한 번만 정한다.
  const goTo = (next) => {
    const target = clamp(next)
    if (target === index) return
    setSlide((prev) => ({ dir: target > index ? 'past' : 'current', seq: prev.seq + 1 }))
    setIndex(target)
  }

  // index가 바뀌면 현재 프레임을 필름 중앙으로 스크롤.
  useEffect(() => {
    const container = framesRef.current
    const cur = container?.querySelector('.cline-film-frame.is-current')
    if (container && cur) {
      // scrollIntoView는 컨테이너가 overflow-y:hidden이라 세로 스크롤을 못 찾고 window까지
      // 올라가 대시보드 전체를 아래로 끌어내렸다(#240). scrollLeft만 직접 계산해 가로로만 맞춘다.
      const containerRect = container.getBoundingClientRect()
      const curRect = cur.getBoundingClientRect()
      const offset = (curRect.left + curRect.width / 2) - (containerRect.left + containerRect.width / 2)
      container.scrollTo({ left: container.scrollLeft + offset, behavior: 'smooth' })
    }
    // 카드가 넘어가면 .cline-cards가 통째로 리마운트되므로(P2의 key 교체) 기울여 뒀던 카드는
    // DOM에서 떨어져 나간다. 참조만 남으면 그 노드가 회수되지 않으니 여기서 놓아준다.
    tilted.current = null
  }, [index])

  const SLOTS = [
    ...(isFanned ? [{ delta: 3, cls: 'far-far-past' }] : []),
    { delta: 2, cls: 'far-past' },
    { delta: 1, cls: 'past' },
    { delta: 0, cls: 'current' },
    { delta: -1, cls: 'newer' },
    { delta: -2, cls: 'far-newer' },
    ...(isFanned ? [{ delta: -3, cls: 'far-far-newer' }] : []),
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

  // ── 겹침 카드 3D 마우스 틸트 (#114 P3) ─────────────────────────────────
  // 정본 space.js:1330-1360은 window에 리스너를 달고 뷰어를 closest로 찾아 위임하지만,
  // React에서는 뷰어 컨테이너에 직접 걸면 같은 위임이면서 언마운트 시 정리까지 자동이다.
  const untilt = () => {
    const card = tilted.current
    if (!card) return
    tilted.current = null
    card.style.removeProperty('--rotateX')
    card.style.removeProperty('--rotateY')
    card.classList.remove('is-3d-hovering')
    card.closest('.cline-card-slot')?.classList.remove('is-3d-hovering')
  }

  const onTiltMove = (e) => {
    // 손가락·펜은 제외한다. 터치는 포인터가 화면을 "떠나는" 이벤트가 없어서 탭 한 번에
    // 기울어진 채로 굳어버린다(정본에는 이 가드가 없다 — 목업이 데스크톱 전용이라 드러나지 않았을 뿐).
    const card = e.pointerType === 'mouse' ? e.target.closest('.cline-polaroid') : null
    if (tilted.current && tilted.current !== card) untilt()
    if (!card) return

    // 기준점은 카드가 아니라 부모 슬롯이다. 카드는 자기가 기울면 사각형이 같이 움직여서
    // 그걸 기준으로 각도를 다시 계산하면 서로를 밀어내며 떨린다(정본 주석의 jitter).
    const slot = card.closest('.cline-card-slot') ?? card
    const rect = slot.getBoundingClientRect()
    const unit = (v) => Math.max(-1, Math.min(1, v))
    const normX = unit((e.clientX - (rect.left + rect.width / 2)) / (rect.width / 2))
    const normY = unit((e.clientY - (rect.top + rect.height / 2)) / (rect.height / 2))

    tilted.current = card
    card.style.setProperty('--rotateY', `${(normX * 18).toFixed(2)}deg`)
    card.style.setProperty('--rotateX', `${(-normY * 15).toFixed(2)}deg`)
    card.classList.add('is-3d-hovering')
    slot.classList.add('is-3d-hovering')
  }

  return (
    <div
      className={`memory-evidence-viewer cline-viewer ${isStack ? 'theme-coverflow' : ''} ${isDiary ? 'theme-diary' : ''}`}
      onPointerMove={isStack ? onTiltMove : undefined}
      onPointerLeave={isStack ? untilt : undefined}
    >
      <div className="cline-stage">
        {isDiary && <DiaryStage />}
        <div className="cline-wire-area">
          <div className="cline-wire" />
          {/* 겹침 카드만 방향 클래스를 단다(#114 P2). key를 갈아 애니메이션을 재시작시키므로
              다른 테마에서는 불필요한 리마운트가 없게 고정 key를 쓴다.
              전환이 끝난 뒤 클래스를 지우지 않는 것은 의도적이다 — 각 keyframe의 100%가 정적 규칙과
              같은 값이라 forwards로 멈춘 상태가 정적 대열과 동일하고, 다음 이동에서 어차피 덮인다. */}
          <div
            key={isStack ? slide.seq : 'cards'}
            className={`cline-cards${isStack && slide.dir ? ` slide-${slide.dir}` : ''}`}
          >
            {SLOTS.map(({ delta, cls }) => {
              const i = index + delta
              if (i < 0 || i >= total) {
                // 겹침 카드·일기장은 빈 슬롯도 슬롯 클래스를 달아야 CSS가 자리를 잡는다.
                // 일기장은 바깥 슬롯(far-newer 등)을 숨겨 4장 배치를 유지하고,
                // 겹침 카드는 .is-empty 규칙이 210px 폭·-38px 마진을 고정해 3D 대열이 어긋나지 않게 한다(정본 space.js:1191).
                return <div key={cls} className={`cline-card-slot cline-slot--empty ${isFanned ? `cline-slot--${cls} is-empty` : ''}`} />
              }
              const isActive = delta === 0
              // 일기장: 펼친 책의 양쪽 페이지(delta 0·1) 둘 다 상세보기로 열린다.
              const opensDetail = isActive || (isDiary && delta === 1)
              // 일기장: 바깥쪽(+2) 카드는 2칸이 아니라 1칸만 넘겨 "책장을 한 장씩 넘기는" 느낌을 유지한다.
              const target = isDiary && delta === 2 ? index + 1 : i
              return (
                <div
                  key={cls}
                  className={`cline-card-slot cline-slot--${cls} ${isActive ? 'is-active' : ''}`}
                  onClick={opensDetail ? undefined : () => goTo(target)}
                >
                  {!isFanned && <Clothespin />}
                  <ClinePolaroid memory={memories[i]} isActive={isActive} onOpen={opensDetail ? () => onOpen(memories[i]?.id) : undefined} />
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
                  onClick={() => { if (!drag.current.moved) goTo(orig) }}
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

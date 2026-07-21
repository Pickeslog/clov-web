import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as S from './Dashboard.style'
import { getRoom, getRoomLevel, getRoomMembers, updateStatusMessage } from '../../../api/room'
import { getPlans } from '../../../api/plan'
import { getMemories } from '../../../api/memory'
import { useAuthStore } from '../../../stores/authStore'

// 진입 도메인 화면들 — D-day/추억 섹션이 schedule/feed로 직접 링크하므로 여기선 편지·초대·알림만.
const SECTIONS = [
  { key: 'letters', label: '행운편지', path: 'letters' },
  { key: 'invite', label: '초대하기', path: 'invite' },
  { key: 'notifications', label: '알림', path: 'notifications' },
]

// 우정 성장 티어(프로토타입 desktop.js 정본, 레벨 1~7).
const TIERS = [
  { name: '씨앗의 우정', icon: '🌱' },
  { name: '새싹의 우정', icon: '🌿' },
  { name: '초록 클로버 우정', icon: '💚' },
  { name: '무성한 클로버 들판', icon: '🍀' },
  { name: '반짝이는 클로버 우정', icon: '🌟' },
  { name: '황금빛 클로버 우정', icon: '👑' },
  { name: '전설의 클로버 우정', icon: '💎' },
]
const tierFor = (level) => TIERS[Math.min(Math.max(level ?? 1, 1), TIERS.length) - 1]

const DAY = 86400000
// 백엔드는 오프셋 없는 UTC(LocalDateTime)를 반환 → Z 붙여 파싱.
const parseUtc = (value) => new Date(value.endsWith('Z') ? value : `${value}Z`)
const seasonOf = (month) => (month >= 3 && month <= 5 ? '봄' : month >= 6 && month <= 8 ? '여름' : month >= 9 && month <= 11 ? '가을' : '겨울')

// createdAt(UTC) 이후 함께한 일수(첫날 = D+1).
const daysTogether = (createdAt) => {
  if (!createdAt) return 1
  return Math.floor((Date.now() - parseUtc(createdAt).getTime()) / DAY) + 1
}
// planDate(YYYY-MM-DD, 자정 기준)까지 남은 일수. 오늘 = 0.
const ddayOf = (planDate) => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((new Date(`${planDate}T00:00:00`).getTime() - today.getTime()) / DAY)
}
const ddayLabel = (n) => (n === 0 ? 'D-DAY' : n > 0 ? `D-${n}` : `D+${-n}`)

export default function Dashboard() {
  const { roomId } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const clear = useAuthStore((state) => state.clear)

  const room = useQuery({ queryKey: ['room', roomId], queryFn: () => getRoom(roomId) })
  const level = useQuery({ queryKey: ['room', roomId, 'level'], queryFn: () => getRoomLevel(roomId) })
  const members = useQuery({ queryKey: ['room', roomId, 'members'], queryFn: () => getRoomMembers(roomId) })
  const plans = useQuery({ queryKey: ['plans', roomId, { status: 'SCHEDULED' }], queryFn: () => getPlans(roomId, { status: 'SCHEDULED' }) })
  const memories = useQuery({ queryKey: ['memories', roomId, {}], queryFn: () => getMemories(roomId) })

  const [editingStatus, setEditingStatus] = useState(false)
  const [statusDraft, setStatusDraft] = useState('')
  const statusMutation = useMutation({
    mutationFn: (message) => updateStatusMessage(roomId, message),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['room', roomId] })
      setEditingStatus(false)
    },
  })

  if (room.isPending) {
    return <S.Page><S.State>불러오는 중…</S.State></S.Page>
  }
  if (room.isError) {
    return (
      <S.Page>
        <S.State>
          우정공간을 불러오지 못했습니다.
          <button type="button" onClick={() => navigate('/')}>돌아가기</button>
        </S.State>
      </S.Page>
    )
  }

  const data = room.data
  const lv = level.data
  const tier = tierFor(lv?.friendshipLevel ?? data.friendshipLevel)
  const progress = lv?.expForNextLevel ? Math.min(100, Math.round((lv.expPoint / lv.expForNextLevel) * 100)) : 0
  const memberItems = members.data?.items ?? []
  const days = daysTogether(data.createdAt)
  const season = seasonOf(new Date().getMonth() + 1)

  const upcoming = (plans.data?.items ?? [])
    .filter((p) => p.planDate && ddayOf(p.planDate) >= 0)
    .sort((a, b) => a.planDate.localeCompare(b.planDate))
    .slice(0, 3)
  const memoryItems = (memories.data?.items ?? []).slice(0, 4)
  const track = (memories.data?.items ?? []).length || 1

  return (
    <S.Page>
      <S.TopBar>
        <Link to="/" style={{ textDecoration: 'none' }}><S.Brand>Clov.</S.Brand></Link>
        <S.HeaderActions>
          <S.NotiBtn to={`/rooms/${roomId}/notifications`} aria-label="알림">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </S.NotiBtn>
          <S.LogoutBtn type="button" onClick={clear}>로그아웃</S.LogoutBtn>
        </S.HeaderActions>
      </S.TopBar>

      <S.DdayBanner>
        <S.DdaySmall>우리 함께한 지</S.DdaySmall>
        <S.DdayBig>D+{days}<span>일째</span></S.DdayBig>
        <S.DdayTrack>{season} 추억 재생 중 · {track}번째 트랙</S.DdayTrack>
      </S.DdayBanner>

      <S.Hero $cover={data.coverPhotoUrl}>
        <S.HeroInner>
          <S.RoomName>{data.name}</S.RoomName>
          {data.description && <S.RoomDesc>{data.description}</S.RoomDesc>}
          <S.MetaRow>
            <S.Meta>멤버 {data.memberCount}명</S.Meta>
            <S.Meta>Lv.{lv?.friendshipLevel ?? data.friendshipLevel} · {tier.icon} {tier.name}</S.Meta>
            {lv && <S.Meta>{progress}%</S.Meta>}
          </S.MetaRow>
          {lv && (
            <S.LevelBar role="progressbar" aria-valuenow={progress} aria-label={`우정 레벨 ${lv.friendshipLevel}, 다음 레벨까지 ${lv.remainingToNextLevel} XP`}>
              <S.LevelFill style={{ width: `${progress}%` }} />
            </S.LevelBar>
          )}
        </S.HeroInner>
      </S.Hero>

      <S.StatusCard>
        {editingStatus ? (
          <S.StatusEdit>
            <S.StatusInput
              value={statusDraft}
              maxLength={100}
              placeholder="우리 공간의 상태 메시지를 남겨보세요"
              onChange={(e) => setStatusDraft(e.target.value)}
              autoFocus
            />
            <S.StatusMeta>{statusDraft.length}/100</S.StatusMeta>
            <S.StatusActions>
              <S.StatusSave type="button" disabled={statusMutation.isPending} onClick={() => statusMutation.mutate(statusDraft.trim())}>
                {statusMutation.isPending ? '저장 중…' : '저장'}
              </S.StatusSave>
              <S.StatusCancel type="button" onClick={() => setEditingStatus(false)}>취소</S.StatusCancel>
            </S.StatusActions>
          </S.StatusEdit>
        ) : (
          <S.StatusView onClick={() => { setStatusDraft(data.myStatusMessage ?? ''); setEditingStatus(true) }}>
            <S.StatusText $empty={!data.myStatusMessage}>
              {data.myStatusMessage || '상태 메시지를 남겨보세요 ✏️'}
            </S.StatusText>
            <S.StatusEditHint>수정</S.StatusEditHint>
          </S.StatusView>
        )}
      </S.StatusCard>

      <S.Members>
        {memberItems.slice(0, 8).map((member) => (
          <S.Avatar key={member.membershipId ?? member.userId} title={member.nickname}>
            {member.profileImageUrl ? <img src={member.profileImageUrl} alt="" /> : (member.nickname?.[0] ?? '?')}
          </S.Avatar>
        ))}
        <S.MemberLabel>{data.memberCount}명 함께하는 중</S.MemberLabel>
      </S.Members>

      <S.Block>
        <S.BlockHead>
          <S.BlockTitle>다가오는 D-day</S.BlockTitle>
          <S.BlockLink to={`/rooms/${roomId}/schedule`}>+ 새 D-day 만들기</S.BlockLink>
        </S.BlockHead>
        {upcoming.length === 0 ? (
          <S.Empty>예정된 약속이 없어요. 새 D-day를 만들어보세요.</S.Empty>
        ) : (
          <S.DdayList>
            {upcoming.map((p) => (
              <S.DdayItem key={p.id} to={`/rooms/${roomId}/schedule`}>
                <S.DdayItemTitle>{p.title}</S.DdayItemTitle>
                <S.DdayItemDate>{p.planDate}</S.DdayItemDate>
                <S.DdayChip>{ddayLabel(ddayOf(p.planDate))}</S.DdayChip>
              </S.DdayItem>
            ))}
          </S.DdayList>
        )}
      </S.Block>

      <S.Block>
        <S.BlockHead>
          <S.BlockTitle>참여자별 추억 증거 카드</S.BlockTitle>
          <S.BlockLink to={`/rooms/${roomId}/feed`}>전체 피드 보기</S.BlockLink>
        </S.BlockHead>
        {memoryItems.length === 0 ? (
          <S.Empty>아직 추억이 없어요. 피드에서 첫 추억을 남겨보세요.</S.Empty>
        ) : (
          <S.MemoryGrid>
            {memoryItems.map((m) => (
              <S.MemoryCard key={m.id} to={`/rooms/${roomId}/feed`}>
                <S.MemoryThumb>{m.thumbnailUrl ? <img src={m.thumbnailUrl} alt="" /> : '🍀'}</S.MemoryThumb>
                <S.MemoryWriter>{m.writer?.nickname}</S.MemoryWriter>
                <S.MemoryTitle>{m.title}</S.MemoryTitle>
                {m.memoryDate && <S.MemoryDate>{m.memoryDate}</S.MemoryDate>}
              </S.MemoryCard>
            ))}
          </S.MemoryGrid>
        )}
      </S.Block>

      <S.Sections>
        {SECTIONS.map((section) => (
          <S.SectionCard key={section.key} to={`/rooms/${roomId}/${section.path}`}>
            <S.SectionLabel>{section.label}</S.SectionLabel>
            <S.SectionHint>바로가기</S.SectionHint>
          </S.SectionCard>
        ))}
      </S.Sections>
    </S.Page>
  )
}

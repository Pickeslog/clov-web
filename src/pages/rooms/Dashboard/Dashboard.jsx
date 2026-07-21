import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import * as S from './Dashboard.style'
import { getRoom, getRoomLevel, getRoomMembers } from '../../../api/room'
import { useAuthStore } from '../../../stores/authStore'

// 대시보드에서 진입하는 도메인 화면들 — 팀원 프론트(letter/memory/plan)가 각 라우트를 채운다.
const SECTIONS = [
  { key: 'feed', label: '추억피드', path: 'feed', ready: true },
  { key: 'letters', label: '행운편지', path: 'letters', ready: true },
  { key: 'schedule', label: '일정계획', path: 'schedule', ready: false },
]

// 특정 우정공간 대시보드(홈). roomId 컨텍스트에서 상세·레벨·멤버를 보여주고 도메인 화면으로 라우팅한다.
export default function Dashboard() {
  const { roomId } = useParams()
  const navigate = useNavigate()
  const clear = useAuthStore((state) => state.clear)

  const room = useQuery({ queryKey: ['room', roomId], queryFn: () => getRoom(roomId) })
  const level = useQuery({ queryKey: ['room', roomId, 'level'], queryFn: () => getRoomLevel(roomId) })
  const members = useQuery({ queryKey: ['room', roomId, 'members'], queryFn: () => getRoomMembers(roomId) })

  if (room.isPending) {
    return (
      <S.Page>
        <S.State>불러오는 중…</S.State>
      </S.Page>
    )
  }

  if (room.isError) {
    return (
      <S.Page>
        <S.State>
          우정공간을 불러오지 못했습니다.
          <button type="button" onClick={() => navigate('/')}>
            돌아가기
          </button>
        </S.State>
      </S.Page>
    )
  }

  const data = room.data
  const lv = level.data
  const memberItems = members.data?.items ?? []
  const progress = lv?.expForNextLevel ? Math.min(100, Math.round((lv.expPoint / lv.expForNextLevel) * 100)) : 0

  return (
    <S.Page>
      <S.TopBar>
        <Link to="/" style={{ textDecoration: 'none' }}>
          <S.Brand>Clov.</S.Brand>
        </Link>
        <S.HeaderActions>
          <S.NotiBtn to={`/rooms/${roomId}/notifications`} aria-label="알림">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </S.NotiBtn>
          <S.LogoutBtn type="button" onClick={clear}>
            로그아웃
          </S.LogoutBtn>
        </S.HeaderActions>
      </S.TopBar>

      <S.Hero $cover={data.coverPhotoUrl}>
        <S.HeroInner>
          <S.RoomName>{data.name}</S.RoomName>
          {data.description && <S.RoomDesc>{data.description}</S.RoomDesc>}
          <S.MetaRow>
            <S.Meta>멤버 {data.memberCount}명</S.Meta>
            {lv && (
              <S.Meta>
                Lv.{lv.friendshipLevel} · {lv.expPoint} XP
              </S.Meta>
            )}
          </S.MetaRow>
          {lv && (
            <S.LevelBar
              role="progressbar"
              aria-valuenow={progress}
              aria-label={`우정 레벨 ${lv.friendshipLevel}, 다음 레벨까지 ${lv.remainingToNextLevel} XP`}
            >
              <S.LevelFill style={{ width: `${progress}%` }} />
            </S.LevelBar>
          )}
        </S.HeroInner>
      </S.Hero>

      <S.Members>
        {memberItems.slice(0, 8).map((member) => (
          <S.Avatar key={member.membershipId} title={member.nickname}>
            {member.nickname?.[0] ?? '?'}
          </S.Avatar>
        ))}
        <S.MemberLabel>{data.memberCount}명 함께하는 중</S.MemberLabel>
      </S.Members>

      <S.Sections>
        {SECTIONS.map((section) => (
          <S.SectionCard key={section.key} to={`/rooms/${roomId}/${section.path}`}>
            <S.SectionLabel>{section.label}</S.SectionLabel>
            <S.SectionHint>{section.ready ? '바로가기' : '준비 중'}</S.SectionHint>
          </S.SectionCard>
        ))}
      </S.Sections>
    </S.Page>
  )
}

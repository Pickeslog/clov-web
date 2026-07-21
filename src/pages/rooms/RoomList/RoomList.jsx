import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as S from './RoomList.style'
import { getRooms, createRoom, toggleRoomFavorite } from '../../../api/room'
import { useAuthStore } from '../../../stores/authStore'
import Settings from '../../../components/Settings/Settings'

// 이동 수단 — 계약 §6 transportType. 보딩패스 아이콘.
const TRANSPORTS = [
  { value: 'airplane', label: '비행기', icon: '✈️' },
  { value: 'train', label: '기차', icon: '🚆' },
  { value: 'car', label: '자동차', icon: '🚗' },
  { value: 'ship', label: '배', icon: '🚢' },
]
const transportIcon = (t) => TRANSPORTS.find((x) => x.value === t)?.icon ?? '✈️'

// 정렬 — 서버는 즐겨찾기 우선·최근순 고정 반환이라 나머지는 클라에서.
const SORTS = [
  { key: 'default', label: '내 순서' },
  { key: 'latest', label: '최신순' },
  { key: 'oldest', label: '오래된 순' },
  { key: 'favorite', label: '즐겨찾기' },
]

// 로그인 후 랜딩(우정공간 진입점). 내 우정공간 목록(GET /rooms) + 새 공간 생성.
export default function RoomList() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const clear = useAuthStore((state) => state.clear)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [transportType, setTransportType] = useState('airplane')
  const [message, setMessage] = useState('')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [sort, setSort] = useState('default')

  const rooms = useQuery({ queryKey: ['rooms'], queryFn: getRooms })

  const sortedRooms = useMemo(() => {
    const list = [...(rooms.data?.items ?? [])]
    if (sort === 'latest') return list.sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
    if (sort === 'oldest') return list.sort((a, b) => (a.createdAt ?? '').localeCompare(b.createdAt ?? ''))
    if (sort === 'favorite') return list.filter((r) => r.isFavorite)
    return list
  }, [rooms.data, sort])

  const { mutate, isPending } = useMutation({
    mutationFn: createRoom,
    onSuccess: (room) => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
      navigate(`/rooms/${room.id}`)
    },
    onError: (error) => setMessage(error.message ?? '우정공간을 만들지 못했습니다.'),
  })

  const favoriteMutation = useMutation({
    mutationFn: ({ roomId, isFavorite }) => toggleRoomFavorite(roomId, isFavorite),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rooms'] }),
  })

  const handleCreate = () => {
    setMessage('')
    if (!name.trim()) {
      setMessage('공간 이름을 입력해주세요.')
      return
    }
    mutate({
      name: name.trim(),
      description: description.trim() || null,
      themeColor: null,
      transportType,
      coverPhotoUrl: null,
      coverTitle: null,
    })
  }

  return (
    <S.Page>
      <S.Header>
        <S.Brand>Clov.</S.Brand>
        <S.HeaderActions>
          <S.JoinLink to="/join">초대 코드로 참여하기</S.JoinLink>
          <S.LogoutBtn type="button" onClick={() => setSettingsOpen(true)}>설정</S.LogoutBtn>
          <S.LogoutBtn type="button" onClick={clear}>로그아웃</S.LogoutBtn>
        </S.HeaderActions>
      </S.Header>

      <S.Body>
        <S.Intro>
          <S.Title>우리 우정공간들이에요</S.Title>
          <S.Desc>친구와 약속·추억·편지를 한 곳에서. 우정공간에 들어가거나 새로 만들어 시작해보세요.</S.Desc>
        </S.Intro>

        <S.Section>
          <S.SortRow>
            {SORTS.map((s) => (
              <S.SortBtn key={s.key} type="button" $active={sort === s.key} onClick={() => setSort(s.key)}>
                {s.label}
              </S.SortBtn>
            ))}
          </S.SortRow>

          {rooms.isPending && <S.State>불러오는 중…</S.State>}
          {rooms.isError && <S.State>목록을 불러오지 못했습니다. {rooms.error?.message}</S.State>}
          {rooms.isSuccess && sortedRooms.length === 0 && (
            <S.State>
              {sort === 'favorite' ? '즐겨찾기한 우정공간이 없어요.' : '아직 우정공간이 없어요. 아래에서 첫 공간을 만들어보세요.'}
            </S.State>
          )}

          {sortedRooms.length > 0 && (
            <S.RoomGrid>
              {sortedRooms.map((room) => (
                <S.Ticket key={room.id} onClick={() => navigate(`/rooms/${room.id}`)}>
                  <S.TicketHead $accent={room.themeColor}>
                    <S.TicketTag>CLOV</S.TicketTag>
                    <S.TicketRoute>
                      <span>{transportIcon(room.transportType)}</span>
                    </S.TicketRoute>
                    <S.TicketLv>Lv.{room.friendshipLevel ?? 1}</S.TicketLv>
                  </S.TicketHead>
                  <S.TicketBody>
                    <S.TicketTopRow>
                      <div>
                        <S.TicketLabel>우정공간</S.TicketLabel>
                        <S.TicketName>{room.name}</S.TicketName>
                      </div>
                      <S.Star
                        type="button"
                        $active={room.isFavorite}
                        aria-label={room.isFavorite ? '즐겨찾기 해제' : '즐겨찾기'}
                        onClick={(e) => {
                          e.stopPropagation()
                          favoriteMutation.mutate({ roomId: room.id, isFavorite: !room.isFavorite })
                        }}
                      >
                        {room.isFavorite ? '★' : '☆'}
                      </S.Star>
                    </S.TicketTopRow>
                    {room.description && <S.TicketDesc>{room.description}</S.TicketDesc>}
                    <S.TicketFoot>
                      <S.TicketMeta>멤버 {room.memberCount}명</S.TicketMeta>
                      <S.TicketEnter>입장 ›</S.TicketEnter>
                    </S.TicketFoot>
                    <S.Barcode aria-hidden="true" />
                  </S.TicketBody>
                </S.Ticket>
              ))}
            </S.RoomGrid>
          )}
        </S.Section>

        <S.CreateCard>
          <S.CardTitle>새 우정공간 만들기</S.CardTitle>

          <S.Field>
            <S.Label htmlFor="room-name">공간 이름</S.Label>
            <S.Input id="room-name" value={name} placeholder="예: 제주 가치가자" maxLength={100}
              onChange={(event) => setName(event.target.value)} />
          </S.Field>

          <S.Field>
            <S.Label htmlFor="room-desc">한 줄 소개 (선택)</S.Label>
            <S.Input id="room-desc" value={description} placeholder="예: 졸업 여행 준비방" maxLength={60}
              onChange={(event) => setDescription(event.target.value)} />
          </S.Field>

          <S.Field>
            <S.Label>이동 수단</S.Label>
            <S.Chips>
              {TRANSPORTS.map((transport) => (
                <S.Chip key={transport.value} type="button" $active={transportType === transport.value}
                  onClick={() => setTransportType(transport.value)}>
                  {transport.icon} {transport.label}
                </S.Chip>
              ))}
            </S.Chips>
          </S.Field>

          <S.CreateBtn type="button" onClick={handleCreate} disabled={isPending}>
            {isPending ? '만드는 중…' : '우정공간 만들기'}
          </S.CreateBtn>
          {message && <S.Message role="alert">{message}</S.Message>}
        </S.CreateCard>
      </S.Body>

      {settingsOpen && <Settings onClose={() => setSettingsOpen(false)} />}
    </S.Page>
  )
}

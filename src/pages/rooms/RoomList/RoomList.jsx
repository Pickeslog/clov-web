import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as S from './RoomList.style'
import { getRooms, createRoom } from '../../../api/room'
import { useAuthStore } from '../../../stores/authStore'

// 이동 수단 선택지 — 계약 §6 transportType.
const TRANSPORTS = [
  { value: 'airplane', label: '비행기' },
  { value: 'train', label: '기차' },
  { value: 'car', label: '자동차' },
  { value: 'ship', label: '배' },
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

  // 목록 로딩 상태는 isPending(react-query v5)로 판별 — retry 딜레이 중 isLoading=false 크래시 회피.
  const rooms = useQuery({ queryKey: ['rooms'], queryFn: getRooms })
  const roomItems = rooms.data?.items ?? []

  const { mutate, isPending } = useMutation({
    mutationFn: createRoom,
    onSuccess: (room) => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
      navigate(`/rooms/${room.id}`)
    },
    onError: (error) => setMessage(error.message ?? '우정공간을 만들지 못했습니다.'),
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
        <S.LogoutBtn type="button" onClick={clear}>
          로그아웃
        </S.LogoutBtn>
      </S.Header>

      <S.Body>
        <S.Intro>
          <S.Title>우정공간</S.Title>
          <S.Desc>친구와 약속·추억·편지를 한 곳에서. 우정공간에 들어가거나 새로 만들어 시작해보세요.</S.Desc>
        </S.Intro>

        <S.Section>
          <S.SectionTitle>내 우정공간</S.SectionTitle>

          {rooms.isPending && <S.State>불러오는 중…</S.State>}
          {rooms.isError && <S.State>목록을 불러오지 못했습니다. {rooms.error?.message}</S.State>}
          {rooms.isSuccess && roomItems.length === 0 && (
            <S.State>아직 우정공간이 없어요. 아래에서 첫 공간을 만들어보세요.</S.State>
          )}

          {roomItems.length > 0 && (
            <S.RoomGrid>
              {roomItems.map((room) => (
                <S.RoomCard
                  key={room.id}
                  type="button"
                  $accent={room.themeColor}
                  onClick={() => navigate(`/rooms/${room.id}`)}
                >
                  <S.RoomTop>
                    <S.RoomName>{room.name}</S.RoomName>
                    {room.isFavorite && <S.Fav aria-label="즐겨찾기">★</S.Fav>}
                  </S.RoomTop>
                  {room.description && <S.RoomDesc>{room.description}</S.RoomDesc>}
                  <S.RoomMeta>
                    멤버 {room.memberCount}명 · Lv.{room.friendshipLevel}
                  </S.RoomMeta>
                </S.RoomCard>
              ))}
            </S.RoomGrid>
          )}
        </S.Section>

        <S.CreateCard>
          <S.CardTitle>새 우정공간 만들기</S.CardTitle>

          <S.Field>
            <S.Label htmlFor="room-name">공간 이름</S.Label>
            <S.Input
              id="room-name"
              value={name}
              placeholder="예: 제주 가치가자"
              maxLength={100}
              onChange={(event) => setName(event.target.value)}
            />
          </S.Field>

          <S.Field>
            <S.Label htmlFor="room-desc">한 줄 소개 (선택)</S.Label>
            <S.Input
              id="room-desc"
              value={description}
              placeholder="예: 졸업 여행 준비방"
              maxLength={60}
              onChange={(event) => setDescription(event.target.value)}
            />
          </S.Field>

          <S.Field>
            <S.Label>이동 수단</S.Label>
            <S.Chips>
              {TRANSPORTS.map((transport) => (
                <S.Chip
                  key={transport.value}
                  type="button"
                  $active={transportType === transport.value}
                  onClick={() => setTransportType(transport.value)}
                >
                  {transport.label}
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
    </S.Page>
  )
}

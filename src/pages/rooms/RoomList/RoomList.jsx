import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as S from './RoomList.style'
import { getRooms, createRoom, toggleRoomFavorite } from '../../../api/room'
import { getMyJoinRequests, requestJoin } from '../../../api/invite'
import { useAuthStore } from '../../../stores/authStore'
import Settings from '../../../components/Settings/Settings'

const DAY = 86400000
const ddayOf = (planDate) => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((new Date(`${planDate}T00:00:00`).getTime() - today.getTime()) / DAY)
}
const ddayLabel = (n) => (n === 0 ? 'D-DAY' : n > 0 ? `D-${n}` : `D+${-n}`)

// 이동 수단 — 계약 §6 transportType. 티켓 헤더 아이콘(tabler)·색.
const TRANSPORTS = [
  { value: 'airplane', label: '비행기', icon: 'ti-plane', color: '#8e4585' },
  { value: 'train', label: '기차', icon: 'ti-train', color: '#2a6f7d' },
  { value: 'car', label: '자동차', icon: 'ti-car', color: '#3a7d44' },
  { value: 'ship', label: '배', icon: 'ti-ship', color: '#b5761f' },
]
const transportMeta = (t) => TRANSPORTS.find((x) => x.value === t) ?? TRANSPORTS[0]

const SORTS = [
  { key: 'default', label: '내 순서', icon: 'ti-layout-grid' },
  { key: 'latest', label: '최신순', icon: 'ti-clock' },
  { key: 'oldest', label: '오래된 순', icon: 'ti-history' },
  { key: 'favorite', label: '즐겨찾기', icon: 'ti-star' },
]

const skyline = (seed) => {
  let s = Number(seed) || 1
  return Array.from({ length: 16 }, () => {
    s = (s * 9301 + 49297) % 233280
    return 6 + (s % 20)
  })
}
const BARCODE = [2, 1, 3, 1, 2, 2, 1, 3, 2, 1, 1, 2, 3, 1, 2, 1, 3, 2, 1, 2, 2, 1, 3, 1, 2, 1, 2, 3]

const Icon = ({ name }) => <i className={`ti ${name}`} aria-hidden="true" />

export default function RoomList() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const clear = useAuthStore((state) => state.clear)
  const createRef = useRef(null)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [transportType, setTransportType] = useState('airplane')
  const [message, setMessage] = useState('')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [sort, setSort] = useState('default')
  const [joinCode, setJoinCode] = useState('')

  const rooms = useQuery({ queryKey: ['rooms'], queryFn: getRooms })
  const myRequests = useQuery({ queryKey: ['join-requests', 'mine'], queryFn: getMyJoinRequests })
  const [dismissed, setDismissed] = useState([])
  const requestItems = (myRequests.data?.items ?? []).filter((r) => !dismissed.includes(r.id))

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

  const joinMutation = useMutation({
    mutationFn: () => requestJoin({ inviteCode: joinCode.trim().toUpperCase() }),
    onSuccess: () => {
      setJoinCode('')
      setMessage('가입 신청이 접수됐어요. 멤버가 수락하면 참여가 확정돼요.')
      queryClient.invalidateQueries({ queryKey: ['join-requests', 'mine'] })
    },
    onError: (error) => setMessage(error.message ?? '참여에 실패했어요.'),
  })

  const handleCreate = () => {
    setMessage('')
    if (!name.trim()) {
      setMessage('공간 이름을 입력해주세요.')
      return
    }
    mutate({ name: name.trim(), description: description.trim() || null, themeColor: null, transportType, coverPhotoUrl: null, coverTitle: null })
  }

  return (
    <S.Page>
      <S.Header>
        <S.Brand><Icon name="ti-clover" /> Clov.</S.Brand>
        <S.HeaderActions>
          <S.JoinLink to="/join"><Icon name="ti-key" /> 초대 코드로 참여하기</S.JoinLink>
          <S.GhostBtn type="button" onClick={() => setSettingsOpen(true)}><Icon name="ti-settings" /></S.GhostBtn>
          <S.GhostBtn type="button" onClick={clear}>로그아웃</S.GhostBtn>
        </S.HeaderActions>
      </S.Header>

      <S.Body>
        <S.Intro><Icon name="ti-users" /> 우리 우정공간들이에요</S.Intro>

        {requestItems.length > 0 && (
          <S.ReqSection>
            <S.ReqHead><Icon name="ti-history" /> 요청한 방</S.ReqHead>
            <S.ReqGrid>
              {requestItems.map((r) => {
                const gone = r.roomStatus !== 'ACTIVE'
                const kind = gone ? 'gone' : r.status === 'REJECTED' ? 'rejected' : 'pending'
                const label = gone ? '사라진 방' : r.status === 'REJECTED' ? '거절됨' : '수락 대기 중'
                return (
                  <S.ReqCard key={r.id}>
                    <S.ReqStatus $kind={kind}>
                      <Icon name={gone ? 'ti-trash' : r.status === 'REJECTED' ? 'ti-x' : 'ti-clock'} /> {label}
                    </S.ReqStatus>
                    <S.ReqName>{r.roomName}</S.ReqName>
                    <S.ReqMeta>
                      {gone ? '방이 사라졌어요. 신청도 취소됐어요.'
                        : r.status === 'REJECTED' ? '신청이 거절됐어요.'
                          : '멤버가 수락하면 참여가 확정돼요.'}
                    </S.ReqMeta>
                    <S.ReqDismiss type="button" onClick={() => setDismissed((d) => [...d, r.id])}>지우기</S.ReqDismiss>
                  </S.ReqCard>
                )
              })}
            </S.ReqGrid>
          </S.ReqSection>
        )}

        <S.Toolbar>
          <S.SortRow>
            {SORTS.map((s) => (
              <S.SortBtn key={s.key} type="button" $active={sort === s.key} onClick={() => setSort(s.key)}>
                <Icon name={s.icon} /> {s.label}
              </S.SortBtn>
            ))}
          </S.SortRow>
          <S.ToolbarRight>
            <S.CodeInput
              value={joinCode}
              maxLength={20}
              placeholder="방 코드 입력"
              onChange={(e) => setJoinCode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && joinCode.trim() && joinMutation.mutate()}
            />
            <S.EnterBtn type="button" disabled={!joinCode.trim() || joinMutation.isPending} onClick={() => joinMutation.mutate()}>
              입장
            </S.EnterBtn>
            <S.MakeBtn type="button" onClick={() => createRef.current?.scrollIntoView({ behavior: 'smooth' })}>
              <Icon name="ti-plus" /> 방 만들기
            </S.MakeBtn>
          </S.ToolbarRight>
        </S.Toolbar>

        {rooms.isPending && <S.State>불러오는 중…</S.State>}
        {rooms.isError && <S.State>목록을 불러오지 못했습니다. {rooms.error?.message}</S.State>}
        {rooms.isSuccess && sortedRooms.length === 0 && (
          <S.State>{sort === 'favorite' ? '즐겨찾기한 우정공간이 없어요.' : '아직 우정공간이 없어요. 아래에서 첫 공간을 만들어보세요.'}</S.State>
        )}

        {sortedRooms.length > 0 && (
          <S.Grid>
            {sortedRooms.map((room) => {
              const tp = transportMeta(room.transportType)
              const dday = room.nextPlan?.planDate ? ddayLabel(ddayOf(room.nextPlan.planDate)) : '—'
              return (
                <S.Ticket key={room.id} type="button" onClick={() => navigate(`/rooms/${room.id}`)}>
                  <S.TkBody>
                    <S.TkHead $color={tp.color}>
                      <S.TkRoute>
                        <S.TkCol>
                          <S.TkKick>오늘</S.TkKick>
                          <S.TkCode>CLOV</S.TkCode>
                        </S.TkCol>
                        <S.TkMid><span className="dash" /><Icon name={tp.icon} /><span className="dash" /></S.TkMid>
                        <S.TkCol $right>
                          <S.TkKick>D-DAY</S.TkKick>
                          <S.TkCode>{dday}</S.TkCode>
                        </S.TkCol>
                      </S.TkRoute>
                      <S.TkSkyline>
                        {skyline(room.id).map((h, i) => (
                          <i key={i} style={{ height: `${h}px`, width: '5px' }} />
                        ))}
                      </S.TkSkyline>
                    </S.TkHead>

                    <S.TkPax>
                      <div>
                        <S.TkPaxKick>우정공간</S.TkPaxKick>
                        <S.TkName>{room.name}</S.TkName>
                        <S.TkAvs>
                          <S.TkAv $primary>나</S.TkAv>
                          {room.memberCount > 1 && <S.TkAvMore>+{room.memberCount - 1}</S.TkAvMore>}
                        </S.TkAvs>
                      </div>
                      <S.TkCorner>
                        <S.TkStar
                          type="button"
                          $active={room.isFavorite}
                          aria-label={room.isFavorite ? '즐겨찾기 해제' : '즐겨찾기'}
                          onClick={(e) => { e.stopPropagation(); favoriteMutation.mutate({ roomId: room.id, isFavorite: !room.isFavorite }) }}
                        >
                          <Icon name="ti-star" />
                        </S.TkStar>
                      </S.TkCorner>
                    </S.TkPax>

                    <S.TkGrid>
                      <div>
                        <S.TkCellLbl>다음 약속</S.TkCellLbl>
                        {room.nextPlan?.title
                          ? <S.TkCellVal>{room.nextPlan.title}</S.TkCellVal>
                          : <S.TkCellEmpty><Icon name="ti-calendar-plus" /> 약속을 정해보세요</S.TkCellEmpty>}
                      </div>
                      <div>
                        <S.TkCellLbl>우정 레벨</S.TkCellLbl>
                        <S.TkCellVal>Lv.{room.friendshipLevel ?? 1}</S.TkCellVal>
                      </div>
                    </S.TkGrid>

                    <S.TkPerf />
                    <S.TkStub>
                      <S.TkBarcode aria-hidden="true">
                        {BARCODE.map((w, i) => <i key={i} style={{ width: `${w}px` }} />)}
                      </S.TkBarcode>
                      <S.TkEnter>입장 <Icon name="ti-chevron-right" /></S.TkEnter>
                    </S.TkStub>
                  </S.TkBody>
                </S.Ticket>
              )
            })}
          </S.Grid>
        )}

        <S.CreateCard ref={createRef}>
          <S.CardTitle><Icon name="ti-plus" /> 새 우정공간 만들기</S.CardTitle>
          <S.Field>
            <S.Label htmlFor="room-name">공간 이름</S.Label>
            <S.Input id="room-name" value={name} placeholder="예: 제주 가치가자" maxLength={100} onChange={(e) => setName(e.target.value)} />
          </S.Field>
          <S.Field>
            <S.Label htmlFor="room-desc">한 줄 소개 (선택)</S.Label>
            <S.Input id="room-desc" value={description} placeholder="예: 졸업 여행 준비방" maxLength={60} onChange={(e) => setDescription(e.target.value)} />
          </S.Field>
          <S.Field>
            <S.Label>이동 수단</S.Label>
            <S.Chips>
              {TRANSPORTS.map((t) => (
                <S.Chip key={t.value} type="button" $active={transportType === t.value} onClick={() => setTransportType(t.value)}>
                  <Icon name={t.icon} /> {t.label}
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

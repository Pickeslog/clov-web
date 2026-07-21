import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as S from './RoomList.style'
import { getRooms, createRoom, toggleRoomFavorite } from '../../../api/room'
import { getMyJoinRequests, requestJoin, cancelJoinRequest } from '../../../api/invite'
import { useAuthStore } from '../../../stores/authStore'
import Settings from '../../../components/Settings/Settings'

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

const TRANSPORTS = [
  { value: 'airplane', label: '비행기', icon: 'ti-plane', color: '#8e4585' },
  { value: 'train', label: '기차', icon: 'ti-train', color: '#2a6f7d' },
  { value: 'car', label: '자동차', icon: 'ti-car', color: '#3a7d44' },
  { value: 'ship', label: '배', icon: 'ti-ship', color: '#b5761f' },
]
const transportMeta = (t) => TRANSPORTS.find((x) => x.value === t) ?? TRANSPORTS[0]
const THEME_COLORS = ['#7CC6A6', '#8e4585', '#2a6f7d', '#b5761f', '#3a7d44', '#d4537e']

const SORTS = [
  { key: 'default', label: '내 순서', icon: 'ti-layout-grid' },
  { key: 'latest', label: '최신순', icon: 'ti-clock' },
  { key: 'oldest', label: '오래된 순', icon: 'ti-history' },
  { key: 'favorite', label: '즐겨찾기', icon: 'ti-star' },
]

// 방 id 기반 결정적 스카이라인 — 프로토타입 buildSkyline과 동일(6~7개 넓은 막대 + 오른쪽 여백).
const skyline = (seed) => {
  let s = (Number(seed) || 1) * 9301 + 49297
  const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280 }
  const n = 6 + (seed % 2)
  return Array.from({ length: n }, () => ({ w: 7 + Math.floor(rnd() * 5), h: 12 + Math.floor(rnd() * 15) }))
}
const BARCODE = [2, 1, 3, 1, 2, 1, 3, 1, 2]

const Icon = ({ name }) => <i className={`ti ${name}`} aria-hidden="true" />

export default function RoomList() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const clear = useAuthStore((state) => state.clear)

  const [settingsOpen, setSettingsOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
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

  const moveRoom = (index, dir) => {
    const to = index + dir
    if (to < 0 || to >= sortedRooms.length) return
    const ids = sortedRooms.map((r) => r.id)
    ;[ids[index], ids[to]] = [ids[to], ids[index]]
    saveOrder(ids)
    if (sort !== 'default') setSort('default')
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
                    <S.ReqActions>
                      {kind === 'pending' && (
                        <S.ReqBtn type="button" disabled={cancelReqMutation.isPending}
                          onClick={() => cancelReqMutation.mutate(r.id)}>요청 취소</S.ReqBtn>
                      )}
                      {kind === 'rejected' && (
                        <S.ReqBtn type="button" $primary onClick={() => navigate('/join')}>재요청</S.ReqBtn>
                      )}
                      {kind !== 'pending' && (
                        <S.ReqBtn type="button" onClick={() => setDismissed((d) => [...d, r.id])}>지우기</S.ReqBtn>
                      )}
                    </S.ReqActions>
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
              onChange={(e) => { setJoinCode(e.target.value); setJoinMessage('') }}
              onKeyDown={(e) => e.key === 'Enter' && joinCode.trim() && joinMutation.mutate()}
            />
            <S.EnterBtn type="button" disabled={!joinCode.trim() || joinMutation.isPending} onClick={() => joinMutation.mutate()}>
              입장
            </S.EnterBtn>
            <S.MakeBtn type="button" onClick={() => setCreateOpen(true)}>
              <Icon name="ti-plus" /> 방 만들기
            </S.MakeBtn>
            <S.EditBtn type="button" $active={editMode} onClick={() => setEditMode((v) => !v)}>
              {editMode ? '완료' : '편집'}
            </S.EditBtn>
          </S.ToolbarRight>
        </S.Toolbar>
        {joinMessage && <S.JoinMsg role="alert">{joinMessage}</S.JoinMsg>}
        {editMode && <S.EditHint><Icon name="ti-arrows-move" /> ◀ ▶ 로 순서를 바꿔 "내 순서"에 저장돼요.</S.EditHint>}

        {rooms.isPending && <S.State>불러오는 중…</S.State>}
        {rooms.isError && <S.State>목록을 불러오지 못했습니다. {rooms.error?.message}</S.State>}
        {rooms.isSuccess && sortedRooms.length === 0 && (
          <S.State>{sort === 'favorite' ? '즐겨찾기한 우정공간이 없어요.' : '아직 우정공간이 없어요. "방 만들기"로 첫 공간을 만들어보세요.'}</S.State>
        )}

        {sortedRooms.length > 0 && (
          <S.Grid>
            {visibleRooms.map((room, i) => {
              const tp = transportMeta(room.transportType)
              const hasPlan = Boolean(room.nextPlan?.planDate)
              const dday = hasPlan ? ddayLabel(ddayOf(room.nextPlan.planDate)) : null
              const idx = editMode ? i : safePage * PAGE_SIZE + i
              return (
                <S.Ticket key={room.id} type="button" onClick={() => !editMode && navigate(`/rooms/${room.id}`)} $edit={editMode}>
                  <S.TkBody>
                    <S.TkHead $color={room.themeColor || tp.color}>
                      <S.TkRoute>
                        <S.TkCol>
                          <S.TkKick>오늘</S.TkKick>
                          <S.TkCode>CLOV</S.TkCode>
                        </S.TkCol>
                        <S.TkMid>┈<Icon name={tp.icon} />┈</S.TkMid>
                        <S.TkCol $right>
                          <S.TkKick>{hasPlan ? dday : '약속 없음'}</S.TkKick>
                          <S.TkCode $small={!hasPlan}>{hasPlan ? shortDest(room.nextPlan.title) : '자유'}</S.TkCode>
                        </S.TkCol>
                      </S.TkRoute>
                      <S.TkSkyline>
                        {skyline(room.id).map((b, k) => (<i key={k} style={{ width: `${b.w}px`, height: `${b.h}px` }} />))}
                        <i style={{ flex: 1, background: 'none' }} />
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
                        <S.TkStar type="button" $active={room.isFavorite}
                          aria-label={room.isFavorite ? '즐겨찾기 해제' : '즐겨찾기'}
                          onClick={(e) => { e.stopPropagation(); favoriteMutation.mutate({ roomId: room.id, isFavorite: !room.isFavorite }) }}>
                          <Icon name={room.isFavorite ? 'ti-star-filled' : 'ti-star'} />
                        </S.TkStar>
                      </S.TkCorner>
                    </S.TkPax>

                    {hasPlan ? (
                      <S.TkGrid>
                        <div>
                          <S.TkCellLbl>다음 약속</S.TkCellLbl>
                          <S.TkCellVal>{room.nextPlan.title}</S.TkCellVal>
                        </div>
                        <div>
                          <S.TkCellLbl>D-DAY</S.TkCellLbl>
                          <S.TkCellVal $accent>{dday}</S.TkCellVal>
                        </div>
                      </S.TkGrid>
                    ) : (
                      <S.TkGrid $single>
                        <S.TkCellLbl>다음 약속</S.TkCellLbl>
                        <S.TkCellEmpty><Icon name="ti-plus" /> 약속을 정해보세요</S.TkCellEmpty>
                      </S.TkGrid>
                    )}

                    <S.TkPerf />
                    {editMode ? (
                      <S.TkEditBar>
                        <S.MoveBtn type="button" disabled={idx === 0} onClick={(e) => { e.stopPropagation(); moveRoom(idx, -1) }} aria-label="앞으로"><Icon name="ti-chevron-left" /></S.MoveBtn>
                        <span>순서 {idx + 1}</span>
                        <S.MoveBtn type="button" disabled={idx === sortedRooms.length - 1} onClick={(e) => { e.stopPropagation(); moveRoom(idx, 1) }} aria-label="뒤로"><Icon name="ti-chevron-right" /></S.MoveBtn>
                      </S.TkEditBar>
                    ) : (
                      <S.TkStub>
                        <S.TkBarcode aria-hidden="true">{BARCODE.map((w, k) => <i key={k} style={{ width: `${w}px` }} />)}</S.TkBarcode>
                        <S.TkEnter>입장 <Icon name="ti-chevron-right" /></S.TkEnter>
                      </S.TkStub>
                    )}
                  </S.TkBody>
                </S.Ticket>
              )
            })}
          </S.Grid>
        )}

        {!editMode && totalPages > 1 && (
          <S.Pagination>
            <S.PageBtn type="button" disabled={safePage === 0} onClick={() => setPage(safePage - 1)} aria-label="이전"><Icon name="ti-chevron-left" /></S.PageBtn>
            {Array.from({ length: totalPages }, (_, i) => (
              <S.PageNum key={i} type="button" $active={safePage === i} onClick={() => setPage(i)}>{i + 1}</S.PageNum>
            ))}
            <S.PageBtn type="button" disabled={safePage === totalPages - 1} onClick={() => setPage(safePage + 1)} aria-label="다음"><Icon name="ti-chevron-right" /></S.PageBtn>
          </S.Pagination>
        )}
      </S.Body>

      {createOpen && (
        <CreateRoomModal
          onClose={() => setCreateOpen(false)}
          onCreated={(room) => { queryClient.invalidateQueries({ queryKey: ['rooms'] }); navigate(`/rooms/${room.id}`) }}
        />
      )}
      {settingsOpen && <Settings onClose={() => setSettingsOpen(false)} />}
    </S.Page>
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

  const tp = transportMeta(transportType)
  return (
    <S.Overlay onClick={onClose}>
      <S.Modal onClick={(e) => e.stopPropagation()}>
        <S.ModalHead>
          <S.ModalTitle><Icon name="ti-plus" /> 새 우정공간 만들기</S.ModalTitle>
          <S.ModalClose type="button" onClick={onClose} aria-label="닫기"><Icon name="ti-x" /></S.ModalClose>
        </S.ModalHead>
        <S.ModalDesc>친구들과 함께할 공간을 만들어보세요.</S.ModalDesc>

        <S.Field>
          <S.Label>대표 사진 <S.LabelHint>이동수단 아이콘 + 테마 색상으로 표시돼요</S.LabelHint></S.Label>
          <S.CoverPreview style={{ background: `linear-gradient(135deg, ${themeColor}, rgba(0,0,0,0.28))` }}>
            <Icon name={tp.icon} />
          </S.CoverPreview>
        </S.Field>

        <S.Field>
          <S.Label>테마 색상</S.Label>
          <S.Swatches>
            {THEME_COLORS.map((c) => (
              <S.Swatch key={c} type="button" $active={themeColor === c} style={{ background: c }}
                aria-label={`색상 ${c}`} onClick={() => setThemeColor(c)} />
            ))}
          </S.Swatches>
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

        <S.Field>
          <S.Label htmlFor="room-name">우정공간 이름 *</S.Label>
          <S.Input id="room-name" value={name} placeholder="예: 제주 가치가자" maxLength={100} onChange={(e) => setName(e.target.value)} autoFocus />
        </S.Field>

        <S.Field>
          <S.Label htmlFor="room-desc">소개글 (선택, 60자)</S.Label>
          <S.Input id="room-desc" value={description} placeholder="우리 공간을 한 줄로 소개해보세요" maxLength={60} onChange={(e) => setDescription(e.target.value)} />
        </S.Field>

        {message && <S.Message role="alert">{message}</S.Message>}
        <S.CreateBtn type="button" onClick={submit} disabled={isPending}>
          {isPending ? '만드는 중…' : '우정공간 만들기'}
        </S.CreateBtn>
      </S.Modal>
    </S.Overlay>
  )
}

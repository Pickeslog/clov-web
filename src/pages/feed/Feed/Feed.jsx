import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQueries, useQuery } from '@tanstack/react-query'
import './feed.proto.css'
import { getMemories, getMemory } from '../../../api/memory'
import { getRoomMembers } from '../../../api/room'
import { getPlan, getPlans, getStagePhotos } from '../../../api/plan'
import { useCreateMemory } from '../../../hooks/useCreateMemory'
import { useMemoryDetail } from '../../../hooks/useMemoryDetail'
import { useAuthStore } from '../../../stores/authStore'
import { currentUserIdFromToken } from '../../../lib/jwt'
import { ddayDiff } from '../../../lib/datetime'
import Header from '../../../components/Header/Header'
import Mascot from '../../../components/Mascot/Mascot'
import Button from '../../../components/Button/Button'

// 작성·수정 공통 (screen-spec-source/03-memory-feed-screen.md §입력 제약) — 프로토타입은 30이지만
// 리더 결정으로 8. R2 실제 업로드 비용·저장 쿼터 도달 속도 때문에 목업 값을 의도적으로 안 따른다.
const MEMORY_PHOTO_LIMIT = 8
const MEMORY_TITLE_LIMIT = 40
const MEMORY_MESSAGE_LIMIT = 80

// ── 아이콘(프로토타입 인라인 SVG 발췌) ──
const IconPencil = (props) => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
  </svg>
)
const IconCalendar = (props) => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" />
  </svg>
)
const IconComment = (props) => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: '-1px', marginRight: '2px' }} {...props}>
    <path d="M21 15a2 2 0 0 1-2 2H8l-5 4V6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
)
const IconSearch = (props) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" />
  </svg>
)
const IconCheck = (props) => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: '-2px' }} {...props}>
    <path d="M20 6 9 17l-5-5" />
  </svg>
)
// 사진 모아보기(갤러리) 트리거 — 3×3 격자.
const IconGrid = (props) => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
    <rect x="3" y="3" width="5" height="5" rx="1.3" /><rect x="9.5" y="3" width="5" height="5" rx="1.3" /><rect x="16" y="3" width="5" height="5" rx="1.3" />
    <rect x="3" y="9.5" width="5" height="5" rx="1.3" /><rect x="9.5" y="9.5" width="5" height="5" rx="1.3" /><rect x="16" y="9.5" width="5" height="5" rx="1.3" />
    <rect x="3" y="16" width="5" height="5" rx="1.3" /><rect x="9.5" y="16" width="5" height="5" rx="1.3" /><rect x="16" y="16" width="5" height="5" rx="1.3" />
  </svg>
)

// 날짜(YYYY-MM-DD)에서 월 키(YYYY-MM). 없으면 null.
const monthKeyOf = (memoryDate) => {
  const m = String(memoryDate || '').match(/^(\d{4})-(\d{2})/)
  return m ? `${m[1]}-${m[2]}` : null
}
const monthLabelOf = (key) => {
  if (!key) return '날짜 미정'
  const [y, m] = key.split('-')
  return `${y}.${m}`
}
const initialOf = (name) => (name || '?').trim().slice(0, 1)
// 카드 본문 미리보기(프로토타입 getRecordPreviewText, 48자).
const previewText = (value, max = 48) => {
  const clean = String(value || '').replace(/\s+/g, ' ').trim()
  return clean.length <= max ? clean : `${clean.slice(0, max - 1)}…`
}
// 카드 아바타 = 작성자(대표) + 나머지 참여자(중복 제외).
const cardAvatars = (item) => {
  const author = item.writer
  const others = (item.participants ?? []).filter((p) => String(p.id) !== String(author?.id))
  return [author, ...others].filter(Boolean)
}

// 카드 해시태그: 있으면 그대로, 없으면 프로토타입 fallback(#소중한순간 · #내기록/#친구기록 · #YYYY년MM월).
const cardTags = (item, isMine) => {
  if (item.tags?.length > 0) return item.tags
  const key = monthKeyOf(item.memoryDate)
  const monthTag = key ? `${key.split('-')[0]}년${key.split('-')[1]}월` : '기록'
  return ['소중한순간', isMine ? '내기록' : '친구기록', monthTag]
}

// 해시태그 1줄 고정(#125) — 태그 텍스트 길이가 제각각이라 개수만 잘라선 줄바꿈을 못 막는다
// (예: 짧은 태그 3개는 한 줄에 들어가지만 긴 태그 3개는 넘친다). 실제로 렌더해 줄바꿈 여부를
// 측정한 뒤, 첫 줄에 들어가는 만큼만 보여주고 나머지는 "+N"으로 묶는다. "+N" 칩 자체가 줄을
// 넘기면 그만큼 한 개 더 줄인다 — effect가 재실행되며 수렴한다(매 렌더 최대 1씩 감소).
function MemoryFooterTags({ tags }) {
  const rowRef = useRef(null)
  // cardTags()의 폴백 분기는 매 렌더 새 배열을 만들어 반환한다 — 참조로 비교하면 내용이
  // 같아도 항상 "바뀐 것"으로 잡혀 부모가 리렌더될 때마다(검색어 입력 등) 태그가 전부
  // 펼쳐졌다가 다시 접히는 깜빡임이 생긴다(팀장 리뷰). 내용 기준 키로 비교한다.
  const tagsKey = tags.join('|')
  const [prevKey, setPrevKey] = useState(tagsKey)
  const [visibleCount, setVisibleCount] = useState(tags.length)
  if (prevKey !== tagsKey) {
    setPrevKey(tagsKey)
    setVisibleCount(tags.length)
  }

  useLayoutEffect(() => {
    const row = rowRef.current
    if (!row) return
    const chips = Array.from(row.children)
    if (chips.length < 2) return
    const firstTop = chips[0].offsetTop
    const wrappedAt = chips.findIndex((chip) => chip.offsetTop !== firstTop)
    if (wrappedAt === -1) return
    const tagChipCount = Math.min(visibleCount, tags.length)
    const next = wrappedAt < tagChipCount ? wrappedAt : Math.max(tagChipCount - 1, 0)
    if (next !== visibleCount) setVisibleCount(next)
  }, [tagsKey, visibleCount, tags.length])

  const visible = tags.slice(0, visibleCount)
  const rest = tags.length - visible.length

  return (
    <div className="memory-footer-tags" ref={rowRef}>
      {visible.map((tag, index) => (
        <div key={tag} className={`memory-tag ${index === 0 ? 'highlight' : ''}`}>#{tag}</div>
      ))}
      {rest > 0 && <div className="memory-tag memory-tag-more">+{rest}</div>}
    </div>
  )
}

// 검색: 제목·본문·날짜·태그·작성자/참여자 닉네임 중 하나라도 포함되면 true(프로토타입 postMatchesFeedSearch).
// '#'은 양쪽에서 지워 사용자가 '#한강'으로 검색해도 '한강'으로 매칭되게 한다.
const memoryMatchesSearch = (item, query) => {
  if (!query) return true
  const q = query.replace(/^#/, '')
  const names = [item.writer?.nickname, ...(item.participants ?? []).map((p) => p.nickname)]
  const haystack = [item.title, item.content, item.memoryDate, ...(item.tags ?? []), ...names]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .replace(/#/g, '')
  return haystack.includes(q)
}
// 날짜(YYYY-MM-DD) 기준 정렬. 파싱 불가(날짜 미정)는 항상 맨 뒤로(프로토타입과 동일).
const sortByDate = (order) => (a, b) => {
  const da = a.memoryDate || ''
  const db = b.memoryDate || ''
  if (da === db) return 0
  if (!da) return 1
  if (!db) return -1
  return order === 'old' ? da.localeCompare(db) : db.localeCompare(da)
}
// 갤러리용 날짜 파싱 → 정렬 숫자 + 월 그룹 키/라벨(프로토타입 parseSpacePhotoDate).
const parsePhotoDate = (dateStr) => {
  const m = String(dateStr || '').match(/(\d{4})\D+(\d{1,2})(?:\D+(\d{1,2}))?/)
  if (!m) return { num: -1, key: 'none', label: '날짜 미상' }
  const y = Number(m[1])
  const mo = Number(m[2])
  const d = Number(m[3] || 1)
  return { num: y * 10000 + mo * 100 + d, key: `${y}-${String(mo).padStart(2, '0')}`, label: `${y}년 ${mo}월` }
}
// 약속 연결용 D-day 라벨(프로토타입 calculateDday). 파싱 불가는 'D-?'.
const ddayLabel = (dateStr) => {
  const diff = ddayDiff(dateStr)
  if (diff === null) return 'D-?'
  if (diff === 0) return 'D-DAY'
  return diff > 0 ? `D-${diff}` : `D+${-diff}`
}
// 여권 영수증 D-day 도장 캡션(프로토타입 getMemoryDdayCaption).
const ddayCaption = (dateStr) => {
  const diff = ddayDiff(dateStr)
  if (diff === null) return '함께한 추억'
  if (diff > 0) return '함께할 그날까지'
  if (diff === 0) return '드디어 오늘'
  return '함께 보낸 그날'
}
const pad2 = (n) => String(n).padStart(2, '0')
// 오늘 날짜(YYYY-MM-DD) — 약속 미연결(FREE MEMORY)의 기본 추억 날짜.
const todayStr = () => {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export default function Feed() {
  const { roomId } = useParams()
  const accessToken = useAuthStore((state) => state.accessToken)
  const currentUserId = currentUserIdFromToken(accessToken)

  const [month, setMonth] = useState('') // '' = 전체, 'YYYY-MM'
  const [writerFilter, setWriterFilter] = useState('all') // all | mine | others
  const [search, setSearch] = useState('') // 검색어(제목·내용·태그·친구)
  const [sort, setSort] = useState('new') // new(최신순) | old(오래된순)
  const [isGalleryOpen, setGalleryOpen] = useState(false) // 사진 모아보기 오버레이
  const [selectedMemoryId, setSelectedMemoryId] = useState(null)
  const [isCreateOpen, setCreateOpen] = useState(false)

  // 월별 아카이브를 클라이언트에서 구성하려고 방의 추억을 한 번에 받아온다.
  const feed = useQuery({
    queryKey: ['memories', roomId],
    queryFn: () => getMemories(roomId),
  })

  const members = useQuery({
    queryKey: ['room', roomId, 'members'],
    queryFn: () => getRoomMembers(roomId),
  })

  // 추억 생성(본문+사진 순차 업로드)은 우정공간과 공유하는 공용 훅으로 처리.
  const createMutation = useCreateMemory(roomId, { onSuccess: () => setCreateOpen(false) })
  // 추억 상세(여권) 모달의 데이터·뮤테이션도 우정공간과 공유하는 공용 훅으로 처리.
  const memoryDetail = useMemoryDetail(selectedMemoryId, roomId, { onDeleted: () => setSelectedMemoryId(null) })

  const allItems = feed.data?.items ?? []
  // GET /members는 LEFT 멤버도 함께 반환한다(계약 §6).
  // 참여자를 고르는 자리에는 지금 방에 있는 사람만 넘기고, 추억 상세에는 LEFT까지 넘긴다 —
  // 나간 사람이 남긴 한 줄 메시지를 formerComments로 따로 보여줘야 해서다(MemoryDetailModal).
  const memberItems = members.data?.items ?? []
  const activeMemberItems = memberItems.filter((m) => m.status === 'ACTIVE')

  // 작성자 필터 적용
  const byWriter = allItems.filter((item) => {
    const mine = String(item.writer?.id) === String(currentUserId)
    if (writerFilter === 'mine') return mine
    if (writerFilter === 'others') return !mine
    return true
  })
  // 월 필터 적용
  const byMonth = month ? byWriter.filter((item) => monthKeyOf(item.memoryDate) === month) : byWriter
  // 검색어 필터 + 날짜 정렬(최종 표시 목록)
  const searchQuery = search.trim().toLowerCase()
  const bySearch = searchQuery ? byMonth.filter((item) => memoryMatchesSearch(item, searchQuery)) : byMonth
  const visibleItems = bySearch.slice().sort(sortByDate(sort))

  const summaryText = `${month ? monthLabelOf(month) : '전체'} · ${visibleItems.length}개`

  return (
    <div className="proto-feed">
      <Header variant="room" roomId={roomId} activeTab="feed" />
      <Mascot roomId={roomId} />
      <div className="feed-page">
        <div className="feed-hero">
          <div className="feed-hero-text">
            <div className="feed-title">월별 추억 아카이브</div>
            <div className="feed-subtitle">
              함께 남긴 기록을 월 단위로 접어서 보고, 필요한 달만 빠르게 꺼내봅니다.
            </div>
          </div>
          <div className="feed-hero-meta">
            <div className="feed-month-summary">{summaryText}</div>
            <Button variant="action" size="sm" className="feed-write-btn" onClick={() => setCreateOpen(true)}>
              <IconPencil /> 글쓰기
            </Button>
          </div>
        </div>

        <div className="feed-controls">
          <div className="feed-search">
            <IconSearch className="feed-search-icon" />
            <input
              className="feed-search-input"
              type="search"
              autoComplete="off"
              placeholder="추억 검색 (제목·내용·태그·친구)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Escape') setSearch('') }}
            />
            {search && (
              <button type="button" className="feed-search-clear" onClick={() => setSearch('')} aria-label="검색어 지우기">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
              </button>
            )}
          </div>
          <div className="feed-controls-right">
            <div className="feed-sort" role="group" aria-label="정렬 순서">
              <button type="button" className={`feed-sort-btn ${sort === 'new' ? 'active' : ''}`} onClick={() => setSort('new')}>최신순</button>
              <button type="button" className={`feed-sort-btn ${sort === 'old' ? 'active' : ''}`} onClick={() => setSort('old')}>오래된순</button>
            </div>
            <button type="button" className="feed-gallery-trigger" onClick={() => setGalleryOpen(true)} title="사진 모아보기" aria-label="사진 모아보기">
              <IconGrid />
            </button>
            <MonthPicker
              items={allItems}
              activeMonth={month}
              onPick={(key) => setMonth(key)}
            />
            <div className="feed-filter-tabs">
              <button type="button" className={`feed-tab ${writerFilter === 'all' ? 'active' : ''}`} onClick={() => setWriterFilter('all')}>전체</button>
              <button type="button" className={`feed-tab ${writerFilter === 'mine' ? 'active' : ''}`} onClick={() => setWriterFilter('mine')}>내 기록</button>
              <button type="button" className={`feed-tab ${writerFilter === 'others' ? 'active' : ''}`} onClick={() => setWriterFilter('others')}>친구 기록</button>
            </div>
          </div>
        </div>

        {feed.isPending && <div className="feed-state">불러오는 중…</div>}
        {feed.isError && <div className="feed-state">추억을 불러오지 못했습니다. {feed.error?.message}</div>}

        {feed.isSuccess && (
          <div className="feed-grid">
            {visibleItems.length === 0 ? (
              <div className="feed-empty-state">
                {searchQuery ? (
                  <>검색어와 일치하는 추억이 없습니다.<br />다른 단어로 찾아보세요.</>
                ) : (
                  <>선택한 조건에 맞는 추억이 아직 없습니다.<br />새 추억을 남기면 이 월별 보관함에 바로 정리됩니다.</>
                )}
              </div>
            ) : (
              visibleItems.map((item) => {
                const isMine = String(item.writer?.id) === String(currentUserId)
                const authorLabel = isMine ? '내 기록' : `${item.writer?.nickname}의 기록`
                const tags = cardTags(item, isMine)
                const avatars = cardAvatars(item)
                const visibleAv = avatars.slice(0, 4)
                const restAv = avatars.length - visibleAv.length
                const preview = previewText(item.content)
                return (
                  <div className="memory-card" key={item.id}>
                    <div className={`polaroid-card ${isMine ? 'mine' : 'friend'}`}>
                      <div className="polaroid-presence-row">
                        {visibleAv.map((p, idx) => (
                          <span key={p.id ?? idx} className={`presence-tile ${idx === 0 ? 'is-author' : 'friend'}`} title={p.nickname}>
                            <span className="presence-dot">
                              {p.profileImageUrl ? <img src={p.profileImageUrl} alt="" /> : initialOf(p.nickname)}
                            </span>
                          </span>
                        ))}
                        {restAv > 0 && <span className="presence-more">+{restAv}</span>}
                      </div>
                      <div
                        className={`polaroid-photo ${item.thumbnailUrl ? '' : 'is-empty'}`}
                        style={item.thumbnailUrl ? { backgroundImage: `url('${item.thumbnailUrl}')` } : undefined}
                        onClick={() => setSelectedMemoryId(item.id)}
                      >
                        <span className="author-badge">{authorLabel}</span>
                        {item.imageCount > 1 && (
                          <span className="polaroid-photo-count">
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: '-1px', marginRight: '2px' }}><path d="M4 8a2 2 0 0 1 2-2h1l1.5-2h7L17 6h1a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8z" /><circle cx="12" cy="13" r="3.5" /></svg>
                            {item.imageCount}
                          </span>
                        )}
                        {!item.thumbnailUrl && (
                          <>
                            <i className="ti ti-clover memory-clover-placeholder" aria-hidden="true" />
                            <span className="memory-image-text">사진이 없는 추억은<br />클로버로 보관됩니다</span>
                          </>
                        )}
                      </div>
                      <div className="polaroid-caption">
                        <div className={`my-record-box ${isMine ? 'mine' : 'friend'}`}>
                          <div className="my-record-header">
                            <div className="my-record-title">{authorLabel}</div>
                            <button type="button" className="record-more-btn" onClick={() => setSelectedMemoryId(item.id)}>
                              ···더보기
                            </button>
                          </div>
                          <div className="memory-title">{item.title}</div>
                          {preview && <div className="my-record-text">{preview}</div>}
                        </div>
                        <MemoryFooterTags tags={tags} />
                        <div className="memory-meta-row">
                          <span className="memory-date">{item.memoryDate || '날짜 미정'}</span>
                          <span className="memory-message-count"><IconComment />{item.commentCount ?? 0}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}
      </div>

      {isGalleryOpen && (
        <SpacePhotoGallery
          memories={allItems}
          onClose={() => setGalleryOpen(false)}
          onOpenMemory={(id) => { setGalleryOpen(false); setSelectedMemoryId(id) }}
        />
      )}

      {isCreateOpen && (
        <CreateMemoryModal
          roomId={roomId}
          members={activeMemberItems.filter((m) => String(m.userId) !== String(currentUserId))}
          submitting={createMutation.isPending}
          errorMessage={createMutation.error?.message}
          onCancel={() => setCreateOpen(false)}
          onSubmit={(planId, payload, files) => createMutation.mutate({ planId, payload, files })}
        />
      )}

      {selectedMemoryId && (
        <MemoryDetailModal
          {...memoryDetail}
          roomId={roomId}
          currentUserId={currentUserId}
          members={memberItems}
          onClose={() => setSelectedMemoryId(null)}
        />
      )}
    </div>
  )
}

// ── 월 선택 팝오버(연도 네비 + 12개월 그리드 + 개수) ──
function MonthPicker({ items, activeMonth, onPick }) {
  const [open, setOpen] = useState(false)
  const [year, setYear] = useState(() => {
    const keys = items.map((it) => monthKeyOf(it.memoryDate)).filter(Boolean).sort()
    const latest = keys[keys.length - 1]
    return latest ? Number(latest.split('-')[0]) : new Date().getFullYear()
  })
  const wrapRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const counts = useMemo(() => {
    const map = {}
    items.forEach((it) => {
      const key = monthKeyOf(it.memoryDate)
      if (key) map[key] = (map[key] || 0) + 1
    })
    return map
  }, [items])

  const pick = (key) => {
    onPick(key)
    setOpen(false)
  }

  return (
    <div className="month-picker-wrap" ref={wrapRef}>
      <button
        type="button"
        className={`month-picker-trigger ${open ? 'active' : ''}`}
        title="월 선택"
        onClick={() => setOpen((v) => !v)}
      >
        <IconCalendar />
      </button>
      {open && (
        <div className="month-picker-popover open" role="dialog" aria-label="월 선택">
          <div className="month-picker-header">
            <button type="button" className="month-picker-nav" onClick={() => setYear((y) => y - 1)} aria-label="이전 년도">❮</button>
            <div className="month-picker-year">{year}년</div>
            <button type="button" className="month-picker-nav" onClick={() => setYear((y) => y + 1)} aria-label="다음 년도">❯</button>
          </div>
          <button type="button" className={`month-picker-all-btn ${activeMonth === '' ? 'active' : ''}`} onClick={() => pick('')}>
            전체보기
          </button>
          <div className="month-picker-grid">
            {Array.from({ length: 12 }, (_, i) => {
              const mm = String(i + 1).padStart(2, '0')
              const key = `${year}-${mm}`
              const count = counts[key] || 0
              return (
                <button
                  key={key}
                  type="button"
                  className={`month-picker-month ${activeMonth === key ? 'active' : ''} ${count === 0 ? 'empty' : ''}`}
                  onClick={() => pick(key)}
                >
                  {i + 1}월
                  <span>{count}개</span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ── 사진 모아보기 갤러리(프로토타입 sg-*, 애플 갤러리 스타일) ──
// 피드 목록엔 대표 1장(thumbnailUrl)만 오므로, 사진이 있는 추억들의 상세를 받아
// 모든 이미지를 모아 월별 격자 + 라이트박스로 보여준다(캐시는 상세 모달과 공유).
function SpacePhotoGallery({ memories, onClose, onOpenMemory }) {
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('new') // new | old
  const [lightbox, setLightbox] = useState(-1) // -1 = 닫힘, 그 외 = visible 인덱스

  const withImages = memories.filter((m) => (m.imageCount ?? 0) > 0)
  const detailQueries = useQueries({
    queries: withImages.map((m) => ({
      queryKey: ['memory', m.id],
      queryFn: () => getMemory(m.id),
      staleTime: 60_000,
    })),
  })
  const loading = detailQueries.some((q) => q.isPending)

  // 모든 사진 평탄화(검색용 텍스트·정렬 숫자·월 그룹 포함)
  const allPhotos = []
  detailQueries.forEach((q) => {
    const memory = q.data
    if (!memory) return
    const dt = parsePhotoDate(memory.memoryDate)
    const names = (memory.participants ?? []).map((p) => p.nickname).join(' ')
    const searchText = [memory.title, memory.content, (memory.tags ?? []).join(' '), memory.writer?.nickname, names]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    ;(memory.images ?? []).forEach((img) => {
      if (img?.imageUrl) {
        allPhotos.push({
          url: img.imageUrl,
          memoryId: memory.id,
          title: memory.title,
          date: memory.memoryDate,
          searchText,
          dateNum: dt.num,
          monthKey: dt.key,
          monthLabel: dt.label,
        })
      }
    })
  })

  const query = search.trim().toLowerCase()
  const visible = allPhotos
    .filter((it) => !query || it.searchText.includes(query))
    .sort((a, b) => {
      const aBad = a.dateNum < 0
      const bBad = b.dateNum < 0
      if (aBad !== bBad) return aBad ? 1 : -1 // 날짜 미상은 항상 맨 뒤
      return sort === 'old' ? a.dateNum - b.dateNum : b.dateNum - a.dateNum
    })

  // 정렬 순서를 유지하며 월별 섹션으로 묶는다(셀 클릭 인덱스는 visible 기준)
  const groups = []
  let cur = null
  visible.forEach((it, idx) => {
    if (!cur || cur.key !== it.monthKey) {
      cur = { key: it.monthKey, label: it.monthLabel, cells: [] }
      groups.push(cur)
    }
    cur.cells.push({ it, idx })
  })

  const closeLightbox = () => setLightbox(-1)
  const navLightbox = (dir) => {
    if (visible.length < 2) return
    setLightbox((i) => (i + dir + visible.length) % visible.length)
  }

  // Esc: 라이트박스가 열려 있으면 라이트박스만, 아니면 갤러리를 닫는다.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return
      if (lightbox >= 0) closeLightbox()
      else onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [lightbox, onClose])

  const active = lightbox >= 0 ? visible[lightbox] : null

  return (
    <div
      className="sg-overlay open"
      onClick={(e) => {
        if (e.target !== e.currentTarget) return
        if (lightbox >= 0) closeLightbox()
        else onClose()
      }}
    >
      <div className="sg-head">
        <div className="sg-head-titles">
          <div className="sg-title">우정공간 사진</div>
          <div className="sg-count">{visible.length}장{query ? ' · 검색결과' : ''}</div>
        </div>
        <div className="sg-search">
          <IconSearch />
          <input
            className="sg-search-input"
            type="search"
            autoComplete="off"
            placeholder="사진 검색 (제목·내용·태그·친구)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button type="button" className="sg-search-clear" onClick={() => setSearch('')} aria-label="검색어 지우기">×</button>
          )}
        </div>
        <div className="sg-sort" role="group" aria-label="정렬 순서">
          <button type="button" className={sort === 'new' ? 'active' : ''} onClick={() => setSort('new')}>최신순</button>
          <button type="button" className={sort === 'old' ? 'active' : ''} onClick={() => setSort('old')}>오래된순</button>
        </div>
        <button type="button" className="sg-close" onClick={onClose} aria-label="닫기">×</button>
      </div>

      <div className="sg-body">
        {loading && allPhotos.length === 0 ? (
          <div className="sg-empty"><span className="sg-empty-clover">🍀</span>사진을 불러오는 중…</div>
        ) : visible.length === 0 ? (
          <div className="sg-empty">
            <span className="sg-empty-clover">{query ? '🔍' : '🍀'}</span>
            {query ? '검색 결과가 없어요.' : '아직 이 우정공간에 올라온 사진이 없어요.'}
          </div>
        ) : (
          groups.map((g) => (
            <section className="sg-section" key={g.key}>
              <div className="sg-section-head">{g.label}<span className="sg-section-count">{g.cells.length}</span></div>
              <div className="sg-grid">
                {g.cells.map((c) => (
                  <button
                    type="button"
                    className="sg-cell"
                    key={`${c.it.memoryId}-${c.idx}`}
                    onClick={() => setLightbox(c.idx)}
                    aria-label={`${c.it.title} 사진 크게 보기`}
                  >
                    <img src={c.it.url} loading="lazy" alt={c.it.title} />
                  </button>
                ))}
              </div>
            </section>
          ))
        )}
      </div>

      {active && (
        <div className="sg-lightbox">
          <div className="sg-lb-counter">{lightbox + 1} / {visible.length}</div>
          <button type="button" className="sg-lb-close" onClick={closeLightbox} aria-label="닫기">×</button>
          <div className="sg-lb-stage">
            {visible.length > 1 && (
              <button type="button" className="sg-lb-arrow sg-lb-prev" onClick={() => navLightbox(-1)} aria-label="이전">‹</button>
            )}
            <img src={active.url} alt={active.title} />
            {visible.length > 1 && (
              <button type="button" className="sg-lb-arrow sg-lb-next" onClick={() => navLightbox(1)} aria-label="다음">›</button>
            )}
          </div>
          <div className="sg-lb-info">
            <span className="sg-lb-title">{active.title}{active.date ? ` · ${active.date}` : ''}</span>
            <button type="button" className="sg-lb-open" onClick={() => onOpenMemory(active.memoryId)}>이 추억 보기 ›</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── 글쓰기 모달(프로토타입 wm-*) ──
// 우정공간(대시보드)에서도 재사용 → export. 대시보드는 <div className="proto-feed">로 감싸
// 스코프·팔레트를 공급한다(약속 목록은 이 모달이 roomId로 자체 조회).
export function CreateMemoryModal({ roomId, members, submitting, errorMessage, onCancel, onSubmit }) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [tagsInput, setTagsInput] = useState('')
  const [participantUserIds, setParticipantUserIds] = useState(() => members.map((m) => m.userId))
  const [photos, setPhotos] = useState([]) // { file, url }
  const [linkedPlanId, setLinkedPlanId] = useState(null) // null = 자유 기록(FREE MEMORY)
  const [pickerOpen, setPickerOpen] = useState(false)
  const fileRef = useRef(null)

  // 약속 연결 후보 = 완료된 약속(memoryStatus CANDIDATE/WRITTEN). NONE은 미완료라 연결 불가(409).
  // WRITTEN도 포함 — 같은 약속에 친구별로 각자 관점의 기록을 남길 수 있다(CLAUDE.md 원칙).
  // 이미 내가 쓴 약속은 백엔드가 409 MEMORY_ALREADY_WRITTEN으로 막고 그 메시지가 표시된다.
  const plansQuery = useQuery({
    queryKey: ['plans', roomId],
    queryFn: () => getPlans(roomId),
    enabled: Boolean(roomId),
  })
  const linkablePlans = (plansQuery.data?.items ?? []).filter(
    (p) => p.status === 'COMPLETED' && p.memoryStatus !== 'SKIPPED',
  )
  const linkedPlan = linkablePlans.find((p) => String(p.id) === String(linkedPlanId)) ?? null

  const toggleParticipant = (userId) =>
    setParticipantUserIds((list) => (list.includes(userId) ? list.filter((id) => id !== userId) : [...list, userId]))

  const addPhotos = (fileList) => {
    const files = [...(fileList || [])].filter((f) => f.type.startsWith('image/'))
    if (!files.length) return
    const remaining = MEMORY_PHOTO_LIMIT - photos.length
    const next = files.slice(0, remaining).map((file) => ({ file, url: URL.createObjectURL(file) }))
    setPhotos((prev) => [...prev, ...next])
  }
  const removePhoto = (index) =>
    setPhotos((prev) => {
      const target = prev[index]
      if (target) URL.revokeObjectURL(target.url)
      return prev.filter((_, i) => i !== index)
    })

  // 언마운트 시에만 남은 미리보기 URL을 정리한다(사진 추가마다 폐기하면 표시 중 이미지가 깨짐).
  const photosRef = useRef(photos)
  useEffect(() => { photosRef.current = photos }, [photos])
  useEffect(() => () => photosRef.current.forEach((p) => URL.revokeObjectURL(p.url)), [])

  const parseTags = () =>
    tagsInput.trim()
      ? [...new Set(
          tagsInput
            .split(/[\s,]+/)
            .map((t) => t.trim())
            .filter(Boolean)
            .map((t) => (t.startsWith('#') ? t.slice(1) : t)),
        )].slice(0, 5)
      : []

  const handleSubmit = () => {
    if (!title.trim() || !content.trim()) return
    // 날짜는 프로토타입처럼 직접 입력 없이 파생: 약속 연결 시 약속 날짜, 아니면 오늘.
    const memoryDate = linkedPlan?.planDate || todayStr()
    onSubmit(
      linkedPlanId, // null = 자유 기록(FREE MEMORY)
      {
        title: title.trim(),
        content: content.trim(),
        memoryDate,
        tags: parseTags(),
        participantUserIds,
      },
      photos.map((p) => p.file),
    )
  }

  return (
    <div className="write-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onCancel() }}>
      <div className="write-modal" role="dialog" aria-modal="true" aria-label="추억 기록하기">
        <div className="wm-head">
          <h2><IconPencil width="18" height="18" style={{ verticalAlign: '-3px', marginRight: '5px' }} />추억 기록하기</h2>
          <button type="button" className="wm-close" onClick={onCancel} aria-label="닫기">✕</button>
        </div>
        <div className="wm-body">
          <div className="wm-field">
            <span className="wm-label">사진 (선택, 최대 {MEMORY_PHOTO_LIMIT}장)</span>
            <div className="wm-photo-strip">
              {photos.map((p, index) => (
                <div className="wm-photo-thumb" key={p.url}>
                  <img src={p.url} alt="" />
                  <button type="button" className="wm-img-remove" onClick={() => removePhoto(index)}>✕</button>
                </div>
              ))}
              {photos.length < MEMORY_PHOTO_LIMIT && (
                <button type="button" className="wm-photo-add" onClick={() => fileRef.current?.click()}>
                  <span style={{ fontSize: '20px' }}>＋</span><span>추가</span>
                </button>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(e) => { addPhotos(e.target.files); e.target.value = '' }}
            />
          </div>

          <div className="wm-field">
            <span className="wm-label">제목</span>
            <div className="wm-title-wrap">
              <input
                className="wm-input"
                type="text"
                maxLength={MEMORY_TITLE_LIMIT}
                placeholder="오늘의 추억 제목을 입력하세요"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <span className="wm-char-count">{title.length}/{MEMORY_TITLE_LIMIT}</span>
            </div>
          </div>

          <div className="wm-field">
            <span className="wm-label">본문</span>
            <textarea
              className="wm-input"
              rows={4}
              maxLength={100}
              placeholder="오늘 어떤 추억을 남겼나요?"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
            <span className="wm-body-count">{content.length}/100</span>
          </div>

          <div className="wm-field">
            <span className="wm-label">해시태그</span>
            <input
              className="wm-input"
              type="text"
              placeholder="#한강 #시험끝 처럼 띄어쓰기나 쉼표로 구분해 입력 (선택)"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
            />
          </div>

          <div className="wm-field">
            <span className="wm-label">함께한 친구</span>
            {members.length > 0 ? (
              <div className="wm-chips">
                {members.map((m) => {
                  const on = participantUserIds.includes(m.userId)
                  return (
                    <label key={m.userId} className={`wm-chip ${on ? 'on' : ''}`} onClick={() => toggleParticipant(m.userId)}>
                      <span className="wm-chip-av">{initialOf(m.nickname)}</span>
                      {m.nickname}
                    </label>
                  )
                })}
              </div>
            ) : (
              <span className="wm-label" style={{ textTransform: 'none', letterSpacing: 0 }}>
                아직 함께 기록할 친구가 없어요. 나 혼자만의 기록으로 남길 수 있어요.
              </span>
            )}
          </div>

          {/* 약속 연결 (선택 · 일정계획) — 연결하면 완료된 약속의 추억으로, 아니면 자유 기록(FREE MEMORY) */}
          <div className="wm-field wm-schedule-field">
            <span className="wm-label">약속 연결 <em>(선택 · 일정계획)</em></span>
            <div className="wm-schedule-connect">
              {linkedPlan && !pickerOpen ? (
                <div className="mp-connect-chip">
                  <span className="mp-connect-dday">{ddayLabel(linkedPlan.planDate)}</span>
                  <span className="mp-connect-title">{linkedPlan.title} <b>· 연결됨</b></span>
                  <button type="button" className="mp-connect-btn" onClick={() => setPickerOpen(true)}>변경</button>
                  <button type="button" className="mp-connect-btn mp-connect-btn--detach" onClick={() => { setLinkedPlanId(null); setPickerOpen(false) }}>해제</button>
                </div>
              ) : pickerOpen ? (
                <>
                  <div className="mp-sched-list">
                    {plansQuery.isPending ? (
                      <div className="mp-sched-empty">약속을 불러오는 중…</div>
                    ) : linkablePlans.length === 0 ? (
                      <div className="mp-sched-empty">연결할 완료된 약속이 없어요.<br />일정계획에서 약속을 완료하면 여기에 나타나요.</div>
                    ) : (
                      linkablePlans.map((p) => {
                        const isSelected = String(linkedPlanId) === String(p.id)
                        return (
                          <button
                            type="button"
                            key={p.id}
                            className={`mp-sched-item ${isSelected ? 'is-selected' : ''}`}
                            onClick={() => { setLinkedPlanId(p.id); setPickerOpen(false) }}
                          >
                            <span className="mp-sched-dday">{ddayLabel(p.planDate)}</span>
                            <span className="mp-sched-info">
                              <span className="mp-sched-title">{p.title}</span>
                              <span className={`mp-sched-4cut ${p.memoryStatus === 'WRITTEN' ? 'is-done' : ''}`}>
                                {p.planDate || '날짜 미정'}{p.memoryStatus === 'WRITTEN' ? ' · 추억 작성됨' : ''}
                              </span>
                            </span>
                            {isSelected && <span className="mp-sched-check">✓</span>}
                          </button>
                        )
                      })
                    )}
                  </div>
                  <button type="button" className="mp-connect-cancel" onClick={() => setPickerOpen(false)}>목록 닫기</button>
                </>
              ) : (
                <>
                  <button type="button" className="mp-connect-open" onClick={() => setPickerOpen(true)}>🗓️ 일정계획에서 약속 가져오기</button>
                  <div className="mp-connect-hint">연결 안 하면 <b>자유 기록(FREE MEMORY)</b>으로 저장돼요</div>
                </>
              )}
            </div>
          </div>

          {errorMessage && <div className="wm-error" role="alert">{errorMessage}</div>}

          <Button
            variant="primary"
            size="lg"
            disabled={!title.trim() || !content.trim() || submitting}
            onClick={handleSubmit}
          >
            {submitting ? '기록 남기는 중…' : <>기록 남기기 <IconCheck /></>}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── 약속 영수증(프로토타입 renderMemoryReceipt) — 자유 기록은 FREE 도장, 약속 연결은 D-day 도장 ──
function MemoryReceipt({ planId, plan }) {
  if (!planId) {
    return (
      <div className="memory-receipt is-free">
        <div className="mr-head">CLOV. MEMORIES</div>
        <div className="mr-stamp-zone">
          <div className="mr-free-stamp"><span className="mr-free-word">FREE</span><span className="mr-free-sub">MEMORY</span></div>
        </div>
        <div className="mr-rows">
          <div className="mr-row"><span>DATE</span><span className="mr-dim">날짜 없음</span></div>
          <div className="mr-row"><span>TYPE</span><span>FREE MEMORY</span></div>
        </div>
        <div className="mr-barcode" />
      </div>
    )
  }
  if (!plan) {
    return (
      <div className="memory-receipt">
        <div className="mr-head">CLOV. MEMORIES</div>
        <div className="mr-stamp-zone" />
        <div className="mr-rows"><div className="mr-row"><span>약속</span><span className="mr-dim">불러오는 중…</span></div></div>
        <div className="mr-barcode" />
      </div>
    )
  }
  return (
    <div className="memory-receipt">
      <div className="mr-head">CLOV. MEMORIES</div>
      <div className="mr-stamp-zone">
        <div className="mr-dday-stamp">
          <span className="mr-dday-cap">{ddayCaption(plan.planDate)}</span>
          <span className="mr-dday-num">{ddayLabel(plan.planDate)}</span>
        </div>
      </div>
      <div className="mr-title">{plan.title}</div>
      <div className="mr-rows">
        <div className="mr-row"><span>DATE</span><span>{plan.planDate ? String(plan.planDate).replace(/-/g, '.') : '—'}</span></div>
        <div className="mr-row"><span>TYPE</span><span>PLAN MEMORY</span></div>
      </div>
      <div className="mr-barcode" />
    </div>
  )
}

// 인생4컷 4단계(계약 §9) — Schedule.jsx의 STAGES와 같은 key·순서·이름. 두 화면이 서로 몰라도
// 되게 파일마다 이 작은 상수를 따로 둔다(import보다 결합을 줄이는 쪽, 이 파일의 ddayLabel/
// ddayCaption과 같은 방식). 이름을 새로 짓지 않고 그대로 옮겼다.
const JOURNEY_STAGES = [
  { key: 'PROPOSAL', number: 1, name: '제안하기' },
  { key: 'SCHEDULING', number: 2, name: '일정 맞추기' },
  { key: 'CONFIRMED', number: 3, name: '약속 확정' },
  { key: 'MEETING', number: 4, name: '만남' },
]
const JOURNEY_STAGE_MESSAGE = { DONE: '인증 완료', ACTIVE: '인증사진을 기다리는 중', LOCKED: '아직 진행 전' }

// ── 약속 여정 보기 모달(#127, 프로토타입 renderScheduleJourney space.js:619) — 추억 상세의
// 약속 영수증을 누르면 열림. 읽기 전용: 인생4컷 업로드·극장 연출은 Schedule.jsx의 기존 기능
// 그대로 두고 여기서는 손대지 않는다(범위 밖). 4단계 상태(state)는 서버가 계산해서 주므로
// 프론트에서 다시 계산하지 않는다. ──
function ScheduleJourneyModal({ roomId, plan, onClose }) {
  const navigate = useNavigate()
  // 모달이 열렸을 때만 마운트되므로(호출부 참고) 조회도 그때만 나간다.
  const stagesQuery = useQuery({
    queryKey: ['plan', plan.id, 'stages'],
    queryFn: () => getStagePhotos(plan.id),
    enabled: Boolean(plan?.id),
    retry: false, // R2 미설정 등으로 실패해도 모달이 죽지 않고 전부 잠김으로 보인다(Schedule.jsx 선례)
  })
  const stages = stagesQuery.data?.items ?? []
  const stateOf = (key) => stages.find((s) => s.stage === key)?.state ?? 'LOCKED'
  const imageOf = (key) => stages.find((s) => s.stage === key)?.imageUrl ?? null
  const doneCount = JOURNEY_STAGES.filter((st) => stateOf(st.key) === 'DONE').length
  const isComplete = doneCount === 4

  return (
    <div className="sj-backdrop open" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="sj-modal" role="dialog" aria-modal="true" aria-label="약속 여정 보기">
        <div className="sj-head">
          <div className="sj-kicker">★ 약속 여정 ★</div>
          <div className="sj-title">{plan.title}</div>
          <div className="sj-sub">
            {plan.planDate ? String(plan.planDate).replace(/-/g, '.') : '날짜 미정'} · <b>{ddayLabel(plan.planDate)}</b> · {ddayCaption(plan.planDate)}
          </div>
          <button type="button" className="sj-close" onClick={onClose} aria-label="닫기">×</button>
        </div>
        <div className={`sj-progress ${isComplete ? 'is-complete' : ''}`}>
          <span className="sj-progress-label">인생4컷 {doneCount}/4{isComplete ? ' · 완성 🍀' : ''}</span>
          <span className="sj-progress-bar"><span className="sj-progress-fill" style={{ width: `${Math.round((doneCount / 4) * 100)}%` }} /></span>
        </div>
        <div className="sj-stages">
          {JOURNEY_STAGES.map((st) => {
            const state = stateOf(st.key)
            const image = imageOf(st.key)
            return (
              <div className={`sj-stage sj-stage--${state.toLowerCase()}`} key={st.key}>
                {image ? (
                  <div className="sj-stage-photo has-photo" style={{ backgroundImage: `url('${image}')` }} />
                ) : (
                  <div className={`sj-stage-photo ${state === 'ACTIVE' ? 'is-uploadable' : 'is-locked'}`}>
                    <span className="sj-stage-num">{st.number}</span>
                    {state === 'LOCKED' && <span className="sj-lock" aria-hidden="true">🔒</span>}
                  </div>
                )}
                <div className="sj-stage-info">
                  <div className="sj-stage-name">{st.number}. {st.name}</div>
                  <div className="sj-stage-msg">{JOURNEY_STAGE_MESSAGE[state]}</div>
                </div>
                {state === 'DONE' && <span className="sj-stage-badge is-done">완료 ✓</span>}
                {state === 'ACTIVE' && <span className="sj-stage-badge is-active"><span className="sj-rec-dot" />REC</span>}
                {state === 'LOCKED' && <span className="sj-stage-badge is-locked">잠김</span>}
              </div>
            )
          })}
        </div>
        <div className="sj-actions">
          <Button variant="secondary" size="sm" onClick={onClose}>닫기</Button>
          <Button variant="primary" size="sm" onClick={() => navigate(`/rooms/${roomId}/schedule`)}>일정계획에서 열기</Button>
        </div>
      </div>
    </div>
  )
}

// ── 추억 상세 시트 — 보기=여권(CLOV MEMORY PASSPORT), 수정=컬럼 폼(프로토타입 renderMemoryDetailModal) ──
// 우정공간(대시보드) 증거 카드에서도 재사용 → export(presentational). 데이터/뮤테이션은 호출 측이 공급.
export function MemoryDetailModal({
  memory,
  isLoading,
  roomId,
  currentUserId,
  members = [],
  onClose,
  onSave,
  savingError,
  onDelete,
  saving,
  deleting,
  comments,
  commentsLoading,
  onAddComment,
  addingComment,
  onUpdateComment,
  updatingComment,
  onDeleteComment,
  onUploadImage,
  uploadingImage,
  uploadImageError,
  onDeleteImage,
}) {
  const [isEditing, setEditing] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [linkedPlanId, setLinkedPlanId] = useState(null) // 약속 연결 변경/해제(#200, clov-api#98). null = 자유 기록
  const [planPickerOpen, setPlanPickerOpen] = useState(false)
  const [newMessageDraft, setNewMessageDraft] = useState('')
  const [editingCommentId, setEditingCommentId] = useState(null)
  const [editMessageDraft, setEditMessageDraft] = useState('')
  const [photoIndex, setPhotoIndex] = useState(0)
  const [galleryIndex, setGalleryIndex] = useState(-1) // -1 = 닫힘, 그 외 = 전체보기 인덱스
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [journeyOpen, setJourneyOpen] = useState(false)
  const imageInputRef = useRef(null)

  // 약속 연결 추억이면 영수증/STATUS에 쓸 약속을 조회(캐시는 일정계획과 공유).
  const planQuery = useQuery({
    queryKey: ['plan', memory?.planId],
    queryFn: () => getPlan(memory.planId),
    enabled: Boolean(memory?.planId),
  })

  // 약속 연결 변경/해제(#200, clov-api#98) — 후보는 작성 모달과 동일 기준(완료 + 미스킵)만.
  // 편집 중일 때만 조회한다(보기 모드에서 매번 방의 약속 전체를 받아올 필요 없음).
  const plansQuery = useQuery({
    queryKey: ['plans', roomId],
    queryFn: () => getPlans(roomId),
    enabled: Boolean(roomId) && isEditing,
  })
  const linkablePlans = (plansQuery.data?.items ?? []).filter(
    (p) => p.status === 'COMPLETED' && p.memoryStatus !== 'SKIPPED',
  )
  // 원래 연결된 약속이 후보 목록 필터에 안 걸리는 예외적인 경우에도(방금 스킵된 직후 등) 칩이
  // 안 깨지도록, 상세 조회 때 이미 받아온 planQuery.data를 폴백으로 쓴다.
  const linkedPlan =
    linkablePlans.find((p) => String(p.id) === String(linkedPlanId)) ??
    (linkedPlanId && String(linkedPlanId) === String(memory?.planId) ? planQuery.data : null)

  const isWriter = memory && String(memory.writer?.id) === String(currentUserId)
  const images = memory?.images ?? []
  const photoCount = images.length
  const activeIndex = Math.min(photoIndex, Math.max(photoCount - 1, 0))
  const activeImage = images[activeIndex]
  const isMine = isWriter
  const authorLabel = memory ? (isMine ? '내 기록' : `${memory.writer?.nickname}의 기록`) : ''
  const metaLine = memory?.memoryDate || '날짜 미정'
  const MP_MAX_THUMBS = 4
  const status = memory?.planId
    ? { text: '약속 기록', cls: '' }
    : { text: '자유 기록 · FREE MEMORY', cls: 'free' }

  const photoNav = (dir) => {
    if (photoCount < 2) return
    setPhotoIndex((i) => (i + dir + photoCount) % photoCount)
  }

  const startEdit = () => {
    setTitle(memory.title)
    setContent(memory.content ?? '')
    setLinkedPlanId(memory.planId ?? null)
    setPlanPickerOpen(false)
    setEditing(true)
  }

  const startEditMessage = (comment) => {
    setEditingCommentId(comment.id)
    setEditMessageDraft(comment.content)
  }
  const cancelEditMessage = () => {
    // 서버 값(comment.content)으로 복구 — 로컬 초안은 그냥 버린다(팀장 리뷰).
    setEditingCommentId(null)
    setEditMessageDraft('')
  }
  const saveEditMessage = () => {
    if (!editMessageDraft.trim()) return
    onUpdateComment(editingCommentId, editMessageDraft.trim())
    setEditingCommentId(null)
  }
  // 등록이 확정된 뒤에 입력창을 비운다. mutate 직후 무조건 비우면 네트워크 오류·500일 때
  // 사용자가 쓴 내용이 복구 경로 없이 증발한다.
  const submitNewMessage = () => {
    const content = newMessageDraft.trim()
    if (!content) return
    onAddComment(content, {
      onSuccess: () => setNewMessageDraft(''),
      // 409(이미 남김)는 실패가 아니라 낙관적 화면이 어긋난 것뿐이라 훅이 조용히 재조회한다.
      // 그 행은 곧 "메시지 있음"으로 정리되니 초안도 같이 비운다.
      onError: (err) => { if (err?.code === 'COMMENT_ALREADY_EXISTS') setNewMessageDraft('') },
    })
  }

  // 한 줄 메시지 — 방 멤버 전원을 행으로(#126, 프로토타입 space.js 구조).
  // 메시지 있으면 표시, 본인이고 없으면 그 자리에 입력창, 남이고 없으면 "아직 메시지 없음".
  // 서버 제약이 추억당 작성자 1인 1개라 화면도 멤버당 최대 1개로 맞춘다.
  const activeMembers = members.filter((m) => m.status === 'ACTIVE')
  const commentByWriterId = new Map(comments.map((c) => [String(c.writer?.id), c]))
  // 나간(LEFT)·탈퇴(익명화) 멤버가 남긴 메시지 — 현재 멤버 행에는 안 나오니 기록 보존을 위해
  // 아래에 따로 모아 보여준다(팀장 리뷰). ACTIVE 멤버 목록에 없는 작성자의 메시지가 대상.
  const formerComments = comments.filter(
    (c) => !activeMembers.some((m) => String(m.userId) === String(c.writer?.id)),
  )

  const messagesBlock = (
    <div className="memory-detail-messages">
      <div className="memory-detail-messages-title">친구 한 줄 메시지</div>
      {commentsLoading && <div className="feed-state">불러오는 중…</div>}
      {!commentsLoading && activeMembers.map((member) => {
        const isSelf = String(member.userId) === String(currentUserId)
        const comment = commentByWriterId.get(String(member.userId))

        if (comment && editingCommentId === comment.id) {
          return (
            <div className="memory-message-row" key={member.userId}>
              <span className="memory-message-avatar">{member.profileImageUrl ? <img src={member.profileImageUrl} alt="" /> : initialOf(member.nickname)}</span>
              <span className="memory-message-name">{member.nickname}</span>
              <input
                className="memory-message-compose-input"
                value={editMessageDraft}
                maxLength={MEMORY_MESSAGE_LIMIT}
                onChange={(e) => setEditMessageDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') saveEditMessage() }}
              />
              <Button variant="secondary" size="sm" disabled={!editMessageDraft.trim() || updatingComment} onClick={saveEditMessage}>
                {updatingComment ? '저장 중…' : '저장'}
              </Button>
              <button type="button" className="memory-message-action-btn" onClick={cancelEditMessage}>취소</button>
            </div>
          )
        }

        if (comment) {
          return (
            <div className="memory-message-row" key={member.userId}>
              <span className="memory-message-avatar">{member.profileImageUrl ? <img src={member.profileImageUrl} alt="" /> : initialOf(member.nickname)}</span>
              <span className="memory-message-name">{member.nickname}</span>
              <span className="memory-message-text">{comment.content}</span>
              {isSelf && (
                <>
                  <button type="button" className="memory-message-action-btn" onClick={() => startEditMessage(comment)}>수정</button>
                  <button type="button" className="memory-message-action-btn danger" onClick={() => onDeleteComment(comment.id)}>삭제</button>
                </>
              )}
            </div>
          )
        }

        if (isSelf) {
          return (
            <div className="memory-message-row" key={member.userId}>
              <span className="memory-message-avatar">{member.profileImageUrl ? <img src={member.profileImageUrl} alt="" /> : initialOf(member.nickname)}</span>
              <span className="memory-message-name">{member.nickname}</span>
              <input
                className="memory-message-compose-input"
                value={newMessageDraft}
                maxLength={MEMORY_MESSAGE_LIMIT}
                placeholder="한 줄 메시지를 남겨보세요"
                onChange={(e) => setNewMessageDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') submitNewMessage() }}
              />
              <Button variant="secondary" size="sm" disabled={!newMessageDraft.trim() || addingComment} onClick={submitNewMessage}>
                {addingComment ? '등록 중…' : '등록'}
              </Button>
            </div>
          )
        }

        return (
          <div className="memory-message-row" key={member.userId}>
            <span className="memory-message-avatar">{member.profileImageUrl ? <img src={member.profileImageUrl} alt="" /> : initialOf(member.nickname)}</span>
            <span className="memory-message-name">{member.nickname}</span>
            <span className="memory-message-empty-text">아직 메시지 없음</span>
          </div>
        )
      })}
      {formerComments.length > 0 && (
        <>
          <div className="memory-detail-messages-former-title">이전 멤버</div>
          {formerComments.map((comment) => (
            <div className="memory-message-row" key={comment.id}>
              <span className="memory-message-avatar">{comment.writer?.profileImageUrl ? <img src={comment.writer.profileImageUrl} alt="" /> : initialOf(comment.writer?.nickname)}</span>
              <span className="memory-message-name">{comment.writer?.nickname}</span>
              <span className="memory-message-text">{comment.content}</span>
            </div>
          ))}
        </>
      )}
    </div>
  )

  return (
    <>
      <div className="memory-detail-backdrop open" onClick={onClose} />
      <section className={`memory-detail-sheet open ${isEditing ? 'is-editing' : ''}`} role="dialog" aria-modal="true">
        {isLoading && <div className="feed-state">불러오는 중…</div>}

        {!isLoading && memory && isEditing && (
          <>
            <div className="memory-detail-head">
              <div>
                <div className="memory-detail-kicker">{authorLabel}</div>
                {memory.memoryDate && <div className="memory-detail-date">{memory.memoryDate}</div>}
              </div>
              <button type="button" className="memory-detail-close" onClick={onClose} aria-label="닫기">✕</button>
            </div>

            <div className="memory-detail-columns">
              <div className="memory-detail-photo-col">
                {photoCount === 0 && (
                  <div className="memory-detail-photo memory-detail-photo--empty">
                    <i className="ti ti-clover memory-clover-placeholder" aria-hidden="true" />
                    <span className="memory-image-text">사진이 없는 추억은<br />클로버로 보관됩니다</span>
                  </div>
                )}

                {/* 목업(space.js:132-147) 그대로 — 그리드 + 썸네일별 개별 삭제. 개수만 8장(리더 결정,
                    목업은 30) 다르다. 순서 이동(◀/▶)은 목업에 없는 기능이라 뺐다 — 삭제는 각 썸네일의
                    ✕로 그대로 가능해 삭제 경로가 끊기지 않는다. */}
                <div className="memory-edit-photo-strip">
                  {images.map((img) => (
                    <div className="memory-edit-photo-thumb" key={img.id}>
                      <img src={img.imageUrl} alt="" />
                      <button type="button" className="memory-edit-photo-remove" onClick={() => onDeleteImage(img.id)} aria-label="사진 삭제">✕</button>
                    </div>
                  ))}
                  {photoCount < MEMORY_PHOTO_LIMIT && (
                    <button type="button" className="memory-edit-photo-add" disabled={uploadingImage} onClick={() => imageInputRef.current?.click()}>
                      <span>＋</span><span>{uploadingImage ? '업로드 중…' : '추가'}</span>
                    </button>
                  )}
                </div>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) onUploadImage(file)
                    e.target.value = ''
                  }}
                />
                {uploadImageError && <div className="wm-error" role="alert">{uploadImageError}</div>}
              </div>

              <div className="memory-detail-text-col">
                <div className="memory-detail-edit-form">
                  <input
                    className="memory-detail-edit-title-input"
                    value={title}
                    maxLength={MEMORY_TITLE_LIMIT}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                  <textarea
                    className="memory-detail-edit-body-input"
                    value={content}
                    maxLength={100}
                    onChange={(e) => setContent(e.target.value)}
                  />
                  <span className="memory-detail-edit-body-count">{content.length}/100</span>

                  {/* 약속 연결 변경/해제(#200) — 작성 모달(wm-schedule-field, mp-connect 계열, mp-sched 계열)과
                      같은 패턴 재사용. 후보는 완료+미스킵 약속만(linkablePlans, 위에서 계산). */}
                  <div className="wm-field wm-schedule-field">
                    <span className="wm-label">약속 연결 <em>(선택 · 일정계획)</em></span>
                    <div className="wm-schedule-connect">
                      {linkedPlan && !planPickerOpen ? (
                        <div className="mp-connect-chip">
                          <span className="mp-connect-dday">{ddayLabel(linkedPlan.planDate)}</span>
                          <span className="mp-connect-title">{linkedPlan.title} <b>· 연결됨</b></span>
                          <button type="button" className="mp-connect-btn" onClick={() => setPlanPickerOpen(true)}>변경</button>
                          <button type="button" className="mp-connect-btn mp-connect-btn--detach" onClick={() => { setLinkedPlanId(null); setPlanPickerOpen(false) }}>해제</button>
                        </div>
                      ) : planPickerOpen ? (
                        <>
                          <div className="mp-sched-list">
                            {plansQuery.isPending ? (
                              <div className="mp-sched-empty">약속을 불러오는 중…</div>
                            ) : linkablePlans.length === 0 ? (
                              <div className="mp-sched-empty">연결할 완료된 약속이 없어요.<br />일정계획에서 약속을 완료하면 여기에 나타나요.</div>
                            ) : (
                              linkablePlans.map((p) => {
                                const isSelected = String(linkedPlanId) === String(p.id)
                                return (
                                  <button
                                    type="button"
                                    key={p.id}
                                    className={`mp-sched-item ${isSelected ? 'is-selected' : ''}`}
                                    onClick={() => { setLinkedPlanId(p.id); setPlanPickerOpen(false) }}
                                  >
                                    <span className="mp-sched-dday">{ddayLabel(p.planDate)}</span>
                                    <span className="mp-sched-info">
                                      <span className="mp-sched-title">{p.title}</span>
                                      <span className={`mp-sched-4cut ${p.memoryStatus === 'WRITTEN' ? 'is-done' : ''}`}>
                                        {p.planDate || '날짜 미정'}{p.memoryStatus === 'WRITTEN' ? ' · 추억 작성됨' : ''}
                                      </span>
                                    </span>
                                    {isSelected && <span className="mp-sched-check">✓</span>}
                                  </button>
                                )
                              })
                            )}
                          </div>
                          <button type="button" className="mp-connect-cancel" onClick={() => setPlanPickerOpen(false)}>목록 닫기</button>
                        </>
                      ) : (
                        <>
                          <button type="button" className="mp-connect-open" onClick={() => setPlanPickerOpen(true)}>
                            <i className="ti ti-calendar" aria-hidden="true" /> 일정계획에서 약속 가져오기
                          </button>
                          <div className="mp-connect-hint">연결 안 하면 <b>자유 기록(FREE MEMORY)</b>으로 저장돼요</div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* 저장 실패(예: 이미 다른 곳에서 그 약속에 추억을 쓴 경우 409
                      MEMORY_ALREADY_WRITTEN)를 조용히 삼키지 않는다 — 편집 폼을 그대로 두고
                      에러를 보여준다. 성공했을 때만 편집 모드를 닫는다. */}
                  {savingError && <div className="wm-error" role="alert">{savingError}</div>}

                  <div className="memory-detail-edit-actions">
                    <Button variant="secondary" size="sm" onClick={() => setEditing(false)}>취소</Button>
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={saving}
                      onClick={() => {
                        const payload = { title: title.trim(), content: content.trim() || null }
                        // 안 바꿨으면 아예 안 보낸다(providedFields로 "미변경"과 "해제(null)"를
                        // 구분하는 서버 계약, clov-api#98) — 매번 같은 값을 보내도 서버는 no-op
                        // 처리하지만 의도를 명확히 하려고 변경분만 싣는다.
                        if (String(linkedPlanId ?? '') !== String(memory.planId ?? '')) {
                          payload.planId = linkedPlanId ? String(linkedPlanId) : null
                        }
                        onSave(payload, { onSuccess: () => setEditing(false) })
                      }}
                    >
                      {saving ? '저장 중…' : '저장'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {messagesBlock}
          </>
        )}

        {!isLoading && memory && !isEditing && (
          <>
            {/* 여권 커버 */}
            <div className="mp-cover">
              <div className="mp-cover-kicker">★ CLOV MEMORY PASSPORT ★</div>
              <div className="mp-cover-title">{memory.title}</div>
              <div className="mp-cover-sub">REPUBLIC OF CLOVER · 우정 여권</div>
              <div className="mp-cover-author">{authorLabel} · {metaLine}</div>
              <button type="button" className="mp-close" onClick={onClose} aria-label="닫기">×</button>
            </div>

            <div className="mp-main">
              <div className="mp-photo-col">
                {photoCount ? (
                  <>
                    <div className="mp-photo-main" onClick={() => setGalleryIndex(activeIndex)}>
                      <img src={activeImage.imageUrl} alt={memory.title} />
                      <span className="mp-photo-index">{pad2(activeIndex + 1)} / {pad2(photoCount)}</span>
                      {photoCount > 1 && (
                        <>
                          <button type="button" className="mp-photo-arrow mp-photo-arrow--prev" onClick={(e) => { e.stopPropagation(); photoNav(-1) }} aria-label="이전 사진">‹</button>
                          <button type="button" className="mp-photo-arrow mp-photo-arrow--next" onClick={(e) => { e.stopPropagation(); photoNav(1) }} aria-label="다음 사진">›</button>
                        </>
                      )}
                    </div>
                    {photoCount > 1 && (
                      <div className="mp-thumb-strip">
                        {images.slice(0, MP_MAX_THUMBS).map((img, index) => (
                          <button key={img.id} type="button" className={`mp-thumb ${index === activeIndex ? 'is-active' : ''}`} onClick={() => setPhotoIndex(index)}>
                            <img src={img.imageUrl} alt={`사진 ${index + 1}`} />
                          </button>
                        ))}
                        {photoCount > MP_MAX_THUMBS && (
                          <button type="button" className="mp-thumb mp-thumb--more" onClick={() => setGalleryIndex(MP_MAX_THUMBS)}>+{photoCount - MP_MAX_THUMBS}</button>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="mp-photo-main mp-photo-main--empty">
                    <div className="cline-no-photo">
                      <i className="ti ti-photo-off cline-no-photo-icon" aria-hidden="true" />
                      <span className="cline-no-photo-text">사진 없음</span>
                    </div>
                  </div>
                )}
              </div>
              <div className="mp-receipt-col">
                {memory.planId && planQuery.data ? (
                  <button type="button" className="mp-receipt-btn" onClick={() => setJourneyOpen(true)} aria-label={`${planQuery.data.title} 약속 여정 보기`}>
                    <MemoryReceipt planId={memory.planId} plan={planQuery.data} />
                    <span className="mp-receipt-cta">약속 여정 보기 ›</span>
                  </button>
                ) : (
                  <MemoryReceipt planId={memory.planId} plan={planQuery.data} />
                )}
              </div>
            </div>

            <div className="mp-fields">
              <div className="mp-field">
                <div className="mp-field-k">STATUS</div>
                <div className={`mp-status ${status.cls ? `mp-status--${status.cls}` : ''}`}><span className="mp-status-dot" />{status.text}</div>
              </div>
              <div className="mp-field">
                <div className="mp-field-k">PHOTOS</div>
                <div className="mp-field-v">{photoCount}장 기록</div>
              </div>
            </div>

            <div className="mp-remarks">
              <div className="mp-field-k">REMARKS</div>
              <div className="mp-remarks-text">{memory.content || ''}</div>
              {memory.tags?.length > 0 && (
                <div className="memory-detail-tags">
                  {memory.tags.map((tag) => (
                    <div key={tag} className="memory-tag">#{tag}</div>
                  ))}
                </div>
              )}
              {memory.participants?.length > 0 && (
                <div className="memory-detail-date" style={{ marginTop: '8px' }}>함께한 친구 · {memory.participants.map((p) => p.nickname).join(', ')}</div>
              )}
            </div>

            {messagesBlock}

            {/* 액션 바 */}
            {confirmDelete ? (
              <div className="memory-detail-actions">
                <span className="memory-detail-date" style={{ alignSelf: 'center' }}>이 추억을 삭제할까요?</span>
                <span className="spacer" />
                <Button variant="secondary" size="sm" onClick={() => setConfirmDelete(false)}>취소</Button>
                <Button variant="danger" size="sm" disabled={deleting} onClick={onDelete}>
                  {deleting ? '삭제 중…' : '삭제'}
                </Button>
              </div>
            ) : (
              <div className="memory-detail-actions">
                {isWriter && (
                  <>
                    <Button variant="secondary" size="sm" onClick={startEdit}>수정</Button>
                    <Button variant="danger" size="sm" onClick={() => setConfirmDelete(true)}>삭제</Button>
                  </>
                )}
                <Button variant="primary" size="sm" onClick={onClose}>닫기</Button>
              </div>
            )}
          </>
        )}
      </section>

      {/* 대표 사진 클릭 → 전체보기 슬라이드 갤러리 */}
      {galleryIndex >= 0 && images[galleryIndex] && (
        <div className="mp-gallery open" onClick={(e) => { if (e.target === e.currentTarget) setGalleryIndex(-1) }}>
          <button type="button" className="mp-gallery-close" onClick={() => setGalleryIndex(-1)} aria-label="닫기">×</button>
          <div className="mp-gallery-counter">{galleryIndex + 1} / {photoCount}</div>
          <div className="mp-gallery-stage">
            {photoCount > 1 && (
              <button type="button" className="mp-gallery-arrow mp-gallery-arrow--prev" onClick={() => setGalleryIndex((galleryIndex - 1 + photoCount) % photoCount)} aria-label="이전">‹</button>
            )}
            <img src={images[galleryIndex].imageUrl} alt={memory?.title} />
            {photoCount > 1 && (
              <button type="button" className="mp-gallery-arrow mp-gallery-arrow--next" onClick={() => setGalleryIndex((galleryIndex + 1) % photoCount)} aria-label="다음">›</button>
            )}
          </div>
          {photoCount > 1 && (
            <div className="mp-gallery-thumbs">
              {images.map((img, index) => (
                <button key={img.id} type="button" className={`mp-gallery-thumb ${index === galleryIndex ? 'is-active' : ''}`} onClick={() => setGalleryIndex(index)}>
                  <img src={img.imageUrl} alt={`사진 ${index + 1}`} />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 약속 영수증 클릭 → 약속 여정 보기(#127). planQuery.data가 있을 때만 열 수 있으므로 여기서도 방어. */}
      {journeyOpen && planQuery.data && (
        <ScheduleJourneyModal roomId={roomId} plan={planQuery.data} onClose={() => setJourneyOpen(false)} />
      )}
    </>
  )
}

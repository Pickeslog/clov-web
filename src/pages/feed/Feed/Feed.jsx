import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQueries, useQuery } from '@tanstack/react-query'
import './feed.proto.css'
import { getMemories, getMemory } from '../../../api/memory'
import { getRoomMembers } from '../../../api/room'
import { getPlan, getPlans } from '../../../api/plan'
import { useCreateMemory } from '../../../hooks/useCreateMemory'
import { useMemoryDetail } from '../../../hooks/useMemoryDetail'
import { useAuthStore } from '../../../stores/authStore'
import { currentUserIdFromToken } from '../../../lib/jwt'
import Header from '../../../components/Header/Header'
import Button from '../../../components/Button/Button'

const WRITE_PHOTO_LIMIT = 15

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
  const m = String(dateStr || '').match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/)
  if (!m) return 'D-?'
  const target = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  const today = new Date()
  target.setHours(0, 0, 0, 0)
  today.setHours(0, 0, 0, 0)
  const diff = Math.round((target - today) / 86400000)
  if (diff === 0) return 'D-DAY'
  return diff > 0 ? `D-${diff}` : `D+${-diff}`
}
// 여권 영수증 D-day 도장 캡션(프로토타입 getMemoryDdayCaption).
const ddayCaption = (dateStr) => {
  const m = String(dateStr || '').match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/)
  if (!m) return '함께한 추억'
  const target = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  const today = new Date()
  target.setHours(0, 0, 0, 0)
  today.setHours(0, 0, 0, 0)
  const diff = Math.round((target - today) / 86400000)
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
  const memberItems = members.data?.items ?? []

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
      <div className="feed-page">
        <div className="feed-hero">
          <div>
            <div className="feed-title">월별 추억 아카이브</div>
            <div className="feed-subtitle">
              함께 남긴 기록을 월 단위로 접어서 보고, 필요한 달만 빠르게 꺼내봅니다.
            </div>
          </div>
          <div className="feed-hero-meta">
            <div className="feed-month-summary">{summaryText}</div>
            <Button variant="action" size="sm" onClick={() => setCreateOpen(true)}>
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
                            <span className="presence-dot">{initialOf(p.nickname)}</span>
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
                            <span className="memory-clover-placeholder">🍀</span>
                            <span className="memory-image-text">사진이 없는 추억은<br />클로버로 보관됩니다</span>
                          </>
                        )}
                        <span className="polaroid-zoom-hint">🔍 자세히</span>
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
                        <div className="memory-footer-tags">
                          {tags.map((tag, index) => (
                            <div key={tag} className={`memory-tag ${index === 0 ? 'highlight' : ''}`}>#{tag}</div>
                          ))}
                        </div>
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
          members={memberItems.filter((m) => String(m.userId) !== String(currentUserId))}
          submitting={createMutation.isPending}
          errorMessage={createMutation.error?.message}
          onCancel={() => setCreateOpen(false)}
          onSubmit={(planId, payload, files) => createMutation.mutate({ planId, payload, files })}
        />
      )}

      {selectedMemoryId && (
        <MemoryDetailModal
          {...memoryDetail}
          currentUserId={currentUserId}
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
    const remaining = WRITE_PHOTO_LIMIT - photos.length
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
            <span className="wm-label">사진 (선택, 최대 {WRITE_PHOTO_LIMIT}장)</span>
            <div className="wm-photo-strip">
              {photos.map((p, index) => (
                <div className="wm-photo-thumb" key={p.url}>
                  <img src={p.url} alt="" />
                  <button type="button" className="wm-img-remove" onClick={() => removePhoto(index)}>✕</button>
                </div>
              ))}
              {photos.length < WRITE_PHOTO_LIMIT && (
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
                maxLength={25}
                placeholder="오늘의 추억 제목을 입력하세요"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <span className="wm-char-count">{title.length}/25</span>
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

// ── 추억 상세 시트 — 보기=여권(CLOV MEMORY PASSPORT), 수정=컬럼 폼(프로토타입 renderMemoryDetailModal) ──
// 우정공간(대시보드) 증거 카드에서도 재사용 → export(presentational). 데이터/뮤테이션은 호출 측이 공급.
export function MemoryDetailModal({
  memory,
  isLoading,
  currentUserId,
  onClose,
  onSave,
  onDelete,
  saving,
  deleting,
  comments,
  commentsLoading,
  onAddComment,
  addingComment,
  onDeleteComment,
  onUploadImage,
  uploadingImage,
  uploadImageError,
  onDeleteImage,
  onReorderImages,
}) {
  const [isEditing, setEditing] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [commentText, setCommentText] = useState('')
  const [photoIndex, setPhotoIndex] = useState(0)
  const [galleryIndex, setGalleryIndex] = useState(-1) // -1 = 닫힘, 그 외 = 전체보기 인덱스
  const [confirmDelete, setConfirmDelete] = useState(false)
  const imageInputRef = useRef(null)

  // 약속 연결 추억이면 영수증/STATUS에 쓸 약속을 조회(캐시는 일정계획과 공유).
  const planQuery = useQuery({
    queryKey: ['plan', memory?.planId],
    queryFn: () => getPlan(memory.planId),
    enabled: Boolean(memory?.planId),
  })

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

  const moveImage = (from, to) => {
    if (to < 0 || to >= photoCount) return
    const ids = images.map((img) => img.id)
    const [moved] = ids.splice(from, 1)
    ids.splice(to, 0, moved)
    onReorderImages(ids)
    setPhotoIndex(to)
  }

  const startEdit = () => {
    setTitle(memory.title)
    setContent(memory.content ?? '')
    setEditing(true)
  }

  const handleAddComment = () => {
    if (!commentText.trim()) return
    onAddComment(commentText.trim())
    setCommentText('')
  }

  // 한 줄 메시지(프로덕션 댓글 모델) — 여권/수정 두 모드 공용.
  const messagesBlock = (
    <div className="memory-detail-messages">
      <div className="memory-detail-messages-title">친구 한 줄 메시지</div>
      {commentsLoading && <div className="feed-state">불러오는 중…</div>}
      {!commentsLoading && comments.length === 0 && (
        <div className="memory-message-row"><span className="memory-message-empty-text">첫 한 줄을 남겨보세요.</span></div>
      )}
      {comments.map((comment) => (
        <div className="memory-message-row" key={comment.id}>
          <span className="memory-message-avatar">{initialOf(comment.writer?.nickname)}</span>
          <span className="memory-message-name">{comment.writer?.nickname}</span>
          <span className="memory-message-text">{comment.content}</span>
          {String(comment.writer?.id) === String(currentUserId) && (
            <button type="button" className="memory-message-delete-btn" onClick={() => onDeleteComment(comment.id)}>삭제</button>
          )}
        </div>
      ))}
      <div className="memory-message-compose">
        <input
          className="memory-message-compose-input"
          value={commentText}
          maxLength={255}
          placeholder="한 줄 남기기"
          onChange={(e) => setCommentText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleAddComment() }}
        />
        <Button variant="secondary" size="sm" disabled={!commentText.trim() || addingComment} onClick={handleAddComment}>
          {addingComment ? '등록 중…' : '등록'}
        </Button>
      </div>
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
                {activeImage ? (
                  <img className="memory-detail-photo" src={activeImage.imageUrl} alt="추억 사진" />
                ) : (
                  <div className="memory-detail-photo memory-detail-photo--empty">
                    <span className="memory-clover-placeholder">🍀</span>
                    <span className="memory-image-text">사진이 없는 추억은<br />클로버로 보관됩니다</span>
                  </div>
                )}

                {photoCount > 1 && (
                  <div className="memory-detail-photo-strip">
                    {images.map((img, index) => (
                      <button
                        key={img.id}
                        type="button"
                        className={`memory-detail-photo-thumb ${index === activeIndex ? 'is-active' : ''}`}
                        onClick={() => setPhotoIndex(index)}
                      >
                        <img src={img.imageUrl} alt="" />
                      </button>
                    ))}
                  </div>
                )}

                <div className="memory-edit-photo-controls">
                  <button type="button" className="memory-edit-photo-add" disabled={uploadingImage} onClick={() => imageInputRef.current?.click()}>
                    <span>＋</span> {uploadingImage ? '업로드 중…' : '사진 추가'}
                  </button>
                  {activeImage && (
                    <>
                      <button type="button" className="memory-photo-mini-btn" disabled={activeIndex === 0} onClick={() => moveImage(activeIndex, activeIndex - 1)} aria-label="왼쪽으로">◀</button>
                      <button type="button" className="memory-photo-mini-btn" disabled={activeIndex === photoCount - 1} onClick={() => moveImage(activeIndex, activeIndex + 1)} aria-label="오른쪽으로">▶</button>
                      <button type="button" className="memory-photo-mini-btn danger" onClick={() => onDeleteImage(activeImage.id)} aria-label="사진 삭제">삭제</button>
                    </>
                  )}
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
                </div>
                {uploadImageError && <div className="wm-error" role="alert">{uploadImageError}</div>}
              </div>

              <div className="memory-detail-text-col">
                <div className="memory-detail-edit-form">
                  <input
                    className="memory-detail-edit-title-input"
                    value={title}
                    maxLength={25}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                  <textarea
                    className="memory-detail-edit-body-input"
                    value={content}
                    maxLength={100}
                    onChange={(e) => setContent(e.target.value)}
                  />
                  <span className="memory-detail-edit-body-count">{content.length}/100</span>
                  <div className="memory-detail-edit-actions">
                    <Button variant="secondary" size="sm" onClick={() => setEditing(false)}>취소</Button>
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={saving}
                      onClick={() => {
                        onSave({ title: title.trim(), content: content.trim() || null })
                        setEditing(false)
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
                      <span>🍀</span>
                      <span className="cline-no-photo-text">사진 없음</span>
                    </div>
                  </div>
                )}
              </div>
              <div className="mp-receipt-col">
                <MemoryReceipt planId={memory.planId} plan={planQuery.data} />
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
                    <Button variant="secondary" size="sm" onClick={() => setConfirmDelete(true)}>삭제</Button>
                  </>
                )}
                <span className="spacer" />
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
    </>
  )
}

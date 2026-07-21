import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import './feed.proto.css'
import {
  getMemories,
  getMemory,
  createMemory,
  updateMemory,
  deleteMemory,
  getComments,
  createComment,
  deleteComment,
  presignMemoryImage,
  commitMemoryImage,
  deleteMemoryImage,
  reorderMemoryImages,
} from '../../../api/memory'
import { getRoomMembers } from '../../../api/room'
import { uploadImage } from '../../../lib/uploadImage'
import { useAuthStore } from '../../../stores/authStore'
import { currentUserIdFromToken } from '../../../lib/jwt'

const WRITE_PHOTO_LIMIT = 6

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

// 카드 해시태그: 있으면 그대로, 없으면 프로토타입 fallback(#소중한순간 · #내기록/#친구기록 · #YYYY년MM월).
const cardTags = (item, isMine) => {
  if (item.tags?.length > 0) return item.tags
  const key = monthKeyOf(item.memoryDate)
  const monthTag = key ? `${key.split('-')[0]}년${key.split('-')[1]}월` : '기록'
  return ['소중한순간', isMine ? '내기록' : '친구기록', monthTag]
}

export default function Feed() {
  const { roomId } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const accessToken = useAuthStore((state) => state.accessToken)
  const currentUserId = currentUserIdFromToken(accessToken)

  const [month, setMonth] = useState('') // '' = 전체, 'YYYY-MM'
  const [writerFilter, setWriterFilter] = useState('all') // all | mine | others
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

  const detail = useQuery({
    queryKey: ['memory', selectedMemoryId],
    queryFn: () => getMemory(selectedMemoryId),
    enabled: Boolean(selectedMemoryId),
  })

  const comments = useQuery({
    queryKey: ['memory', selectedMemoryId, 'comments'],
    queryFn: () => getComments(selectedMemoryId),
    enabled: Boolean(selectedMemoryId),
  })

  const invalidateFeed = () => queryClient.invalidateQueries({ queryKey: ['memories', roomId] })
  const invalidateMemory = () => queryClient.invalidateQueries({ queryKey: ['memory', selectedMemoryId] })

  // 추억 생성: 본문 저장 → 고른 사진들을 순차 업로드(presign→PUT→commit).
  // 본문 생성은 항상 1회만 일어나도록, 개별 사진 업로드 실패는 삼켜서 중복 생성을 막는다
  // (실패한 사진은 상세에서 다시 추가할 수 있다).
  const createMutation = useMutation({
    mutationFn: async ({ payload, files }) => {
      const created = await createMemory(roomId, payload)
      const memoryId = created?.id
      if (memoryId && files?.length) {
        for (const file of files) {
          try {
            const imageUrl = await uploadImage((base) => presignMemoryImage(memoryId, base), file)
            await commitMemoryImage(memoryId, { imageUrl })
          } catch {
            /* 사진 한 장 실패는 무시 — 본문은 이미 저장됨 */
          }
        }
      }
      return created
    },
    onSuccess: () => {
      invalidateFeed()
      setCreateOpen(false)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ memoryId, payload }) => updateMemory(memoryId, payload),
    onSuccess: () => {
      invalidateFeed()
      invalidateMemory()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (memoryId) => deleteMemory(memoryId),
    onSuccess: () => {
      invalidateFeed()
      setSelectedMemoryId(null)
    },
  })

  const addCommentMutation = useMutation({
    mutationFn: (content) => createComment(selectedMemoryId, { content }),
    onSuccess: () => {
      invalidateFeed()
      invalidateMemory()
    },
  })

  const deleteCommentMutation = useMutation({
    mutationFn: (commentId) => deleteComment(commentId),
    onSuccess: () => {
      invalidateFeed()
      invalidateMemory()
    },
  })

  const uploadImageMutation = useMutation({
    mutationFn: async (file) => {
      const imageUrl = await uploadImage((base) => presignMemoryImage(selectedMemoryId, base), file)
      return commitMemoryImage(selectedMemoryId, { imageUrl })
    },
    onSuccess: () => {
      invalidateMemory()
      invalidateFeed()
    },
  })
  const deleteImageMutation = useMutation({
    mutationFn: (imageId) => deleteMemoryImage(imageId),
    onSuccess: () => {
      invalidateMemory()
      invalidateFeed()
    },
  })
  const reorderImageMutation = useMutation({
    mutationFn: (imageIds) => reorderMemoryImages(selectedMemoryId, { imageIds }),
    onSuccess: invalidateMemory,
  })

  const allItems = feed.data?.items ?? []
  const memberItems = members.data?.items ?? []

  // 작성자 필터 적용
  const byWriter = allItems.filter((item) => {
    const mine = String(item.writer?.id) === String(currentUserId)
    if (writerFilter === 'mine') return mine
    if (writerFilter === 'others') return !mine
    return true
  })
  // 월 필터 적용(최종 표시 목록)
  const visibleItems = month ? byWriter.filter((item) => monthKeyOf(item.memoryDate) === month) : byWriter

  const summaryText = `${month ? monthLabelOf(month) : '전체'} · ${visibleItems.length}개`

  return (
    <div className="proto-feed">
      <div className="feed-page">
        <div className="feed-topbar">
          <button type="button" className="feed-back-btn" onClick={() => navigate(`/rooms/${roomId}`)}>
            ‹ 우정공간
          </button>
        </div>

        <div className="feed-hero">
          <div>
            <div className="feed-title">월별 추억 아카이브</div>
            <div className="feed-subtitle">
              함께 남긴 기록을 월 단위로 접어서 보고, 필요한 달만 빠르게 꺼내봅니다.
            </div>
          </div>
          <div className="feed-hero-meta">
            <div className="feed-month-summary">{summaryText}</div>
            <button type="button" className="btn-action-sm" onClick={() => setCreateOpen(true)}>
              <IconPencil /> 글쓰기
            </button>
          </div>
        </div>

        <div className="feed-controls">
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

        {feed.isPending && <div className="feed-state">불러오는 중…</div>}
        {feed.isError && <div className="feed-state">추억을 불러오지 못했습니다. {feed.error?.message}</div>}

        {feed.isSuccess && (
          <div className="feed-grid">
            {visibleItems.length === 0 ? (
              <div className="feed-empty-state">
                선택한 조건에 맞는 추억이 아직 없습니다.<br />
                새 추억을 남기면 이 월별 보관함에 바로 정리됩니다.
              </div>
            ) : (
              visibleItems.map((item) => {
                const isMine = String(item.writer?.id) === String(currentUserId)
                const authorLabel = isMine ? '내 기록' : `${item.writer?.nickname}의 기록`
                const tags = cardTags(item, isMine)
                return (
                  <div className="memory-card" key={item.id}>
                    <div className={`polaroid-card ${isMine ? 'mine' : 'friend'}`}>
                      <div className="polaroid-presence-row">
                        <span className="presence-tile is-author">
                          <span className="presence-dot">{initialOf(item.writer?.nickname)}</span>
                        </span>
                      </div>
                      <div
                        className={`polaroid-photo ${item.thumbnailUrl ? '' : 'is-empty'}`}
                        style={item.thumbnailUrl ? { backgroundImage: `url('${item.thumbnailUrl}')` } : undefined}
                        onClick={() => setSelectedMemoryId(item.id)}
                      >
                        <span className="author-badge">{authorLabel}</span>
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

      {isCreateOpen && (
        <CreateMemoryModal
          members={memberItems.filter((m) => String(m.userId) !== String(currentUserId))}
          submitting={createMutation.isPending}
          errorMessage={createMutation.error?.message}
          onCancel={() => setCreateOpen(false)}
          onSubmit={(payload, files) => createMutation.mutate({ payload, files })}
        />
      )}

      {selectedMemoryId && (
        <MemoryDetailModal
          memory={detail.data}
          isLoading={detail.isPending}
          currentUserId={currentUserId}
          onClose={() => setSelectedMemoryId(null)}
          onSave={(payload) => updateMutation.mutate({ memoryId: selectedMemoryId, payload })}
          onDelete={() => deleteMutation.mutate(selectedMemoryId)}
          saving={updateMutation.isPending}
          deleting={deleteMutation.isPending}
          comments={comments.data?.items ?? []}
          commentsLoading={comments.isPending}
          onAddComment={(content) => addCommentMutation.mutate(content)}
          addingComment={addCommentMutation.isPending}
          onDeleteComment={(commentId) => deleteCommentMutation.mutate(commentId)}
          onUploadImage={(file) => uploadImageMutation.mutate(file)}
          uploadingImage={uploadImageMutation.isPending}
          uploadImageError={uploadImageMutation.error?.message}
          onDeleteImage={(imageId) => deleteImageMutation.mutate(imageId)}
          onReorderImages={(imageIds) => reorderImageMutation.mutate(imageIds)}
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

// ── 글쓰기 모달(프로토타입 wm-*) ──
function CreateMemoryModal({ members, submitting, errorMessage, onCancel, onSubmit }) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [memoryDate, setMemoryDate] = useState('')
  const [tagsInput, setTagsInput] = useState('')
  const [participantUserIds, setParticipantUserIds] = useState(() => members.map((m) => m.userId))
  const [photos, setPhotos] = useState([]) // { file, url }
  const fileRef = useRef(null)

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
    onSubmit(
      {
        title: title.trim(),
        content: content.trim(),
        memoryDate: memoryDate || null,
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
              placeholder="오늘 어떤 추억을 남겼나요?"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>

          <div className="wm-field">
            <span className="wm-label">날짜</span>
            <input className="wm-input" type="date" value={memoryDate} onChange={(e) => setMemoryDate(e.target.value)} />
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

          {errorMessage && <div className="wm-error" role="alert">{errorMessage}</div>}

          <button
            type="button"
            className="wm-submit"
            disabled={!title.trim() || !content.trim() || submitting}
            onClick={handleSubmit}
          >
            {submitting ? '기록 남기는 중…' : '기록 남기기'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── 추억 상세 시트 ──
function MemoryDetailModal({
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
  const [confirmDelete, setConfirmDelete] = useState(false)
  const imageInputRef = useRef(null)

  const isWriter = memory && String(memory.writer?.id) === String(currentUserId)
  const images = memory?.images ?? []
  const activeIndex = Math.min(photoIndex, Math.max(images.length - 1, 0))
  const activeImage = images[activeIndex]
  const isMine = isWriter
  const authorLabel = memory ? (isMine ? '내 기록' : `${memory.writer?.nickname}의 기록`) : ''

  const moveImage = (from, to) => {
    if (to < 0 || to >= images.length) return
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

  return (
    <>
      <div className="memory-detail-backdrop open" onClick={onClose} />
      <section className="memory-detail-sheet open" role="dialog" aria-modal="true">
        {isLoading && <div className="feed-state">불러오는 중…</div>}

        {!isLoading && memory && (
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

                {images.length > 1 && (
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

                {isWriter && (
                  <div className="memory-edit-photo-controls">
                    <button type="button" className="memory-edit-photo-add" disabled={uploadingImage} onClick={() => imageInputRef.current?.click()}>
                      <span>＋</span> {uploadingImage ? '업로드 중…' : '사진 추가'}
                    </button>
                    {activeImage && (
                      <>
                        <button type="button" className="memory-photo-mini-btn" disabled={activeIndex === 0} onClick={() => moveImage(activeIndex, activeIndex - 1)} aria-label="왼쪽으로">◀</button>
                        <button type="button" className="memory-photo-mini-btn" disabled={activeIndex === images.length - 1} onClick={() => moveImage(activeIndex, activeIndex + 1)} aria-label="오른쪽으로">▶</button>
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
                )}
                {uploadImageError && <div className="wm-error" role="alert">{uploadImageError}</div>}
              </div>

              <div className="memory-detail-text-col">
                {isEditing ? (
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
                    <div className="memory-detail-edit-actions">
                      <button type="button" className="btn-detail" onClick={() => setEditing(false)}>취소</button>
                      <button
                        type="button"
                        className="btn-detail primary"
                        disabled={saving}
                        onClick={() => {
                          onSave({ title: title.trim(), content: content.trim() || null })
                          setEditing(false)
                        }}
                      >
                        {saving ? '저장 중…' : '저장'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="memory-detail-title-lg">{memory.title}</div>
                    {memory.content && <div className="memory-detail-body-text">{memory.content}</div>}
                    {(memory.tags?.length > 0) && (
                      <div className="memory-detail-tags">
                        {memory.tags.map((tag) => (
                          <div key={tag} className="memory-tag">#{tag}</div>
                        ))}
                      </div>
                    )}
                    {memory.participants?.length > 0 && (
                      <div className="memory-detail-date">함께한 친구 · {memory.participants.map((p) => p.nickname).join(', ')}</div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* 댓글(한 줄 메시지) */}
            <div className="memory-detail-messages">
              <div className="memory-detail-messages-title">한 줄 메시지</div>
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
                <button type="button" className="btn-detail" disabled={!commentText.trim() || addingComment} onClick={handleAddComment}>
                  {addingComment ? '등록 중…' : '등록'}
                </button>
              </div>
            </div>

            {/* 액션 바 */}
            {confirmDelete ? (
              <div className="memory-detail-actions">
                <span className="memory-detail-date" style={{ alignSelf: 'center' }}>이 추억을 삭제할까요?</span>
                <span className="spacer" />
                <button type="button" className="btn-detail" onClick={() => setConfirmDelete(false)}>취소</button>
                <button type="button" className="btn-danger" disabled={deleting} onClick={onDelete}>
                  {deleting ? '삭제 중…' : '삭제'}
                </button>
              </div>
            ) : (
              <div className="memory-detail-actions">
                {isWriter && !isEditing && (
                  <>
                    <button type="button" className="btn-detail" onClick={startEdit}>수정</button>
                    <button type="button" className="btn-detail" onClick={() => setConfirmDelete(true)}>삭제</button>
                  </>
                )}
                <span className="spacer" />
                <button type="button" className="btn-detail primary" onClick={onClose}>닫기</button>
              </div>
            )}
          </>
        )}
      </section>
    </>
  )
}

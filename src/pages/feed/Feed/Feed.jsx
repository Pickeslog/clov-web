import { useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as S from './Feed.style'
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

// 화면 명세(screen-spec-source/03-memory-feed-screen.md)의 기본 해시태그.
const TAGS = ['소중한순간', '우리만의장소', '웃긴날', '다시보고싶은날']

export default function Feed() {
  const { roomId } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const accessToken = useAuthStore((state) => state.accessToken)
  const currentUserId = currentUserIdFromToken(accessToken)

  const [month, setMonth] = useState('')
  const [writerFilter, setWriterFilter] = useState('all')
  const [activeTag, setActiveTag] = useState('')
  const [selectedMemoryId, setSelectedMemoryId] = useState(null)
  const [isCreateOpen, setCreateOpen] = useState(false)

  const feedFilters = {
    month: month || undefined,
    writerId: writerFilter === 'mine' ? currentUserId : undefined,
    tag: activeTag || undefined,
  }
  const feed = useQuery({
    queryKey: ['memories', roomId, feedFilters],
    queryFn: () => getMemories(roomId, feedFilters),
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
  // ['memory', selectedMemoryId] 부분일치로 상세·댓글 쿼리를 함께 무효화한다(commentCount 동기화).
  const invalidateMemory = () => queryClient.invalidateQueries({ queryKey: ['memory', selectedMemoryId] })

  const createMutation = useMutation({
    mutationFn: (payload) => createMemory(roomId, payload),
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

  // 이미지: presign → R2 PUT → commit. 썸네일이 바뀔 수 있어 피드도 무효화.
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

  const items = feed.data?.items ?? []
  const memberItems = members.data?.items ?? []

  return (
    <S.Page>
      <S.TopBar>
        <S.BackBtn type="button" onClick={() => navigate(`/rooms/${roomId}`)}>
          ← 우정공간
        </S.BackBtn>
        <S.Title>월별 추억 아카이브</S.Title>
        <S.WriteBtn type="button" onClick={() => setCreateOpen(true)}>
          + 새 추억 남기기
        </S.WriteBtn>
      </S.TopBar>

      <S.FilterBar>
        <S.MonthInput
          type="month"
          value={month}
          onChange={(event) => setMonth(event.target.value)}
          aria-label="월 선택"
        />
        <S.Tabs>
          <S.Tab type="button" $active={writerFilter === 'all'} onClick={() => setWriterFilter('all')}>
            전체
          </S.Tab>
          <S.Tab type="button" $active={writerFilter === 'mine'} onClick={() => setWriterFilter('mine')}>
            내 기록
          </S.Tab>
        </S.Tabs>
        <S.TagRow>
          <S.TagChip type="button" $active={activeTag === ''} onClick={() => setActiveTag('')}>
            전체 태그
          </S.TagChip>
          {TAGS.map((tag) => (
            <S.TagChip key={tag} type="button" $active={activeTag === tag} onClick={() => setActiveTag(tag)}>
              #{tag}
            </S.TagChip>
          ))}
        </S.TagRow>
      </S.FilterBar>

      {feed.isPending && <S.State>불러오는 중…</S.State>}
      {feed.isError && <S.State>추억을 불러오지 못했습니다. {feed.error?.message}</S.State>}
      {feed.isSuccess && items.length === 0 && <S.State>이 조건에 맞는 추억이 아직 없습니다.</S.State>}

      <S.Grid>
        {items.map((item) => (
          <S.Card key={item.id} onClick={() => setSelectedMemoryId(item.id)}>
            <S.CardThumb>{item.thumbnailUrl ? <img src={item.thumbnailUrl} alt="" /> : '🍀'}</S.CardThumb>
            <S.CardWriter>{item.writer?.nickname}</S.CardWriter>
            <S.CardTitle>{item.title}</S.CardTitle>
            {item.memoryDate && <S.CardDate>{item.memoryDate}</S.CardDate>}
            {item.tags?.length > 0 && (
              <S.CardTags>
                {item.tags.map((tag) => (
                  <span key={tag}>#{tag}</span>
                ))}
              </S.CardTags>
            )}
            <S.CardMeta>댓글 {item.commentCount}</S.CardMeta>
          </S.Card>
        ))}
      </S.Grid>

      {isCreateOpen && (
        <CreateMemoryModal
          members={memberItems}
          submitting={createMutation.isPending}
          errorMessage={createMutation.error?.message}
          onCancel={() => setCreateOpen(false)}
          onSubmit={(payload) => createMutation.mutate(payload)}
        />
      )}

      {selectedMemoryId && (
        <MemoryDetailModal
          memory={detail.data}
          isLoading={detail.isPending}
          currentUserId={currentUserId}
          onClose={() => setSelectedMemoryId(null)}
          onSave={(payload) => updateMutation.mutate({ memoryId: selectedMemoryId, payload })}
          onDelete={() => {
            if (window.confirm('이 추억을 삭제할까요?')) {
              deleteMutation.mutate(selectedMemoryId)
            }
          }}
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
    </S.Page>
  )
}

function CreateMemoryModal({ members, submitting, errorMessage, onCancel, onSubmit }) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [memoryDate, setMemoryDate] = useState('')
  const [tags, setTags] = useState([])
  const [participantUserIds, setParticipantUserIds] = useState([])

  const toggle = (list, setList, value) =>
    setList(list.includes(value) ? list.filter((item) => item !== value) : [...list, value])

  const handleSubmit = () => {
    if (!title.trim()) return
    onSubmit({
      title: title.trim(),
      content: content.trim() || null,
      memoryDate: memoryDate || null,
      tags,
      participantUserIds,
    })
  }

  return (
    <S.Overlay onClick={onCancel}>
      <S.Modal onClick={(event) => event.stopPropagation()}>
        <S.ModalTitle>새 추억 남기기</S.ModalTitle>

        <S.Field>
          <S.Label htmlFor="memory-title">제목</S.Label>
          <S.Input
            id="memory-title"
            value={title}
            maxLength={25}
            placeholder="예: 인생 첫 한라산"
            onChange={(event) => setTitle(event.target.value)}
          />
          <S.Counter>{title.length}/25</S.Counter>
        </S.Field>

        <S.Field>
          <S.Label htmlFor="memory-content">내용</S.Label>
          <S.Textarea
            id="memory-content"
            value={content}
            maxLength={100}
            placeholder="그날의 기록을 남겨보세요"
            onChange={(event) => setContent(event.target.value)}
          />
          <S.Counter>{content.length}/100</S.Counter>
        </S.Field>

        <S.Field>
          <S.Label htmlFor="memory-date">날짜</S.Label>
          <S.Input
            id="memory-date"
            type="date"
            value={memoryDate}
            onChange={(event) => setMemoryDate(event.target.value)}
          />
        </S.Field>

        <S.Field>
          <S.Label>태그</S.Label>
          <S.TagRow>
            {TAGS.map((tag) => (
              <S.TagChip
                key={tag}
                type="button"
                $active={tags.includes(tag)}
                onClick={() => toggle(tags, setTags, tag)}
              >
                #{tag}
              </S.TagChip>
            ))}
          </S.TagRow>
        </S.Field>

        {members.length > 0 && (
          <S.Field>
            <S.Label>함께한 친구</S.Label>
            <S.TagRow>
              {members.map((member) => (
                <S.TagChip
                  key={member.userId}
                  type="button"
                  $active={participantUserIds.includes(member.userId)}
                  onClick={() => toggle(participantUserIds, setParticipantUserIds, member.userId)}
                >
                  {member.nickname}
                </S.TagChip>
              ))}
            </S.TagRow>
          </S.Field>
        )}

        {errorMessage && <S.ErrorText role="alert">{errorMessage}</S.ErrorText>}

        <S.ModalActions>
          <S.SecondaryBtn type="button" onClick={onCancel}>
            취소
          </S.SecondaryBtn>
          <S.PrimaryBtn type="button" disabled={!title.trim() || submitting} onClick={handleSubmit}>
            {submitting ? '저장 중…' : '남기기'}
          </S.PrimaryBtn>
        </S.ModalActions>
      </S.Modal>
    </S.Overlay>
  )
}

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
  const imageInputRef = useRef(null)

  const handleAddComment = () => {
    if (!commentText.trim()) return
    onAddComment(commentText.trim())
    setCommentText('')
  }

  const isWriter = memory && String(memory.writer?.id) === String(currentUserId)
  const images = memory?.images ?? []

  // 이웃과 위치를 바꿔 순서 재정렬 → 새 imageIds 순서로 서버 반영.
  const moveImage = (from, to) => {
    if (to < 0 || to >= images.length) return
    const ids = images.map((img) => img.id)
    const [moved] = ids.splice(from, 1)
    ids.splice(to, 0, moved)
    onReorderImages(ids)
  }

  const startEdit = () => {
    setTitle(memory.title)
    setContent(memory.content ?? '')
    setEditing(true)
  }

  return (
    <S.Overlay onClick={onClose}>
      <S.Modal onClick={(event) => event.stopPropagation()}>
        {isLoading && <S.State>불러오는 중…</S.State>}
        {!isLoading && memory && !isEditing && (
          <>
            <S.ModalTitle>{memory.title}</S.ModalTitle>
            <S.CardWriter>{memory.writer?.nickname}</S.CardWriter>
            {memory.memoryDate && <S.CardDate>{memory.memoryDate}</S.CardDate>}
            <S.DetailContent>{memory.content}</S.DetailContent>
            {memory.tags?.length > 0 && (
              <S.CardTags>
                {memory.tags.map((tag) => (
                  <span key={tag}>#{tag}</span>
                ))}
              </S.CardTags>
            )}
            {memory.participants?.length > 0 && (
              <S.CardMeta>함께한 친구: {memory.participants.map((p) => p.nickname).join(', ')}</S.CardMeta>
            )}

            <S.ImageSection>
              <S.Label>사진</S.Label>
              {images.length > 0 && (
                <S.ImageGallery>
                  {images.map((img, idx) => (
                    <S.ImageItem key={img.id}>
                      <img src={img.imageUrl} alt="추억 사진" />
                      {isWriter && (
                        <S.ImageControls>
                          <button type="button" disabled={idx === 0} onClick={() => moveImage(idx, idx - 1)} aria-label="왼쪽으로">◀</button>
                          <button type="button" onClick={() => onDeleteImage(img.id)} aria-label="삭제">✕</button>
                          <button type="button" disabled={idx === images.length - 1} onClick={() => moveImage(idx, idx + 1)} aria-label="오른쪽으로">▶</button>
                        </S.ImageControls>
                      )}
                    </S.ImageItem>
                  ))}
                </S.ImageGallery>
              )}
              {isWriter && (
                <>
                  <S.SecondaryBtn type="button" disabled={uploadingImage} onClick={() => imageInputRef.current?.click()}>
                    {uploadingImage ? '업로드 중…' : '+ 사진 추가'}
                  </S.SecondaryBtn>
                  {uploadImageError && <S.ErrorText role="alert">{uploadImageError}</S.ErrorText>}
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(event) => {
                      const file = event.target.files?.[0]
                      if (file) onUploadImage(file)
                      event.target.value = ''
                    }}
                  />
                </>
              )}
              {!isWriter && images.length === 0 && <S.CommentEmpty>사진이 없습니다.</S.CommentEmpty>}
            </S.ImageSection>

            <S.CommentsSection>
              <S.Label>댓글</S.Label>
              {commentsLoading && <S.State>불러오는 중…</S.State>}
              {!commentsLoading && comments.length === 0 && <S.CommentEmpty>첫 댓글을 남겨보세요.</S.CommentEmpty>}
              {comments.map((comment) => (
                <S.CommentRow key={comment.id}>
                  <S.CommentBody>
                    <S.CommentWriter>{comment.writer?.nickname}</S.CommentWriter>
                    <S.CommentText>{comment.content}</S.CommentText>
                  </S.CommentBody>
                  {String(comment.writer?.id) === String(currentUserId) && (
                    <S.CommentDeleteBtn type="button" onClick={() => onDeleteComment(comment.id)}>
                      삭제
                    </S.CommentDeleteBtn>
                  )}
                </S.CommentRow>
              ))}
              <S.CommentForm>
                <S.Input
                  value={commentText}
                  maxLength={255}
                  placeholder="한 줄 남기기"
                  onChange={(event) => setCommentText(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') handleAddComment()
                  }}
                />
                <S.SecondaryBtn type="button" disabled={!commentText.trim() || addingComment} onClick={handleAddComment}>
                  {addingComment ? '등록 중…' : '등록'}
                </S.SecondaryBtn>
              </S.CommentForm>
            </S.CommentsSection>

            <S.ModalActions>
              {isWriter && (
                <>
                  <S.SecondaryBtn type="button" onClick={startEdit}>
                    수정
                  </S.SecondaryBtn>
                  <S.SecondaryBtn type="button" disabled={deleting} onClick={onDelete}>
                    {deleting ? '삭제 중…' : '삭제'}
                  </S.SecondaryBtn>
                </>
              )}
              <S.PrimaryBtn type="button" onClick={onClose}>
                닫기
              </S.PrimaryBtn>
            </S.ModalActions>
          </>
        )}

        {!isLoading && memory && isEditing && (
          <>
            <S.Field>
              <S.Label htmlFor="edit-title">제목</S.Label>
              <S.Input id="edit-title" value={title} maxLength={25} onChange={(event) => setTitle(event.target.value)} />
            </S.Field>
            <S.Field>
              <S.Label htmlFor="edit-content">내용</S.Label>
              <S.Textarea
                id="edit-content"
                value={content}
                maxLength={100}
                onChange={(event) => setContent(event.target.value)}
              />
            </S.Field>
            <S.ModalActions>
              <S.SecondaryBtn type="button" onClick={() => setEditing(false)}>
                취소
              </S.SecondaryBtn>
              <S.PrimaryBtn
                type="button"
                disabled={saving}
                onClick={() => {
                  onSave({ title: title.trim(), content: content.trim() || null })
                  setEditing(false)
                }}
              >
                {saving ? '저장 중…' : '저장'}
              </S.PrimaryBtn>
            </S.ModalActions>
          </>
        )}
      </S.Modal>
    </S.Overlay>
  )
}

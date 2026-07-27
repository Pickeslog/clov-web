import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getMemory, getComments, updateMemory, deleteMemory,
  createComment, updateComment, deleteComment,
  presignMemoryImage, commitMemoryImage, deleteMemoryImage, reorderMemoryImages,
} from '../api/memory'
import { uploadImage } from '../lib/uploadImage'

// 추억 상세(여권) 모달의 데이터·뮤테이션 공용 훅 — 추억피드와 우정공간(대시보드)이
// 같은 MemoryDetailModal(presentational)을 재사용한다. 반환값을 그대로 스프레드해서
// <MemoryDetailModal {...detail} currentUserId=… onClose=… /> 형태로 쓴다.
// memoryId가 없으면(선택 안 됨) 쿼리는 비활성, 콜백은 무해하게 정의만 된다.
// onDeleted: 삭제 성공 시 호출(대개 모달 닫기).
export function useMemoryDetail(memoryId, roomId, { onDeleted } = {}) {
  const queryClient = useQueryClient()

  const detail = useQuery({
    queryKey: ['memory', memoryId],
    queryFn: () => getMemory(memoryId),
    enabled: Boolean(memoryId),
  })
  const comments = useQuery({
    queryKey: ['memory', memoryId, 'comments'],
    queryFn: () => getComments(memoryId),
    enabled: Boolean(memoryId),
  })

  const invalidateFeed = () => queryClient.invalidateQueries({ queryKey: ['memories', roomId] })
  const invalidateMemory = () => queryClient.invalidateQueries({ queryKey: ['memory', memoryId] })
  const invalidateBoth = () => { invalidateMemory(); invalidateFeed() }

  const updateMutation = useMutation({ mutationFn: (payload) => updateMemory(memoryId, payload), onSuccess: invalidateBoth })
  const deleteMutation = useMutation({ mutationFn: () => deleteMemory(memoryId), onSuccess: () => { invalidateFeed(); onDeleted?.() } })
  const addCommentMutation = useMutation({
    mutationFn: (content) => createComment(memoryId, { content }),
    onSuccess: invalidateBoth,
    // 추억당 작성자 1인 1개(계약 §10) — 캐시가 어긋난 상태에서(레이스 등) 이미 남긴 걸 또
    // 등록하면 서버가 409로 막는다. 사용자 실수가 아니라 낙관적 화면과 실제 상태가 어긋난
    // 것뿐이라 에러로 띄우지 않고 조용히 다시 불러와 그 행이 스스로 "메시지 있음"으로
    // 정리되게 한다(팀장 리뷰).
    onError: (err) => { if (err.code === 'COMMENT_ALREADY_EXISTS') invalidateBoth() },
  })
  const updateCommentMutation = useMutation({ mutationFn: ({ commentId, content }) => updateComment(commentId, { content }), onSuccess: invalidateBoth })
  const deleteCommentMutation = useMutation({ mutationFn: (commentId) => deleteComment(commentId), onSuccess: invalidateBoth })
  const uploadImageMutation = useMutation({
    mutationFn: async (file) => {
      const imageUrl = await uploadImage((base) => presignMemoryImage(memoryId, base), file)
      return commitMemoryImage(memoryId, { imageUrl })
    },
    // 이미 쓴 추억에 사진을 나중에 추가해도 MEMORY_IMAGE_BONUS XP가 붙는다(계약 §12,
    // MemoryService.commitImage) — 작성 시점 첨부(useCreateMemory)와 별개 경로라 따로 무효화 필요.
    onSuccess: () => { invalidateBoth(); queryClient.invalidateQueries({ queryKey: ['room', roomId] }) },
  })
  const deleteImageMutation = useMutation({ mutationFn: (imageId) => deleteMemoryImage(imageId), onSuccess: invalidateBoth })
  const reorderImageMutation = useMutation({ mutationFn: (imageIds) => reorderMemoryImages(memoryId, { imageIds }), onSuccess: invalidateMemory })

  return {
    memory: detail.data,
    isLoading: detail.isPending,
    onSave: (payload) => updateMutation.mutate(payload),
    onDelete: () => deleteMutation.mutate(),
    saving: updateMutation.isPending,
    deleting: deleteMutation.isPending,
    comments: comments.data?.items ?? [],
    commentsLoading: comments.isPending,
    // options를 그대로 넘겨 호출부가 성공/실패 시점을 잡을 수 있게 한다(입력 내용 보존 등).
    // 훅 레벨 onSuccess/onError는 그대로 먼저 실행된다.
    onAddComment: (content, options) => addCommentMutation.mutate(content, options),
    addingComment: addCommentMutation.isPending,
    onUpdateComment: (commentId, content) => updateCommentMutation.mutate({ commentId, content }),
    updatingComment: updateCommentMutation.isPending,
    onDeleteComment: (commentId) => deleteCommentMutation.mutate(commentId),
    onUploadImage: (file) => uploadImageMutation.mutate(file),
    uploadingImage: uploadImageMutation.isPending,
    uploadImageError: uploadImageMutation.error?.message,
    onDeleteImage: (imageId) => deleteImageMutation.mutate(imageId),
    onReorderImages: (imageIds) => reorderImageMutation.mutate(imageIds),
  }
}

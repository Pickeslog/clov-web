import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getMemory, getComments, updateMemory, deleteMemory,
  createComment, deleteComment,
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
  const addCommentMutation = useMutation({ mutationFn: (content) => createComment(memoryId, { content }), onSuccess: invalidateBoth })
  const deleteCommentMutation = useMutation({ mutationFn: (commentId) => deleteComment(commentId), onSuccess: invalidateBoth })
  const uploadImageMutation = useMutation({
    mutationFn: async (file) => {
      const imageUrl = await uploadImage((base) => presignMemoryImage(memoryId, base), file)
      return commitMemoryImage(memoryId, { imageUrl })
    },
    onSuccess: invalidateBoth,
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
    onAddComment: (content) => addCommentMutation.mutate(content),
    addingComment: addCommentMutation.isPending,
    onDeleteComment: (commentId) => deleteCommentMutation.mutate(commentId),
    onUploadImage: (file) => uploadImageMutation.mutate(file),
    uploadingImage: uploadImageMutation.isPending,
    uploadImageError: uploadImageMutation.error?.message,
    onDeleteImage: (imageId) => deleteImageMutation.mutate(imageId),
    onReorderImages: (imageIds) => reorderImageMutation.mutate(imageIds),
  }
}

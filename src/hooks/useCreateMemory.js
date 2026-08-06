import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createMemory, createPlanMemory, presignMemoryImage, commitMemoryImage } from '../api/memory'
import { uploadImage } from '../lib/uploadImage'

// 추억 생성 공용 뮤테이션 — 추억피드·우정공간(대시보드)에서 같은 글쓰기 모달을 재사용한다.
// planId가 있으면 약속 연결 추억(POST /plans/{id}/memories), 없으면 FREE MEMORY(POST /rooms/{id}/memories).
// 본문 생성은 항상 1회만 일어나도록, 개별 사진 업로드 실패는 삼켜 중복 생성을 막는다(상세에서 재추가 가능).
export function useCreateMemory(roomId, { onSuccess } = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ planId, payload, files }) => {
      const created = planId ? await createPlanMemory(planId, payload) : await createMemory(roomId, payload)
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
      queryClient.invalidateQueries({ queryKey: ['memories', roomId] })
      // 약속 연결 시 plan memory_status가 WRITTEN으로 바뀌므로 일정계획 목록도 갱신.
      queryClient.invalidateQueries({ queryKey: ['plans', roomId] })
      // 추억 작성은 XP도 준다(MEMORY_WRITE, 계약 §12) — ['room', roomId] 프리픽스로 무효화하면
      // level·exp-logs·members·room 상세가 한 번에 갱신된다(저장소 기존 관례, Notifications.jsx 참고).
      queryClient.invalidateQueries({ queryKey: ['room', roomId] })
      // 추억 등록도 골드를 지급한다 — 약속 연결 300(횟수 캡 없음), 자유 추억 200(하루 10회 +
      // 본문 3자 이상). 하루 총 상한은 6,000이다(계약 §15-4).
      // 상한·횟수·길이 어디에 걸려 지급이 0이어도 무효화는 무해하다(잔액 그대로 재조회).
      queryClient.invalidateQueries({ queryKey: ['wallet'] })
      onSuccess?.()
    },
  })
}

import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as S from './Schedule.style'
import {
  getPlans, getPlan, createPlan, deletePlan,
  completePlan, cancelPlan, skipPlanMemory,
  addChecklist, updateChecklist, deleteChecklist,
  getStagePhotos, presignStagePhoto, commitStagePhoto,
} from '../../../api/plan'
import { uploadImage } from '../../../lib/uploadImage'
import { useAuthStore } from '../../../stores/authStore'
import { currentUserIdFromToken } from '../../../lib/jwt'

// 계약 §8 status/memoryStatus 라벨.
const STATUS_LABEL = { SCHEDULED: '예정', COMPLETED: '완료', CANCELED: '취소' }
const MEMORY_LABEL = { NONE: '', CANDIDATE: '추억 후보', WRITTEN: '추억 작성됨', SKIPPED: '추억 스킵' }
// 인생4컷 단계(계약 §9, 서버가 순서·잠김 계산).
const STAGE_LABEL = { PROPOSAL: '제안', SCHEDULING: '조율', CONFIRMED: '확정', MEETING: '만남' }
const FILTERS = [
  { key: '', label: '전체' },
  { key: 'SCHEDULED', label: '예정' },
  { key: 'COMPLETED', label: '완료' },
]

// 일정계획(약속) 화면. roomId 컨텍스트에서 약속 목록·생성·상세(체크리스트·완료/취소/스킵)를 다룬다.
// 인생4컷(stage-photos)은 스토리지 셋업 후 별도 추가.
export default function Schedule() {
  const { roomId } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const accessToken = useAuthStore((state) => state.accessToken)
  const currentUserId = currentUserIdFromToken(accessToken)

  const [status, setStatus] = useState('')
  const [selectedPlanId, setSelectedPlanId] = useState(null)
  const [isCreateOpen, setCreateOpen] = useState(false)

  const listFilters = { status: status || undefined }
  const plans = useQuery({
    queryKey: ['plans', roomId, listFilters],
    queryFn: () => getPlans(roomId, listFilters),
  })

  const detail = useQuery({
    queryKey: ['plan', selectedPlanId],
    queryFn: () => getPlan(selectedPlanId),
    enabled: Boolean(selectedPlanId),
  })

  const stages = useQuery({
    queryKey: ['plan', selectedPlanId, 'stages'],
    queryFn: () => getStagePhotos(selectedPlanId),
    enabled: Boolean(selectedPlanId),
  })

  const invalidateList = () => queryClient.invalidateQueries({ queryKey: ['plans', roomId] })
  // ['plan', selectedPlanId] 부분일치로 상세·단계사진을 함께 무효화.
  const invalidateDetail = () => queryClient.invalidateQueries({ queryKey: ['plan', selectedPlanId] })

  const createMutation = useMutation({
    mutationFn: (payload) => createPlan(roomId, payload),
    onSuccess: () => {
      invalidateList()
      setCreateOpen(false)
    },
  })

  const detailMutation = (fn) => ({
    mutationFn: fn,
    onSuccess: () => {
      invalidateList()
      invalidateDetail()
    },
  })

  const completeMutation = useMutation(detailMutation(() => completePlan(selectedPlanId)))
  const cancelMutation = useMutation(detailMutation(() => cancelPlan(selectedPlanId)))
  const skipMutation = useMutation(detailMutation(() => skipPlanMemory(selectedPlanId)))
  const addChecklistMutation = useMutation(detailMutation((content) => addChecklist(selectedPlanId, { content })))
  const toggleChecklistMutation = useMutation(detailMutation(({ id, checked }) => updateChecklist(id, { checked })))
  const deleteChecklistMutation = useMutation(detailMutation((id) => deleteChecklist(id)))
  const deleteMutation = useMutation({
    mutationFn: () => deletePlan(selectedPlanId),
    onSuccess: () => {
      invalidateList()
      setSelectedPlanId(null)
    },
  })

  // 인생4컷: presign(stage) → R2 PUT → commit(stage). 단계사진·상세 무효화.
  const uploadStageMutation = useMutation({
    mutationFn: async ({ stage, file }) => {
      const imageUrl = await uploadImage(
        (base) => presignStagePhoto(selectedPlanId, { stage, contentType: base.contentType }),
        file,
      )
      return commitStagePhoto(selectedPlanId, { stage, imageUrl })
    },
    onSuccess: () => {
      invalidateDetail()
      invalidateList()
    },
  })

  const items = plans.data?.items ?? []

  return (
    <S.Page>
      <S.TopBar>
        <S.BackBtn type="button" onClick={() => navigate(`/rooms/${roomId}`)}>
          ← 우정공간
        </S.BackBtn>
        <S.Title>일정계획</S.Title>
        <S.WriteBtn type="button" onClick={() => setCreateOpen(true)}>
          + 새 약속
        </S.WriteBtn>
      </S.TopBar>

      <S.Tabs>
        {FILTERS.map((f) => (
          <S.Tab key={f.key || 'all'} type="button" $active={status === f.key} onClick={() => setStatus(f.key)}>
            {f.label}
          </S.Tab>
        ))}
      </S.Tabs>

      {plans.isPending && <S.State>불러오는 중…</S.State>}
      {plans.isError && <S.State>약속을 불러오지 못했습니다. {plans.error?.message}</S.State>}
      {plans.isSuccess && items.length === 0 && <S.State>아직 약속이 없습니다. 새 약속을 만들어보세요.</S.State>}

      <S.List>
        {items.map((plan) => (
          <S.Card key={plan.id} onClick={() => setSelectedPlanId(plan.id)} $status={plan.status}>
            <S.CardTop>
              <S.CardTitle>{plan.title}</S.CardTitle>
              <S.Badge $status={plan.status}>{STATUS_LABEL[plan.status] ?? plan.status}</S.Badge>
            </S.CardTop>
            {plan.planDate && <S.CardDate>📅 {plan.planDate}</S.CardDate>}
            <S.CardMeta>
              <span>{plan.writer?.nickname}</span>
              {MEMORY_LABEL[plan.memoryStatus] && <S.MemoryTag>{MEMORY_LABEL[plan.memoryStatus]}</S.MemoryTag>}
            </S.CardMeta>
          </S.Card>
        ))}
      </S.List>

      {isCreateOpen && (
        <CreatePlanModal
          submitting={createMutation.isPending}
          errorMessage={createMutation.error?.message}
          onCancel={() => setCreateOpen(false)}
          onSubmit={(payload) => createMutation.mutate(payload)}
        />
      )}

      {selectedPlanId && (
        <PlanDetailModal
          plan={detail.data}
          isLoading={detail.isPending}
          currentUserId={currentUserId}
          onClose={() => setSelectedPlanId(null)}
          onComplete={() => completeMutation.mutate()}
          onCancel={() => cancelMutation.mutate()}
          onSkip={() => skipMutation.mutate()}
          onDelete={() => {
            if (window.confirm('이 약속을 삭제할까요?')) deleteMutation.mutate()
          }}
          onAddChecklist={(content) => addChecklistMutation.mutate(content)}
          onToggleChecklist={(id, checked) => toggleChecklistMutation.mutate({ id, checked })}
          onDeleteChecklist={(id) => deleteChecklistMutation.mutate(id)}
          stages={stages.data?.items ?? []}
          stagesLoading={stages.isPending}
          onUploadStage={(stage, file) => uploadStageMutation.mutate({ stage, file })}
          uploadingStage={uploadStageMutation.isPending ? uploadStageMutation.variables?.stage : null}
          stageError={uploadStageMutation.error}
          busy={
            completeMutation.isPending || cancelMutation.isPending || skipMutation.isPending ||
            deleteMutation.isPending || addChecklistMutation.isPending ||
            toggleChecklistMutation.isPending || deleteChecklistMutation.isPending
          }
        />
      )}
    </S.Page>
  )
}

function CreatePlanModal({ submitting, errorMessage, onCancel, onSubmit }) {
  const [title, setTitle] = useState('')
  const [planDate, setPlanDate] = useState('')
  const [description, setDescription] = useState('')

  const handleSubmit = () => {
    if (!title.trim()) return
    onSubmit({
      title: title.trim(),
      planDate: planDate || null,
      description: description.trim() || null,
    })
  }

  return (
    <S.Overlay onClick={onCancel}>
      <S.Modal onClick={(e) => e.stopPropagation()}>
        <S.ModalTitle>새 약속</S.ModalTitle>
        <S.Field>
          <S.Label htmlFor="plan-title">제목</S.Label>
          <S.Input id="plan-title" value={title} maxLength={100} placeholder="예: 제주 도착 첫날"
            onChange={(e) => setTitle(e.target.value)} />
        </S.Field>
        <S.Field>
          <S.Label htmlFor="plan-date">날짜</S.Label>
          <S.Input id="plan-date" type="date" value={planDate} onChange={(e) => setPlanDate(e.target.value)} />
        </S.Field>
        <S.Field>
          <S.Label htmlFor="plan-desc">설명</S.Label>
          <S.Textarea id="plan-desc" value={description} placeholder="공항 10시 집합 등"
            onChange={(e) => setDescription(e.target.value)} />
        </S.Field>
        {errorMessage && <S.ErrorText role="alert">{errorMessage}</S.ErrorText>}
        <S.ModalActions>
          <S.SecondaryBtn type="button" onClick={onCancel}>취소</S.SecondaryBtn>
          <S.PrimaryBtn type="button" disabled={!title.trim() || submitting} onClick={handleSubmit}>
            {submitting ? '만드는 중…' : '만들기'}
          </S.PrimaryBtn>
        </S.ModalActions>
      </S.Modal>
    </S.Overlay>
  )
}

function PlanDetailModal({
  plan, isLoading, currentUserId, onClose,
  onComplete, onCancel, onSkip, onDelete,
  onAddChecklist, onToggleChecklist, onDeleteChecklist, busy,
  stages, stagesLoading, onUploadStage, uploadingStage, stageError,
}) {
  const [checkItem, setCheckItem] = useState('')
  const isWriter = plan && String(plan.writer?.id) === String(currentUserId)
  const checklists = plan?.checklists ?? []

  const submitCheck = () => {
    if (!checkItem.trim()) return
    onAddChecklist(checkItem.trim())
    setCheckItem('')
  }

  return (
    <S.Overlay onClick={onClose}>
      <S.Modal onClick={(e) => e.stopPropagation()}>
        {isLoading && <S.State>불러오는 중…</S.State>}
        {!isLoading && plan && (
          <>
            <S.ModalTitle>{plan.title}</S.ModalTitle>
            <S.DetailMeta>
              <S.Badge $status={plan.status}>{STATUS_LABEL[plan.status] ?? plan.status}</S.Badge>
              {plan.planDate && <span>📅 {plan.planDate}</span>}
              <span>{plan.writer?.nickname}</span>
              {MEMORY_LABEL[plan.memoryStatus] && <S.MemoryTag>{MEMORY_LABEL[plan.memoryStatus]}</S.MemoryTag>}
            </S.DetailMeta>
            {plan.description && <S.DetailDesc>{plan.description}</S.DetailDesc>}

            <S.SubHead>체크리스트</S.SubHead>
            <S.CheckList>
              {checklists.map((c) => (
                <S.CheckRow key={c.id}>
                  <input type="checkbox" checked={Boolean(c.checked)} disabled={busy}
                    onChange={() => onToggleChecklist(c.id, !c.checked)} />
                  <S.CheckText $done={c.checked}>{c.content}</S.CheckText>
                  <S.RemoveCheck type="button" disabled={busy} onClick={() => onDeleteChecklist(c.id)}>✕</S.RemoveCheck>
                </S.CheckRow>
              ))}
              {checklists.length === 0 && <S.MutedLine>아직 항목이 없어요.</S.MutedLine>}
            </S.CheckList>
            {plan.status === 'SCHEDULED' && (
              <S.CheckAdd>
                <S.Input value={checkItem} maxLength={255} placeholder="항목 추가"
                  onChange={(e) => setCheckItem(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && submitCheck()} />
                <S.SecondaryBtn type="button" disabled={!checkItem.trim() || busy} onClick={submitCheck}>추가</S.SecondaryBtn>
              </S.CheckAdd>
            )}

            <S.SubHead>인생4컷</S.SubHead>
            {stagesLoading ? (
              <S.MutedLine>불러오는 중…</S.MutedLine>
            ) : (
              <S.StageGrid>
                {stages.map((s) => (
                  <S.StageCell key={s.stage} $state={s.state}>
                    <S.StageName>{STAGE_LABEL[s.stage] ?? s.stage}</S.StageName>
                    {s.state === 'DONE' && s.imageUrl ? (
                      <S.StageImg src={s.imageUrl} alt={`${STAGE_LABEL[s.stage] ?? s.stage} 사진`} />
                    ) : s.state === 'ACTIVE' ? (
                      <S.StageUpload $busy={uploadingStage === s.stage}>
                        {uploadingStage === s.stage ? '업로드 중…' : '＋ 사진'}
                        <input
                          type="file"
                          accept="image/*"
                          hidden
                          disabled={Boolean(uploadingStage)}
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) onUploadStage(s.stage, file)
                            e.target.value = ''
                          }}
                        />
                      </S.StageUpload>
                    ) : (
                      <S.StageLocked>🔒</S.StageLocked>
                    )}
                  </S.StageCell>
                ))}
              </S.StageGrid>
            )}
            {stageError && (
              <S.ErrorText role="alert">
                {stageError.code === 'STAGE_LOCKED'
                  ? '이전 단계 사진을 먼저 올려주세요.'
                  : stageError.code === 'STAGE_ALREADY_UPLOADED'
                    ? '이미 올린 단계예요.'
                    : stageError.message}
              </S.ErrorText>
            )}

            <S.ModalActions>
              {plan.status === 'SCHEDULED' && (
                <>
                  <S.PrimaryBtn type="button" disabled={busy} onClick={onComplete}>완료</S.PrimaryBtn>
                  {isWriter && <S.SecondaryBtn type="button" disabled={busy} onClick={onCancel}>취소</S.SecondaryBtn>}
                  {isWriter && <S.SecondaryBtn type="button" disabled={busy} onClick={onDelete}>삭제</S.SecondaryBtn>}
                </>
              )}
              {plan.status === 'COMPLETED' && plan.memoryStatus === 'CANDIDATE' && (
                <S.SecondaryBtn type="button" disabled={busy} onClick={onSkip}>추억 스킵</S.SecondaryBtn>
              )}
              <S.PrimaryBtn type="button" onClick={onClose}>닫기</S.PrimaryBtn>
            </S.ModalActions>
          </>
        )}
      </S.Modal>
    </S.Overlay>
  )
}

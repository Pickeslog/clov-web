import { useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import './schedule.proto.css'
import {
  getPlans, getPlan, createPlan, updatePlan, deletePlan,
  completePlan, cancelPlan, skipPlanMemory,
  addChecklist, updateChecklist, deleteChecklist,
  getStagePhotos, presignStagePhoto, commitStagePhoto,
} from '../../../api/plan'
import { uploadImage } from '../../../lib/uploadImage'
import { useAuthStore } from '../../../stores/authStore'
import { currentUserIdFromToken } from '../../../lib/jwt'
import Header from '../../../components/Header/Header'

// 일정계획 = 항상 크림 종이/세이지 앨범 미감. 팔레트를 <main>에 인라인으로 못박아
// (모든 하위 상속) @scope 루트 미적용 이슈와 무관하게 다크에서도 라이트로 렌더한다.
const SCHEDULE_LIGHT_PALETTE = {
  colorScheme: 'light',
  '--primary-green': '#1b4332',
  '--accent-green': '#52b788',
  '--text-color': '#2c3e35',
  '--text-muted': '#61766a',
  '--border-color': '#eadfd0',
  '--bg-light': '#f4f0e6',
  background: 'linear-gradient(180deg, #eef1e7 0%, #e7ece1 100%)',
  minHeight: '100vh',
}

// 계약 §8: status/memoryStatus.
const MEMORY_LABEL = { NONE: '', CANDIDATE: '추억 후보', WRITTEN: '추억 작성됨', SKIPPED: '추억 스킵' }
// 인생4컷 4단계(계약 §9, 순서·잠김·상태는 서버 계산). 라벨은 프로토타입 필름스트립과 동일.
const STAGES = [
  { key: 'PROPOSAL', number: 1, name: '제안하기' },
  { key: 'SCHEDULING', number: 2, name: '일정 맞추기' },
  { key: 'CONFIRMED', number: 3, name: '약속 확정' },
  { key: 'MEETING', number: 4, name: '만남' },
]
const DENSITY = [
  { key: 'all', label: '전체' },
  { key: 'proof', label: '인증 가능' },
  { key: 'upcoming', label: '다가오는 약속' },
  { key: 'done', label: '완료된 약속' },
]

// ── D-day 유틸(프로토타입 utils.js 이식) ─────────────────────────────
function getDdayDiffDays(dateStr) {
  if (!dateStr) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr)
  target.setHours(0, 0, 0, 0)
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}
function calculateDday(dateStr) {
  const d = getDdayDiffDays(dateStr)
  if (d === null) return 'D-day'
  if (d === 0) return 'D-Day'
  return d > 0 ? `D-${d}` : `D+${Math.abs(d)}`
}
function formatFriendlyDate(dateStr) {
  if (!dateStr) return '연도-월-일'
  const date = new Date(dateStr)
  const week = ['일', '월', '화', '수', '목', '금', '토']
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 (${week[date.getDay()]})`
}

// 인생4컷 업로드 카메라 아이콘(프로토타입 stageUploadIconSvg).
const StripUploadIcon = () => (
  <svg className="strip-upload-svg" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M8.35 6.9l1.28-2.05h4.74l1.28 2.05H18a2.7 2.7 0 0 1 2.7 2.7v6.85a2.7 2.7 0 0 1-2.7 2.7H6a2.7 2.7 0 0 1-2.7-2.7V9.6A2.7 2.7 0 0 1 6 6.9h2.35z" fill="currentColor" opacity=".14" />
    <path d="M8.35 6.9l1.28-2.05h4.74l1.28 2.05H18a2.7 2.7 0 0 1 2.7 2.7v6.85a2.7 2.7 0 0 1-2.7 2.7H6a2.7 2.7 0 0 1-2.7-2.7V9.6A2.7 2.7 0 0 1 6 6.9h2.35z" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinejoin="round" />
    <circle cx="12" cy="13" r="3.35" fill="none" stroke="currentColor" strokeWidth="1.65" />
    <path d="M17.35 9.45h.1" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" />
  </svg>
)

// 일정계획(약속 여정) 화면 — 프로토타입 룩 이식. 인생4컷 극장(입장하기)은 후속 PR.
export default function Schedule() {
  const { roomId } = useParams()
  const queryClient = useQueryClient()
  const accessToken = useAuthStore((state) => state.accessToken)
  const currentUserId = currentUserIdFromToken(accessToken)

  const [selectedPlanId, setSelectedPlanId] = useState(null)
  const [density, setDensity] = useState('all')
  const [editing, setEditing] = useState(null) // null | 'new' | plan(수정 대상)
  const railRef = useRef(null)

  const plans = useQuery({
    queryKey: ['plans', roomId],
    queryFn: () => getPlans(roomId),
  })
  const items = plans.data?.items ?? []

  // 카드별 4컷 상태 — 목록엔 진행도가 없어 약속마다 stage-photos를 조회(계약 §9).
  // 백엔드/R2 미준비 시 실패해도 카드는 중립(1단계 활성·나머지 잠김 근사)으로 렌더.
  const stageQueries = useQueries({
    queries: items.map((p) => ({
      queryKey: ['plan', p.id, 'stages'],
      queryFn: () => getStagePhotos(p.id),
      enabled: Boolean(p.id),
      retry: false,
      staleTime: 30_000,
    })),
  })
  const stageMap = {}
  items.forEach((p, i) => {
    const list = stageQueries[i]?.data?.items ?? null
    stageMap[p.id] = {
      stages: list,
      doneCount: (list ?? []).filter((s) => s.state === 'DONE').length,
    }
  })
  const doneCountOf = (id) => stageMap[id]?.doneCount ?? 0

  // 기본 선택 = 가장 가까운 미래 약속(없으면 첫 약속).
  const closestId = (() => {
    if (items.length === 0) return null
    const future = items
      .filter((p) => p.planDate && getDdayDiffDays(p.planDate) >= 0)
      .sort((a, b) => getDdayDiffDays(a.planDate) - getDdayDiffDays(b.planDate))
    return (future[0] ?? items[0]).id
  })()
  const effectiveId = selectedPlanId && items.some((p) => p.id === selectedPlanId) ? selectedPlanId : closestId

  const detail = useQuery({
    queryKey: ['plan', effectiveId],
    queryFn: () => getPlan(effectiveId),
    enabled: Boolean(effectiveId),
  })

  const invalidateList = () => queryClient.invalidateQueries({ queryKey: ['plans', roomId] })
  const invalidateDetail = () => queryClient.invalidateQueries({ queryKey: ['plan', effectiveId] })
  const detailMutation = (fn) => ({ mutationFn: fn, onSuccess: () => { invalidateList(); invalidateDetail() } })

  const createMutation = useMutation({
    mutationFn: (payload) => createPlan(roomId, payload),
    onSuccess: (created) => { invalidateList(); setEditing(null); if (created?.id) setSelectedPlanId(created.id) },
  })
  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => updatePlan(id, payload),
    onSuccess: () => { invalidateList(); invalidateDetail(); setEditing(null) },
  })
  const completeMutation = useMutation(detailMutation(() => completePlan(effectiveId)))
  const cancelMutation = useMutation(detailMutation(() => cancelPlan(effectiveId)))
  const skipMutation = useMutation(detailMutation(() => skipPlanMemory(effectiveId)))
  const addCheckMutation = useMutation(detailMutation((content) => addChecklist(effectiveId, { content })))
  const toggleCheckMutation = useMutation(detailMutation(({ id, checked }) => updateChecklist(id, { checked })))
  const deleteCheckMutation = useMutation(detailMutation((id) => deleteChecklist(id)))
  const deleteMutation = useMutation({
    mutationFn: () => deletePlan(effectiveId),
    onSuccess: () => { invalidateList(); setSelectedPlanId(null) },
  })
  // 인생4컷 업로드: presign(stage) → R2 PUT → commit(stage).
  const uploadMutation = useMutation({
    mutationFn: async ({ planId, stage, file }) => {
      const imageUrl = await uploadImage(
        (base) => presignStagePhoto(planId, { stage, contentType: base.contentType }),
        file,
      )
      return commitStagePhoto(planId, { stage, imageUrl })
    },
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ['plan', vars.planId, 'stages'] })
      invalidateList()
    },
  })
  const uploadingKey = uploadMutation.isPending
    ? `${uploadMutation.variables?.planId}:${uploadMutation.variables?.stage}`
    : null

  const detailBusy =
    completeMutation.isPending || cancelMutation.isPending || skipMutation.isPending ||
    deleteMutation.isPending || addCheckMutation.isPending ||
    toggleCheckMutation.isPending || deleteCheckMutation.isPending

  // 밀도 필터 + 정렬(가까운 순).
  const passesDensity = (p) => {
    if (density === 'proof') return doneCountOf(p.id) < 4
    if (density === 'upcoming') return p.planDate && getDdayDiffDays(p.planDate) >= 0
    if (density === 'done') return doneCountOf(p.id) === 4
    return true
  }
  const sortByClosest = (a, b) => Math.abs(getDdayDiffDays(a.planDate) ?? 9e9) - Math.abs(getDdayDiffDays(b.planDate) ?? 9e9)
  const visible = items.filter(passesDensity).sort(sortByClosest)

  const counts = {
    all: items.length,
    proof: items.filter((p) => doneCountOf(p.id) < 4).length,
    upcoming: items.filter((p) => p.planDate && getDdayDiffDays(p.planDate) >= 0).length,
    done: items.filter((p) => doneCountOf(p.id) === 4).length,
  }

  const scrollRail = (dir) => {
    const vp = railRef.current
    if (!vp) return
    vp.scrollBy({ left: dir * 320, behavior: 'smooth' })
  }

  const selectedPlan = detail.data

  const renderCard = (p) => (
    <FilmStripCard
      key={p.id}
      plan={p}
      stages={stageMap[p.id]?.stages ?? null}
      doneCount={doneCountOf(p.id)}
      selected={p.id === effectiveId}
      uploadingKey={uploadingKey}
      onSelect={() => setSelectedPlanId(p.id)}
      onUpload={(stage, file) => uploadMutation.mutate({ planId: p.id, stage, file })}
    />
  )

  return (
    <main className="proto-schedule" style={SCHEDULE_LIGHT_PALETTE}>
      <Header variant="room" roomId={roomId} activeTab="schedule" />

      <div className="schedule-wrap">
        <div className="section-title journey-section-title">
          <div className="journey-heading">
            <span className="journey-page-kicker">PROMISE JOURNEY</span>
            <span className="journey-page-title">약속 여정</span>
          </div>
          <button type="button" className="btn-schedule-new" onClick={() => setEditing('new')}>
            ＋ 새 D-day 만들기
          </button>
        </div>

        {plans.isPending && <div className="schedule-state">불러오는 중…</div>}
        {plans.isError && <div className="schedule-state">약속을 불러오지 못했습니다. {plans.error?.message}</div>}
        {plans.isSuccess && items.length === 0 && (
          <div className="schedule-state">
            아직 함께 세어볼 D-day가 없어요.<br />상단의 ‘새 D-day 만들기’로 첫 약속을 만들어보세요!
          </div>
        )}

        {items.length > 0 && (
          <section className="growth-shell">
            <ReceiptCard
              plan={selectedPlan}
              loading={detail.isPending}
              currentUserId={currentUserId}
              busy={detailBusy}
              onEdit={() => selectedPlan && setEditing(selectedPlan)}
              onDelete={() => { if (window.confirm('정말 이 약속을 삭제하시겠어요?')) deleteMutation.mutate() }}
              onComplete={() => completeMutation.mutate()}
              onCancel={() => cancelMutation.mutate()}
              onSkip={() => skipMutation.mutate()}
              onAddCheck={(c) => addCheckMutation.mutate(c)}
              onToggleCheck={(id, checked) => toggleCheckMutation.mutate({ id, checked })}
              onDeleteCheck={(id) => deleteCheckMutation.mutate(id)}
            />

            <div className="growth-hero">
              <div>
                <span className="growth-kicker">LIFE FOUR CUT</span>
                <span className="growth-title">전체 약속 보기</span>
                <span className="growth-subtitle">
                  제안하기부터 만남까지, 네 장의 인증사진이 모이면 인생4컷처럼 완성됩니다.
                </span>
              </div>
              <div className="growth-density" aria-label="일정 필터">
                {DENSITY.map((d) => (
                  <button key={d.key} type="button" className={density === d.key ? 'active' : ''} onClick={() => setDensity(d.key)}>
                    {d.label} <span>{counts[d.key]}</span>
                  </button>
                ))}
                <button
                  type="button"
                  className="fourcut-gallery-btn"
                  onClick={() => window.alert('인생4컷 극장은 곧 열려요! (다음 업데이트 예정)')}
                >
                  🎬 입장하기
                </button>
              </div>
            </div>

            <div className="growth-card-rail">
              <button type="button" className="carousel-btn" aria-label="이전 약속 보기" onClick={() => scrollRail(-1)}>‹</button>
              <div className="growth-card-viewport" ref={railRef}>
                <div className="growth-card-list">
                  {visible.length === 0 ? (
                    <div className="growth-filter-empty">이 필터에 맞는 약속이 아직 없어요.</div>
                  ) : (
                    visible.map(renderCard)
                  )}
                </div>
              </div>
              <button type="button" className="carousel-btn" aria-label="다음 약속 보기" onClick={() => scrollRail(1)}>›</button>
            </div>
          </section>
        )}
      </div>

      {editing && (
        <ScheduleEditorModal
          plan={editing === 'new' ? null : editing}
          submitting={createMutation.isPending || updateMutation.isPending}
          errorMessage={createMutation.error?.message || updateMutation.error?.message}
          onClose={() => setEditing(null)}
          onSubmit={(payload) => {
            if (editing === 'new') createMutation.mutate(payload)
            else updateMutation.mutate({ id: editing.id, payload })
          }}
        />
      )}
    </main>
  )
}

// ── 약속 상세 영수증(선택 약속) ──────────────────────────────────────
function ReceiptCard({
  plan, loading, currentUserId, busy,
  onEdit, onDelete, onComplete, onCancel, onSkip,
  onAddCheck, onToggleCheck, onDeleteCheck,
}) {
  const [checkItem, setCheckItem] = useState('')

  if (loading || !plan) {
    return (
      <div className="growth-detail">
        <div className="receipt-paper"><div className="receipt-memo-empty">불러오는 중…</div></div>
      </div>
    )
  }

  const diff = getDdayDiffDays(plan.planDate)
  const ddayText = calculateDday(plan.planDate)
  const stampColor = diff !== null && diff < 0 ? '#2e5233' : '#c0392b'
  const ddayPhrase = diff === null
    ? '함께할 그날까지'
    : diff < 0 ? '함께 보낸 그날로부터' : diff === 0 ? '바로 오늘, 약속의 날!' : '함께할 그날까지'
  const isWriter = String(plan.writer?.id) === String(currentUserId)
  const checklists = plan.checklists ?? []
  const memoEmpty = !plan.description && checklists.length === 0

  const submitCheck = () => {
    const v = checkItem.trim()
    if (!v) return
    onAddCheck(v)
    setCheckItem('')
  }

  return (
    <div className="growth-detail" style={{ '--stamp': stampColor }}>
      <div className="receipt-paper">
        <div className="receipt-zigzag" />
        <div className="receipt-head">
          <div className="receipt-brand">CLOV. MEMORIES</div>
          <div className="receipt-sub">★  약 속 메 모  ★</div>
        </div>
        <div className="receipt-stamp-wrap">
          <div className="receipt-stamp">
            <span className="receipt-stamp-label">{ddayPhrase}</span>
            <span className="receipt-stamp-dday">{ddayText}</span>
          </div>
        </div>
        <div className="receipt-title">{plan.title}</div>
        <div className="receipt-meta">
          <div><span>DATE</span><span>{formatFriendlyDate(plan.planDate)}</span></div>
          <div><span>D-DAY</span><span>{ddayText}</span></div>
        </div>

        <div className="receipt-memo-label">— MEMO ————————————</div>
        <div className="receipt-memo">
          {plan.description && <p className="receipt-memo-desc">{plan.description}</p>}
          {checklists.length > 0 && (
            <ul className="receipt-check-list">
              {checklists.map((c) => (
                <li key={c.id} className="receipt-check">
                  <input
                    type="checkbox"
                    checked={Boolean(c.checked)}
                    disabled={busy}
                    onChange={() => onToggleCheck(c.id, !c.checked)}
                    aria-label={c.content}
                  />
                  <span className={`receipt-check-text${c.checked ? ' is-done' : ''}`}>{c.content}</span>
                  <button type="button" className="receipt-check-remove" disabled={busy} onClick={() => onDeleteCheck(c.id)} aria-label="항목 삭제">✕</button>
                </li>
              ))}
            </ul>
          )}
          {memoEmpty && <div className="receipt-memo-empty">✎ 아래에서 약속 준비 항목을 추가해 보세요</div>}
          {plan.status === 'SCHEDULED' && (
            <div className="receipt-check-add">
              <input
                value={checkItem}
                maxLength={255}
                placeholder="준비 항목 추가"
                onChange={(e) => setCheckItem(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submitCheck()}
              />
              <button type="button" disabled={!checkItem.trim() || busy} onClick={submitCheck}>추가</button>
            </div>
          )}
        </div>

        <div className="receipt-barcode" />

        <div className="receipt-status">
          {plan.status === 'SCHEDULED' && (
            <button type="button" className="receipt-status-btn is-primary" disabled={busy} onClick={onComplete}>약속 완료</button>
          )}
          {plan.status === 'SCHEDULED' && isWriter && (
            <button type="button" className="receipt-status-btn" disabled={busy} onClick={onCancel}>약속 취소</button>
          )}
          {plan.status === 'COMPLETED' && plan.memoryStatus === 'CANDIDATE' && (
            <button type="button" className="receipt-status-btn" disabled={busy} onClick={onSkip}>추억 스킵</button>
          )}
          {plan.status === 'CANCELED' && <span className="receipt-check-text is-done">취소된 약속</span>}
          {MEMORY_LABEL[plan.memoryStatus] && <span className="receipt-memory-tag">{MEMORY_LABEL[plan.memoryStatus]}</span>}
        </div>

        {isWriter && (
          <div className="receipt-actions">
            <button type="button" disabled={busy} onClick={onEdit}>수정</button>
            <button type="button" className="danger" disabled={busy} onClick={onDelete}>삭제</button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── 인생4컷 필름스트립 카드(약속별) ─────────────────────────────────
function FilmStripCard({ plan, stages, doneCount, selected, uploadingKey, onSelect, onUpload }) {
  const ddayText = calculateDday(plan.planDate)
  const isComplete = doneCount === 4
  // stages 미조회(백엔드 미준비 등) 시 1단계 활성·나머지 잠김으로 근사.
  const stateOf = (key, idx) => {
    if (stages) {
      const found = stages.find((s) => s.stage === key)
      return { state: found?.state ?? 'LOCKED', imageUrl: found?.imageUrl ?? null }
    }
    return { state: idx === 0 ? 'ACTIVE' : 'LOCKED', imageUrl: null }
  }

  return (
    <article
      className={`growth-card four-cut${selected ? ' is-selected' : ''}${isComplete ? ' is-complete' : ''}`}
      onClick={onSelect}
    >
      <div className="strip-header">
        <div className="strip-title-wrap">
          <span className={`strip-kicker${isComplete ? '' : ' is-shooting'}`}>
            {isComplete ? 'COMPLETE' : <><span className="strip-kicker-dot" />NOW SHOOTING</>}
          </span>
          <span className="strip-title">{plan.title}</span>
        </div>
        <span className="growth-dday-pill">{ddayText}</span>
      </div>

      <div className="strip-body">
        <div className="strip-frames">
          {STAGES.map((st, idx) => {
            const { state, imageUrl } = stateOf(st.key, idx)
            const uploading = uploadingKey === `${plan.id}:${st.key}`
            const frame = (
              <>
                {state === 'DONE' && imageUrl && (
                  <div className="strip-frame-photo" style={{ backgroundImage: `url('${imageUrl}')` }} />
                )}
                {state !== 'DONE' && <span className="strip-frame-number">{st.number}</span>}
                {state === 'LOCKED' && (
                  <span className="strip-lock-icon">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
                  </span>
                )}
                {state === 'ACTIVE' && !uploading && (
                  <>
                    <span className="strip-rec-badge"><span className="strip-rec-dot" />REC</span>
                    <span className="strip-upload-icon"><StripUploadIcon /></span>
                    <span className="strip-upload-hint">업로드</span>
                  </>
                )}
                {state === 'ACTIVE' && uploading && <span className="strip-upload-hint">업로드 중…</span>}
                <span className="strip-frame-label">{st.number}. {st.name}</span>
              </>
            )
            const cls = `strip-frame strip-frame--${state.toLowerCase()}${uploading ? ' strip-frame--uploading' : ''}`
            if (state === 'ACTIVE' && !uploading) {
              return (
                <label key={st.key} className={cls} title={`${st.name} 인증사진 올리기`} onClick={(e) => e.stopPropagation()}>
                  {frame}
                  <input
                    type="file"
                    accept="image/*"
                    className="strip-frame-file"
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) onUpload(st.key, f)
                      e.target.value = ''
                    }}
                  />
                </label>
              )
            }
            return <div key={st.key} className={cls} title={st.name}>{frame}</div>
          })}
        </div>
      </div>

      <div className="strip-footer">
        <span className="strip-footer-brand">clov. memories</span>
        <span className="strip-footer-count">{isComplete ? '인생4컷 완성 🍀' : `${doneCount}/4 업로드`}</span>
      </div>
    </article>
  )
}

// ── 새/수정 영수증 모달 ─────────────────────────────────────────────
function ScheduleEditorModal({ plan, submitting, errorMessage, onClose, onSubmit }) {
  const [title, setTitle] = useState(plan?.title ?? '')
  const [planDate, setPlanDate] = useState(plan?.planDate ?? '')
  const [description, setDescription] = useState(plan?.description ?? '')

  const today = (() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })()
  const diff = getDdayDiffDays(planDate)
  const ddayText = calculateDday(planDate)
  const stampColor = diff !== null && diff < 0 ? '#2e5233' : '#c0392b'
  const ddayPhrase = diff === null
    ? '함께할 그날까지'
    : diff < 0 ? '함께 보낸 그날로부터' : diff === 0 ? '바로 오늘, 약속의 날!' : '함께할 그날까지'

  const canSubmit = title.trim() && planDate && !submitting
  const submit = () => {
    if (!canSubmit) return
    onSubmit({ title: title.trim(), planDate, description: description.trim() || null })
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box schedule-editor" onClick={(e) => e.stopPropagation()}>
        <div className="growth-detail" style={{ '--stamp': stampColor }}>
          <div className="receipt-paper">
            <div className="receipt-head">
              <div className="receipt-brand">CLOV. MEMORIES</div>
              <div className="receipt-sub">{plan ? '★  약속 수정하기  ★' : '★  새 D-day 만들기  ★'}</div>
            </div>
            <div className="receipt-stamp-wrap">
              <div className="receipt-stamp">
                <span className="receipt-stamp-label">{ddayPhrase}</span>
                <span className="receipt-stamp-dday">{ddayText}</span>
              </div>
            </div>
            <input
              className="receipt-title-input"
              value={title}
              maxLength={100}
              placeholder="약속 제목 (예: 여름 바다 당일치기)"
              onChange={(e) => setTitle(e.target.value)}
            />
            <div className="receipt-meta">
              <div>
                <span>DATE</span>
                <span className="receipt-date-cell">
                  <span className={planDate ? '' : 'is-empty'}>{planDate ? formatFriendlyDate(planDate) : '연도-월-일'}</span>
                  <input
                    className="receipt-date-input"
                    type="date"
                    value={planDate}
                    min={today}
                    onChange={(e) => setPlanDate(e.target.value)}
                    // 투명 date 입력은 텍스트 클릭만으론 피커가 안 열림(달력 아이콘만) →
                    // 클릭 시 showPicker()로 강제로 연다(미지원/비제스처 시 무시).
                    onClick={(e) => { try { e.currentTarget.showPicker?.() } catch { /* 미지원/비제스처 */ } }}
                    aria-label="약속 날짜"
                  />
                </span>
              </div>
              <div><span>D-DAY</span><span>{ddayText}</span></div>
            </div>
            <div className="receipt-memo-label">— MEMO ————————————</div>
            <textarea
              className="receipt-memo-input"
              value={description}
              placeholder="약속 메모를 남겨보세요 (선택)"
              onChange={(e) => setDescription(e.target.value)}
            />
            <div className="receipt-barcode" />
          </div>
        </div>
        {errorMessage && <div className="schedule-modal-error" role="alert">{errorMessage}</div>}
        <div className="schedule-modal-buttons">
          <button type="button" className="btn-sub" onClick={onClose}>취소</button>
          <button type="button" className="btn-main" disabled={!canSubmit} onClick={submit}>
            {submitting ? '저장 중…' : plan ? '수정 저장' : '만들기'}
          </button>
        </div>
      </div>
    </div>
  )
}

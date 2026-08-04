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
import { ddayDiff } from '../../../lib/datetime'
import Header from '../../../components/Header/Header'
import { useConfirm } from '../../../components/ConfirmDialog/useConfirm'
import { SCHEDULE_LIGHT_PALETTE } from './palette'

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

// ── D-day 유틸(공통 lib/datetime의 ddayDiff 사용, #78/#80) ───────────
// ddayDiff는 읽을 수 없는 날짜에 null을 준다. null >= 0 은 true라서 그냥 비교하면
// 이상한 날짜가 "다가오는 약속"에 섞인다 → 아래 헬퍼로 명시적으로 걸러 쓴다.
const isUpcoming = (dateStr) => {
  const d = ddayDiff(dateStr)
  return d !== null && d >= 0
}
function calculateDday(dateStr) {
  const d = ddayDiff(dateStr)
  if (d === null) return 'D-day'
  if (d === 0) return 'D-Day'
  return d > 0 ? `D-${d}` : `D+${Math.abs(d)}`
}
function formatFriendlyDate(dateStr) {
  if (!dateStr) return '연도-월-일'
  const m = String(dateStr).match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/)
  if (!m) return '연도-월-일'
  const date = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
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
  const confirm = useConfirm()

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
      .filter((p) => isUpcoming(p.planDate))
      .sort((a, b) => ddayDiff(a.planDate) - ddayDiff(b.planDate))
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
    // 약속 등록은 XP도 준다(PLAN_CREATE, 계약 §12) — room 프리픽스 무효화로 레벨 게이지/히스토리도 갱신.
    onSuccess: (created) => {
      invalidateList(); setEditing(null); if (created?.id) setSelectedPlanId(created.id)
      queryClient.invalidateQueries({ queryKey: ['room', roomId] })
    },
  })
  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => updatePlan(id, payload),
    onSuccess: () => { invalidateList(); invalidateDetail(); setEditing(null) },
  })
  // 약속 완료는 XP도 준다(PLAN_COMPLETE, 계약 §12) — 다른 detailMutation류(취소/스킵/체크리스트)는
  // XP가 없어서 공용 헬퍼를 안 쓰고 이것만 따로 room 프리픽스 무효화를 추가한다.
  const completeMutation = useMutation({
    mutationFn: () => completePlan(effectiveId),
    onSuccess: () => { invalidateList(); invalidateDetail(); queryClient.invalidateQueries({ queryKey: ['room', roomId] }) },
  })
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
    if (density === 'upcoming') return isUpcoming(p.planDate)
    if (density === 'done') return doneCountOf(p.id) === 4
    return true
  }
  const sortByClosest = (a, b) => Math.abs(ddayDiff(a.planDate) ?? 9e9) - Math.abs(ddayDiff(b.planDate) ?? 9e9)
  const visible = items.filter(passesDensity).sort(sortByClosest)

  const counts = {
    all: items.length,
    proof: items.filter((p) => doneCountOf(p.id) < 4).length,
    upcoming: items.filter((p) => isUpcoming(p.planDate)).length,
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
            <TicketCard
              key={effectiveId}
              plan={selectedPlan}
              loading={detail.isPending}
              currentUserId={currentUserId}
              busy={detailBusy}
              onEdit={() => selectedPlan && setEditing(selectedPlan)}
              onDelete={async () => { if (await confirm('정말 이 약속을 삭제하시겠어요?', { confirmText: '삭제', variant: 'danger' })) deleteMutation.mutate() }}
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

// 약속 id·날짜로 티켓 번호/발권번호를 만든다(장식용 — 실제 데이터만 사용, 새 필드 없음).
function ticketNoOf(plan) {
  return String(plan.id ?? '').padStart(4, '0').slice(-4)
}
function ticketSerialOf(plan) {
  const [y, m, d] = String(plan.planDate ?? '').split('-')
  if (!y || !m || !d) return `SER. ----·${ticketNoOf(plan)}`
  return `SER. ${y}-${m}${d}-${ticketNoOf(plan)}`
}

// ── 약속 티켓(선택 약속) — 티켓만 상시 노출하고, 클릭해 스텁을 뜯으면
//    상세 모달(TicketDetailModal)에서 기존 메모·체크리스트·상태 전환·수정/삭제를 연다.
function TicketCard({
  plan, loading, currentUserId, busy,
  onEdit, onDelete, onComplete, onCancel, onSkip,
  onAddCheck, onToggleCheck, onDeleteCheck,
}) {
  const [torn, setTorn] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [tilt, setTilt] = useState({ rx: 0, ry: 0, mx: 50, my: 30, hover: false })

  if (loading || !plan) {
    return (
      <div className="growth-detail">
        <div className="receipt-paper"><div className="receipt-memo-empty">불러오는 중…</div></div>
      </div>
    )
  }

  const diff = ddayDiff(plan.planDate)
  const ddayText = calculateDday(plan.planDate)
  const isPast = diff !== null && diff < 0
  const ddayPhrase = diff === null
    ? '함께할 그날까지'
    : diff < 0 ? '함께 보낸 그날로부터' : diff === 0 ? '바로 오늘, 약속의 날!' : '함께할 그날까지'

  const onTiltMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width
    const py = (e.clientY - r.top) / r.height
    setTilt({ rx: -(py - 0.5) * 6, ry: (px - 0.5) * 9, mx: px * 100, my: py * 100, hover: true })
  }
  const onTiltLeave = () => setTilt((s) => ({ ...s, rx: 0, ry: 0, hover: false }))

  // 클릭 → 스텁이 뜯어지는 연출 → 살짝 뒤에 상세 모달 오픈.
  const openTicket = () => {
    if (detailOpen) return
    setTorn(true)
    window.setTimeout(() => setDetailOpen(true), 520)
  }
  const closeDetail = () => { setDetailOpen(false); setTorn(false) }

  return (
    <div className="growth-detail" style={{ '--stamp': isPast ? '#2e5233' : '#c0392b' }}>
      <div className="ticket-stage">
        <div
          className="ticket-tilt"
          style={{
            transform: `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`,
            transition: tilt.hover ? 'transform .1s linear' : 'transform .55s cubic-bezier(.2,.8,.2,1)',
          }}
        >
          <div
            className={`ticket-card${torn ? ' is-torn' : ''}`}
            role="button"
            tabIndex={0}
            title="클릭하면 약속 상세가 열립니다"
            onMouseMove={onTiltMove}
            onMouseLeave={onTiltLeave}
            onClick={openTicket}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openTicket() } }}
          >
            <div className="ticket-main">
              <div className="ticket-holo" />
              <div className="ticket-side-label"><span>ADMIT ONE · 약속 티켓</span></div>
              <div className="ticket-content">
                <div className="ticket-toprow">
                  <span className="ticket-brand">🍀 CLOV. MEMORIES</span>
                  <span className="ticket-admit">ADMIT ONE · No. {ticketNoOf(plan)}</span>
                </div>
                <div className="ticket-titlewrap">
                  <div className="ticket-title">{plan.title}</div>
                  <div className="ticket-kicker">PROMISE JOURNEY · {plan.planDate?.slice(0, 4) ?? '----'}</div>
                </div>
                <div className="ticket-meta">
                  <div><span>DATE</span><b>{formatFriendlyDate(plan.planDate)}</b></div>
                  <div><span>D-DAY</span><b>{ddayText}</b></div>
                </div>
                <div className="ticket-foot">
                  <span>NON-TRANSFERABLE · KEEP UNTIL THE DAY</span>
                  <span className="ticket-serial">{ticketSerialOf(plan)}</span>
                </div>
              </div>
            </div>
            <div className={`ticket-stub${torn ? ' is-off' : ''}`}>
              <div className="ticket-holo" />
              <span className="ticket-stub-side">KEEP THIS STUB</span>
              <div className="ticket-stub-mid">
                <span className="ticket-stub-kicker">{ddayPhrase}</span>
                <span className="ticket-stub-dday">{ddayText}</span>
                <div className="ticket-stub-barcode" />
                <span className="ticket-stub-no">{ticketNoOf(plan)}</span>
              </div>
            </div>
            <div className="ticket-glare" style={{ opacity: tilt.hover ? 1 : 0, background: `radial-gradient(360px circle at ${tilt.mx}% ${tilt.my}%, rgba(255,248,224,.16), rgba(255,248,224,0) 62%)` }} />
          </div>
        </div>
        <div className="ticket-hint"><span className="ticket-hint-dot" />티켓을 클릭하면 약속 상세가 열립니다</div>
      </div>

      {detailOpen && (
        <TicketDetailModal
          plan={plan}
          currentUserId={currentUserId}
          busy={busy}
          onClose={closeDetail}
          onEdit={() => { closeDetail(); onEdit() }}
          onDelete={onDelete}
          onComplete={onComplete}
          onCancel={onCancel}
          onSkip={onSkip}
          onAddCheck={onAddCheck}
          onToggleCheck={onToggleCheck}
          onDeleteCheck={onDeleteCheck}
        />
      )}
    </div>
  )
}

// ── 티켓 상세 모달 — 기존 영수증의 메모·체크리스트·상태 전환·수정/삭제를 그대로 담는다.
function TicketDetailModal({
  plan, currentUserId, busy, onClose,
  onEdit, onDelete, onComplete, onCancel, onSkip,
  onAddCheck, onToggleCheck, onDeleteCheck,
}) {
  const [checkItem, setCheckItem] = useState('')
  const ddayText = calculateDday(plan.planDate)
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
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box ticket-detail" onClick={(e) => e.stopPropagation()}>
        <div className="receipt-paper">
          <div className="receipt-zigzag" />
          <div className="ticket-detail-head">
            <h3>{plan.title}</h3>
            <span>{formatFriendlyDate(plan.planDate)} · {ddayText}</span>
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
        <button type="button" className="ticket-detail-close" onClick={onClose} aria-label="닫기">✕</button>
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
// 우정공간(대시보드)에서도 재사용 → export. 대시보드는 <div className="proto-schedule"
// style={SCHEDULE_LIGHT_PALETTE}>로 감싸 스코프·팔레트를 공급한다.
export function ScheduleEditorModal({ plan, submitting, errorMessage, onClose, onSubmit }) {
  const [title, setTitle] = useState(plan?.title ?? '')
  const [planDate, setPlanDate] = useState(plan?.planDate ?? '')
  const [description, setDescription] = useState(plan?.description ?? '')

  const today = (() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })()
  const ddayText = calculateDday(planDate)

  const canSubmit = title.trim() && planDate && !submitting
  const submit = () => {
    if (!canSubmit) return
    onSubmit({ title: title.trim(), planDate, description: description.trim() || null })
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box schedule-editor" onClick={(e) => e.stopPropagation()}>
        <div className="growth-detail">
          <div className="ticket-card ticket-card--edit">
            <div className="ticket-main">
              <div className="ticket-holo" />
              <div className="ticket-side-label"><span>ADMIT ONE · 약속 티켓</span></div>
              <div className="ticket-content">
                <div className="ticket-toprow">
                  <span className="ticket-brand">🍀 CLOV. MEMORIES</span>
                  <span className="ticket-admit">{plan ? '약속 수정하기' : '새 D-day 만들기'}</span>
                </div>
                <input
                  className="ticket-title-input"
                  value={title}
                  maxLength={100}
                  placeholder="약속 제목"
                  onChange={(e) => setTitle(e.target.value)}
                />
                <div className="ticket-meta">
                  <div>
                    <span>DATE</span>
                    <b className="ticket-date-cell">
                      <span className={planDate ? '' : 'is-empty'}>{planDate ? formatFriendlyDate(planDate) : '연도-월-일'}</span>
                      <input
                        className="ticket-date-input"
                        type="date"
                        value={planDate}
                        min={today}
                        onChange={(e) => setPlanDate(e.target.value)}
                        // 투명 date 입력은 텍스트 클릭만으론 피커가 안 열림(달력 아이콘만) →
                        // 클릭 시 showPicker()로 강제로 연다(미지원/비제스처 시 무시).
                        onClick={(e) => { try { e.currentTarget.showPicker?.() } catch { /* 미지원/비제스처 */ } }}
                        aria-label="약속 날짜"
                      />
                    </b>
                  </div>
                  <div><span>D-DAY</span><b>{ddayText}</b></div>
                </div>
              </div>
            </div>
          </div>

          <div className="receipt-paper ticket-slip">
            <div className="receipt-zigzag" />
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

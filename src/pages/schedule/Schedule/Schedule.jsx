import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import './schedule.proto.css'
import {
  getPlans, getPlan, createPlan, updatePlan, deletePlan,
  completePlan, cancelPlan,
  getStagePhotos, presignStagePhoto, commitStagePhoto,
} from '../../../api/plan'
import { getRoomMembers } from '../../../api/room'
import { uploadImage } from '../../../lib/uploadImage'
import { useAuthStore } from '../../../stores/authStore'
import { currentUserIdFromToken } from '../../../lib/jwt'
import { ddayDiff, nextBirthdayDate } from '../../../lib/datetime'
import { useTicketTilt } from '../../../hooks/useTicketTilt'
import Header from '../../../components/Header/Header'
import Button from '../../../components/Button/Button'
import Mascot from '../../../components/Mascot/Mascot'
import { useConfirm } from '../../../components/ConfirmDialog/useConfirm'
import { SCHEDULE_LIGHT_PALETTE } from './palette'
// 인생4컷 4단계(계약 §9, 순서·잠김·상태는 서버 계산). 라벨은 프로토타입 필름스트립과 동일.
const STAGES = [
  { key: 'PROPOSAL', number: 1, name: '제안하기' },
  { key: 'SCHEDULING', number: 2, name: '일정 맞추기' },
  { key: 'CONFIRMED', number: 3, name: '약속 확정' },
  { key: 'MEETING', number: 4, name: '만남' },
]
// 생일을 며칠 전부터 띄우나(#376). 대시보드 D-day 칸과 같은 값이어야 한다 —
// 한쪽만 바꾸면 대시보드엔 뜨는데 일정계획엔 없는 날이 생긴다.
const BIRTHDAY_LEAD_DAYS = 7
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
  const navigate = useNavigate()
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

  /* 다가오는 생일(#376) — clov-api#143 에서 "Plan 행으로 저장하지 않는다"로 정해졌다.
     ⚠️⚠️ items 에 절대 섞지 않는다. items 는 아래를 전부 물고 있다:
        stageQueries   카드마다 GET /plans/{id}/stage-photos → 가짜 id 로 호출이 나간다
        closestId      GET /plans/{planId} 상세             → 404
        counts         전체/인증가능/다가오는/완료 개수       → 숫자가 틀어진다
        TicketCard     수정·삭제·완료·취소                   → 생일엔 의미가 없다
     그래서 별도 배열로 두고 레일 위에 읽기 전용 줄로만 그린다.
     ★ ACTIVE 멤버만 본다 — 나간 사람 생일이 뜨면 안 된다(대시보드 생일 배너와 같은 규칙). */
  const members = useQuery({
    queryKey: ['room', roomId, 'members'],   // 대시보드와 같은 키 — 거기서 왔으면 캐시가 그대로 쓰인다
    queryFn: () => getRoomMembers(roomId),
  })
  /* ★ 사람마다 한 장이다. 같은 날 생일이어도 각자의 티켓을 갖는다 — 세로로 쌓는 대신
     가로 슬라이드로 넘겨 본다(아래 .birthday-rail). 날짜로 묶어 한 장에 몰아넣었던
     적이 있는데, 리더가 "개인 티켓으로 가고 옆 슬라이드로" 를 골라 되돌렸다.
     ⚠️ 그래서 번호를 날짜가 아니라 **멤버 id** 로 만든다. 날짜로 만들면 같은 날
        생일인 두 사람의 No.·SER. 가 완전히 똑같은 쌍둥이가 된다(실제로 그랬다).
        약속 티켓이 plan.id 를 쓰는 것과 같은 방식이다. */
  const birthdays = (members.data?.items ?? [])
    .filter((m) => m.status === 'ACTIVE')
    .map((m) => ({ m, date: nextBirthdayDate(m.birthMonthDay) }))   // 생일 미입력·탈퇴 → null
    .map(({ m, date }) => ({ m, date, d: ddayDiff(date) }))
    .filter(({ d }) => d !== null && d >= 0 && d <= BIRTHDAY_LEAD_DAYS)
    .sort((a, b) => a.d - b.d || String(a.m.nickname).localeCompare(String(b.m.nickname)))

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
  // 약속 완료는 XP도 준다(PLAN_COMPLETE, 계약 §12) — 다른 detailMutation류(취소)는
  // XP가 없어서 공용 헬퍼를 안 쓰고 이것만 따로 room 프리픽스 무효화를 추가한다.
  // 완료 직후 바로 피드 글쓰기로 보내 그 자리에서 추억을 남기게 한다 — "나중에 후보에서
  // 골라 쓰기"였던 예전 흐름 대신, 완료 시점에 바로 연결(사용자 결정, #237 후속).
  const completeMutation = useMutation({
    mutationFn: () => completePlan(effectiveId),
    onSuccess: () => {
      invalidateList(); invalidateDetail(); queryClient.invalidateQueries({ queryKey: ['room', roomId] })
      navigate(`/rooms/${roomId}/feed`, { state: { linkPlanId: effectiveId } })
    },
  })
  const cancelMutation = useMutation(detailMutation(() => cancelPlan(effectiveId)))
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
    completeMutation.isPending || cancelMutation.isPending || deleteMutation.isPending

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

  /* ── 약속 티켓 슬라이드(#381) ────────────────────────────────────────
     티켓 ↔ 아래 필름스트립 레일이 같은 선택을 가리켜야 한다. 양방향으로 맞춘다. */
  const planTicketRailRef = useRef(null)
  const planRailReadyRef = useRef(false)
  // 스크롤이 만든 선택 변경("메아리")을 기억한다. 이걸 ②가 다시 스크롤로 되받으면
  // 둘이 서로 밀어대며 진동한다 — 실제로 연속 클릭이 씹혔다(586 → 588).
  const scrollEchoRef = useRef(null)

  const scrollPlanTicketRail = (dir) => {
    const vp = planTicketRailRef.current
    if (!vp) return
    const first = vp.querySelector('.plan-ticket-wrap')
    const gap = parseFloat(getComputedStyle(vp.firstElementChild).columnGap) || 0
    vp.scrollBy({ left: dir * (first ? first.getBoundingClientRect().width + gap : vp.clientWidth), behavior: 'smooth' })
  }

  // ① 스크롤이 멎으면 가운데 티켓을 선택으로 올린다.
  //    ★ setTimeout 안에서 setState 한다 — 스크롤마다 갱신하면 렌더가 폭주하고,
  //      effect 본문 동기 setState 도 아니게 된다(react-hooks/set-state-in-effect).
  useEffect(() => {
    const vp = planTicketRailRef.current
    if (!vp) return
    let timer
    const onScroll = () => {
      clearTimeout(timer)
      timer = setTimeout(() => {
        const vr = vp.getBoundingClientRect()
        const mid = vr.left + vr.width / 2
        let bestId = null
        let bestDist = Infinity
        vp.querySelectorAll('[data-plan-id]').forEach((el) => {
          const r = el.getBoundingClientRect()
          const dist = Math.abs((r.left + r.width / 2) - mid)
          if (dist < bestDist) { bestDist = dist; bestId = el.dataset.planId }
        })
        if (bestId) { scrollEchoRef.current = bestId; setSelectedPlanId(bestId) }
      }, 140)
    }
    vp.addEventListener('scroll', onScroll, { passive: true })
    return () => { vp.removeEventListener('scroll', onScroll); clearTimeout(timer) }
    // ⚠️ deps 를 []로 두면 안 된다. 첫 마운트엔 plans 가 아직 안 와서 items 가 비고,
    //    그러면 이 레일 자체가 렌더되지 않아 ref 가 null 이라 리스너가 안 붙는다.
    //    그 뒤로 다시 붙을 기회가 없어 슬라이드가 선택을 못 바꾼다(실제로 그랬다).
  }, [items.length])

  // ② 선택이 바뀌면 그 티켓을 가운데로 민다(아래 레일에서 골랐을 때).
  //    ⚠️ 이미 가운데면 아무것도 안 한다 — 안 그러면 ①과 서로 밀어대며 진동한다.
  //    첫 렌더만 애니메이션 없이 자리를 잡는다(들어오자마자 미끄러지면 산만하다).
  useEffect(() => {
    if (!effectiveId) return
    // 스크롤이 만든 변경이면 되받지 않는다(위 scrollEchoRef 설명).
    if (scrollEchoRef.current != null && String(effectiveId) === scrollEchoRef.current) {
      scrollEchoRef.current = null
      planRailReadyRef.current = true
      return
    }
    scrollEchoRef.current = null
    // ⚠️ rAF 로 한 프레임 미룬다. 목록이 막 붙은 직후엔 폭이 아직 0이라 그 자리에서
    //    재면 offset 이 엉뚱하게 나와 첫 티켓에 머무른다(실제로 그랬다).
    const raf = requestAnimationFrame(() => {
      const vp = planTicketRailRef.current
      if (!vp) return
      const el = vp.querySelector(`[data-plan-id="${CSS.escape(String(effectiveId))}"]`)
      if (!el) return
      const vr = vp.getBoundingClientRect()
      const r = el.getBoundingClientRect()
      if (!vr.width || !r.width) return
      const offset = (r.left + r.width / 2) - (vr.left + vr.width / 2)
      if (Math.abs(offset) >= 8) {
        vp.scrollBy({ left: offset, behavior: planRailReadyRef.current ? 'smooth' : 'auto' })
      }
      planRailReadyRef.current = true
    })
    return () => cancelAnimationFrame(raf)
  }, [effectiveId, visible.length, density])

  // 생일 티켓 슬라이드(#381).
  // ★ 뷰포트 폭이 아니라 **티켓 한 장 + 간격**만큼 넘긴다. 다음 장을 살짝 보여주려고
  //   티켓을 뷰포트보다 좁게 뒀기 때문에(엿보기), 뷰포트 폭으로 넘기면 한 장을 넘어간다.
  const bdayRailRef = useRef(null)
  const scrollBdayRail = (dir) => {
    const vp = bdayRailRef.current
    if (!vp) return
    const first = vp.querySelector('.birthday-ticket-wrap')
    const gap = parseFloat(getComputedStyle(vp.firstElementChild).columnGap) || 0
    const step = first ? first.getBoundingClientRect().width + gap : vp.clientWidth
    vp.scrollBy({ left: dir * step, behavior: 'smooth' })
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
      <Mascot roomId={roomId} />

      <div className="schedule-wrap">
        <div className="section-title journey-section-title">
          <div className="section-actions">
            <Button variant="dashed" size="sm" onClick={() => setEditing('new')}>+ 새 D-day 만들기</Button>
          </div>
        </div>

        {/* 다가오는 생일 — 약속 목록과 완전히 분리된 읽기 전용 황금 티켓이다(#381).
            ★ 약속이 하나도 없어도 뜬다. 생일은 약속의 부속물이 아니라 그냥 돌아오는 날이라,
              "약속이 없으니 생일도 숨긴다"가 되면 안 된다. 그래서 plans 상태 밖에 둔다.
            ★ 원래 알약(chip)이었는데 티켓으로 바꿨다 — 리더가 "상단에 표시가 나오는" 것 말고
              티켓 자체가 금색으로 서기를 원했다. 생일이 다른 날과 다르게 보이는 게 목적이다. */}
        {birthdays.length > 0 && (
          <>
            {/* ★ 개수를 적는 게 핵심이다. "다가오는 생일"만 적으면 한 장만 보이는 게
                이상하다는 걸 모른다 — 숫자가 있어야 "3명인데 왜 하나만 보이지"가 되고,
                그게 슬라이드를 찾게 만든다(화살표보다 강한 신호다).
                ⚠️ "이번 달"이 아니라 7일 이내다(BIRTHDAY_LEAD_DAYS). 문구를 "이번 달"로
                   달면 없는 사람을 찾게 만든다. */}
            <div className="birthday-label">
              <i className="ti ti-cake" aria-hidden="true" />
              <span>다가오는 생일</span>
              {birthdays.length > 1 && <b>{birthdays.length}명</b>}
            </div>

            <div className={`birthday-rail${birthdays.length > 1 ? ' is-multi' : ''}`}>
              {/* 화살표는 두 장 이상일 때만. 한 장뿐인데 넘길 곳이 있는 것처럼 보이면 안 된다.
                  ★ 스와이프만 두지 않는 이유: 마우스·키보드 사용자에게 스와이프는 존재하지
                    않는 조작이다. 이건 트렌드가 아니라 접근성이라 없애면 안 된다. */}
              {birthdays.length > 1 && (
                <button type="button" className="carousel-btn" aria-label="이전 생일 보기" onClick={() => scrollBdayRail(-1)}>‹</button>
              )}
              <div className="birthday-viewport" ref={bdayRailRef}>
                <div className="birthday-list">
                  {birthdays.map(({ m, date, d }) => (
                    <BirthdayTicket key={m.userId} name={m.nickname} userId={m.userId} planDate={date} dday={d} />
                  ))}
                </div>
              </div>
              {birthdays.length > 1 && (
                <button type="button" className="carousel-btn" aria-label="다음 생일 보기" onClick={() => scrollBdayRail(1)}>›</button>
              )}
            </div>
          </>
        )}

        {plans.isPending && <div className="schedule-state">불러오는 중…</div>}
        {plans.isError && <div className="schedule-state">약속을 불러오지 못했습니다. {plans.error?.message}</div>}
        {plans.isSuccess && items.length === 0 && (
          <div className="schedule-state">
            아직 함께 세어볼 D-day가 없어요.<br />상단의 ‘새 D-day 만들기’로 첫 약속을 만들어보세요!
          </div>
        )}

        {items.length > 0 && (
          <section className="growth-shell">
            {/* 약속 티켓도 슬라이드로(#381) — 생일 티켓과 같은 구조다.
                ★ 티켓이 선택을 주도하고 아래 필름스트립 레일이 따라온다. 같은 목록을
                  둘이 따로 고르면 어느 쪽이 진실인지 알 수 없어진다. 스크롤이 멎으면
                  가운데 티켓이 선택되고, 레일에서 고르면 티켓이 그리로 미끄러진다. */}
            <div className={`plan-ticket-rail${visible.length > 1 ? ' is-multi' : ''}`}>
              {visible.length > 1 && (
                <button type="button" className="carousel-btn" aria-label="이전 약속 티켓" onClick={() => scrollPlanTicketRail(-1)}>‹</button>
              )}
              <div className="plan-ticket-viewport" ref={planTicketRailRef}>
                <div className="plan-ticket-list">
                  {visible.map((p) => (
                    <TicketCard
                      key={p.id}
                      plan={p}
                      /* 상세(설명·체크리스트)는 요약 응답에 없다. 지금 선택된 티켓에만
                         내려보내고, 모달은 그게 도착해야 연다. */
                      detailPlan={p.id === effectiveId ? detail.data : null}
                      currentUserId={currentUserId}
                      busy={detailBusy}
                      onSelect={() => setSelectedPlanId(p.id)}
                      onEdit={() => selectedPlan && setEditing(selectedPlan)}
                      onDelete={async () => { if (await confirm('정말 이 약속을 삭제하시겠어요?', { confirmText: '삭제', variant: 'danger' })) deleteMutation.mutate() }}
                      onComplete={() => completeMutation.mutate()}
                      onCancel={() => cancelMutation.mutate()}
                    />
                  ))}
                </div>
              </div>
              {visible.length > 1 && (
                <button type="button" className="carousel-btn" aria-label="다음 약속 티켓" onClick={() => scrollPlanTicketRail(1)}>›</button>
              )}
            </div>

            <div className="growth-hero">
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

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']
const toDateKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
// 6주(42칸) 그리드 — 월 경계는 Date 생성자가 알아서 이월/이전달로 정규화해준다.
function buildMonthGrid(year, month) {
  const first = new Date(year, month, 1)
  const gridStart = new Date(year, month, 1 - first.getDay())
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart)
    d.setDate(gridStart.getDate() + i)
    return d
  })
}

// ── 티켓 톤 커스텀 달력(브라우저 기본 date picker 대체) ──────────────
function TicketDatePicker({ value, onChange, min }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const [view, setView] = useState(() => {
    const [y, m] = (value || min || toDateKey(new Date())).split('-').map(Number)
    return { y, m: m - 1 }
  })
  const triggerRef = useRef(null)
  const panelRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e) => {
      if (panelRef.current?.contains(e.target) || triggerRef.current?.contains(e.target)) return
      setOpen(false)
    }
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const openPanel = () => {
    const [y, m] = (value || min || toDateKey(new Date())).split('-').map(Number)
    setView({ y, m: m - 1 })
    const r = triggerRef.current.getBoundingClientRect()
    setPos({ top: r.bottom + 8, left: r.left })
    setOpen(true)
  }
  const shiftMonth = (delta) => setView((v) => {
    const d = new Date(v.y, v.m + delta, 1)
    return { y: d.getFullYear(), m: d.getMonth() }
  })
  const pick = (d) => {
    const key = toDateKey(d)
    if (min && key < min) return
    onChange(key)
    setOpen(false)
  }

  const todayKey = toDateKey(new Date())
  const cells = buildMonthGrid(view.y, view.m)

  return (
    <>
      <button type="button" ref={triggerRef} className="ticket-date-trigger" onClick={openPanel}>
        <span className={value ? '' : 'is-empty'}>{value ? formatFriendlyDate(value) : '연도-월-일'}</span>
      </button>
      {open && createPortal(
        // document.body에 포탈 — 모달의 backdrop-filter/애니메이션 transform이
        // position:fixed 자손의 컨테이닝 블록이 되어버려 좌표가 어긋나는 걸 원천 차단한다.
        <div className="ticket-cal" ref={panelRef} style={{ top: pos.top, left: pos.left }} role="dialog" aria-label="날짜 선택">
          <div className="ticket-cal-head">
            <button type="button" aria-label="이전 달" onClick={() => shiftMonth(-1)}>‹</button>
            <span className="ticket-cal-title">{view.y}년 {view.m + 1}월</span>
            <button type="button" aria-label="다음 달" onClick={() => shiftMonth(1)}>›</button>
          </div>
          <div className="ticket-cal-week">
            {WEEKDAYS.map((w, i) => (
              <span key={w} className={i === 0 ? 'is-sun' : i === 6 ? 'is-sat' : ''}>{w}</span>
            ))}
          </div>
          <div className="ticket-cal-grid">
            {cells.map((d) => {
              const key = toDateKey(d)
              const disabled = Boolean(min) && key < min
              const cls = [
                d.getMonth() !== view.m && 'is-muted',
                disabled && 'is-disabled',
                key === todayKey && 'is-today',
                key === value && 'is-selected',
              ].filter(Boolean).join(' ')
              return (
                <button type="button" key={key} className={cls} disabled={disabled} onClick={() => pick(d)}>
                  {d.getDate()}
                </button>
              )
            })}
          </div>
          <div className="ticket-cal-foot">
            <button type="button" className="ticket-cal-today" onClick={() => pick(new Date())}>오늘</button>
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}

// ── 약속 티켓(선택 약속) — 티켓만 상시 노출하고, 클릭해 스텁을 뜯으면
//    상세 모달(TicketDetailModal)에서 기존 메모·상태 전환·수정/삭제를 연다.
/* =====================================================================
   생일 황금 티켓 (#381) — 다가오는 생일을 티켓 모양으로 세운다.

   ★ 읽기 전용이다. 클릭·기울임·스텁 뜯기가 전부 없다 — 이건 저장된 약속이 아니라
     멤버의 birthMonthDay 에서 파생한 표시다(clov-api#143 결정). 상세로 열 것도,
     완료할 것도, 인증할 것도 없어서 누를 수 있게 만들면 눌러보고 헛수고를 한다.

   ★ TicketCard 와 같은 마크업을 쓴다(같은 CSS 를 그대로 물려받는다). 다른 건 색뿐이고,
     그 색은 --stamp 하나만 바꾸면 따라온다 — 이 화면은 --stamp 를 축으로 제목·D-DAY
     강조색을 파생시키게 설계돼 있다(schedule.proto.css 의 --ticket-accent).

   ⚠️ items(=GET /plans)에 절대 안 들어간다. 거기 넣으면 stage-photos 를 없는 id 로
      호출하고 필터 개수(전체/인증 가능/…)가 틀어진다.
   ===================================================================== */
function BirthdayTicket({ name, userId, planDate, dday }) {
  const tilt = useTicketTilt()
  const ddayText = dday === 0 ? 'D-Day' : `D-${dday}`
  const year = planDate?.slice(0, 4) ?? '----'
  // ⚠️ 멤버 id 로 만든다. 날짜로 만들면 같은 날 생일인 두 사람이 같은 번호를 갖는다.
  //    약속 티켓의 ticketNoOf(plan.id) 와 같은 방식이다.
  const no = String(userId ?? '').padStart(4, '0').slice(-4)
  const mmdd = (planDate ?? '').slice(5).replace('-', '') || '0000'

  return (
    <div className="growth-detail birthday-ticket-wrap" style={{ '--stamp': '#c9922b' }}>
      <div className="ticket-stage">
        {/* 3D 기울임 — 약속 티켓과 같은 훅을 쓴다(#381). 두 티켓이 같은 손맛이어야 한다.
            ★ 기울임은 "만질 수 있다"지 "누르면 열린다"가 아니다. 여전히 role·tabIndex·
              onClick 이 없고 cursor 도 default 다 — 이건 읽기 전용 티켓이다. */}
        <div className="ticket-tilt" style={tilt.tiltStyle}>
          <div className="ticket-card ticket-card--birthday" {...tilt.handlers}>
            <div className="ticket-main">
              <div className="ticket-holo" />
              <div className="ticket-content">
                <div className="ticket-toprow">
                  <span className="ticket-brand"><i className="ti ti-cake" aria-hidden="true" /> CLOV. BIRTHDAY</span>
                  <span className="ticket-admit">HAPPY DAY · No. {no}</span>
                </div>
                <div className="ticket-titlewrap">
                  <div className="ticket-title ticket-title--highlight">{name}님의 생일</div>
                  <div className="ticket-kicker">BIRTHDAY · {year}</div>
                </div>
                <div className="ticket-meta">
                  <div><span>DATE</span><b>{formatFriendlyDate(planDate)}</b></div>
                  {/* 약속 티켓은 여기가 "스텁을 뜯어보세요"다. 뜯을 게 없으니 날짜를 바로 쓴다. */}
                  <div><span>D-DAY</span><b>{ddayText}</b></div>
                </div>
                <div className="ticket-foot">
                  <span className="ticket-bday-tagline">ONE DAY A YEAR · CELEBRATE TOGETHER</span>
                  <span className="ticket-serial">SER. {year}-{mmdd}-{no}</span>
                </div>
              </div>
            </div>
            {/* 스텁은 붙어 있다(is-off 없음) — 뜯는 연출이 없다. */}
            <div className="ticket-stub">
              <span className="ticket-stub-side">KEEP THIS STUB</span>
              <div className="ticket-stub-mid">
                <span className="ticket-stub-kicker">{dday === 0 ? '오늘이 그날이에요' : '생일까지'}</span>
                <span className="ticket-stub-dday">{ddayText}</span>
                <div className="ticket-stub-barcode" />
                <span className="ticket-stub-no">{no}</span>
              </div>
            </div>
            <div className="ticket-glare" style={tilt.glareStyle} />
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * plan        목록 요약(PlanSummary) — 티켓 앞면은 이것만으로 그린다.
 * detailPlan  상세(설명·체크리스트). 요약에 없는 값이라 모달은 이게 와야 연다.
 *             선택된 티켓에만 내려온다.
 */
function TicketCard({
  plan, detailPlan, currentUserId, busy,
  onSelect, onEdit, onDelete, onComplete, onCancel,
}) {
  const [torn, setTorn] = useState(false)
  // 뜯었다가(is-off) 닫을 때만 "다시 붙는" 연출(clovTearBack)을 재생하기 위한 임시 플래그.
  // torn 하나로만 판단하면 컴포넌트가 새로 마운트될 때(이 화면에 처음 들어올 때)도
  // torn=false인 기본 상태로 렌더되면서 같은 CSS 애니메이션이 다시 걸려버린다.
  const [reattaching, setReattaching] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  // 생일 티켓과 같은 훅을 쓴다(#381) — 원래 여기 인라인으로 있던 걸 뺐다.
  const tilt = useTicketTilt()

  // 앞면은 목록 요약만으로 그린다 — 상세를 기다릴 이유가 없다(예전엔 여기서
  // "불러오는 중…"을 띄웠는데, 이제 티켓이 여러 장이라 그 자리가 없다).
  const diff = ddayDiff(plan.planDate)
  const ddayText = calculateDday(plan.planDate)
  const isPast = diff !== null && diff < 0
  const ddayPhrase = diff === null
    ? '함께할 그날까지'
    : diff < 0 ? '함께 보낸 그날로부터' : diff === 0 ? '바로 오늘, 약속의 날!' : '함께할 그날까지'

  // 클릭 → 스텁이 뜯어지는 연출 → 살짝 뒤에 상세 모달 오픈.
  const openTicket = () => {
    if (detailOpen) return
    // 먼저 선택으로 올린다 — 가운데가 아닌(엿보이는) 티켓을 눌렀을 수도 있고,
    // 그래야 상세 조회가 이 티켓 걸로 시작된다.
    onSelect?.()
    setTorn(true)
    window.setTimeout(() => setDetailOpen(true), 340)
  }
  const closeDetail = () => {
    setDetailOpen(false)
    setTorn(false)
    setReattaching(true)
    window.setTimeout(() => setReattaching(false), 220) // clovTearBack 재생 시간과 동일
  }

  return (
    <div className="growth-detail plan-ticket-wrap" data-plan-id={plan.id} style={{ '--stamp': isPast ? '#2e5233' : '#c0392b' }}>
      <div className="ticket-stage">
        <div className="ticket-tilt" style={tilt.tiltStyle}>
          <div
            className={`ticket-card${torn ? ' is-torn' : ''}`}
            role="button"
            tabIndex={0}
            title="클릭하면 약속 상세가 열립니다"
            {...tilt.handlers}
            onClick={openTicket}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openTicket() } }}
          >
            <div className="ticket-main">
              <div className="ticket-holo" />
              <div className="ticket-content">
                <div className="ticket-toprow">
                  <span className="ticket-brand"><i className="ti ti-clover-filled" aria-hidden="true" /> CLOV. MEMORIES</span>
                  <span className="ticket-admit">ADMIT ONE · No. {ticketNoOf(plan)}</span>
                </div>
                <div className="ticket-titlewrap">
                  <div className="ticket-title ticket-title--highlight">{plan.title}</div>
                  <div className="ticket-kicker">PROMISE JOURNEY · {plan.planDate?.slice(0, 4) ?? '----'}</div>
                </div>
                <div className="ticket-meta">
                  <div><span>DATE</span><b>{formatFriendlyDate(plan.planDate)}</b></div>
                  <div><span>D-DAY</span><b className="ticket-meta-teaser">스텁을 뜯어보세요</b></div>
                </div>
                <div className="ticket-foot">
                  <span>NON-TRANSFERABLE · KEEP UNTIL THE DAY</span>
                  <span className="ticket-serial">{ticketSerialOf(plan)}</span>
                </div>
              </div>
            </div>
            <div className={`ticket-stub${torn ? ' is-off' : ''}${reattaching ? ' is-back' : ''}`}>
              <span className="ticket-stub-side">KEEP THIS STUB</span>
              <div className="ticket-stub-mid">
                <span className="ticket-stub-kicker">{ddayPhrase}</span>
                <span className="ticket-stub-dday">{ddayText}</span>
                <div className="ticket-stub-barcode" />
                <span className="ticket-stub-no">{ticketNoOf(plan)}</span>
              </div>
            </div>
            <div className="ticket-glare" style={tilt.glareStyle} />
          </div>
        </div>
      </div>

      {/* detailPlan 이 와야 연다 — 설명·작성자는 목록 요약에 없어서, 요약으로 열면
          메모가 빈 것처럼 보이고 수정·삭제 권한 판정도 틀린다. */}
      {detailOpen && detailPlan && (
        <TicketDetailModal
          plan={detailPlan}
          currentUserId={currentUserId}
          busy={busy}
          onClose={closeDetail}
          onEdit={() => { closeDetail(); onEdit() }}
          onDelete={onDelete}
          onComplete={onComplete}
          onCancel={onCancel}
        />
      )}
    </div>
  )
}

// ── 티켓 상세 모달 — 기존 영수증의 메모·상태 전환·수정/삭제를 그대로 담는다.
function TicketDetailModal({
  plan, currentUserId, busy, onClose,
  onEdit, onDelete, onComplete, onCancel,
}) {
  const ddayText = calculateDday(plan.planDate)
  const isWriter = String(plan.writer?.id) === String(currentUserId)
  const memoEmpty = !plan.description

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box ticket-detail" onClick={(e) => e.stopPropagation()}>
        <div className="receipt-paper">
          <div className="ticket-detail-brandrow">
            <span className="ticket-brand"><i className="ti ti-clover-filled" aria-hidden="true" /> CLOV. MEMORIES</span>
            <span className="ticket-detail-stub-tag">STUB · No. {ticketNoOf(plan)}</span>
          </div>
          <div className="ticket-detail-head">
            <h3>{plan.title}</h3>
            <span>{formatFriendlyDate(plan.planDate)} · {ddayText}</span>
          </div>
          <div className="receipt-memo">
            {plan.description && <p className="receipt-memo-desc">{plan.description}</p>}
            {memoEmpty && <div className="receipt-memo-empty">✎ 아직 남긴 메모가 없어요</div>}
          </div>

          <div className="receipt-barcode" />

          <div className="receipt-status">
            {plan.status === 'SCHEDULED' && (
              <button type="button" className="receipt-status-btn is-primary" disabled={busy} onClick={onComplete}>약속 완료</button>
            )}
            {plan.status === 'SCHEDULED' && isWriter && (
              <button type="button" className="receipt-status-btn" disabled={busy} onClick={onCancel}>약속 취소</button>
            )}
            {plan.status === 'CANCELED' && <span className="receipt-check-text is-done">취소된 약속</span>}
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
        <span className="strip-footer-count">{isComplete ? '인생4컷 완성' : `${doneCount}/4 업로드`}</span>
      </div>
    </article>
  )
}

// ── 새/수정 영수증 모달 ─────────────────────────────────────────────
// 우정공간(대시보드)에서도 재사용 → export. 대시보드는 <div className="proto-schedule"
// style={{ ...SCHEDULE_LIGHT_PALETTE, ...SCHEDULE_MODAL_CARD_STYLE }}>로 감싸 스코프·
// 팔레트·카드 배경을 공급한다(페이지 팔레트엔 배경이 없다 — #318).
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
              <div className="ticket-content">
                <div className="ticket-toprow">
                  <span className="ticket-brand"><i className="ti ti-clover-filled" aria-hidden="true" /> CLOV. MEMORIES</span>
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
                    <TicketDatePicker value={planDate} onChange={setPlanDate} min={today} />
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
            {submitting ? '저장 중…' : plan ? '수정' : '만들기'}
          </button>
        </div>
      </div>
    </div>
  )
}

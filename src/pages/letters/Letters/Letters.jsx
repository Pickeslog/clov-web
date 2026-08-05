import { useLayoutEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import './letters.proto.css'
import { getLetters, markRead, sendLetter, toggleFavorite } from '../../../api/letter'
import { getRoomMembers } from '../../../api/room'
import { getPreferences } from '../../../api/user'
import Header from '../../../components/Header/Header'
import Mascot from '../../../components/Mascot/Mascot'
import Button from '../../../components/Button/Button'

const AVATAR_COLORS = ['#40916c', '#52b788', '#74c69d', '#95d5b2', '#2d6a4f']
// 편지 화면 라이트 팔레트(인라인 CSS 변수) — <main>에 부여해 모든 하위가 상속.
// letters.proto.css의 @scope 팔레트가 사용자 환경에서 반영 안 되는 이슈를 우회하는 확정 처리.
const LETTERS_LIGHT_PALETTE = {
  colorScheme: 'light',
  '--primary-green': '#1b4332',
  '--accent-green': '#52b788',
  '--title-color': '#1b4332',
  '--card-bg': '#ffffff',
  '--bg-light': '#f7f8f5',
  '--text-color': '#2c3e35',
  '--text-muted': '#61766a',
  '--border-color': '#eadfd0',
  '--input-border': '#e2e8e4',
  '--nav-item-bg-active': '#edf4ec',
  '--btn-primary-bg': '#1b4332',
  '--button-text': '#ffffff',
  '--shadow-color': 'rgba(8, 28, 22, 0.12)',
}
// 편지 내용 텍스트영역 — 프로토타입(.modal-form-group textarea + .letter-write-textarea) 값 그대로.
// 프로덕션에 프로토타입 전역 입력 스타일이 미이식이라 인라인으로 정확히 맞춘다.
const LETTER_TEXTAREA_STYLE = {
  colorScheme: 'light',
  width: '100%',
  height: '190px',
  padding: '14px 16px',
  background: '#ffffff',
  color: '#2c3e35',
  border: '1px solid #d8ebd2',
  borderRadius: '8px',
  fontSize: '13px',
  lineHeight: 1.7,
  fontFamily: 'inherit',
  resize: 'none',
  outline: 'none',
  boxSizing: 'border-box',
}
const LETTERS_PER_PAGE = 3
const EMPTY_MESSAGES = [
  <>마음은 먼저 건네는 사람에게 가장 크게 남는대요.<br />오늘, 그 마음을 편지에 담아볼까요?</>,
  <>누군가에게 전한 진심은 절대 사라지지 않아요.<br />지금 이 순간, 첫 편지를 띄워보세요.</>,
]

const initialOf = (name) => (name || '?').trim().slice(0, 1)
// 탭(전체/즐겨찾기/보낸편지) → 서버 box + 즐겨찾기 필터로 환산.
const boxOfTab = (tab) => (tab === 'sent' ? 'sent' : 'received')

export default function Letters() {
  const { roomId } = useParams()
  const queryClient = useQueryClient()
  const [tab, setTab] = useState('all') // all | favorite | sent
  const [page, setPage] = useState(0)
  const [inboxOpen, setInboxOpen] = useState(false)
  const [opening, setOpening] = useState(false) // 우편함 문 열림 애니메이션(520ms)
  const [detailLetter, setDetailLetter] = useState(null)
  const [composing, setComposing] = useState(false)
  const [receiverUserId, setReceiverUserId] = useState('')
  const [broadcast, setBroadcast] = useState(false)
  const [content, setContent] = useState('')
  const [emoji, setEmoji] = useState('💌')
  const [message, setMessage] = useState('')

  const box = boxOfTab(tab)
  const letters = useQuery({ queryKey: ['letters', roomId, box], queryFn: () => getLetters(roomId, box) })
  // 히어로 요약(안 읽은 편지 수)은 모달에서 마지막으로 본 탭(box)과 무관하게 항상 "받은 편지함"
  // 기준이어야 한다 — box를 그대로 쓰면 "보낸 편지함" 탭을 보고 나온 뒤에도 그 편지함의
  // 총 개수가 떠 버린다(#278). queryKey가 겹치면 React Query가 캐시를 공유해 중복 요청은 없다.
  const receivedLetters = useQuery({ queryKey: ['letters', roomId, 'received'], queryFn: () => getLetters(roomId, 'received') })
  const members = useQuery({ queryKey: ['room', roomId, 'members'], queryFn: () => getRoomMembers(roomId), enabled: composing })
  const prefs = useQuery({ queryKey: ['preferences'], queryFn: getPreferences })
  const isPostboxTheme = (prefs.data?.letterTheme ?? 'postbox') === 'postbox'
  const invalidateLetters = () => queryClient.invalidateQueries({ queryKey: ['letters', roomId] })

  const items = letters.data?.items ?? []
  const visibleItems = tab === 'favorite' ? items.filter((letter) => letter.isFavorite) : items
  const memberItems = (members.data?.items ?? []).filter((member) => member.status === 'ACTIVE')

  const sendMutation = useMutation({
    mutationFn: (payload) => sendLetter(roomId, payload),
    onSuccess: () => {
      invalidateLetters()
      setComposing(false)
      setTab('sent')
      setReceiverUserId('')
      setBroadcast(false)
      setContent('')
      setEmoji('💌')
      setMessage('')
    },
    onError: (error) => setMessage(error.message ?? '편지를 보내지 못했습니다.'),
  })
  const readMutation = useMutation({ mutationFn: markRead, onSuccess: invalidateLetters })
  const favoriteMutation = useMutation({ mutationFn: toggleFavorite, onSuccess: invalidateLetters })

  const openInbox = () => {
    // 모달은 즉시 띄우고(클릭 반응 확실), 우편함 문 열림 애니메이션은 뒤에서 재생.
    setPage(0)
    setInboxOpen(true)
    setOpening(true)
    setTimeout(() => setOpening(false), 520)
  }

  const changeTab = (next) => {
    setTab(next)
    setPage(0)
  }

  const openDetail = (letter) => {
    if (box === 'received' && !letter.readAt) readMutation.mutate(letter.id)
    setDetailLetter(letter)
    setInboxOpen(false)
  }
  const backToInbox = () => {
    setDetailLetter(null)
    setInboxOpen(true)
  }

  // 이전에 골랐던 받는 사람이 다음에 다시 열었을 때도 남아 있었다(사용자 지적) —
  // 매번 새로 여는 폼이니 열 때마다 수신자 선택을 초기화한다.
  const openCompose = () => {
    setMessage('')
    setReceiverUserId('')
    setBroadcast(false)
    setComposing(true)
    setInboxOpen(false)
  }
  const handleSend = () => {
    if (!content.trim()) return setMessage('편지 내용을 작성해주세요! ✍️')
    if (!broadcast && !receiverUserId) return setMessage('받는 사람을 선택하거나 모두에게 보내기를 켜주세요.')
    sendMutation.mutate(broadcast ? { broadcast: true, content: content.trim(), emoji } : { receiverUserId, content: content.trim(), emoji })
  }

  // 요약 문구("총 N통의 편지가 도착했어요!")는 편지함 총 개수가 아니라 "안 읽은" 편지 수를
  // 보여준다 — 다 읽으면 상자가 "편지 없음" 상태로 바뀌는 알림형 UX(#278).
  const unreadCount = (receivedLetters.data?.items ?? []).filter((letter) => !letter.readAt).length
  const hasMail = unreadCount > 0

  return (
    // 편지 = 항상 크림/라이트 종이 미감. 팔레트 변수를 인라인으로 못박아(모든 하위가 상속)
    // @scope CSS가 사용자 환경에서 반영 안 되는 문제와 무관하게 다크 모드에서도 라이트로 렌더.
    <main className="proto-letters" style={LETTERS_LIGHT_PALETTE}>
      <Header variant="room" roomId={roomId} activeTab="letter" />
      <Mascot roomId={roomId} />
      <div className="letter-tab-container">
        <section className="letter-stage">
          <div className="letter-stage-copy">
            <span className="letter-stage-kicker">Lucky Letter</span>
            <h2>행운 편지함</h2>
            <p>상자를 열어 편지를 천천히 확인해보세요.</p>
          </div>
          <button
            type="button"
            className={`letter-box-trigger${isPostboxTheme ? ' theme-mailbox' : ''}${hasMail ? ' has-mail' : ''}${opening ? ' is-opening' : ''}`}
            onClick={openInbox}
            aria-label="받은 편지함 열기"
          >
            <span className="letter-box-ground-shadow" aria-hidden="true" />
            <span className="letter-box-visual letter-box-visual-giftbox" aria-hidden="true">
              <GiftboxSvg />
              <span className="letter-box-lid" />
              <span className="letter-box-body" />
            </span>
            <span className="letter-box-visual letter-box-visual-mailbox" aria-hidden="true">
              <MailboxSvg />
            </span>
          </button>
          {/* 텅 빈 상태에서 "정적 이미지"로만 보이지 않게 — 클릭 유도 힌트를 살짝 더한다
              (행운편지 작업 내용.md ③, 편지가 있을 땐 이미 안 봐도 뻔해서 뺀다). */}
          {!hasMail && <span className="letter-box-hint" aria-hidden="true">눌러서 열어보기</span>}
          <div className="letter-box-summary">
            {hasMail
              ? <p>총 <b>{unreadCount}</b>통의 편지가<br />나에게 도착했어요!</p>
              : <p>{EMPTY_MESSAGES[0]}</p>}
          </div>
          <button type="button" className="letter-filter-btn action-btn letter-write-btn" onClick={openCompose}>
            <span>편지 작성</span>
          </button>
        </section>
      </div>

      {/* 예전엔 letter-tab-container 안에 인라인으로 그려져 "아래로 내려오며 페이지가
          늘어나는" 느낌이었다(사용자 지적) — 다른 두 모달(받은편지함/상세)과 같은
          modal-overlay(블러 배경)로 띄우고, 아래에서 위로 올라오는 시트로 연출한다. */}
      {composing && (
        <div className="modal-overlay letter-compose-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setComposing(false) }}>
          <ComposeCard
            members={memberItems}
            receiverUserId={receiverUserId}
            setReceiverUserId={setReceiverUserId}
            broadcast={broadcast}
            setBroadcast={setBroadcast}
            content={content}
            setContent={setContent}
            message={message}
            sending={sendMutation.isPending}
            onCancel={() => setComposing(false)}
            onSend={handleSend}
          />
        </div>
      )}

      {inboxOpen && (
        <LetterInboxModal
          tab={tab}
          onTab={changeTab}
          box={box}
          items={visibleItems}
          page={page}
          setPage={setPage}
          pending={letters.isPending}
          error={letters.isError}
          onClose={() => setInboxOpen(false)}
          onOpenDetail={openDetail}
          onFavorite={(id) => favoriteMutation.mutate(id)}
        />
      )}

      {detailLetter && (
        <LetterDetailModal
          letter={detailLetter}
          box={box}
          onBack={backToInbox}
          onClose={() => setDetailLetter(null)}
        />
      )}
    </main>
  )
}

// ── 받은 편지함 모달(전체/즐겨찾기/보낸편지 + 3통 페이지네이션) ──
function LetterInboxModal({ tab, onTab, box, items, page, setPage, pending, error, onClose, onOpenDetail, onFavorite }) {
  const totalPages = Math.max(1, Math.ceil(items.length / LETTERS_PER_PAGE))
  const safePage = Math.min(Math.max(page, 0), totalPages - 1)
  const start = safePage * LETTERS_PER_PAGE
  const visible = items.slice(start, start + LETTERS_PER_PAGE)

  return (
    <div className="modal-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <div className="modal-box letter-inbox-modal" role="dialog" aria-modal="true">
        <div className="letter-inbox-head">
          <div>
            <span className="letter-stage-kicker">Mailbox</span>
            <h3>도착한 행운 편지</h3>
          </div>
          <button className="letter-modal-close" type="button" onClick={onClose} aria-label="닫기">×</button>
        </div>
        <div className="letter-inbox-tabs">
          <button type="button" className={`letter-filter-btn${tab === 'all' ? ' active' : ''}`} onClick={() => onTab('all')}>전체</button>
          <button type="button" className={`letter-filter-btn${tab === 'favorite' ? ' active' : ''}`} onClick={() => onTab('favorite')}>즐겨찾기</button>
          <button type="button" className={`letter-filter-btn${tab === 'sent' ? ' active' : ''}`} onClick={() => onTab('sent')}>보낸 편지함</button>
        </div>
        <div className="letter-inbox-list">
          {pending ? (
            <div className="letter-inbox-empty">편지를 불러오는 중…</div>
          ) : error ? (
            <div className="letter-inbox-empty">편지함을 불러오지 못했습니다.</div>
          ) : !visible.length ? (
            <div className="letter-inbox-empty">아직 확인할 편지가 없어요.</div>
          ) : (
            visible.map((letter, offset) => {
              const label = box === 'received'
                ? `From. ${letter.sender?.nickname ?? '익명'}`
                : `To. ${letter.receiver?.nickname ?? '전체'}`
              const preview = String(letter.content || '').slice(0, 64) + ((letter.content || '').length > 64 ? '...' : '')
              return (
                <div
                  key={letter.id}
                  className="letter-inbox-card"
                  role="button"
                  tabIndex={0}
                  style={{ animationDelay: `${offset * 45}ms` }}
                  onClick={() => onOpenDetail(letter)}
                  onKeyDown={(event) => { if (event.key === 'Enter') onOpenDetail(letter) }}
                >
                  <button
                    type="button"
                    className={`letter-favorite-btn${letter.isFavorite ? '' : ' inactive'}`}
                    title="즐겨찾기 토글"
                    onClick={(event) => { event.stopPropagation(); onFavorite(letter.id) }}
                  >⭐</button>
                  <strong>{label}</strong>
                  <p>{letter.emoji ? `${letter.emoji} ` : ''}{preview}</p>
                </div>
              )
            })
          )}
        </div>
        <div className="letter-inbox-pager">
          <button type="button" disabled={safePage === 0} onClick={() => setPage(safePage - 1)}>이전</button>
          <span>{safePage + 1} / {totalPages}</span>
          <button type="button" disabled={safePage >= totalPages - 1} onClick={() => setPage(safePage + 1)}>다음</button>
        </div>
      </div>
    </div>
  )
}

// ── 편지 상세(편지지) 모달 ──
function LetterDetailModal({ letter, box, onBack, onClose }) {
  const toLabel = box === 'received' ? '나' : (letter.receiver?.nickname ?? '전체')
  const fromLabel = letter.sender?.nickname ?? '나'
  return (
    <div className="modal-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <div className="modal-box letter-detail-modal" role="dialog" aria-modal="true">
        <div className="letter-preview letter-detail-paper">
          <button className="letter-paper-btn letter-paper-back" type="button" onClick={onBack} title="편지함으로 돌아가기">←</button>
          <button className="letter-paper-btn letter-paper-close" type="button" onClick={onClose} title="닫기">×</button>
          <h3 className="letter-detail-heading">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: '-3px', marginRight: '5px' }}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>
            행운편지
          </h3>
          <div className="letter-detail-to">To. {toLabel}</div>
          <div className="letter-detail-content">{letter.emoji || '💌'}{'\n'}{letter.content}</div>
          <div className="letter-detail-from">From. {fromLabel}</div>
        </div>
      </div>
    </div>
  )
}

// ── 편지 작성(모달 시트) — 헤더 우측에 수신자 아바타(받는 사람) + 이모지 ──
function ComposeCard({ members, receiverUserId, setReceiverUserId, broadcast, setBroadcast, content, setContent, message, sending, onCancel, onSend }) {
  // 아바타만으론 "지금 누구한테 보내는지"가 안 읽혔다(사용자 지적) — 선택 상태를
  // 짧은 문구로 아바타 줄 아래 덧붙여 가독성을 높인다. 아직 아무도 안 골랐을 땐 문구
  // 자체를 아예 렌더하지 않는다(안내 문구는 발송 시 에러 메시지가 이미 해주고 있어서
  // 중복이었다 — 사용자 지적) — 그래서 실제로 뭔가 선택된 "등장의 순간"에만 보인다.
  const selectedMember = members.find((member) => String(member.userId) === receiverUserId)
  const recipientLabel = broadcast ? '모두에게 전송' : (selectedMember ? `${selectedMember.nickname}님에게` : '')

  // 선택이 바뀔 때 "물감이 옆으로 스륵 이동해 그 사람 색으로 물드는" 하이라이트 —
  // goo 필터 대신 가벼운 방식: 활성 아바타의 실제 위치/크기를 getBoundingClientRect로
  // 재서 하이라이트 필을 그 자리로 translate(위치는 CSS transition), 도착한 아바타의
  // 색으로 배경을 맞춘다. 쫀득한 느낌은 별도 애니메이션(transform: scaleX 스쿼시)으로만
  // 줘서 위치 전환(transition)과 서로 다른 타이밍에 부딪히지 않게 한다.
  // 대상 버튼은 콜백 ref map 대신 data-recipient-key로 찾는다 — 렌더 중 ref.current를
  // 만드는 콜백을 만들면 react-hooks/refs 린트가 막는다.
  const containerRef = useRef(null)
  const pillRef = useRef(null)
  const [pillStyle, setPillStyle] = useState({ opacity: 0 })
  const activeKey = broadcast ? 'broadcast' : (receiverUserId || null)

  useLayoutEffect(() => {
    const container = containerRef.current
    const target = activeKey ? container?.querySelector(`[data-recipient-key="${activeKey}"]`) : null
    if (!container || !target) {
      setPillStyle((prev) => ({ ...prev, opacity: 0 }))
      return
    }
    const containerRect = container.getBoundingClientRect()
    const targetRect = target.getBoundingClientRect()
    const computed = getComputedStyle(target)
    // 필 색이 아바타 색과 완전히 겹치면 멈춰 있을 때 눈에 안 띄어 "물감 색"이 잘 안
    // 보였다(사용자 지적) — 아바타보다 살짝 크게(테두리 밖으로 번지듯) 그리고, 같은
    // 색으로 은은한 글로우(box-shadow)를 둘러서 이동 중에도 색이 또렷하게 보이게 한다.
    // 다만 어두운 색(예: 짙은 초록)은 같은 두께의 글로우도 훨씬 무거워 보였다(사용자
    // 지적: "어두운 색들로 가면 물감이 너무 두꺼워져") — 밝기(luminance)가 낮을수록
    // 글로우 알파를 낮춰서 색이 어두워질수록 오히려 얇고 은은해지게 보정한다.
    const BLEED = 3
    const [r, g, b] = (computed.backgroundColor.match(/\d+(\.\d+)?/g) || [82, 183, 136]).map(Number)
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255 // 0(어두움) ~ 1(밝음)
    const ringAlpha = 0.14 + luminance * 0.22
    const glowAlpha = 0.22 + luminance * 0.34
    setPillStyle({
      opacity: 1,
      left: targetRect.left - containerRect.left - BLEED,
      top: targetRect.top - containerRect.top - BLEED,
      width: targetRect.width + BLEED * 2,
      height: targetRect.height + BLEED * 2,
      backgroundColor: computed.backgroundColor,
      backgroundImage: computed.backgroundImage,
      boxShadow: `0 0 0 2px rgba(${r}, ${g}, ${b}, ${ringAlpha.toFixed(2)}), 0 0 12px 2px rgba(${r}, ${g}, ${b}, ${glowAlpha.toFixed(2)})`,
    })
    const pill = pillRef.current
    if (pill) {
      // 클래스를 뗐다 강제 리플로우(offsetWidth) 후 다시 붙여야 매번 애니메이션이
      // 재생된다 — 이미 붙어 있는 클래스를 다시 추가만 하면 브라우저가 "변화 없음"으로
      // 보고 애니메이션을 재생하지 않는다.
      pill.classList.remove('is-squashing')
      void pill.offsetWidth
      pill.classList.add('is-squashing')
    }
    // members는 모달이 열린 뒤 비동기로 채워진다 — 그 사이엔 아바타 버튼이 아직 DOM에
    // 없어 querySelector가 못 찾고 필이 숨겨진 채로 남을 수 있었다. activeKey만 의존성에
    // 두면 그 뒤 목록이 채워져도 재계산이 안 됐던 버그라 members.length도 추가한다.
  }, [activeKey, members.length])

  return (
    <section className="modal-box letter-write-card" style={{ textAlign: 'left', colorScheme: 'light' }}>
      {/* 원형 이모지 배지(💌) 제거 — 텍스트만으로 배치(사용자 요청). 빈 편지함(letter-
          stage-kicker)과 같은 브랜드 톤의 kicker/제목/부제 3줄만 남기고, "받는 사람
          선택"은 이 헤더 우측에 아바타만으로 붙여서 별도 박스/텍스트 목록 없이 바로
          누를 수 있게 한다(사용자 요청). */}
      <div className="letter-write-header">
        <div className="letter-write-heading">
          <span className="letter-write-kicker">Lucky Letter</span>
          <h3>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: '-3px', marginRight: '5px' }}><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></svg>
            행운 편지 작성
          </h3>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>소중한 사람에게 마음을 담은 편지를 보내보세요.</p>
        </div>
        {/* 아바타만 둥둥 떠 있으면 뭘 고르는 UI인지 안 읽혔다(사용자 지적) — 위에 작은
            라벨, 아래에 지금 선택된 대상을 문구로 붙여 한눈에 읽히게 한다. */}
        <div className={`letter-recipient-picker-mini${broadcast ? ' is-broadcast' : ''}`} role="group" aria-label="받는 사람 선택">
          <span className="letter-recipient-mini-label">받는 사람</span>
          <div className="letter-recipient-mini-avatars" ref={containerRef}>
            <span ref={pillRef} className="letter-recipient-pill" style={pillStyle} aria-hidden="true" />
            <button
              type="button"
              data-recipient-key="broadcast"
              className={`letter-recipient-avatar-btn broadcast${broadcast ? ' active' : ''}`}
              onClick={() => { setBroadcast(!broadcast); setReceiverUserId('') }}
              title="모두에게"
              aria-label="모두에게 보내기"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>
            </button>
            {members.map((member, index) => {
              const active = !broadcast && String(member.userId) === receiverUserId
              return (
                <button
                  key={member.userId}
                  type="button"
                  data-recipient-key={String(member.userId)}
                  className={`letter-recipient-avatar-btn${active ? ' active' : ''}`}
                  style={{ background: AVATAR_COLORS[index % AVATAR_COLORS.length] }}
                  onClick={() => { setBroadcast(false); setReceiverUserId(active ? '' : String(member.userId)) }}
                  title={member.nickname}
                  aria-label={`${member.nickname}에게 보내기`}
                >
                  {initialOf(member.nickname)}
                </button>
              )
            })}
          </div>
          {members.length === 0
            ? <span className="letter-recipient-empty">함께하는 친구가 없어요</span>
            : (broadcast || selectedMember) && <span className="letter-recipient-mini-selected is-set">{recipientLabel}</span>}
        </div>
      </div>
      <div className="modal-form-group letter-content-group">
        <label htmlFor="letter-content">편지 내용</label>
        <textarea
          id="letter-content"
          className="letter-write-textarea"
          maxLength={1000}
          value={content}
          placeholder="응원, 감사, 행운의 메시지를 자유롭게 작성해주세요."
          onChange={(event) => setContent(event.target.value)}
          style={LETTER_TEXTAREA_STYLE}
        />
        {/* 예전엔 "0 / 1000 (한글 500자 / 영어 1000자)"를 전부 같은 크기로 붙여놔서 약관처럼
            빽빽했다(사용자 지적) — 실제 글자수만 도드라진 배지로 보여주고, 언어별 세부 기준은
            title 툴팁으로 옮겨 필요한 사람만 확인하게 한다. */}
        <div
          className="letter-content-count"
          title="한글 500자 · 영어 1000자 기준"
        >
          <b>{content.length}</b> / 1000자
        </div>
      </div>
      {message && <p className="letter-error" role="alert" style={{ color: '#d90429', fontSize: '12px', marginTop: '8px' }}>{message}</p>}
      <div className="modal-buttons letter-write-buttons">
        <Button variant="secondary" size="md" onClick={onCancel}>취소</Button>
        <Button variant="primary" size="md" disabled={sending} onClick={onSend}>{sending ? '발송 중…' : '편지 발송!'}</Button>
      </div>
    </section>
  )
}

// ── 선물상자 리본 SVG(프로토타입 letter-page.js:13-39) ──
function GiftboxSvg() {
  return (
    <span className="gift-bow" aria-hidden="true">
      <svg className="gift-bow-svg" viewBox="0 0 250 120">
        <defs>
          <linearGradient id="dtRibL" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ffd6e4" /><stop offset="1" stopColor="#ff8fb3" />
          </linearGradient>
          <linearGradient id="dtRibR" x1="1" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffd6e4" /><stop offset="1" stopColor="#ff8fb3" />
          </linearGradient>
          <linearGradient id="dtKnot" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffe3ec" /><stop offset="1" stopColor="#ff8fb3" />
          </linearGradient>
        </defs>
        <path d="M120 52 C 108 74, 92 92, 78 112 L 96 116 C 108 96, 118 78, 125 60 Z" fill="url(#dtRibL)" />
        <path d="M130 52 C 142 74, 158 92, 172 112 L 154 116 C 142 96, 132 78, 125 60 Z" fill="url(#dtRibR)" />
        <path d="M125 54 C 96 26, 44 18, 40 50 C 37 74, 84 74, 125 62 Z" fill="url(#dtRibL)" />
        <path d="M125 54 C 154 26, 206 18, 210 50 C 213 74, 166 74, 125 62 Z" fill="url(#dtRibR)" />
        <path d="M118 58 C 92 42, 58 40, 52 54 C 62 62, 92 62, 118 58 Z" fill="#e0567f" opacity="0.28" />
        <path d="M132 58 C 158 42, 192 40, 198 54 C 188 62, 158 62, 132 58 Z" fill="#e0567f" opacity="0.28" />
        <rect x="108" y="44" width="34" height="32" rx="9" fill="url(#dtKnot)" />
        <rect x="112" y="47" width="10" height="26" rx="5" fill="#ffc2d6" opacity="0.5" />
      </svg>
    </span>
  )
}

// ── 우편함 SVG(프로토타입 letter-page.js — 문/깃발/편지 애니메이션 그룹) ──
function MailboxSvg() {
  return (
    <svg className="mailbox-svg" viewBox="0 0 250 230" aria-hidden="true">
      <defs>
        <linearGradient id="mbPostGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#374151" /><stop offset="0.5" stopColor="#4b5563" /><stop offset="1" stopColor="#1f2937" />
        </linearGradient>
        <linearGradient id="mbBodyGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ef4444" /><stop offset="0.6" stopColor="#dc2626" /><stop offset="1" stopColor="#991b1b" />
        </linearGradient>
        <linearGradient id="mbDoorGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f87171" /><stop offset="0.3" stopColor="#ef4444" /><stop offset="1" stopColor="#b91c1c" />
        </linearGradient>
        <linearGradient id="mbFlagGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fbbf24" /><stop offset="1" stopColor="#f59e0b" />
        </linearGradient>
        <filter id="mbShadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="8" stdDeviation="6" floodColor="#111827" floodOpacity="0.25" />
        </filter>
      </defs>

      {/* 우체통 철제 받침대 */}
      <g className="mailbox-post-group">
        <rect x="98" y="206" width="54" height="10" rx="5" fill="#374151" />
        <rect x="105" y="198" width="40" height="8" rx="3" fill="#4b5563" />
        <rect x="113" y="140" width="24" height="60" rx="4" fill="url(#mbPostGrad)" />
      </g>

      {/* 우체통 본체 */}
      <g className="mailbox-housing" filter="url(#mbShadow)">
        <path d="M 55 142 L 55 80 C 55 40, 195 40, 195 80 L 195 142 Z" fill="#1e293b" />
        <rect x="48" y="140" width="154" height="14" rx="7" fill="#7f1d1d" />
      </g>

      {/* 내부에 담긴 편지 */}
      <g className="mailbox-letter-item">
        <rect x="85" y="70" width="80" height="54" rx="4" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1.5" />
        <path d="M 85 70 L 125 98 L 165 70" fill="none" stroke="#dc2626" strokeWidth="2" />
        <circle cx="125" cy="95" r="9" fill="#dc2626" />
        <text x="125" y="99" fontSize="11" textAnchor="middle" fill="#fff">🍀</text>
      </g>

      {/* 우측 알림 깃발 */}
      <g className="mailbox-flag-group">
        <rect x="196" y="70" width="6" height="50" rx="3" fill="url(#mbFlagGrad)" />
        <path d="M 202 70 L 228 70 M 202 70 L 228 82 L 202 94 Z" fill="#f59e0b" />
        <circle cx="199" cy="115" r="6" fill="#b45309" stroke="#fff" strokeWidth="2" />
      </g>

      {/* 우체통 앞문 */}
      <g className="mailbox-door-group">
        <path d="M 55 142 L 55 80 C 55 40, 195 40, 195 80 L 195 142 Z" fill="url(#mbDoorGrad)" stroke="#ffffff" strokeWidth="3.5" />
        <rect x="80" y="58" width="90" height="14" rx="4" fill="#374151" stroke="#cbd5e1" strokeWidth="2" />
        <rect x="84" y="62" width="82" height="6" rx="2" fill="#111827" />
        <circle cx="125" cy="102" r="18" fill="#ffffff" />
        <text x="125" y="108" fontSize="18" textAnchor="middle">📮</text>
        <circle cx="125" cy="45" r="6" fill="#f8fafc" stroke="#64748b" strokeWidth="2" />
      </g>
    </svg>
  )
}

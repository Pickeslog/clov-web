import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import './letters.proto.css'
import { getLetters, markRead, sendLetter, toggleFavorite } from '../../../api/letter'
import { getRoomMembers } from '../../../api/room'
import Header from '../../../components/Header/Header'

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
  height: '140px',
  padding: '14px 16px',
  background: '#ffffff',
  color: '#2c3e35',
  border: '1px solid #e2e8e4',
  borderRadius: '8px',
  fontSize: '13px',
  lineHeight: 1.7,
  fontFamily: 'inherit',
  resize: 'vertical',
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
  const members = useQuery({ queryKey: ['room', roomId, 'members'], queryFn: () => getRoomMembers(roomId), enabled: composing })
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

  const openCompose = () => { setMessage(''); setComposing(true); setInboxOpen(false) }
  const handleSend = () => {
    if (!content.trim()) return setMessage('편지 내용을 작성해주세요! ✍️')
    if (!broadcast && !receiverUserId) return setMessage('받는 사람을 선택하거나 모두에게 보내기를 켜주세요.')
    sendMutation.mutate(broadcast ? { broadcast: true, content: content.trim(), emoji } : { receiverUserId, content: content.trim(), emoji })
  }

  const hasMail = items.length > 0

  return (
    // 편지 = 항상 크림/라이트 종이 미감. 팔레트 변수를 인라인으로 못박아(모든 하위가 상속)
    // @scope CSS가 사용자 환경에서 반영 안 되는 문제와 무관하게 다크 모드에서도 라이트로 렌더.
    <main className="proto-letters" style={LETTERS_LIGHT_PALETTE}>
      <Header variant="room" roomId={roomId} activeTab="letter" />
      <div className="letter-tab-container">
        <section className="letter-stage">
          <div className="letter-stage-copy">
            <span className="letter-stage-kicker">Lucky Letter</span>
            <h2>행운 편지함</h2>
            <p>상자를 열어 편지를 천천히 확인해보세요.</p>
          </div>
          <button
            type="button"
            className={`letter-box-trigger theme-mailbox${hasMail ? ' has-mail' : ''}${opening ? ' is-opening' : ''}`}
            onClick={openInbox}
            aria-label="받은 편지함 열기"
          >
            <span className="letter-box-ground-shadow" aria-hidden="true" />
            <span className="letter-box-visual letter-box-visual-mailbox" aria-hidden="true">
              <MailboxSvg />
            </span>
          </button>
          <div className="letter-box-summary">
            {hasMail
              ? <p>총 <b>{items.length}</b>통의 편지가<br />나에게 도착했어요!</p>
              : <p>{EMPTY_MESSAGES[0]}</p>}
          </div>
          <button type="button" className="letter-filter-btn action-btn letter-write-btn" onClick={openCompose}>
            <span>편지 작성</span>
          </button>
        </section>

        {composing && (
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
        )}
      </div>

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

// ── 편지 작성(인라인) — 수신자 아바타 칩 + 모두에게 pill + 이모지 ──
function ComposeCard({ members, receiverUserId, setReceiverUserId, broadcast, setBroadcast, content, setContent, message, sending, onCancel, onSend }) {
  const allBtnStyle = {
    padding: '5px 12px', fontSize: '11px', fontWeight: 600, borderRadius: '20px', border: 'none', cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center', gap: '4px', transition: 'all 0.2s ease',
    background: broadcast ? 'var(--primary-green)' : (receiverUserId ? '#eef1f4' : 'var(--nav-item-bg-active)'),
    color: broadcast ? '#fff' : (receiverUserId ? '#8c93a3' : 'var(--primary-green)'),
  }
  return (
    <section className="modal-box letter-write-card" style={{ textAlign: 'left', colorScheme: 'light' }}>
      <h3>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: '-3px', marginRight: '5px' }}><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></svg>
        행운 편지 작성
      </h3>
      <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '14px' }}>소중한 사람에게 마음을 담은 편지를 보내보세요.</p>
      <div className="modal-form-group">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <label style={{ marginBottom: 0, fontSize: '13px' }}>받는 사람 선택</label>
          <button type="button" style={allBtnStyle} onClick={() => { setBroadcast(!broadcast); setReceiverUserId('') }}>
            모두에게
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: '-1px' }}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>
          </button>
        </div>
        <div className="letter-recipient-picker">
          {members.length === 0 && <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>함께하는 친구가 아직 없어요.</span>}
          {members.map((member, index) => {
            const active = !broadcast && String(member.userId) === receiverUserId
            const muted = broadcast || (!!receiverUserId && !active)
            return (
              <button
                key={member.userId}
                type="button"
                className={`letter-recipient-chip${active ? ' active' : ''}${muted ? ' muted' : ''}`}
                onClick={() => { setBroadcast(false); setReceiverUserId(active ? '' : String(member.userId)) }}
              >
                <span className="letter-recipient-avatar" style={{ background: AVATAR_COLORS[index % AVATAR_COLORS.length] }}>{initialOf(member.nickname)}</span>
                <span>{member.nickname}</span>
              </button>
            )
          })}
        </div>
      </div>
      <div className="modal-form-group">
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
        <div className="letter-content-count" style={{ textAlign: 'right', fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>{content.length} / 1000 (한글 500자 / 영어 1000자)</div>
      </div>
      {message && <p className="letter-error" role="alert" style={{ color: '#d90429', fontSize: '12px', marginTop: '8px' }}>{message}</p>}
      <div className="modal-buttons letter-write-buttons">
        <button className="btn-sub" type="button" onClick={onCancel}>취소</button>
        <button className="btn-main" type="button" disabled={sending} onClick={onSend}>{sending ? '발송 중…' : '편지 발송!'}</button>
      </div>
    </section>
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

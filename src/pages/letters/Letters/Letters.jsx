import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import './letters.proto.css'
import { getLetters, markRead, sendLetter, toggleFavorite } from '../../../api/letter'
import { getRoomMembers } from '../../../api/room'

const EMOJIS = ['💌', '🍀', '💚', '✨', '🎉', '😊']

export default function Letters() {
  const { roomId } = useParams()
  const queryClient = useQueryClient()
  const [box, setBox] = useState('received')
  const [inboxOpen, setInboxOpen] = useState(false)
  const [composing, setComposing] = useState(false)
  const [favoriteOnly, setFavoriteOnly] = useState(false)
  const [receiverUserId, setReceiverUserId] = useState('')
  const [broadcast, setBroadcast] = useState(false)
  const [content, setContent] = useState('')
  const [emoji, setEmoji] = useState('💌')
  const [message, setMessage] = useState('')

  const letters = useQuery({ queryKey: ['letters', roomId, box], queryFn: () => getLetters(roomId, box) })
  const members = useQuery({ queryKey: ['room', roomId, 'members'], queryFn: () => getRoomMembers(roomId), enabled: composing })
  const invalidateLetters = () => queryClient.invalidateQueries({ queryKey: ['letters', roomId] })
  const items = letters.data?.items ?? []
  const visibleItems = favoriteOnly ? items.filter((letter) => letter.isFavorite) : items
  const memberItems = (members.data?.items ?? []).filter((member) => member.status === 'ACTIVE')

  const sendMutation = useMutation({
    mutationFn: (payload) => sendLetter(roomId, payload),
    onSuccess: () => {
      invalidateLetters(); setComposing(false); setBox('sent'); setReceiverUserId(''); setBroadcast(false); setContent(''); setEmoji('💌'); setMessage('')
    },
    onError: (error) => setMessage(error.message ?? '편지를 보내지 못했습니다.'),
  })
  const readMutation = useMutation({ mutationFn: markRead, onSuccess: invalidateLetters })
  const favoriteMutation = useMutation({ mutationFn: toggleFavorite, onSuccess: invalidateLetters })

  const openCompose = () => { setMessage(''); setComposing(true); setInboxOpen(false) }
  const handleSend = () => {
    if (!content.trim()) return setMessage('편지 내용을 작성해주세요! ✍️')
    if (!broadcast && !receiverUserId) return setMessage('받는 사람을 선택하거나 모두에게 보내기를 켜주세요.')
    sendMutation.mutate(broadcast ? { broadcast: true, content: content.trim(), emoji } : { receiverUserId, content: content.trim(), emoji })
  }

  return (
    <main className="proto-letters">
      <section className="letter-stage">
        <div className="letter-stage-copy"><span className="letter-stage-kicker">LUCKY LETTER</span><h2>행운 편지함</h2><p>상자를 열어 편지를 천천히 확인해보세요.</p></div>
        <button className={`letter-box-trigger theme-mailbox${items.length ? ' has-mail' : ''}`} type="button" onClick={() => setInboxOpen(true)} aria-label="받은 편지함 열기">
          <span className="letter-box-ground-shadow" />
          <span className="letter-box-visual letter-box-visual-mailbox" aria-hidden="true"><MailboxIcon /></span>
        </button>
        <div className="letter-box-summary">{items.length ? <>총 <b>{items.length}</b>통의 편지가<br />나에게 도착했어요!</> : <>마음은 먼저 건네는 사람에게 가장 크게 남는대요.<br />오늘, 그 마음을 편지에 담아볼까요?</>}</div>
        <button className="letter-filter-btn action-btn letter-write-btn" type="button" onClick={openCompose}>편지 작성</button>
      </section>

      {composing && <ComposeCard members={memberItems} receiverUserId={receiverUserId} setReceiverUserId={setReceiverUserId} broadcast={broadcast} setBroadcast={setBroadcast} content={content} setContent={setContent} emoji={emoji} setEmoji={setEmoji} message={message} sending={sendMutation.isPending} onCancel={() => setComposing(false)} onSend={handleSend} />}

      {inboxOpen && <div className="modal-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setInboxOpen(false) }}><section className="modal-box letter-inbox-modal" role="dialog" aria-modal="true"><div className="letter-inbox-head"><div><span className="letter-stage-kicker">Mailbox</span><h3>받은 편지함</h3></div><button className="letter-modal-close" type="button" onClick={() => setInboxOpen(false)}>×</button></div><div className="letter-inbox-tabs"><button className={box === 'received' ? 'active' : ''} type="button" onClick={() => setBox('received')}>받은 편지</button><button className={box === 'sent' ? 'active' : ''} type="button" onClick={() => setBox('sent')}>보낸 편지</button><label><input type="checkbox" checked={favoriteOnly} onChange={(event) => setFavoriteOnly(event.target.checked)} /> 즐겨찾기</label></div><InboxList box={box} items={visibleItems} pending={letters.isPending} error={letters.isError} onRead={(id) => readMutation.mutate(id)} onFavorite={(id) => favoriteMutation.mutate(id)} /></section></div>}
    </main>
  )
}

function ComposeCard({ members, receiverUserId, setReceiverUserId, broadcast, setBroadcast, content, setContent, emoji, setEmoji, message, sending, onCancel, onSend }) {
  return <section className="modal-box letter-write-card"><h3>행운 편지 작성</h3><div className="modal-form-group"><label>받는 사람</label><div className="letter-recipient-picker"><button className={`letter-recipient-chip${broadcast ? ' active' : ''}`} type="button" onClick={() => { setBroadcast(!broadcast); setReceiverUserId('') }}>모두에게</button>{members.map((member) => <button key={member.userId} className={`letter-recipient-chip${String(member.userId) === receiverUserId ? ' active' : ''}`} type="button" onClick={() => { setBroadcast(false); setReceiverUserId(String(member.userId)) }}>{member.nickname}</button>)}</div></div><div className="modal-form-group"><label htmlFor="letter-content">편지 내용</label><textarea id="letter-content" className="letter-write-textarea" maxLength={1000} value={content} placeholder="응원, 감사, 행운의 메시지를 자유롭게 작성해주세요." onChange={(event) => setContent(event.target.value)} /><div className="letter-content-count">{content.length} / 1000</div></div><div className="letter-emoji-picker">{EMOJIS.map((item) => <button key={item} className={emoji === item ? 'active' : ''} type="button" onClick={() => setEmoji(item)}>{item}</button>)}</div>{message && <p className="letter-error" role="alert">{message}</p>}<div className="modal-buttons letter-write-buttons"><button className="btn-sub" type="button" onClick={onCancel}>취소</button><button className="btn-main" type="button" disabled={sending} onClick={onSend}>{sending ? '발송 중…' : '편지 발송!'}</button></div></section>
}

function InboxList({ box, items, pending, error, onRead, onFavorite }) {
  if (pending) return <div className="letter-inbox-empty">편지를 불러오는 중…</div>
  if (error) return <div className="letter-inbox-empty">편지함을 불러오지 못했습니다.</div>
  if (!items.length) return <div className="letter-inbox-empty">아직 확인할 편지가 없어요.</div>
  return <div className="letter-inbox-list">{items.map((letter) => <article className="letter-inbox-card" key={letter.id}><button className={`letter-favorite-btn${letter.isFavorite ? '' : ' inactive'}`} type="button" onClick={() => onFavorite(letter.id)}>{letter.isFavorite ? '★' : '☆'}</button><strong>{box === 'received' ? `From. ${letter.sender?.nickname ?? '익명'}` : `To. ${letter.receiver?.nickname ?? '전체'}`}</strong><p>{letter.emoji ?? '💌'} {letter.content}</p>{box === 'received' && !letter.readAt && <button className="letter-read-btn" type="button" onClick={() => onRead(letter.id)}>읽음 표시</button>}</article>)}</div>
}

function MailboxIcon() { return <svg viewBox="0 0 180 150" aria-hidden="true"><path d="M40 60c0-24 19-43 43-43h23c24 0 43 19 43 43v42H40z" fill="#dc2d30" /><path d="M40 63h109v36H40z" fill="#e83c3e" /><path d="M35 100h119v10H35z" fill="#69242a" /><path d="M90 110h10v30H90z" fill="#52606c" /><path d="M72 140h46v8H72z" fill="#3d4752" /><circle cx="95" cy="75" r="14" fill="#fff" /><path d="M91 70h8v10h-8z" fill="#e83c3e" /><path d="M151 44l21 9-21 9z" fill="#ffad19" /><path d="M83 17v-8c0-8 12-8 12 0v8" fill="none" stroke="#52606c" strokeWidth="3" /></svg> }

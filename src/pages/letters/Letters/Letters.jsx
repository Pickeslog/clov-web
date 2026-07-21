import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as S from './Letters.style'
import { getLetters, markRead, sendLetter, toggleFavorite } from '../../../api/letter'
import { getRoomMembers } from '../../../api/room'

const EMOJIS = ['💌', '🍀', '💚', '✨', '🎉', '😊']
const DEFAULT_EMOJI = EMOJIS[0]

export default function Letters() {
  const { roomId } = useParams()
  const queryClient = useQueryClient()

  const [box, setBox] = useState('received')
  const [composing, setComposing] = useState(false)
  const [favoriteOnly, setFavoriteOnly] = useState(false)

  const [receiverUserId, setReceiverUserId] = useState('')
  const [broadcast, setBroadcast] = useState(false)
  const [content, setContent] = useState('')
  const [emoji, setEmoji] = useState(DEFAULT_EMOJI)
  const [message, setMessage] = useState('')

  const letters = useQuery({
    queryKey: ['letters', roomId, box],
    queryFn: () => getLetters(roomId, box),
  })

  const members = useQuery({
    queryKey: ['room', roomId, 'members'],
    queryFn: () => getRoomMembers(roomId),
    enabled: composing,
  })

  const invalidateLetters = () => queryClient.invalidateQueries({ queryKey: ['letters', roomId] })

  const sendMutation = useMutation({
    mutationFn: (payload) => sendLetter(roomId, payload),
    onSuccess: () => {
      invalidateLetters()
      setComposing(false)
      setBox('sent')
      setReceiverUserId('')
      setBroadcast(false)
      setContent('')
      setEmoji(DEFAULT_EMOJI)
      setMessage('')
    },
    onError: (error) => setMessage(error.message ?? '편지를 보내지 못했습니다.'),
  })

  const readMutation = useMutation({
    mutationFn: markRead,
    onSuccess: invalidateLetters,
  })

  const favoriteMutation = useMutation({
    mutationFn: toggleFavorite,
    onSuccess: invalidateLetters,
  })

  const handleSend = () => {
    setMessage('')
    if (!content.trim()) {
      setMessage('편지 내용을 작성해주세요! ✍️')
      return
    }
    if (!broadcast && !receiverUserId) {
      setMessage('받는 사람을 선택하거나 모두에게 보내기를 켜주세요.')
      return
    }

    sendMutation.mutate(
      broadcast
        ? { broadcast: true, content: content.trim(), emoji }
        : { receiverUserId, content: content.trim(), emoji },
    )
  }

  const items = letters.data?.items ?? []
  const visibleItems = favoriteOnly ? items.filter((letter) => letter.isFavorite) : items
  const memberItems = (members.data?.items ?? []).filter((member) => member.status === 'ACTIVE')
  const previewName = box === 'sent' ? '나' : '나'

  return (
    <S.Page>
      <S.TopBar>
        <Link to={`/rooms/${roomId}`} style={{ textDecoration: 'none' }}>
          <S.Brand>Clov.</S.Brand>
        </Link>
      </S.TopBar>

      <S.Header>
        <S.Title>행운편지</S.Title>
        <S.Desc>마음을 담은 행운 편지를 직접 작성해 보내보세요.</S.Desc>
      </S.Header>

      <S.Filters>
        <S.FilterBtn type="button" $active={!composing && box === 'received'} onClick={() => { setComposing(false); setBox('received') }}>
          받은 편지함
        </S.FilterBtn>
        <S.FilterBtn type="button" $active={!composing && box === 'sent'} onClick={() => { setComposing(false); setBox('sent') }}>
          보낸 편지함
        </S.FilterBtn>
        <S.FilterBtn type="button" $active={composing} onClick={() => setComposing(true)}>
          편지 쓰기
        </S.FilterBtn>
      </S.Filters>

      {!composing && (
        <S.FavoriteToggle>
          <input
            type="checkbox"
            checked={favoriteOnly}
            onChange={(event) => setFavoriteOnly(event.target.checked)}
          />
          <span>즐겨찾기만 보기</span>
        </S.FavoriteToggle>
      )}

      {composing ? (
        <S.ComposeForm>
          <S.Field>
            <S.Label htmlFor="letter-receiver">받는 사람</S.Label>
            <S.Select
              id="letter-receiver"
              value={receiverUserId}
              disabled={broadcast}
              onChange={(event) => setReceiverUserId(event.target.value)}
            >
              <option value="">선택해주세요</option>
              {memberItems.map((member) => (
                <option key={member.userId} value={member.userId}>
                  {member.nickname}
                </option>
              ))}
            </S.Select>
          </S.Field>

          <S.BroadcastToggle>
            <input
              type="checkbox"
              checked={broadcast}
              onChange={(event) => {
                setBroadcast(event.target.checked)
                if (event.target.checked) setReceiverUserId('')
              }}
            />
            <span>모두에게 보내기</span>
          </S.BroadcastToggle>

          <S.Field>
            <S.Label htmlFor="letter-content">편지 내용</S.Label>
            <S.Textarea
              id="letter-content"
              value={content}
              placeholder="전하고 싶은 마음을 적어주세요."
              onChange={(event) => setContent(event.target.value)}
            />
          </S.Field>

          <S.Field>
            <S.Label>편지 장식 이모지</S.Label>
            <S.EmojiRow>
              {EMOJIS.map((candidate) => (
                <S.EmojiChip
                  key={candidate}
                  type="button"
                  $active={emoji === candidate}
                  onClick={() => setEmoji(candidate)}
                >
                  {candidate}
                </S.EmojiChip>
              ))}
            </S.EmojiRow>
          </S.Field>

          <S.PreviewCard>
            <S.PreviewMeta>
              {emoji} {broadcast ? 'To. 전체' : `To. ${memberItems.find((member) => String(member.userId) === receiverUserId)?.nickname ?? '?'}`}
            </S.PreviewMeta>
            <S.PreviewBody>{content || '내용을 입력하면 여기에 미리보기가 표시됩니다.'}</S.PreviewBody>
            <S.PreviewMeta>From. {previewName}</S.PreviewMeta>
          </S.PreviewCard>

          <S.SendBtn type="button" onClick={handleSend} disabled={sendMutation.isPending}>
            {sendMutation.isPending ? '보내는 중…' : '편지 보내기'}
          </S.SendBtn>
          {message && <S.Message role="alert">{message}</S.Message>}
        </S.ComposeForm>
      ) : letters.isPending ? (
        <S.State>불러오는 중…</S.State>
      ) : letters.isError ? (
        <S.State>편지함을 불러오지 못했습니다.</S.State>
      ) : visibleItems.length === 0 ? (
        <S.Empty>
          {favoriteOnly
            ? '즐겨찾기한 편지가 없습니다. 편지 우상단의 별을 눌러 즐겨찾기해 보세요!'
            : '아직 편지가 없습니다.'}
        </S.Empty>
      ) : (
        <S.List>
          {visibleItems.map((letter) => (
            <S.Card key={letter.id}>
              <S.CardTop>
                <S.StarBtn
                  type="button"
                  $active={letter.isFavorite}
                  aria-label={letter.isFavorite ? '즐겨찾기 해제' : '즐겨찾기'}
                  onClick={() => favoriteMutation.mutate(letter.id)}
                  disabled={favoriteMutation.isPending}
                >
                  {letter.isFavorite ? '★' : '☆'}
                </S.StarBtn>
                <S.CardMeta>
                  {box === 'received' ? `From. ${letter.sender.nickname}` : `To. ${letter.receiver.nickname}`}
                </S.CardMeta>
                {box === 'received' && !letter.readAt && (
                  <S.ReadBtn type="button" onClick={() => readMutation.mutate(letter.id)} disabled={readMutation.isPending}>
                    읽음 표시
                  </S.ReadBtn>
                )}
              </S.CardTop>
              <S.CardBody>
                {letter.emoji ? `${letter.emoji} ` : ''}
                {letter.content}
              </S.CardBody>
            </S.Card>
          ))}
        </S.List>
      )}
    </S.Page>
  )
}

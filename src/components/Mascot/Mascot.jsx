import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import './Mascot.css'
import { getPreferences } from '../../api/user'
import { interactMascot } from '../../api/room'
import crobiSprite from '../../assets/mascot/crobi.png'
import robSprite from '../../assets/mascot/rob.png'

const SPRITES = { crobi: crobiSprite, rob: robSprite }
const LINES = {
  crobi: ['안녕!', '오늘도 좋은 하루!', '뭐 하고 있었어?', '같이 추억 쌓아볼까?'],
  rob: ['안녕, 나는 롭이야!', '오늘도 함께해줘서 고마워', '다음 약속은 뭐야?', '추억을 기록해보자'],
}
const LIMIT_MESSAGE = '오늘은 여기까지!'
const SAY_MS = 1800

// 마스코트 기본 교감(#90) — 대시보드에 <Mascot roomId={roomId} /> 한 줄만 추가해 쓴다.
// 클릭 → POST mascot/interact(+2 XP, 하루 3회 제한, 계약 §12). 연타·방치 애니메이션·드래그는 범위 밖.
export default function Mascot({ roomId }) {
  const queryClient = useQueryClient()
  const prefs = useQuery({ queryKey: ['preferences'], queryFn: getPreferences })
  const [bubble, setBubble] = useState('')
  const bubbleTimer = useRef(null)

  useEffect(() => () => clearTimeout(bubbleTimer.current), [])

  const mascotType = prefs.data?.mascotType === 'rob' ? 'rob' : 'crobi'

  const showBubble = (text) => {
    setBubble(text)
    clearTimeout(bubbleTimer.current)
    bubbleTimer.current = setTimeout(() => setBubble(''), SAY_MS)
  }
  const pickLine = () => {
    const pool = LINES[mascotType]
    return pool[Math.floor(Math.random() * pool.length)]
  }

  const interactMutation = useMutation({
    mutationFn: () => interactMascot(roomId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['room', roomId, 'level'] })
      showBubble(pickLine())
    },
    onError: (err) => {
      showBubble(err.code === 'MASCOT_INTERACTION_LIMIT_REACHED' ? LIMIT_MESSAGE : (err.message || '잠시 후 다시 시도해 주세요.'))
    },
  })

  if (prefs.isPending || prefs.isError) return null

  return (
    <div className="clov-mascot" data-character={mascotType}>
      {bubble && <div className="clov-mascot-bubble">{bubble}</div>}
      <button
        type="button"
        className="clov-mascot-hit"
        aria-label="마스코트와 교감하기"
        disabled={interactMutation.isPending}
        onClick={() => interactMutation.mutate()}
      >
        <img className="clov-mascot-sprite" src={SPRITES[mascotType]} alt="" draggable="false" />
      </button>
    </div>
  )
}

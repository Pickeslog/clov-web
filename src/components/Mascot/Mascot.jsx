import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import './Mascot.css'
import { getPreferences } from '../../api/user'
import { interactMascot } from '../../api/room'
import crobiSprite from '../../assets/mascot/crobi.png'
import robSprite from '../../assets/mascot/rob.png'
import burgerOldmanSprite from '../../assets/mascot/burger-oldman.png'
import takoGunSprite from '../../assets/mascot/tako-gun.png'
import kimCheolsuSprite from '../../assets/mascot/kim-cheolsu.png'

const SPRITES = {
  crobi: crobiSprite,
  rob: robSprite,
  burgerOldman: burgerOldmanSprite,
  takoGun: takoGunSprite,
  kimCheolsu: kimCheolsuSprite,
}
const LINES = {
  crobi: ['안녕!', '오늘도 좋은 하루!', '뭐 하고 있었어?', '같이 추억 쌓아볼까?'],
  rob: ['안녕, 나는 롭이야!', '오늘도 함께해줘서 고마워', '다음 약속은 뭐야?', '추억을 기록해보자'],
  burgerOldman: ['어서 와!', '오늘도 든든하게 보내자!', '따끈한 하루가 되길!', '버거는 마음까지 든든하게 하지!'],
  takoGun: ['타코군 등장!', '오늘도 신나게 가보자!', '재밌는 일이 생길 것 같아!', '같이 추억을 휘감아볼까?'],
  kimCheolsu: ['안녕, 김철수야!', '오늘도 차근차근 만들어보자!', '좋은 추억은 오래가는 법이지!', '필요하면 내가 뚝딱 해줄게!'],
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

  // 아는 값만 통과시키고 나머지는 크로비로 떨어뜨린다 — 백엔드에 mascotType 검증이 없어서
  // 임의 문자열이 저장될 수 있다(별건으로 처리 예정). 'robot'을 같이 받는 건 계약에만 있던
  // 옛 값이라서다(실제 저장값은 'rob' — 계약 정정도 별건).
  // 아는 값만 통과시키고 나머지는 크로비로 떨어뜨린다. 'robot'은 프로토타입 위젯에서만 쓰는
  // 옛 이름이라 rob으로 받아준다(실제 저장값은 rob — 계약 §5).
  // ★ hasOwn을 쓰는 이유: SPRITES['constructor']는 Object 함수를 돌려줘 truthy다. 그냥
  //    SPRITES[stored]로 판정하면 src에 함수가 들어가 이미지가 깨진다(실제로 재현됨).
  const stored = prefs.data?.mascotType === 'robot' ? 'rob' : prefs.data?.mascotType
  const mascotType = Object.hasOwn(SPRITES, stored ?? '') ? stored : 'crobi'
  // 장착한 코스튬이 있으면 기본 스프라이트 대신 코스튬 이미지로 완전히 교체한다.
  const equippedSprite = prefs.data?.equippedItem?.imageUrl

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
        <img className="clov-mascot-sprite" src={equippedSprite || SPRITES[mascotType]} alt="" draggable="false" />
      </button>
    </div>
  )
}

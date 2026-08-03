import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import './Mascot.css'
import { getMe, getPreferences } from '../../api/user'
import { interactMascot } from '../../api/room'
import crobiSprite from '../../assets/mascot/crobi.png'
import robSprite from '../../assets/mascot/rob.png'
import robPulledSprite from '../../assets/mascot/rob-pulled.png'
import robScaredSprite from '../../assets/mascot/rob-scared.png'
import robAngrySprite from '../../assets/mascot/rob-angry.png'
import robDizzySprite from '../../assets/mascot/rob-dizzy.png'
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
// 롭 전용 이스터에그 상태별 스프라이트(#155, 목업 croby-mascot.js CHARACTERS.robot 이식).
// 다른 캐릭터는 기본 교감만 하므로 상태 스프라이트가 없다.
const ROB_STATE_SPRITES = {
  lifted: robPulledSprite,
  scared: robScaredSprite,
  angry: robAngrySprite,
  dizzy: robDizzySprite,
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

// 롭 전용 이스터에그 타이밍/문구 — 목업 CONFIG·DRAG_LINES·TEXT.robot.dizzy 그대로(#155).
const CLICK_WINDOW_MS = 900
const CLICKS_TO_DIZZY = 3
const DIZZY_MS = 1200
const DRAG_START_PX = 6
const SCARED_HEIGHT_PX = 150
const ANGRY_AFTER_SCARED_MS = 3000
const ANGRY_MS = 1400
const DRAG_LINES = { lifted: '오오 늘어난다..', scared: '너무 높아!!' }
const DIZZY_LINE = '001011010101(어지러워..)'

// 마스코트 기본 교감(#90) + 롭 전용 이스터에그(#155) — 대시보드에 <Mascot roomId={roomId} /> 한 줄만 추가해 쓴다.
// 클릭 → POST mascot/interact(+2 XP, 하루 3회 제한, 계약 §12).
//
// ★ 교감(API 호출)과 이스터에그(로컬 연출)를 분리한다(리더 리뷰, #155) — 마스코트가 <button>이라
// 클릭 한 번이 곧 API 호출 한 번인데, 드래그·롱홀드도 놓는 순간 click이 발화하고 3연타는 클릭
// 3번이라, 그대로 두면 이스터에그 하나 보다가 하루 교감 한도(3회)가 통째로 날아간다.
// - 드래그·롱홀드: 포인터가 임계값 이상 움직이면 그 뒤에 이어지는 click을 무시한다(justDraggedRef).
//   순수 연출이라 API를 아예 안 부른다.
// - 3연타: 콤보의 첫 클릭만 교감으로 보내고 2·3번째는 dizzy 판정에만 쓴다(API 호출 없음).
// - disabled로 버튼을 잠그면(기존 코드) 연타 판정(900ms) 중간에 버튼이 죽어 dizzy 자체가 안 뜬다 —
//   버튼은 항상 눌리게 두고, 요청이 도는 동안의 중복 호출만 뮤테이션 쪽(isPending 체크)에서 막는다.
export default function Mascot({ roomId }) {
  const queryClient = useQueryClient()
  const me = useQuery({ queryKey: ['me'], queryFn: getMe })
  const prefs = useQuery({ queryKey: ['preferences'], queryFn: getPreferences })
  const [bubble, setBubble] = useState('')
  const bubbleTimer = useRef(null)

  // eggMode: 'default' | 'lifted' | 'scared' | 'angry' | 'dizzy' — 롭 전용, 렌더링(스프라이트·CSS
  // 클래스·말풍선 문구)에 쓰는 state. 실제 판정 로직은 eggModeRef(항상 최신)로 한다 — window에 붙는
  // pointermove/pointerup 리스너는 마운트 시 한 번만 등록되므로 React state를 직접 읽으면 그 시점의
  // 값에 갇힌다(stale closure).
  const [eggMode, setEggMode] = useState('default')
  const eggModeRef = useRef('default')
  const setEgg = (next) => { eggModeRef.current = next; setEggMode(next) }

  const rootRef = useRef(null)
  const pendingDragRef = useRef(false)
  const isDraggingRef = useRef(false)
  const justDraggedRef = useRef(false)
  const dragStartRef = useRef({ x: 0, y: 0 })
  const dockCenterRef = useRef({ x: 0, y: 0 })
  const clickTimesRef = useRef([])
  const dizzyTimerRef = useRef(null)
  const angryTimerRef = useRef(null)
  const angryEndTimerRef = useRef(null)

  useEffect(() => () => {
    clearTimeout(bubbleTimer.current)
    clearTimeout(dizzyTimerRef.current)
    clearTimeout(angryTimerRef.current)
    clearTimeout(angryEndTimerRef.current)
  }, [])

  // 아는 값만 통과시키고 나머지는 크로비로 떨어뜨린다 — 백엔드에 mascotType 검증이 없어서
  // 임의 문자열이 저장될 수 있다(별건으로 처리 예정). 'robot'을 같이 받는 건 계약에만 있던
  // 옛 값이라서다(실제 저장값은 'rob' — 계약 정정도 별건).
  // ★ hasOwn을 쓰는 이유: SPRITES['constructor']는 Object 함수를 돌려줘 truthy다. 그냥
  //    SPRITES[stored]로 판정하면 src에 함수가 들어가 이미지가 깨진다(실제로 재현됨).
  const stored = prefs.data?.mascotType === 'robot' ? 'rob' : prefs.data?.mascotType
  const mascotType = Object.hasOwn(SPRITES, stored ?? '') ? stored : 'crobi'
  const isRob = mascotType === 'rob'
  // 장착한 코스튬이 있으면 기본 스프라이트 대신 코스튬 이미지로 완전히 교체한다(이스터에그
  // 상태 스프라이트보다도 우선 — 코스튬엔 상태별 변형이 없어서 상태 스프라이트로 바꿔봐야
  // 의미가 없다).
  const equippedSprite = prefs.data?.equippedItem?.imageUrl
  const spriteSrc = equippedSprite || (isRob ? ROB_STATE_SPRITES[eggMode] : null) || SPRITES[mascotType]

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
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['room', roomId, 'level'] })
      // 헤더 골드 배지도 즉시 갱신 — 상점(Shop.jsx)의 구매 성공 시와 동일한 무효화 키.
      queryClient.invalidateQueries({ queryKey: ['wallet'] })
      // 하루 3회 제한(교감)과 별개로 하루 총 골드 상한(§15-4, 500)에 걸리면 서버가 조용히
      // 0을 지급한다 — 응답의 실지급액(earnedGold)을 그대로 보여줘야 화면이 거짓말하지 않는다.
      const gold = data?.earnedGold ?? 0
      showBubble(gold > 0 ? `${pickLine()} (+${gold}G)` : pickLine())
    },
    onError: (err) => {
      showBubble(err.code === 'MASCOT_INTERACTION_LIMIT_REACHED' ? LIMIT_MESSAGE : (err.message || '잠시 후 다시 시도해 주세요.'))
    },
  })

  // ── 롭 전용: 머리를 잡고 들어올리는 드래그 → scared → angry(#155, 목업 그대로) ──
  const springBack = () => {
    if (!rootRef.current) return
    rootRef.current.style.transition = 'transform .4s cubic-bezier(.34,1.56,.64,1)'
    rootRef.current.style.transform = ''
  }

  const triggerAngry = () => {
    if (!isDraggingRef.current) return // 그 사이 놓아서 이미 endDrag로 정리됐으면 무시
    isDraggingRef.current = false
    setEgg('angry')
    springBack()
    clearTimeout(angryEndTimerRef.current)
    angryEndTimerRef.current = setTimeout(() => {
      if (eggModeRef.current === 'angry') setEgg('default')
    }, ANGRY_MS)
  }

  const enterScared = () => {
    setEgg('scared')
    clearTimeout(angryTimerRef.current)
    angryTimerRef.current = setTimeout(triggerAngry, ANGRY_AFTER_SCARED_MS)
  }

  const followPointer = (clientX, clientY) => {
    if (!rootRef.current) return
    const dx = clientX - dockCenterRef.current.x
    const dy = clientY - dockCenterRef.current.y
    rootRef.current.style.transform = `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px)`
    if (eggModeRef.current === 'lifted' && (dockCenterRef.current.y - clientY) > SCARED_HEIGHT_PX) {
      enterScared()
    }
  }

  const startLift = (clientX, clientY) => {
    isDraggingRef.current = true
    pendingDragRef.current = false
    justDraggedRef.current = true
    clearTimeout(bubbleTimer.current)
    const rect = rootRef.current.getBoundingClientRect()
    dockCenterRef.current = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
    if (rootRef.current) rootRef.current.style.transition = 'none'
    setEgg('lifted')
    followPointer(clientX, clientY) // 처음부터 임계 높이를 넘겨 잡았으면 바로 scared로
  }

  const endDrag = () => {
    if (!isDraggingRef.current) return
    isDraggingRef.current = false
    clearTimeout(angryTimerRef.current)
    springBack()
    setEgg('default')
  }

  useEffect(() => {
    const onPointerMove = (e) => {
      if (pendingDragRef.current && !isDraggingRef.current) {
        if (Math.hypot(e.clientX - dragStartRef.current.x, e.clientY - dragStartRef.current.y) > DRAG_START_PX) {
          startLift(e.clientX, e.clientY)
        }
      } else if (isDraggingRef.current) {
        followPointer(e.clientX, e.clientY)
      }
    }
    const onPointerUp = () => {
      pendingDragRef.current = false
      endDrag()
    }
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerUp)
    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerUp)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onPointerDown = (e) => {
    if (!isRob || eggModeRef.current !== 'default') return
    const rect = e.currentTarget.getBoundingClientRect()
    if (e.clientY - rect.top > rect.height * 0.5) return // 상단 절반(머리 부분)을 잡았을 때만
    dragStartRef.current = { x: e.clientX, y: e.clientY }
    pendingDragRef.current = true
  }

  // ── 클릭: 기본 교감(+2 XP). 롭은 0.9초 내 3연타면 dizzy(연출만, API 없음) ──
  const onMascotClick = () => {
    if (justDraggedRef.current) { justDraggedRef.current = false; return } // 드래그 직후 따라오는 click
    if (eggModeRef.current !== 'default') return // scared/angry/dizzy 진행 중엔 새 교감을 받지 않는다

    if (!isRob) {
      if (interactMutation.isPending) return
      interactMutation.mutate()
      return
    }

    const now = Date.now()
    clickTimesRef.current = clickTimesRef.current.filter((t) => now - t < CLICK_WINDOW_MS)
    clickTimesRef.current.push(now)
    const comboCount = clickTimesRef.current.length

    if (comboCount >= CLICKS_TO_DIZZY) {
      clickTimesRef.current = []
      setEgg('dizzy')
      clearTimeout(dizzyTimerRef.current)
      dizzyTimerRef.current = setTimeout(() => {
        if (eggModeRef.current === 'dizzy') setEgg('default')
      }, DIZZY_MS)
      return // 콤보를 완성시킨 3번째 클릭 — 교감 API는 안 부른다
    }
    if (comboCount >= 2) return // 콤보 진행 중인 2번째 클릭 — 아직 dizzy는 아니지만 API도 안 부른다

    if (interactMutation.isPending) return
    interactMutation.mutate()
  }

  if (prefs.isPending || prefs.isError) return null

  const eggBubbleText =
    eggMode === 'lifted' ? DRAG_LINES.lifted
    : eggMode === 'scared' ? DRAG_LINES.scared
    : eggMode === 'angry' ? `날 내려놔, ${me.data?.nickname || '사용자'}!`
    : eggMode === 'dizzy' ? DIZZY_LINE
    : bubble

  return (
    <div
      className={`clov-mascot${isRob && eggMode !== 'default' ? ` clov-mascot--${eggMode}` : ''}`}
      data-character={mascotType}
      ref={rootRef}
    >
      {eggBubbleText && <div className="clov-mascot-bubble">{eggBubbleText}</div>}
      <button
        type="button"
        className="clov-mascot-hit"
        aria-label="마스코트와 교감하기"
        onPointerDown={onPointerDown}
        onClick={onMascotClick}
      >
        <img className="clov-mascot-sprite" src={spriteSrc} alt="" draggable="false" />
      </button>
    </div>
  )
}

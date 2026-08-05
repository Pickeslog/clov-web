import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import './Mascot.css'
import { getMe, getPreferences } from '../../api/user'
import { interactMascot } from '../../api/room'
// 스프라이트는 assets/mascot/<캐릭터>/<상태>.png 로 캐릭터별 폴더에 둔다.
// 새 캐릭터는 assets/mascot/_template의 9개 표준 상태와 파일명을 따른다.
import crobiSprite from '../../assets/mascot/crobi/default.png'
import crobiPulledSprite from '../../assets/mascot/crobi/pulled.png'
import crobiScaredSprite from '../../assets/mascot/crobi/scared.png'
import crobiAngrySprite from '../../assets/mascot/crobi/angry.png'
import crobiDizzySprite from '../../assets/mascot/crobi/dizzy.png'
import crobiSleepySprite from '../../assets/mascot/crobi/sleepy.png'
import crobiFindSprite from '../../assets/mascot/crobi/find.png'
import crobiPencilSprite from '../../assets/mascot/crobi/pencil.png'
import crobiSmileSprite from '../../assets/mascot/crobi/smile.png'
import robSprite from '../../assets/mascot/rob/idle.png'
import robPulledSprite from '../../assets/mascot/rob/pulled.png'
import robScaredSprite from '../../assets/mascot/rob/scared.png'
import robAngrySprite from '../../assets/mascot/rob/angry.png'
import robDizzySprite from '../../assets/mascot/rob/dizzy.png'
import robSleepySprite from '../../assets/mascot/rob/sleep.png'
import robFindSprite from '../../assets/mascot/rob/find.png'
import robPencilSprite from '../../assets/mascot/rob/pencil.png'
import robSmileSprite from '../../assets/mascot/rob/smile.png'
import burgerOldmanSprite from '../../assets/mascot/burger-oldman/default.png'
import takoGunSprite from '../../assets/mascot/tako-gun/default.png'
import takoGunPulledSprite from '../../assets/mascot/tako-gun/pulled.png'
import takoGunScaredSprite from '../../assets/mascot/tako-gun/scared.png'
import takoGunAngrySprite from '../../assets/mascot/tako-gun/angry.png'
import takoGunDizzySprite from '../../assets/mascot/tako-gun/dizzy.png'
import takoGunSleepySprite from '../../assets/mascot/tako-gun/sleepy.png'
import takoGunFindSprite from '../../assets/mascot/tako-gun/find.png'
import takoGunPencilSprite from '../../assets/mascot/tako-gun/pencil.png'
import takoGunSmileSprite from '../../assets/mascot/tako-gun/smile.png'
import kimCheolsuSprite from '../../assets/mascot/kim-cheolsu/default.png'
import kimCheolsuPulledSprite from '../../assets/mascot/kim-cheolsu/pulled.png'
import kimCheolsuScaredSprite from '../../assets/mascot/kim-cheolsu/scared.png'
import kimCheolsuAngrySprite from '../../assets/mascot/kim-cheolsu/angry.png'
import kimCheolsuDizzySprite from '../../assets/mascot/kim-cheolsu/dizzy.png'
import kimCheolsuSleepySprite from '../../assets/mascot/kim-cheolsu/sleepy.png'
import kimCheolsuFindSprite from '../../assets/mascot/kim-cheolsu/find.png'
import kimCheolsuPencilSprite from '../../assets/mascot/kim-cheolsu/pencil.png'
import kimCheolsuSmileSprite from '../../assets/mascot/kim-cheolsu/smile.png'
import onyxSprite from '../../assets/mascot/onyx/default.png'
import onyxPulledSprite from '../../assets/mascot/onyx/pulled.png'
import onyxScaredSprite from '../../assets/mascot/onyx/scared.png'
import onyxAngrySprite from '../../assets/mascot/onyx/angry.png'
import onyxDizzySprite from '../../assets/mascot/onyx/dizzy.png'
import onyxSleepySprite from '../../assets/mascot/onyx/sleepy.png'
import onyxFindSprite from '../../assets/mascot/onyx/find.png'
import onyxPencilSprite from '../../assets/mascot/onyx/pencil.png'
import onyxSmileSprite from '../../assets/mascot/onyx/smile.png'

const SPRITES = {
  crobi: crobiSprite,
  rob: robSprite,
  burgerOldman: burgerOldmanSprite,
  takoGun: takoGunSprite,
  kimCheolsu: kimCheolsuSprite,
  onyx: onyxSprite,
}
// 9개 상태 스프라이트를 모두 가진 캐릭터는 같은 클릭·수면·드래그 상태 머신을 공유한다.
// 버거노인처럼 default만 있는 캐릭터는 기존 기본 교감만 유지한다.
const MASCOT_STATE_SPRITES = {
  crobi: {
    default: crobiSprite,
    lifted: crobiPulledSprite,
    scared: crobiScaredSprite,
    angry: crobiAngrySprite,
    dizzy: crobiDizzySprite,
    sleepy: crobiSleepySprite,
    find: crobiFindSprite,
    pencil: crobiPencilSprite,
    smile: crobiSmileSprite,
  },
  rob: {
    default: robSprite,
    lifted: robPulledSprite,
    scared: robScaredSprite,
    angry: robAngrySprite,
    dizzy: robDizzySprite,
    sleepy: robSleepySprite,
    find: robFindSprite,
    pencil: robPencilSprite,
    smile: robSmileSprite,
  },
  takoGun: {
    default: takoGunSprite,
    lifted: takoGunPulledSprite,
    scared: takoGunScaredSprite,
    angry: takoGunAngrySprite,
    dizzy: takoGunDizzySprite,
    sleepy: takoGunSleepySprite,
    find: takoGunFindSprite,
    pencil: takoGunPencilSprite,
    smile: takoGunSmileSprite,
  },
  kimCheolsu: {
    default: kimCheolsuSprite,
    lifted: kimCheolsuPulledSprite,
    scared: kimCheolsuScaredSprite,
    angry: kimCheolsuAngrySprite,
    dizzy: kimCheolsuDizzySprite,
    sleepy: kimCheolsuSleepySprite,
    find: kimCheolsuFindSprite,
    pencil: kimCheolsuPencilSprite,
    smile: kimCheolsuSmileSprite,
  },
  onyx: {
    default: onyxSprite,
    lifted: onyxPulledSprite,
    scared: onyxScaredSprite,
    angry: onyxAngrySprite,
    dizzy: onyxDizzySprite,
    sleepy: onyxSleepySprite,
    find: onyxFindSprite,
    pencil: onyxPencilSprite,
    smile: onyxSmileSprite,
  },
}
const skinStateSprites = (root) => ({
  default: `${root}/default.png`,
  lifted: `${root}/pulled.png`,
  scared: `${root}/scared.png`,
  angry: `${root}/angry.png`,
  dizzy: `${root}/dizzy.png`,
  sleepy: `${root}/sleepy.png`,
  find: `${root}/find.png`,
  pencil: `${root}/pencil.png`,
  smile: `${root}/smile.png`,
})
const EQUIPPED_SKIN_STATE_SPRITES = [
  '/shop/skins/rob/arcade-boss-legendary',
  '/shop/skins/rob/last-signal-epic',
  '/shop/skins/rob/yellow-crew-common',
  '/shop/skins/rob/explorer-uncommon',
  '/shop/skins/kim-cheolsu/steel-frame-safety-uncommon',
  '/shop/skins/kim-cheolsu/junior-developer-uncommon',
  '/shop/skins/tako-gun/rov-pilot-rare',
  '/shop/skins/tako-gun/watermelon-rind-hat-common',
  '/shop/skins/crobi/ocean-rescue-champion-epic',
  '/shop/skins/crobi/magic-school-student-common',
  '/shop/skins/crobi/senior-developer-uncommon',
  '/shop/skins/crobi/dawn-starlight-archivist-legendary',
  '/shop/skins/onyx/blackstar-atelier-uncommon',
  '/shop/skins/onyx/development-team-lead-epic',
].map((root) => ({
  defaultPath: `${root}/default.png`,
  states: skinStateSprites(root),
}))
const equippedSkinStates = (imageUrl) => {
  const path = imageUrl?.split(/[?#]/, 1)[0]
  return EQUIPPED_SKIN_STATE_SPRITES.find(({ defaultPath }) => path?.endsWith(defaultPath))?.states
}
const LINES = {
  crobi: ['안녕!', '오늘도 좋은 하루!', '뭐 하고 있었어?', '같이 추억 쌓아볼까?'],
  rob: ['안녕, 나는 롭이야!', '오늘도 함께해줘서 고마워', '다음 약속은 뭐야?', '추억을 기록해보자'],
  burgerOldman: ['어서 와!', '오늘도 든든하게 보내자!', '따끈한 하루가 되길!', '버거는 마음까지 든든하게 하지!'],
  takoGun: ['타코군 등장!', '오늘도 신나게 가보자!', '재밌는 일이 생길 것 같아!', '같이 추억을 휘감아볼까?'],
  kimCheolsu: ['안녕, 김철수야!', '오늘도 차근차근 만들어보자!', '좋은 추억은 오래가는 법이지!', '필요하면 내가 뚝딱 해줄게!'],
  onyx: ['안녕, 오닉스야!', '빛나는 추억을 세공해볼까?', '작은 순간도 보석처럼 소중해!', '오늘의 추억은 어떤 빛일까?'],
}
const LIMIT_MESSAGE = '오늘은 여기까지!'
const SAY_MS = 1800
const IDLE_MS = 20000
const INTERACTIVE_STATES = ['lifted', 'scared', 'angry', 'dizzy', 'sleepy', 'find', 'pencil', 'smile']
const CLICK_EXTRAS = [
  { spriteKey: 'find', text: '기록된 추억을 되돌아보자!' },
  { spriteKey: 'pencil', text: '추억을 남기는 습관은 좋은 거야' },
  { spriteKey: 'smile', text: '오늘도 좋은 추억을 만들어 보자!' },
]
// 롭 전용 코드창 말풍선 타이핑 속도(글자당 ms) — 목업 CONFIG.typeMs 그대로(#155, #216).
const TYPE_MS = 55

// 공통 마스코트 상태 머신 타이밍. 롭의 기존 이스터에그 동작값을 모든 완성 세트에 재사용한다.
//
// ★ 연타 판정만 목업(croby-mascot.js CONFIG: 3번 / 900ms)에서 의도적으로 벗어났다.
//    900ms에 3번은 클릭 간격 450ms — "연타"가 아니라 보통 클릭 속도라, 그냥 교감하려던
//    사용자가 계속 어지러움에 걸렸다. 목업에서는 크로비도 같은 값이었지만 앱에서는
//    상태 스프라이트가 롭에만 있어 이 코드에 도달하지 않았고, 크로비 세트가 채워지면서
//    기본 마스코트를 쓰는 모든 사용자가 밟게 됐다.
//    간격 기준을 250ms로 잡고(≈ 더블클릭 속도를 이어서 치는 정도) 5번으로 올렸다.
//    5번 × 250ms = 1000ms. 횟수만 올리고 창을 그대로 두면 되레 쉬워지므로 같이 옮긴다.
const CLICK_WINDOW_MS = 1000
const CLICKS_TO_DIZZY = 5
const DIZZY_MS = 1200
// 콤보 중간 클릭(2~4번째)의 로컬 연출. 목업 croby-nudge와 같은 값이고, 같은 이유로
// 키프레임을 2벌 두고 번갈아 건다 — 같은 클래스를 다시 붙이면 애니메이션이 재시작하지 않는다.
const NUDGE_MS = 380
const DRAG_START_PX = 6
const SCARED_HEIGHT_PX = 150
const ANGRY_AFTER_SCARED_MS = 3000
const ANGRY_MS = 1400
const DRAG_LINES = { lifted: '오오 늘어난다..', scared: '너무 높아!!' }
const DIZZY_LINE = '001011010101(어지러워..)'

// 마스코트 기본 교감(#90) + 상태 스프라이트 인터랙션(#155).
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
  const [reactionMode, setReactionMode] = useState('default')
  const reactionModeRef = useRef('default')
  const setReaction = (next) => { reactionModeRef.current = next; setReactionMode(next) }
  // 롭 전용 타이핑 효과 진행 길이 — 다른 캐릭터는 항상 전체 길이로 즉시 표시된다.
  const [typedLen, setTypedLen] = useState(0)
  const typeTimerRef = useRef(null)

  // eggMode: 'default' | 'lifted' | 'scared' | 'angry' | 'dizzy' | 'sleepy' — 렌더링(스프라이트·CSS
  // 클래스·말풍선 문구)에 쓰는 state. 실제 판정 로직은 eggModeRef(항상 최신)로 한다 — window에 붙는
  // pointermove/pointerup 리스너는 마운트 시 한 번만 등록되므로 React state를 직접 읽으면 그 시점의
  // 값에 갇힌다(stale closure).
  const [eggMode, setEggMode] = useState('default')
  const eggModeRef = useRef('default')
  const setEgg = (next) => {
    if (next !== 'default') setReaction('default')
    eggModeRef.current = next
    setEggMode(next)
  }

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
  const idleTimerRef = useRef(null)
  const reactionTimerRef = useRef(null)
  const pendingReactionRef = useRef(null)
  // nudge: '' | 'nudge' | 'nudge2' — 콤보 중간 클릭의 흔들림. 목업과 같이 키프레임 2벌을
  // 번갈아 쓴다(같은 클래스를 다시 붙이면 CSS 애니메이션이 재시작하지 않는다).
  const [nudge, setNudge] = useState('')
  const nudgeFlipRef = useRef(false)
  const nudgeTimerRef = useRef(null)

  useEffect(() => () => {
    clearTimeout(bubbleTimer.current)
    clearTimeout(nudgeTimerRef.current)
    clearTimeout(dizzyTimerRef.current)
    clearTimeout(angryTimerRef.current)
    clearTimeout(angryEndTimerRef.current)
    clearTimeout(idleTimerRef.current)
    clearTimeout(reactionTimerRef.current)
    clearInterval(typeTimerRef.current)
  }, [])

  // 아는 값만 통과시키고 나머지는 크로비로 떨어뜨린다 — 백엔드에 mascotType 검증이 없어서
  // 임의 문자열이 저장될 수 있다(별건으로 처리 예정). 'robot'을 같이 받는 건 계약에만 있던
  // 옛 값이라서다(실제 저장값은 'rob' — 계약 정정도 별건).
  // ★ hasOwn을 쓰는 이유: SPRITES['constructor']는 Object 함수를 돌려줘 truthy다. 그냥
  //    SPRITES[stored]로 판정하면 src에 함수가 들어가 이미지가 깨진다(실제로 재현됨).
  const stored = prefs.data?.mascotType === 'robot' ? 'rob' : prefs.data?.mascotType
  const mascotType = Object.hasOwn(SPRITES, stored ?? '') ? stored : 'crobi'
  const equippedSprite = prefs.data?.equippedItem?.imageUrl
  const equippedStateSprites = equippedSkinStates(equippedSprite)
  const stateSprites = equippedStateSprites || MASCOT_STATE_SPRITES[mascotType] || { default: SPRITES[mascotType] }
  const hasFullStateSet = INTERACTIVE_STATES.every((state) => Boolean(stateSprites[state]))
  // 9개 상태를 가진 스킨은 현재 상태에 맞는 스킨 이미지를 쓰고, 단일 이미지 코스튬은 기존처럼
  // 장착 이미지 한 장이 모든 상태보다 우선한다.
  // 롭만 코드창 말풍선을 쓴다 — '> ' 프롬프트 + 한 글자씩 타이핑(#216, 목업 TEXT.robot).
  const isRob = mascotType === 'rob'
  const withPrompt = (text) => (isRob ? `> ${text}` : text)
  // 상태 스프라이트가 있는 캐릭터만 상태별로 갈아끼우고, 없으면 기본 스프라이트로 떨어진다.
  // 상태 세트가 아예 없는 캐릭터(버거노인)와, 세트는 있는데 그 상태만 빠진 경우를 둘 다
  // 받아야 한다. 어느 쪽이든 stateSprites.default → SPRITES[mascotType] 순으로 내려간다.
  const activeState = eggMode !== 'default' ? eggMode : reactionMode
  const spriteSrc = equippedStateSprites
    ? stateSprites[activeState] || stateSprites.default
    : equippedSprite || stateSprites[activeState] || stateSprites.default || SPRITES[mascotType]

  const showBubble = (text) => {
    setBubble(text)
    clearTimeout(bubbleTimer.current)
    bubbleTimer.current = setTimeout(() => setBubble(''), SAY_MS)
    // 롭은 한 글자씩 타이핑되는 코드창 연출(#155, 목업 typeBubble 그대로) — 다른 캐릭터는
    // 즉시 전체 표시라 타이핑 진행 길이를 곧장 끝까지 채운다.
    clearInterval(typeTimerRef.current)
    if (isRob) {
      setTypedLen(0)
      typeTimerRef.current = setInterval(() => {
        setTypedLen((len) => {
          if (len + 1 >= text.length) {
            clearInterval(typeTimerRef.current)
            return text.length
          }
          return len + 1
        })
      }, TYPE_MS)
    } else {
      setTypedLen(text.length)
    }
  }
  const pickLine = () => {
    const pool = LINES[mascotType]
    return pool[Math.floor(Math.random() * pool.length)]
  }
  const pickReaction = () => {
    const pool = LINES[mascotType].map((text) => ({ text }))
    pool.push(...CLICK_EXTRAS.filter(({ spriteKey }) => stateSprites[spriteKey]))
    return pool[Math.floor(Math.random() * pool.length)]
  }
  const showReactionSprite = (spriteKey) => {
    if (!spriteKey || !stateSprites[spriteKey]) return
    clearTimeout(reactionTimerRef.current)
    setReaction(spriteKey)
    reactionTimerRef.current = setTimeout(() => {
      if (reactionModeRef.current === spriteKey) setReaction('default')
    }, SAY_MS)
  }

  const interactMutation = useMutation({
    mutationFn: () => interactMascot(roomId),
    // 스프라이트는 여기서 바꾸지 않는다 — 클릭 시점에 이미 로컬로 바꿨다(onMascotClick).
    // 말풍선만 응답을 기다린다. 교감 성공인지 하루 한도인지는 응답을 봐야 알 수 있어서다.
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['room', roomId, 'level'] })
      const reaction = pendingReactionRef.current
      pendingReactionRef.current = null
      if (eggModeRef.current !== 'default') return
      showBubble(reaction?.text || pickLine())
    },
    onError: (err) => {
      pendingReactionRef.current = null
      // ★ 여기서 setReaction('default')을 하지 않는다 — 하루 한도를 다 쓴 뒤에도 마스코트는
      // 눌리면 반응해야 한다. 한도에 걸렸다는 건 말풍선 문구로 알린다.
      showBubble(err.code === 'MASCOT_INTERACTION_LIMIT_REACHED' ? LIMIT_MESSAGE : (err.message || '잠시 후 다시 시도해 주세요.'))
    },
  })

  // ── 완성된 상태 세트 공통: 머리를 잡고 들어올리는 드래그 → scared → angry ──
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

  useEffect(() => {
    if (!hasFullStateSet) return undefined

    const scheduleSleep = () => {
      clearTimeout(idleTimerRef.current)
      idleTimerRef.current = setTimeout(() => {
        if (eggModeRef.current === 'default' && reactionModeRef.current === 'default') {
          clearTimeout(bubbleTimer.current)
          setBubble('Zzz…')
          setEgg('sleepy')
        }
      }, IDLE_MS)
    }
    const onActivity = () => {
      if (eggModeRef.current === 'sleepy') {
        setBubble('')
        setEgg('default')
      }
      scheduleSleep()
    }
    const events = ['pointermove', 'pointerdown', 'keydown', 'scroll', 'touchstart', 'wheel']
    events.forEach((eventName) => window.addEventListener(eventName, onActivity, { passive: true }))
    scheduleSleep()

    return () => {
      clearTimeout(idleTimerRef.current)
      events.forEach((eventName) => window.removeEventListener(eventName, onActivity))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasFullStateSet, mascotType])

  const onPointerDown = (e) => {
    if (!hasFullStateSet || eggModeRef.current !== 'default') return
    const rect = e.currentTarget.getBoundingClientRect()
    if (e.clientY - rect.top > rect.height * 0.5) return // 상단 절반(머리 부분)을 잡았을 때만
    dragStartRef.current = { x: e.clientX, y: e.clientY }
    pendingDragRef.current = true
  }

  // 콤보 중간 클릭에 주는 유일한 반응. 순수 로컬 연출이라 API를 안 부른다 —
  // 하루 교감 3회를 이스터에그가 태우면 안 된다는 결정(#155 리뷰)은 그대로 지킨다.
  // 이게 없으면 중간 클릭이 말풍선도 스프라이트도 API도 없이 완전 무반응이라,
  // 5번을 눌러도 체감은 2~3번이고 마지막 dizzy가 난데없이 나온 것처럼 보인다.
  const playNudge = () => {
    nudgeFlipRef.current = !nudgeFlipRef.current
    setNudge(nudgeFlipRef.current ? 'nudge' : 'nudge2')
    clearTimeout(nudgeTimerRef.current)
    nudgeTimerRef.current = setTimeout(() => setNudge(''), NUDGE_MS)
  }

  // ── 클릭: 기본 교감(+2 XP). 완성된 상태 세트가 있으면 연타·특수 스프라이트도 사용 ──
  const onMascotClick = () => {
    if (justDraggedRef.current) { justDraggedRef.current = false; return } // 드래그 직후 따라오는 click
    if (eggModeRef.current === 'sleepy') {
      setBubble('')
      setEgg('default')
      return
    }
    if (eggModeRef.current !== 'default') return // scared/angry/dizzy 진행 중엔 새 교감을 받지 않는다

    if (!hasFullStateSet) {
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
      clearTimeout(nudgeTimerRef.current)
      setNudge('')
      setEgg('dizzy')
      clearTimeout(dizzyTimerRef.current)
      dizzyTimerRef.current = setTimeout(() => {
        if (eggModeRef.current === 'dizzy') setEgg('default')
      }, DIZZY_MS)
      return // 콤보를 완성시킨 마지막 클릭 — 교감 API는 안 부른다
    }
    // ★ 반응 스프라이트(find·pencil·smile)는 클릭할 때마다 여기서 뽑아 바로 바꾼다.
    // 예전에는 교감 API가 성공해야만 바뀌었는데, 교감은 하루 3회라 셋 다 사실상 안 보였다
    // (풀 7개 중 3개 × 하루 3회 = 특정 포즈를 하루에 볼 확률 37%). 순수 연출이라 API와
    // 묶일 이유가 없었다 — 목업도 클릭마다 뽑는다(croby-mascot.js pickReaction).
    // 이제 한도를 다 쓴 뒤에도, 연타 중간 클릭에서도 나온다.
    const reaction = pickReaction()
    showReactionSprite(reaction.spriteKey)

    if (comboCount >= 2) { playNudge(); return } // 콤보 중간 — API는 안 부른다

    if (interactMutation.isPending) return
    pendingReactionRef.current = reaction
    interactMutation.mutate()
  }

  if (prefs.isPending || prefs.isError) return null

  // 롭은 상태 문구(들어올림/무서움/화남/어지러움/수면)든 기본 대사든 '> ' 프롬프트를 붙인다
  // (#155·#216, 목업 그대로 — 목업도 robot이면 모든 말풍선에 '> '를 붙인다).
  // 기본 대사만 타이핑 진행 중 커서를 보여준다.
  const isTypingBubble = eggMode === 'default' && isRob && bubble
  const eggBubbleText =
    eggMode === 'lifted' ? withPrompt(DRAG_LINES.lifted)
    : eggMode === 'scared' ? withPrompt(DRAG_LINES.scared)
    : eggMode === 'angry' ? withPrompt(`날 내려놔, ${me.data?.nickname || '사용자'}!`)
    // 어지러움 문구는 캐릭터를 탄다 — 목업 TEXT.robot.dizzy는 2진수, TEXT.croby.dizzy는 평문이다.
    : eggMode === 'dizzy' ? withPrompt(isRob ? DIZZY_LINE : '어지러워…!')
    : eggMode === 'sleepy' ? withPrompt('Zzz…')
    : isRob && bubble ? `> ${bubble.slice(0, typedLen)}` : bubble

  return (
    <div
      className={[
        'clov-mascot',
        hasFullStateSet && eggMode !== 'default' ? `clov-mascot--${eggMode}` : '',
        // nudge는 default 상태에서만 — lifted/scared는 래퍼에 pointer 추적 transform이 걸려 있고
        // dizzy는 자기 애니메이션이 있어서, 겹치면 둘 중 하나가 조용히 사라진다.
        eggMode === 'default' && nudge ? `clov-mascot--${nudge}` : '',
      ].filter(Boolean).join(' ')}
      data-character={mascotType}
      ref={rootRef}
    >
      {eggBubbleText && (
        <div className="clov-mascot-bubble">
          {eggBubbleText}
          {isTypingBubble && <span className="clov-mascot-type-cursor" />}
        </div>
      )}
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

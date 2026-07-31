import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import './Mascot.css'
import { getMe, getPreferences } from '../../api/user'
import { interactMascot } from '../../api/room'
import crobiSprite from '../../assets/mascot/crobi.png'
import crobiDizzySprite from '../../assets/mascot/crobi-dizzy.png'
import crobiSleepySprite from '../../assets/mascot/crobi-sleepy.png'
import robSprite from '../../assets/mascot/rob.png'
import robDizzySprite from '../../assets/mascot/rob-dizzy.png'
import robSleepSprite from '../../assets/mascot/rob-sleep.png'
import robPulledSprite from '../../assets/mascot/rob-pulled.png'
import robScaredSprite from '../../assets/mascot/rob-scared.png'
import robAngrySprite from '../../assets/mascot/rob-angry.png'
import robFindSprite from '../../assets/mascot/rob-find.png'
import robPencilSprite from '../../assets/mascot/rob-pencil.png'
import burgerOldmanSprite from '../../assets/mascot/burger-oldman.png'

// 캐릭터별 포즈 스프라이트 — 롭만 이식 원본(test-web-design/02-main/assets/rob)의
// 8종 포즈를 전부 갖고, 크로비는 3종(default/dizzy/sleepy), 버거노인은 프로토타입에
// 없던 캐릭터라 기본 포즈 하나로 공통 애니메이션(흔들기·dizzy 등)만 탄다.
const SPRITES = {
  crobi: { default: crobiSprite, dizzy: crobiDizzySprite, sleepy: crobiSleepySprite },
  rob: {
    default: robSprite,
    dizzy: robDizzySprite,
    sleepy: robSleepSprite,
    lifted: robPulledSprite,
    scared: robScaredSprite,
    angry: robAngrySprite,
    find: robFindSprite,
    pencil: robPencilSprite,
  },
  burgerOldman: { default: burgerOldmanSprite },
}

const CLICK_LINES = {
  crobi: ['안녕!', '오늘도 좋은 하루!', '뭐 하고 있었어?', '같이 추억 쌓아볼까?'],
  rob: ['안녕, 나는 롭이야!', '오늘도 함께해줘서 고마워', '다음 약속은 뭐야?', '추억을 기록해보자'],
  burgerOldman: ['어서 와!', '오늘도 든든하게 보내자!', '따끈한 하루가 되길!', '버거는 마음까지 든든하게 하지!'],
}
// 방치 중 혼잣말 — 크로비는 프로토타입 전용 대사, 롭·버거노인은 클릭 대사 풀을 그대로 재사용.
const MUTTER_LINES = {
  crobi: ['흐음… 다음 컷은…', '슥슥…', '구도가 어렵네…', '아이디어 떠올라라~', '오늘 뭐 올라왔지?'],
  rob: CLICK_LINES.rob,
  burgerOldman: CLICK_LINES.burgerOldman,
}
const DIZZY_TEXT = { crobi: '어지러워…!', rob: '001011010101(어지러워..)', burgerOldman: '어지러워…!' }
const LIMIT_MESSAGE = '오늘은 여기까지!'
// 롭 전용: 머리 잡고 들어올릴 때 단계별 고정 대사(화남만 닉네임 삽입)
const DRAG_LINES = { lifted: '오오 늘어난다..', scared: '너무 높아!!' }

const IDLE_MS = 20000
const DIZZY_MS = 1200
const CLICK_WINDOW_MS = 900
const CLICKS_TO_DIZZY = 3
const SAY_MS = 1800
const MUTTER_MS = 2600
const MUTTER_MIN_GAP = 8000
const MUTTER_MAX_GAP = 15000
const TYPE_MS = 55
const SCARED_HEIGHT_PX = 150
const ANGRY_AFTER_SCARED_MS = 3000
const NUDGE_MS = 380
const ANGRY_END_MS = 1400

// 마스코트 인터랙션(옛 test-web-design/02-main/js/croby-mascot.js 포트) + 기존 백엔드
// 교감(#90, +2 XP·하루 3회 제한)을 결합. 클릭 시 로컬 리액션(흔들기·대사·연타 dizzy)은
// 네트워크와 무관하게 즉시 반응하고, 서버 응답은 레벨 갱신/한도 초과 안내에만 관여한다 —
// 그렇지 않으면 응답이 늦게 와서 방금 보여준 재밌는 대사를 덮어써 버린다.
export default function Mascot({ roomId }) {
  const queryClient = useQueryClient()
  const prefs = useQuery({ queryKey: ['preferences'], queryFn: getPreferences })
  const me = useQuery({ queryKey: ['me'], queryFn: getMe })
  const nickname = me.data?.nickname || '사용자'

  const stored = prefs.data?.mascotType
  const mascotType = stored === 'burgerOldman'
    ? 'burgerOldman'
    : (stored === 'rob' || stored === 'robot' ? 'rob' : 'crobi')
  const equippedSprite = prefs.data?.equippedItem?.imageUrl

  const [mode, setMode] = useState('default')
  const [bubbleText, setBubbleText] = useState('')
  const [typed, setTyped] = useState({ for: '', out: '' })
  const [overrideSpriteKey, setOverrideSpriteKey] = useState(null)
  const [nudgeClass, setNudgeClass] = useState('')
  const [glitchBits, setGlitchBits] = useState([])
  const [cursorShatter, setCursorShatter] = useState(null)

  const rootRef = useRef(null)
  const modeRef = useRef(mode)
  const sayRef = useRef(bubbleText)
  // 드래그 연출은 마운트 시 1회 등록한 window 리스너에서 돌아가 첫 렌더의 값을 계속 붙든다.
  // 그때는 preferences 응답 전이라 mascotType이 항상 'crobi'로 잡혀, 롭 전용 분기(커서 파괴
  // 연출)가 통째로 무시됐다 — 최신 값을 ref로 따로 들고 읽는다.
  const mascotTypeRef = useRef(mascotType)
  useEffect(() => { modeRef.current = mode }, [mode])
  useEffect(() => { sayRef.current = bubbleText }, [bubbleText])
  useEffect(() => { mascotTypeRef.current = mascotType }, [mascotType])

  const bubbleTimerRef = useRef(null)
  const dizzyTimerRef = useRef(null)
  const nudgeTimerRef = useRef(null)
  const typeTimerRef = useRef(null)
  const idleTimerRef = useRef(null)
  const glitchTimerRef = useRef(null)
  const cursorRestoreTimerRef = useRef(null)
  const liftTimerRef = useRef(null)
  const angryEndTimerRef = useRef(null)
  const dropCleanupTimerRef = useRef(null)

  const clickTimesRef = useRef([])
  const lastLineRef = useRef('')
  const lastMutterRef = useRef('')
  const dragRef = useRef({ pending: false, dragging: false, justDragged: false, startX: 0, startY: 0, dockCenterX: 0, dockCenterY: 0, lastX: 0, lastY: 0 })
  const prevMascotTypeRef = useRef(mascotType)

  const interactMutation = useMutation({
    mutationFn: () => interactMascot(roomId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['room', roomId, 'level'] })
    },
    onError: (err) => {
      showSay(err.code === 'MASCOT_INTERACTION_LIMIT_REACHED' ? LIMIT_MESSAGE : (err.message || '잠시 후 다시 시도해 주세요.'), SAY_MS)
    },
  })

  function showSay(text, ms, spriteKey) {
    setBubbleText(text)
    setOverrideSpriteKey(spriteKey || null)
    clearTimeout(bubbleTimerRef.current)
    bubbleTimerRef.current = setTimeout(() => {
      setBubbleText('')
      setOverrideSpriteKey(null)
    }, ms)
  }

  function pickReaction() {
    const pool = CLICK_LINES[mascotType].map((text) => ({ text }))
    if (mascotType === 'rob') {
      pool.push(
        { text: `기록된 추억을 되돌아보자, ${nickname}!`, spriteKey: 'find' },
        { text: '추억을 남기는 습관은 좋은거야', spriteKey: 'pencil' },
      )
    }
    let choice = pool[Math.floor(Math.random() * pool.length)]
    if (choice.text === lastLineRef.current && pool.length > 1) {
      choice = pool[(pool.indexOf(choice) + 1) % pool.length]
    }
    lastLineRef.current = choice.text
    return choice
  }

  function spawnGlitch() {
    if (mascotType !== 'rob') return
    const bits = Array.from({ length: 14 }, () => {
      const angle = Math.random() * Math.PI * 2
      const dist = 26 + Math.random() * 46
      return {
        id: Math.random(),
        char: Math.random() < 0.5 ? '0' : '1',
        left: 50 + (Math.random() * 70 - 35),
        top: 45 + (Math.random() * 60 - 30),
        dx: Math.cos(angle) * dist,
        dy: Math.sin(angle) * dist,
        fontSize: 10 + Math.random() * 8,
        delay: Math.random() * 0.2,
      }
    })
    setGlitchBits(bits)
    clearTimeout(glitchTimerRef.current)
    glitchTimerRef.current = setTimeout(() => setGlitchBits([]), DIZZY_MS + 300)
  }

  function spawnCursorShatter(x, y) {
    if (mascotTypeRef.current !== 'rob') return
    const shards = Array.from({ length: 12 }, () => {
      const angle = Math.random() * Math.PI * 2
      const dist = 18 + Math.random() * 42
      return {
        id: Math.random(),
        dx: Math.cos(angle) * dist,
        dy: Math.sin(angle) * dist,
        rot: Math.random() * 360,
        delay: Math.random() * 0.08,
      }
    })
    setCursorShatter({ x, y, shards })
    document.documentElement.classList.add('clov-mascot-cursor-hidden')
    clearTimeout(cursorRestoreTimerRef.current)
    cursorRestoreTimerRef.current = setTimeout(() => {
      document.documentElement.classList.remove('clov-mascot-cursor-hidden')
      setCursorShatter(null)
    }, 2000)
  }

  function resetIdle() {
    clearTimeout(idleTimerRef.current)
    idleTimerRef.current = setTimeout(() => {
      if (modeRef.current === 'default') setMode('sleepy')
    }, IDLE_MS)
  }

  function followPointer(clientX, clientY) {
    const d = dragRef.current
    d.lastX = clientX
    d.lastY = clientY
    if (rootRef.current) {
      rootRef.current.style.transform = `translate(${(clientX - d.dockCenterX).toFixed(1)}px, ${(clientY - d.dockCenterY).toFixed(1)}px)`
    }
    if (modeRef.current === 'lifted' && (d.dockCenterY - clientY) > SCARED_HEIGHT_PX) enterScared()
  }

  function enterScared() {
    setMode('scared')
    clearTimeout(liftTimerRef.current)
    liftTimerRef.current = setTimeout(triggerAngryDrop, ANGRY_AFTER_SCARED_MS)
  }

  function dropBack() {
    if (rootRef.current) {
      rootRef.current.style.transition = 'transform .4s cubic-bezier(.34,1.56,.64,1)'
      rootRef.current.style.transform = ''
    }
    clearTimeout(dropCleanupTimerRef.current)
    dropCleanupTimerRef.current = setTimeout(() => {
      if (rootRef.current) rootRef.current.style.transition = ''
    }, 420)
  }

  function startLift(clientX, clientY) {
    const d = dragRef.current
    d.dragging = true
    d.pending = false
    d.justDragged = true
    clearTimeout(bubbleTimerRef.current)
    if (rootRef.current) {
      const rect = rootRef.current.getBoundingClientRect()
      d.dockCenterX = rect.left + rect.width / 2
      d.dockCenterY = rect.top + rect.height / 2
      rootRef.current.style.transition = 'none'
    }
    setMode('lifted')
    clearTimeout(liftTimerRef.current)
    followPointer(clientX, clientY)
  }

  function triggerAngryDrop() {
    const d = dragRef.current
    if (!d.dragging) return
    d.dragging = false
    clearTimeout(liftTimerRef.current)
    setMode('angry')
    spawnCursorShatter(d.lastX, d.lastY)
    dropBack()
    clearTimeout(angryEndTimerRef.current)
    angryEndTimerRef.current = setTimeout(() => {
      if (modeRef.current === 'angry') {
        setMode('default')
        setBubbleText('')
        resetIdle()
      }
    }, ANGRY_END_MS)
  }

  function endDrag() {
    const d = dragRef.current
    if (!d.dragging) return
    d.dragging = false
    clearTimeout(liftTimerRef.current)
    dropBack()
    setMode('default')
    setBubbleText('')
    resetIdle()
  }

  const handlePointerDown = (e) => {
    if (mascotType !== 'rob' || mode !== 'default') return
    const rect = e.currentTarget.getBoundingClientRect()
    if (e.clientY - rect.top > rect.height * 0.5) return // 상단 절반(머리)만 잡았을 때 인정
    dragRef.current.startX = e.clientX
    dragRef.current.startY = e.clientY
    dragRef.current.pending = true
  }

  const handleClick = () => {
    if (dragRef.current.justDragged) { dragRef.current.justDragged = false; return }

    if (mode === 'sleepy') {
      clickTimesRef.current = []
      setMode('default')
      interactMutation.mutate()
      return
    }

    const now = Date.now()
    clickTimesRef.current = clickTimesRef.current.filter((t) => now - t < CLICK_WINDOW_MS)
    clickTimesRef.current.push(now)

    if (clickTimesRef.current.length >= CLICKS_TO_DIZZY && mode !== 'dizzy') {
      clickTimesRef.current = []
      setMode('dizzy')
      setOverrideSpriteKey(null)
      spawnGlitch()
      clearTimeout(dizzyTimerRef.current)
      dizzyTimerRef.current = setTimeout(() => {
        if (modeRef.current === 'dizzy') setMode('default')
      }, DIZZY_MS)
    } else if (mode === 'default') {
      setNudgeClass((prev) => (prev === 'nudge' ? 'nudge2' : 'nudge'))
      clearTimeout(nudgeTimerRef.current)
      nudgeTimerRef.current = setTimeout(() => setNudgeClass(''), NUDGE_MS)
      const reaction = pickReaction()
      showSay(reaction.text, SAY_MS, reaction.spriteKey)
    }

    interactMutation.mutate()
  }

  // 전역 활동 감지: sleepy 깨우기 + idle 타이머 리셋 (마운트 시 1회 등록)
  useEffect(() => {
    const wake = () => {
      resetIdle()
      if (modeRef.current === 'sleepy') setMode('default')
    }
    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'wheel']
    events.forEach((ev) => window.addEventListener(ev, wake, { passive: true }))
    resetIdle()
    return () => {
      events.forEach((ev) => window.removeEventListener(ev, wake))
      clearTimeout(idleTimerRef.current)
    }
  }, [])

  // 롭 전용 드래그: pointerdown은 버튼에서 시작하지만 이동/해제는 창 전체에서 추적해야
  // 커서가 위젯 밖으로 나가도 계속 따라온다.
  useEffect(() => {
    const onMove = (e) => {
      const d = dragRef.current
      if (d.pending && !d.dragging) {
        if (Math.hypot(e.clientX - d.startX, e.clientY - d.startY) > 6) startLift(e.clientX, e.clientY)
      } else if (d.dragging) {
        followPointer(e.clientX, e.clientY)
      }
    }
    const onUp = () => {
      dragRef.current.pending = false
      endDrag()
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 방치 중 가끔 혼잣말 (default 상태 + 말풍선 비어있을 때만)
  useEffect(() => {
    let cancelled = false
    let timer
    const scheduleMutter = () => {
      const delay = MUTTER_MIN_GAP + Math.random() * (MUTTER_MAX_GAP - MUTTER_MIN_GAP)
      timer = setTimeout(() => {
        if (cancelled) return
        if (modeRef.current === 'default' && !sayRef.current) {
          const pool = MUTTER_LINES[mascotType]
          let idx = Math.floor(Math.random() * pool.length)
          let line = pool[idx]
          if (line === lastMutterRef.current && pool.length > 1) line = pool[(idx + 1) % pool.length]
          lastMutterRef.current = line
          showSay(line, MUTTER_MS)
        }
        scheduleMutter()
      }, delay)
    }
    scheduleMutter()
    return () => { cancelled = true; clearTimeout(timer) }
  }, [mascotType])

  // 롭 전용 타이핑 효과 — 대사가 바뀔 때마다 한 글자씩 친다. 다른 캐릭터는 즉시 표시.
  // typed.for에 어떤 대사를 치는 중인지 같이 담아, 대사가 바뀐 직후 첫 틱(55ms) 전까지
  // 이전 대사가 잠깐 보이는 걸 막는다.
  useEffect(() => {
    if (mascotType !== 'rob' || mode !== 'default' || !bubbleText) return undefined
    let i = 0
    const id = setInterval(() => {
      i += 1
      setTyped({ for: bubbleText, out: `> ${bubbleText.slice(0, i)}` })
      if (i >= bubbleText.length) clearInterval(id)
    }, TYPE_MS)
    typeTimerRef.current = id
    return () => clearInterval(id)
  }, [bubbleText, mascotType, mode])

  // 캐릭터 전환 시(사용자설정에서 변경) 진행 중이던 상태/말풍선/타이핑을 정리
  useEffect(() => {
    if (prevMascotTypeRef.current !== mascotType) {
      prevMascotTypeRef.current = mascotType
      setMode('default')
      setBubbleText('')
      setOverrideSpriteKey(null)
      clearInterval(typeTimerRef.current)
    }
  }, [mascotType])

  // 언마운트 시 모든 타이머 정리 + 전역 커서 숨김 클래스 복구
  useEffect(() => () => {
    clearTimeout(bubbleTimerRef.current)
    clearTimeout(dizzyTimerRef.current)
    clearTimeout(nudgeTimerRef.current)
    clearInterval(typeTimerRef.current)
    clearTimeout(idleTimerRef.current)
    clearTimeout(glitchTimerRef.current)
    clearTimeout(cursorRestoreTimerRef.current)
    clearTimeout(liftTimerRef.current)
    clearTimeout(angryEndTimerRef.current)
    clearTimeout(dropCleanupTimerRef.current)
    document.documentElement.classList.remove('clov-mascot-cursor-hidden')
  }, [])

  if (prefs.isPending || prefs.isError) return null

  const sprites = SPRITES[mascotType] || SPRITES.crobi
  const spriteKey = mode === 'default' ? (overrideSpriteKey || 'default') : mode
  const spriteSrc = equippedSprite || sprites[spriteKey] || sprites.default

  let modeText = ''
  if (mode === 'sleepy') modeText = 'Zzz…'
  else if (mode === 'lifted') modeText = DRAG_LINES.lifted
  else if (mode === 'scared') modeText = DRAG_LINES.scared
  else if (mode === 'angry') modeText = `날 내려놔, ${nickname}!`
  else if (mode === 'dizzy') modeText = DIZZY_TEXT[mascotType]

  const rootClassName = `clov-mascot clov-mascot--${mode}${mode === 'default' && nudgeClass ? ` clov-mascot--${nudgeClass}` : ''}`

  return (
    <div ref={rootRef} className={rootClassName} data-character={mascotType}>
      {mode === 'default' && bubbleText && (
        <div className="clov-mascot-bubble">
          {mascotType === 'rob'
            ? <><span className="clov-mascot-type-text">{typed.for === bubbleText ? typed.out : '> '}</span><span className="clov-mascot-type-cursor" /></>
            : bubbleText}
        </div>
      )}
      {mode !== 'default' && modeText && (
        <div className="clov-mascot-bubble">
          {mascotType === 'rob' ? `> ${modeText}` : modeText}
        </div>
      )}
      <button
        type="button"
        className="clov-mascot-hit"
        aria-label="마스코트와 교감하기"
        onClick={handleClick}
        onPointerDown={handlePointerDown}
      >
        {glitchBits.length > 0 && (
          <span className="clov-mascot-glitch" aria-hidden="true">
            {glitchBits.map((b) => (
              <span
                key={b.id}
                className="clov-mascot-glitch-bit"
                style={{ left: `${b.left}%`, top: `${b.top}%`, '--dx': `${b.dx.toFixed(1)}px`, '--dy': `${b.dy.toFixed(1)}px`, fontSize: `${b.fontSize}px`, animationDelay: `${b.delay}s` }}
              >
                {b.char}
              </span>
            ))}
          </span>
        )}
        <img className="clov-mascot-sprite" src={spriteSrc} alt="" draggable="false" />
      </button>
      {cursorShatter && (
        <div className="clov-mascot-cursor-shatter" style={{ left: cursorShatter.x, top: cursorShatter.y }} aria-hidden="true">
          {cursorShatter.shards.map((s) => (
            <span
              key={s.id}
              className="clov-mascot-cursor-shard"
              style={{ '--dx': `${s.dx.toFixed(1)}px`, '--dy': `${s.dy.toFixed(1)}px`, '--rot': `${s.rot.toFixed(0)}deg`, animationDelay: `${s.delay}s` }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

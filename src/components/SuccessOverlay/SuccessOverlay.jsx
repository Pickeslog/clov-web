import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import './SuccessOverlay.css'

const WELCOME_LINES = [
  (name) => `돌아온걸 환영해요. ${name}님!`,
  (name) => `${name}님, Clov.와 함께 기록할 준비는 되셨나요?`,
  () => 'Clov. 가 당신만을 기다리고 있었어요!',
  () => 'Clov. 에서 기록의 재미를 느껴봐요!',
]

// 롭 인터랙션(드래그·연타·롱홀드)이 Mascot.jsx에 이식됐다(#155) — 문구는 실제 동작과 일치.
const EASTER_EGGS = [
  '롭의 머리를 잡고 위로 들어올려보세요',
  '롭을 빠르게 세 번 클릭해보세요',
  '롭을 너무 오래 들고 있으면 화를 낼지도 몰라요',
]

const LEAVES = [
  { left: '6%', size: 8, duration: 4.6, delay: 0 },
  { left: '16%', size: 6, duration: 5.4, delay: 1.4 },
  { left: '27%', size: 9, duration: 4.0, delay: 0.6 },
  { left: '39%', size: 7, duration: 5.8, delay: 2.1 },
  { left: '52%', size: 8, duration: 4.3, delay: 0.9 },
  { left: '64%', size: 6, duration: 5.1, delay: 1.7 },
  { left: '76%', size: 9, duration: 4.8, delay: 0.3 },
  { left: '88%', size: 7, duration: 5.6, delay: 2.4 },
]

const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)]

// 로그인 성공 오버레이(공통 컴포넌트, 정본 js/success-overlay.js + css/success-overlay.css 이식, #152).
// 정본은 document.body에 싱글턴 DOM을 두고 재생마다 리플로우 트릭으로 애니메이션을 재시작하지만,
// 이 컴포넌트는 로그인 성공 시 한 번만 마운트되고 끝나면 언마운트되는 용도라 그 트릭이 필요 없다 —
// 매번 새로 마운트되는 것 자체가 재시작이다(#114 P2의 key 리마운트와 같은 효과를 구조적으로 얻는다).
export default function SuccessOverlay({ nickname, durationMs = 3000, onDone }) {
  const [phase, setPhase] = useState('enter') // enter -> active -> zoomout -> warp
  const [line] = useState(() => pickRandom(WELCOME_LINES)(nickname || '사용자'))

  // onDone을 effect 의존성에 두면, 호출자가 인라인 화살표(매 렌더마다 새 정체성)를 넘길 때
  // 오버레이 표시 중 호출자가 리렌더될 때마다 타이머 3개가 0부터 다시 시작한다.
  // 공용 컴포넌트라 호출자를 통제할 수 없으니 ref로 최신 값만 담아 effect 의존성에서 뺀다.
  const onDoneRef = useRef(onDone)
  useEffect(() => {
    onDoneRef.current = onDone
  })

  useEffect(() => {
    const raf = requestAnimationFrame(() => setPhase('active'))
    const zoomoutTimer = setTimeout(() => setPhase('zoomout'), durationMs)
    const warpTimer = setTimeout(() => setPhase('warp'), durationMs + 320)
    const doneTimer = setTimeout(() => onDoneRef.current?.(), durationMs + 320 + 340)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(zoomoutTimer)
      clearTimeout(warpTimer)
      clearTimeout(doneTimer)
    }
  }, [durationMs])

  const className = [
    'clov-success-overlay',
    phase !== 'enter' && 'is-active',
    phase === 'zoomout' && 'is-zoomout',
    phase === 'warp' && 'is-warp',
  ].filter(Boolean).join(' ')

  return createPortal(
    <div className={className}>
      <div className="clov-success-leaves" aria-hidden="true">
        {LEAVES.map((leaf, i) => (
          <span
            key={i}
            className="clov-success-leaf"
            style={{ left: leaf.left, width: leaf.size, height: leaf.size, animationDuration: `${leaf.duration}s`, animationDelay: `${leaf.delay}s` }}
          />
        ))}
      </div>
      <svg className="clov-success-wave" viewBox="0 0 300 60" preserveAspectRatio="none" aria-hidden="true">
        <path className="clov-success-wave-back" d="M0 30 Q75 0 150 30 T300 30 V60 H0 Z" />
        <path className="clov-success-wave-front" d="M0 40 Q75 15 150 40 T300 40 V60 H0 Z" />
      </svg>
      <div className="clov-success-stage">
        <div className="clov-success-check">
          <svg viewBox="0 0 120 120">
            <defs>
              <linearGradient id="clovSuccessGradient" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#50d990" />
                <stop offset="100%" stopColor="#16874b" />
              </linearGradient>
            </defs>
            <circle className="clov-success-circle" cx="60" cy="60" r="52" transform="rotate(-90 60 60)" />
            <path className="clov-success-tick" d="M40 62 L54 76 L84 46" />
          </svg>
        </div>
        <div className="clov-success-text">{line}</div>
        <div className="clov-success-egg-hint">
          <span className="clov-success-egg-label">이스터에그</span>
          <span className="clov-success-egg-text">{pickRandom(EASTER_EGGS)}</span>
        </div>
      </div>
    </div>,
    document.body,
  )
}

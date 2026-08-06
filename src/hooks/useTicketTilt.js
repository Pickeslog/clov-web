import { useCallback, useState } from 'react'

/* =====================================================================
   티켓 3D 기울임 + 광택 (#381).

   ★ 원래 일정계획의 약속 티켓(TicketCard) 안에만 있던 코드다. 생일 황금 티켓에도
     같은 효과를 주면서 훅으로 뺐다 — 두 티켓이 **같은 손맛**을 갖는 게 목적이라
     코드가 갈라져 있으면 언젠가 한쪽만 바뀐다.

   ★ 회전값이 작다(rx 6도 · ry 9도). 티켓은 종이라 크게 꺾이면 카드가 아니라 판때기가
     된다. 좌우(ry)를 위아래(rx)보다 크게 준 건 가로로 긴 물건이라 그쪽이 자연스러워서다.

   ⚠️ 포인터가 있는 기기에서만 의미가 있다. 터치에서는 mousemove 가 안 와서 그냥
      기울지 않은 상태로 남는다 — 별도 분기가 필요 없다.
   ===================================================================== */
const REST = { rx: 0, ry: 0, mx: 50, my: 30, hover: false }

export function useTicketTilt() {
  const [tilt, setTilt] = useState(REST)

  const onPointerMove = useCallback((e) => {
    const r = e.currentTarget.getBoundingClientRect()
    if (!r.width || !r.height) return
    const px = (e.clientX - r.left) / r.width
    const py = (e.clientY - r.top) / r.height
    setTilt({ rx: -(py - 0.5) * 6, ry: (px - 0.5) * 9, mx: px * 100, my: py * 100, hover: true })
  }, [])

  // 각도만 되돌리고 광택 위치(mx·my)는 그대로 둔다 — 같이 되돌리면 사라지면서
  // 빛이 가운데로 튀는 게 보인다. opacity 로만 끈다.
  const onPointerLeave = useCallback(() => {
    setTilt((s) => ({ ...s, rx: 0, ry: 0, hover: false }))
  }, [])

  return {
    /** .ticket-tilt 에 그대로 펼친다 */
    tiltStyle: {
      transform: `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`,
      // 따라올 때는 즉각(linear), 손을 뗄 때는 천천히 제자리로.
      transition: tilt.hover ? 'transform .1s linear' : 'transform .55s cubic-bezier(.2,.8,.2,1)',
    },
    /** .ticket-glare 에 그대로 펼친다 */
    glareStyle: {
      opacity: tilt.hover ? 1 : 0,
      background: `radial-gradient(360px circle at ${tilt.mx}% ${tilt.my}%, rgba(255,248,224,.16), rgba(255,248,224,0) 62%)`,
    },
    /** 기울임을 받을 요소(카드 본체)에 그대로 펼친다 */
    handlers: { onMouseMove: onPointerMove, onMouseLeave: onPointerLeave },
  }
}

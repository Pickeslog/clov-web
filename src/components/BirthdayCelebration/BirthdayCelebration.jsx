/* =====================================================================
   생일 당일 축하 모달 (#383) — 마스코트 5종이 둘러싸고 가운데에 축하 메시지.

   ★ 이 컴포넌트는 "띄울지 말지"를 정하지 않는다. 판정은 Dashboard 가 한다
     (거기에 me·members 쿼리가 이미 있고, 생일 배너도 같은 값으로 그린다).
     여기는 받은 걸 그리기만 한다 — 판정이 두 곳에 있으면 배너와 모달이 어긋난다.
   ===================================================================== */
import { useEffect, useRef } from 'react'
import { SHOWCASE_MASCOTS } from '../../lib/mascotShowcase'
import './BirthdayCelebration.css'

/**
 * variant  'me' | 'friend'
 * name     friend 일 때 주인공 닉네임
 */
export default function BirthdayCelebration({ variant, name, onClose }) {
  const closeRef = useRef(null)

  // Esc 로 닫는다. 축하 연출이라 가둬두면 안 된다.
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // 열리면 닫기 버튼으로 초점을 옮긴다 — 키보드 사용자가 바로 빠져나갈 수 있게.
  useEffect(() => { closeRef.current?.focus() }, [])

  const isMe = variant === 'me'
  const heading = isMe ? '생일 축하해요!' : `오늘은 ${name}님의 생일이에요`
  const lead = isMe
    ? '오늘 하루 마음껏 축하받으세요'
    : '한마디 남겨주면 더 좋은 하루가 될 거예요'

  return (
    <div className="bday-backdrop" role="dialog" aria-modal="true" aria-labelledby="bday-heading" onClick={onClose}>
      <div className="bday-card" onClick={(e) => e.stopPropagation()}>
        {/* 마스코트는 장식이라 스크린리더에서 뺀다 — 읽을 내용은 가운데 글이다. */}
        <div className="bday-ring" aria-hidden="true">
          {SHOWCASE_MASCOTS.map((m, i) => (
            <img key={m.key} src={m.smile} alt="" className={`bday-mascot is-${i}`} />
          ))}
        </div>

        <div className="bday-center">
          <span className="bday-cake" aria-hidden="true">🎂</span>
          <h2 id="bday-heading" className="bday-heading">{heading}</h2>
          <p className="bday-lead">{lead}</p>
          <button ref={closeRef} type="button" className="bday-close" onClick={onClose}>
            고마워요
          </button>
        </div>
      </div>
    </div>
  )
}

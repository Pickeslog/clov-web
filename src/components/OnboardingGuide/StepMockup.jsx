/* =====================================================================
   단계별 안내 그림 — 실제 화면을 닮은 미니 목업이 움직인다.

   ★ 왜 은유(클로버·코인)에서 바꿨나 — 그림이 예뻐도 "그래서 화면 어디서 하는데?"가
     안 풀렸다. 사용자가 곧 볼 화면과 닮아야 가이드가 안내가 된다.

   ★ 왜 스크린샷이 아닌가 — 세 가지 이유다.
     ① 실제 화면은 로그인 뒤라 캡처 자체가 번거롭고, 캡처해도 화면이 바뀌면 바로 낡는다
     ② 사진을 픽셀 창 안에 넣으면 미감이 깨진다
     ③ 이미지 파일이 늘면 첫 화면이 무거워진다
     그래서 같은 팔레트로 **모양만** 흉내 내고 움직임을 CSS 로 준다. 0KB 다.

   ⚠️ 모든 애니메이션은 prefers-reduced-motion 에서 멈춘다(StepMockup.css).
      멈춘 상태가 "다 그려진 마지막 장면"이라 정보가 사라지지 않아야 한다.
   ===================================================================== */
import { PixelCoin } from './PixelText'

/** STEP 1 — 우정공간이 뭐예요. 실제 방 목록의 티켓 카드를 줄인 모양. */
export function MockRoomCard() {
  return (
    <div className="gm-card" aria-hidden="true">
      <div className="gm-card-head">
        <span className="gm-kick">CLOV</span>
        <span className="gm-route">┈ ✈ ┈</span>
        <span className="gm-kick">D-3</span>
      </div>
      <div className="gm-card-body">
        <div className="gm-name">제주 가치가자</div>
        {/* ★ 아바타가 하나씩 들어오고 크기가 전부 같다 — "방장 없음 · 모두 같은 권한"이
            글이 아니라 그림으로 보이는 자리다. */}
        <div className="gm-avs">
          {[0, 1, 2, 3].map((i) => <i key={i} style={{ '--gm-d': `${i * 0.3}s` }} />)}
        </div>
      </div>
    </div>
  )
}

/** STEP 2 — 들어오는 길은 두 가지. 방 목록 빈 화면의 버튼 둘을 그대로 옮겼다. */
export function MockRoutes() {
  return (
    <div className="gm-routes" aria-hidden="true">
      <div className="gm-btn is-first">＋ 방 만들기</div>
      <div className="gm-or">또는</div>
      {/* 실제 입력칸의 placeholder 와 같은 형식이라 코드를 받았을 때 알아본다. */}
      <div className="gm-btn is-second">CLV-JOIN-<span className="gm-caret" /></div>
    </div>
  )
}

/** STEP 3 — 추억을 남기면 골드. 쓰기 → 지급 → 배지 증가까지 한 바퀴를 보여준다. */
export function MockGold() {
  return (
    <div className="gm-gold" aria-hidden="true">
      {/* 헤더 골드 배지 — 실제로 추억을 올리면 여기가 오른다(clov-web#178).
          동전은 픽셀 비트맵을 그대로 쓴다 — 창 안의 다른 그림과 같은 손으로 그린 것처럼. */}
      <div className="gm-badge">
        <PixelCoin scale={1} fill="#e8c85a" className="gm-coin" />
        <span className="gm-num is-before">1,200</span>
        <span className="gm-num is-after">1,500</span>
      </div>
      <div className="gm-memo">
        <span className="gm-photo" />
        <span className="gm-lines">
          <i className="gm-line" />
          <i className="gm-line is-short" />
        </span>
      </div>
      <div className="gm-plus">+300 G</div>
    </div>
  )
}

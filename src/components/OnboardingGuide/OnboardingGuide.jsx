import { useCallback, useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import './OnboardingGuide.css'
import { getMe, getPreferences } from '../../api/user'
import { SHOWCASE_MASCOTS, guideMascotSprite } from './guideMascot'
import { PIXEL_COLORS, pixelize } from './pixelize'
import { PixelClover, PixelCoin, PixelText } from './PixelText'
import { dropLegacyGuideKeys, markGuideDone, markGuideSkipped, shouldShowGuide } from '../../lib/onboardingGuide'
import { useGuideStore } from '../../stores/guideStore'

/* =====================================================================
   신규 사용자 온보딩 가이드 — 방 목록 위에 뜨는 픽셀 창.

   레퍼런스는 마인크래프트 / Sun Haven / 소니 스파이디 트래커의 시작 화면이다.
   START 를 누르면 5단계 가이드로 넘어간다.

   ★ 한글은 일반 폰트다(PixelText.jsx 참고). 픽셀 느낌은 테두리·버튼·그림이 만들고,
     영문 라벨과 도형만 비트맵으로 그린다.

   ★ 방이 있든 없든 모두에게 뜬다(2026-08-06 결정). 대신 "다시는 안 보기"로 영구
     해제할 수 있고, 프로필 → "가이드 다시 보기"로 되돌릴 수 있다.
     방이 없을 때만 띄우려면 RoomList 의 hasNoRooms 를 조건으로 걸면 된다.
   ===================================================================== */

const STEPS = [
  {
    label: 'CLOVER',
    art: 'clovers',
    heading: '우정공간이 뭐예요?',
    body: '친구들과 함께 쓰는 하나의 공간이에요. 약속을 잡고, 사진을 남기고, 편지를 주고받아요. 방장은 없어요 — 모두가 같은 권한이에요.',
  },
  {
    label: 'ROUTE',
    art: 'code',
    heading: '들어오는 길은 두 가지',
    body: '직접 우정공간을 만들거나, 친구에게 받은 초대 코드로 들어와요. 코드는 CLV-JOIN- 으로 시작해요.',
  },
  {
    label: 'GOLD',
    art: 'coin',
    heading: '추억을 남기면 골드를 받아요',
    body: '글과 사진을 올리거나 마스코트를 눌러도 쌓여요. 모은 골드로 상점에서 배경과 코스튬을 사요.',
  },
  {
    label: 'FRIENDS',
    art: 'mascots',
    heading: '함께할 친구들',
    body: '프로필 메뉴의 "마스코트 꾸미기"에서 언제든 바꿀 수 있어요. 상점에서 산 코스튬을 입히면 우정공간마다 다른 모습으로 나와요.',
  },
  {
    label: 'START',
    art: 'mine',
    heading: '준비 끝!',
    body: '이제 시작해볼까요? 이 가이드는 프로필 메뉴에서 언제든 다시 볼 수 있어요.',
  },
]

const LOAD_BAR_CELLS = 9
const LOAD_BAR_FILLED = 6
// 5종을 나란히 세우면 한 칸이 좁다. 64px 로 줄이면 화면에서 1픽셀이 1px 아래로
// 내려가 픽셀로 안 읽힌다(§12-6) — 그래서 이 단계만 32px 로 더 굵게 줄인다.
const SHOWCASE_RES = 32

/** 단계별 그림. 마스코트만 쓰면 STEP 이 바뀌어도 그림이 안 바뀌어 넘어가는 느낌이 없다. */
function StepArt({ kind, mine, friends }) {
  if (kind === 'clovers') {
    // 같은 크기 클로버 셋 — "방장 없음 · 모두가 같은 권한"을 그림으로 말한다.
    return (
      <div className="clov-guide-trio">
        {[0, 1, 2].map((k) => <PixelClover key={k} scale={5} fill="#9ccc65" />)}
      </div>
    )
  }
  if (kind === 'code') return <PixelText text="CLV-JOIN" scale={4} fill="#9ccc65" title="초대 코드" />
  if (kind === 'coin') return <PixelCoin scale={5} fill="#e8c85a" title="골드" />
  if (kind === 'mascots') {
    return (
      <div className="clov-guide-friends">
        {friends.map((m) => (
          <div className="clov-guide-friend" key={m.key}>
            {/* 64px — 원본을 32px로 줄였으니 1픽셀이 화면 2px이다. 이 아래로 내려가면
                픽셀 아트로 안 읽힌다(§12-6). 칸 너비(약 85px)에도 들어간다. */}
            <img src={m.url} alt="" height={64} />
            <span>{m.name}</span>
          </div>
        ))}
      </div>
    )
  }
  return mine ? <img src={mine} alt="" height={104} /> : null
}

export default function OnboardingGuide({ onCreateRoom, onJoinRoom }) {
  const open = useGuideStore((s) => s.open)
  const openGuide = useGuideStore((s) => s.openGuide)
  const closeGuide = useGuideStore((s) => s.closeGuide)

  const [step, setStep] = useState(-1)      // -1 = START 화면, 0.. = 가이드 단계
  const [pixelUrl, setPixelUrl] = useState(null)
  // 원본으로 먼저 채워둔다 — 변환 전에 빈 칸이 보이지 않게.
  const [friends, setFriends] = useState(() => SHOWCASE_MASCOTS.map((m) => ({ ...m, url: m.sprite })))

  /* 누구인지 알아야 판단한다 — 저장 키가 계정별이다(#362). Header 가 이미 같은 키로
     조회하고 있어 캐시를 공유한다(추가 요청이 안 나간다). */
  const me = useQuery({ queryKey: ['me'], queryFn: getMe })
  const userId = me.data?.id ?? null

  /* 첫 진입 자동 노출. 저장소가 "이미 봤다"고 하면 열지 않는다.
     ⚠️ userId 를 알기 전에는 판단하지 않는다 — 모르는 채로 "안 봤다"고 하면 로그인 직후
        잠깐 떴다 사라지고, "봤다"고 하면 신규 사용자가 못 본다.
     ref 로 한 번만 도는 이유는 StrictMode 이중 실행 때문이 아니라, 사용자가 닫은 뒤
     리렌더가 나도 다시 열리면 안 되기 때문이다. */
  const autoOpened = useRef(false)
  useEffect(() => {
    if (autoOpened.current || userId == null) return
    autoOpened.current = true
    dropLegacyGuideKeys()
    if (shouldShowGuide(userId)) openGuide()
  }, [userId, openGuide])

  const prefs = useQuery({ queryKey: ['preferences'], queryFn: getPreferences, enabled: open })
  const spriteUrl = guideMascotSprite(prefs.data)

  // 내 마스코트를 픽셀 아트로. 실패하면 원본을 그대로 쓴다(안 보이는 것보단 낫다).
  useEffect(() => {
    if (!open || !spriteUrl) return undefined
    let alive = true
    const img = new Image()
    // crossOrigin 을 일부러 안 붙인다 — 스킨은 /shop/skins/… 로 같은 출처다. 붙이면
    // CORS 헤더가 없는 응답에서 로드 자체가 실패해 이미지가 통째로 사라진다.
    img.onload = () => { if (alive) setPixelUrl(pixelize(img)) }
    img.onerror = () => { if (alive) setPixelUrl(null) }
    img.src = spriteUrl
    return () => { alive = false }
  }, [open, spriteUrl])

  // 친구들 단계용 5종. 열릴 때 미리 변환해 둔다 — 4단계에 도착해서 변환하면 눈에 띈다.
  useEffect(() => {
    if (!open) return undefined
    let alive = true
    Promise.all(SHOWCASE_MASCOTS.map((m) => new Promise((resolve) => {
      const img = new Image()
      img.onload = () => resolve({ ...m, url: pixelize(img, SHOWCASE_RES, PIXEL_COLORS) || m.sprite })
      img.onerror = () => resolve({ ...m, url: m.sprite })
      img.src = m.sprite
    }))).then((list) => { if (alive) setFriends(list) })
    return () => { alive = false }
  }, [open])

  /* 닫을 때 START 화면으로 되돌린다 — "다시 보기"로 들어와도 처음부터 보여야 한다.
     여는 쪽(open)이 아니라 닫는 쪽에서 되돌리는 이유는, 여는 경로가 셋(자동·스토어·
     START 버튼)이라 한 곳에 모으기 어렵고 effect 로 맞추면 렌더가 한 번 더 돌기 때문이다. */
  const close = useCallback((permanent) => {
    if (permanent) markGuideDone(userId)
    else markGuideSkipped(userId)
    setStep(-1)
    closeGuide()
  }, [closeGuide, userId])

  const skip = () => close(false)
  const never = () => close(true)

  // Escape = 건너뛰기(이번 방문만).
  useEffect(() => {
    if (!open) return undefined
    const onKeyDown = (e) => { if (e.key === 'Escape') close(false) }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, close])

  if (!open) return null

  const inGuide = step >= 0
  const current = STEPS[step] ?? STEPS[0]
  const isLast = step === STEPS.length - 1
  const mascotSrc = pixelUrl || spriteUrl

  // 마지막 장면의 버튼은 가이드를 끝낸 것으로 본다 — 셋 다 영구 처리다.
  const finish = (after) => { close(true); after?.() }

  return (
    <div className="clov-guide-backdrop" onClick={skip} role="presentation">
      <div
        className="clov-guide-frame"
        role="dialog"
        aria-modal="true"
        aria-label="클로브 시작 가이드"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="clov-guide-dots" aria-hidden="true" />
        <div className="clov-guide-watermark" aria-hidden="true"><PixelClover scale={26} fill="#9ccc65" /></div>
        {['tl', 'tr', 'bl', 'br'].map((pos) => (
          <div key={pos} className={`clov-guide-corner is-${pos}`} aria-hidden="true">
            <PixelClover scale={3} fill="#9ccc65" />
          </div>
        ))}
        <div className="clov-guide-topbar"><PixelText text="CLOV GUIDE" scale={3} fill="#eaf3d6" title="클로브 가이드" /></div>

        {!inGuide && (
          <div className="clov-guide-stage">
            {mascotSrc && <img className="clov-guide-mascot" src={mascotSrc} alt="" height={132} />}
            <p className="clov-guide-welcome">
              클로브에 오신 것을 환영합니다.<br />
              친구들과 함께 쓰는 우정공간,<br />
              어떻게 쓰는지 60초면 끝나요.
            </p>
            <div className="clov-guide-bar" aria-hidden="true">
              {Array.from({ length: LOAD_BAR_CELLS }, (_, k) => (
                <i key={k} className={k < LOAD_BAR_FILLED ? 'is-on' : ''} />
              ))}
            </div>
            <p className="clov-guide-ask">시작하려면 아래를 눌러주세요</p>
            <div className="clov-guide-row">
              <button type="button" className="clov-guide-btn is-primary" onClick={() => setStep(0)}>
                <PixelText text="START" scale={5} fill="#16200c" title="시작" />
              </button>
              <button type="button" className="clov-guide-btn" onClick={skip}>건너뛰기</button>
            </div>
            <button type="button" className="clov-guide-never" onClick={never}>다시는 안 보기</button>
          </div>
        )}

        {inGuide && (
          <div className="clov-guide-stage is-steps">
            <div className="clov-guide-win">
              <div className="clov-guide-winbar">
                <span>{current.label}</span>
                <button type="button" className="clov-guide-close" onClick={skip} aria-label="가이드 닫기">×</button>
              </div>
              <div className="clov-guide-winbody">
                <div className={`clov-guide-art${current.art === 'mascots' ? ' is-tall' : ''}`}>
                  <StepArt kind={current.art} mine={mascotSrc} friends={friends} />
                </div>
                <p className="clov-guide-stepno">STEP {step + 1} / {STEPS.length}</p>
                <h2 className="clov-guide-heading">{current.heading}</h2>
                <p className="clov-guide-body">{current.body}</p>
                <div className="clov-guide-pips" aria-hidden="true">
                  {STEPS.map((s, k) => <i key={s.label} className={k === step ? 'is-on' : ''} />)}
                </div>

                {isLast ? (
                  /* 마지막은 설명이 아니라 갈림길이다 — 가이드가 실제 동선으로 이어져야
                     "준비 끝"이라고 해놓고 빈 화면에 되돌려놓는 일이 없다. */
                  <div className="clov-guide-cta">
                    <button type="button" className="clov-guide-btn is-primary is-wide" onClick={() => finish(onCreateRoom)}>
                      우정공간 만들기
                    </button>
                    <button type="button" className="clov-guide-btn is-wide" onClick={() => finish(onJoinRoom)}>
                      초대 코드로 참여
                    </button>
                    <div className="clov-guide-row is-split">
                      <button type="button" className="clov-guide-quiet" onClick={() => setStep((v) => v - 1)}>이전</button>
                      <button type="button" className="clov-guide-quiet" onClick={() => finish()}>그냥 닫기</button>
                    </div>
                  </div>
                ) : (
                  <div className="clov-guide-row is-split">
                    <button
                      type="button"
                      className="clov-guide-btn"
                      onClick={() => setStep((v) => v - 1)}
                      style={{ visibility: step === 0 ? 'hidden' : 'visible' }}
                    >
                      이전
                    </button>
                    <button type="button" className="clov-guide-btn is-primary" onClick={() => setStep((v) => v + 1)}>
                      다음
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

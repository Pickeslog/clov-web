/* =====================================================================
   온보딩 가이드 랩 — 개발용 조작 화면. 진입점은 guide-lab.jsx.

   가이드 디자인을 고칠 때 실제 앱으로 확인하려면 로그인 → 방 목록 → 프로필 →
   "가이드 다시 보기"를 매번 거쳐야 한다. 여기는 로그인 없이 바로 뜨고, 단계·마스코트를
   버튼으로 바꾼다. CSS 만 고치면 컴포넌트가 리마운트되지 않아 보고 있던 단계가 유지된다.

   ⚠️ 제품 코드가 아니다. OnboardingGuide 에 랩 전용 prop 을 만들지 않으려고 단계 이동은
      실제 버튼을 눌러서 한다 — 컴포넌트는 이 파일의 존재를 모른다.
   ===================================================================== */
import { useEffect, useState } from 'react'
import OnboardingGuide from '../components/OnboardingGuide/OnboardingGuide'
import { SHOWCASE_MASCOTS } from '../lib/mascotShowcase'
import { useGuideStore } from '../stores/guideStore'
import { resetGuide } from '../lib/onboardingGuide'
import { LAB_USER_ID, setLabMascot } from './guideLabQuery'

// 가이드의 단계 수. STEP 표시("STEP n / 5")를 폴링 조건으로 쓰기 때문에 필요하다.
// ⚠️ 가이드가 단계를 늘리면 여기도 같이 고친다 — 안 고치면 단계 버튼이 조용히 멈춘다.
const TOTAL_STEPS = 5

const tick = (ms = 20) => new Promise((r) => setTimeout(r, ms))

/* ★ 고정 대기(setTimeout 몇 ms)로 다음 클릭을 하면 안 된다. 렌더가 늦으면 그 클릭이 엉뚱한
   버튼에 떨어진다 — 실제로 마지막 단계의 CTA 를 눌러 가이드를 닫아버렸다. 원하는 상태가
   나올 때까지 폴링한다.
   timeout 이 넉넉한 이유: 탭이 화면에 안 보이면 브라우저가 setTimeout 을 1Hz 로 throttle
   한다. 보이는 상태에서는 한 단계 이동이 150ms 남짓이라 이 값이 체감되지 않는다. */
async function until(fn, timeout = 4000) {
  const t0 = Date.now()
  while (Date.now() - t0 < timeout) {
    if (fn()) return true
    await tick()
  }
  return false
}

const $ = (s) => document.querySelector(s)
const stepText = () => $('.clov-guide-stepno')?.textContent ?? null
const nextBtn = () => [...document.querySelectorAll('.clov-guide-winbody .clov-guide-btn')]
  .find((b) => b.textContent.trim() === '다음')

export default function GuideLab() {
  const openGuide = useGuideStore((s) => s.openGuide)
  const [mascot, setMascot] = useState('crobi')
  const [size, setSize] = useState({ w: window.innerWidth, h: window.innerHeight })
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const onResize = () => setSize({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // 조작 바 높이를 재서 CSS 로 넘긴다 — 값을 추정해 박아두면 줄바꿈이 생길 때 가이드를 가린다.
  useEffect(() => {
    const bar = $('.lab-bar')
    if (!bar) return undefined
    const apply = () => document.documentElement.style.setProperty('--lab-bar-h', `${bar.offsetHeight}px`)
    apply()
    const ro = new ResizeObserver(apply)
    ro.observe(bar)
    return () => ro.disconnect()
  }, [])

  /* 단계 이동.
     ★ openGuide() 는 단계를 안 되돌린다 — 컴포넌트는 **닫을 때만** step 을 -1 로 되돌린다.
       그래서 단계 중이면 × 로 한 번 닫아야 START 부터 다시 셀 수 있다. 이걸 빼먹으면
       .is-primary 가 START 가 아니라 "다음"이라 엉뚱한 곳으로 간다. */
  const goTo = async (n) => {
    if (busy) return
    setBusy(true)
    try {
      $('.clov-guide-close')?.click()
      await until(() => !$('.clov-guide-win'))
      resetGuide(LAB_USER_ID)
      openGuide()
      await until(() => $('.clov-guide-btn.is-primary') && !stepText())
      if (n < 0) return
      $('.clov-guide-btn.is-primary')?.click()
      await until(() => stepText() === `STEP 1 / ${TOTAL_STEPS}`)
      for (let k = 1; k <= n; k++) {
        // 텍스트로 집는다 — "마지막 버튼"으로 집으면 마지막 단계의 CTA 를 눌러 닫아버린다.
        nextBtn()?.click()
        await until(() => stepText() === `STEP ${k + 1} / ${TOTAL_STEPS}`)
      }
    } finally {
      setBusy(false)
    }
  }

  const pick = (key) => { setLabMascot(key); setMascot(key) }

  return (
    <>
      <OnboardingGuide
        onCreateRoom={() => window.alert('onCreateRoom() — 실제 앱에서는 방 만들기 모달이 열립니다')}
        onJoinRoom={() => window.alert('onJoinRoom() — 실제 앱에서는 초대 코드 모달이 열립니다')}
      />
      <div className="lab-bar">
        <div className="lab-row">
          <b>단계</b>
          <button type="button" onClick={() => goTo(-1)} disabled={busy}>START</button>
          {Array.from({ length: TOTAL_STEPS }, (_, n) => (
            <button type="button" key={n} onClick={() => goTo(n)} disabled={busy}>{n + 1}</button>
          ))}
        </div>
        <div className="lab-row">
          <b>마스코트</b>
          {SHOWCASE_MASCOTS.map((m) => (
            <button type="button" key={m.key} className={m.key === mascot ? 'on' : ''} onClick={() => pick(m.key)}>
              {m.name}
            </button>
          ))}
        </div>
        <div className="lab-row">
          <b>{size.w} × {size.h}</b>
          <span className="lab-hint">창을 줄여 보세요 — 가이드는 dvh 라 프레임이 같이 줄어듭니다</span>
        </div>
      </div>
    </>
  )
}

import { useState } from 'react'
import '../../assets/fonts/fonts.css'
import './FontTestPanel.css'

// 폰트 2차 후보를 실제 화면(어느 페이지든)에 바로 적용해보는 플로팅 패널.
// test/font-comparison-panel 브랜치 전용 스크래치 — 이슈 없음, 폰트 정해지면 통째로 지운다.
//
// index.css :root의 --sans 변수만 바꾸는 방식은 안 먹힌다 — 각 화면의 .proto-* 루트가
// font-family를 직접 하드코딩해서 변수 상속을 끊어버리기 때문(예: dashboard.proto.css:26,
// feed.proto.css:25, login.proto.css:26 전부 'Outfit'/시스템 폰트를 자체 지정).
// 그래서 <style> 태그를 주입해 body 전체에 !important로 강제 덮어쓴다.
const FONTS = [
  { key: 'base', label: '기본', family: null },
  { key: 'cocochoitoon', label: '코코초이툰', family: "'Griun Cocochoitoon', sans-serif" },
  { key: 'mongtori', label: '몽토리체', family: "'Griun Mongtori', sans-serif" },
  { key: 'ganpan', label: '엄마까투리체 (KCC 간판체)', family: "'KCC-Ganpan', sans-serif" },
  { key: 'murukmuruk', label: 'KCC 무럭무럭체', family: "'KCC-Murukmuruk', sans-serif" },
  { key: 'onglip-newbohyun', label: '온글잎 뉴보현', family: "'Onglip New Bohyun', sans-serif" },
  { key: 'onglip-newbohyun-bold', label: '온글잎 뉴보현볼드', family: "'Onglip New Bohyun Bold', sans-serif" },
  { key: 'onglip-berryryeowon', label: '온글잎 베리려원', family: "'Onglip Berryryeowon', sans-serif" },
  { key: 'onglip-hwanseung', label: '온글잎 환승체', family: "'Onglip Hwanseung', sans-serif" },
  { key: 'cherry1spoon', label: '체리원스푼', family: "'Griun Cherry1Spoon', sans-serif" },
  { key: 'solyfont', label: '솔이체', family: "'Griun SolyFont', sans-serif" },
]

const OVERRIDE_STYLE_ID = 'font-test-panel-override'

export default function FontTestPanel() {
  const [active, setActive] = useState('base')

  const apply = (font) => {
    setActive(font.key)
    let styleEl = document.getElementById(OVERRIDE_STYLE_ID)
    if (font.family) {
      if (!styleEl) {
        styleEl = document.createElement('style')
        styleEl.id = OVERRIDE_STYLE_ID
        document.head.appendChild(styleEl)
      }
      styleEl.textContent = `body, body * { font-family: ${font.family} !important; }`
    } else {
      styleEl?.remove()
    }
  }

  return (
    <div className="font-test-panel">
      <span className="font-test-panel-label">폰트 테스트</span>
      {FONTS.map((f) => (
        <button
          key={f.key}
          type="button"
          className={`font-test-panel-btn${active === f.key ? ' active' : ''}`}
          onClick={() => apply(f)}
        >
          {f.label}
        </button>
      ))}
    </div>
  )
}

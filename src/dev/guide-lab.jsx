/* =====================================================================
   온보딩 가이드 랩 진입점 — 개발용. `/guide-lab.html` 로 연다.

   ⚠️ 운영 빌드에는 안 들어간다. vite.config.js 에 rollupOptions.input 이 없어
      엔트리가 index.html 하나뿐이고, 이 파일은 거기서 도달할 수 없다(빌드 결과
      dist/ 에 guide-lab 문자열이 0건인 것으로 확인했다).
      **엔트리를 여러 개로 바꾸게 되면 이 파일을 input 에서 빼야 한다.**

   ★ 컴포넌트는 GuideLab.jsx 에 따로 둔다 — 진입점 파일에 컴포넌트를 같이 두면
     Fast Refresh 가 안 걸린다(eslint react-refresh/only-export-components).
     랩의 존재 이유가 "고치면 바로 보이는 것"이라 이건 지켜야 한다.
   ===================================================================== */
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import '../index.css'
import '../styles/tokens.css'
import './guide-lab.css'
import GuideLab from './GuideLab'
import { LAB_USER_ID, labQueryClient } from './guideLabQuery'
import { resetGuide } from '../lib/onboardingGuide'

// ★ 랩은 열 때마다 무조건 뜬다. 저장소를 안 비우면 앞선 방문에서 "시작하기"를 눌렀을 때
//   남은 clov-guide-done 때문에 빈 화면이 뜬다 — 디자인 보려고 왔는데 아무것도 안 보인다.
resetGuide(LAB_USER_ID)

/* ★ HMR 로 이 파일이 다시 실행돼도 root 를 새로 만들지 않는다. createRoot 를 같은 컨테이너에
   두 번 부르면 React 가 콘솔에 에러를 찍는다 — 랩을 고치는 동안 실제로 나왔다.
   (index.html 진입점은 편집할 일이 없어 이 문제가 없다.) */
const container = document.getElementById('root')
container.__labRoot ??= createRoot(container)
container.__labRoot.render(
  <QueryClientProvider client={labQueryClient}>
    <div className="lab-page"><GuideLab /></div>
  </QueryClientProvider>,
)

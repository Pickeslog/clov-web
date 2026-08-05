// 일정계획 = 항상 크림 종이/세이지 앨범 미감. 팔레트를 <main>(또는 재사용 시 래퍼)에
// 인라인 CSS 변수로 못박아 @scope 루트 미적용 이슈와 무관하게 다크에서도 라이트로 렌더한다.
// Schedule 화면과 우정공간(대시보드)의 인라인 모달이 공유하므로 컴포넌트 파일 밖으로 뺐다.
export const SCHEDULE_LIGHT_PALETTE = {
  colorScheme: 'light',
  '--primary-green': '#1b4332',
  '--accent-green': '#52b788',
  '--text-color': '#2c3e35',
  '--text-muted': '#61766a',
  '--border-color': '#eadfd0',
  '--bg-light': '#f4f0e6',
  background: 'linear-gradient(180deg, #eef1e7 0%, #e7ece1 100%)',
  minHeight: '100vh',
}

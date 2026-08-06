// 일정계획 = 항상 크림 종이/세이지 앨범 미감. 팔레트를 <main>(또는 재사용 시 래퍼)에
// 인라인 CSS 변수로 못박아 @scope 루트 미적용 이슈와 무관하게 다크에서도 라이트로 렌더한다.
// Schedule 화면과 우정공간(대시보드)의 인라인 모달이 공유하므로 컴포넌트 파일 밖으로 뺐다.
//
// ⚠️ 여기엔 background를 넣지 않는다. 일정계획 페이지(Schedule.jsx)는 이 팔레트만 쓰는데,
// background를 넣으면 뷰포트 전체(<main>)를 불투명하게 덮어 index.css body가 읽는
// 전역 --clov-app-bg(사용자설정 > 배경에서 고른 테마)를 완전히 가려버린다(#318). 같은
// "항상 라이트 고정" 정책을 쓰는 행운편지(LETTERS_LIGHT_PALETTE)도 색상 변수만 두고
// background는 안 건드려서 전역 테마가 그대로 비친다 — 여기도 그 패턴을 따른다.
export const SCHEDULE_LIGHT_PALETTE = {
  colorScheme: 'light',
  '--primary-green': '#1b4332',
  '--accent-green': '#52b788',
  '--text-color': '#2c3e35',
  '--text-muted': '#61766a',
  '--border-color': '#eadfd0',
  '--bg-light': '#f4f0e6',
}

// 대시보드에 인라인으로 뜨는 D-day 작성 모달(ScheduleEditorModal) 전용 — 종이 카드처럼
// 보이려고 불투명 배경을 준다. 모달은 뷰포트 전체가 아니라 카드 하나만 그리므로 전역
// 테마를 가리는 문제가 없다. 페이지 팔레트(SCHEDULE_LIGHT_PALETTE)와 함께 펼쳐 쓴다:
// style={{ ...SCHEDULE_LIGHT_PALETTE, ...SCHEDULE_MODAL_CARD_STYLE }}
export const SCHEDULE_MODAL_CARD_STYLE = {
  background: 'linear-gradient(180deg, #eef1e7 0%, #e7ece1 100%)',
  minHeight: 0,
}

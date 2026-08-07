import { create } from 'zustand'
import { resetGuide } from '../lib/onboardingGuide'

/**
 * 온보딩 가이드 모달의 열림 상태.
 *
 * settingsStore 와 같은 이유로 스토어다 — 가이드는 방 목록(RoomList) 위에 뜨는데
 * "가이드 다시 보기"를 누르는 곳은 Header 의 프로필 드롭다운이라, 둘이 형제라서
 * RoomList 의 useState 에 닿을 수 없다.
 *
 * ★ replayGuide(userId) 가 저장소를 먼저 지운다. 안 지우면 이번엔 스토어로 열리지만
 *   다음 방문에 또 안 뜬다 — "다시 보기"를 눌렀는데 한 번만 보이는 건 되돌린 게 아니다.
 *   ⚠️ userId 를 받는다(#362) — 저장 키가 계정별이라 누구 것을 지울지 알아야 한다.
 *
 * persist 를 안 붙인다(settingsStore 와 같다) — 새로고침했더니 가이드가 떠 있으면
 * 그건 버그로 보인다. "다시 떠야 하는가"는 onboardingGuide.js 의 저장소가 답한다.
 */
export const useGuideStore = create((set) => ({
  open: false,
  openGuide: () => set({ open: true }),
  closeGuide: () => set({ open: false }),
  replayGuide: (userId) => { resetGuide(userId); set({ open: true }) },
}))

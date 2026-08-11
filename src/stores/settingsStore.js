import { create } from 'zustand'

/**
 * 사용자설정 모달의 열림 상태.
 *
 * Header 안의 useState 였는데 스토어로 올렸다 — 상점 카드가 "설정에서 적용"을 눌렀을 때
 * 이 모달을 열어야 하는데, Shop 은 Header 의 형제라 그 state 에 닿을 수 없었다.
 *
 * ★ 상점 ↔ 사용자설정은 배경 때문에 양방향이다.
 *     사용자설정 → 상점   미보유 배경을 누르면 상점으로 (navigate 라 이미 됐다)
 *     상점 → 사용자설정   보유한 배경을 누르면 설정으로 (모달이라 이게 필요했다)
 *   한쪽만 이어두면 "여기서 하라"고 알려주고는 데려가지 않는 버튼이 된다.
 *
 * persist 를 안 붙인다 — 새로고침했더니 설정 모달이 떠 있으면 그건 버그로 보인다.
 */
export const useSettingsStore = create((set) => ({
  open: false,
  openSettings: () => set({ open: true }),
  closeSettings: () => set({ open: false }),
}))

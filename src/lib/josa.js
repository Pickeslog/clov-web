// 한글 조사(을/를 등)를 마지막 글자 받침 유무로 정확히 고른다.
//
// ★ 기존 코드(Shop.jsx의 구매/장착 메시지)는 `'${name}'을(를) 구매했어요`처럼
//   두 조사를 괄호로 같이 써서 회피해 왔다. 아이템 이름처럼 화면에 스치듯 보이는
//   문구에서는 크게 안 걸리는데, 계정 탈퇴 모달처럼 사용자가 자기 닉네임을 정확히
//   입력해야 하는 화면에서는 "챠챠을(를) 입력하세요"처럼 눈에 띄게 어색하다
//   (#365 사용자 피드백). 여기서 제대로 골라 쓴다.
const EUL = '을'
const REUL = '를'

// 완성형 한글(가~힣) 음절 코드포인트 계산으로 종성(받침) 유무를 판정한다.
// 한글이 아닌 문자(영문/숫자 닉네임 등)로 끝나면 발음을 정확히 알 수 없으니
// 자음처럼 취급해 받침 있는 쪽(을)으로 안전하게 떨어뜨린다 — 영어 닉네임이
// "존를 입력하세요"처럼 튀는 것보다는 "존을 입력하세요"가 덜 어색하다.
export function eulReul(word) {
  const lastChar = (word ?? '').trim().slice(-1)
  if (!lastChar) return REUL
  const code = lastChar.charCodeAt(0)
  if (code < 0xac00 || code > 0xd7a3) return EUL
  const hasBatchim = (code - 0xac00) % 28 !== 0
  return hasBatchim ? EUL : REUL
}

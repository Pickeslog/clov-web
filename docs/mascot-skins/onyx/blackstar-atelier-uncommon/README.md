# 블랙스타 공방 오닉스

## 확정 사항

- 스킨명: 블랙스타 공방 오닉스
- 등급: 고급 (`UNCOMMON`)
- 선택 시안: 검은 별 망치와 가장 단순하고 선명한 실루엣
- 캐릭터: 오닉스
- 콘셉트 이미지: `concept.png`

## 유지할 디자인

- 기존 오닉스의 흰 깃털, 분홍 눈, 여성스러운 인상과 장밋빛 금속 고글
- 짙은 보라색 세공사 앞치마와 청록색 한 줄 장식
- 어깨에 걸친 장밋빛 금속 망치와 검은 별 보석 장식
- 반대쪽 날개에 든 검은 오닉스 원석
- 보라색 별 충격파와 소수의 청록색 보석 파편
- 기존 마스코트처럼 단순한 페이퍼 컷아웃 실루엣

## 구현 상태

- 2026-08-04 기본 동작을 포함한 9개 상태 PNG 제작 완료
- `public/shop/skins/onyx/blackstar-atelier-uncommon`에 투명 자산과 `metadata.json` 구성 완료
- `src/components/Mascot/Mascot.jsx`에 스킨 상태 전환 경로 연결 완료
- 상점 가격 **1,500골드** 확정 — 철골 작업반 김철수와 등급(UNCOMMON)·내용(상태 9종)이 같아 같은 값을 쓴다
- `shop_items` 등록 SQL은 `clov-api/db/manual-migrations/2026-08-04-shop-onyx-blackstar-atelier-skin.sql`
- 남은 것: 에셋 배포 후 SQL 실행(순서가 반대면 상점에 이름만 뜨고 그림이 깨진다)

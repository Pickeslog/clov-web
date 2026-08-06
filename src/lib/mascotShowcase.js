/* =====================================================================
   화면에 "우리 마스코트들"을 죽 세울 때 쓰는 목록.

   Mascot.jsx 는 9개 상태 스프라이트를 전부 들고 상태 머신을 돌리지만, 이쪽은
   정지 이미지 두 장(기본·웃는 얼굴)이면 된다. 같은 이미지 파일이라 번들에서
   중복되지 않는다.

   쓰는 곳 — 온보딩 가이드(START 로스터·친구 소개·마지막 배웅) · 생일 축하 모달.
   ★ 소비자가 둘이 되면서 components/OnboardingGuide/guideMascot.js 에서 여기로
     옮겼다(#383). "가이드 전용"으로 보이는 자리에 두면 다음 사람이 헷갈린다.

   ⚠️ 버거노인은 일부러 뺐다 — 고를 수 있는 마스코트가 아니라 **상점 주인**으로 갈
      예정이라, 여기 세우면 "고를 수 있는 친구"로 잘못 읽힌다. smile 스프라이트도 없다.
      역할이 확정되면 상점 쪽 화면에서 따로 소개한다.

   ⚠️ guideMascotSprite(preferences) 가 여기 있었다(2026-08-06 제거). 가이드가 "내가
      고른 마스코트"를 띄우던 자리(START 화면·마지막 장면)가 전부 5종을 보여주는 쪽으로
      바뀌면서 그 함수도 preferences 조회도 쓸 데가 없어졌다. 개인화를 되살릴 일이 생기면
      git 이력에서 꺼내 쓴다 — mascotType 정규화 규칙('robot' → 'rob' · 모르는 값 →
      'crobi' · Object.hasOwn 으로 조회)이 거기 담겨 있고, Mascot.jsx 와 같아야 한다.
   ===================================================================== */

import crobiSprite from '../assets/mascot/crobi/default.png'
import robSprite from '../assets/mascot/rob/idle.png'
import takoGunSprite from '../assets/mascot/tako-gun/default.png'
import kimCheolsuSprite from '../assets/mascot/kim-cheolsu/default.png'
import onyxSprite from '../assets/mascot/onyx/default.png'
import crobiSmile from '../assets/mascot/crobi/smile.png'
import robSmile from '../assets/mascot/rob/smile.png'
import takoGunSmile from '../assets/mascot/tako-gun/smile.png'
import kimCheolsuSmile from '../assets/mascot/kim-cheolsu/smile.png'
import onyxSmile from '../assets/mascot/onyx/smile.png'

/**
 * sprite  기본 자세 — START 화면 로스터(픽셀 변환)와 "친구들" 단계(원본)에 쓴다.
 * smile   웃는 얼굴 — 마지막 장면에서 배웅할 때만 쓴다.
 */
export const SHOWCASE_MASCOTS = [
  { key: 'crobi', name: '크로비', sprite: crobiSprite, smile: crobiSmile },
  { key: 'rob', name: '롭', sprite: robSprite, smile: robSmile },
  { key: 'takoGun', name: '타코군', sprite: takoGunSprite, smile: takoGunSmile },
  { key: 'kimCheolsu', name: '김철수', sprite: kimCheolsuSprite, smile: kimCheolsuSmile },
  { key: 'onyx', name: '오닉스', sprite: onyxSprite, smile: onyxSmile },
]

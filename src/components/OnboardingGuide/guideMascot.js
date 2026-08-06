/* =====================================================================
   가이드에 띄울 마스코트 한 장을 고른다.

   Mascot.jsx 는 9개 상태 스프라이트를 전부 들고 상태 머신을 돌리지만, 가이드는
   정지 이미지 한 장이면 된다. 그래서 기본 스프라이트만 따로 모아둔다 —
   같은 이미지 파일이라 번들에서 중복되지 않는다.

   ⚠️ 정규화 규칙은 Mascot.jsx 의 것을 그대로 따라야 한다(현재 Mascot.jsx 의
      mascotType 계산부). 두 화면이 같은 사용자에게 다른 캐릭터를 보여주면 안 된다.
      - 'robot' → 'rob'      옛 값이 DB에 남아 있다
      - 모르는 값 → 'crobi'   백엔드에 mascotType 검증이 없다
      - Object.hasOwn 을 쓴다. SPRITES['constructor'] 는 Object 함수라 truthy 여서
        그냥 조회하면 src 에 함수가 들어가 이미지가 깨진다(Mascot.jsx 에서 재현됨)
   ===================================================================== */

import crobiSprite from '../../assets/mascot/crobi/default.png'
import robSprite from '../../assets/mascot/rob/idle.png'
import burgerOldmanSprite from '../../assets/mascot/burger-oldman/default.png'
import takoGunSprite from '../../assets/mascot/tako-gun/default.png'
import kimCheolsuSprite from '../../assets/mascot/kim-cheolsu/default.png'
import onyxSprite from '../../assets/mascot/onyx/default.png'

const DEFAULT_SPRITES = {
  crobi: crobiSprite,
  rob: robSprite,
  burgerOldman: burgerOldmanSprite,
  takoGun: takoGunSprite,
  kimCheolsu: kimCheolsuSprite,
  onyx: onyxSprite,
}

/**
 * 사용자 설정(preferences)에서 가이드에 쓸 스프라이트 URL 하나를 고른다.
 * 장착한 스킨이 있으면 그쪽이 우선이다 — 가이드에서까지 기본 외형이 뜨면
 * "내가 고른 마스코트"가 아니게 된다.
 */
export function guideMascotSprite(preferences) {
  const stored = preferences?.mascotType === 'robot' ? 'rob' : preferences?.mascotType
  const mascotType = Object.hasOwn(DEFAULT_SPRITES, stored ?? '') ? stored : 'crobi'
  return preferences?.equippedItem?.imageUrl || DEFAULT_SPRITES[mascotType]
}

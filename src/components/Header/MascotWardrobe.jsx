import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { equipItem, getInventory, unequipItem } from '../../api/shop'
import { getPreferences, updatePreferences } from '../../api/user'
import crobiSprite from '../../assets/mascot/crobi/default.png'
import robSprite from '../../assets/mascot/rob/idle.png'
import takoGunSprite from '../../assets/mascot/tako-gun/default.png'
import kimCheolsuSprite from '../../assets/mascot/kim-cheolsu/default.png'
import onyxSprite from '../../assets/mascot/onyx/default.png'

const MASCOT_SPRITES = {
  crobi: crobiSprite,
  rob: robSprite,
  takoGun: takoGunSprite,
  kimCheolsu: kimCheolsuSprite,
  onyx: onyxSprite,
}
const MASCOT_LABELS = {
  crobi: '크로비',
  rob: '롭',
  takoGun: '타코군',
  kimCheolsu: '김철수',
  onyx: '오닉스',
}
const MASCOTS = Object.keys(MASCOT_SPRITES)

// 코스튬이 어느 마스코트 것인지는 code 접두어로만 추측할 수 있다 — ShopItem 스키마엔
// 마스코트-코스튬 관계 필드가 없다(2026-08-05, api-spec §15 확인). 접두어가 안 맞는
// 코스튬(초기 4종: NEON_HOOD·STARLIGHT·CHERRY_SET·CLOVER_BADGE)은 특정 마스코트 것이
// 아닌 "공용"으로 취급한다. 앞으로 이 접두어 규칙 없이 코스튬을 등록하면 그것도 공용으로
// 떨어진다 — 진짜 관계 필드가 아니라 이름 규칙에 기대는 임시방편이다.
const MASCOT_CODE_TOKEN = {
  crobi: 'CROBI',
  rob: 'ROB',
  takoGun: 'TAKO_GUN',
  kimCheolsu: 'KIM_CHEOLSU',
  onyx: 'ONYX',
}
const belongsTo = (item, mascotType) => item?.code?.startsWith(`COSTUME_${MASCOT_CODE_TOKEN[mascotType]}_`) ?? false
const isUniversal = (item) => !MASCOTS.some((m) => belongsTo(item, m))

// 프로필 드롭다운(사용자 설정·로그아웃과 같은 박스) 안 접이식 섹션 — 마스코트 미리보기 +
// 2단계 선택(1차: 마스코트 종류, 2차: 그 마스코트의 스킨). 마스코트 종류는 사용자 설정의
// "마스코트 캐릭터"와 같은 값(preferences.mascotType)을 공유한다 — 여기서 바꾸면 설정에도
// 반영되고, 반대도 마찬가지다. Mascot.jsx와 같은 규칙(장착 아이템에 이미지가 있으면 기본
// 스프라이트를 완전히 대체)을 그대로 미리보기에 재사용한다. 바깥 클릭 닫기는 부모
// 드롭다운(Header)이 이미 처리하므로 언마운트 시 open 상태도 함께 초기화된다.
export default function MascotWardrobe({ onNavigateShop }) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState('mascot') // 'mascot' | 'skin'
  const [pickedMascotType, setPickedMascotType] = useState(null)
  const queryClient = useQueryClient()
  const prefs = useQuery({ queryKey: ['preferences'], queryFn: getPreferences })
  const inventory = useQuery({ queryKey: ['shop', 'inventory'], queryFn: getInventory, enabled: open })

  // Mascot.jsx와 같은 규칙 — 아는 값만 통과, 'robot'은 옛 이름이라 rob으로.
  // hasOwn을 쓰는 이유도 같다(MASCOT_SPRITES['constructor']가 truthy).
  const storedMascotType = prefs.data?.mascotType === 'robot' ? 'rob' : prefs.data?.mascotType
  const activeMascotType = Object.hasOwn(MASCOT_SPRITES, storedMascotType ?? '') ? storedMascotType : 'crobi'
  const baseSprite = MASCOT_SPRITES[activeMascotType]
  const previewSprite = prefs.data?.equippedItem?.imageUrl || baseSprite
  const equippedItemId = prefs.data?.equippedItem?.itemId ?? null
  const costumes = (inventory.data?.items ?? []).filter((item) => item.category === 'COSTUME')
  const equippedItem = costumes.find((item) => item.id === equippedItemId) ?? null

  const skinMascotType = pickedMascotType ?? activeMascotType
  const skinsForMascot = costumes.filter((item) => belongsTo(item, skinMascotType))
  const universalSkins = costumes.filter(isUniversal)
  const noOwnedCostumes = costumes.length === 0

  const mascotMutation = useMutation({
    mutationFn: (value) => updatePreferences({ mascotType: value }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['preferences'] }),
  })
  const equipMutation = useMutation({
    mutationFn: equipItem,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['preferences'] }),
  })
  const unequipMutation = useMutation({
    mutationFn: unequipItem,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['preferences'] }),
  })

  const toggle = () => {
    const next = !open
    setOpen(next)
    if (next) { setStep('mascot'); setPickedMascotType(null) } // 열 때마다 1차(마스코트 선택)부터 다시 시작
  }

  const pickMascot = (value) => {
    setPickedMascotType(value)
    if (value !== activeMascotType) {
      mascotMutation.mutate(value)
      // 마스코트를 바꿨는데 지금 장착 중인 코스튬이 새 마스코트 것도 공용도 아니면
      // 안 어울리는 예전 스킨 이미지가 그대로 남아 보인다 — 자동으로 벗긴다.
      if (equippedItem && !belongsTo(equippedItem, value) && !isUniversal(equippedItem)) {
        unequipMutation.mutate()
      }
    }
    setStep('skin')
  }

  const renderSkinButton = (item) => {
    const isEquipped = item.id === equippedItemId
    const pending = isEquipped
      ? unequipMutation.isPending
      : (equipMutation.isPending && equipMutation.variables === item.id)
    return (
      <button
        type="button"
        key={item.id}
        className={`clov-hdr-wardrobe-item${isEquipped ? ' on' : ''}`}
        disabled={pending}
        onClick={() => (isEquipped ? unequipMutation.mutate() : equipMutation.mutate(item.id))}
        title={item.name}
      >
        <span className="clov-hdr-wardrobe-thumb">
          {item.imageUrl ? <img src={item.imageUrl} alt="" /> : (item.name?.trim()?.[0] ?? '?')}
        </span>
        <span className="clov-hdr-wardrobe-item-name">{item.name}</span>
        {isEquipped && <span className="clov-hdr-wardrobe-badge" aria-hidden="true" />}
      </button>
    )
  }

  return (
    <li className="clov-hdr-dropdown-wardrobe">
      <button
        type="button"
        onClick={toggle}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 3 4 6l2 4 2-1v11h8V9l2 1 2-4-5-3a3 3 0 0 1-6 0z" />
        </svg>
        <span>마스코트 꾸미기</span>
        <svg className={`clov-hdr-wardrobe-chevron${open ? ' open' : ''}`} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="clov-hdr-wardrobe-panel-wrap">
          <div className="clov-hdr-wardrobe-panel" role="menu">
            <div className="clov-hdr-wardrobe-preview">
              <div className="clov-hdr-wardrobe-stage"><img src={previewSprite} alt="" /></div>
              <div className="clov-hdr-wardrobe-caption">
                <span className="clov-hdr-wardrobe-name">{MASCOT_LABELS[activeMascotType]}</span>
                <span className="clov-hdr-wardrobe-equipped">
                  {prefs.data?.equippedItem?.name ? `${prefs.data.equippedItem.name} 착용 중` : '기본 모습'}
                </span>
              </div>
            </div>

            {step === 'mascot' ? (
              <div className="clov-hdr-wardrobe-closet">
                <p className="clov-hdr-wardrobe-step-label">어떤 마스코트로 할까요?</p>
                <div className="clov-hdr-wardrobe-grid">
                  {MASCOTS.map((value) => (
                    <button
                      type="button"
                      key={value}
                      className={`clov-hdr-wardrobe-item${value === activeMascotType ? ' on' : ''}`}
                      disabled={mascotMutation.isPending}
                      onClick={() => pickMascot(value)}
                    >
                      <span className="clov-hdr-wardrobe-thumb"><img src={MASCOT_SPRITES[value]} alt="" /></span>
                      <span className="clov-hdr-wardrobe-item-name">{MASCOT_LABELS[value]}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="clov-hdr-wardrobe-closet">
                <div className="clov-hdr-wardrobe-step-head">
                  <button type="button" className="clov-hdr-wardrobe-back" onClick={() => setStep('mascot')} aria-label="뒤로">
                    <i className="ti ti-arrow-left" aria-hidden="true" />
                  </button>
                  <p className="clov-hdr-wardrobe-step-label">{MASCOT_LABELS[skinMascotType]} 스킨 고르기</p>
                </div>

                {inventory.isPending ? (
                  <p className="clov-hdr-wardrobe-note">불러오는 중…</p>
                ) : (
                  <div className="clov-hdr-wardrobe-grid">
                    <button
                      type="button"
                      className={`clov-hdr-wardrobe-item${!equippedItemId ? ' on' : ''}`}
                      disabled={unequipMutation.isPending}
                      onClick={() => unequipMutation.mutate()}
                    >
                      <span className="clov-hdr-wardrobe-thumb"><img src={MASCOT_SPRITES[skinMascotType]} alt="" /></span>
                      <span className="clov-hdr-wardrobe-item-name">기본 모습</span>
                    </button>
                    {skinsForMascot.map(renderSkinButton)}
                    {skinsForMascot.length > 0 && universalSkins.length > 0 && (
                      <span className="clov-hdr-wardrobe-divider">공용 스킨</span>
                    )}
                    {universalSkins.map(renderSkinButton)}
                  </div>
                )}
                {!inventory.isPending && noOwnedCostumes && (
                  <>
                    <p className="clov-hdr-wardrobe-note">보유한 코스튬이 없어요.</p>
                    <button type="button" className="clov-hdr-wardrobe-shop-btn" onClick={() => { setOpen(false); onNavigateShop() }}>
                      상점으로 이동
                    </button>
                  </>
                )}
              </div>
            )}
            {(mascotMutation.isError || equipMutation.isError || unequipMutation.isError) && (
              <div className="clov-hdr-wardrobe-err">
                {(mascotMutation.error ?? equipMutation.error ?? unequipMutation.error)?.message ?? '처리에 실패했어요.'}
              </div>
            )}
          </div>
        </div>
      )}
    </li>
  )
}

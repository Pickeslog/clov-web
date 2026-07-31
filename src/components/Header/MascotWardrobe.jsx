import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { equipItem, getInventory, unequipItem } from '../../api/shop'
import { getPreferences } from '../../api/user'
import crobiSprite from '../../assets/mascot/crobi.png'
import robSprite from '../../assets/mascot/rob.png'

const MASCOT_LABELS = { crobi: '크로비', rob: '로봇' }

// 프로필 드롭다운(사용자 설정·로그아웃과 같은 박스) 안 접이식 섹션 — 마스코트 미리보기 +
// 보유 코스튬 장착/해제. Mascot.jsx와 같은 규칙(장착 아이템에 이미지가 있으면 기본
// 스프라이트를 완전히 대체)을 그대로 미리보기에 재사용한다. 바깥 클릭 닫기는 부모
// 드롭다운(Header)이 이미 처리하므로 언마운트 시 open 상태도 함께 초기화된다.
export default function MascotWardrobe({ onNavigateShop }) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const prefs = useQuery({ queryKey: ['preferences'], queryFn: getPreferences })
  const inventory = useQuery({ queryKey: ['shop', 'inventory'], queryFn: getInventory, enabled: open })

  const equipMutation = useMutation({
    mutationFn: equipItem,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['preferences'] }),
  })
  const unequipMutation = useMutation({
    mutationFn: unequipItem,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['preferences'] }),
  })

  const mascotType = prefs.data?.mascotType === 'rob' ? 'rob' : 'crobi'
  const baseSprite = mascotType === 'rob' ? robSprite : crobiSprite
  const previewSprite = prefs.data?.equippedItem?.imageUrl || baseSprite
  const equippedItemId = prefs.data?.equippedItem?.itemId ?? null
  const costumes = (inventory.data?.items ?? []).filter((item) => item.category === 'COSTUME')

  return (
    <li className="clov-hdr-dropdown-wardrobe">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
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
                <span className="clov-hdr-wardrobe-name">{MASCOT_LABELS[mascotType]}</span>
                <span className="clov-hdr-wardrobe-equipped">
                  {prefs.data?.equippedItem?.name ? `${prefs.data.equippedItem.name} 착용 중` : '기본 모습'}
                </span>
              </div>
            </div>

            <div className="clov-hdr-wardrobe-closet">
              {inventory.isPending ? (
                <p className="clov-hdr-wardrobe-note">불러오는 중…</p>
              ) : costumes.length === 0 ? (
                <>
                  <p className="clov-hdr-wardrobe-note">보유한 코스튬이 없어요.</p>
                  <button type="button" className="clov-hdr-wardrobe-shop-btn" onClick={() => { setOpen(false); onNavigateShop() }}>
                    상점으로 이동
                  </button>
                </>
              ) : (
                <div className="clov-hdr-wardrobe-grid">
                  {costumes.map((item) => {
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
                  })}
                </div>
              )}
              {(equipMutation.isError || unequipMutation.isError) && (
                <div className="clov-hdr-wardrobe-err">
                  {(equipMutation.error ?? unequipMutation.error)?.message ?? '장착 처리에 실패했어요.'}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </li>
  )
}

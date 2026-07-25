import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import './shop.proto.css'
import { getInventory, getShopItems, getWallet, purchaseItem } from '../../../api/shop'
import Header from '../../../components/Header/Header'

// 서버 enum ↔ 화면 문구. 등급색은 다크/라이트 공통(등급 식별이 테마에 흔들리면 안 된다).
const RARITY = {
  COMMON: { label: '일반', color: '#9aa39b', soft: 'rgba(154, 163, 155, .22)' },
  UNCOMMON: { label: '고급', color: '#3fae6d', soft: 'rgba(63, 174, 109, .22)' },
  RARE: { label: '희귀', color: '#4a90e2', soft: 'rgba(74, 144, 226, .22)' },
  EPIC: { label: '영웅', color: '#a678e2', soft: 'rgba(166, 120, 226, .22)' },
  LEGENDARY: { label: '전설', color: '#e0993a', soft: 'rgba(224, 153, 58, .24)' },
}
const RARITY_ORDER = ['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY']

const CATEGORIES = [
  { key: 'all', label: '전체' },
  { key: 'COSTUME', label: '코스튬' },
  { key: 'SKIN', label: '스킨' },
  { key: 'EVENT', label: '이벤트·한정' },
]
const CATEGORY_ART = { COSTUME: '코스튬 아트', SKIN: '스킨 아트', EVENT: '한정 아트' }

// 서버 에러코드 → 사용자 문구. 계약 §15의 구매 실패 3종만 따로 풀어 쓴다.
const PURCHASE_ERRORS = {
  INSUFFICIENT_BALANCE: '골드가 부족해요. 조금 더 모아서 다시 시도해보세요.',
  ITEM_ALREADY_OWNED: '이미 보유 중인 아이템이에요.',
  ITEM_NOT_PURCHASABLE: '지금은 판매하지 않는 아이템이에요.',
}

const gold = (n) => Number(n ?? 0).toLocaleString()
const rarityOf = (key) => RARITY[key] ?? RARITY.COMMON

export default function Shop() {
  const queryClient = useQueryClient()
  const [category, setCategory] = useState('all')
  const [rarity, setRarity] = useState('all')
  const [owned, setOwned] = useState(false) // 보유함 탭
  const [message, setMessage] = useState(null) // { tone: 'ok' | 'err', text }

  const wallet = useQuery({ queryKey: ['wallet'], queryFn: getWallet })
  const catalog = useQuery({
    queryKey: ['shop', 'items', category, rarity],
    queryFn: () => getShopItems({ category, rarity }),
    enabled: !owned,
  })
  const inventory = useQuery({
    queryKey: ['shop', 'inventory'],
    queryFn: getInventory,
    enabled: owned,
  })

  const purchase = useMutation({
    mutationFn: purchaseItem,
    onSuccess: (result) => {
      setMessage({ tone: 'ok', text: `‘${result.item.name}’을(를) 구매했어요! 남은 골드 ${gold(result.balance)}G` })
      // 헤더 골드도 같은 ['wallet'] 키를 보므로 함께 갱신된다.
      queryClient.invalidateQueries({ queryKey: ['wallet'] })
      queryClient.invalidateQueries({ queryKey: ['shop'] })
    },
    onError: (error) => {
      setMessage({ tone: 'err', text: PURCHASE_ERRORS[error.code] ?? error.message ?? '구매하지 못했습니다.' })
    },
  })

  const active = owned ? inventory : catalog
  const items = active.data?.items ?? []
  const balance = wallet.data?.balance ?? 0
  const discounted = owned ? [] : items.filter((item) => item.discountRate > 0)

  const changeCategory = (key) => { setOwned(false); setCategory(key); setMessage(null) }
  const openInventory = () => { setOwned(true); setMessage(null) }

  const renderCard = (item) => (
    <ItemCard
      key={item.id}
      item={item}
      balance={balance}
      pending={purchase.isPending && purchase.variables === item.id}
      onBuy={() => { setMessage(null); purchase.mutate(item.id) }}
    />
  )

  return (
    <main className="proto-shop">
      <Header variant="home" />
      <div className="shop-wrap">
        <header className="shop-head">
          <div>
            <h1>상점 <small>코스튬 &amp; 스킨</small></h1>
            <p>활동으로 모은 골드로 마스코트와 화면을 꾸며보세요.</p>
          </div>
          <span className="shop-balance">
            <i aria-hidden="true">G</i>
            {wallet.isPending ? '—' : gold(balance)}
          </span>
        </header>

        <div className="shop-filters">
          {CATEGORIES.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={`shop-chip${!owned && category === tab.key ? ' active' : ''}`}
              onClick={() => changeCategory(tab.key)}
            >
              {tab.label}
            </button>
          ))}
          <span className="shop-filters-spacer" />
          <button type="button" className={`shop-chip${owned ? ' active' : ''}`} onClick={openInventory}>
            보유함
          </button>
        </div>

        {message && <div className={`shop-msg ${message.tone}`} role="status">{message.text}</div>}

        {active.isPending ? (
          <div className="shop-empty">불러오는 중…</div>
        ) : active.isError ? (
          <div className="shop-empty">상점을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.</div>
        ) : owned ? (
          <section className="shop-section">
            <div className="shop-section-head">
              <h2>보유함</h2>
              <span className="shop-section-sub">{items.length}종 보유 중</span>
            </div>
            {items.length === 0
              ? <div className="shop-empty">아직 구매한 아이템이 없어요.</div>
              : <div className="shop-grid">{items.map(renderCard)}</div>}
          </section>
        ) : (
          <>
            {discounted.length > 0 && (
              <section className="shop-section">
                <div className="shop-section-head">
                  <h2>주간 할인</h2>
                  <span className="shop-section-note">
                    최대 {Math.max(...discounted.map((item) => item.discountRate))}% 할인 중
                  </span>
                  <span className="shop-section-sub">{discounted.length}종</span>
                </div>
                <div className="shop-grid">{discounted.map(renderCard)}</div>
              </section>
            )}

            <section className="shop-section">
              <div className="shop-section-head">
                <h2>등급별 아이템</h2>
                <span className="shop-filters-spacer" />
                <button
                  type="button"
                  className={`shop-chip${rarity === 'all' ? ' active' : ''}`}
                  onClick={() => setRarity('all')}
                >
                  전체
                </button>
                {RARITY_ORDER.map((key) => (
                  <button
                    key={key}
                    type="button"
                    className={`shop-chip${rarity === key ? ' active' : ''}`}
                    onClick={() => setRarity(key)}
                  >
                    {RARITY[key].label}
                  </button>
                ))}
              </div>
              {items.length === 0
                ? <div className="shop-empty">조건에 맞는 아이템이 없어요.</div>
                : <div className="shop-grid">{items.map(renderCard)}</div>}
            </section>
          </>
        )}
      </div>
    </main>
  )
}

function ItemCard({ item, balance, pending, onBuy }) {
  const meta = rarityOf(item.rarity)
  const discounted = item.discountRate > 0
  const affordable = balance >= item.finalPrice

  return (
    <article className={`shop-card${item.owned ? ' owned' : ''}`} style={{ '--rarity': meta.color, '--rarity-soft': meta.soft }}>
      <div className="shop-art">
        {discounted && !item.owned && <span className="shop-badge">-{item.discountRate}%</span>}
        {item.owned && <span className="shop-owned-badge">보유 중</span>}
        {item.imageUrl
          ? <img src={item.imageUrl} alt="" />
          : <span className="shop-art-label">{CATEGORY_ART[item.category] ?? '아이템'}</span>}
      </div>

      <div className="shop-body">
        <span className="shop-rarity">{meta.label}</span>
        <h3 className="shop-name">{item.name}</h3>
        {item.description && <p className="shop-desc">{item.description}</p>}

        <div className="shop-price">
          {discounted && <span className="shop-price-was">{gold(item.price)}</span>}
          <span className={`shop-price-now${discounted ? ' discounted' : ''}`}>
            <i className="shop-coin" aria-hidden="true" />
            {gold(item.finalPrice)}
          </span>
        </div>

        {item.owned ? (
          <button type="button" className="shop-buy" disabled>보유 중</button>
        ) : (
          <button
            type="button"
            className={`shop-buy${affordable ? '' : ' poor'}`}
            disabled={pending || !affordable}
            onClick={onBuy}
          >
            {pending ? '구매 중…' : affordable ? '구매하기' : '골드 부족'}
          </button>
        )}
      </div>
    </article>
  )
}

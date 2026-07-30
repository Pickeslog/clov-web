import { useEffect, useId, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import './shop.proto.css'
import { equipItem, getInventory, getShopItems, getWallet, purchaseItem, unequipItem } from '../../../api/shop'
import { getPreferences } from '../../../api/user'
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

// ── 아이콘 ── 이 화면은 이모지를 쓰지 않는다(#164). 전부 currentColor 스트로크 SVG.
const Icon = ({ size = 16, children, ...rest }) => (
  <svg
    width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...rest}
  >
    {children}
  </svg>
)
const BagIcon = (p) => <Icon {...p}><path d="M4 8h16l-1.2 10a2 2 0 0 1-2 1.8H7.2a2 2 0 0 1-2-1.8L4 8zM8.5 8V6a3.5 3.5 0 0 1 7 0v2" /></Icon>
const SparkIcon = (p) => <Icon {...p}><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" /></Icon>
const CheckIcon = (p) => <Icon {...p}><path d="m20 6-11 11-5-5" /></Icon>
const BoxIcon = (p) => <Icon {...p}><path d="M21 8v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8" /><path d="M2 4h20v4H2zM10 12h4" /></Icon>
const AlertIcon = (p) => <Icon {...p}><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16h.01" /></Icon>
const ShirtIcon = (p) => <Icon {...p}><path d="M9 3 4 6l2 4 2-1v11h8V9l2 1 2-4-5-3a3 3 0 0 1-6 0z" /></Icon>
const PaletteIcon = (p) => <Icon {...p}><path d="M12 3a9 9 0 1 0 0 18 2 2 0 0 0 1.6-3.2 2 2 0 0 1 1.6-3.2H18a3 3 0 0 0 3-3 9 9 0 0 0-9-8.6z" /><circle cx="7.5" cy="11" r="1" /><circle cx="12" cy="7.5" r="1" /><circle cx="16.5" cy="11" r="1" /></Icon>
const GiftIcon = (p) => <Icon {...p}><path d="M20 12v8a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-8M2 8h20v4H2zM12 8v13" /><path d="M12 8S9.5 3 7.5 4.5 9 8 12 8zM12 8s2.5-5 4.5-3.5S15 8 12 8z" /></Icon>

// 금화 — 이모지 대신 그린 SVG(금색은 고정값: 재화 식별이 테마에 흔들리면 안 된다).
// 그라디언트 id는 인스턴스마다 고유해야 한다 — 카드가 여러 장 그려지면 같은 id의
// <linearGradient>가 문서에 중복돼 뒤 인스턴스부터 채우기가 깨진다(#164).
const CoinIcon = ({ size = 15 }) => {
  const gradientId = useId()
  return (
    <svg className="shop-coin" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
      </defs>
      <circle cx="12" cy="12" r="10" fill={`url(#${gradientId})`} />
      <circle cx="12" cy="12" r="7.2" fill="none" stroke="#4a2c00" strokeOpacity=".28" strokeWidth="1.4" />
      <path d="M12 7.6v8.8M9.6 9.6h3.2a1.9 1.9 0 0 1 0 3.8H9.6h3.4a1.9 1.9 0 0 1 0 3.8" fill="none"
        stroke="#4a2c00" strokeOpacity=".62" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

const CATEGORIES = [
  { key: 'all', label: '전체', Icon: SparkIcon },
  { key: 'COSTUME', label: '코스튬', Icon: ShirtIcon },
  { key: 'SKIN', label: '스킨', Icon: PaletteIcon },
  { key: 'EVENT', label: '이벤트·한정', Icon: GiftIcon },
]
// 아트가 아직 없는 아이템의 폴백 아이콘(텍스트 플레이스홀더 대체).
const CATEGORY_FALLBACK = { COSTUME: ShirtIcon, SKIN: PaletteIcon, EVENT: GiftIcon }

// 서버 에러코드 → 사용자 문구. 계약 §15의 구매 실패 3종만 따로 풀어 쓴다.
const PURCHASE_ERRORS = {
  INSUFFICIENT_BALANCE: '골드가 부족해요. 조금 더 모아서 다시 시도해보세요.',
  ITEM_ALREADY_OWNED: '이미 보유 중인 아이템이에요.',
  ITEM_NOT_PURCHASABLE: '지금은 판매하지 않는 아이템이에요.',
}
const EQUIP_ERRORS = {
  ITEM_NOT_OWNED: '보유하지 않은 아이템이에요.',
  ITEM_NOT_EQUIPPABLE: '이 아이템은 장착할 수 없어요.',
}

const gold = (n) => Number(n ?? 0).toLocaleString()
const rarityOf = (key) => RARITY[key] ?? RARITY.COMMON
const rectCenter = (r) => ({ x: r.left + r.width / 2, y: r.top + r.height / 2 })

const SORTS = [
  { key: 'default', label: '추천순' },
  { key: 'priceAsc', label: '가격 낮은순' },
  { key: 'priceDesc', label: '가격 높은순' },
  { key: 'newest', label: '최신순' },
]
// id는 서버 auto-increment PK라 숫자가 클수록 최근 등록된 아이템이다.
// createdAt 필드가 계약에 없어 이걸로 "최신순"을 대신한다.
const sortItems = (items, sort) => {
  if (sort === 'default') return items
  const arr = [...items]
  if (sort === 'priceAsc') arr.sort((a, b) => a.finalPrice - b.finalPrice)
  else if (sort === 'priceDesc') arr.sort((a, b) => b.finalPrice - a.finalPrice)
  else if (sort === 'newest') arr.sort((a, b) => Number(b.id) - Number(a.id))
  return arr
}

export default function Shop() {
  const queryClient = useQueryClient()
  const location = useLocation()
  // 방 안에서 상점으로 들어왔다면 그 방의 네비를 유지한다 — 방의 다른 화면(추억피드·
  // 행운편지·일정계획)과 같은 공통 헤더를 그대로 써야 헤더가 화면마다 달라 보이지
  // 않는다. 방 밖(top-level Home)에서 들어왔을 땐 연결할 방이 없어 home 헤더로 대체.
  const fromRoomId = location.state?.fromRoomId ?? null
  const [category, setCategory] = useState('all')
  const [rarity, setRarity] = useState('all')
  const [owned, setOwned] = useState(false) // 보유함 탭
  const [sort, setSort] = useState('default')
  const [message, setMessage] = useState(null) // { tone: 'ok' | 'err', text }

  // 구매 마이크로 인터랙션 — 클릭한 구매 버튼에서 보유 골드 표시까지 코인이 날아간다.
  const [flyingCoins, setFlyingCoins] = useState([])
  const [balancePulse, setBalancePulse] = useState(false)
  const balanceRef = useRef(null)
  const lastBuyRectRef = useRef(null)

  const wallet = useQuery({ queryKey: ['wallet'], queryFn: getWallet })
  const preferences = useQuery({ queryKey: ['preferences'], queryFn: getPreferences })
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

      if (lastBuyRectRef.current && balanceRef.current) {
        const from = rectCenter(lastBuyRectRef.current)
        const to = rectCenter(balanceRef.current.getBoundingClientRect())
        setFlyingCoins((coins) => [...coins, { id: `${Date.now()}-${Math.random()}`, from, to }])
      }
      // 코인이 도착할 즈음(비행 애니메이션 시간과 맞춤) 잔액 숫자를 한 번 튕겨준다.
      setTimeout(() => {
        setBalancePulse(true)
        setTimeout(() => setBalancePulse(false), 500)
      }, 550)
    },
    onError: (error) => {
      setMessage({ tone: 'err', text: PURCHASE_ERRORS[error.code] ?? error.message ?? '구매하지 못했습니다.' })
    },
  })

  const equip = useMutation({
    mutationFn: equipItem,
    onSuccess: (result) => {
      setMessage({ tone: 'ok', text: `‘${result.name}’을(를) 장착했어요.` })
      queryClient.invalidateQueries({ queryKey: ['preferences'] })
    },
    onError: (error) => {
      setMessage({ tone: 'err', text: EQUIP_ERRORS[error.code] ?? error.message ?? '장착하지 못했습니다.' })
    },
  })
  const unequip = useMutation({
    mutationFn: unequipItem,
    onSuccess: () => {
      setMessage({ tone: 'ok', text: '장착을 해제했어요.' })
      queryClient.invalidateQueries({ queryKey: ['preferences'] })
    },
    onError: (error) => {
      setMessage({ tone: 'err', text: error.message ?? '장착 해제하지 못했습니다.' })
    },
  })

  const active = owned ? inventory : catalog
  const items = active.data?.items ?? []
  // 최대 십수 종 규모라 메모이제이션 없이 매 렌더 정렬해도 비용이 무시할 만하다.
  const sortedItems = sortItems(items, sort)
  const balance = wallet.data?.balance ?? 0
  const equippedItemId = preferences.data?.equippedItem?.itemId ?? null

  const changeCategory = (key) => { setOwned(false); setCategory(key); setMessage(null) }
  const openInventory = () => { setOwned(true); setMessage(null) }
  const removeFlyingCoin = (id) => setFlyingCoins((coins) => coins.filter((c) => c.id !== id))

  const renderCard = (item) => (
    <ItemCard
      key={item.id}
      item={item}
      balance={balance}
      pending={purchase.isPending && purchase.variables === item.id}
      onBuy={(e) => { setMessage(null); lastBuyRectRef.current = e.currentTarget.getBoundingClientRect(); purchase.mutate(item.id) }}
      equipped={item.id === equippedItemId}
      equipPending={equip.isPending && equip.variables === item.id}
      unequipPending={unequip.isPending}
      onEquip={() => { setMessage(null); equip.mutate(item.id) }}
      onUnequip={() => { setMessage(null); unequip.mutate() }}
    />
  )

  return (
    <main className="proto-shop">
      {fromRoomId
        ? <Header variant="room" roomId={fromRoomId} />
        : <Header variant="home" />}
      <div className="shop-wrap">
        <header className="shop-head">
          <div className="shop-head-title">
            <span className="shop-head-icon"><BagIcon size={22} /></span>
            <div>
              <h1>상점 <small>코스튬 &amp; 스킨</small></h1>
              <p>활동으로 모은 골드로 마스코트와 화면을 꾸며보세요.</p>
            </div>
          </div>
          <span className="shop-balance">
            <span className="shop-balance-label">보유 골드</span>
            <span ref={balanceRef} className={`shop-balance-value${balancePulse ? ' pulse' : ''}`}>
              <CoinIcon size={19} />
              {wallet.isPending ? '—' : gold(balance)}
            </span>
          </span>
        </header>

        <nav className="shop-tabs">
          {CATEGORIES.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={`shop-tab${!owned && category === tab.key ? ' active' : ''}`}
              onClick={() => changeCategory(tab.key)}
            >
              <tab.Icon size={14} />
              {tab.label}
            </button>
          ))}
          <span className="shop-tabs-spacer" />
          <button type="button" className={`shop-tab${owned ? ' active' : ''}`} onClick={openInventory}>
            <BoxIcon size={14} />
            보유함
          </button>
        </nav>

        {message && (
          <div className={`shop-msg ${message.tone}`} role="status">
            {message.tone === 'ok' ? <CheckIcon size={16} /> : <AlertIcon size={16} />}
            {message.text}
          </div>
        )}

        {active.isPending ? (
          <div className="shop-empty">불러오는 중…</div>
        ) : active.isError ? (
          <div className="shop-empty">
            <AlertIcon size={26} />
            상점을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.
          </div>
        ) : owned ? (
          <section className="shop-section">
            <div className="shop-section-head">
              <h2><BoxIcon size={17} />보유함</h2>
              <span className="shop-section-sub">{items.length}종 보유 중</span>
              <span className="shop-filters-spacer" />
              <SortSelect value={sort} onChange={setSort} />
            </div>
            {items.length === 0
              ? (
                <div className="shop-empty">
                  <BoxIcon size={26} />
                  아직 구매한 아이템이 없어요.
                </div>
              )
              : <div className="shop-grid">{sortedItems.map(renderCard)}</div>}
          </section>
        ) : (
            <section className="shop-section">
              <div className="shop-section-head">
                <h2><SparkIcon size={17} />등급별 아이템</h2>
                <span className="shop-filters-spacer" />
                <SortSelect value={sort} onChange={setSort} />
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
                ? (
                  <div className="shop-empty">
                    <SparkIcon size={26} />
                    조건에 맞는 아이템이 없어요.
                  </div>
                )
                : <div className="shop-grid">{sortedItems.map(renderCard)}</div>}
            </section>
        )}
      </div>

      {flyingCoins.length > 0 && (
        <div className="shop-coin-layer" aria-hidden="true">
          {flyingCoins.map((coin) => (
            <FlyingCoin key={coin.id} coin={coin} onDone={() => removeFlyingCoin(coin.id)} />
          ))}
        </div>
      )}
    </main>
  )
}

function SortSelect({ value, onChange }) {
  return (
    <label className="shop-sort">
      정렬
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {SORTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
      </select>
    </label>
  )
}

// 구매 버튼 위치 → 보유 골드 표시까지 코인 하나가 날아가는 짧은 연출.
function FlyingCoin({ coin, onDone }) {
  const [flying, setFlying] = useState(false)
  useEffect(() => {
    const raf = requestAnimationFrame(() => setFlying(true))
    const timer = setTimeout(onDone, 700)
    return () => { cancelAnimationFrame(raf); clearTimeout(timer) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const dx = coin.to.x - coin.from.x
  const dy = coin.to.y - coin.from.y
  return (
    <span
      className={`shop-flying-coin${flying ? ' flying' : ''}`}
      style={{ left: coin.from.x, top: coin.from.y, '--dx': `${dx}px`, '--dy': `${dy}px` }}
    >
      <CoinIcon size={16} />
    </span>
  )
}

function ItemCard({ item, balance, pending, onBuy, equipped, equipPending, unequipPending, onEquip, onUnequip }) {
  const meta = rarityOf(item.rarity)
  const discounted = item.discountRate > 0
  const affordable = balance >= item.finalPrice
  // 오늘 범위: COSTUME만 마스코트에 장착 가능(서버도 동일하게 검증). SKIN/EVENT는 보유만.
  const equippable = item.category === 'COSTUME'
  const FallbackIcon = CATEGORY_FALLBACK[item.category] ?? SparkIcon

  return (
    <article className={`shop-card${item.owned ? ' owned' : ''}`} style={{ '--rarity': meta.color, '--rarity-soft': meta.soft }}>
      <div className="shop-art">
        {discounted && !item.owned && <span className="shop-badge">-{item.discountRate}%</span>}
        {item.owned && (
          <span className="shop-owned-badge">
            <CheckIcon size={12} />
            {equipped ? '장착 중' : '보유 중'}
          </span>
        )}
        {item.imageUrl
          ? <img src={item.imageUrl} alt="" />
          : <span className="shop-art-fallback"><FallbackIcon size={46} /></span>}
      </div>

      <div className="shop-body">
        <span className="shop-rarity">{meta.label}</span>
        <h3 className="shop-name">{item.name}</h3>
        {item.description && <p className="shop-desc">{item.description}</p>}

        <div className="shop-price">
          {discounted && <span className="shop-price-was">{gold(item.price)}</span>}
          <span className={`shop-price-now${discounted ? ' discounted' : ''}`}>
            <CoinIcon />
            {gold(item.finalPrice)}
          </span>
        </div>

        {item.owned ? (
          equippable ? (
            <button
              type="button"
              className={`shop-buy${equipped ? ' equipped' : ''}`}
              disabled={equipPending || unequipPending}
              onClick={equipped ? onUnequip : onEquip}
            >
              {equipped ? (unequipPending ? '해제 중…' : '장착 해제') : (equipPending ? '장착 중…' : '장착하기')}
            </button>
          ) : (
            <button type="button" className="shop-buy" disabled>
              <CheckIcon size={14} />
              보유 중
            </button>
          )
        ) : (
          <button
            type="button"
            className={`shop-buy${affordable ? '' : ' poor'}`}
            disabled={pending || !affordable}
            onClick={onBuy}
          >
            {!pending && affordable && <BagIcon size={14} />}
            {pending ? '구매 중…' : affordable ? '구매하기' : '골드 부족'}
          </button>
        )}
      </div>
    </article>
  )
}

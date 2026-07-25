import { api } from './client'

// 상점/재화(shop) 도메인 호출. 컴포넌트는 fetch를 직접 쓰지 않고 이 함수들을 통해서만 호출한다.
// 응답은 client.js 인터셉터가 언래핑한 data가 그대로 반환된다(계약 §15).
// category/rarity는 미지정 또는 'all'이면 서버가 필터 없이 전체를 준다.
export const getShopItems = (params) => api.get('/shop/items', { params })
export const getWallet = () => api.get('/shop/wallet')
export const getInventory = () => api.get('/shop/inventory')
// 청구액은 서버가 계산한다 — 프론트는 금액을 보내지 않는다.
export const purchaseItem = (itemId) => api.post(`/shop/items/${itemId}/purchase`)

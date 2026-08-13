import { api } from './client'

export const getNotifications = (roomId, type, page = 0, size = 20) => {
  const params = { page, size }
  if (type) params.type = type
  return api.get(`/rooms/${roomId}/notifications`, { params })
}

export const markNotificationRead = (id) => api.patch(`/notifications/${id}/read`)

export const markAllNotificationsRead = (roomId) => api.patch(`/rooms/${roomId}/notifications/read-all`)

// 종 아이콘 배지(web-design-repository#89) — room 무관, 유저 전체 기준. { hasUnread }. 방 목록(홈)에서 쓴다.
export const getUnreadNotification = () => api.get('/users/me/notifications/unread')

// 방 안 종 아이콘 배지(clov-api#174) — 이 방만 기준. { hasUnread }. Header variant='room'에서 쓴다.
export const getUnreadNotificationForRoom = (roomId) => api.get(`/rooms/${roomId}/notifications/unread`)

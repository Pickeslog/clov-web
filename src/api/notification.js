import { api } from './client'

export const getNotifications = (roomId, type, page = 0, size = 20) => {
  const params = { page, size }
  if (type) params.type = type
  return api.get(`/rooms/${roomId}/notifications`, { params })
}

export const markNotificationRead = (id) => api.patch(`/notifications/${id}/read`)

export const markAllNotificationsRead = (roomId) => api.patch(`/rooms/${roomId}/notifications/read-all`)

// 방 안 종 아이콘 배지(clov-api#174) — 이 방만 기준. { hasUnread }. Header variant='room'에서 쓴다.
export const getUnreadNotificationForRoom = (roomId) => api.get(`/rooms/${roomId}/notifications/unread`)

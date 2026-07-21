import { api } from './client'

export const getNotifications = (roomId, type, page = 0, size = 20) => {
  const params = { page, size }
  if (type) params.type = type
  return api.get(`/rooms/${roomId}/notifications`, { params })
}

export const markNotificationRead = (id) => api.patch(`/notifications/${id}/read`)

export const markAllNotificationsRead = (roomId) => api.patch(`/rooms/${roomId}/notifications/read-all`)

import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as S from './Notifications.style'
import { getNotifications, markNotificationRead, markAllNotificationsRead } from '../../../api/notification'

const TABS = [
  { id: 'NOTICE', label: '관리진 공지' },
  { id: 'FRIEND', label: '친구들 알림' },
  { id: 'JOIN', label: '가입 신청' },
]

export default function Notifications() {
  const { roomId } = useParams()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('NOTICE')

  const { data, isPending, isError } = useQuery({
    queryKey: ['notifications', roomId, activeTab],
    queryFn: () => getNotifications(roomId, activeTab)
  })

  const readMutation = useMutation({
    mutationFn: (id) => markNotificationRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', roomId] })
    },
  })

  const readAllMutation = useMutation({
    mutationFn: () => markAllNotificationsRead(roomId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', roomId] })
    },
  })

  // 백엔드가 현재 bare array를 반환하지만 계약 §13은 { items } 봉투다. 백엔드 봉투 정합화(clov-api 후속)
  // 전후 모두 안전하도록 두 형태를 견딘다 — 배열이면 그대로, 봉투면 items 추출.
  const notifications = Array.isArray(data) ? data : (data?.items ?? [])
  const hasUnread = notifications.some(n => !n.isRead)

  return (
    <S.Page>
      <S.TopBar>
        <S.Title>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          알림
        </S.Title>
        <S.HeaderActions>
          <S.ActionBtn 
            type="button" 
            onClick={() => readAllMutation.mutate()} 
            disabled={!hasUnread || readAllMutation.isPending}
          >
            모두 읽음
          </S.ActionBtn>
          <S.BackBtn to={`/rooms/${roomId}`}>닫기</S.BackBtn>
        </S.HeaderActions>
      </S.TopBar>

      <S.Content>
        <S.Tabs>
          {TABS.map((tab) => (
            <S.Tab 
              key={tab.id} 
              $active={activeTab === tab.id} 
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </S.Tab>
          ))}
        </S.Tabs>

        {isPending ? (
          <S.EmptyState>알림을 불러오는 중...</S.EmptyState>
        ) : isError ? (
          <S.EmptyState>알림을 불러오지 못했습니다.</S.EmptyState>
        ) : notifications.length === 0 ? (
          <S.EmptyState>새로운 알림이 없습니다.</S.EmptyState>
        ) : (
          <S.List>
            {notifications.map((noti) => (
              <S.ListItem key={noti.id} $isRead={noti.isRead}>
                <S.ItemBody>
                  <S.ItemMessage $isRead={noti.isRead}>
                    {noti.type === 'NOTICE' && '📢 공지사항 알림이 도착했습니다.'}
                    {noti.type === 'FRIEND' && '👋 친구의 새로운 활동 알림이 있습니다.'}
                    {noti.type === 'JOIN' && '💌 우정공간 가입 신청이 도착했습니다.'}
                  </S.ItemMessage>
                  <S.ItemTime>{new Date(noti.createdAt).toLocaleString()}</S.ItemTime>
                </S.ItemBody>
                {!noti.isRead && (
                  <S.ReadBtn 
                    type="button" 
                    onClick={() => readMutation.mutate(noti.id)}
                    disabled={readMutation.isPending}
                  >
                    읽음
                  </S.ReadBtn>
                )}
              </S.ListItem>
            ))}
          </S.List>
        )}
      </S.Content>
    </S.Page>
  )
}

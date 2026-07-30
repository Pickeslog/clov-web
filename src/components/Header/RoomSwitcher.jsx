import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { getRooms } from '../../api/room'

// 프로필 메뉴 "방 변경하기" — 가입한 방 목록(RoomList와 같은 ['rooms'] 캐시)에서
// 골라 바로 이동. 홈을 거쳐 들어왔으면 캐시가 있어 즉시 뜨고, 없으면 여기서 처음 조회한다
// (마운트 자체가 게이트 — 열릴 때만 렌더되므로 다른 5개 화면에선 이 쿼리가 돌지 않는다).
const initialOf = (name) => (name || '?').trim().slice(0, 1)

export default function RoomSwitcher({ currentRoomId, onClose }) {
  const navigate = useNavigate()
  const rooms = useQuery({ queryKey: ['rooms'], queryFn: getRooms })

  useEffect(() => {
    const onKeyDown = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])
  const items = rooms.data?.items ?? []
  const others = items.filter((r) => String(r.id) !== String(currentRoomId))

  const goHome = () => { navigate('/'); onClose() }
  const goRoom = (roomId) => {
    if (String(roomId) !== String(currentRoomId)) navigate(`/rooms/${roomId}`)
    onClose()
  }

  return (
    <div className="clov-rs-backdrop" onClick={onClose}>
      <div className="clov-rs-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="clov-rs-head">
          <span>🔁 방 변경하기</span>
          <button type="button" className="clov-rs-close" onClick={onClose} aria-label="닫기">×</button>
        </div>
        <p className="clov-rs-sub">내가 가지고 있는 우정공간 중 들어갈 방을 선택하세요.</p>

        {rooms.isPending ? (
          <div className="clov-rs-state">불러오는 중…</div>
        ) : rooms.isError ? (
          <div className="clov-rs-state">방 목록을 불러오지 못했어요.</div>
        ) : (
          <>
            {items.length > 0 && (
              <ul className="clov-rs-list">
                {items.map((room) => {
                  const isCurrent = String(room.id) === String(currentRoomId)
                  return (
                    <li key={room.id}>
                      <button
                        type="button"
                        className={`clov-rs-item${isCurrent ? ' current' : ''}`}
                        disabled={isCurrent}
                        onClick={() => goRoom(room.id)}
                      >
                        <span className="clov-rs-avatar" aria-hidden="true">{initialOf(room.name)}</span>
                        <span className="clov-rs-name">{room.name}</span>
                        {isCurrent && <span className="clov-rs-badge">현재</span>}
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}

            {others.length === 0 && (
              <div className="clov-rs-empty">
                <p>{items.length === 0 ? '아직 가입한 우정공간이 없어요.' : '다른 우정공간이 없어요.'}</p>
                <button type="button" className="clov-rs-cta" onClick={goHome}>방 만들기 · 초대 코드 입력하러 가기</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

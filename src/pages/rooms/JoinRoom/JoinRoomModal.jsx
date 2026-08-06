import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import './joinroom.proto.css'
import { requestJoin } from '../../../api/invite'
import { describeInviteError, extractJoinedRoomId } from '../../../lib/inviteError'

// 초대 코드로 가입을 "신청"하는 모달(계약 §7) — 신청 즉시 입장이 아니라 PENDING 생성.
//
// 원래는 /join 전용 페이지였다. 방 목록에서 코드를 넣으러 갈 때 화면이 통째로 바뀌는 게
// 과했고(코드 하나 넣는 일이다), 딥링크로 들어온 사람도 뒤에 아무것도 없는 빈 화면을 봤다.
// 모달로 바꾸면 뒤에 방 목록이 남아서 "지금 어디에 있는지"가 유지되고, 닫으면 그대로다.
//
// 폼 구현은 여기 하나뿐이다 — /join·/join/:code 딥링크도 RoomList가 이 모달을 열어 처리한다.
// 두 벌로 만들면 한쪽만 고쳐지는 날이 온다.
export default function JoinRoomModal({ initialCode = '', onClose }) {
  const navigate = useNavigate()
  const [inviteCode, setInviteCode] = useState(initialCode)
  const [message, setMessage] = useState('')

  const { mutate, isPending, isSuccess } = useMutation({
    mutationFn: () => requestJoin({ inviteCode: inviteCode.trim().toUpperCase() }),
    onSuccess: () => setMessage(''),
    onError: (error) => {
      // 이미 멤버인 코드였으면 신청이 아니라 그 방으로 보낸다(기존 페이지 동작 그대로).
      const roomId = extractJoinedRoomId(error)
      if (roomId) {
        onClose?.()
        navigate(`/rooms/${roomId}`)
        return
      }
      setMessage(describeInviteError(error))
    },
  })

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const handleSubmit = () => {
    setMessage('')
    if (!inviteCode.trim()) {
      setMessage('초대 코드를 입력해주세요.')
      return
    }
    mutate()
  }

  return (
    <div className="proto-joinroom">
      <div className="joinroom-overlay" onClick={onClose}>
        <div
          className="joinroom-card"
          role="dialog"
          aria-modal="true"
          aria-labelledby="joinroom-title"
          onClick={(e) => e.stopPropagation()}
        >
          <button type="button" className="joinroom-close" onClick={onClose} aria-label="닫기">×</button>
          <h2 id="joinroom-title" className="joinroom-title">초대 코드로 참여하기</h2>
          <p className="joinroom-desc">친구에게 받은 초대 코드를 입력하면 가입 신청이 접수됩니다.</p>

          {isSuccess ? (
            <div className="joinroom-success">
              가입 신청이 접수되었습니다! 공간 멤버가 수락하면 참여가 확정됩니다.
              <div style={{ marginTop: 10 }}>
                <button type="button" className="joinroom-back-link" onClick={onClose}>
                  우정공간 목록으로
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="joinroom-field">
                <label className="joinroom-label" htmlFor="invite-code">초대 코드</label>
                <input
                  id="invite-code"
                  className="joinroom-input"
                  value={inviteCode}
                  placeholder="CLV-JOIN-XXXXXX"
                  /* 코드를 넣으러 연 모달이다 — 바로 칠 수 있어야 한다.
                     딥링크로 코드가 이미 채워져 있으면 굳이 포커스를 뺏지 않는다. */
                  autoFocus={!initialCode}
                  onChange={(event) => setInviteCode(event.target.value)}
                  onKeyDown={(event) => { if (event.key === 'Enter' && !isPending) handleSubmit() }}
                />
              </div>
              <button type="button" className="joinroom-submit" onClick={handleSubmit} disabled={isPending}>
                {isPending ? '신청하는 중…' : '가입 신청하기'}
              </button>
              {message && <div className="joinroom-message" role="alert">{message}</div>}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

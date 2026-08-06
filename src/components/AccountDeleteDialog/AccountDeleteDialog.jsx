import { useEffect, useId, useState } from 'react'
import './AccountDeleteDialog.css'
import Button from '../Button/Button'
import { eulReul } from '../../lib/josa'

// 계정 탈퇴 전용 확인 모달(#360 후속 — 사용자 요청으로 공용 ConfirmDialog에서 분리).
//
// 공용 ConfirmDialog(예/아니오 두 버튼)는 약속 삭제·우정공간 나가기·초대코드 만료처럼
// "취소 가능한 되돌릴 수 있는 작업"에는 맞지만, 계정 탈퇴처럼 정말 되돌릴 수 없는
// 액션엔 업계에서 흔히 쓰는 "타이핑 확인(type-to-confirm)" 패턴을 쓴다(GitHub의
// 저장소 삭제, Slack의 워크스페이스 삭제 등) — 실수로 두 번 클릭했다가 탈퇴되는
// 사고를 막는다. 그래서 닉네임을 정확히 입력해야 탈퇴 버튼이 눌린다.
//
// 결과 문구는 API-CONTRACT.md §5(DELETE /users/me)의 실제 동작(탈퇴 = "삭제"가 아니라
// "익명화" — 닉네임 "언노운", 기록은 FK 보존)에 근거하되, 사용자에게는 "익명화"라는
// 용어를 그대로 던지지 않고 구체적으로 뭐가 바뀌고(닉네임) 뭐가 안 바뀌는지(기록)만
// 평서문으로 풀어 쓴다 — 처음 버전은 "탈퇴는 삭제가 아니라 익명화예요"라는 문장을
// 따로 두어서, 바로 아래 "기록은 안 지워진다" 항목과 같은 말을 두 번 하는 것처럼
// 겹쳐 보이고 무슨 뜻인지도 애매하다는 피드백을 받았다(#365) — 한 문장으로 합쳤다.
export default function AccountDeleteDialog({ nickname, isPending, error, onConfirm, onCancel }) {
  const [typed, setTyped] = useState('')
  const inputId = useId()
  const ready = typed.trim().length > 0 && typed.trim() === nickname
  const josa = eulReul(nickname)

  useEffect(() => {
    const onKeyDown = (e) => { if (e.key === 'Escape' && !isPending) onCancel() }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onCancel, isPending])

  return (
    <div className="clov-adel-overlay" onClick={isPending ? undefined : onCancel} role="presentation">
      <div
        className="clov-adel-modal"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="clov-adel-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="clov-adel-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2.5 22.5 21H1.5L12 2.5Z" fill="currentColor" fillOpacity="0.14" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
            <path d="M12 9.5v5.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            <circle cx="12" cy="17.4" r="1.05" fill="currentColor" />
          </svg>
        </div>

        <h3 id="clov-adel-title" className="clov-adel-title">계정을 탈퇴할까요?</h3>

        {/* <br />은 반응형으로 자연 줄바꿈되게 두지 않고 사용자가 지정한 지점에서
            고정으로 끊는다(#365 피드백) — 뷰포트 폭이 바뀌어도(word-break: keep-all과
            무관하게) 항상 이 두 지점에서만 줄이 나뉜다. */}
        <ul className="clov-adel-list">
          <li>모든 기기에서 즉시 로그아웃되고,<br />같은 계정으로 다시 로그인할 수 없어요</li>
          <li>닉네임이 <b>‘언노운’</b>으로 바뀌고, 참여했던 우정공간과<br />추억·편지 기록은 삭제되지 않고 그대로 남아요</li>
          <li>이 작업은 되돌릴 수 없어요</li>
        </ul>

        <div className="clov-adel-confirm">
          <label htmlFor={inputId}>
            계속하려면 닉네임 <strong>{nickname}</strong>{josa} 입력하세요
          </label>
          <input
            id={inputId}
            type="text"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder={nickname}
            autoComplete="off"
            autoFocus
            disabled={isPending}
            className="clov-adel-input"
            aria-invalid={typed.length > 0 && !ready}
          />
        </div>

        {error && <p className="clov-adel-error">{error}</p>}

        <div className="clov-adel-actions">
          <Button variant="secondary" size="md" onClick={onCancel} disabled={isPending}>취소</Button>
          <Button variant="danger" size="md" onClick={onConfirm} disabled={!ready || isPending}>
            {isPending ? '처리 중…' : '탈퇴하기'}
          </Button>
        </div>
      </div>
    </div>
  )
}

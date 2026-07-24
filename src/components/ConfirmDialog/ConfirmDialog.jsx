import { useEffect } from 'react'
import './ConfirmDialog.css'
import Button from '../Button/Button'

// 실제 다이얼로그 UI. Provider(useConfirm.js)가 열림/닫힘 상태를 들고 이 컴포넌트를 렌더한다.
export default function ConfirmDialog({ message, title, confirmText = '확인', cancelText = '취소', variant = 'primary', onConfirm, onCancel }) {
  useEffect(() => {
    const onKeyDown = (e) => { if (e.key === 'Escape') onCancel() }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onCancel])

  return (
    <div className="clov-confirm-overlay" onClick={onCancel} role="presentation">
      <div className="clov-confirm-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        {title && <h3 className="clov-confirm-title">{title}</h3>}
        <p className="clov-confirm-message">{message}</p>
        <div className="clov-confirm-actions">
          <Button variant="secondary" size="md" onClick={onCancel}>{cancelText}</Button>
          <Button variant={variant} size="md" onClick={onConfirm}>{confirmText}</Button>
        </div>
      </div>
    </div>
  )
}

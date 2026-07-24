import { useContext } from 'react'
import { ConfirmContext } from './ConfirmDialogContext'

// const confirm = useConfirm() → await confirm('정말 삭제할까요?', { variant: 'danger' }) → Promise<boolean>
export function useConfirm() {
  const confirm = useContext(ConfirmContext)
  if (!confirm) throw new Error('useConfirm은 ConfirmDialogProvider 안에서만 쓸 수 있다')
  return confirm
}

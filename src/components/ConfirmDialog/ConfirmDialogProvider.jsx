import { useCallback, useRef, useState } from 'react'
import { ConfirmContext } from './ConfirmDialogContext'
import ConfirmDialog from './ConfirmDialog'

// App.jsx 최상단에 한 번만 마운트. 자식 어디서든 useConfirm()으로 다이얼로그를 띄운다.
export function ConfirmDialogProvider({ children }) {
  const [dialog, setDialog] = useState(null)
  const resolverRef = useRef(null)

  const confirm = useCallback((message, options = {}) => (
    new Promise((resolve) => {
      resolverRef.current = resolve
      setDialog({ message, ...options })
    })
  ), [])

  const close = useCallback((result) => {
    setDialog(null)
    resolverRef.current?.(result)
    resolverRef.current = null
  }, [])

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {dialog && (
        <ConfirmDialog
          message={dialog.message}
          title={dialog.title}
          confirmText={dialog.confirmText}
          cancelText={dialog.cancelText}
          variant={dialog.variant}
          onConfirm={() => close(true)}
          onCancel={() => close(false)}
        />
      )}
    </ConfirmContext.Provider>
  )
}

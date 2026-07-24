import { createContext } from 'react'

// useConfirm.js(훅)과 ConfirmDialogProvider.jsx(컴포넌트)가 공유하는 컨텍스트.
// 파일을 분리한 이유: 컴포넌트 파일은 컴포넌트만 export해야 Fast Refresh가 깨지지 않는다.
export const ConfirmContext = createContext(null)

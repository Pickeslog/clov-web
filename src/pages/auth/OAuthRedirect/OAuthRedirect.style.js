import styled from '@emotion/styled'
import { keyframes } from '@emotion/react'

const spin = keyframes`
  to { transform: rotate(360deg); }
`

export const Page = styled.main`
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 24px;
  color: var(--text);
  background: var(--cream);
`

export const Panel = styled.section`
  width: min(100%, 440px);
  padding: 32px;
  background: var(--paper);
  border: 1px solid var(--line);
  border-radius: 8px;
  box-shadow: 0 18px 42px rgba(7, 59, 36, 0.12);
`

export const LoadingMark = styled.div`
  width: 32px;
  height: 32px;
  margin-bottom: 20px;
  border: 3px solid var(--line);
  border-top-color: var(--leaf);
  border-radius: 50%;
  animation: ${spin} 0.8s linear infinite;
`

export const Kicker = styled.p`
  margin: 0 0 8px;
  color: var(--leaf);
  font-size: 0.85rem;
  font-weight: 700;
`

export const Title = styled.h1`
  margin: 0;
  color: var(--forest);
  font-size: 1.45rem;
  line-height: 1.3;
`

export const Description = styled.p`
  margin: 12px 0 0;
  color: var(--muted);
  line-height: 1.6;

  strong {
    color: var(--text);
  }
`

export const Email = styled.p`
  margin: 16px 0 0;
  padding: 10px 12px;
  overflow-wrap: anywhere;
  color: var(--text);
  background: var(--cream);
  border: 1px solid var(--line);
  border-radius: 6px;
  font-size: 0.9rem;
`

export const AgreementList = styled.div`
  display: grid;
  gap: 10px;
  margin: 24px 0 18px;
`

export const AgreementRow = styled.label`
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 40px;
  cursor: pointer;
`

export const Checkbox = styled.input`
  width: 18px;
  height: 18px;
  margin: 0;
  accent-color: var(--leaf);
`

export const AgreementLabel = styled.span`
  color: var(--text);
  font-size: 0.92rem;
`

export const Required = styled.span`
  margin-left: 4px;
  color: var(--warn);
  font-size: 0.75rem;
  font-weight: 700;
`

export const Message = styled.p`
  margin: 0 0 14px;
  color: #b42318;
  font-size: 0.9rem;
  line-height: 1.5;
`

export const ConfirmButton = styled.button`
  width: 100%;
  min-height: 46px;
  border: 0;
  border-radius: 6px;
  color: #ffffff;
  background: var(--leaf);
  cursor: pointer;
  font: inherit;
  font-weight: 700;

  &:hover:not(:disabled) {
    background: var(--forest);
  }

  &:disabled {
    cursor: wait;
    opacity: 0.65;
  }
`

export const LoginLink = styled.a`
  display: block;
  margin-top: 16px;
  color: var(--leaf);
  font-size: 0.9rem;
  font-weight: 700;
  text-align: center;
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`

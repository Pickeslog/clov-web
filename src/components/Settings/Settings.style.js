import styled from '@emotion/styled'

export const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 30;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgba(7, 59, 36, 0.32);
  backdrop-filter: blur(4px);
`

export const Modal = styled.div`
  width: min(480px, 100%);
  max-height: 88vh;
  overflow-y: auto;
  padding: 24px 26px 28px;
  border-radius: 22px;
  background: var(--paper);
  box-shadow: 0 32px 80px rgba(7, 59, 36, 0.28);
`

export const Head = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
`

export const Title = styled.h2`
  font-size: 1.3rem;
  font-weight: 900;
  color: var(--forest);
`

export const CloseBtn = styled.button`
  border: 1px solid var(--line);
  border-radius: 999px;
  padding: 6px 14px;
  background: var(--paper);
  color: var(--muted);
  font: inherit;
  font-weight: 800;
  font-size: 0.8rem;
  cursor: pointer;

  &:hover {
    color: var(--leaf);
    border-color: var(--mint);
  }
`

export const State = styled.div`
  padding: 40px 0;
  text-align: center;
  color: var(--muted);
  font-weight: 700;
`

export const Section = styled.section`
  padding: 16px 0;
  border-top: 1px solid var(--line);
  display: grid;
  gap: 10px;
`

export const SectionTitle = styled.h3`
  font-size: 0.95rem;
  font-weight: 900;
  color: var(--forest);
`

export const ReadRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-size: 0.86rem;

  span {
    color: var(--muted);
    font-weight: 700;
  }
  strong {
    color: var(--text);
    font-weight: 800;
  }
`

export const AvatarRow = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
`

export const Avatar = styled.div`
  width: 64px;
  height: 64px;
  flex-shrink: 0;
  border-radius: 50%;
  overflow: hidden;
  border: 1.5px solid var(--line);
  background: var(--cream);
  display: grid;
  place-items: center;
  color: var(--muted);
  font-weight: 900;
  font-size: 1.5rem;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`

export const UploadBtn = styled.button`
  border: 1px solid var(--line);
  border-radius: 999px;
  padding: 8px 16px;
  background: var(--paper);
  color: var(--leaf);
  font: inherit;
  font-weight: 800;
  font-size: 0.8rem;
  cursor: pointer;

  &:hover:not(:disabled) {
    border-color: var(--mint);
  }
  &:disabled {
    opacity: 0.6;
    cursor: default;
  }
`

export const Field = styled.div`
  display: grid;
  gap: 6px;
`

export const Label = styled.label`
  color: var(--forest);
  font-size: 0.76rem;
  font-weight: 800;
`

export const Input = styled.input`
  height: 44px;
  padding: 0 14px;
  border: 1.5px solid var(--line);
  border-radius: 12px;
  background: var(--cream);
  color: var(--text);
  font: inherit;

  &:focus {
    outline: none;
    border-color: var(--mint);
    box-shadow: 0 0 0 4px var(--glow);
  }
`

export const Select = styled.select`
  height: 44px;
  padding: 0 12px;
  border: 1.5px solid var(--line);
  border-radius: 12px;
  background: var(--cream);
  color: var(--text);
  font: inherit;
  font-weight: 600;
`

export const Row = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`

export const SaveBtn = styled.button`
  border: 0;
  border-radius: 12px;
  padding: 9px 16px;
  background: linear-gradient(135deg, #093d26, #16874b 56%, #50d990);
  color: #fff;
  font: inherit;
  font-weight: 800;
  font-size: 0.85rem;
  cursor: pointer;

  &:disabled {
    opacity: 0.6;
    cursor: default;
  }
`

export const Ok = styled.span`
  color: var(--leaf);
  font-size: 0.8rem;
  font-weight: 800;
`

export const Err = styled.span`
  color: var(--warn);
  font-size: 0.8rem;
  font-weight: 800;
`

export const ToggleRow = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text);
  font-size: 0.88rem;
  font-weight: 700;
  cursor: pointer;
`

export const Danger = styled.section`
  margin-top: 6px;
  padding: 16px;
  border: 1px solid var(--warn);
  border-radius: 14px;
  background: rgba(180, 83, 9, 0.06);
  display: grid;
  gap: 10px;
`

export const DangerText = styled.p`
  color: var(--muted);
  font-size: 0.82rem;
  font-weight: 600;
  line-height: 1.5;
`

export const DangerBtn = styled.button`
  justify-self: start;
  border: 1px solid var(--warn);
  border-radius: 12px;
  padding: 9px 16px;
  background: var(--paper);
  color: var(--warn);
  font: inherit;
  font-weight: 800;
  font-size: 0.85rem;
  cursor: pointer;

  &:disabled {
    opacity: 0.6;
    cursor: default;
  }
`

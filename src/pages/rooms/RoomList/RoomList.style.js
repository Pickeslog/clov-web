import styled from '@emotion/styled'

export const Page = styled.main`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  color: var(--text);
  font-family: 'Outfit', sans-serif;
  background: linear-gradient(135deg, #fffdf3 0%, #fffaf0 48%, #fdf6e3 100%);
`

export const Header = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 24px;
  border-bottom: 1px solid var(--line);
`

export const Brand = styled.div`
  font-weight: 900;
  font-size: 1.2rem;
  letter-spacing: -0.02em;
  color: var(--forest);
`

export const LogoutBtn = styled.button`
  border: 1px solid var(--line);
  border-radius: 999px;
  padding: 7px 14px;
  background: var(--paper);
  color: var(--muted);
  font: inherit;
  font-weight: 800;
  font-size: 0.82rem;
  cursor: pointer;

  &:hover {
    color: var(--leaf);
    border-color: var(--mint);
  }
`

export const Body = styled.div`
  flex: 1;
  width: min(720px, 100%);
  margin: 0 auto;
  padding: 40px 24px 64px;
  display: grid;
  gap: 28px;
`

export const Intro = styled.section`
  display: grid;
  gap: 8px;
`

export const Title = styled.h1`
  font-size: 1.9rem;
  font-weight: 900;
  color: var(--text);
`

export const Desc = styled.p`
  color: var(--muted);
  font-size: 0.95rem;
  line-height: 1.6;
  font-weight: 500;
`

export const Notice = styled.p`
  margin-top: 4px;
  padding: 10px 14px;
  border: 1px dashed var(--line);
  border-radius: 12px;
  color: var(--muted);
  background: var(--cream);
  font-size: 0.82rem;
  font-weight: 600;
`

export const CreateCard = styled.section`
  padding: 26px;
  border: 1px solid var(--line);
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.8);
  box-shadow: 0 18px 44px rgba(7, 59, 36, 0.08);
  display: grid;
  gap: 16px;
`

export const CardTitle = styled.h2`
  font-size: 1.15rem;
  font-weight: 900;
  color: var(--forest);
`

export const Field = styled.div`
  display: grid;
  gap: 8px;
`

export const Label = styled.label`
  color: var(--forest);
  font-size: 0.78rem;
  font-weight: 800;
`

export const Input = styled.input`
  height: 50px;
  padding: 0 16px;
  border: 1.5px solid var(--line);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.85);
  color: var(--text);
  font: inherit;
  font-size: 0.95rem;
  font-weight: 600;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;

  &:focus {
    border-color: var(--mint);
    background: #fff;
    box-shadow: 0 0 0 5px var(--glow);
  }
`

export const Chips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`

export const Chip = styled.button`
  padding: 9px 16px;
  border: 1.5px solid ${(props) => (props.$active ? 'var(--mint)' : 'var(--line)')};
  border-radius: 999px;
  background: ${(props) => (props.$active ? 'var(--glow)' : 'var(--paper)')};
  color: ${(props) => (props.$active ? 'var(--leaf)' : 'var(--muted)')};
  font: inherit;
  font-weight: 800;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.18s;
`

export const CreateBtn = styled.button`
  height: 52px;
  border: 0;
  border-radius: 16px;
  background: linear-gradient(135deg, #093d26, #16874b 56%, #50d990);
  color: #fff;
  box-shadow: 0 14px 32px rgba(22, 135, 75, 0.3);
  font: inherit;
  font-size: 1rem;
  font-weight: 900;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 18px 40px rgba(22, 135, 75, 0.38);
  }
  &:disabled {
    opacity: 0.7;
    cursor: default;
    transform: none;
  }
`

export const Message = styled.div`
  color: var(--warn);
  font-size: 0.82rem;
  font-weight: 800;
`

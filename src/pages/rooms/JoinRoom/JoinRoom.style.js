import styled from '@emotion/styled'

export const Page = styled.main`
  /* 초대참여도 로그인/가입과 동일한 "항상 라이트 종이" 화면(#96). */
  color-scheme: light;
  min-height: 100vh;
  color: var(--text);
  font-family: 'Outfit', sans-serif;
  background: linear-gradient(135deg, #fffdf3 0%, #fffaf0 48%, #fdf6e3 100%);
  display: flex;
  flex-direction: column;
`

export const TopBar = styled.header`
  display: flex;
  align-items: center;
  padding: 18px 24px;
  border-bottom: 1px solid var(--line);
`

export const Brand = styled.div`
  font-weight: 900;
  font-size: 1.2rem;
  letter-spacing: -0.02em;
  color: var(--forest);
`

export const Body = styled.section`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
`

export const Card = styled.div`
  width: min(420px, 100%);
  padding: 32px;
  border: 1px solid var(--line);
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.85);
  box-shadow: 0 18px 44px rgba(7, 59, 36, 0.08);
  display: grid;
  gap: 16px;
`

export const Title = styled.h1`
  font-size: 1.4rem;
  font-weight: 900;
  color: var(--forest);
`

export const Desc = styled.p`
  color: var(--muted);
  font-size: 0.9rem;
  font-weight: 500;
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
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;

  &:focus {
    border-color: var(--mint);
    background: #fff;
    box-shadow: 0 0 0 5px var(--glow);
  }
`

export const SubmitBtn = styled.button`
  height: 50px;
  border: 0;
  border-radius: 16px;
  background: linear-gradient(135deg, #093d26, #16874b 56%, #50d990);
  color: #fff;
  font: inherit;
  font-size: 1rem;
  font-weight: 900;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;

  &:hover {
    transform: translateY(-2px);
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

export const SuccessBox = styled.div`
  padding: 16px 18px;
  border: 1px dashed var(--mint);
  border-radius: 16px;
  background: var(--glow);
  color: var(--forest);
  font-size: 0.9rem;
  font-weight: 700;
  line-height: 1.6;
`

export const BackLink = styled.a`
  color: var(--leaf);
  font-size: 0.85rem;
  font-weight: 800;
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`

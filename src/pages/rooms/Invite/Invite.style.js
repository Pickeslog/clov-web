import styled from '@emotion/styled'

export const Page = styled.main`
  min-height: 100vh;
  color: var(--text);
  font-family: 'Outfit', sans-serif;
  background: linear-gradient(135deg, #fffdf3 0%, #fffaf0 48%, #fdf6e3 100%);
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

export const Header = styled.section`
  width: min(720px, calc(100% - 48px));
  margin: 28px auto 0;
  display: grid;
  gap: 8px;
`

export const Title = styled.h1`
  font-size: 1.7rem;
  font-weight: 900;
  color: var(--text);
`

export const Desc = styled.p`
  color: var(--muted);
  font-size: 0.92rem;
  font-weight: 500;
`

export const Section = styled.section`
  width: min(720px, calc(100% - 48px));
  margin: 24px auto 0;
  display: grid;
  gap: 12px;
`

export const SectionTitle = styled.h2`
  font-size: 1.05rem;
  font-weight: 900;
  color: var(--forest);
`

export const CreateRow = styled.div`
  display: flex;
  gap: 8px;

  @media (max-width: 480px) {
    flex-wrap: wrap;
  }
`

export const Select = styled.select`
  height: 46px;
  padding: 0 14px;
  border: 1.5px solid var(--line);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.85);
  color: var(--text);
  font: inherit;
  font-size: 0.9rem;
  font-weight: 600;
  outline: none;
`

export const CreateBtn = styled.button`
  padding: 0 20px;
  height: 46px;
  border: 0;
  border-radius: 14px;
  background: linear-gradient(135deg, #093d26, #16874b 56%, #50d990);
  color: #fff;
  font: inherit;
  font-weight: 900;
  font-size: 0.92rem;
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

export const State = styled.div`
  text-align: center;
  color: var(--muted);
  font-weight: 700;
  padding: 16px 0;
`

export const Empty = styled.div`
  padding: 20px;
  border: 1px dashed var(--line);
  border-radius: 16px;
  background: var(--cream);
  text-align: center;
  color: var(--muted);
  font-size: 0.88rem;
  font-weight: 600;
  line-height: 1.6;
`

export const List = styled.div`
  display: grid;
  gap: 10px;
`

export const Card = styled.article`
  padding: 16px 18px;
  border: 1px solid var(--line);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.85);
  display: flex;
  align-items: center;
  gap: 12px;
`

export const CodeText = styled.code`
  flex: 1;
  font-family: var(--mono, monospace);
  font-weight: 800;
  color: var(--forest);
  font-size: 1rem;
  letter-spacing: 0.02em;
`

export const Meta = styled.span`
  color: var(--muted);
  font-size: 0.78rem;
  font-weight: 700;
`

export const CancelBtn = styled.button`
  border: 1px solid var(--line);
  border-radius: 999px;
  padding: 6px 14px;
  background: var(--paper);
  color: var(--warn);
  font: inherit;
  font-size: 0.78rem;
  font-weight: 800;
  cursor: pointer;

  &:disabled {
    opacity: 0.6;
    cursor: default;
  }
`

export const ApplicantRow = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
`

export const Avatar = styled.span`
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: linear-gradient(135deg, #1a8e52, #5de49a);
  color: #fff;
  font-size: 0.82rem;
  font-weight: 900;
  flex-shrink: 0;
`

export const ApplicantName = styled.span`
  font-weight: 800;
  color: var(--text);
  font-size: 0.92rem;
`

export const ActionRow = styled.div`
  display: flex;
  gap: 8px;
`

export const AcceptBtn = styled.button`
  border: 0;
  border-radius: 999px;
  padding: 7px 14px;
  background: linear-gradient(135deg, #093d26, #16874b 56%, #50d990);
  color: #fff;
  font: inherit;
  font-size: 0.78rem;
  font-weight: 800;
  cursor: pointer;

  &:disabled {
    opacity: 0.6;
    cursor: default;
  }
`

export const RejectBtn = styled.button`
  border: 1px solid var(--line);
  border-radius: 999px;
  padding: 7px 14px;
  background: var(--paper);
  color: var(--muted);
  font: inherit;
  font-size: 0.78rem;
  font-weight: 800;
  cursor: pointer;

  &:disabled {
    opacity: 0.6;
    cursor: default;
  }
`

export const UndoCard = styled.article`
  padding: 14px 18px;
  border: 1px dashed var(--mint);
  border-radius: 16px;
  background: var(--glow);
  display: flex;
  align-items: center;
  gap: 12px;
`

export const UndoInfo = styled.div`
  flex: 1;
  display: grid;
  gap: 2px;
`

export const UndoName = styled.span`
  font-weight: 800;
  color: var(--forest);
  font-size: 0.9rem;
`

export const UndoTimer = styled.span`
  color: var(--muted);
  font-size: 0.78rem;
  font-weight: 700;
`

export const UndoBtn = styled.button`
  border: 1px solid var(--mint);
  border-radius: 999px;
  padding: 7px 14px;
  background: #fff;
  color: var(--leaf);
  font: inherit;
  font-size: 0.78rem;
  font-weight: 800;
  cursor: pointer;

  &:disabled {
    opacity: 0.6;
    cursor: default;
  }
`

export const Message = styled.div`
  width: min(720px, calc(100% - 48px));
  margin: 12px auto 0;
  color: var(--warn);
  font-size: 0.82rem;
  font-weight: 800;
`

export const Spacer = styled.div`
  height: 48px;
`

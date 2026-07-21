import styled from '@emotion/styled'
import { Link } from 'react-router-dom'

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

export const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`

export const JoinLink = styled(Link)`
  border: 1px solid var(--line);
  border-radius: 999px;
  padding: 7px 14px;
  background: var(--paper);
  color: var(--leaf);
  font-weight: 800;
  font-size: 0.82rem;
  text-decoration: none;

  &:hover {
    border-color: var(--mint);
  }
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

export const Section = styled.section`
  display: grid;
  gap: 14px;
`

export const SectionTitle = styled.h2`
  font-size: 1.15rem;
  font-weight: 900;
  color: var(--forest);
`

export const State = styled.div`
  padding: 28px 16px;
  text-align: center;
  border: 1px dashed var(--line);
  border-radius: 16px;
  background: var(--cream);
  color: var(--muted);
  font-size: 0.88rem;
  font-weight: 700;
`

export const SortRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`

export const SortBtn = styled.button`
  padding: 7px 14px;
  border: 1.5px solid ${(p) => (p.$active ? 'var(--mint)' : 'var(--line)')};
  border-radius: 999px;
  background: ${(p) => (p.$active ? 'var(--glow)' : 'var(--paper)')};
  color: ${(p) => (p.$active ? 'var(--leaf)' : 'var(--muted)')};
  font: inherit;
  font-weight: 800;
  font-size: 0.8rem;
  cursor: pointer;
`

export const RoomGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 18px;
`

// 보딩패스 티켓 카드 (프로토타입 makerooms).
export const Ticket = styled.button`
  display: grid;
  text-align: left;
  border: 0;
  border-radius: 18px;
  overflow: hidden;
  background: var(--paper);
  box-shadow: 0 14px 34px rgba(7, 59, 36, 0.12);
  font: inherit;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;

  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 20px 44px rgba(7, 59, 36, 0.18);
  }
`

export const TicketHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 18px;
  color: #fff;
  background: ${(p) => p.$accent
    ? `linear-gradient(135deg, ${p.$accent}, rgba(0,0,0,0.25))`
    : 'linear-gradient(135deg, #093d26, #16874b 60%, #1fa060)'};
`

export const TicketTag = styled.span`
  font-weight: 900;
  letter-spacing: 0.08em;
  font-size: 0.9rem;
`

export const TicketRoute = styled.span`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;

  &::before,
  &::after {
    content: '';
    flex: 1;
    margin: 0 8px;
    border-top: 2px dashed rgba(255, 255, 255, 0.5);
  }
`

export const TicketLv = styled.span`
  padding: 3px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.2);
  font-size: 0.74rem;
  font-weight: 900;
`

export const TicketBody = styled.div`
  padding: 16px 18px 14px;
  border-top: 2px dashed var(--line);
  display: grid;
  gap: 10px;
`

export const TicketTopRow = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
`

export const TicketLabel = styled.div`
  color: var(--muted);
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.04em;
`

export const TicketName = styled.div`
  margin-top: 2px;
  color: var(--forest);
  font-size: 1.1rem;
  font-weight: 900;
`

export const Star = styled.button`
  border: 0;
  background: none;
  color: ${(p) => (p.$active ? '#f4b740' : 'var(--line)')};
  font-size: 1.15rem;
  line-height: 1;
  cursor: pointer;
  padding: 0;

  &:hover {
    color: #f4b740;
  }
`

export const TicketDesc = styled.p`
  color: var(--muted);
  font-size: 0.84rem;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

export const TicketFoot = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`

export const TicketMeta = styled.span`
  color: var(--leaf);
  font-size: 0.8rem;
  font-weight: 800;
`

export const TicketEnter = styled.span`
  color: var(--forest);
  font-size: 0.86rem;
  font-weight: 900;
`

export const Barcode = styled.div`
  height: 34px;
  border-radius: 4px;
  background-image: repeating-linear-gradient(
    90deg,
    var(--forest) 0,
    var(--forest) 2px,
    transparent 2px,
    transparent 4px,
    var(--forest) 4px,
    var(--forest) 5px,
    transparent 5px,
    transparent 8px
  );
  opacity: 0.55;
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

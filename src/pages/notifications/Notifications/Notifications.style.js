import styled from '@emotion/styled'
import { Link } from 'react-router-dom'

export const Page = styled.main`
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
  justify-content: space-between;
  padding: 18px 24px;
  border-bottom: 1px solid var(--line);
  background: rgba(255, 255, 255, 0.8);
`

export const Title = styled.h1`
  font-weight: 900;
  font-size: 1.2rem;
  letter-spacing: -0.02em;
  color: var(--forest);
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
`

export const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`

export const ActionBtn = styled.button`
  border: 1px solid var(--line);
  border-radius: 999px;
  padding: 7px 14px;
  background: var(--paper);
  color: var(--muted);
  font: inherit;
  font-weight: 800;
  font-size: 0.82rem;
  cursor: pointer;

  &:hover:not(:disabled) {
    color: var(--leaf);
    border-color: var(--mint);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

export const BackBtn = styled(Link)`
  border: 1px solid var(--line);
  border-radius: 999px;
  padding: 7px 14px;
  background: var(--paper);
  color: var(--muted);
  font: inherit;
  font-weight: 800;
  font-size: 0.82rem;
  text-decoration: none;

  &:hover {
    color: var(--leaf);
    border-color: var(--mint);
  }
`

export const Content = styled.section`
  flex: 1;
  width: min(880px, calc(100% - 48px));
  margin: 24px auto;
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid var(--line);
  border-radius: 24px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
`

export const Tabs = styled.div`
  display: flex;
  border-bottom: 1px solid var(--line);
  padding: 0 12px;
`

export const Tab = styled.button`
  padding: 16px 20px;
  font: inherit;
  font-weight: 800;
  font-size: 0.95rem;
  color: ${(props) => (props.$active ? 'var(--forest)' : 'var(--muted)')};
  background: transparent;
  border: none;
  border-bottom: 3px solid ${(props) => (props.$active ? 'var(--forest)' : 'transparent')};
  cursor: pointer;
  position: relative;
  transition: all 0.2s;

  &:hover {
    color: var(--forest);
  }
`

export const Badge = styled.span`
  position: absolute;
  top: 8px;
  right: 4px;
  background: var(--apple);
  color: #fff;
  font-size: 0.7rem;
  font-weight: 900;
  padding: 2px 6px;
  border-radius: 999px;
`

export const List = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  flex: 1;
  overflow-y: auto;
`

export const ListItem = styled.li`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  border-bottom: 1px solid var(--line);
  background: ${(props) => (props.$isRead ? 'transparent' : 'rgba(80, 217, 144, 0.05)')};

  &:last-child {
    border-bottom: none;
  }
`

export const ItemBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`

export const ItemMessage = styled.p`
  margin: 0;
  font-size: 0.95rem;
  font-weight: ${(props) => (props.$isRead ? '500' : '700')};
  color: ${(props) => (props.$isRead ? 'var(--muted)' : 'var(--text)')};
`

export const ItemTime = styled.span`
  font-size: 0.8rem;
  color: var(--muted);
  font-weight: 500;
`

export const ReadBtn = styled.button`
  border: 1px solid var(--line);
  border-radius: 999px;
  padding: 4px 12px;
  background: var(--paper);
  color: var(--muted);
  font: inherit;
  font-weight: 800;
  font-size: 0.75rem;
  cursor: pointer;

  &:hover:not(:disabled) {
    color: var(--leaf);
    border-color: var(--mint);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

export const EmptyState = styled.div`
  padding: 60px 24px;
  text-align: center;
  color: var(--muted);
  font-weight: 700;
  font-size: 0.95rem;
`

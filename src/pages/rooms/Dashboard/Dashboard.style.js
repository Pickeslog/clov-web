import styled from '@emotion/styled'
import { Link } from 'react-router-dom'

export const Page = styled.main`
  min-height: 100vh;
  color: var(--text);
  font-family: 'Outfit', sans-serif;
  background: linear-gradient(135deg, #fffdf3 0%, #fffaf0 48%, #fdf6e3 100%);
`

export const State = styled.div`
  padding: 80px 24px;
  text-align: center;
  color: var(--muted);
  font-weight: 700;

  button {
    margin-left: 8px;
    border: 1px solid var(--line);
    border-radius: 999px;
    padding: 4px 12px;
    background: var(--paper);
    color: var(--leaf);
    font: inherit;
    font-weight: 800;
    cursor: pointer;
  }
`

export const TopBar = styled.header`
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

export const Hero = styled.section`
  position: relative;
  margin: 24px auto 0;
  width: min(880px, calc(100% - 48px));
  min-height: 200px;
  border-radius: 24px;
  overflow: hidden;
  display: flex;
  align-items: flex-end;
  color: #fff;
  background:
    linear-gradient(160deg, rgba(7, 59, 36, 0.9), rgba(11, 91, 51, 0.82)),
    ${(props) =>
      props.$cover
        ? `url(${props.$cover}) center/cover`
        : 'radial-gradient(circle at 20% 20%, rgba(80,217,144,.34), transparent 30%)'};
`

export const HeroInner = styled.div`
  padding: 28px;
  width: 100%;
`

export const RoomName = styled.h1`
  font-size: 1.7rem;
  font-weight: 900;
`

export const RoomDesc = styled.p`
  margin-top: 6px;
  color: rgba(255, 255, 255, 0.82);
  font-size: 0.92rem;
  font-weight: 500;
`

export const MetaRow = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 14px;
`

export const Meta = styled.span`
  padding: 5px 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.16);
  font-size: 0.8rem;
  font-weight: 800;
`

export const LevelBar = styled.div`
  margin-top: 14px;
  height: 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.2);
  overflow: hidden;
`

export const LevelFill = styled.div`
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #50d990, #b9f3d1);
  transition: width 0.4s ease;
`

export const Members = styled.section`
  width: min(880px, calc(100% - 48px));
  margin: 18px auto 0;
  display: flex;
  align-items: center;
  gap: 8px;
`

export const Avatar = styled.span`
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  border: 2px solid var(--paper);
  background: linear-gradient(135deg, #1a8e52, #5de49a);
  color: #fff;
  font-size: 0.85rem;
  font-weight: 900;
  margin-left: -8px;

  &:first-of-type {
    margin-left: 0;
  }
`

export const MemberLabel = styled.span`
  margin-left: 8px;
  color: var(--muted);
  font-size: 0.85rem;
  font-weight: 700;
`

export const Sections = styled.section`
  width: min(880px, calc(100% - 48px));
  margin: 24px auto 64px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`

export const SectionCard = styled(Link)`
  padding: 22px;
  border: 1px solid var(--line);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.8);
  text-decoration: none;
  color: var(--text);
  transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;

  &:hover {
    transform: translateY(-3px);
    border-color: var(--mint);
    box-shadow: 0 16px 34px rgba(7, 59, 36, 0.1);
  }
`

export const SectionLabel = styled.div`
  font-size: 1.05rem;
  font-weight: 900;
  color: var(--forest);
`

export const SectionHint = styled.div`
  margin-top: 6px;
  color: var(--muted);
  font-size: 0.8rem;
  font-weight: 700;
`

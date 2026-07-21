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

export const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`

export const NotiBtn = styled(Link)`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  color: var(--muted);
  text-decoration: none;
  background: transparent;
  transition: all 0.2s;

  &:hover {
    background: var(--line);
    color: var(--forest);
  }
`

const WIDTH = 'min(880px, calc(100% - 48px))'

export const DdayBanner = styled.section`
  width: ${WIDTH};
  margin: 22px auto 0;
  text-align: center;
`

export const DdaySmall = styled.div`
  color: var(--muted);
  font-size: 0.86rem;
  font-weight: 700;
`

export const DdayBig = styled.div`
  margin-top: 2px;
  color: var(--forest);
  font-size: 2.2rem;
  font-weight: 900;
  letter-spacing: -0.02em;

  span {
    margin-left: 6px;
    font-size: 1rem;
    font-weight: 800;
    color: var(--leaf);
  }
`

export const DdayTrack = styled.div`
  margin-top: 4px;
  color: var(--leaf);
  font-size: 0.82rem;
  font-weight: 800;
`

export const StatusCard = styled.section`
  width: ${WIDTH};
  margin: 16px auto 0;
`

export const StatusView = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 18px;
  border: 1px solid var(--line);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.8);
  cursor: pointer;
  text-align: left;

  &:hover {
    border-color: var(--mint);
  }
`

export const StatusText = styled.span`
  flex: 1;
  font-size: 0.95rem;
  font-weight: 700;
  color: ${(p) => (p.$empty ? 'var(--muted)' : 'var(--text)')};
`

export const StatusEditHint = styled.span`
  color: var(--leaf);
  font-size: 0.78rem;
  font-weight: 800;
`

export const StatusEdit = styled.div`
  padding: 14px 18px;
  border: 1px solid var(--mint);
  border-radius: 16px;
  background: var(--paper);
  display: grid;
  gap: 8px;
`

export const StatusInput = styled.input`
  border: 1.5px solid var(--line);
  border-radius: 12px;
  padding: 10px 12px;
  background: var(--cream);
  color: var(--text);
  font: inherit;

  &:focus {
    outline: none;
    border-color: var(--mint);
    box-shadow: 0 0 0 4px var(--glow);
  }
`

export const StatusMeta = styled.div`
  color: var(--muted);
  font-size: 0.74rem;
  font-weight: 700;
  text-align: right;
`

export const StatusActions = styled.div`
  display: flex;
  gap: 8px;
`

export const StatusSave = styled.button`
  border: 0;
  border-radius: 10px;
  padding: 8px 16px;
  background: linear-gradient(135deg, #093d26, #16874b 56%, #50d990);
  color: #fff;
  font: inherit;
  font-weight: 800;
  font-size: 0.82rem;
  cursor: pointer;

  &:disabled {
    opacity: 0.6;
    cursor: default;
  }
`

export const StatusCancel = styled.button`
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 8px 14px;
  background: var(--paper);
  color: var(--muted);
  font: inherit;
  font-weight: 800;
  font-size: 0.82rem;
  cursor: pointer;
`

export const Block = styled.section`
  width: ${WIDTH};
  margin: 22px auto 0;
`

export const BlockHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
`

export const BlockTitle = styled.h2`
  font-size: 1.05rem;
  font-weight: 900;
  color: var(--forest);
`

export const BlockLink = styled(Link)`
  color: var(--leaf);
  font-size: 0.82rem;
  font-weight: 800;
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`

export const Empty = styled.div`
  padding: 18px;
  border: 1px dashed var(--line);
  border-radius: 14px;
  background: var(--cream);
  color: var(--muted);
  font-size: 0.85rem;
  font-weight: 700;
  text-align: center;
`

export const DdayList = styled.div`
  display: grid;
  gap: 10px;
`

export const DdayItem = styled(Link)`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 18px;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.8);
  text-decoration: none;
  color: var(--text);

  &:hover {
    border-color: var(--mint);
  }
`

export const DdayItemTitle = styled.span`
  flex: 1;
  font-weight: 800;
  font-size: 0.95rem;
`

export const DdayItemDate = styled.span`
  color: var(--muted);
  font-size: 0.82rem;
  font-weight: 700;
`

export const DdayChip = styled.span`
  padding: 5px 12px;
  border-radius: 999px;
  background: linear-gradient(135deg, #093d26, #16874b);
  color: #fff;
  font-size: 0.8rem;
  font-weight: 900;
`

export const MemoryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;

  @media (max-width: 640px) {
    grid-template-columns: repeat(2, 1fr);
  }
`

export const MemoryCard = styled(Link)`
  padding: 10px;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: var(--paper);
  text-decoration: none;
  color: var(--text);
  display: grid;
  gap: 6px;

  &:hover {
    border-color: var(--mint);
  }
`

export const MemoryThumb = styled.div`
  aspect-ratio: 1;
  border-radius: 10px;
  background: var(--cream);
  display: grid;
  place-items: center;
  font-size: 1.6rem;
  overflow: hidden;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`

export const MemoryWriter = styled.span`
  color: var(--leaf);
  font-size: 0.74rem;
  font-weight: 800;
`

export const MemoryTitle = styled.span`
  font-size: 0.86rem;
  font-weight: 800;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

export const MemoryDate = styled.span`
  color: var(--muted);
  font-size: 0.74rem;
  font-weight: 700;
`

export const Hero = styled.section`
  position: relative;
  margin: 16px auto 0;
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
  position: relative;
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  border: 2px solid var(--paper);
  overflow: hidden;
  background: linear-gradient(135deg, #1a8e52, #5de49a);
  color: #fff;
  font-size: 0.85rem;
  font-weight: 900;
  margin-left: -8px;

  &:first-of-type {
    margin-left: 0;
  }

  img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
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

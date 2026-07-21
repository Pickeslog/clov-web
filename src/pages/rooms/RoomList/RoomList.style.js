import styled from '@emotion/styled'
import { Link } from 'react-router-dom'

// 방 목록은 프로토타입(03-rooms/makerooms) 미드나잇 올리브 다크 테마.
const C = {
  body: '#14150e',
  card: '#1e2016',
  text: '#eef0e2',
  muted: '#b7c99a',
  primary: '#5a7a3e',
  accent: '#9ccc65',
  border: '#2a2c1e',
  inputBg: '#191a12',
  inputBdr: '#6b8f47',
  active: '#2b3020',
}

export const Page = styled.main`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  font-family: 'Outfit', sans-serif;
  color: ${C.text};
  background:
    radial-gradient(circle at 12% 8%, rgba(90, 122, 62, 0.22), transparent 32%),
    radial-gradient(circle at 88% 92%, rgba(90, 122, 62, 0.16), transparent 36%),
    ${C.body};
`

export const Header = styled.header`
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 28px;
  height: 56px;
  background: rgba(20, 21, 14, 0.88);
  backdrop-filter: blur(18px) saturate(1.4);
  border-bottom: 1px solid ${C.border};
`

export const Brand = styled.div`
  font-weight: 900;
  font-size: 1.15rem;
  letter-spacing: -0.02em;
  color: ${C.accent};
`

export const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

export const JoinLink = styled(Link)`
  border: 1px solid ${C.border};
  border-radius: 999px;
  padding: 7px 14px;
  background: ${C.active};
  color: ${C.accent};
  font-weight: 800;
  font-size: 0.8rem;
  text-decoration: none;

  &:hover {
    border-color: ${C.inputBdr};
  }
`

export const GhostBtn = styled.button`
  border: 1px solid ${C.border};
  border-radius: 999px;
  padding: 7px 14px;
  background: ${C.active};
  color: ${C.muted};
  font: inherit;
  font-weight: 800;
  font-size: 0.8rem;
  cursor: pointer;

  &:hover {
    color: ${C.accent};
    border-color: ${C.inputBdr};
  }
`

export const Body = styled.div`
  flex: 1;
  width: min(940px, 100%);
  margin: 0 auto;
  padding: 34px 24px 72px;
  display: grid;
  gap: 22px;
`

export const Intro = styled.h1`
  display: inline-flex;
  align-self: start;
  align-items: center;
  gap: 6px;
  font-size: 0.95rem;
  font-weight: 800;
  color: ${C.text};
  background: ${C.active};
  border: 1px solid ${C.border};
  padding: 8px 16px;
  border-radius: 999px;

  &::before {
    content: '👥';
  }
`

export const Toolbar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
`

/* ===== 요청한 방 (가입신청 대기/거절/사라진 방) ===== */
export const ReqSection = styled.section`
  display: grid;
  gap: 10px;
`

export const ReqHead = styled.h2`
  align-self: start;
  font-size: 0.85rem;
  font-weight: 800;
  color: ${C.text};
  background: ${C.active};
  border: 1px solid ${C.border};
  padding: 6px 14px;
  border-radius: 999px;
`

export const ReqGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 14px;
`

export const ReqCard = styled.div`
  padding: 16px;
  border: 1.5px dashed ${C.border};
  border-radius: 14px;
  background: rgba(30, 32, 22, 0.6);
  display: grid;
  gap: 8px;
  justify-items: start;
`

const REQ_COLOR = { pending: '#9ccc65', rejected: '#f0997b', gone: '#b7c99a' }

export const ReqStatus = styled.span`
  font-size: 0.72rem;
  font-weight: 800;
  padding: 3px 10px;
  border-radius: 999px;
  color: #14150e;
  background: ${(p) => REQ_COLOR[p.$kind] ?? '#9ccc65'};
`

export const ReqName = styled.div`
  font-size: 1rem;
  font-weight: 800;
  color: ${C.text};
`

export const ReqMeta = styled.p`
  font-size: 0.82rem;
  font-weight: 600;
  color: ${C.muted};
  line-height: 1.4;
`

export const ReqDismiss = styled.button`
  border: 1px solid ${C.border};
  border-radius: 10px;
  padding: 6px 14px;
  background: transparent;
  color: ${C.muted};
  font: inherit;
  font-weight: 800;
  font-size: 0.78rem;
  cursor: pointer;

  &:hover {
    color: ${C.accent};
    border-color: ${C.inputBdr};
  }
`

export const SortRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`

export const SortBtn = styled.button`
  padding: 7px 14px;
  border: 1px solid ${(p) => (p.$active ? C.inputBdr : C.border)};
  border-radius: 999px;
  background: ${(p) => (p.$active ? C.active : 'transparent')};
  color: ${(p) => (p.$active ? C.accent : C.muted)};
  font: inherit;
  font-weight: 800;
  font-size: 0.8rem;
  cursor: pointer;
`

export const State = styled.div`
  padding: 30px 16px;
  text-align: center;
  border: 1px dashed ${C.border};
  border-radius: 16px;
  background: ${C.card};
  color: ${C.muted};
  font-size: 0.88rem;
  font-weight: 700;
`

export const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
`

/* ===== 보딩패스 티켓 (프로토타입 .tk-*) ===== */
export const Ticket = styled.button`
  padding: 0;
  border: 0;
  background: transparent;
  border-radius: 16px;
  font: inherit;
  cursor: pointer;
  box-shadow: 0 12px 22px rgba(20, 40, 30, 0.35);
  transition: transform 0.2s, box-shadow 0.2s;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 16px 30px rgba(20, 40, 30, 0.45);
  }
`

export const TkBody = styled.div`
  background: #fffdf7;
  border-radius: 16px;
  overflow: hidden;
  text-align: left;
  /* 좌우 절취 노치 — 하단에서 40px 위치, 배경이 비치게 mask로 구멍. */
  -webkit-mask:
    radial-gradient(circle 9px at left calc(100% - 40px), transparent 96%, #000 100%) left / 50.2% 100% no-repeat,
    radial-gradient(circle 9px at right calc(100% - 40px), transparent 96%, #000 100%) right / 50.2% 100% no-repeat;
  mask:
    radial-gradient(circle 9px at left calc(100% - 40px), transparent 96%, #000 100%) left / 50.2% 100% no-repeat,
    radial-gradient(circle 9px at right calc(100% - 40px), transparent 96%, #000 100%) right / 50.2% 100% no-repeat;
`

export const TkHead = styled.div`
  padding: 14px 15px 12px;
  background: ${(p) => `linear-gradient(135deg, ${p.$color}, rgba(0,0,0,0.28))`};
`

export const TkRoute = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #fff;
`

export const TkCol = styled.div`
  display: grid;
  text-align: ${(p) => (p.$right ? 'right' : 'left')};
`

export const TkKick = styled.span`
  font-size: 9px;
  letter-spacing: 1px;
  font-weight: 700;
  opacity: 0.85;
`

export const TkCode = styled.span`
  font-size: 15px;
  font-weight: 800;
`

export const TkMid = styled.div`
  flex: 1;
  text-align: center;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.9);
`

export const TkSkyline = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 2.5px;
  height: 26px;
  margin-top: 8px;
  opacity: 0.9;

  i {
    display: block;
    background: #fffdf7;
    border-radius: 1px 1px 0 0;
  }
`

export const TkPax = styled.div`
  padding: 12px 15px 4px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
`

export const TkPaxKick = styled.div`
  font-size: 9px;
  color: #9aa89f;
  font-weight: 700;
`

export const TkName = styled.div`
  font-size: 15px;
  font-weight: 800;
  color: #1e2e26;
  word-break: keep-all;
`

export const TkAvs = styled.div`
  display: flex;
  align-items: center;
  margin-top: 8px;
`

export const TkAv = styled.span`
  width: 22px;
  height: 22px;
  border-radius: 50%;
  color: #fff;
  font-size: 9px;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1.5px solid #fff;
  background: ${(p) => (p.$primary ? 'linear-gradient(135deg, #1a8e52, #5de49a)' : '#9aa89f')};
`

export const TkAvMore = styled.span`
  margin-left: 6px;
  font-size: 10px;
  font-weight: 800;
  color: #8a9a5a;
`

export const TkCorner = styled.div`
  display: flex;
  align-items: center;
  gap: 7px;
  flex-shrink: 0;
`

export const TkStar = styled.button`
  border: 0;
  background: none;
  padding: 0;
  line-height: 1;
  font-size: 17px;
  cursor: pointer;
  color: ${(p) => (p.$active ? '#f4b740' : '#c9cdbb')};

  &:hover {
    transform: scale(1.15);
  }
`

export const TkGrid = styled.div`
  padding: 4px 15px 12px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 7px 10px;
`

export const TkCellLbl = styled.div`
  font-size: 9px;
  color: #9aa89f;
  font-weight: 700;
`

export const TkCellVal = styled.div`
  font-size: 12px;
  font-weight: 800;
  color: #1e2e26;
`

export const TkCellEmpty = styled.div`
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 700;
  color: #8a9a5a;
  margin-top: 1px;
`

export const TkPerf = styled.div`
  border-top: 2px dashed #e6dfcf;
  margin: 0 12px;
`

export const TkStub = styled.div`
  padding: 9px 15px 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
`

export const TkBarcode = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 1.5px;
  height: 20px;

  i {
    display: block;
    height: 20px;
    background: #2a3a32;
  }
`

export const TkEnter = styled.span`
  font-size: 11px;
  font-weight: 800;
  color: #357a58;
`

/* ===== 새 우정공간 만들기 (다크 카드) ===== */
export const CreateCard = styled.section`
  margin-top: 6px;
  padding: 24px;
  border: 1px solid ${C.border};
  border-radius: 20px;
  background: ${C.card};
  display: grid;
  gap: 16px;
`

export const CardTitle = styled.h2`
  font-size: 1.1rem;
  font-weight: 900;
  color: ${C.accent};
`

export const Field = styled.div`
  display: grid;
  gap: 8px;
`

export const Label = styled.label`
  color: ${C.muted};
  font-size: 0.78rem;
  font-weight: 800;
`

export const Input = styled.input`
  height: 48px;
  padding: 0 16px;
  border: 1.5px solid ${C.border};
  border-radius: 12px;
  background: ${C.inputBg};
  color: ${C.text};
  font: inherit;
  font-size: 0.95rem;
  font-weight: 600;
  outline: none;

  &::placeholder {
    color: #6f7a5c;
  }
  &:focus {
    border-color: ${C.inputBdr};
    box-shadow: 0 0 0 4px rgba(107, 143, 71, 0.22);
  }
`

export const Chips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`

export const Chip = styled.button`
  padding: 9px 16px;
  border: 1.5px solid ${(p) => (p.$active ? C.inputBdr : C.border)};
  border-radius: 999px;
  background: ${(p) => (p.$active ? C.active : 'transparent')};
  color: ${(p) => (p.$active ? C.accent : C.muted)};
  font: inherit;
  font-weight: 800;
  font-size: 0.85rem;
  cursor: pointer;
`

export const CreateBtn = styled.button`
  height: 50px;
  border: 0;
  border-radius: 14px;
  background: linear-gradient(135deg, #3a5a24, #6b8f47 56%, #9ccc65);
  color: #10140b;
  font: inherit;
  font-size: 1rem;
  font-weight: 900;
  cursor: pointer;
  transition: transform 0.2s;

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
  color: #f87171;
  font-size: 0.82rem;
  font-weight: 800;
`

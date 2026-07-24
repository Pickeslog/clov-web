import styled from '@emotion/styled'
import { keyframes } from '@emotion/react'

const rise = keyframes`
  from { opacity: 0; transform: translateY(24px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
`

const shakeInput = keyframes`
  0%, 100% { transform: translateX(0); border-color: var(--line); }
  20%, 60% { transform: translateX(-6px); border-color: #f87171; box-shadow: 0 0 0 4px rgba(248,113,113,.18); }
  40%, 80% { transform: translateX(6px); }
`

export const Page = styled.main`
  /* 로그인은 프로토타입처럼 "항상 라이트 종이" 화면(#96 이후 tokens.css엔 다크
     오버라이드가 없다 — 이 줄은 index.css의 color-scheme:light dark(native input
     다크화)만 이 서브트리에서 무력화하면 됨). */
  color-scheme: light;
  --forest: #073b24;
  --leaf: #16874b;
  --mint: #50d990;
  --text: #0e2d1d;
  --muted: #638772;
  --line: rgba(22, 135, 75, 0.18);
  --glow: rgba(80, 217, 144, 0.22);
  --warn: #b45309;

  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 32px;
  overflow-x: hidden;
  color: var(--text);
  font-family: 'Outfit', sans-serif;
  background:
    radial-gradient(circle at 12% 12%, rgba(217,201,143,.28), transparent 28%),
    radial-gradient(circle at 84% 82%, rgba(232,220,174,.2), transparent 32%),
    linear-gradient(135deg, #fffdf3 0%, #fffaf0 48%, #fdf6e3 100%);

  @media (max-width: 820px) {
    padding: 18px;
    align-items: start;
  }
`

export const Shell = styled.div`
  position: relative;
  width: min(980px, 100%);
  min-height: 640px;
  display: grid;
  grid-template-columns: minmax(310px, 0.92fr) minmax(360px, 1fr);
  overflow: hidden;
  border: 1px solid rgba(22,135,75,.18);
  border-radius: 30px;
  background: rgba(255,255,255,.76);
  box-shadow: 0 32px 90px rgba(7,59,36,.16), 0 1px 0 rgba(255,255,255,.9) inset;
  backdrop-filter: blur(22px) saturate(150%);
  -webkit-backdrop-filter: blur(22px) saturate(150%);
  animation: ${rise} 0.65s cubic-bezier(.22, 1, .36, 1) both;

  @media (max-width: 820px) {
    grid-template-columns: 1fr;
    min-height: 0;
    border-radius: 24px;
  }
`

export const MemoryPanel = styled.section`
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 42px;
  overflow: hidden;
  color: #fff;
  background:
    linear-gradient(160deg, rgba(7,59,36,.98), rgba(11,91,51,.94)),
    radial-gradient(circle at 20% 20%, rgba(80,217,144,.34), transparent 26%);

  &::before {
    content: '';
    position: absolute;
    width: 300px;
    height: 300px;
    right: -120px;
    top: -90px;
    border-radius: 50%;
    background: rgba(80,217,144,.18);
    filter: blur(6px);
  }
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(rgba(255,255,255,.07) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,.07) 1px, transparent 1px);
    background-size: 42px 42px;
    mask-image: linear-gradient(to bottom, rgba(0,0,0,.65), transparent 85%);
    pointer-events: none;
  }

  @media (max-width: 820px) {
    min-height: 300px;
    padding: 30px;
  }
`

export const Brand = styled.div`
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 12px;
  font-weight: 900;
  font-size: 1.35rem;
  letter-spacing: -0.02em;
`

export const BrandMark = styled.div`
  width: 46px;
  height: 46px;
  display: grid;
  place-items: center;
  border-radius: 16px;
  background: linear-gradient(135deg, #1a8e52, #5de49a);
  box-shadow: 0 10px 26px rgba(0,0,0,.18), 0 0 0 6px rgba(255,255,255,.08);
  font-size: 1.45rem;

  img {
    width: 28px;
    height: 28px;
    object-fit: contain;
  }
`

export const PanelCopy = styled.div`
  position: relative;
  z-index: 1;
  margin-top: auto;
`

export const PanelBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  margin-bottom: 18px;
  padding: 8px 12px;
  border: 1px solid rgba(255,255,255,.18);
  border-radius: 999px;
  background: rgba(255,255,255,.1);
  color: #c9f7dc;
  font-size: 0.78rem;
  font-weight: 800;
`

export const PanelTitle = styled.h1`
  /* 전역 index.css의 h1{font-family:var(--heading);color:var(--text-h)} 리셋 무력화 */
  font-family: 'Outfit', sans-serif;
  color: #fff;
  font-size: 2.55rem;
  line-height: 1.08;
  font-weight: 900;

  @media (max-width: 820px) {
    font-size: 2.05rem;
  }
`

export const PanelText = styled.p`
  max-width: 300px;
  margin-top: 16px;
  color: rgba(255,255,255,.76);
  font-size: 0.95rem;
  line-height: 1.65;
  font-weight: 500;
`

export const MemoryStack = styled.div`
  position: relative;
  z-index: 1;
  margin-top: 42px;
  display: grid;
  gap: 12px;

  @media (max-width: 820px) {
    display: none;
  }
`

export const MemoryNote = styled.div`
  width: min(280px, 100%);
  padding: 14px 16px;
  border: 1px solid rgba(255,255,255,.14);
  border-radius: 18px;
  background: rgba(255,255,255,.1);
  box-shadow: 0 14px 28px rgba(0,0,0,.12);

  &:nth-of-type(2) {
    margin-left: 34px;
    background: rgba(255,255,255,.15);
  }
`

export const NoteDate = styled.div`
  color: #b9f3d1;
  font-size: 0.72rem;
  font-weight: 800;
`

export const NoteText = styled.div`
  margin-top: 6px;
  color: #fff;
  font-size: 0.86rem;
  font-weight: 700;
  line-height: 1.42;
`

export const FormPanel = styled.section`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 44px;
  background: linear-gradient(180deg, rgba(255,255,255,.92), rgba(250,255,252,.82));

  @media (max-width: 820px) {
    padding: 34px 24px;
  }
`

export const FormBox = styled.div`
  width: 100%;
  max-width: 380px;
`

export const FormKicker = styled.div`
  margin-bottom: 10px;
  color: var(--leaf);
  font-size: 0.78rem;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`

export const FormTitle = styled.h2`
  /* 전역 index.css의 h2{font-family:var(--heading)} 리셋 무력화 */
  font-family: 'Outfit', sans-serif;
  font-size: 2rem;
  font-weight: 900;
  color: var(--text);
`

export const FormDesc = styled.p`
  margin: 8px 0 24px;
  color: var(--muted);
  font-size: 0.92rem;
  line-height: 1.55;
  font-weight: 500;
`

export const InputGroup = styled.div`
  position: relative;
  margin-bottom: 16px;
`

export const InputLabel = styled.label`
  display: block;
  margin-bottom: 8px;
  color: var(--forest);
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.02em;
`

export const InputLabelRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 24px;
  margin-bottom: 8px;

  label {
    margin-bottom: 0;
  }
`

export const InputWrap = styled.div`
  position: relative;
  display: flex;
  align-items: center;

  &:focus-within .input-icon {
    transform: scale(1.12);
  }
`

export const InputIcon = styled.span`
  position: absolute;
  left: 15px;
  z-index: 2;
  font-size: 1.05rem;
  pointer-events: none;
  transition: transform 0.2s;
`

export const Input = styled.input`
  width: 100%;
  height: 54px;
  padding: 0 48px 0 46px;
  border: 1.5px solid var(--line);
  border-radius: 18px;
  background: rgba(255,255,255,.82);
  color: var(--text);
  font-family: 'Outfit', sans-serif;
  font-size: 0.96rem;
  font-weight: 600;
  outline: none;
  transition: border-color 0.22s, box-shadow 0.22s, background-color 0.22s, transform 0.22s;
  animation: ${(props) => (props.$shake ? `${shakeInput} 0.4s ease` : 'none')};

  &:focus {
    border-color: var(--mint);
    background: #fff;
    box-shadow: 0 0 0 5px var(--glow);
  }
`

export const InputSuffix = styled.button`
  position: absolute;
  right: 10px;
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border: 0;
  border-radius: 50%;
  background: rgba(80,217,144,.14);
  color: var(--muted);
  cursor: pointer;
  transition: background-color 0.2s, color 0.2s, transform 0.2s;

  &:hover,
  &:focus-visible {
    color: var(--leaf);
    background: rgba(80,217,144,.26);
    outline: none;
    transform: scale(1.04);
  }
  svg {
    width: 18px;
    height: 18px;
    fill: none;
    stroke: currentColor;
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
`

export const InputStatus = styled.span`
  padding: 0 10px;
  color: var(--warn);
  opacity: ${(props) => (props.$show ? 1 : 0)};
  visibility: ${(props) => (props.$show ? 'visible' : 'hidden')};
  transform: translateX(${(props) => (props.$show ? '0' : '-6px')});
  font-size: 0.73rem;
  font-weight: 900;
  line-height: 22px;
  white-space: nowrap;
  pointer-events: none;
  transition: opacity 0.18s, transform 0.18s, visibility 0.18s;
`

export const FormOptions = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 8px 0 24px;
  color: var(--muted);
  font-size: 0.84rem;
  font-weight: 700;
`

export const Remember = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;

  input {
    width: 16px;
    height: 16px;
    accent-color: var(--leaf);
  }
  input:checked + span {
    color: var(--leaf);
    font-weight: 900;
  }
  span {
    transition: color 0.2s, font-weight 0.2s;
  }
`

export const SubLink = styled.button`
  border: 0;
  background: transparent;
  color: var(--leaf);
  font: inherit;
  font-weight: 900;
  cursor: pointer;

  &:hover {
    color: var(--forest);
  }
`

export const BtnPrimary = styled.button`
  width: 100%;
  height: 54px;
  border: 0;
  border-radius: 18px;
  background: linear-gradient(135deg, #093d26, #16874b 56%, #50d990);
  color: #fff;
  box-shadow: 0 14px 32px rgba(22,135,75,.3);
  font-family: 'Outfit', sans-serif;
  font-size: 1rem;
  font-weight: 900;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s, filter 0.2s;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 18px 40px rgba(22,135,75,.38);
    filter: saturate(1.06);
  }
  &:active {
    transform: translateY(0);
  }
  &:disabled {
    opacity: 0.7;
    cursor: default;
    transform: none;
    filter: none;
  }
`

export const Message = styled.div`
  height: ${(props) => (props.$show ? '22px' : '0')};
  margin-top: ${(props) => (props.$show ? '10px' : '0')};
  overflow: hidden;
  color: var(--warn);
  opacity: ${(props) => (props.$show ? 1 : 0)};
  font-size: 0.78rem;
  font-weight: 900;
  line-height: 22px;
  transition: height 0.18s, margin-top 0.18s, opacity 0.18s;
`

export const Divider = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 26px 0 18px;
  color: var(--muted);
  font-size: 0.8rem;
  font-weight: 800;

  &::before,
  &::after {
    content: '';
    flex: 1;
    height: 1px;
    background: var(--line);
  }
`

export const SocialRow = styled.div`
  display: flex;
  justify-content: center;
  gap: 38px;
`

export const SocialBtn = styled.button`
  position: relative;
  width: 48px;
  height: 48px;
  display: grid;
  place-items: center;
  border: 0;
  border-radius: 50%;
  background: transparent;
  cursor: pointer;
  transition: transform 0.2s;

  &:hover,
  &:focus-visible {
    transform: translateY(-4px);
    outline: none;
  }
  &::after {
    content: attr(data-label);
    position: absolute;
    top: calc(100% + 8px);
    left: 50%;
    transform: translate(-50%, -4px);
    padding: 5px 10px;
    border: 1px solid rgba(80,217,144,.22);
    border-radius: 999px;
    background: rgba(255,255,255,.94);
    color: var(--forest);
    box-shadow: 0 8px 18px rgba(7,59,36,.08);
    font-size: 0.72rem;
    font-weight: 900;
    line-height: 1;
    white-space: nowrap;
    opacity: 0;
    visibility: hidden;
    transition: opacity 0.18s, transform 0.18s, visibility 0.18s;
    pointer-events: none;
  }
  &:hover::after,
  &:focus-visible::after {
    opacity: 1;
    visibility: visible;
    transform: translate(-50%, 0);
  }
  &:hover .social-logo,
  &:focus-visible .social-logo {
    transform: scale(1.07);
    box-shadow: 0 12px 24px rgba(7,59,36,.18);
  }
`

export const SocialLogo = styled.span`
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  overflow: hidden;
  box-shadow: 0 8px 18px rgba(7,59,36,.13);
  transition: transform 0.2s, box-shadow 0.2s;
  background: ${(props) =>
    props.$provider === 'kakao'
      ? '#fee500'
      : props.$provider === 'naver'
        ? '#03c75a'
        : '#fff'};
  border: ${(props) => (props.$provider === 'google' ? '1px solid rgba(7,59,36,.08)' : 'none')};

  svg {
    width: 100%;
    height: 100%;
    display: block;
  }
`

export const SignupLink = styled.div`
  margin-top: 36px;
  text-align: center;
  color: var(--muted);
  font-size: 0.85rem;
  font-weight: 600;

  a {
    color: var(--leaf);
    font-weight: 900;
    text-decoration: none;
  }
  a:hover {
    color: var(--forest);
  }
`

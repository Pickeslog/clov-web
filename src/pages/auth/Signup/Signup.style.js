import styled from '@emotion/styled'
import { keyframes } from '@emotion/react'

const rise = keyframes`from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); }`
const shakeInput = keyframes`
  0%, 100% { transform: translateX(0); border-color: var(--line); }
  20%, 60% { transform: translateX(-6px); border-color: #f87171; box-shadow: 0 0 0 4px rgba(248,113,113,.18); }
  40%, 80% { transform: translateX(6px); }
`
const shakeBox = keyframes`0%,100%{transform:translateX(0)} 20%,60%{transform:translateX(-5px)} 40%,80%{transform:translateX(5px)}`
const popIn = keyframes`from { transform: scale(0); opacity: 0; } to { transform: scale(1); opacity: 1; }`
const fadeIn = keyframes`from { opacity: 0; } to { opacity: 1; }`
const modalUp = keyframes`from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); }`

export const Page = styled.main`
  /* 가입은 프로토타입처럼 "항상 라이트 크림 종이" 화면(#96 이후 tokens.css엔 다크
     오버라이드가 없다 — 이 줄은 index.css의 color-scheme:light dark(native input/select
     다크화)만 이 서브트리에서 무력화하면 됨). */
  color-scheme: light;
  --forest: #073b24;
  --leaf: #16874b;
  --mint: #50d990;
  --cream: #f7fbf6;
  --paper: #ffffff;
  --text: #0e2d1d;
  --muted: #638772;
  --line: rgba(22, 135, 75, 0.18);
  --glow: rgba(80, 217, 144, 0.22);
  --warn: #b45309;

  font-family: 'Outfit', sans-serif;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px;
  overflow-x: hidden;
  color: var(--text);
  background:
    radial-gradient(circle at 12% 12%, rgba(217,201,143,.28), transparent 28%),
    radial-gradient(circle at 84% 82%, rgba(232,220,174,.2), transparent 32%),
    linear-gradient(135deg, #fffdf3 0%, #fffaf0 48%, #fdf6e3 100%);
`

export const Card = styled.div`
  position: relative;
  width: 100%;
  max-width: 440px;
  background: var(--paper);
  border: 1px solid var(--line);
  border-radius: 28px;
  padding: 40px 36px 32px;
  box-shadow: 0 28px 70px rgba(7,59,36,.14), 0 1px 0 rgba(255,255,255,.9) inset;
  animation: ${rise} 0.6s cubic-bezier(.22, 1, .36, 1) both;

  @media (max-width: 520px) {
    padding: 32px 24px 26px;
  }
`

export const LogoArea = styled.div`
  text-align: center;
  margin-bottom: 26px;
`

export const LogoIcon = styled.div`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, #1a8e52, #5de49a);
  border-radius: 16px;
  box-shadow: 0 10px 26px rgba(0,0,0,.18);
  margin-bottom: 12px;

  img {
    width: 70%;
    height: 70%;
    object-fit: contain;
  }
`

export const LogoText = styled.div`
  font-size: 1.4rem;
  font-weight: 900;
  color: var(--forest);
  letter-spacing: -0.02em;
`

export const LogoSub = styled.div`
  font-size: 0.8rem;
  color: var(--muted);
  margin-top: 4px;
  font-weight: 500;
`

export const StepBar = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 28px;
`

export const StepDot = styled.div`
  position: relative;
  height: 3px;
  border-radius: 99px;
  flex: 1;
  background: var(--line);
  overflow: hidden;

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background: ${(props) => (props.$done ? 'var(--mint)' : 'var(--leaf)')};
    transform: scaleX(${(props) => (props.$active || props.$done ? 1 : 0)});
    transform-origin: left;
    transition: transform 0.55s cubic-bezier(.22, .7, .32, 1), background-color 0.3s ease;
  }
`

export const FormTitle = styled.div`
  font-size: 1.3rem;
  font-weight: 800;
  color: var(--text);
  margin-bottom: 6px;
  letter-spacing: -0.01em;
`

export const FormDesc = styled.div`
  font-size: 0.85rem;
  color: var(--muted);
  margin-bottom: 20px;
  font-weight: 500;
  line-height: 1.5;
`

export const InputGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 14px;
`

export const InputGroup = styled.div`
  position: relative;
`

export const InputLabel = styled.label`
  display: block;
  font-size: 0.78rem;
  font-weight: 800;
  color: var(--forest);
  margin-bottom: 8px;
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

export const OptionalTag = styled.span`
  color: var(--muted);
  font-weight: 700;
  font-size: 0.72rem;
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
  font-size: 1.05rem;
  pointer-events: none;
  z-index: 2;
  transition: transform 0.2s;
`

export const Input = styled.input`
  width: 100%;
  height: 54px;
  padding: 0 48px 0 46px;
  border: 1.5px solid var(--line);
  border-radius: 18px;
  font-size: 0.96rem;
  font-family: 'Outfit', sans-serif;
  font-weight: 600;
  color: var(--text);
  background: var(--cream);
  outline: none;
  transition: border-color 0.22s, box-shadow 0.22s, background-color 0.22s, transform 0.22s;
  animation: ${(props) => (props.$shake ? `${shakeInput} 0.4s ease` : 'none')};
  cursor: ${(props) => (props.readOnly ? 'pointer' : 'text')};

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
  border: 0;
  border-radius: 50%;
  display: grid;
  place-items: center;
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
  padding: 0 2px;
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

export const PwStrength = styled.div`
  display: flex;
  gap: 5px;
  margin-top: 8px;
  height: 3px;
`

export const PwSeg = styled.div`
  flex: 1;
  border-radius: 99px;
  background: ${(props) =>
    props.$level === 'weak'
      ? '#f87171'
      : props.$level === 'mid'
        ? '#fbbf24'
        : props.$level === 'strong'
          ? 'var(--leaf)'
          : 'var(--line)'};
  transition: background 0.3s ease;
`

export const PwRules = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 8px;
`

export const PwRule = styled.span`
  position: relative;
  padding-left: 13px;
  color: ${(props) => (props.$met ? 'var(--leaf)' : 'var(--muted)')};
  font-size: 0.72rem;
  font-weight: 700;
  transition: color 0.2s;

  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 50%;
    width: 6px;
    height: 6px;
    margin-top: -3px;
    border-radius: 50%;
    background: ${(props) => (props.$met ? 'var(--leaf)' : 'var(--line)')};
    transition: background-color 0.2s;
  }
`

export const TermsBox = styled.div`
  background: var(--cream);
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 16px;
  margin: 20px 0 24px;
  animation: ${(props) => (props.$shake ? `${shakeBox} 0.4s ease` : 'none')};
`

export const TermsRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  padding: 3px 0;
  border-radius: 8px;

  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px var(--glow);
  }
`

export const TermsCheck = styled.div`
  position: relative;
  width: 19px;
  height: 19px;
  border: 1.5px solid ${(props) => (props.$checked ? 'var(--leaf)' : 'var(--line)')};
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  flex-shrink: 0;
  transition: all 0.15s ease;
  background: ${(props) => (props.$checked ? 'var(--leaf)' : '#fff')};
  color: ${(props) => (props.$checked ? '#fff' : 'transparent')};
`

export const TermsLabel = styled.div`
  font-size: 0.83rem;
  color: var(--muted);
  font-weight: ${(props) => (props.$strong ? 800 : 500)};
  flex: 1;

  strong {
    color: var(--text);
  }
`

export const TermsDivider = styled.div`
  height: 1px;
  background: var(--line);
  margin: 10px 0;
`

export const TermsItem = styled.div`
  & + & {
    margin-top: 8px;
  }
`

export const TermsToggle = styled.button`
  flex-shrink: 0;
  width: 26px;
  height: 26px;
  margin-left: 2px;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--muted);
  display: grid;
  place-items: center;
  cursor: pointer;
  transition: background-color 0.2s, color 0.2s;

  &:hover,
  &:focus-visible {
    background: rgba(80,217,144,.14);
    color: var(--leaf);
    outline: none;
  }
  svg {
    width: 14px;
    height: 14px;
    transition: transform 0.25s ease;
    transform: rotate(${(props) => (props.$open ? '180deg' : '0')});
  }
`

export const TermsPanel = styled.div`
  max-height: ${(props) => (props.$open ? '190px' : '0')};
  overflow: hidden;
  transition: max-height 0.4s cubic-bezier(.22, .7, .32, 1);
`

export const TermsPanelInner = styled.div`
  max-height: 190px;
  overflow-y: auto;
  padding: 8px 6px 10px 29px;
  color: var(--muted);
  font-size: 0.78rem;
  line-height: 1.65;

  h4 {
    margin: 10px 0 3px;
    color: var(--text);
    font-size: 0.82rem;
    font-weight: 700;
  }
  h4:first-of-type {
    margin-top: 0;
  }
  p {
    margin: 0 0 2px;
  }
`

export const ProfileFieldsBox = styled.div`
  padding: 16px;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: var(--cream);
  text-align: left;

  & > div + div {
    margin-top: 14px;
  }
`

export const ProfileSetup = styled.div`
  text-align: center;
  padding: 6px 0 2px;
`

export const ProfileTitle = styled.div`
  font-size: 1.25rem;
  font-weight: 800;
  color: var(--text);
  letter-spacing: -0.01em;
  margin-bottom: 6px;
`

export const ProfileDesc = styled.div`
  color: var(--muted);
  font-size: 0.85rem;
  line-height: 1.5;
  margin-bottom: 22px;
`

export const BtnPrimary = styled.button`
  width: 100%;
  height: 54px;
  margin-top: 18px;
  border: none;
  border-radius: 18px;
  font-size: 1rem;
  font-weight: 900;
  font-family: 'Outfit', sans-serif;
  color: #fff;
  cursor: pointer;
  background: linear-gradient(135deg, #093d26, #16874b 56%, #50d990);
  box-shadow: 0 14px 32px rgba(22,135,75,.3);
  transition: transform 0.2s, box-shadow 0.2s, filter 0.2s;
  letter-spacing: 0.01em;

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

export const BtnSecondary = styled.button`
  width: 100%;
  height: 48px;
  margin-top: 8px;
  border: 1px solid var(--line);
  border-radius: 16px;
  font-size: 0.88rem;
  font-weight: 700;
  font-family: 'Outfit', sans-serif;
  color: var(--muted);
  cursor: pointer;
  background: transparent;
  transition: all 0.2s;

  &:hover {
    border-color: var(--leaf);
    color: var(--leaf);
    background: rgba(80,217,144,.08);
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
  padding: 0;
  border: 0;
  border-radius: 50%;
  cursor: pointer;
  background: transparent;
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
    props.$provider === 'kakao' ? '#fee500' : props.$provider === 'naver' ? '#03c75a' : '#fff'};
  border: ${(props) => (props.$provider === 'google' ? '1px solid var(--line)' : 'none')};

  svg {
    width: 100%;
    height: 100%;
    display: block;
  }
`

export const LoginLink = styled.div`
  text-align: center;
  margin-top: 26px;
  font-size: 0.84rem;
  color: var(--muted);
  font-weight: 600;

  a {
    color: var(--leaf);
    font-weight: 800;
    text-decoration: none;
  }
  a:hover {
    color: var(--forest);
  }
`

export const SuccessWrap = styled.div`
  text-align: center;
  padding: 20px 0;
`

export const SuccessIcon = styled.div`
  width: 64px;
  height: 64px;
  background: linear-gradient(135deg, #1a8e52, #5de49a);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  color: #fff;
  margin: 0 auto 20px;
  animation: ${popIn} 0.4s cubic-bezier(.36, 2, .4, 1) both;
`

export const SuccessTitle = styled.div`
  font-size: 1.4rem;
  font-weight: 800;
  color: var(--text);
  margin-bottom: 8px;
`

export const SuccessSub = styled.div`
  font-size: 0.88rem;
  color: var(--muted);
  line-height: 1.6;
  margin-bottom: 24px;
`

export const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 60;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 22px;
  background: rgba(7,59,36,.32);
  animation: ${fadeIn} 0.18s ease both;
`

export const ModalBox = styled.div`
  width: min(360px, 100%);
  padding: ${(props) => (props.$nudge ? '22px 20px' : '18px')};
  border: 1px solid var(--line);
  border-radius: 18px;
  background: #fff;
  box-shadow: 0 20px 50px rgba(7,59,36,.2);
  animation: ${modalUp} 0.2s cubic-bezier(.22, 1, .36, 1) both;
`

export const ModalHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  margin-bottom: 10px;
`

export const ModalClose = styled.button`
  width: 30px;
  height: 30px;
  border: 0;
  border-radius: 8px;
  background: rgba(80,217,144,.14);
  color: var(--forest);
  font-size: 1.1rem;
  font-weight: 900;
  cursor: pointer;
`

export const BirthWheel = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 8px;

  select {
    width: 100%;
    height: 42px;
    border: 1px solid var(--line);
    border-radius: 8px;
    background: #fff;
    color: var(--text);
    font-family: 'Outfit', sans-serif;
    font-size: 0.95rem;
    font-weight: 700;
    text-align: center;
    text-align-last: center;
    outline: none;
  }
  select:focus {
    border-color: var(--mint);
    box-shadow: 0 0 0 3px var(--glow);
  }
`

export const BirthWheelLabel = styled.span`
  display: block;
  margin-top: 2px;
  color: var(--muted);
  font-size: 0.7rem;
  font-weight: 700;
  text-align: center;
`

export const NudgeTitle = styled.div`
  font-size: 1.05rem;
  font-weight: 800;
  color: var(--text);
  margin-bottom: 8px;
`

export const NudgeDesc = styled.div`
  color: var(--muted);
  font-size: 0.85rem;
  line-height: 1.55;
  margin-bottom: 18px;
`

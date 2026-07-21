import styled from '@emotion/styled'

export const Page = styled.main`
  min-height: 100vh;
  padding-bottom: 64px;
  color: var(--text);
  font-family: 'Outfit', sans-serif;
  background: var(--page-bg);
`

export const TopBar = styled.header`
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 18px 24px;
  border-bottom: 1px solid var(--line);

  @media (max-width: 640px) {
    flex-wrap: wrap;
  }
`

export const BackBtn = styled.button`
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

export const Title = styled.h1`
  flex: 1;
  font-size: 1.15rem;
  font-weight: 900;
  color: var(--forest);
`

export const WriteBtn = styled.button`
  border: 0;
  border-radius: 999px;
  padding: 10px 18px;
  background: linear-gradient(135deg, #093d26, #16874b 56%, #50d990);
  color: #fff;
  font: inherit;
  font-weight: 800;
  font-size: 0.85rem;
  cursor: pointer;
  box-shadow: 0 10px 22px rgba(22, 135, 75, 0.25);
`

export const Tabs = styled.div`
  display: flex;
  gap: 6px;
  width: min(880px, calc(100% - 48px));
  margin: 20px auto 0;
`

export const Tab = styled.button`
  border: 1.5px solid ${(props) => (props.$active ? 'var(--leaf)' : 'var(--line)')};
  border-radius: 999px;
  padding: 6px 16px;
  background: ${(props) => (props.$active ? 'var(--glow)' : 'var(--paper)')};
  color: ${(props) => (props.$active ? 'var(--forest)' : 'var(--muted)')};
  font: inherit;
  font-weight: 800;
  font-size: 0.82rem;
  cursor: pointer;
`

export const State = styled.div`
  padding: 60px 24px;
  text-align: center;
  color: var(--muted);
  font-weight: 700;
`

export const List = styled.section`
  display: grid;
  gap: 12px;
  width: min(880px, calc(100% - 48px));
  margin: 20px auto 0;
`

export const Card = styled.article`
  padding: 16px 18px;
  border: 1px solid var(--line);
  border-left: 5px solid ${(props) => (props.$status === 'COMPLETED' ? 'var(--mint)' : props.$status === 'CANCELED' ? 'var(--line)' : 'var(--leaf)')};
  border-radius: 16px;
  background: var(--card-bg);
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  opacity: ${(props) => (props.$status === 'CANCELED' ? 0.6 : 1)};

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 14px 30px rgba(7, 59, 36, 0.1);
  }
`

export const CardTop = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
`

export const CardTitle = styled.div`
  color: var(--forest);
  font-size: 1.02rem;
  font-weight: 900;
`

export const Badge = styled.span`
  flex-shrink: 0;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 800;
  color: #fff;
  background: ${(props) => (props.$status === 'COMPLETED' ? 'var(--leaf)' : props.$status === 'CANCELED' ? 'var(--muted)' : 'var(--forest)')};
`

export const CardDate = styled.div`
  margin-top: 6px;
  color: var(--muted);
  font-size: 0.8rem;
  font-weight: 700;
`

export const CardMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  color: var(--leaf);
  font-size: 0.78rem;
  font-weight: 800;
`

export const MemoryTag = styled.span`
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--glow);
  color: var(--forest);
  font-size: 0.72rem;
`

export const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 20;
  display: grid;
  place-items: center;
  padding: 20px;
  background: var(--overlay-bg);
  backdrop-filter: blur(4px);
`

export const Modal = styled.div`
  width: min(500px, 100%);
  max-height: 86vh;
  overflow-y: auto;
  padding: 28px;
  border-radius: 22px;
  background: var(--paper);
  box-shadow: 0 32px 80px rgba(7, 59, 36, 0.28);
`

export const ModalTitle = styled.h2`
  margin-bottom: 12px;
  color: var(--forest);
  font-size: 1.3rem;
  font-weight: 900;
`

export const DetailMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  color: var(--muted);
  font-size: 0.82rem;
  font-weight: 700;
`

export const DetailDesc = styled.p`
  margin-top: 12px;
  color: var(--text);
  font-size: 0.94rem;
  line-height: 1.6;
  white-space: pre-wrap;
`

export const SubHead = styled.h3`
  margin: 20px 0 8px;
  color: var(--forest);
  font-size: 0.9rem;
  font-weight: 800;
`

export const CheckList = styled.div`
  display: grid;
  gap: 6px;
`

export const CheckRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

export const CheckText = styled.span`
  flex: 1;
  color: ${(props) => (props.$done ? 'var(--muted)' : 'var(--text)')};
  text-decoration: ${(props) => (props.$done ? 'line-through' : 'none')};
  font-size: 0.9rem;
  font-weight: 600;
`

export const RemoveCheck = styled.button`
  border: 0;
  background: none;
  color: var(--muted);
  font-size: 0.85rem;
  cursor: pointer;

  &:disabled {
    opacity: 0.5;
    cursor: default;
  }
  &:hover:not(:disabled) {
    color: var(--warn);
  }
`

export const MutedLine = styled.div`
  color: var(--muted);
  font-size: 0.82rem;
  font-weight: 600;
`

export const CheckAdd = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 8px;
`

export const StageGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
`

export const StageCell = styled.div`
  display: grid;
  gap: 6px;
  justify-items: center;
  padding: 8px 4px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: ${({ $state }) => ($state === 'DONE' ? 'var(--paper)' : 'var(--cream)')};
`

export const StageName = styled.span`
  font-size: 0.72rem;
  font-weight: 800;
  color: var(--forest);
`

export const StageImg = styled.img`
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
  border-radius: 8px;
`

export const StageUpload = styled.label`
  width: 100%;
  aspect-ratio: 1;
  display: grid;
  place-items: center;
  border-radius: 8px;
  border: 1.5px dashed var(--mint);
  color: var(--leaf);
  font-size: 0.72rem;
  font-weight: 800;
  text-align: center;
  cursor: ${({ $busy }) => ($busy ? 'default' : 'pointer')};
  opacity: ${({ $busy }) => ($busy ? 0.6 : 1)};

  &:hover {
    background: var(--glow);
  }
`

export const StageLocked = styled.div`
  width: 100%;
  aspect-ratio: 1;
  display: grid;
  place-items: center;
  border-radius: 8px;
  background: var(--line);
  opacity: 0.5;
`

export const ModalActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 18px;
`

export const Field = styled.div`
  margin-bottom: 14px;
`

export const Label = styled.label`
  display: block;
  margin-bottom: 6px;
  color: var(--forest);
  font-size: 0.78rem;
  font-weight: 800;
`

export const Input = styled.input`
  width: 100%;
  height: 44px;
  padding: 0 14px;
  border: 1.5px solid var(--line);
  border-radius: 14px;
  background: var(--cream);
  color: var(--text);
  font: inherit;

  &:focus {
    outline: none;
    border-color: var(--mint);
    box-shadow: 0 0 0 4px var(--glow);
  }
`

export const Textarea = styled.textarea`
  width: 100%;
  min-height: 80px;
  padding: 10px 14px;
  border: 1.5px solid var(--line);
  border-radius: 14px;
  background: var(--cream);
  color: var(--text);
  font: inherit;
  resize: vertical;

  &:focus {
    outline: none;
    border-color: var(--mint);
    box-shadow: 0 0 0 4px var(--glow);
  }
`

export const PrimaryBtn = styled.button`
  border: 0;
  border-radius: 14px;
  padding: 10px 18px;
  background: linear-gradient(135deg, #093d26, #16874b 56%, #50d990);
  color: #fff;
  font: inherit;
  font-weight: 800;
  cursor: pointer;

  &:disabled {
    opacity: 0.65;
    cursor: default;
  }
`

export const SecondaryBtn = styled.button`
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 10px 18px;
  background: var(--paper);
  color: var(--muted);
  font: inherit;
  font-weight: 800;
  cursor: pointer;

  &:hover:not(:disabled) {
    color: var(--leaf);
    border-color: var(--mint);
  }
  &:disabled {
    opacity: 0.65;
    cursor: default;
  }
`

export const ErrorText = styled.div`
  margin-bottom: 10px;
  color: var(--warn);
  font-size: 0.8rem;
  font-weight: 800;
`

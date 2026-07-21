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

export const FilterBar = styled.section`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  width: min(1040px, calc(100% - 48px));
  margin: 20px auto 0;
`

export const MonthInput = styled.input`
  border: 1.5px solid var(--line);
  border-radius: 12px;
  padding: 8px 12px;
  background: var(--paper);
  color: var(--text);
  font: inherit;
  font-weight: 700;
`

export const Tabs = styled.div`
  display: flex;
  gap: 6px;
  padding: 4px;
  border-radius: 999px;
  background: var(--card-bg);
  border: 1px solid var(--line);
`

export const Tab = styled.button`
  border: 0;
  border-radius: 999px;
  padding: 6px 14px;
  background: ${(props) => (props.$active ? 'var(--leaf)' : 'transparent')};
  color: ${(props) => (props.$active ? '#fff' : 'var(--muted)')};
  font: inherit;
  font-weight: 800;
  font-size: 0.82rem;
  cursor: pointer;
`

export const TagRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`

export const TagChip = styled.button`
  border: 1.5px solid ${(props) => (props.$active ? 'var(--leaf)' : 'var(--line)')};
  border-radius: 999px;
  padding: 6px 12px;
  background: ${(props) => (props.$active ? 'var(--glow)' : 'var(--paper)')};
  color: ${(props) => (props.$active ? 'var(--forest)' : 'var(--muted)')};
  font: inherit;
  font-weight: 700;
  font-size: 0.8rem;
  cursor: pointer;
`

export const State = styled.div`
  padding: 60px 24px;
  text-align: center;
  color: var(--muted);
  font-weight: 700;
`

export const Grid = styled.section`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
  width: min(1040px, calc(100% - 48px));
  margin: 24px auto 0;
`

export const Card = styled.article`
  padding: 16px;
  border: 1px solid var(--line);
  border-radius: 18px;
  background: var(--card-bg);
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;

  &:hover {
    transform: translateY(-3px);
    border-color: var(--mint);
    box-shadow: 0 16px 34px rgba(7, 59, 36, 0.1);
  }
`

export const CardThumb = styled.div`
  height: 120px;
  display: grid;
  place-items: center;
  margin-bottom: 10px;
  border-radius: 14px;
  background: var(--glow);
  font-size: 2rem;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 14px;
  }
`

export const CardWriter = styled.div`
  color: var(--leaf);
  font-size: 0.78rem;
  font-weight: 800;
`

export const CardTitle = styled.div`
  margin-top: 4px;
  color: var(--forest);
  font-size: 1.02rem;
  font-weight: 900;
`

export const CardDate = styled.div`
  margin-top: 2px;
  color: var(--muted);
  font-size: 0.78rem;
  font-weight: 700;
`

export const CardTags = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
  color: var(--leaf);
  font-size: 0.76rem;
  font-weight: 800;
`

export const CardMeta = styled.div`
  margin-top: 8px;
  color: var(--muted);
  font-size: 0.78rem;
  font-weight: 700;
`

export const CommentsSection = styled.section`
  margin-top: 18px;
  padding-top: 14px;
  border-top: 1px solid var(--line);
`

export const CommentEmpty = styled.div`
  padding: 8px 0;
  color: var(--muted);
  font-size: 0.82rem;
  font-weight: 600;
`

export const CommentRow = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 0;
  border-bottom: 1px solid var(--line);

  &:last-of-type {
    border-bottom: 0;
  }
`

export const CommentBody = styled.div`
  min-width: 0;
`

export const CommentWriter = styled.div`
  color: var(--leaf);
  font-size: 0.76rem;
  font-weight: 800;
`

export const CommentText = styled.div`
  margin-top: 2px;
  color: var(--text);
  font-size: 0.88rem;
  line-height: 1.5;
  word-break: break-word;
`

export const CommentDeleteBtn = styled.button`
  flex-shrink: 0;
  border: 0;
  background: transparent;
  color: var(--muted);
  font: inherit;
  font-size: 0.76rem;
  font-weight: 700;
  cursor: pointer;

  &:hover {
    color: var(--warn);
  }
`

export const CommentForm = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 12px;

  input {
    flex: 1;
    min-width: 0;
  }
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
  width: min(480px, 100%);
  max-height: 86vh;
  overflow-y: auto;
  padding: 28px;
  border-radius: 22px;
  background: var(--paper);
  box-shadow: 0 32px 80px rgba(7, 59, 36, 0.28);
`

export const ModalTitle = styled.h2`
  margin-bottom: 14px;
  color: var(--forest);
  font-size: 1.3rem;
  font-weight: 900;
`

export const DetailContent = styled.p`
  margin-top: 10px;
  color: var(--text);
  font-size: 0.94rem;
  line-height: 1.6;
  white-space: pre-wrap;
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
  min-height: 90px;
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

export const Counter = styled.div`
  margin-top: 4px;
  text-align: right;
  color: var(--muted);
  font-size: 0.72rem;
  font-weight: 700;
`

export const ErrorText = styled.div`
  margin-bottom: 10px;
  color: var(--warn);
  font-size: 0.8rem;
  font-weight: 800;
`

export const ModalActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 18px;
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

  &:hover {
    color: var(--leaf);
    border-color: var(--mint);
  }
  &:disabled {
    opacity: 0.65;
    cursor: default;
  }
`

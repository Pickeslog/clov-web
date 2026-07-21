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

export const Filters = styled.div`
  width: min(720px, calc(100% - 48px));
  margin: 20px auto 0;
  display: flex;
  gap: 8px;

  @media (max-width: 480px) {
    flex-wrap: wrap;
  }
`

export const FilterBtn = styled.button`
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

export const FavoriteToggle = styled.label`
  width: min(720px, calc(100% - 48px));
  margin: 14px auto 0;
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--muted);
  font-size: 0.85rem;
  font-weight: 700;
`

export const State = styled.div`
  width: min(720px, calc(100% - 48px));
  margin: 40px auto;
  text-align: center;
  color: var(--muted);
  font-weight: 700;
`

export const Empty = styled.div`
  width: min(720px, calc(100% - 48px));
  margin: 40px auto;
  padding: 24px;
  border: 1px dashed var(--line);
  border-radius: 16px;
  background: var(--cream);
  text-align: center;
  color: var(--muted);
  font-size: 0.88rem;
  font-weight: 600;
  line-height: 1.6;
`

export const List = styled.section`
  width: min(720px, calc(100% - 48px));
  margin: 20px auto 64px;
  display: grid;
  gap: 12px;
`

export const Card = styled.article`
  padding: 18px 20px;
  border: 1px solid var(--line);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.85);
`

export const CardTop = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`

export const StarBtn = styled.button`
  border: 0;
  background: none;
  font-size: 1.2rem;
  line-height: 1;
  cursor: pointer;
  color: ${(props) => (props.$active ? 'var(--mint)' : 'var(--muted)')};

  &:disabled {
    opacity: 0.6;
    cursor: default;
  }
`

export const CardMeta = styled.span`
  flex: 1;
  color: var(--forest);
  font-size: 0.85rem;
  font-weight: 800;
`

export const ReadBtn = styled.button`
  border: 1px solid var(--line);
  border-radius: 999px;
  padding: 4px 10px;
  background: var(--paper);
  color: var(--leaf);
  font: inherit;
  font-size: 0.75rem;
  font-weight: 800;
  cursor: pointer;

  &:disabled {
    opacity: 0.6;
    cursor: default;
  }
`

export const CardBody = styled.p`
  margin-top: 10px;
  color: var(--text);
  font-size: 0.92rem;
  line-height: 1.6;
  white-space: pre-wrap;
`

export const ComposeForm = styled.section`
  width: min(720px, calc(100% - 48px));
  margin: 20px auto 64px;
  padding: 26px;
  border: 1px solid var(--line);
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.8);
  box-shadow: 0 18px 44px rgba(7, 59, 36, 0.08);
  display: grid;
  gap: 16px;

  @media (max-width: 480px) {
    padding: 18px;
  }
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

export const Select = styled.select`
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

  &:disabled {
    opacity: 0.6;
  }
`

export const Textarea = styled.textarea`
  min-height: 120px;
  padding: 14px 16px;
  border: 1.5px solid var(--line);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.85);
  color: var(--text);
  font: inherit;
  font-size: 0.95rem;
  font-weight: 500;
  line-height: 1.6;
  resize: vertical;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;

  &:focus {
    border-color: var(--mint);
    background: #fff;
    box-shadow: 0 0 0 5px var(--glow);
  }
`

export const BroadcastToggle = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--muted);
  font-size: 0.85rem;
  font-weight: 700;
`

export const EmojiRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`

export const EmojiChip = styled.button`
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  border: 1.5px solid ${(props) => (props.$active ? 'var(--mint)' : 'var(--line)')};
  border-radius: 14px;
  background: ${(props) => (props.$active ? 'var(--glow)' : 'var(--paper)')};
  font-size: 1.2rem;
  cursor: pointer;
  transition: all 0.18s;
`

export const PreviewCard = styled.div`
  padding: 16px 18px;
  border: 1px dashed var(--line);
  border-radius: 16px;
  background: var(--cream);
  display: grid;
  gap: 6px;
`

export const PreviewMeta = styled.div`
  color: var(--forest);
  font-size: 0.8rem;
  font-weight: 800;
`

export const PreviewBody = styled.div`
  color: var(--text);
  font-size: 0.9rem;
  line-height: 1.6;
  white-space: pre-wrap;
`

export const SendBtn = styled.button`
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

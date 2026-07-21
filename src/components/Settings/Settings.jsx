import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as S from './Settings.style'
import {
  getMe, updateProfile, changePassword, deleteAccount,
  getPreferences, updatePreferences, presignProfileImage,
} from '../../api/user'
import { uploadImage } from '../../lib/uploadImage'
import { APP_BACKGROUNDS, applyAppBackground, getAppBackgroundId } from '../../lib/appBackground'
import { useAuthStore } from '../../stores/authStore'

const LETTER_THEMES = [
  { value: 'postbox', label: '우체통' },
  { value: 'giftbox', label: '선물상자' },
]
const MEMORY_THEMES = [
  { value: 'clothesline', label: '빨랫줄' },
  { value: 'stack', label: '겹침' },
  { value: 'diary', label: '일기장' },
]
const MASCOTS = [
  { value: 'crobi', label: '크로비' },
  { value: 'rob', label: '롭' },
]

// 내 정보/설정 모달(계약 §5). 프로필·비밀번호·환경설정·계정 탈퇴.
export default function Settings({ onClose }) {
  const me = useQuery({ queryKey: ['me'], queryFn: getMe })
  const prefs = useQuery({ queryKey: ['preferences'], queryFn: getPreferences })

  return (
    <S.Overlay onClick={onClose}>
      <S.Modal onClick={(e) => e.stopPropagation()}>
        <S.Head>
          <S.Title>설정</S.Title>
          <S.CloseBtn type="button" onClick={onClose}>
            닫기
          </S.CloseBtn>
        </S.Head>
        {me.isPending || prefs.isPending ? (
          <S.State>불러오는 중…</S.State>
        ) : me.isError || prefs.isError ? (
          <S.State>정보를 불러오지 못했습니다.</S.State>
        ) : (
          <SettingsBody me={me.data} prefs={prefs.data} />
        )}
      </S.Modal>
    </S.Overlay>
  )
}

function SettingsBody({ me, prefs }) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const clear = useAuthStore((state) => state.clear)
  const fileInputRef = useRef(null)

  const [nickname, setNickname] = useState(me.nickname ?? '')
  const [birthdate, setBirthdate] = useState(me.birthdate ?? '')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [pref, setPref] = useState({
    darkMode: Boolean(prefs.darkMode),
    letterTheme: prefs.letterTheme ?? 'postbox',
    memoryCardTheme: prefs.memoryCardTheme ?? 'clothesline',
    mascotType: prefs.mascotType ?? 'crobi',
  })

  const profileMutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['me'] }),
  })
  // 프로필 이미지: presign → R2 PUT → PATCH /me profileImageUrl 커밋.
  const imageMutation = useMutation({
    mutationFn: async (file) => {
      const imageUrl = await uploadImage(presignProfileImage, file)
      return updateProfile({ profileImageUrl: imageUrl })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['me'] }),
  })
  const passwordMutation = useMutation({
    mutationFn: changePassword,
    onSuccess: () => {
      setCurrentPassword('')
      setNewPassword('')
    },
  })
  const prefMutation = useMutation({
    mutationFn: updatePreferences,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['preferences'] }),
  })
  const deleteMutation = useMutation({
    mutationFn: deleteAccount,
    onSuccess: () => {
      clear()
      navigate('/login', { replace: true })
    },
  })

  return (
    <>
      <S.Section>
        <S.SectionTitle>프로필</S.SectionTitle>
        <S.AvatarRow>
          <S.Avatar>
            {me.profileImageUrl
              ? <img src={me.profileImageUrl} alt="프로필 이미지" />
              : (me.nickname?.trim()?.[0] ?? '🙂')}
          </S.Avatar>
          <div>
            <S.UploadBtn
              type="button"
              disabled={imageMutation.isPending}
              onClick={() => fileInputRef.current?.click()}
            >
              {imageMutation.isPending ? '업로드 중…' : '사진 변경'}
            </S.UploadBtn>
            {imageMutation.isError && <S.Err>{imageMutation.error?.message}</S.Err>}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) imageMutation.mutate(file)
              e.target.value = ''
            }}
          />
        </S.AvatarRow>
        <S.ReadRow>
          <span>이메일</span>
          <strong>{me.email}</strong>
        </S.ReadRow>
        <S.ReadRow>
          <span>내 초대코드</span>
          <strong>{me.personalInviteCode}</strong>
        </S.ReadRow>
        <S.Field>
          <S.Label htmlFor="set-nickname">닉네임</S.Label>
          <S.Input id="set-nickname" value={nickname} maxLength={50} onChange={(e) => setNickname(e.target.value)} />
        </S.Field>
        <S.Field>
          <S.Label htmlFor="set-birth">생일</S.Label>
          <S.Input id="set-birth" type="date" value={birthdate ?? ''} onChange={(e) => setBirthdate(e.target.value)} />
        </S.Field>
        <S.Row>
          <S.SaveBtn
            type="button"
            disabled={profileMutation.isPending || !nickname.trim()}
            onClick={() => profileMutation.mutate({ nickname: nickname.trim(), birthdate: birthdate || null })}
          >
            {profileMutation.isPending ? '저장 중…' : '프로필 저장'}
          </S.SaveBtn>
          {profileMutation.isSuccess && <S.Ok>저장됨</S.Ok>}
          {profileMutation.isError && <S.Err>{profileMutation.error?.message}</S.Err>}
        </S.Row>
      </S.Section>

      {!me.isSocial && (
        <S.Section>
          <S.SectionTitle>비밀번호 변경</S.SectionTitle>
          <S.Field>
            <S.Label htmlFor="set-cur">현재 비밀번호</S.Label>
            <S.Input id="set-cur" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
          </S.Field>
          <S.Field>
            <S.Label htmlFor="set-new">새 비밀번호</S.Label>
            <S.Input id="set-new" type="password" value={newPassword} placeholder="8~20자, 영문·숫자·특수 2종 이상" onChange={(e) => setNewPassword(e.target.value)} />
          </S.Field>
          <S.Row>
            <S.SaveBtn
              type="button"
              disabled={passwordMutation.isPending || !currentPassword || !newPassword}
              onClick={() => passwordMutation.mutate({ currentPassword, newPassword })}
            >
              {passwordMutation.isPending ? '변경 중…' : '비밀번호 변경'}
            </S.SaveBtn>
            {passwordMutation.isSuccess && <S.Ok>변경됨 (다시 로그인 필요할 수 있어요)</S.Ok>}
            {passwordMutation.isError && (
              <S.Err>{passwordMutation.error?.code === 'INVALID_CREDENTIALS' ? '현재 비밀번호가 올바르지 않습니다.' : passwordMutation.error?.message}</S.Err>
            )}
          </S.Row>
        </S.Section>
      )}

      <S.Section>
        <S.SectionTitle>환경설정</S.SectionTitle>
        <S.ToggleRow>
          <input
            type="checkbox"
            checked={pref.darkMode}
            onChange={(e) => setPref((p) => ({ ...p, darkMode: e.target.checked }))}
          />
          <span>다크 모드</span>
        </S.ToggleRow>
        <PrefSelect label="편지 테마" value={pref.letterTheme} options={LETTER_THEMES}
          onChange={(v) => setPref((p) => ({ ...p, letterTheme: v }))} />
        <PrefSelect label="추억카드 테마" value={pref.memoryCardTheme} options={MEMORY_THEMES}
          onChange={(v) => setPref((p) => ({ ...p, memoryCardTheme: v }))} />
        <PrefSelect label="마스코트" value={pref.mascotType} options={MASCOTS}
          onChange={(v) => setPref((p) => ({ ...p, mascotType: v }))} />
        <S.Row>
          <S.SaveBtn type="button" disabled={prefMutation.isPending} onClick={() => prefMutation.mutate(pref)}>
            {prefMutation.isPending ? '저장 중…' : '설정 저장'}
          </S.SaveBtn>
          {prefMutation.isSuccess && <S.Ok>저장됨</S.Ok>}
        </S.Row>
      </S.Section>

      <BackgroundPicker />

      <S.Danger>
        <S.SectionTitle>계정 탈퇴</S.SectionTitle>
        <S.DangerText>탈퇴 시 계정은 익명화(닉네임 "언노운")되고 기록은 보존됩니다. 되돌릴 수 없습니다.</S.DangerText>
        <S.DangerBtn
          type="button"
          disabled={deleteMutation.isPending}
          onClick={() => {
            if (window.confirm('정말 탈퇴하시겠어요? 되돌릴 수 없습니다.')) deleteMutation.mutate()
          }}
        >
          {deleteMutation.isPending ? '처리 중…' : '회원 탈퇴'}
        </S.DangerBtn>
      </S.Danger>
    </>
  )
}

// 앱 전역 배경 테마 피커 — 선택은 기기-로컬(localStorage) 저장, 즉시 적용.
function BackgroundPicker() {
  const [selected, setSelected] = useState(getAppBackgroundId)
  const pick = (id) => setSelected(applyAppBackground(id))
  return (
    <S.Section>
      <S.SectionTitle>배경</S.SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        {APP_BACKGROUNDS.map((bg) => (
          <button
            key={bg.id}
            type="button"
            onClick={() => pick(bg.id)}
            aria-label={bg.name}
            aria-pressed={selected === bg.id}
            style={{
              padding: 0,
              border: selected === bg.id ? '2px solid #52b788' : '2px solid transparent',
              borderRadius: 12,
              overflow: 'hidden',
              cursor: 'pointer',
              background: 'none',
              boxShadow: selected === bg.id ? '0 0 0 2px rgba(82,183,136,0.3)' : 'none',
            }}
          >
            <img src={bg.thumb} alt="" style={{ display: 'block', width: '100%', height: 64, objectFit: 'cover' }} />
            <span style={{ display: 'block', padding: '6px 4px', fontSize: 12, fontWeight: 700, textAlign: 'center' }}>{bg.name}</span>
          </button>
        ))}
      </div>
      <p style={{ fontSize: 12, opacity: 0.7, marginTop: 8, lineHeight: 1.5 }}>
        기본(우드 &amp; 클로버)은 바로 적용돼요. 사진 배경은 이식된 화면(방 목록 등)에 나타납니다.
      </p>
    </S.Section>
  )
}

function PrefSelect({ label, value, options, onChange }) {
  return (
    <S.Field>
      <S.Label>{label}</S.Label>
      <S.Select value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </S.Select>
    </S.Field>
  )
}

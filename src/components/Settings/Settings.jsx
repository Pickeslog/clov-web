import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import './settings.proto.css'
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

// 사용자설정 모달 — 프로토타입 2-패널(계정/화면) 레이아웃.
export default function Settings({ onClose }) {
  const me = useQuery({ queryKey: ['me'], queryFn: getMe })
  const prefs = useQuery({ queryKey: ['preferences'], queryFn: getPreferences })

  return (
    <div className="proto-settings">
      <div className="ps-overlay" onClick={onClose}>
        <div className="ps-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
          {me.isPending || prefs.isPending ? (
            <div className="ps-state">불러오는 중…</div>
          ) : me.isError || prefs.isError ? (
            <div className="ps-state">정보를 불러오지 못했습니다.</div>
          ) : (
            <SettingsBody me={me.data} prefs={prefs.data} onClose={onClose} />
          )}
        </div>
      </div>
    </div>
  )
}

function SettingsBody({ me, prefs, onClose }) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const clear = useAuthStore((state) => state.clear)
  const fileInputRef = useRef(null)

  const [pane, setPane] = useState('account')
  const [nickname, setNickname] = useState(me.nickname ?? '')
  const [birthdate, setBirthdate] = useState(me.birthdate ?? '')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPw, setShowPw] = useState({ cur: false, next: false, conf: false })
  const [bgId, setBgId] = useState(getAppBackgroundId)
  const [pref, setPref] = useState({
    darkMode: Boolean(prefs.darkMode),
    letterTheme: prefs.letterTheme ?? 'postbox',
    memoryCardTheme: prefs.memoryCardTheme ?? 'clothesline',
    mascotType: prefs.mascotType ?? 'crobi',
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      await updateProfile({ nickname: nickname.trim(), birthdate: birthdate || null })
      await updatePreferences(pref)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] })
      queryClient.invalidateQueries({ queryKey: ['preferences'] })
    },
  })
  const imageMutation = useMutation({
    mutationFn: async (file) => {
      const imageUrl = await uploadImage(presignProfileImage, file)
      return updateProfile({ profileImageUrl: imageUrl })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['me'] }),
  })
  const passwordMutation = useMutation({
    mutationFn: changePassword,
    onSuccess: () => { setCurrentPassword(''); setNewPassword(''); setConfirmPassword('') },
  })
  const deleteMutation = useMutation({
    mutationFn: deleteAccount,
    onSuccess: () => { clear(); navigate('/login', { replace: true }) },
  })

  const pickBackground = (id) => setBgId(applyAppBackground(id))
  const pwMismatch = confirmPassword.length > 0 && newPassword !== confirmPassword
  const canChangePw = currentPassword && newPassword && newPassword === confirmPassword

  const avatarInner = me.profileImageUrl
    ? <img src={me.profileImageUrl} alt="" />
    : (me.nickname?.trim()?.[0] ?? '🙂')

  return (
    <>
      <div className="ps-head">
        <div>
          <span className="ps-kicker">SETTINGS</span>
          <h3>사용자설정</h3>
        </div>
        <button type="button" className="ps-close" onClick={onClose} aria-label="닫기">×</button>
      </div>

      <div className="ps-body">
        <nav className="ps-rail">
          <div className="ps-rail-identity">
            <div className="ps-rail-avatar">{avatarInner}</div>
            <span className="ps-rail-name">{me.nickname || '나'}</span>
          </div>
          <div className="ps-nav">
            <div className="ps-nav-group">
              <p className="ps-nav-label">계정</p>
              <button type="button" className={`ps-nav-item${pane === 'account' ? ' active' : ''}`} onClick={() => setPane('account')}>개인정보 수정</button>
            </div>
            <div className="ps-nav-group">
              <p className="ps-nav-label">화면</p>
              <button type="button" className={`ps-nav-item${pane === 'theme' ? ' active' : ''}`} onClick={() => setPane('theme')}>테마 설정</button>
            </div>
          </div>
        </nav>

        <section className="ps-panel">
          {pane === 'account' ? (
            <>
              <div className="ps-section">
                <div className="ps-section-title">기본 정보</div>
                <div className="ps-basic">
                  <button type="button" className="ps-avatar-upload" onClick={() => fileInputRef.current?.click()} disabled={imageMutation.isPending} aria-label="프로필 사진 변경">
                    {avatarInner}
                  </button>
                  <div className="ps-field">
                    <label className="ps-label" htmlFor="set-nickname">이름 / 닉네임</label>
                    <input className="ps-input" id="set-nickname" value={nickname} maxLength={50} onChange={(e) => setNickname(e.target.value)} />
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) imageMutation.mutate(f); e.target.value = '' }} />
                </div>
                <div className="ps-basic-hint">{imageMutation.isPending ? '사진 업로드 중…' : '프로필 사진을 클릭하면 변경할 수 있어요'}</div>
                {imageMutation.isError && <div className="ps-err">{imageMutation.error?.message}</div>}
              </div>

              <div className="ps-section">
                <div className="ps-section-title">연락처</div>
                <div className="ps-field">
                  <label className="ps-label" htmlFor="set-email">이메일</label>
                  <input className="ps-input" id="set-email" type="email" value={me.email ?? ''} readOnly />
                </div>
                <div className="ps-field">
                  <label className="ps-label" htmlFor="set-code">내 초대코드</label>
                  <input className="ps-input" id="set-code" value={me.personalInviteCode ?? ''} readOnly />
                </div>
                <div className="ps-field">
                  <label className="ps-label" htmlFor="set-birth">생년월일</label>
                  <input className="ps-input" id="set-birth" type="date" value={birthdate ?? ''} onChange={(e) => setBirthdate(e.target.value)} />
                </div>
              </div>

              {!me.isSocial && (
                <div className="ps-section">
                  <div className="ps-section-title">비밀번호 변경</div>
                  <PasswordField label="현재 비밀번호" id="set-cur" value={currentPassword} show={showPw.cur}
                    onToggle={() => setShowPw((s) => ({ ...s, cur: !s.cur }))} onChange={setCurrentPassword} />
                  <PasswordField label="새 비밀번호" id="set-new" value={newPassword} show={showPw.next} placeholder="8~20자, 영문·숫자·특수 2종 이상"
                    onToggle={() => setShowPw((s) => ({ ...s, next: !s.next }))} onChange={setNewPassword} />
                  <PasswordField label="새 비밀번호 확인" id="set-conf" value={confirmPassword} show={showPw.conf} placeholder="동일하게 입력"
                    onToggle={() => setShowPw((s) => ({ ...s, conf: !s.conf }))} onChange={setConfirmPassword} />
                  <div className={`ps-hint${pwMismatch ? ' err' : ''}`}>
                    {pwMismatch ? '새 비밀번호가 일치하지 않아요.'
                      : passwordMutation.isSuccess ? '비밀번호가 변경됐어요 (다시 로그인이 필요할 수 있어요).'
                        : passwordMutation.isError ? (passwordMutation.error?.code === 'INVALID_CREDENTIALS' ? '현재 비밀번호가 올바르지 않습니다.' : passwordMutation.error?.message) : ''}
                  </div>
                  <button type="button" className="ps-inline-btn" disabled={!canChangePw || passwordMutation.isPending}
                    onClick={() => passwordMutation.mutate({ currentPassword, newPassword })}>
                    {passwordMutation.isPending ? '변경 중…' : '비밀번호 변경'}
                  </button>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="ps-section">
                <div className="ps-section-title">테마</div>
                <div className="ps-swatches">
                  <button type="button" className={`ps-mode-swatch light${!pref.darkMode ? ' on' : ''}`} onClick={() => setPref((p) => ({ ...p, darkMode: false }))}>라이트</button>
                  <button type="button" className={`ps-mode-swatch dark${pref.darkMode ? ' on' : ''}`} onClick={() => setPref((p) => ({ ...p, darkMode: true }))}>다크</button>
                </div>
              </div>

              <div className="ps-section">
                <div className="ps-section-title">바탕화면</div>
                <div className="ps-bg-grid">
                  {APP_BACKGROUNDS.map((bg) => (
                    <button type="button" key={bg.id} className={`ps-bg-swatch${bgId === bg.id ? ' on' : ''}`} onClick={() => pickBackground(bg.id)} aria-label={bg.name} aria-pressed={bgId === bg.id}>
                      <img src={bg.thumb} alt="" />
                      <span>{bg.name}</span>
                    </button>
                  ))}
                </div>
                <p className="ps-note">기본(우드 &amp; 클로버)은 바로 적용돼요. 사진 배경은 이식된 화면(방 목록 등)에 나타납니다.</p>
              </div>

              <div className="ps-section">
                <div className="ps-section-title">우정편지 테마</div>
                <ThemeSelect value={pref.letterTheme} options={LETTER_THEMES} onChange={(v) => setPref((p) => ({ ...p, letterTheme: v }))} />
              </div>
              <div className="ps-section">
                <div className="ps-section-title">추억 카드 테마</div>
                <ThemeSelect value={pref.memoryCardTheme} options={MEMORY_THEMES} onChange={(v) => setPref((p) => ({ ...p, memoryCardTheme: v }))} />
              </div>
              <div className="ps-section">
                <div className="ps-section-title">마스코트 캐릭터</div>
                <ThemeSelect value={pref.mascotType} options={MASCOTS} onChange={(v) => setPref((p) => ({ ...p, mascotType: v }))} />
              </div>
            </>
          )}
        </section>
      </div>

      <div className="ps-actions">
        <div className="ps-actions-row">
          <div className="ps-action-group">
            <button type="button" className="ps-btn danger"
              disabled={deleteMutation.isPending}
              onClick={() => { if (window.confirm('정말 탈퇴하시겠어요? 되돌릴 수 없습니다.')) deleteMutation.mutate() }}>
              {deleteMutation.isPending ? '처리 중…' : '계정 탈퇴'}
            </button>
          </div>
          <div className="ps-action-group" style={{ alignItems: 'center' }}>
            {saveMutation.isSuccess && <span className="ps-ok">저장됨</span>}
            {saveMutation.isError && <span className="ps-err">{saveMutation.error?.message}</span>}
            <button type="button" className="ps-btn secondary" onClick={onClose}>취소</button>
            <button type="button" className="ps-btn primary" disabled={saveMutation.isPending || !nickname.trim()} onClick={() => saveMutation.mutate()}>
              {saveMutation.isPending ? '저장 중…' : '저장하기'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

function PasswordField({ label, id, value, show, placeholder, onToggle, onChange }) {
  return (
    <div className="ps-field">
      <label className="ps-label" htmlFor={id}>{label}</label>
      <div className="ps-pw-field">
        <input className="ps-input" id={id} type={show ? 'text' : 'password'} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
        <button type="button" className="ps-pw-toggle" onClick={onToggle} aria-label={show ? '숨기기' : '보기'}>
          <i className={`ti ${show ? 'ti-eye-off' : 'ti-eye'}`} aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}

function ThemeSelect({ value, options, onChange }) {
  return (
    <select className="ps-select" value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}

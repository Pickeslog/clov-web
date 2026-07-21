import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import './settings.proto.css'
import {
  getMe, updateProfile, changePassword, deleteAccount,
  getPreferences, updatePreferences, presignProfileImage,
} from '../../api/user'
import { uploadImage } from '../../lib/uploadImage'
import { APP_BACKGROUNDS, applyAppBackground, applyCustomColor, getAppBackgroundId, getCustomColor } from '../../lib/appBackground'
import { useAuthStore } from '../../stores/authStore'

const LETTER_THEMES = [
  { value: 'giftbox', label: '선물상자' },
  { value: 'postbox', label: '우체통' },
]
const MEMORY_THEMES = [
  { value: 'clothesline', label: '빨랫줄' },
  { value: 'stack', label: '겹침 카드' },
  { value: 'diary', label: '일기장' },
]
const MASCOTS = [
  { value: 'crobi', label: '크로비' },
  { value: 'rob', label: '로봇' },
]

// 사용자 설정 물감 카드 — 프로토타입 blob 모양(색상은 currentColor).
const BLOB_PATH = 'M20,45 C20,20 60,10 100,15 C150,20 170,5 220,10 C270,15 300,25 300,45 C300,70 260,80 220,78 C180,76 160,85 110,82 C60,79 20,70 20,45 Z'

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
  const colorRef = useRef(null)
  const [customColor, setCustomColor] = useState(getCustomColor)
  const [pref, setPref] = useState({
    darkMode: Boolean(prefs.darkMode),
    letterTheme: prefs.letterTheme ?? 'giftbox',
    memoryCardTheme: prefs.memoryCardTheme ?? 'clothesline',
    mascotType: prefs.mascotType ?? 'crobi',
  })

  // 프로필(개인정보 수정) 저장 — 닉네임·생일.
  const profileSave = useMutation({
    mutationFn: () => updateProfile({ nickname: nickname.trim(), birthdate: birthdate || null }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['me'] }),
  })
  // 환경설정(테마) — 프로토타입처럼 바꾸는 즉시 저장(테마 패널 푸터는 '닫기'만).
  const prefMutation = useMutation({
    mutationFn: updatePreferences,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['preferences'] }),
  })
  const setPrefAndSave = (patch) => {
    setPref((p) => { const next = { ...p, ...patch }; prefMutation.mutate(next); return next })
  }
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
  const pickColor = (color) => { setCustomColor(color); setBgId(applyCustomColor(color)) }
  const resetBackground = () => setBgId(applyAppBackground('default'))
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
                  <button type="button" className={`ps-mode-swatch light${!pref.darkMode ? ' on' : ''}`} onClick={() => setPrefAndSave({ darkMode: false })} aria-label="라이트 모드" aria-pressed={!pref.darkMode} />
                  <button type="button" className={`ps-mode-swatch dark${pref.darkMode ? ' on' : ''}`} onClick={() => setPrefAndSave({ darkMode: true })} aria-label="다크 모드" aria-pressed={pref.darkMode} />
                </div>
              </div>

              <div className="ps-section">
                <div className="ps-section-header">
                  <div className="ps-section-title">사용자 설정</div>
                  <button type="button" className="ps-reset" onClick={resetBackground}>↺ 기본값으로</button>
                </div>
                <div className="ps-paint-card">
                  <button type="button" className="ps-blob" onClick={() => colorRef.current?.click()} style={{ color: customColor }} aria-label="배경 색상 선택">
                    <svg viewBox="0 0 320 90" aria-hidden="true"><path d={BLOB_PATH} fill="currentColor" /></svg>
                  </button>
                  <input ref={colorRef} type="color" value={customColor} onChange={(e) => pickColor(e.target.value)}
                    style={{ position: 'absolute', width: 0, height: 0, opacity: 0, pointerEvents: 'none' }} tabIndex={-1} aria-hidden="true" />
                  <span className="ps-paint-hint">탭해서 나만의 색상을 칠해보세요 🎨</span>
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
                <div className="ps-section-title">대표 커버 장식</div>
                <div className="ps-opts"><button type="button" className="ps-opt-btn" disabled>준비중</button></div>
              </div>

              <OptionRow title="우정편지 테마" value={pref.letterTheme} options={LETTER_THEMES} onPick={(v) => setPrefAndSave({ letterTheme: v })} />
              <OptionRow title="참여자별 추억 증거 카드" value={pref.memoryCardTheme} options={MEMORY_THEMES} onPick={(v) => setPrefAndSave({ memoryCardTheme: v })} />
              <OptionRow title="마스코트 캐릭터" value={pref.mascotType} options={MASCOTS} onPick={(v) => setPrefAndSave({ mascotType: v })} />
            </>
          )}
        </section>
      </div>

      <div className="ps-actions">
        {pane === 'account' ? (
          <div className="ps-actions-row">
            <div className="ps-action-group">
              <button type="button" className="ps-btn danger"
                disabled={deleteMutation.isPending}
                onClick={() => { if (window.confirm('정말 탈퇴하시겠어요? 되돌릴 수 없습니다.')) deleteMutation.mutate() }}>
                {deleteMutation.isPending ? '처리 중…' : '계정 탈퇴'}
              </button>
            </div>
            <div className="ps-action-group" style={{ alignItems: 'center' }}>
              {profileSave.isSuccess && <span className="ps-ok">저장됨</span>}
              {profileSave.isError && <span className="ps-err">{profileSave.error?.message}</span>}
              <button type="button" className="ps-btn secondary" onClick={onClose}>취소</button>
              <button type="button" className="ps-btn primary" disabled={profileSave.isPending || !nickname.trim()} onClick={() => profileSave.mutate()}>
                {profileSave.isPending ? '저장 중…' : '저장하기'}
              </button>
            </div>
          </div>
        ) : (
          <div className="ps-actions-row" style={{ justifyContent: 'flex-end' }}>
            <button type="button" className="ps-btn primary" onClick={onClose}>닫기</button>
          </div>
        )}
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

function OptionRow({ title, value, options, onPick }) {
  return (
    <div className="ps-section">
      <div className="ps-section-title">{title}</div>
      <div className="ps-opts">
        {options.map((o) => (
          <button type="button" key={o.value} className={`ps-opt-btn${value === o.value ? ' on' : ''}`} onClick={() => onPick(o.value)}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import './settings.proto.css'
import {
  getMe, updateProfile, changePassword, deleteAccount,
  getPreferences, updatePreferences, presignProfileImage,
} from '../../api/user'
import { getInventory } from '../../api/shop'
import { uploadImage } from '../../lib/uploadImage'
import { APP_BACKGROUNDS, applyAppBackground, applyCustomColor, getAppBackgroundId, getCustomColor, isBackgroundUnlocked } from '../../lib/appBackground'
import { MASCOT_SIZES, applyMascotSize, getMascotSize } from '../../lib/mascotSize'
import { applyTheme, getDark } from '../../lib/theme'
import { useAuthStore } from '../../stores/authStore'
import { useConfirm } from '../ConfirmDialog/useConfirm'

const LETTER_THEMES = [
  { value: 'giftbox', label: '선물상자', img: '/settings-options/giftbox.png' },
  { value: 'postbox', label: '우체통', img: '/settings-options/postbox.png' },
]
const MEMORY_THEMES = [
  { value: 'clothesline', label: '빨랫줄', img: '/settings-options/clothesline.png' },
  { value: 'stack', label: '겹침 카드', img: '/settings-options/memory-stack.png' },
  { value: 'diary', label: '일기장', img: '/settings-options/diary.png' },
]
// "화면" 그룹 네비 항목(#319) — 예전엔 "테마 설정" 하나에 이 다섯이 전부 한 패널로
// 쌓여 있었다. 배경(색상+사진)만은 안 쪼갠다 — 둘 다 같은 값(bgId)을 공유하고
// "↺ 기본값으로" 리셋도 이 둘을 함께 초기화해서, 완전히 나누면 리셋 버튼 자리가
// 애매해진다.
const THEME_PANES = [
  { key: 'general', label: '일반' },
  { key: 'background', label: '배경' },
  { key: 'letterTheme', label: '우정편지 테마' },
  { key: 'memoryCardTheme', label: '추억카드 테마' },
]
// 사용자 설정 물감 카드 — 프로토타입 blob 모양(색상은 currentColor).
const BLOB_PATH = 'M20,45 C20,20 60,10 100,15 C150,20 170,5 220,10 C270,15 300,25 300,45 C300,70 260,80 220,78 C180,76 160,85 110,82 C60,79 20,70 20,45 Z'

// 사용자설정 모달 — 프로토타입 2-패널(계정/화면) 레이아웃.
/* =====================================================================
   내 프로필(닉네임·생일·사진)이 바뀌면 그 값을 **베껴 쓰는** 캐시를 전부 지운다.

   ⚠️ ['me'] 만 지우면 안 된다. 내 프로필은 세 곳에 복제돼 있다:
       ['me']                          사용자설정·헤더
       ['room', roomId, 'members']     방 멤버 목록 — nickname · profileImageUrl ·
                                       birthMonthDay(계약 §4-3)
       ['rooms']                       방 목록 카드의 memberAvatars(clov-api#141)

   실제로 터진 것: 사용자설정에서 생일을 지웠는데 일정계획의 생일 티켓이 그대로 남았다.
   티켓은 ['me'] 가 아니라 members 의 birthMonthDay 를 읽기 때문이다(#381).
   닉네임·사진도 같은 이유로 방 안에서는 낡은 값이 남아 있었다.

   ★ ['room'] 은 접두 매칭이라 그 방의 members·level·상세가 같이 지워진다. 넓어 보이지만
     전부 내 닉네임·사진이 섞여 있는 것들이고, 프로필 저장은 자주 일어나지 않는다.
   ===================================================================== */
function invalidateMyProfileEverywhere(queryClient) {
  queryClient.invalidateQueries({ queryKey: ['me'] })
  queryClient.invalidateQueries({ queryKey: ['room'] })
  queryClient.invalidateQueries({ queryKey: ['rooms'] })
}

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
  const confirm = useConfirm()
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
  const [mascotSize, setMascotSize] = useState(getMascotSize)
  const colorRef = useRef(null)
  const [customColor, setCustomColor] = useState(getCustomColor)
  const [pref, setPref] = useState({
    darkMode: getDark(),
    letterTheme: prefs.letterTheme ?? 'postbox',
    memoryCardTheme: prefs.memoryCardTheme ?? 'stack',
  })

  // 프로필(개인정보 수정) 저장 — 닉네임·생일.
  const profileSave = useMutation({
    mutationFn: () => updateProfile({ nickname: nickname.trim(), birthdate: birthdate || null }),
    onSuccess: () => invalidateMyProfileEverywhere(queryClient),
  })
  // 환경설정(테마) — 프로토타입처럼 바꾸는 즉시 저장(테마 패널 푸터는 '닫기'만).
  //
  // 화면을 먼저 바꾸고 저장하는 낙관적 갱신이라 실패하면 반드시 되돌려야 한다. 안 되돌리면
  // 화면은 바뀐 채로 남고 새로고침해야 이전 값이 드러나서, 사용자에겐 저장 실패가 아니라
  // "설정이 이유 없이 되돌아간다"로 보인다(#208).
  //
  // 되돌림 기준은 그 저장을 시작한 시점의 값 하나뿐이다. 실패하는 동안 다른 항목을 또 바꿨다면
  // 그 선택까지 같이 되돌아갈 수 있다. 대신 아래 푸터에 실패가 보이니 다시 고르면 된다.
  const prefMutation = useMutation({
    mutationFn: ({ next }) => updatePreferences(next),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['preferences'] }),
    onError: (_error, { previous }) => {
      setPref(previous)
      applyTheme(previous.darkMode) // body 클래스도 같이 되돌린다 — state만 되돌리면 테마가 남는다
    },
  })
  // mutate를 setState 업데이터 안에서 부르지 않는다. 업데이터는 순수해야 하고 StrictMode에서
  // 두 번 실행돼 개발 모드에서 저장 요청이 2번 나갔다.
  const setPrefAndSave = (patch) => {
    const previous = pref
    const next = { ...pref, ...patch }
    setPref(next)
    prefMutation.mutate({ next, previous })
  }
  // 라이트/다크 — 즉시 적용(body 클래스) + 저장.
  const setTheme = (dark) => { applyTheme(dark); setPrefAndSave({ darkMode: dark }) }
  const imageMutation = useMutation({
    mutationFn: async (file) => {
      const imageUrl = await uploadImage(presignProfileImage, file)
      return updateProfile({ profileImageUrl: imageUrl })
    },
    onSuccess: () => invalidateMyProfileEverywhere(queryClient),
  })
  const passwordMutation = useMutation({
    mutationFn: changePassword,
    onSuccess: () => { setCurrentPassword(''); setNewPassword(''); setConfirmPassword('') },
  })
  const deleteMutation = useMutation({
    mutationFn: deleteAccount,
    onSuccess: () => { clear(); navigate('/login', { replace: true }) },
  })

  // 유료 배경(itemCode 있음)은 보유해야 고를 수 있다. 기본 제공 배경은 itemCode 가 없다.
  // 판정은 isBackgroundUnlocked 한 곳에서만 한다 — 잠금 표시와 클릭 허용이 서로 다른
  // 조건을 쓰면 "자물쇠가 붙었는데 눌리는" 상태가 생기고 그건 에러 없이 조용하다.
  //
  // 대조 키는 code 다. imageUrl 로 대조하면 썸네일 경로를 바꾸는 순간(id 변경 등) 이미
  // 산 사람의 소유가 풀린다 — 겨울 배경 id 변경이 아직 열려 있어서 실제 위험이었다.
  //
  // ⚠️ 이건 보안 경계가 아니라 화면 안내다. 선택값은 localStorage 고 적용은 CSS 변수라
  //   콘솔로 얼마든지 바꿀 수 있다. 서버가 지켜야 할 건 '구매'뿐이고 그건 이미 지킨다.
  //   그래서 이미 적용 중인 배경을 여기서 되돌리지 않는다 — 유료화 전에 골라둔 사람의
  //   화면을 말없이 바꾸는 쪽이 더 나쁘다. 부팅 경로(initAppBackground)는 로그인보다
  //   먼저 돌아서 보유를 알 수도 없다.
  const inventory = useQuery({ queryKey: ['shop', 'inventory'], queryFn: getInventory })
  const ownedCodes = new Set((inventory.data?.items ?? []).map((it) => it.code).filter(Boolean))
  // 조회 전에는 잠긴 것으로 보이지 않게 한다 — 로딩 한 프레임 동안 보유 배경에 자물쇠가
  // 번쩍이는 걸 막는다. 어차피 판정은 화면 안내고, 못 고르게 하는 게 목적이 아니다.
  const isLocked = (bg) => inventory.isSuccess && !isBackgroundUnlocked(bg, ownedCodes)

  // 잠긴 배경을 누르면 상점으로 보낸다 — 안 파는 것처럼 숨기는 것보다 낫다.
  const goToShop = () => { onClose?.(); navigate('/shop') }

  const pickBackground = (id) => setBgId(applyAppBackground(id))
  const pickColor = (color) => { setCustomColor(color); setBgId(applyCustomColor(color)) }
  const resetBackground = () => setBgId(applyAppBackground('default'))
  // CSS 변수만 바꾸면 대시보드 마스코트가 즉시 반응한다(리렌더 불필요) — 배경 테마와 같은 방식.
  const pickMascotSize = (value) => setMascotSize(applyMascotSize(value))
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
              {THEME_PANES.map((p) => (
                <button type="button" key={p.key} className={`ps-nav-item${pane === p.key ? ' active' : ''}`} onClick={() => setPane(p.key)}>{p.label}</button>
              ))}
            </div>
          </div>
          <div className="ps-rail-footer"><i className="ti ti-clover-filled" aria-hidden="true" /> Clov.</div>
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
          ) : pane === 'general' ? (
            <>
              <div className="ps-section">
                <div className="ps-section-title">테마</div>
                <div className="ps-swatches">
                  <button type="button" className={`ps-mode-swatch light${!pref.darkMode ? ' on' : ''}`} onClick={() => setTheme(false)} aria-label="라이트 모드" aria-pressed={!pref.darkMode} />
                  <button type="button" className={`ps-mode-swatch dark${pref.darkMode ? ' on' : ''}`} onClick={() => setTheme(true)} aria-label="다크 모드" aria-pressed={pref.darkMode} />
                </div>
              </div>
              {/* 마스코트 캐릭터 선택은 헤더 프로필 드롭다운의 "마스코트 꾸미기"로 이동했다 —
                  거기서 preferences.mascotType을 직접 바꾼다. 여기선 더 이상 다루지 않는다.
                  크기는 서버가 아니라 기기-로컬이다(배경 테마와 같은 취급) — 모니터 크기에
                  딸린 취향이라 계정보다 기기에 묶는 쪽이 자연스럽다. lib/mascotSize.js 참고. */}
              <div className="ps-section">
                <OptionRow title="마스코트 크기" value={mascotSize} options={MASCOT_SIZES} onPick={pickMascotSize} />
              </div>
            </>
          ) : pane === 'background' ? (
            <>
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
                  {APP_BACKGROUNDS.map((bg) => {
                    const locked = isLocked(bg)
                    return (
                      <button type="button" key={bg.id}
                        className={`ps-bg-swatch${bgId === bg.id ? ' on' : ''}${locked ? ' locked' : ''}`}
                        onClick={() => (locked ? goToShop() : pickBackground(bg.id))}
                        aria-label={locked ? `${bg.name} — 상점에서 구매` : bg.name}
                        aria-pressed={bgId === bg.id}>
                        <img src={bg.thumb} alt="" />
                        <span>{bg.name}</span>
                        {locked && <em className="ps-bg-lock">상점</em>}
                      </button>
                    )
                  })}
                </div>
                <p className="ps-note">기본(우드 &amp; 클로버)은 바로 적용돼요. 사진 배경은 이식된 화면(방 목록 등)에 나타납니다. ‘상점’ 표시가 붙은 배경은 구매하면 여기서 고를 수 있어요.</p>
              </div>
            </>
          ) : pane === 'letterTheme' ? (
            <OptionRow title="우정편지 테마" value={pref.letterTheme} options={LETTER_THEMES} onPick={(v) => setPrefAndSave({ letterTheme: v })} />
          ) : (
            <OptionRow title="참여자별 추억 증거 카드" value={pref.memoryCardTheme} options={MEMORY_THEMES} onPick={(v) => setPrefAndSave({ memoryCardTheme: v })} />
          )}
        </section>
      </div>

      <div className="ps-actions">
        {pane === 'account' ? (
          <div className="ps-actions-row">
            <div className="ps-action-group" style={{ alignItems: 'center' }}>
              <button type="button" className="ps-btn danger"
                disabled={deleteMutation.isPending}
                onClick={async () => { if (await confirm('정말 탈퇴하시겠어요? 되돌릴 수 없습니다.', { confirmText: '탈퇴', variant: 'danger' })) deleteMutation.mutate() }}>
                {deleteMutation.isPending ? '처리 중…' : '계정 탈퇴'}
              </button>
              {/* 실패해도 버튼이 '처리 중…'에서 원래대로 돌아올 뿐이라 눌렸는지조차 알 수 없었다. */}
              {deleteMutation.isError && <span className="ps-err">{deleteMutation.error?.message}</span>}
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
            {/* 테마 패널은 즉시 저장이라 '저장하기'가 없다. 실패를 알릴 자리가 여기밖에 없다.
                푸터는 스크롤되는 ps-body 바깥이라 어느 항목을 바꿔도 항상 보인다. */}
            {prefMutation.isError && (
              <span className="ps-err">{prefMutation.error?.message ?? '설정을 저장하지 못했어요.'}</span>
            )}
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

// 옵션에 img가 있으면 바탕화면 스와치(ps-bg-swatch)와 같은 이미지 카드로,
// 없으면 기존 텍스트 알약 버튼으로 렌더링한다.
function OptionRow({ title, value, options, onPick }) {
  const hasImages = options.some((o) => o.img)
  return (
    <div className="ps-section">
      <div className="ps-section-title">{title}</div>
      <div className={hasImages ? 'ps-opt-img-grid' : 'ps-opts'}>
        {options.map((o) => (
          hasImages ? (
            <button type="button" key={o.value} className={`ps-opt-img-btn${value === o.value ? ' on' : ''}`} onClick={() => onPick(o.value)}>
              <img src={o.img} alt="" />
              <span>{o.label}</span>
            </button>
          ) : (
            <button type="button" key={o.value} className={`ps-opt-btn${value === o.value ? ' on' : ''}`} onClick={() => onPick(o.value)}>
              {o.label}
            </button>
          )
        ))}
      </div>
    </div>
  )
}

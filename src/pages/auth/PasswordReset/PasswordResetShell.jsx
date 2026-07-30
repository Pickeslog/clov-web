import { Link } from 'react-router-dom'
import '../Login/login.proto.css'
import './passwordReset.proto.css'
import logo from '../../../assets/clov_logo.png'

/**
 * 비밀번호 찾기·재설정 두 화면이 공유하는 셸.
 *
 * Login과 같은 2단 레이아웃(왼쪽 소개 패널 + 오른쪽 폼)을 그대로 쓴다. 로그인 화면에서
 * 넘어오는 흐름이라 시각적으로 이어져야 하고, #153에서 목업과 맞춘 치수를 그대로 물려받는
 * 이점도 있다. 왼쪽 패널의 문구만 화면마다 바꾼다.
 */
export default function PasswordResetShell({ badge, title, text, children }) {
  return (
    <main className="proto-login">
      <div className="login-shell">
        <section className="login-memory-panel" aria-label="Clov 소개">
          <div className="login-brand">
            <div className="login-brand-mark">
              <img src={logo} alt="Clov 로고" />
            </div>
            <span>Clov.</span>
          </div>
          <div className="login-panel-copy">
            <div className="login-panel-badge">{badge}</div>
            <h1 className="login-panel-title">{title}</h1>
            <p className="login-panel-text">{text}</p>
            <div className="login-memory-stack" aria-hidden="true">
              <div className="login-memory-note">
                <div className="login-note-date">나</div>
                <div className="login-note-text">비밀번호가 기억이 안 나…</div>
              </div>
              <div className="login-memory-note">
                <div className="login-note-date">정우</div>
                <div className="login-note-text">메일로 다시 만들면 돼!</div>
              </div>
            </div>
          </div>
        </section>

        <section className="login-form-panel">
          <div className="login-form-box">
            <Link to="/login" className="pwreset-back">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m15 18-6-6 6-6" />
              </svg>
              로그인으로 돌아가기
            </Link>
            {children}
          </div>
        </section>
      </div>
    </main>
  )
}

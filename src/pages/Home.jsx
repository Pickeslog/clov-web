import { useAuthStore } from '../stores/authStore'

// 보호 라우트 스켈레톤. 토큰이 있어야 접근된다.
export default function Home() {
  const clear = useAuthStore((state) => state.clear)

  return (
    <main style={{ padding: 24 }}>
      <h1>우정공간</h1>
      <p>보호 라우트 — 로그인해야 보이는 화면입니다. (셸 스켈레톤)</p>
      <button type="button" onClick={clear}>
        로그아웃
      </button>
    </main>
  )
}

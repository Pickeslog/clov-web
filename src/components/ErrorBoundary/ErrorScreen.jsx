import './ErrorScreen.css'

// 렌더 중 예외가 났을 때 앱이 백지가 되는 대신 보여주는 화면.
// 라우터 안(ErrorBoundary route)과 라우터 밖(ErrorBoundary 클래스) 양쪽에서 같이 쓴다.
// 그래서 useNavigate를 쓰지 않고 window.location으로만 이동한다 — 라우터 컨텍스트가
// 없는 자리에서도 동작해야 하고, 크래시 이후에는 상태를 확실히 버리는 편이 낫다.
export default function ErrorScreen({ error }) {
  const detail = error?.message || String(error ?? '')

  return (
    <div className="clov-err">
      <div className="clov-err-card" role="alert">
        <div className="clov-err-mark" aria-hidden="true"><i className="ti ti-clover-filled" aria-hidden="true" /></div>
        <h1 className="clov-err-title">화면을 그리지 못했어요</h1>
        <p className="clov-err-desc">
          잠시 문제가 생겼어요. 다시 시도하면 대부분 해결돼요.
          <br />
          계속 같은 화면이 나오면 알려주세요.
        </p>

        <div className="clov-err-actions">
          <button type="button" className="clov-err-btn is-primary" onClick={() => window.location.reload()}>
            다시 시도
          </button>
          <button type="button" className="clov-err-btn" onClick={() => window.location.assign('/')}>
            처음으로
          </button>
        </div>

        {/* 개발 중에만 원인을 노출한다 — 사용자에게는 스택이 의미가 없고,
            운영에서 내부 경로·변수명이 드러나는 것도 바람직하지 않다. */}
        {import.meta.env.DEV && detail && (
          <pre className="clov-err-detail">{detail}</pre>
        )}
      </div>
    </div>
  )
}

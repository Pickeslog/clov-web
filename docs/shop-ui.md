# 상점(Shop) 화면 UI 규칙

이슈 [#164](https://github.com/Pickeslog/clov-web/issues/164) 정리 결과. 상점 화면을 손볼 때 이 문서를 먼저 본다.

관련 파일
- `src/pages/shop/Shop/Shop.jsx` · `src/pages/shop/Shop/shop.proto.css`
- `src/components/Header/Header.jsx` · `src/components/Header/Header.css`
- `public/shop/*.svg` (아이템 아트 12종)

---

## 1. 무엇이 문제였나

### 1-1. 섹션 제목이 배경에 묻혀 사라졌다

전역 `src/index.css`에 아래 리셋이 있다.

```css
h1, h2 { font-family: var(--heading); color: var(--text-h); }
```

`--text-h`는 **OS의 `prefers-color-scheme`** 를 따라 뒤집힌다(라이트 `#08060d` / 다크 `#f3f4f6`).
반면 앱 테마는 `body.light-mode` 클래스로 정해진다. **둘은 서로 독립이다.**

그래서 "OS는 다크 + 앱 배경은 크림 종이" 조합에서 `h2`가 흰색(`#f3f4f6`)으로 찍혔고,
크림 배경(`#f4ead8`)과 대비가 사실상 1:1이 되어 "주간 할인 / 등급별 아이템" 제목이 안 보였다.

**규칙**: 화면 스코프 안에서 `h1`/`h2`를 쓸 거면 `font-family`와 `color`를 반드시 다시 지정한다.

```css
.proto-shop .shop-head h1,
.proto-shop .shop-section-head h2 { font-family: inherit; color: var(--text); }
```

로그인 화면도 같은 이유로 이미 무력화 주석을 달아두고 있다(`login.proto.css`).

### 1-2. 페이지 배경 위의 맨 텍스트

페이지 배경은 사용자가 고르는 **배경 테마**(우드&클로버 크림, 사진 등)라 색을 예측할 수 없다.
그런데 섹션 헤더가 카드 밖 맨 배경 위에 텍스트로 놓여 있었다.

**규칙**: 페이지 배경 위에 맨 텍스트를 올리지 않는다. 항상 카드/칩 표면(`--card-bg`, `--chip-bg`) 위에 얹는다.
방 목록(`roomlist.proto.css`)이 인사말까지 칩 안에 넣는 것도 같은 이유다.

### 1-3. 폰트가 이 화면만 달랐다

상점만 `-apple-system, ...` 시스템 폰트를 쓰고 있었다. Clov 브랜드 폰트는 **Outfit**(`index.html`에서 전역 로드).

### 1-4. 아이템 절반에 아트가 없었다

코스튬 6종만 이미지가 있었고, 스킨·이벤트 6종은 `image_url`이 `NULL`이라
`스 킨 아 트` 같은 자간 넓은 회색 텍스트 플레이스홀더로 떨어졌다. 미완성 와이어프레임처럼 보였다.

### 1-5. 방에서 상점에 들어가면 헤더가 "사라졌다"

상점은 `<Header variant="home" />` 고정이었다. 방 안에서 상점을 누르면
**네비 4탭(우정공간/추억피드/행운편지/일정계획) + 뒤로가기 + 알림이 통째로 없어졌고**,
방으로 돌아갈 길도 로고밖에 없었다. 헤더가 사라진 것처럼 느껴지는 원인이었다.

### 1-6. 모바일에서 헤더가 가로로 넘쳤다 (기존 버그)

375px에서 방 안 헤더가 **121px 넘쳐** 페이지 전체에 가로 스크롤이 생겼다.
상점 화면만의 문제가 아니라 방 대시보드에도 있던 기존 버그인데, 5-1을 고치면서 상점에도 노출돼 같이 고쳤다.

---

## 2. 어떻게 고쳤나

| 문제 | 조치 |
| --- | --- |
| 1-1 제목 실종 | `.proto-shop` 안에서 `h1`/`h2`의 `font-family`·`color` 재지정 |
| 1-2 맨 텍스트 | `.shop-section-head`·`.shop-empty`에 카드 표면 부여 |
| 1-3 폰트 | `font-family: 'Outfit', ...` 로 교체 |
| 1-4 아트 없음 | 스킨·이벤트 6종 SVG 추가 → 12종 전부 아트 보유 |
| 1-5 헤더 | 방에서 진입 시 방 네비 유지 |
| 1-6 모바일 넘침 | 탭 줄만 가로 스크롤, 상점·아바타는 항상 고정 |

### 헤더 컨텍스트 유지

`Header`의 상점 버튼이 현재 방을 라우터 state로 넘기고, `Shop`이 그걸 읽어 헤더 종류를 정한다.

```jsx
// Header.jsx — 방 안에서 눌렀으면 그 방을 실어 보낸다
navigate('/shop', { state: roomId ? { fromRoomId: roomId } : undefined })

// Shop.jsx
const fromRoomId = useLocation().state?.fromRoomId ?? null
{fromRoomId ? <Header variant="room" roomId={fromRoomId} /> : <Header variant="home" />}
```

방 밖(방 목록)에서 들어오면 기존처럼 `variant="home"`이다.
상점은 네비 4탭 중 하나가 아니므로 `activeTab`은 넘기지 않는다(활성 탭 없음이 맞다).

### 모바일 헤더

탭 줄(`.clov-hdr-nav`)만 `overflow-x: auto`로 흐르게 하고 스크롤바는 숨긴다.
**상점·아바타는 잘리면 안 되는 진입점**이라 항상 보이게 고정한다.

---

## 3. 아이콘 — 이모지 금지

이 화면은 이모지를 쓰지 않는다. 전부 `currentColor` 스트로크 SVG다.
이모지는 OS/브라우저마다 모양·크기·색이 달라 톤이 깨지고, 테마 색을 따르지 않는다.

`Shop.jsx` 상단의 공용 `Icon` 래퍼를 쓴다.

```jsx
const Icon = ({ size = 16, children, ...rest }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...rest}>
    {children}
  </svg>
)
```

정의된 아이콘: `BagIcon`(상점/구매) · `TagIcon`(할인) · `SparkIcon`(전체/등급) · `CheckIcon`(보유·성공)
· `BoxIcon`(보유함) · `AlertIcon`(오류) · `ShirtIcon`(코스튬) · `PaletteIcon`(스킨) · `GiftIcon`(이벤트)

**골드 코인만 예외**로 금색을 하드코딩한다(`CoinIcon`). 재화 식별이 테마에 따라 흔들리면 안 된다.
등급색도 같은 이유로 다크/라이트 공통 고정값이다.

---

## 4. 아이템 아트

### 경로 규칙

```
public/shop/{category}-{name}.svg
```

`costume-` / `skin-` / `event-` 접두사를 쓴다. `public/` 아래라 `/shop/...` 절대경로로 어디서든 로드된다.
DB `shop_items.image_url`이 이 경로를 가리킨다.

### 스펙

- `viewBox="0 0 320 240"` (4:3) — 카드 아트 영역이 `aspect-ratio: 4 / 3`
- 카드에서는 `object-fit: contain` — 잘리지 않고 전체가 보인다
- Clov 팔레트 기준: forest `#073b24` · leaf `#16874b` · mint `#50d990` · cream `#f7fbf6`
- 작게 줄여도 실루엣이 읽히게. 얇은 디테일·작은 글자 금지
- `role="img"` + `aria-label`로 무엇을 그린 것인지 남긴다

### 현재 12종

| 카테고리 | 파일 |
| --- | --- |
| 코스튬 | `costume-neon-hood` · `costume-starlight` · `costume-cherry-set` · `costume-clover-badge` · `costume-crobi-party` · `costume-rob-explorer` |
| 스킨 | `skin-golden-frame` · `skin-midnight` · `skin-ivory-basic` · `skin-forest` |
| 이벤트 | `event-summer-night` · `event-first-snow` |

전부 실제 아트로 교체될 때까지의 **플레이스홀더**다. 교체할 땐 같은 경로에 덮어쓰면 DB 수정이 필요 없다.

### 아이템을 새로 추가할 때

1. `public/shop/`에 위 스펙대로 SVG 추가
2. `shop_items`에 행 추가 + `image_url` 지정
   (백엔드 `db/manual-migrations/` 참고 — 이 프로젝트는 Flyway가 없어 수동 적용이다)
3. 아트를 아직 안 그렸으면 `image_url`을 `NULL`로 둔다.
   카테고리 아이콘 폴백이 뜬다(`CATEGORY_FALLBACK`) — 텍스트 플레이스홀더로 떨어지지 않는다

---

## 5. 카드 상태

| 상태 | 표시 |
| --- | --- |
| 판매 중 | `구매하기` (가방 아이콘) |
| 골드 부족 | `골드 부족` — 비활성, 눌리지 않음 |
| 보유 · 코스튬 | `장착하기` / `장착 해제` 토글 |
| 보유 · 스킨/이벤트 | `보유 중` 비활성 (오늘 범위에선 코스튬만 장착 가능) |
| 할인 중 | 좌상단 `-N%` 뱃지 + 원가 취소선 |
| 보유 중 | 우상단 `보유 중` / `장착 중` 뱃지 |

보유 아이템을 흐리게(`opacity`) 죽이지 않는다. 장착 대상이라 오히려 또렷해야 한다.
대신 테두리를 강조색으로 바꿔 구분한다.

---

## 6. 체크리스트

상점 화면을 고쳤으면 아래를 확인한다.

- [ ] **OS 다크 + 앱 라이트**, **OS 라이트 + 앱 다크** 두 엇갈린 조합에서 제목이 보이는가
      (`--text-h` 함정. OS 설정을 바꾸거나 devtools의 `prefers-color-scheme` 강제로 확인)
- [ ] 배경 테마를 사진으로 바꿔도 텍스트가 읽히는가
- [ ] 375px에서 가로 스크롤이 없는가 (`document.documentElement.scrollWidth === window.innerWidth`)
- [ ] 방 안에서 상점 진입 시 방 네비가 유지되는가
- [ ] 이모지를 새로 넣지 않았는가

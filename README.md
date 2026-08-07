# Clov. Web

> Clov 프로젝트의 프론트엔드 저장소입니다. 친구와의 약속·추억·행운편지·우정 레벨을 관리하는 React SPA입니다.

## 🛠 기술 스택

- **프레임워크**: React 19 + Vite
- **라우팅**: React Router v7
- **서버 상태**: TanStack Query v5
- **클라이언트 상태**: Zustand
- **스타일링**: Emotion(styled-components 방식)
- **HTTP 클라이언트**: axios

## 📁 프로젝트 구조

```
src/
├── api/            # axios 기반 API 클라이언트 (도메인별: auth, room, plan, memory, letter, notification, shop, user, invite)
├── pages/          # 라우트 페이지 (auth, rooms, feed, letters, schedule, shop, notifications)
├── components/     # 재사용 UI 컴포넌트
├── stores/         # Zustand 전역 상태
├── hooks/          # 커스텀 훅
├── routes/         # 라우트 가드
├── lib/            # 공용 유틸
├── styles/         # 전역 스타일
└── assets/         # 이미지·폰트·마스코트 리소스
```

## 🚀 로컬 실행 방법

```bash
# 1. 패키지 설치
npm install

# 2. 개발 서버 실행 (http://localhost:5173)
npm run dev

# 3. 빌드
npm run build
```

백엔드 API 주소는 `.env.development`에 기본값(`http://localhost:8080/api/v1`)이 이미 설정되어 있어, 로컬 백엔드를 기본 포트(8080)로 띄운다면 별도 설정 없이 바로 개발 서버를 실행할 수 있습니다. 다른 포트·호스트를 쓰려면 `.env.local`을 만들어 `VITE_API_BASE_URL`을 덮어쓰면 됩니다(시크릿 값은 넣지 않습니다).

## 💻 코드 컨벤션

- 세미콜론을 붙이지 않는다
- 문자열은 작은따옴표(`'`)를 사용한다
- 들여쓰기 2칸
- `var`는 사용하지 않는다 (`const`/`let`만 사용)
- 화살표 함수는 매개변수가 1개여도 괄호를 생략하지 않는다: `(payload) => ...`
- 컴포넌트는 PascalCase, 함수·변수는 camelCase로 작성한다
- API 호출은 `src/api/`를 거치며, 컴포넌트에서 직접 `fetch`를 호출하지 않는다
- 서버 데이터는 TanStack Query로, 클라이언트 전역 상태는 Zustand로 관리한다

## 📝 커밋 컨벤션

[Conventional Commits](https://www.conventionalcommits.org/)를 따릅니다.

```
1. 커밋 유형 지정 (영어 소문자)
   - feat     : 새로운 기능 추가
   - fix      : 버그 수정
   - docs     : 문서 수정
   - style    : 코드 포맷팅, 세미콜론 등 코드 변경이 없는 경우
   - refactor : 코드 리팩토링
   - test     : 테스트 코드 추가/수정
   - chore    : 빌드/설정 등 기타 변경

2. 이슈 번호와 함께 작성
   feat: implement login page (#6)

3. 제목은 영문 기준 50자 이내, 명령형으로 작성
```

## 🔀 브랜치 전략

[GitHub Flow](https://docs.github.com/ko/get-started/using-github/github-flow)를 따릅니다.

```
feat/<issue번호>-<주제>    예) feat/12-room-invite
fix/<issue번호>-<주제>     예) fix/45-login-token-refresh
chore/<주제>              예) chore/gitignore
```

- 1이슈 = 1브랜치 = 1PR 원칙, `main` 직접 작업 금지
- PR은 코드 리뷰와 CI(빌드·통합테스트) 통과 후 머지

## 📡 API 문서

전체 API 계약(요청/응답 스키마, 에러 코드)은 이 저장소가 아니라 `web-design-repository`가 단일 기준(SSOT)입니다.

- [API-CONTRACT.md](https://github.com/Pickeslog/web-design-repository/blob/main/docs/API-CONTRACT.md)

## 🔗 관련 저장소

| 저장소 | 내용 |
|---|---|
| [clov-api](https://github.com/Pickeslog/clov-api) | 백엔드 — Spring Boot REST API |
| [web-design-repository](https://github.com/Pickeslog/web-design-repository) | 화면 명세 · API 계약(SSOT) · DB 설계 |

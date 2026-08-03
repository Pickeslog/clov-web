# Mascot sprite template

새 마스코트는 이 폴더의 계약을 복사해 `assets/mascot/<character-id>/`에 구현한다.
캐릭터 ID와 폴더명은 기존 API 저장값을 우선하며, 새 이름은 kebab-case를 사용한다.

## Required sprites

| 파일 | 상태 | 표현 |
|---|---|---|
| `default.png` | default | 캐릭터의 기본 정면 포즈 |
| `dizzy.png` | dizzy | 0.9초 안에 3번 클릭했을 때 어지러운 반응 |
| `sleepy.png` | sleepy | 일정 시간 입력이 없을 때 졸거나 잠든 반응 |
| `find.png` | find | 돋보기로 추억을 찾는 클릭 특수 반응 |
| `pencil.png` | pencil | 연필로 추억을 기록하는 클릭 특수 반응 |
| `smile.png` | smile | 반갑게 웃거나 손을 흔드는 클릭 특수 반응 |
| `pulled.png` | lifted | 머리 위쪽을 잡아 끌기 시작한 반응 |
| `scared.png` | scared | 기준 높이 이상 끌어올렸을 때 무서워하는 반응 |
| `angry.png` | angry | 오래 끌어올렸을 때 화난 반응 |

Rob의 기존 파일명 `idle.png`와 `sleep.png`는 레거시 예외다. 새 캐릭터는 반드시
`default.png`와 `sleepy.png`를 사용한다.

## Image contract

- PNG, RGBA, 투명 배경
- 캐릭터 한 명만 포함하고 전신이 잘리지 않아야 한다.
- 기본 이미지의 외형, 색상, 비율, 선 굵기, 의상과 고유 장식을 유지한다.
- 상태에 필요한 표정, 포즈, 작은 소품만 변경한다.
- 그림자, 바닥면, 배경 장면, 워터마크와 문장을 넣지 않는다.
- 모든 상태에서 캐릭터가 비슷한 화면 점유율과 여백을 갖도록 한다.
- 최종 확인 시 알파 범위가 `0..255`이고 모서리가 완전히 투명해야 한다.

### 화면 점유율은 눈으로 맞추지 말 것

생성 결과물은 캔버스와 프레이밍이 상태마다 다르게 나온다. 마스코트는 `height`만 고정하고
`width: auto`로 그리므로(`Mascot.css`), 비율이 다르면 **렌더 박스 가로폭이 같이 달라져
상태가 바뀔 때마다 캐릭터가 좌우로 움직인다.** 크로비가 103~135px 사이를 널뛰었다.

`scripts/mascot/`의 도구로 맞춘다.

```powershell
cd scripts\mascot
.\normalize-sprites.ps1 -Character <캐릭터>              # 드라이런
.\contact-sheet.ps1 -Dir $env:TEMP\mascot-normalize\<캐릭터> -Out check.png
.\normalize-sprites.ps1 -Character <캐릭터> -Apply       # 덮어쓰기
```

대조 시트 마지막 칸에 9장이 겹쳐 그려진다 — 윤곽이 하나로 모이면 맞은 것이다.
**덮어쓰기 전에 고해상도 원본을 `web-design-repository/test-web-design/02-main/assets/<캐릭터>/`
에 보존할 것.** 자세한 내용과 주의점은 `scripts/mascot/README.md`.

## Image generation prompt

```text
Use case: style-transfer
Asset type: website mascot state sprite
Primary request: Create the <STATE> sprite for the exact same <CHARACTER> mascot.
Input image: the default sprite is the identity, proportion, palette, and style reference.
Subject: preserve <IDENTITY LOCKS>. Change only the expression, pose, and the prop needed for <STATE>.
Style/medium: preserve the source illustration style, outline weight, shading, and palette.
Composition/framing: centered single character, full body, square-friendly composition, even padding.
Scene/backdrop: perfectly flat solid chroma-key color that does not occur in the character.
Constraints: no extra character, no background scene, no floor, no shadow, no text, no watermark.
```

단색 배경으로 생성한 뒤 `remove_chroma_key.py`로 알파 PNG를 만들고, 초록색 잔상과
잘린 외곽선이 없는지 눈으로 확인한다.

## Integration checklist

1. `manifest.example.json`을 참고해 9개 파일을 모두 채운다.
2. `components/Mascot/Mascot.jsx`의 캐릭터별 상태 스프라이트 맵에 폴더를 등록한다.
3. 기본 선택 이미지가 필요한 `MascotWardrobe.jsx`에는 `default.png`만 연결한다.
4. `npm run lint`와 `npm run build`를 실행한다.
5. 기본 클릭, 3연타, 특수 클릭, 드래그, 자동 복귀를 화면에서 확인한다.

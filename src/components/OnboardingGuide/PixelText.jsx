/* =====================================================================
   5×7 비트맵 글자와 8×8 클로버를 SVG <rect> 로 직접 그린다. 폰트 0KB.

   ★ 한글 픽셀 폰트는 답이 없다. 유명한 16비트 폰트(Press Start 2P, Silkscreen)는
     전부 영문 전용이고, 이 앱은 지금도 폰트만 4.3MB를 싣는다. 그래서 레퍼런스로
     삼은 스파이디 트래커와 같은 방식을 쓴다 — **픽셀은 테두리·버튼·캐릭터가 만들고
     한글 본문은 일반 폰트**다. 여기서 그리는 건 "START"·"CLOV GUIDE" 같은 영문 라벨과
     클로버 마크뿐이다.

   ⚠️ GLYPHS 에 없는 글자를 넣으면 그 글자는 조용히 빠진다. 라벨을 새로 만들 때는
     대문자 영문·공백·마침표만 쓰거나 글리프를 여기에 추가한다.
   ===================================================================== */

const GLYPHS = {
  A: '01110,10001,10001,11111,10001,10001,10001',
  C: '01110,10001,10000,10000,10000,10001,01110',
  D: '11110,10001,10001,10001,10001,10001,11110',
  E: '11111,10000,10000,11110,10000,10000,11111',
  G: '01110,10001,10000,10011,10001,10001,01111',
  I: '111,010,010,010,010,010,111',
  L: '10000,10000,10000,10000,10000,10000,11111',
  O: '01110,10001,10001,10001,10001,10001,01110',
  R: '11110,10001,10001,11110,10100,10010,10001',
  S: '01110,10001,10000,01110,00001,10001,01110',
  T: '11111,00100,00100,00100,00100,00100,00100',
  U: '10001,10001,10001,10001,10001,10001,01110',
  V: '10001,10001,10001,10001,10001,01010,00100',
  ' ': '00,00,00,00,00,00,00',
  '.': '00,00,00,00,00,00,11',
}

const CLOVER = ['00110011', '01111111', '01111111', '11111111', '11111111', '01111111', '01111111', '00011000']

const rects = (rows, fill, offsetX = 0) => rows.flatMap((row, y) => (
  [...row].map((bit, x) => (bit === '1'
    ? <rect key={`${offsetX + x}-${y}`} x={offsetX + x} y={y} width="1" height="1" fill={fill} />
    : null))
))

/** 영문 라벨. scale 은 "픽셀 하나를 화면 몇 px 로 그릴지". */
export function PixelText({ text, scale = 3, fill = 'currentColor', className, title }) {
  const chars = [...text].map((ch) => GLYPHS[ch]).filter(Boolean).map((g) => g.split(','))
  const gap = 1
  let width = chars.reduce((w, g) => w + g[0].length + gap, 0) - gap
  if (width < 0) width = 0

  let cx = 0
  const shapes = chars.flatMap((glyph) => {
    const out = rects(glyph, fill, cx)
    cx += glyph[0].length + gap
    return out
  })

  return (
    <svg
      className={className}
      viewBox={`0 0 ${width} 7`}
      width={width * scale}
      height={7 * scale}
      shapeRendering="crispEdges"
      role={title ? 'img' : 'presentation'}
      aria-label={title}
      aria-hidden={title ? undefined : 'true'}
    >
      {shapes}
    </svg>
  )
}

/** 클로버 마크. 모서리 장식과 배경 워터마크에 쓴다. */
export function PixelClover({ scale = 3, fill = 'currentColor', className }) {
  return (
    <svg
      className={className}
      viewBox={`0 0 ${CLOVER[0].length} ${CLOVER.length}`}
      width={CLOVER[0].length * scale}
      height={CLOVER.length * scale}
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      {rects(CLOVER, fill)}
    </svg>
  )
}

/* =====================================================================
   마스코트 일러스트 → 픽셀 아트 (실행 시 자동 변환).

   손으로 찍은 픽셀 아트가 더 예쁘다. 그런데 마스코트가 7종이고 스킨은 계속 는다
   (2026-08-05 하루에만 하나 늘었다). 손으로 가면 새 스킨마다 다시 찍어야 하고,
   무엇보다 **사용자가 고른 마스코트를 못 보여준다** — 가이드에 남의 캐릭터가 뜬다.
   그래서 자동 변환이다.

   ★★ 줄이는 "순서"가 결과를 가른다 (제일 중요)

     니어리스트로 줄임  →  원본의 잡티 픽셀을 그대로 집어옴 → 12색으로 뭉개지며 얼룩
     평균으로 줄임      →  면이 먼저 정리됨 → 색을 줄이면 딱 떨어짐

   그래서 **줄일 때는 평균**(imageSmoothingEnabled = true), **보여줄 때만**
   image-rendering: pixelated 다. 롭·타코군은 면이 평평해 티가 안 났고 크로비에서
   바로 드러났다.

   ★ 해상도는 화면 배율과 같이 본다. 1픽셀이 화면에서 2px 아래로 내려가면 픽셀 아트로
     안 읽힌다 — 220px로 띄울 때 32px는 1픽셀 6.9px, 64px는 3.4px, 128px는 1.7px 다.
   ===================================================================== */

export const PIXEL_RES = 64      // 세로 픽셀 수
export const PIXEL_COLORS = 12   // 팔레트 색 수

/** median cut — 픽셀 무리를 색 범위가 가장 넓은 축으로 반씩 쪼개 K색 팔레트를 만든다. */
function medianCut(pixels, k) {
  let boxes = [pixels]
  while (boxes.length < k) {
    boxes.sort((a, b) => spread(b) - spread(a))
    const big = boxes.shift()
    if (!big || big.length < 2) { if (big) boxes.push(big); break }
    const ch = widestChannel(big)
    big.sort((p, q) => p[ch] - q[ch])
    const mid = big.length >> 1
    boxes.push(big.slice(0, mid), big.slice(mid))
  }
  return boxes.filter((b) => b.length).map((b) => {
    const sum = [0, 0, 0]
    b.forEach((p) => { sum[0] += p[0]; sum[1] += p[1]; sum[2] += p[2] })
    return sum.map((v) => Math.round(v / b.length))
  })
}

function channelRanges(box) {
  const min = [255, 255, 255]
  const max = [0, 0, 0]
  box.forEach((p) => {
    for (let i = 0; i < 3; i++) {
      if (p[i] < min[i]) min[i] = p[i]
      if (p[i] > max[i]) max[i] = p[i]
    }
  })
  return [max[0] - min[0], max[1] - min[1], max[2] - min[2]]
}

const spread = (box) => Math.max(...channelRanges(box))
const widestChannel = (box) => { const r = channelRanges(box); return r.indexOf(Math.max(...r)) }

function nearest(palette, p) {
  let best = palette[0]
  let bestD = Infinity
  for (const c of palette) {
    const d = (c[0] - p[0]) ** 2 + (c[1] - p[1]) ** 2 + (c[2] - p[2]) ** 2
    if (d < bestD) { bestD = d; best = c }
  }
  return best
}

/**
 * 로드가 끝난 <img> 를 픽셀 아트 data URL 로 바꾼다.
 * 실패하면 null — 호출부는 원본 이미지를 그대로 쓴다.
 *
 * ⚠️ 캔버스가 오염되면(교차 출처 이미지에 CORS 헤더가 없으면) toDataURL 이 throw 한다.
 *    스킨은 R2에서 오므로 실제로 걸릴 수 있는 경로다 — 그때는 원본으로 떨어뜨린다.
 */
export function pixelize(img, height = PIXEL_RES, colors = PIXEL_COLORS) {
  try {
    const w = Math.max(1, Math.round((img.naturalWidth * height) / img.naturalHeight))
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = height
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return null

    // ★ 여기서 스무딩을 켜는 것이 이 파일의 핵심이다(위 주석 참고).
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(img, 0, 0, w, height)

    const image = ctx.getImageData(0, 0, w, height)
    const d = image.data
    const opaque = []
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] > 128) opaque.push([d[i], d[i + 1], d[i + 2]])
    }
    if (!opaque.length) return null

    const palette = medianCut(opaque, colors)
    for (let i = 0; i < d.length; i += 4) {
      // 알파는 2단계로만 남긴다 — 반투명 경계가 남으면 픽셀 경계가 흐려진다.
      if (d[i + 3] <= 128) { d[i + 3] = 0; continue }
      const n = nearest(palette, [d[i], d[i + 1], d[i + 2]])
      d[i] = n[0]; d[i + 1] = n[1]; d[i + 2] = n[2]; d[i + 3] = 255
    }
    ctx.putImageData(image, 0, 0)
    return canvas.toDataURL()
  } catch {
    return null
  }
}

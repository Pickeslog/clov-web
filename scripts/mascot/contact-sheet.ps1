<#
.SYNOPSIS
  스프라이트 폴더를 앱과 같은 규칙으로 늘어놓은 대조 시트 PNG를 만든다.

.DESCRIPTION
  Mascot.css와 같은 조건으로 그린다 — 높이 180px 고정 / 가로 자동 / max-width 180px /
  우측 정렬(마스코트가 화면 우측 하단에 right:18px로 고정돼 있다).
  그래서 칸마다 파란 테두리(렌더 박스) 폭이 다르면 그게 곧 화면에서의 흔들림이다.

  마지막 칸은 전부 겹쳐 그린 것이다. 윤곽이 하나로 모이면 정렬이 맞은 것이고,
  퍼져 있으면 상태가 바뀔 때 그만큼 움직인다.

  브라우저로 확인하지 않는 이유 — Browser pane이 표시되지 않으면 이미지 디코드가 안 되고
  스크린샷도 실패한다. PNG로 뽑으면 그 제약을 안 탄다.

.EXAMPLE
  .\contact-sheet.ps1 -Dir ..\..\src\assets\mascot\crobi -Out crobi.png
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)][string]$Dir,
  [Parameter(Mandatory = $true)][string]$Out,
  [int]$RenderHeight = 180   # --clov-mascot-size 기본값
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$files = @(Get-ChildItem $Dir -Filter *.png | Sort-Object Name)
if ($files.Count -eq 0) { throw "PNG가 없다: $Dir" }

$H = $RenderHeight
$widths = @()
foreach ($f in $files) {
  $b = New-Object System.Drawing.Bitmap $f.FullName
  # height 고정 / width auto / max-width 180 — Mascot.css 그대로
  $widths += [math]::Min([int][math]::Round($H * $b.Width / $b.Height), $H)
  $b.Dispose()
}
$W = [int](($widths | Measure-Object -Maximum).Maximum)

$pad = 14
$labelH = 20
$sheetW = [int](($files.Count + 1) * ($W + $pad) + $pad)
$sheetH = [int]($H + $pad * 2 + $labelH)

$bmp = New-Object System.Drawing.Bitmap $sheetW, $sheetH
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.Clear([System.Drawing.Color]::FromArgb(255, 244, 236, 219))
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

$font = New-Object System.Drawing.Font 'Consolas', 10
$ink = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 40, 38, 34))
$box = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(70, 60, 110, 170)), 1

for ($i = 0; $i -lt $files.Count; $i++) {
  $f = $files[$i]
  $cw = $widths[$i]
  $slot = $pad + $i * ($W + $pad)
  $x = $slot + ($W - $cw)          # 우측 정렬
  $img = New-Object System.Drawing.Bitmap $f.FullName
  $g.DrawImage($img, $x, $pad, $cw, $H)
  $img.Dispose()
  $g.DrawRectangle($box, $x, $pad, $cw, $H)
  $g.DrawString(("{0} {1}px" -f $f.BaseName, $cw), $font, $ink, [float]$slot, [float]($pad + $H + 2))
}

# 겹쳐 그리기 — 정렬이 맞았는지 보는 칸
$slot = [int]($pad + $files.Count * ($W + $pad))
$ia = New-Object System.Drawing.Imaging.ImageAttributes
$cm = New-Object System.Drawing.Imaging.ColorMatrix
$cm.Matrix33 = 0.30
$ia.SetColorMatrix($cm)
for ($i = 0; $i -lt $files.Count; $i++) {
  $cw = $widths[$i]
  $img = New-Object System.Drawing.Bitmap $files[$i].FullName
  $rect = New-Object System.Drawing.Rectangle ($slot + ($W - $cw)), $pad, $cw, $H
  $g.DrawImage($img, $rect, 0, 0, $img.Width, $img.Height, [System.Drawing.GraphicsUnit]::Pixel, $ia)
  $img.Dispose()
}
$g.DrawString('OVERLAY', $font, $ink, [float]$slot, [float]($pad + $H + 2))

$g.Dispose()
$bmp.Save($Out, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()

Write-Output ("{0}  ({1}x{2})" -f $Out, $sheetW, $sheetH)
Write-Output ("렌더 박스 폭: {0}" -f (($widths | Sort-Object -Unique) -join ', '))
if (($widths | Sort-Object -Unique).Count -gt 1) {
  Write-Warning "박스 폭이 여러 개다 — 상태가 바뀔 때 캐릭터가 좌우로 움직인다. normalize-sprites.ps1을 돌릴 것."
}

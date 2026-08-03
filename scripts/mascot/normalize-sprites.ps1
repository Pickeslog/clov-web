<#
.SYNOPSIS
  한 캐릭터의 상태 스프라이트를 공통 캔버스로 정규화한다.

.DESCRIPTION
  `_template/README.md`의 "모든 상태에서 캐릭터가 비슷한 화면 점유율과 여백을 갖도록 한다"를
  실제로 강제하는 도구다.

  마스코트는 `height` 고정 + `object-fit: contain`으로 그려지므로(Mascot.css), 원본 비율이
  상태마다 다르면 렌더 박스 가로폭이 같이 달라져 상태가 바뀔 때마다 캐릭터가 좌우로 움직인다.
  실제로 크로비가 103~135px 사이를 널뛰었다.

  세 가지를 맞춘다.
    배율  알파 면적의 제곱근. 면적은 크기의 제곱에 비례하고 포즈에는 잘 안 흔들린다.
          bbox 높이로 맞추면 웅크린 pencil이 부풀고, 줄에 매달린 pulled이 쪼그라든다.
    세로  알파 박스 하단(발바닥)을 공통 baseline에.
    가로  무게중심을 캔버스 중앙에. bbox 중앙으로 하면 한쪽으로 튀어나온 소품이 몸통을 밀어낸다.

  기준은 항상 `default.png`다 — 지금 사용자가 보고 있는 그림이라 이걸 움직이지 않는 게 맞다.
  이미 정규화된 폴더에 다시 돌려도 결과가 같다(모든 배율이 1이 된다).

.PARAMETER Character
  캐릭터 폴더명. 예: crobi, tako-gun

.PARAMETER Apply
  주면 원본을 덮어쓴다. 없으면 임시 폴더에 쓰고 표만 보여준다(기본값).

.EXAMPLE
  # 먼저 표만 본다
  .\normalize-sprites.ps1 -Character tako-gun

.EXAMPLE
  # 캔버스를 직접 정하고 덮어쓴다
  .\normalize-sprites.ps1 -Character crobi -CanvasW 440 -CanvasH 680 -BottomPad 14 -Apply

.NOTES
  Windows 전용(System.Drawing). 새 npm 패키지를 안 쓰려고 이렇게 했다 — AGENTS.md.
  ★ 덮어쓰기 전에 고해상도 원본을 web-design-repository에 보존할 것.
     test-web-design/02-main/assets/<캐릭터>/ 가 원본 자리다.
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)][string]$Character,
  [string]$AssetsRoot = (Join-Path $PSScriptRoot '..\..\src\assets\mascot'),
  [int]$CanvasW = 0,        # 0 = default.png의 캔버스를 그대로 쓴다
  [int]$CanvasH = 0,
  [int]$BottomPad = -1,     # -1 = default.png의 실제 하단 여백을 그대로 쓴다
  [switch]$Apply
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
Add-Type -Path (Join-Path $PSScriptRoot 'SpriteTool.cs') -ReferencedAssemblies System.Drawing

$srcDir = Join-Path $AssetsRoot $Character
if (-not (Test-Path $srcDir)) { throw "캐릭터 폴더가 없다: $srcDir" }

$files = @(Get-ChildItem $srcDir -Filter *.png | Sort-Object Name)
if ($files.Count -eq 0) { throw "PNG가 없다: $srcDir" }

# rob은 idle.png/sleep.png를 쓰는 레거시 예외다(_template/README.md).
$refName = if ($files.Name -contains 'default.png') { 'default.png' }
           elseif ($files.Name -contains 'idle.png') { 'idle.png' }
           else { throw "기준 스프라이트(default.png 또는 idle.png)가 없다: $srcDir" }

$info = @{}
foreach ($f in $files) {
  $m = [SpriteTool]::Measure($f.FullName)
  if ($m[6] -eq 0) { throw "불투명 픽셀이 하나도 없다: $($f.Name)" }
  $info[$f.Name] = [pscustomobject]@{
    path  = $f.FullName
    canvW = $m[0]; canvH = $m[1]
    minY  = $m[3]; maxY = $m[5]
    charW = $m[4] - $m[2] + 1
    charH = $m[5] - $m[3] + 1
    area  = $m[6]
    cx    = [SpriteTool]::CentroidX($f.FullName)
  }
}

$ref = $info[$refName]
if ($CanvasW -le 0) { $CanvasW = $ref.canvW }
if ($CanvasH -le 0) { $CanvasH = $ref.canvH }
if ($BottomPad -lt 0) { $BottomPad = $ref.canvH - 1 - $ref.maxY }
$baselineY = $CanvasH - $BottomPad

# ★ 이미 캔버스가 단일 규격인 폴더에는 웬만하면 돌리지 말 것.
#
# 이 도구의 주 효과는 "렌더 박스 가로폭을 고정해서 좌우 흔들림을 없애는 것"인데, 캔버스가
# 이미 하나면 그건 달성돼 있다. 남는 건 캔버스 안쪽 발바닥 정렬뿐이고, 그건 포즈에 따라
# 원래 다를 수 있다(매달린 pulled, 웅크린 scared).
#
# 그런데 면적 기준은 "잉크 양 차이"(별·모션선·돋보기처럼 포즈마다 붙는 것)를 "크기 차이"로
# 오독한다. 손으로 한 세트로 그려졌거나 이미 정렬된 폴더에 돌리면 되레 어긋난다.
#   rob         900x510 단일 · 이미 정렬 → 돌리면 배율이 0.95~1.02로 흩어진다
#   kim-cheolsu 640x640 단일 · 이미 정렬 → 배율 0.99~1.09, 용량은 2.3MB → 2.9MB로 증가
#
# 판정은 캔버스 단일 여부로만 한다. 하단 여백 편차는 참고값으로 같이 찍는다 —
# 편차가 커도 포즈 때문일 수 있어서 그것만으로는 정규화가 필요하다고 말할 수 없다.
$canvases = @($info.Values | ForEach-Object { "$($_.canvW)x$($_.canvH)" } | Sort-Object -Unique)
$bottomPads = @($info.Values | ForEach-Object { $_.canvH - 1 - $_.maxY } | Sort-Object)
if ($canvases.Count -eq 1) {
  Write-Warning ("이 폴더는 캔버스가 이미 단일 규격이다 ({0}). 렌더 박스는 이미 고정이라" -f $canvases[0])
  Write-Warning "  정규화의 주 효과는 이미 달성돼 있다. 웬만하면 돌리지 말 것."
  Write-Warning ("  하단 여백 {0}~{1}px (참고값. 편차가 커도 포즈 때문일 수 있다)" -f $bottomPads[0], $bottomPads[-1])
  Write-Warning "  ★ 아래 표의 scale 열이 판단 기준이다 — 1에서 멀면 포즈별 소품을 크기로"
  Write-Warning "     오독한 것이니 돌리지 말 것. contact-sheet.ps1의 OVERLAY 칸도 같이 볼 것."
}

$outDir = if ($Apply) { $srcDir } else { Join-Path ([System.IO.Path]::GetTempPath()) "mascot-normalize\$Character" }
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$rows = @()
$overflow = @()
foreach ($f in $files) {
  $i = $info[$f.Name]
  $scale = [math]::Sqrt($ref.area / $i.area)
  $outW = $i.charW * $scale
  $outH = $i.charH * $scale

  # 캔버스를 넘는 그림은 잘린다. 의도된 경우(pulled 위쪽 줄)도 있으므로 막지 않고 알린다.
  if ($outH -gt ($baselineY)) { $overflow += ("{0}: 위로 {1}px" -f $f.Name, [math]::Round($outH - $baselineY, 0)) }
  if ($outW -gt $CanvasW) { $overflow += ("{0}: 좌우로 {1}px" -f $f.Name, [math]::Round($outW - $CanvasW, 0)) }

  $tmp = Join-Path $outDir $f.Name
  # -Apply일 때 입력과 출력이 같은 파일이라 바로 못 쓴다. 임시로 만들고 마지막에 옮긴다.
  $stage = if ($Apply) { "$tmp.tmp" } else { $tmp }
  [SpriteTool]::Compose($i.path, $stage, $CanvasW, $CanvasH, $scale, $i.cx, ($i.maxY + 1), 0.5, $baselineY)
  if ($Apply) { Move-Item -Force $stage $tmp }

  $rows += [pscustomobject]@{
    file      = $f.Name
    scale     = [math]::Round($scale, 3)
    charOut   = ("{0}x{1}" -f [math]::Round($outW, 0), [math]::Round($outH, 0))
    kbBefore  = [math]::Round((Get-Item $i.path).Length / 1KB, 0)
    kbAfter   = [math]::Round((Get-Item $tmp).Length / 1KB, 0)
  }
}

$rows | Format-Table -AutoSize
$sumBefore = ($rows | Measure-Object kbBefore -Sum).Sum
$sumAfter = ($rows | Measure-Object kbAfter -Sum).Sum
Write-Output ("캔버스 {0}x{1} · 하단 여백 {2} · 기준 {3}" -f $CanvasW, $CanvasH, $BottomPad, $refName)
Write-Output ("용량 {0} KB -> {1} KB" -f $sumBefore, $sumAfter)
# Mascot.css: height 180 / width auto / max-width 180 / object-fit contain.
# 가로가 180을 넘으면 max-width에 걸려 잘리고, contain이 세로를 대신 줄인다.
$natW = 180.0 * $CanvasW / $CanvasH
if ($natW -gt 180) {
  Write-Output ("180px 렌더 시 {0}x{1}px 고정 (max-width에 걸려 세로가 줄어든다)" -f 180, [math]::Round(180.0 * $CanvasH / $CanvasW, 0))
} else {
  Write-Output ("180px 렌더 시 {0}x180px 고정" -f [math]::Round($natW, 0))
}

if ($overflow.Count -gt 0) {
  Write-Warning "캔버스를 넘어 잘린 그림이 있다. 의도한 게 아니면 -CanvasH/-CanvasW를 키울 것:"
  $overflow | ForEach-Object { Write-Warning "  $_" }
}
if (-not $Apply) {
  Write-Output ''
  Write-Output "드라이런이다. 결과물: $outDir"
  Write-Output "contact-sheet.ps1로 확인한 뒤 -Apply를 붙여 다시 실행할 것."
}

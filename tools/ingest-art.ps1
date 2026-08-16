# Ingest a chosen variant per key, from variant-picks.json, into the repo art folder.
# Resizes to 1600x900 at ~70% JPEG. Reports anything it could not find.
param(
  [string]$Src   = "C:\Users\mailp\Box\CODEX IMAGES",
  [string]$Repo  = "C:\Users\mailp\dev\pf1e-codex",
  [string]$Picks = "C:\Users\mailp\AppData\Local\Temp\claude\C--Users-mailp-OneDrive-Desktop\9fab0ec5-a77d-4834-a44c-2e7473f65a1d\scratchpad\variant-picks.json"
)

Add-Type -AssemblyName System.Drawing
$codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq "image/jpeg" }
$eps = New-Object System.Drawing.Imaging.EncoderParameters(1)
$eps.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, 70)

$artDir = Join-Path $Repo "art"
$rows = Get-Content $Picks -Raw | ConvertFrom-Json
$ok = 0; $miss = @(); $unplanned = @()

# Only ingest keys the app actually plans to use. Without this guard a stray source file
# lands in art/ as dead weight that no code path can ever reach - which is exactly how the
# retired cat-deities image slipped in.
$appjs = Get-Content (Join-Path $Repo "app.js") -Raw
$s = $appjs.IndexOf('("cat-archetypes')
$e = $appjs.IndexOf('").split(",")', $s)
$planned = @{}
foreach ($m in [regex]::Matches($appjs.Substring($s, $e - $s), '[a-z][a-z0-9]*(?:-[a-z0-9]+)+')) { $planned[$m.Value] = $true }
Write-Host "app plans $($planned.Count) art keys"

foreach ($r in $rows) {
  $key = $r.key; $ver = $r.pick
  if (-not $planned.ContainsKey($key)) { $unplanned += $key; continue }
  $in = $null
  foreach ($cand in @("$key-$ver.png", "$key-$ver.jpg", "$key.png", "$key.jpg")) {
    $p = Join-Path $Src $cand
    if (Test-Path $p) { $in = $p; break }
  }
  if (-not $in) { $miss += $key; continue }

  $img = [System.Drawing.Image]::FromFile($in)
  $bmp = New-Object System.Drawing.Bitmap(1600, 900)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.DrawImage($img, 0, 0, 1600, 900)
  $bmp.Save((Join-Path $artDir "$key.jpg"), $codec, $eps)
  $g.Dispose(); $bmp.Dispose(); $img.Dispose()
  $ok++
}

Write-Host "ingested $ok"
if ($miss.Count) { Write-Host "MISSING source for: $($miss -join ', ')" -ForegroundColor Yellow }
if ($unplanned.Count) { Write-Host "SKIPPED, not in the app's plan: $($unplanned -join ', ')" -ForegroundColor Yellow }
$onDisk = (Get-ChildItem $artDir -Filter *.jpg).Count
$total = (Get-ChildItem $artDir -Filter *.jpg | Measure-Object Length -Sum).Sum / 1MB
Write-Host ("art/ now holds {0} files, {1:N1} MB" -f $onDisk, $total)

# Regenerate the presence manifest so data/art.js always matches art/ on disk.
node (Join-Path $Repo "tools\gen-art-manifest.mjs") $Repo

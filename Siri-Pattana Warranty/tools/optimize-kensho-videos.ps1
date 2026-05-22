param(
  [string]$InputDir = "public\media\kensho",
  [int]$MaxWidth = 1280,
  [int]$Crf = 28
)

$ErrorActionPreference = "Stop"

if (-not (Get-Command ffmpeg -ErrorAction SilentlyContinue)) {
  throw "ffmpeg is not installed. Install ffmpeg, then rerun this script."
}

$videos = @(
  @{ In = "lx15-opening.mp4"; Out = "lx15-opening-optimized.mp4" },
  @{ In = "lx20-opening.mp4"; Out = "lx20-opening-optimized.mp4" },
  @{ In = "lx30-opening.mp4"; Out = "lx30-opening-optimized.mp4" },
  @{ In = "lx40-opening.mp4"; Out = "lx40-opening-optimized.mp4" }
)

foreach ($video in $videos) {
  $inputPath = Join-Path $InputDir $video.In
  $outputPath = Join-Path $InputDir $video.Out

  if (-not (Test-Path $inputPath)) {
    Write-Warning "Missing $inputPath"
    continue
  }

  ffmpeg -y `
    -i $inputPath `
    -an `
    -vf "scale='min($MaxWidth,iw)':-2,fps=24" `
    -c:v libx264 `
    -profile:v high `
    -level 4.0 `
    -pix_fmt yuv420p `
    -preset slow `
    -crf $Crf `
    -movflags +faststart `
    $outputPath
}

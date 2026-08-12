param(
  [string]$OutputDirectory = (Join-Path $PSScriptRoot "..\icons")
)

Add-Type -AssemblyName System.Drawing

function New-RoundedRectanglePath {
  param(
    [float]$X,
    [float]$Y,
    [float]$Width,
    [float]$Height,
    [float]$Radius
  )

  $diameter = $Radius * 2
  $path = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $path.AddArc($X, $Y, $diameter, $diameter, 180, 90)
  $path.AddArc($X + $Width - $diameter, $Y, $diameter, $diameter, 270, 90)
  $path.AddArc($X + $Width - $diameter, $Y + $Height - $diameter, $diameter, $diameter, 0, 90)
  $path.AddArc($X, $Y + $Height - $diameter, $diameter, $diameter, 90, 90)
  $path.CloseFigure()
  return $path
}

function New-FreeFeedMarkPaths {
  $loop = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $loop.StartFigure()
  $loop.AddLine(271, 136, 308, 136)
  $loop.AddBezier(308, 136, 311, 136, 313, 134, 313, 131)
  $loop.AddBezier(313, 131, 313, 122, 311, 113, 308, 104)
  $loop.AddBezier(308, 104, 287, 52, 234, 18, 169, 18)
  $loop.AddBezier(169, 18, 83, 18, 14, 86, 14, 169)
  $loop.AddBezier(14, 169, 14, 236, 56, 294, 117, 315)
  $loop.AddLine(117, 315, 117, 272)
  $loop.AddBezier(117, 272, 81, 253, 56, 214, 56, 170)
  $loop.AddBezier(56, 170, 56, 111, 105, 63, 166, 63)
  $loop.AddBezier(166, 63, 212, 63, 253, 92, 271, 136)
  $loop.CloseFigure()

  $bar = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $bar.StartFigure()
  $bar.AddLine(168, 175, 291.5, 175)
  $bar.AddBezier(291.5, 175, 304, 175, 314, 185, 314, 197.5)
  $bar.AddBezier(314, 197.5, 314, 210, 304, 220, 291.5, 220)
  $bar.AddLine(291.5, 220, 200, 220)
  $bar.AddLine(200, 220, 200, 297.5)
  $bar.AddBezier(200, 297.5, 200, 310, 190, 320, 178, 320)
  $bar.AddBezier(178, 320, 166, 320, 156, 310, 156, 297.5)
  $bar.AddLine(156, 297.5, 156, 187)
  $bar.AddBezier(156, 187, 156, 180.4, 161.4, 175, 168, 175)
  $bar.CloseFigure()

  return [pscustomobject]@{ Loop = $loop; Bar = $bar }
}

$masterSize = 1024
$scale = $masterSize / 128
$assetRoot = [System.IO.Path]::GetFullPath($OutputDirectory)
[System.IO.Directory]::CreateDirectory($assetRoot) | Out-Null

$bitmap = [System.Drawing.Bitmap]::new($masterSize, $masterSize, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$graphics.Clear([System.Drawing.Color]::Transparent)

$shadowPath = New-RoundedRectanglePath (6 * $scale) (8 * $scale) (116 * $scale) (116 * $scale) (27 * $scale)
$shadowBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(25, 16, 18, 24))
$graphics.FillPath($shadowBrush, $shadowPath)

$platePath = New-RoundedRectanglePath (6 * $scale) (5 * $scale) (116 * $scale) (116 * $scale) (27 * $scale)
$plateBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::White)
$graphics.FillPath($plateBrush, $platePath)
$platePen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(255, 232, 229, 227), 1 * $scale)
$graphics.DrawPath($platePen, $platePath)

$gradientRectangle = [System.Drawing.RectangleF]::new(20 * $scale, 20 * $scale, 88 * $scale, 90 * $scale)
$gradientBrush = [System.Drawing.Drawing2D.LinearGradientBrush]::new(
  $gradientRectangle,
  [System.Drawing.ColorTranslator]::FromHtml("#9b00f5"),
  [System.Drawing.ColorTranslator]::FromHtml("#fd9507"),
  130
)
$blend = [System.Drawing.Drawing2D.ColorBlend]::new(5)
$blend.Colors = @(
  [System.Drawing.ColorTranslator]::FromHtml("#9b00f5"),
  [System.Drawing.ColorTranslator]::FromHtml("#c004d1"),
  [System.Drawing.ColorTranslator]::FromHtml("#f32e80"),
  [System.Drawing.ColorTranslator]::FromHtml("#fc5f45"),
  [System.Drawing.ColorTranslator]::FromHtml("#fd9507")
)
$blend.Positions = @(0.0, 0.2, 0.42, 0.65, 1.0)
$gradientBrush.InterpolationColors = $blend

$markPaths = New-FreeFeedMarkPaths
$markScale = 0.285 * $scale
$markOffset = 17 * $scale
$markTransform = [System.Drawing.Drawing2D.Matrix]::new($markScale, 0, 0, $markScale, $markOffset, $markOffset)
$markPaths.Loop.Transform($markTransform)
$markPaths.Bar.Transform($markTransform)
$graphics.FillPath($gradientBrush, $markPaths.Loop)
$graphics.FillPath($gradientBrush, $markPaths.Bar)

foreach ($size in @(16, 32, 48, 128)) {
  $icon = [System.Drawing.Bitmap]::new($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $iconGraphics = [System.Drawing.Graphics]::FromImage($icon)
  $iconGraphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
  $iconGraphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $iconGraphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $iconGraphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $iconGraphics.DrawImage($bitmap, 0, 0, $size, $size)
  $outputPath = Join-Path $assetRoot "freefeed-$size.png"
  $icon.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $iconGraphics.Dispose()
  $icon.Dispose()
}

$markPaths.Loop.Dispose()
$markPaths.Bar.Dispose()
$markTransform.Dispose()
$gradientBrush.Dispose()
$platePen.Dispose()
$plateBrush.Dispose()
$platePath.Dispose()
$shadowBrush.Dispose()
$shadowPath.Dispose()
$graphics.Dispose()
$bitmap.Dispose()

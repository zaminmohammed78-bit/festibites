Add-Type -AssemblyName System.Drawing

function Generate-Icon([int]$size, [string]$filename) {
    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic

    # Background gradient
    $rect = New-Object System.Drawing.Rectangle(0, 0, $size, $size)
    $c1 = [System.Drawing.ColorTranslator]::FromHtml('#ff9a4d')
    $c2 = [System.Drawing.ColorTranslator]::FromHtml('#e85d04')
    $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush($rect, $c1, $c2, 45)
    $g.FillRectangle($brush, $rect)

    $scale = $size / 64.0

    # White leaf/bowl graphic
    $path1 = New-Object System.Drawing.Drawing2D.GraphicsPath
    $p1 = New-Object System.Drawing.PointF((19 * $scale), (36 * $scale))
    $p2 = New-Object System.Drawing.PointF((27 * $scale), (37 * $scale))
    $p3 = New-Object System.Drawing.PointF((34 * $scale), (34 * $scale))
    $p4 = New-Object System.Drawing.PointF((41 * $scale), (26 * $scale))
    $p5 = New-Object System.Drawing.PointF((43 * $scale), (24 * $scale))
    $p6 = New-Object System.Drawing.PointF((47 * $scale), (23 * $scale))
    $p7 = New-Object System.Drawing.PointF((46 * $scale), (31 * $scale))
    $p8 = New-Object System.Drawing.PointF((42 * $scale), (37 * $scale))
    $p9 = New-Object System.Drawing.PointF((35 * $scale), (41 * $scale))
    $p10 = New-Object System.Drawing.PointF((29 * $scale), (44 * $scale))
    $p11 = New-Object System.Drawing.PointF((23 * $scale), (42 * $scale))

    $points = [System.Drawing.PointF[]]@($p1, $p2, $p3, $p4, $p5, $p6, $p7, $p8, $p9, $p10, $p11)
    $path1.AddCurve($points)

    $whiteBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
    $g.FillPath($whiteBrush, $path1)

    # Curved stroke
    $pen = New-Object System.Drawing.Pen([System.Drawing.Color]::White, (3.5 * $scale))
    $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round

    $sp1 = New-Object System.Drawing.PointF((31 * $scale), (39 * $scale))
    $sp2 = New-Object System.Drawing.PointF((33 * $scale), (30 * $scale))
    $sp3 = New-Object System.Drawing.PointF((36 * $scale), (24 * $scale))
    $sp4 = New-Object System.Drawing.PointF((42 * $scale), (19 * $scale))
    $spoints = [System.Drawing.PointF[]]@($sp1, $sp2, $sp3, $sp4)
    $g.DrawCurve($pen, $spoints)

    # Dot
    $dotR = 3.5 * $scale
    $dotX = (44 * $scale) - $dotR
    $dotY = (18 * $scale) - $dotR
    $g.FillEllipse($whiteBrush, $dotX, $dotY, ($dotR * 2), ($dotR * 2))

    $filePath = Join-Path 'C:\Users\97155\Desktop\web.html\' $filename
    $bmp.Save($filePath, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
    Write-Host "Generated $filename successfully"
}

Generate-Icon 180 'apple-touch-icon.png'
Generate-Icon 192 'icon-192.png'
Generate-Icon 512 'icon-512.png'

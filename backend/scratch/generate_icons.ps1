Add-Type -AssemblyName System.Drawing

$sourcePath = "e:\Ororuta\app icon.png"
$src = [System.Drawing.Image]::FromFile($sourcePath)

$resDir = "e:\Ororuta\android\app\src\main\res"

$legacySizes = @{
    "mipmap-mdpi" = 48
    "mipmap-hdpi" = 72
    "mipmap-xhdpi" = 96
    "mipmap-xxhdpi" = 144
    "mipmap-xxxhdpi" = 192
}

$adaptiveSizes = @{
    "mipmap-mdpi" = 108
    "mipmap-hdpi" = 162
    "mipmap-xhdpi" = 216
    "mipmap-xxhdpi" = 324
    "mipmap-xxxhdpi" = 432
}

$bgColor = [System.Drawing.Color]::FromArgb(2, 48, 105) # #023069 Brand Blue from app icon.png

foreach ($folder in $legacySizes.Keys) {
    $targetDir = Join-Path $resDir $folder
    if (-not (Test-Path $targetDir)) {
        New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
    }
    $targetSize = $legacySizes[$folder]
    
    # 1. Square / standard launcher icon
    $destSquare = New-Object System.Drawing.Bitmap($targetSize, $targetSize)
    $g = [System.Drawing.Graphics]::FromImage($destSquare)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $g.Clear($bgColor)
    $g.DrawImage($src, 0, 0, $targetSize, $targetSize)
    $g.Dispose()
    
    $squarePath = Join-Path $targetDir "ic_launcher.png"
    $destSquare.Save($squarePath, [System.Drawing.Imaging.ImageFormat]::Png)
    $destSquare.Dispose()
    Write-Host "Generated $squarePath ($targetSize x $targetSize)"

    # 2. Round launcher icon
    $destRound = New-Object System.Drawing.Bitmap($targetSize, $targetSize)
    $gRound = [System.Drawing.Graphics]::FromImage($destRound)
    $gRound.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $gRound.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $gRound.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $gRound.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $gRound.Clear([System.Drawing.Color]::Transparent)
    
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $path.AddEllipse(0, 0, $targetSize, $targetSize)
    $gRound.SetClip($path)
    $gRound.Clear($bgColor)
    $gRound.DrawImage($src, 0, 0, $targetSize, $targetSize)
    $path.Dispose()
    $gRound.Dispose()

    $roundPath = Join-Path $targetDir "ic_launcher_round.png"
    $destRound.Save($roundPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $destRound.Dispose()
    Write-Host "Generated $roundPath ($targetSize x $targetSize)"

    # 3. Adaptive icon foreground (108dp canvas, centered in safe area)
    $adaptSize = $adaptiveSizes[$folder]
    $destForeground = New-Object System.Drawing.Bitmap($adaptSize, $adaptSize)
    $gFore = [System.Drawing.Graphics]::FromImage($destForeground)
    $gFore.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $gFore.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $gFore.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $gFore.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $gFore.Clear([System.Drawing.Color]::Transparent)
    
    # Safe zone: 74/108 of the canvas size
    $innerSize = [math]::Round($adaptSize * (74.0 / 108.0))
    $offset = [math]::Round(($adaptSize - $innerSize) / 2.0)
    $gFore.DrawImage($src, $offset, $offset, $innerSize, $innerSize)
    $gFore.Dispose()

    $forePath = Join-Path $targetDir "ic_launcher_foreground.png"
    $destForeground.Save($forePath, [System.Drawing.Imaging.ImageFormat]::Png)
    $destForeground.Dispose()
    Write-Host "Generated $forePath ($adaptSize x $adaptSize)"
}

$src.Dispose()
Write-Host "All Android icons generated successfully from app icon.png!"

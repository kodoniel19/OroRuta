Add-Type -AssemblyName System.Drawing

$jpgPath = "C:\Users\kodon\.gemini\antigravity-ide\brain\27090117-f2ce-4fa1-8c38-4043aa440118\.user_uploaded\media_1793044062193.jpg"
$pngPath = "e:\Ororuta\app icon.png"

$jpg = [System.Drawing.Image]::FromFile($jpgPath)
Write-Host "Uploaded JPG: $($jpg.Width) x $($jpg.Height)"

$png = [System.Drawing.Image]::FromFile($pngPath)
Write-Host "Repo app icon.png: $($png.Width) x $($png.Height)"

# Check center and bottom of jpg
$jpgBmp = New-Object System.Drawing.Bitmap($jpg)
Write-Host "JPG Top-left (0,0): $($jpgBmp.GetPixel(0,0))"
Write-Host "JPG Center (512,512): $($jpgBmp.GetPixel(512,512))"
Write-Host "JPG Bottom-mid (512, 1000): $($jpgBmp.GetPixel(512, 1000))"
Write-Host "JPG Pin point (512, 790): $($jpgBmp.GetPixel(512, 790))"

# Check center and bottom of png
$pngBmp = New-Object System.Drawing.Bitmap($png)
Write-Host "PNG Top-left (0,0): $($pngBmp.GetPixel(0,0))"
Write-Host "PNG Center (627,627): $($pngBmp.GetPixel(627,627))"
Write-Host "PNG (627, 1000): $($pngBmp.GetPixel(627, 1000))"

$jpgBmp.Dispose()
$pngBmp.Dispose()
$jpg.Dispose()
$png.Dispose()

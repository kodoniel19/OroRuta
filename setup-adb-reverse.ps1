# Automatically sets adb reverse tcp:3000 tcp:3000 for ALL connected Android devices and emulators
$adb = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"

if (-not (Test-Path $adb)) {
    $adb = "adb"
}

Write-Host "Checking connected Android devices..." -ForegroundColor Cyan
$devices = & $adb devices | Select-String -Pattern "\b(device)\b" | ForEach-Object {
    ($_ -split "\s+")[0]
}

if (-not $devices) {
    Write-Host "Warning: No authorized Android devices or emulators found." -ForegroundColor Yellow
    Write-Host "Please start your emulator or connect your phone with USB debugging enabled." -ForegroundColor Yellow
} else {
    foreach ($dev in $devices) {
        Write-Host "Configuring port reverse on [$dev]..." -ForegroundColor Green
        & $adb -s $dev reverse tcp:3000 tcp:3000
    }
    Write-Host "`nAll devices configured! Mobile app can now access http://localhost:3000 without issues.`n" -ForegroundColor Green
}


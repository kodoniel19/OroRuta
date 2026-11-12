# OroRuta All-in-One Startup Script
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "     Starting OroRuta Development       " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Function to clean up stale processes on ports
function Free-Port($port) {
    $conns = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($conns) {
        $pids = $conns | Select-Object -ExpandProperty OwningProcess -Unique
        foreach ($pidToKill in $pids) {
            if ($pidToKill -gt 4) {
                Write-Host "Freeing occupied port $port (PID: $pidToKill)..." -ForegroundColor Yellow
                Stop-Process -Id $pidToKill -Force -ErrorAction SilentlyContinue
            }
        }
    }
}

# Free ports 3000 and 5173 if already held by stale processes
Free-Port 3000
Free-Port 5173

# 0. Ensure MySQL Server is running on port 3306
$mysqlConn = Get-NetTCPConnection -LocalPort 3306 -State Listen -ErrorAction SilentlyContinue
if (-not $mysqlConn) {
    Write-Host "MySQL is not running. Starting MySQL server..." -ForegroundColor Yellow
    $mysqldPath = "C:\Program Files\MySQL\MySQL Server 8.4\bin\mysqld.exe"
    $dataPath = "$PSScriptRoot\mysql_data"
    if (Test-Path $mysqldPath) {
        Invoke-WmiMethod -Class Win32_Process -Name Create -ArgumentList "`"$mysqldPath`" --datadir=`"$dataPath`"" | Out-Null
        $attempts = 0
        while ($attempts -lt 10) {
            Start-Sleep -Seconds 1
            $mysqlConn = Get-NetTCPConnection -LocalPort 3306 -State Listen -ErrorAction SilentlyContinue
            if ($mysqlConn) { break }
            $attempts++
        }
    }
}
if ($mysqlConn) {
    Write-Host "[OK] MySQL Database is ready on port 3306." -ForegroundColor Green
} else {
    Write-Host "Warning: Could not automatically start MySQL. Make sure MySQL is running on port 3306." -ForegroundColor Red
}

# 1. Setup ADB Reverse for mobile app
& "$PSScriptRoot\setup-adb-reverse.ps1"

# 2. Start Backend API
Write-Host "Starting Backend API (Port 3000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-ExecutionPolicy", "Bypass", "-NoExit", "-Command", "cd '$PSScriptRoot\backend'; Write-Host '--- OroRuta Backend API (Port 3000) ---' -ForegroundColor Cyan; npm.cmd run dev"

# 3. Start Admin Web
Write-Host "Starting Admin Web Portal (Port 5173)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-ExecutionPolicy", "Bypass", "-NoExit", "-Command", "cd '$PSScriptRoot\admin-web'; Write-Host '--- OroRuta Admin Web (Port 5173) ---' -ForegroundColor Cyan; npm.cmd run dev"

Write-Host ""
Write-Host "[OK] Backend and Admin Web are now running in separate windows!" -ForegroundColor Green
Write-Host "[OK] Admin Web URL: http://localhost:5173" -ForegroundColor Green
Write-Host "[OK] Backend API:   http://localhost:3000/api/v1" -ForegroundColor Green
Write-Host ""
Write-Host "You can now press Run (Play button) in Android Studio to start the app!" -ForegroundColor Cyan
Write-Host ""

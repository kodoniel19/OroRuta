# OroRuta Laptop Migration & Transfer Guide

This guide provides step-by-step instructions to transfer the complete **OroRuta** application (Android app, Node.js backend, Admin Web portal, and verified MySQL database) from this laptop to your second laptop without losing code, route data, road geometry, or configurations.

---

## What is Preserved in This Transfer

1. **Source Code**:
   - Android App (Jetpack Compose, Kotlin, Room, Hilt, Google Maps Compose)
   - Backend API (Node.js, Express, MySQL2, Zod, Jest)
   - Admin Web Portal (React 18, Vite, TypeScript, TailwindCSS, Leaflet)
2. **Complete LPTRP Transit Dataset**:
   - `database/ororuta_backup.sql`: Full SQL dump containing all 68 routes, 136 verified road-snapped geometries, 89 stops, 23 places, 23 landmarks, 12 major roads, fare rules, announcements, and admin users.
   - `database/raw_routes.txt`: Raw CDO LPTRP Districts 1 & 2 route texts.
   - `backend/scratch/`: Complete data ingestion, geocoding, and polyline generation scripts.
3. **Security**:
   - Private API keys, local paths, and environment secrets are excluded from Git tracking via `.gitignore`.
   - Reusable templates (`.env.example`, `local.properties.example`) are provided for clean configuration on the new laptop.

---

## Option A: Transfer via GitHub (Recommended)

### Step 1: Review Changes on Current Laptop
Run:
```bash
git status
```
Verify that `.env` and `local.properties` are **not** listed in tracked changes.

### Step 2: Commit and Push
```bash
git add .
git commit -m "Prepare OroRuta for transfer: portable database dump, credential protection, and laptop migration setup"
git push origin main
```
> **Note**: If Git prompts for authentication, use your GitHub Personal Access Token (PAT) with `repo` scope or sign in via GitHub CLI (`gh auth login`).

---

### Step 3: Setup on Your Second Laptop

#### 1. Install Prerequisites on Second Laptop
- **Git**: [https://git-scm.com/](https://git-scm.com/)
- **Node.js 18 or 20 LTS**: [https://nodejs.org/](https://nodejs.org/)
- **MySQL 8.0 Server** (or **Docker Desktop**):
  - If using MySQL directly, ensure the root or dedicated user credentials match your preference (default: `ororuta` / `ororuta` or `root`).
- **Android Studio** (Ladybug, Koala, or Hedgehog):
  - Install **Android SDK Platform 34** and **Android SDK Build-Tools**.
  - Ensure Java JDK 17 or higher is selected.

#### 2. Clone the Repository
Open PowerShell or Terminal on the second laptop:
```bash
git clone https://github.com/kodoniel19/OroRuta.git
cd OroRuta
```

#### 3. Setup Configuration Files
```bash
# Backend config
cp backend/.env.example backend/.env

# Admin Web config
cp admin-web/.env.example admin-web/.env

# Android config
cp android/local.properties.example android/local.properties
```

#### 4. Configure `backend/.env`
Open `backend/.env` in your editor and ensure DB credentials match your local MySQL:
```env
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_USER=ororuta
DB_PASS=ororuta
DB_NAME=ororuta
ADMIN_API_KEY=change-me-in-production
```

#### 5. Configure `android/local.properties`
Open `android/local.properties`:
```properties
sdk.dir=C:\\Users\\YOUR_USERNAME\\AppData\\Local\\Android\\Sdk
MAPS_API_KEY=AIzaSyA4ng7IyKcf47FumHW2xvkT4btXcEX5PgQ
```
*(Replace `YOUR_USERNAME` with your Windows username, or adjust for macOS/Linux)*

#### 6. Restore the Database (Single Command)
```bash
cd backend
npm install
npm run db:restore
```
You should see:
```
========================================================
 RESTORATION COMPLETE AND VERIFIED
========================================================
 - Traditional & Modern Routes: 68 (Expected: 68)
 - Verified Route Geometries:   136 (Expected: 136)
 - Boarding/Drop-off Stops:     89
 - Places and Landmarks:        23
 - Fare Rules Configured:       1
========================================================
```

#### 7. Start the Backend API
```bash
cd backend
npm run dev
```
Verify at: `http://localhost:3000/api/v1/health`

#### 8. Start Admin Web Portal
In a new terminal window:
```bash
cd admin-web
npm install
npm run dev
```
Open: `http://localhost:5173`
Login: `admin` / `OroRuta@2026`

#### 9. Run the Android Application
1. Launch **Android Studio**.
2. Click **Open** and select `OroRuta/android`.
3. Wait for Gradle Sync to complete.
4. Run the app:
   - **On Android Emulator**: Runs out of the box (`BASE_URL` uses `http://localhost:3000/api/v1/` or `http://10.0.2.2:3000/api/v1/`).
   - **On Physical Device via USB**:
     Connect phone with USB Debugging enabled, then run:
     ```bash
     adb reverse tcp:3000 tcp:3000
     ```
     This bridges your laptop's backend server to `localhost:3000` on the physical phone!

---

## Option B: Transfer via ZIP Archive (Flash Drive / Cloud)

If you wish to transfer the project using a USB flash drive or Google Drive without downloading dependencies again:

### 1. Create a Clean ZIP on Current Laptop
Run this PowerShell command in `E:\Ororuta`:
```powershell
# Create a portable zip excluding node_modules, build caches, and private env files
$exclude = @("node_modules", ".gradle", "build", ".idea", "dist", ".kotlin", "local.properties", ".env")

Get-ChildItem -Path . -Exclude $exclude | Where-Object {
    $item = $_
    $skip = $false
    foreach ($ex in $exclude) {
        if ($item.FullName -match "\\$ex(\\.*)?$") { $skip = $true; break }
    }
    -not $skip
} | Compress-Archive -DestinationPath "..\OroRuta_Portable.zip" -Force
```
*(Or manually zip the folder, making sure to skip `node_modules` and `.gradle`)*

### 2. Extract on Second Laptop and Follow Steps 3.3 to 3.9 above.

---

## Verification Checklist on Second Laptop

Once launched on the second laptop, verify:
- [ ] **Route Search**: Search `Liceo` to `Limketkai` — returns viable jeepney options.
- [ ] **Route List**: View Routes screen — all 68 LPTRP routes are displayed with accurate badges.
- [ ] **Map View**: Open Map screen — genuine road-snapped geometries display without crossing rivers or jumping bridges.
- [ ] **GPS Location**: Tap "Use My Location" — locates user and snaps to nearest jeepney route.
- [ ] **Fare Calculation**: Fare shows base ₱13.00 with appropriate per-km increments and student discount toggle.
- [ ] **Admin Portal**: Log in at `http://localhost:5173` — view routes, edit announcements, and review user reports.

---

## Common Troubleshooting

| Issue | Cause | Fix |
|-------|-------|-----|
| `ECONNREFUSED 127.0.0.1:3306` | MySQL server not running | Start MySQL service via Windows Services (`net start MySQL80`), Laragon, XAMPP, or Docker (`docker compose up -d db`). |
| `Access denied for user 'ororuta'` | MySQL password or user mismatch | Create user in MySQL (`CREATE USER 'ororuta'@'localhost' IDENTIFIED BY 'ororuta'; GRANT ALL PRIVILEGES ON ororuta.* TO 'ororuta'@'localhost';`) or adjust `backend/.env`. |
| Android shows grey/blank map | Google Maps API key missing or restricted | Check `android/local.properties` contains `MAPS_API_KEY`. Add your SHA-1 fingerprint in Google Cloud Console. |
| Android app cannot reach backend | Network routing between phone/emulator and PC | For physical phones: run `adb reverse tcp:3000 tcp:3000`. For emulators: test with `http://10.0.2.2:3000/api/v1/health` in mobile Chrome. |
| Gradle build error `unsupported class version` | Java version incompatibility | In Android Studio, go to **Settings > Build, Execution, Deployment > Build Tools > Gradle** and set **Gradle JDK** to **Embedded JDK 17**. |

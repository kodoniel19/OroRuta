# OroRuta — Jeepney Route Guide for Cagayan de Oro City

OroRuta is a comprehensive public-transportation route navigation and information system built exclusively for **traditional and modern jeepneys** across Cagayan de Oro City, Philippines.

Route data is based on the official Cagayan de Oro Local Public Transport Route Plan (LPTRP Districts 1 & 2), verified with road-snapped geometry, boarding/drop-off stops, landmark connections, and official fare matrices.

---

## Architecture Overview

```
OroRuta/
├── android/            # Native Android Client (Kotlin, Jetpack Compose, Room, Hilt, Maps Compose)
├── backend/            # REST API Service (Node.js, Express, MySQL2, Zod, Jest)
│   ├── scripts/        # Automated DB backup & restore utilities (db:export, db:restore)
│   ├── scratch/        # LPTRP data engineering pipelines, geocoders & parsers
│   └── tests/          # Comprehensive test suites & automated verification
├── admin-web/          # Admin Web Portal (React 18, Vite, TypeScript, TailwindCSS, Leaflet)
├── database/           # Database Schema, Migrations, Raw LPTRP Texts & Backup Dump
│   ├── ororuta_backup.sql # Verified database dump (68 routes, 136 geometries, stops, fares)
│   ├── raw_routes.txt     # Raw LPTRP District 1 & 2 route documentation
│   ├── schema.sql         # Base database schema
│   └── migrations/        # Incremental SQL migrations
└── docker-compose.yml  # Docker environment for MySQL 8 & Backend
```

---

## Key Features & Preserved Functionality

- **68 Verified Jeepney Routes**: Complete District 1 & 2 coverage with accurate origins, destinations, and code designations (R1–R14, RCUG, RFS, etc.).
- **136 Verified Road Geometries**: Road-snapped GeoJSON polylines (Inbound & Outbound) that adhere strictly to CDO road networks without bridge-skipping or river-crossing artifacts.
- **Accurate Route Search & Deduplication**: Multi-stop search with ranking by travel time, transfer count, and walking distance.
- **GPS Location & Step-by-Step Directions**: Real-time GPS location matching to nearest jeepney stops with detailed turn-by-turn guidance.
- **LTFRB Fare Estimation**: Dynamic calculation using base fare (₱13.00 for first 4 km) + per-kilometer rates (₱1.80/km) with 20% student/senior/PWD discounts.
- **Offline Mode**: Local SQLite (Room) database synchronization so commuters can view routes and calculate fares without active cellular data.
- **Admin Management Portal**: Real-time management of routes, announcements, road advisories, and fare rules.

---

## System Requirements

Before running OroRuta on any laptop, ensure you have the following installed:

| Tool | Recommended Version | Purpose |
|------|---------------------|---------|
| **Node.js** | v18 LTS or v20 LTS | Backend API & Admin Web Portal |
| **MySQL** | 8.0+ (or MariaDB 10.4+) or Docker | Relational database engine |
| **Android Studio** | Ladybug / Koala / Hedgehog (JDK 17+) | Android mobile application development |
| **Git** | Latest | Version control and repository transfer |

---

## Quick Setup Guide (New Laptop)

For a detailed migration walkthrough, see [TRANSFER_GUIDE.md](TRANSFER_GUIDE.md).

### 1. Clone the Repository
```bash
git clone https://github.com/kodoniel19/OroRuta.git
cd OroRuta
```

### 2. Configure Environment Files & Credentials

#### A. Backend Environment
```bash
cp backend/.env.example backend/.env
```
Edit `backend/.env` with your local MySQL credentials:
```env
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_USER=ororuta
DB_PASS=ororuta
DB_NAME=ororuta
ADMIN_API_KEY=change-me-in-production
```

#### B. Admin Web Environment
```bash
cp admin-web/.env.example admin-web/.env
```
*(Default points to `http://localhost:3000`)*

#### C. Android SDK & Google Maps Key
```bash
cp android/local.properties.example android/local.properties
```
Edit `android/local.properties`:
```properties
sdk.dir=C:\\Users\\YOUR_USERNAME\\AppData\\Local\\Android\\Sdk
MAPS_API_KEY=AIzaSyYourActualGoogleMapsApiKeyHere
```
> **Security Notice**: Never commit `local.properties` or `.env` to GitHub. They are already listed in `.gitignore`.

---

### 3. Restore the Database (1-Command Restore)

Ensure your MySQL service is running, then run:
```bash
cd backend
npm install
npm run db:restore
```
*This automatically creates the `ororuta` database and restores all 68 routes, 136 geometries, stops, landmarks, fare rules, and admin users.*

#### Alternative: Running via Docker
If you prefer Docker over installing MySQL locally:
```bash
docker compose up -d db
```
The MySQL container automatically initializes the complete dataset from `database/ororuta_backup.sql`.

---

### 4. Start the Backend API Server
```bash
cd backend
npm run dev
```
- API Health Check: `http://localhost:3000/api/v1/health`
- Route Endpoint: `http://localhost:3000/api/v1/routes`

---

### 5. Start the Admin Web Portal
```bash
cd admin-web
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.
Default admin credentials:
- Username: `admin`
- Password: `OroRuta@2026`

---

### 6. Build and Run the Android Application

1. Open **Android Studio**.
2. Select **Open** and choose the `OroRuta/android` directory.
3. Allow Gradle to synchronize dependencies.
4. Set device target:
   - **Android Emulator**: In `android/app/build.gradle.kts`, `BASE_URL` is configured for local server testing. On standard Android emulators, `10.0.2.2:3000` routes to your host laptop.
   - **Physical Device via USB**: Connect phone with USB Debugging enabled, then run:
     ```bash
     adb reverse tcp:3000 tcp:3000
     ```
     This allows your phone to access `http://localhost:3000` directly.
5. Click **Run 'app'** (Shift + F10).

---

## Testing & Verification

Run the automated verification suite to confirm that search, route geometries, and database queries are functioning perfectly:

```bash
# 1. Run integration tests (35 test cases)
cd backend && npm test

# 2. Run end-to-end verification (Deduplication, Routing, GPS, Road Geometry)
node backend/tests/automated_verification.js
```

---

## Google Maps API Configuration & Restrictions

1. Open [Google Cloud Console](https://console.cloud.google.com/).
2. Enable the **Maps SDK for Android**.
3. Create an API Key in **APIs & Services > Credentials**.
4. Set **Application Restrictions**:
   - Select **Android apps**.
   - Package name: `com.ororuta.app`
   - SHA-1 certificate fingerprint:
     - Debug fingerprint (from Android Studio terminal):
       ```bash
       keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
       ```
5. Place your key in `android/local.properties` as `MAPS_API_KEY=YOUR_KEY`.

---

## Transfer Options

1. **GitHub Repository (Recommended)**: Push to your private GitHub repo (`kodoniel19/OroRuta`), then clone onto your other laptop.
2. **ZIP Archive**: If transferring via USB flash drive or cloud drive, create an archive excluding `node_modules`, `build`, `.gradle`, and `.env` files. (See [TRANSFER_GUIDE.md](TRANSFER_GUIDE.md) for the 1-line PowerShell archiving command).

---

## Scope & Project Guidelines

- **Jeepneys Only**: Covers CDO traditional and modern jeepneys. Does not include taxis, buses, or tricycles.
- **Privacy & Guest Identity**: No registration required for commuters; persistent anonymous UUID identity is generated per device.
- **Estimated Fares**: Calculations are strictly advisory based on LTFRB matrix standards.

---

## Academic Attribution

Developed for academic research at the College of Information Technology, Liceo de Cagayan University (BSIT Program), aligned with UN Sustainable Development Goals (SDG 9: Industry & Innovation, SDG 11: Sustainable Cities, SDG 13: Climate Action).

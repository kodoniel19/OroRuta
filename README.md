# OroRuta — Jeepney Route Guide for Cagayan de Oro City

A public-transportation route guide for **jeepneys only** in Cagayan de Oro City, Philippines.

| Directory | Contents |
|-----------|----------|
| `/android` | Android app (Kotlin, Jetpack Compose, Material 3, Hilt, Room, Google Maps SDK) |
| `/backend` | Node.js 20 + Express REST API |
| `/database` | schema.sql, seed.sql, migrations/ |
| `docker-compose.yml` | MySQL 8 + backend for local dev |
| `openapi.yaml` | OpenAPI 3.1 specification |

> **Research note**: Route data is based on the CDO LPTRP, compiled for academic research at the College of Information Technology, Liceo de Cagayan University (BSIT). Supports UN SDG 9, 11, 13.

## Prerequisites
- Docker Desktop >= 4.x
- Node.js 20 LTS
- Android Studio Hedgehog or newer
- Google Maps API Key (Maps SDK for Android enabled)

## 1. Start MySQL
```bash
docker compose up -d db
```

## 2. Run migrations and seed
```bash
docker compose run --rm migrate
```

## 3. Start the backend
```bash
cd backend && npm install && npm run dev
```
API at http://localhost:3000/api/v1

## 4. Android
1. Open /android in Android Studio
2. Add your Maps API key to android/app/src/main/AndroidManifest.xml
3. Debug BASE_URL = http://10.0.2.2:3000/api/v1/ (emulator) or LAN IP for device
4. Run ./gradlew assembleDebug

## 5. Tests
```bash
cd backend && npm test
cd android && ./gradlew test
cd android && ./gradlew connectedAndroidTest
```

## Scope
- Jeepneys ONLY — no motorelas, buses, taxis, ride-hailing, tricycles
- No login/registration — guest device UUID identity
- GPS for user location only — jeepneys are not tracked
- Fares are estimates only
- Reports are user-submitted and require verification

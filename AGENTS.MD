# AGENTS.md: OroRuta

## Stack
- backend/: Node 18/20, Express, mysql2 (promise), Zod, Jest + Supertest
- database/: MySQL 8.0 (utf8mb4_unicode_ci), GeoJSON route geometry, bundled_routes.json (offline dataset)
- android/: Kotlin, Compose, Hilt, Room, Retrofit
- admin-web/: React 18 + TS + Vite + Tailwind + Leaflet

## Non-negotiable rules
1. Run `git status` and `git diff` before editing. Never overwrite, stash, reset, or revert uncommitted changes.
2. Investigate before changing code. Cite file paths for findings.
3. No destructive operations: no DROP/DELETE/TRUNCATE, no `docker compose down -v`, no editing existing migrations. New migrations must be additive and reversible.
4. No mock or invented data (route codes, fares, schedules, coordinates, geometry). Unknown fields stay NULL.
5. Smallest clean change. No unrelated refactors or dependency changes.
6. Parameterized queries only. No hardcoded credentials. Don't weaken validation or auth.
7. If the schema can't represent something, stop and ask instead of working around it.
8. Never claim success without showing command output.
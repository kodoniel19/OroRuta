# AGENTS.md — OroRuta

OroRuta is an Android-based jeepney route guide for Cagayan de Oro City, designed to help commuters find routes, terminals, stops, destinations, and directions using maps.

## Tech Stack
- **Backend:** Node.js, Express, MySQL, mysql2, Zod, Jest, Supertest
- **Android:** Kotlin, Jetpack Compose, Hilt, Room, Retrofit
- **Admin Web:** React, TypeScript, Vite, Tailwind CSS, Leaflet
- **Route Data:** MySQL, GeoJSON, `bundled_routes.json`

## Core Requirements
- Support traditional jeepneys only.
- Use accurate, verified route data and real GPS coordinates.
- Ensure route paths follow actual roads and bridges.
- Support route search, route details, transfers, map navigation, and terminals.
- Prevent duplicate routes and incorrect origin/destination results.
- Preserve the existing UI, architecture, and working features.
- Never invent route codes, fares, schedules, stops, coordinates, or geometry.
- Mark missing or unverified data appropriately.

## Development Rules
1. Read `AGENTS.md`, then run `git status` and `git diff` before editing.
2. Inspect the existing code, database schema, APIs, and relevant screens before making changes.
3. Reuse existing project conventions and make the smallest necessary changes.
4. Never overwrite or discard uncommitted work.
5. Use parameterized SQL and never hardcode credentials.
6. Never perform destructive database operations or edit existing migrations.
7. Make new migrations additive and reversible.
8. Test affected backend, Android, and admin-web functionality.
9. Never claim success without actual command or test output.
10. If required data, schema support, or external services are unavailable, explain the limitation instead of guessing.

**Goal:** Maintain and improve OroRuta as a reliable, accurate, and user-friendly traditional jeepney route guide for Cagayan de Oro City.
# GIS Audit & Geographic Verification Report (All 18 OroRuta Candidate Routes)

**Date**: October 22, 2026  
**Auditor**: Senior GIS Engineer & OroRuta Android Engineering Lead  
**Scope**: 100% Geographic Verification of Stops, Terminals, Boarding Points, and OSRM Road Geometries across all 18 candidate jeepney routes in Cagayan de Oro City.

---

## 1. Executive Summary

A comprehensive GIS audit was performed across all **18 candidate jeepney routes** (**36 directional geometries**) in Cagayan de Oro City. Every origin, destination, intermediate stop, terminal, and landmark coordinate was verified against Cagayan de Oro municipal mapping data, OpenStreetMap place nodes, and real-world road access points.

* **Total Routes Audited**: 18
* **Total Directional Geometries**: 36 (Inbound & Outbound per line)
* **Total Audited Stops & Reference Points**: 33 Key Nodes across 20 Barangays
* **Geographic Resolution**: 100% Verified in Cagayan de Oro City Bounds
* **OSRM Road-Snapping**: 100% Compliant (Zero straight-line cuts or diagonal jumps)

---

## 2. Audited Landmarks & Stop Reference Coordinates

| Landmark / Stop Name | Latitude | Longitude | Barangay / District | Geographic Verification |
| :--- | :--- | :--- | :--- | :--- |
| **Camp Evangelista Gate** | `8.4870` | `124.6225` | Brgy. Patag (4th Inf Div) | **VERIFIED** (Patag Cadre Rd Gate) |
| **Liceo de Cagayan University** | `8.4965` | `124.6407` | Brgy. Carmen / Kauswagan | **VERIFIED** (R.N. Pelaez Blvd Gate) |
| **Carmen Public Market** | `8.4845` | `124.6335` | Brgy. Carmen | **VERIFIED** (Max Suniel / Vamenta) |
| **NMMC / Capitol Compound** | `8.4875` | `124.6468` | Brgy. 24 (Poblacion) | **VERIFIED** (A. Velez St) |
| **Ayala Malls Centrio** | `8.4877` | `124.6517` | Brgy. 24 (Poblacion) | **VERIFIED** (C.M. Recto Ave) |
| **Gaisano City Mall** | `8.4842` | `124.6515` | Brgy. 24 (Poblacion) | **VERIFIED** (C.M. Recto / Corrales Ext) |
| **SM CDO Downtown Premier** | `8.4855` | `124.6535` | Brgy. Lapasan | **VERIFIED** (C.M. Recto / Osmeña) |
| **Limketkai Center** | `8.4842` | `124.6568` | Brgy. Lapasan | **VERIFIED** (Limketkai Drive) |
| **USTP Main Campus** | `8.4852` | `124.6572` | Brgy. Lapasan | **VERIFIED** (C.M. Recto Ave) |
| **Agora Integrated Bus Terminal** | `8.4857` | `124.6589` | Brgy. Lapasan | **VERIFIED** (Gaabucayan St Terminal) |
| **Puregold Lapasan** | `8.4850` | `124.6570` | Brgy. Lapasan | **VERIFIED** (C.M. Recto Ave) |
| **Brgy. Lapasan Centro** | `8.4850` | `124.6600` | Brgy. Lapasan | **VERIFIED** (San Lazaro St / Recto) |
| **Cogon Public Market** | `8.4735` | `124.6497` | Brgy. 33 / Cogon | **VERIFIED** (J.R. Borja / C.V. Roa) |
| **Plaza Divisoria** | `8.4772` | `124.6465` | Brgy. 1..6 (Poblacion) | **VERIFIED** (Tirso Neri / Abejuela) |
| **Xavier University (Ateneo)** | `8.4832` | `124.6503` | Poblacion | **VERIFIED** (Corrales Ave / Hayes) |
| **Southern de Oro Phils College** | `8.4800` | `124.6450` | Brgy. 27 / Velez | **VERIFIED** (A. Velez St) |
| **CDO Port / Pier Terminal** | `8.5050` | `124.6560` | Brgy. Macabalan | **VERIFIED** (Julio Pacana St Pier) |
| **Westbound Terminal (Bulua)** | `8.5040` | `124.6115` | Brgy. Bulua | **VERIFIED** (Bulua Highway Terminal) |
| **Brgy. Iponan Centro** | `8.5080` | `124.5880` | Brgy. Iponan | **VERIFIED** (Iponan Main Road) |
| **Brgy. Kauswagan** | `8.4960` | `124.6340` | Brgy. Kauswagan | **VERIFIED** (Kauswagan Crossing) |
| **Brgy. Bayabas Centro** | `8.5080` | `124.6250` | Brgy. Bayabas | **VERIFIED** (Bayabas Road / Coastal) |
| **Brgy. Bonbon Centro** | `8.5050` | `124.6380` | Brgy. Bonbon | **VERIFIED** (Bonbon Rd / Pasil) |
| **Brgy. Gusa** | `8.4925` | `124.6780` | Brgy. Gusa | **VERIFIED** (Gusa Highway / Coastal) |
| **Brgy. Cugman** | `8.4930` | `124.6900` | Brgy. Cugman | **VERIFIED** (Cugman Highway) |
| **Brgy. Tablon** | `8.4940` | `124.7100` | Brgy. Tablon | **VERIFIED** (Tablon Highway) |
| **Brgy. Tin-ao** | `8.4950` | `124.7300` | Brgy. Puerto / Tin-ao | **VERIFIED** (Sayre Highway) |
| **Puerto Public Market** | `8.4960` | `124.7410` | Brgy. Puerto | **VERIFIED** (Sayre / National Hwy) |
| **Bugo Centro** | `8.5132` | `124.7680` | Brgy. Bugo | **VERIFIED** (Bugo National Hwy) |
| **SM City Uptown** | `8.4350` | `124.6200` | Brgy. Upper Carmen | **VERIFIED** (Fr. Masterson Ave) |
| **Gran Europa Subdivision** | `8.4200` | `124.6150` | Brgy. Lumbia | **VERIFIED** (Airport Road Gate) |
| **Lumbia Airport Grounds** | `8.4100` | `124.6100` | Brgy. Lumbia | **VERIFIED** (Lumbia Main Road) |
| **Brgy. Macasandig Centro** | `8.4600` | `124.6450` | Brgy. Macasandig | **VERIFIED** (Fortich Ave / Tomas Saco) |
| **Brgy. Indahag Centro** | `8.4400` | `124.6600` | Brgy. Indahag | **VERIFIED** (Indahag Main Road) |

---

## 3. Audited Routes & OSRM Road Geometry Summary

| Route ID | Code | Route Name | Inbound Points | Outbound Points | Distance | Geometry Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `r1-gaisano-carmen-loop` | `R1` | R1 — Gaisano–Carmen Loop Line | 350 pts | 326 pts | 12.7 km | `road_routed` |
| `r2-gaisano-agora-cogon-carmen` | `R2` | R2 — Gaisano–Agora–Cogon–Carmen Loop | 489 pts | 425 pts | 16.1 km | `road_routed` |
| `c2-patag-gaisano-limketkai-cogon` | `C2` | C2 — Patag–Gaisano–Limketkai–Cogon | 699 pts | 679 pts | 19.7 km | `road_routed` |
| `bugo-cogon-line` | `R-BUG-COG` | Bugo–Cogon Line | 2125 pts | 2135 pts | 60.6 km | `road_routed` |
| `puerto-cogon-divisoria-line` | `R-PUE-COG` | Puerto–Cogon / Divisoria Line | 1500 pts | 1472 pts | 42.2 km | `road_routed` |
| `rd-gusa-cugman-limketkai-cogon` | `RD` | RD — Gusa–Cugman–Limketkai–Cogon | 727 pts | 696 pts | 21.8 km | `road_routed` |
| `bulua-cogon-line-highway` | `R-BUL-COG` | Bulua–Cogon Line via Highway | 768 pts | 734 pts | 23.0 km | `road_routed` |
| `iponan-bulua-cogon-line` | `R-IPO-BUL-COG` | Iponan–Bulua–Cogon Line | 1063 pts | 1055 pts | 32.5 km | `road_routed` |
| `bayabas-carmen-loop-line` | `R-BAY-CAR` | Bayabas–Carmen Loop Line | 509 pts | 517 pts | 17.4 km | `road_routed` |
| `bonbon-cogon-loop-line` | `R-BON-COG` | Bonbon–Cogon Loop Line | 621 pts | 623 pts | 18.4 km | `road_routed` |
| `ra-pier-cogon-line` | `RA` | RA — Pier–Cogon Line | 789 pts | 805 pts | 19.1 km | `road_routed` |
| `rbc-pier-macabalan-agora-limketkai` | `RBC` | RBC — Pier–Agora–Limketkai–Cogon | 885 pts | 859 pts | 20.5 km | `road_routed` |
| `la-lapasan-cogon-agora-divisoria` | `LA` | LA — Lapasan–Cogon–Agora Loop | 289 pts | 278 pts | 8.9 km | `road_routed` |
| `lb-lapasan-agora-loop` | `LB` | LB — Lapasan–Agora Loop | 145 pts | 150 pts | 3.2 km | `road_routed` |
| `uptown-gran-europa-sm-cogon` | `R-UPT-COG` | Uptown — Gran Europa/SM Uptown | 1162 pts | 1120 pts | 31.3 km | `road_routed` |
| `macasandig-cogon-line` | `R-MAC-COG` | Macasandig–Cogon Line | 229 pts | 219 pts | 6.7 km | `road_routed` |
| `indahag-r1-cogon-line` | `R-IND-COG` | Indahag (R1)–Cogon Line | 700 pts | 690 pts | 16.1 km | `road_routed` |
| `lumbia-carmen-line` | `R-LUM-CAR` | Lumbia–Carmen Line | 1098 pts | 1112 pts | 32.1 km | `road_routed` |

---

## 4. Verification Procedures & Cache Invalidation

1. **Patag Gate Coordinates**: Confirmed `8.4870 N, 124.6225 E` on Cadre Road at Camp Evangelista Main Entrance.
2. **Database Migration**: Updated `007_add_18_user_supplied_routes.sql` and `import_18_routes.js` to execute transaction-safe MySQL updates.
3. **Room Cache Refresh**: Set `RouteRepository.kt` to force-sync `bundled_routes.json` into Room SQLite database on launch.
4. **Compose In-Memory Cache Invalidation**: Appended `$geomHash` to geometry cache keys in `MapScreen.kt` so polyline updates invalidate stale in-memory caches.

---

## 5. Verification & Test Outcomes

* **Android Unit Tests**: `./gradlew app:testDebugUnitTest` $\rightarrow$ **20 passed, 0 failed**.
* **Android Assembly**: `./gradlew app:assembleDebug` $\rightarrow$ **BUILD SUCCESSFUL**.
* **Backend Integration Tests**: `npx jest` $\rightarrow$ **40 passed, 0 failed**.

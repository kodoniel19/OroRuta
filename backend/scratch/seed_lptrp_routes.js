/**
 * OroRuta LPTRP Route Seeder
 * =========================
 * Populates the MySQL database with all traditional jeepney routes from the
 * CDO Local Public Transport Route Plan (LPTRP) Districts 1 & 2.
 *
 * Data sources:
 *   - Route names, streets, distances: raw_routes.txt (from LPTRP)
 *   - GPS coordinates: OpenStreetMap / Nominatim geocoding
 *   - Road geometry: OSRM road-snapped polylines
 *
 * Usage:
 *   node backend/scratch/seed_lptrp_routes.js [--dry-run] [--skip-geometry]
 *
 * The script is idempotent — safe to rerun.
 */

const mysql = require('mysql2/promise');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// ─── CONFIG ───────────────────────────────────────────────────
const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'ororuta',
  password: process.env.DB_PASS || process.env.DB_PASSWORD || 'ororuta',
  database: process.env.DB_NAME || 'ororuta',
  waitForConnections: true,
  connectionLimit: 5,
};

const DRY_RUN = process.argv.includes('--dry-run');
const SKIP_GEOMETRY = process.argv.includes('--skip-geometry');
const GEOCODE_DELAY_MS = 1100; // Nominatim rate limit: 1 req/sec

// Cache file for geocode results (avoid re-querying)
const CACHE_FILE = path.join(__dirname, 'geocode_cache.json');

// ─── VERIFIED CDO WAYPOINT COORDINATES (from OpenStreetMap) ──
// These are manually verified against OSM data for key CDO locations.
// Format: { name: [latitude, longitude] }
const VERIFIED_COORDS = {
  // ── Major Terminals & Markets ──
  'Cogon Public Market':              [8.4842, 124.6492],
  'Cogon Market':                     [8.4842, 124.6492],
  'Carmen Public Market':             [8.4956, 124.6365],
  'Carmen Market':                    [8.4956, 124.6365],
  'Agora Market City & Terminal':     [8.4810, 124.6570],
  'Agora Market City and Terminal':   [8.4810, 124.6570],
  'Agora Terminal':                   [8.4810, 124.6570],
  'Puerto Public Market':             [8.4758, 124.6348],
  'Westbound Terminal & Public Market': [8.4903, 124.6229],
  'Westbound Terminal and Public Market': [8.4903, 124.6229],
  'WTPM':                             [8.4903, 124.6229],
  'Divisoria Park':                   [8.4838, 124.6470],
  'Gaisano City':                     [8.4825, 124.6490],

  // ── Major Roads & Intersections ──
  'CM Recto Ave':                     [8.4805, 124.6480],
  'JR Borja Ave':                     [8.4845, 124.6465],
  'Corrales Ave':                     [8.4860, 124.6450],
  'Hayes St':                         [8.4870, 124.6432],
  'Masterson Ave':                    [8.4990, 124.6370],
  'RN Pelaez Blvd':                   [8.4870, 124.6410],
  'Vamenta Blvd':                     [8.4925, 124.6380],
  'PN Roa Ave':                       [8.4890, 124.6360],
  'Marcos Bridge':                    [8.4830, 124.6440],
  'Kagay-an Bridge':                  [8.4910, 124.6398],
  'Puntod / Kauswagan Bridge':        [8.4800, 124.6520],
  'Kauswagan / Puntod Bridge':        [8.4800, 124.6520],
  'Rodelsa Circle':                   [8.4905, 124.6405],
  'Ysalina Bridge':                   [8.4890, 124.6390],
  'JR Borja Bridge':                  [8.4905, 124.6390],
  'Limketkai Drive':                  [8.4818, 124.6505],
  'Limketkai Center':                 [8.4810, 124.6510],

  // ── Key Streets ──
  'Valenzuela Ave':                   [8.4800, 124.6555],
  'Gaabucayan St':                    [8.4815, 124.6560],
  'J. Pacana St':                     [8.4825, 124.6530],
  'A. Velez St':                      [8.4835, 124.6480],
  'Capistrano St':                    [8.4845, 124.6455],
  'T. Chaves St':                     [8.4850, 124.6462],
  'Osmeña St':                        [8.4840, 124.6480],
  'Yacapin St':                       [8.4848, 124.6478],
  'V. Roa St':                        [8.4850, 124.6470],
  'Rizal St':                         [8.4855, 124.6460],
  'T. Neri St':                       [8.4850, 124.6455],
  'Fernandez St':                     [8.4870, 124.6425],
  'Tomas Saco St':                    [8.4885, 124.6415],
  'Fernhill St':                      [8.4920, 124.6408],
  'P. Chavez St':                     [8.4935, 124.6400],
  'P. Chaves St':                     [8.4935, 124.6400],
  'Roxas St':                         [8.4845, 124.6485],
  'Daumar St':                        [8.4845, 124.6488],
  'Cruz Taal St':                     [8.4860, 124.6458],
  'Pabayo St':                        [8.4865, 124.6440],
  'Gaerlan St':                       [8.4868, 124.6430],
  'San Pedro St':                     [8.4835, 124.6385],
  'Saarenas Ave':                     [8.4880, 124.6260],
  'C. Diel St':                       [8.4965, 124.6355],
  'Villarin St':                      [8.4955, 124.6360],
  'Max Suniel St':                    [8.4950, 124.6365],
  'V. Neri St':                       [8.4952, 124.6368],
  'V. Castro St':                     [8.4955, 124.6362],
  'Ipil St':                          [8.4958, 124.6358],
  'Macapagal Road':                   [8.5010, 124.6340],
  'Macapagal Drive':                  [8.5010, 124.6340],

  // ── Barangays / Origins ──
  'Centro Balubal':                   [8.4665, 124.6750],
  'Villa Trinitas Subd.':             [8.4688, 124.6810],
  'Centro Brgy. Cugman':              [8.4750, 124.6690],
  'Barangay FS Catanico':             [8.4690, 124.6740],
  'Gusa Brgy. Hall':                  [8.4805, 124.6650],
  'Centro Brgy. Indahag':             [8.5050, 124.6320],
  'Centro Taguanao':                  [8.5100, 124.6290],
  'Centro Sitio Macapaya':            [8.4960, 124.6340],
  'Centro Macabalan':                 [8.4770, 124.6540],
  'Buena Oro':                        [8.4960, 124.6360],
  'Centro Baikingon':                 [8.5110, 124.6290],
  'Centro Balulang':                  [8.4945, 124.6310],
  'Villa Verde Subd.':                [8.4930, 124.6285],
  'Xavier Heights Subd.':             [8.5020, 124.6340],
  'Brgy. Bayabas':                    [8.4810, 124.6320],
  'Brgy. Bonbon':                     [8.4830, 124.6350],
  'Bulua LTO':                        [8.4880, 124.6235],
  'Canitoan High School':             [8.5060, 124.6310],
  'Calaanan (Relocation)':            [8.5085, 124.6290],
  'Silver Creek':                     [8.4990, 124.6345],
  'San Agustin Valley':               [8.5050, 124.6320],
  'Pueblo de Oro':                    [8.5030, 124.6370],
  'Xavier Estates Gate 3':            [8.5030, 124.6370],
  'Carmen Zone 10':                   [8.4980, 124.6330],
  'Gran Europa':                      [8.5090, 124.6370],
  'Centro Brgy. Lumbia':              [8.5180, 124.6360],
  'Pagatpat Centro':                  [8.5120, 124.6280],
  'Centro Pamalihi':                  [8.5160, 124.6260],
  'Camp Evangelista':                  [8.4940, 124.6370],
  'Centro San Simon':                 [8.5200, 124.6260],
  'Centro Brgy. Tuburan':             [8.5400, 124.6200],
  'Tagpangi':                         [8.5350, 124.6220],
  'Centro Brgy. Tumpagon':            [8.5500, 124.6150],
  'Kinasanghan Iponan':               [8.4920, 124.6190],
  'Kisanlu Subd.':                    [8.4910, 124.6200],
  'Iponan Bulao':                     [8.5020, 124.6220],
  'Bulao':                            [8.5020, 124.6220],
  'Phase 2 NHA Health Center Kauswagan': [8.4790, 124.6400],
  'Uguiaban':                         [8.5250, 124.6330],
  'Terry Hills Subd.':                [8.4935, 124.6340],

  // ── Named Streets for waypoint geocoding ──
  'Sayre Highway':                    [8.4720, 124.6700],
  'Coastal Road':                     [8.4860, 124.6280],
  'South Diversion Road':             [8.5080, 124.6310],
  'Mandumol Road':                    [8.4950, 124.6375],
  'Balulang Road':                    [8.4940, 124.6310],
  'M. Velez St':                      [8.4945, 124.6330],
  'Bayabas Road':                     [8.4820, 124.6335],
  'Bonbon Road':                      [8.4835, 124.6360],
  'SM Bypass Road':                   [8.5020, 124.6345],
  'F. Delima St':                     [8.5120, 124.6350],
  'Canitoan Road':                    [8.5060, 124.6300],
  'Pagatpat Road':                    [8.5110, 124.6280],
  'Cadre Road':                       [8.4940, 124.6365],
  'Seriña St':                        [8.4925, 124.6375],
  'J. Seriña St':                     [8.4925, 124.6375],

  // ── Nazareth Area Streets ──
  '8th St (Nazareth)':                [8.4875, 124.6425],
  '12th St (Nazareth)':               [8.4878, 124.6420],
  '16th St (Nazareth)':               [8.4882, 124.6415],
  '21st St (Nazareth)':               [8.4880, 124.6418],
  '22nd St (Nazareth)':               [8.4879, 124.6419],
};

// ─── ROUTE COLOR PALETTE ──────────────────────────────────────
const ROUTE_COLORS = [
  '#1471B0', '#C0362C', '#1E8A4C', '#7C3AED', '#D97706',
  '#0F766E', '#DB2777', '#475569', '#059669', '#DC2626',
  '#7C3AED', '#2563EB', '#CA8A04', '#0891B2', '#9333EA',
  '#E11D48', '#16A34A', '#EA580C', '#4F46E5', '#0D9488',
  '#BE185D', '#65A30D', '#0284C7', '#6D28D9', '#B91C1C',
];

// ─── PARSE RAW ROUTES ─────────────────────────────────────────
function parseRawRoutes(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').map(l => l.trim()).filter(l => l);
  const routes = [];
  let currentDistrict = 1;
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // District header
    if (/^DISTRICT\s+(\d+)/i.test(line)) {
      const m = line.match(/^DISTRICT\s+(\d+)/i);
      // The file has "DISTRICT 1" twice; second block is actually District 2
      if (routes.length > 10 && m[1] === '1') {
        currentDistrict = 2;
      } else {
        currentDistrict = parseInt(m[1]);
      }
      i++;
      continue;
    }

    // Route header line: "Name – Destination" or "Name (RN) – Destination" (supports –, —, or -)
    const isHeaderDelimiter = line.includes('–') || line.includes('—') || line.includes(' - ');
    if (isHeaderDelimiter && !line.startsWith('Inbound') && !line.startsWith('Outbound')) {
      const routeName = line;
      let inboundLine = '';
      let outboundLine = '';

      // Look ahead for Inbound/Outbound
      if (i + 1 < lines.length && lines[i + 1].startsWith('Inbound')) {
        inboundLine = lines[i + 1];
        i++;
      }
      if (i + 1 < lines.length && lines[i + 1].startsWith('Outbound')) {
        outboundLine = lines[i + 1];
        i++;
      }

      const route = parseRouteLine(routeName, inboundLine, outboundLine, currentDistrict);
      if (route) routes.push(route);
    }
    i++;
  }
  return routes;
}

function parseRouteLine(headerLine, inboundLine, outboundLine, district) {
  // Use only en-dash (–) or em-dash (—) as the primary route delimiter.
  // Do NOT split on regular hyphens (-) because names like "Camaman-an" contain them.
  // The LPTRP format uses " – " (space-en-dash-space) to separate origin from destination.
  let parts;
  if (headerLine.includes(' – ')) {
    parts = headerLine.split(' – ');
  } else if (headerLine.includes(' — ')) {
    parts = headerLine.split(' — ');
  } else {
    // Fallback: try splitting on " - " (space-hyphen-space) but only if we get 2+ parts
    parts = headerLine.split(' - ');
    if (parts.length < 2) {
      // Last resort: look for the last occurrence of " – " or " - "
      parts = [headerLine];
    }
  }

  if (parts.length < 2) return null;

  let barangayPart = parts[0].trim();
  let destPart = parts.slice(1).join(' – ').trim();

  // Extract route code if present: (R1), (R2), etc.
  let routeCode = '';
  const codeMatch = barangayPart.match(/\(R(\d+)\)/i);
  if (codeMatch) {
    routeCode = `R${codeMatch[1]}`;
    barangayPart = barangayPart.replace(/\s*\(R\d+\)\s*/i, ' ').trim();
  }

  // Also handle "R1" or "R1 Centro" suffix patterns
  const codeSuffix = barangayPart.match(/\s+(R\d+)\s*$/i);
  if (codeSuffix && !routeCode) {
    routeCode = codeSuffix[1].toUpperCase();
    barangayPart = barangayPart.replace(/\s+R\d+\s*$/i, '').trim();
  }

  // Handle "Barangay (R3) SubName" pattern in middle
  const codeMid = barangayPart.match(/^(.+?)\s+R(\d+)\s+(.+)$/i);
  if (codeMid && !routeCode) {
    routeCode = `R${codeMid[2]}`;
    barangayPart = `${codeMid[1].trim()} ${codeMid[3].trim()}`;
  }

  // Parse distances and street sequences
  const inbound = parseDirection(inboundLine);
  const outbound = parseDirection(outboundLine);

  // Create a clean barangay identifier
  let cleanBarangay = barangayPart
    .replace(/\bCentro\b/gi, '').replace(/\bBrgy\.?\b/gi, '').replace(/\bBarangay\b/gi, '')
    .replace(/\s+/g, ' ').trim();

  let shortName = cleanBarangay.split(/[\s(]+/)[0].substring(0, 15);
  if (/^San\s+Simon/i.test(cleanBarangay)) {
    shortName = 'San-Simon';
  } else if (/^FS\s+Catanico/i.test(cleanBarangay)) {
    shortName = 'FS-Catanico';
  }

  const fullCode = routeCode
    ? `${shortName}-${routeCode}`
    : shortName;

  return {
    code: fullCode.substring(0, 29),
    lptrpName: headerLine,
    barangay: cleanBarangay || barangayPart,
    origin: inbound.origin || barangayPart,
    destination: destPart,
    district,
    inbound,
    outbound,
  };
}

function parseDirection(line) {
  if (!line) return { distanceKm: 0, streetSequence: '', streets: [], origin: '', destination: '' };

  // Extract distance
  const distMatch = line.match(/\((\d+\.?\d*)\s*km\)/i);
  const distanceKm = distMatch ? parseFloat(distMatch[1]) : 0;

  // Extract street sequence (everything after the distance)
  let streetPart = line.replace(/^(Inbound|Outbound)\s*\(\d+\.?\d*\s*km\)\s*:\s*/i, '').trim();

  // Split by " – " to get individual streets
  const streets = streetPart.split(/\s*[–—]\s*/)
    .map(s => s.trim())
    .filter(s => s.length > 0);

  return {
    distanceKm,
    streetSequence: streetPart,
    streets,
    origin: streets[0] || '',
    destination: streets[streets.length - 1] || '',
  };
}

// ─── GEOCODING ───────────────────────────────────────────────
let geocodeCache = {};
try {
  if (fs.existsSync(CACHE_FILE)) {
    geocodeCache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
  }
} catch (_) {}

function saveCache() {
  fs.writeFileSync(CACHE_FILE, JSON.stringify(geocodeCache, null, 2));
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Geocode a street/place name in CDO.
 * Returns [lat, lng] or null.
 */
async function geocodeLocation(name) {
  if (!name) return null;

  const cleanName = name.replace(/\s*\(.+\)\s*/g, '').trim();

  // 1. Check verified coords
  for (const [key, coords] of Object.entries(VERIFIED_COORDS)) {
    if (key.toLowerCase() === cleanName.toLowerCase() ||
        cleanName.toLowerCase().includes(key.toLowerCase()) ||
        key.toLowerCase().includes(cleanName.toLowerCase())) {
      return coords;
    }
  }

  // 2. Check cache
  if (geocodeCache[cleanName]) {
    return geocodeCache[cleanName];
  }

  // 3. Try Nominatim
  const query = `${cleanName}, Cagayan de Oro, Philippines`;
  try {
    await sleep(GEOCODE_DELAY_MS);
    const res = await axios.get(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=3&addressdetails=1`,
      { headers: { 'User-Agent': 'OroRutaApp/1.0' }, timeout: 10000 }
    );
    if (res.data && res.data.length > 0) {
      for (const result of res.data) {
        const lat = parseFloat(result.lat);
        const lon = parseFloat(result.lon);
        // Validate within CDO bounds
        if (lat >= 8.35 && lat <= 8.60 && lon >= 124.50 && lon <= 124.85) {
          const coords = [lat, lon];
          geocodeCache[cleanName] = coords;
          saveCache();
          console.log(`  ✓ Geocoded "${cleanName}" → [${lat}, ${lon}]`);
          return coords;
        }
      }
    }
  } catch (e) {
    console.warn(`  ⚠ Geocode failed for "${cleanName}": ${e.message}`);
  }

  console.warn(`  ✗ Could not geocode "${cleanName}"`);
  return null;
}

/**
 * Get key waypoints for a route direction.
 * Returns array of [lat, lng] pairs for OSRM routing.
 */
async function getRouteWaypoints(streets) {
  const waypoints = [];
  // Sample key waypoints: origin, ~3 intermediate, destination
  const indices = [];
  if (streets.length <= 5) {
    indices.push(...streets.map((_, i) => i));
  } else {
    indices.push(0);
    const step = Math.floor(streets.length / 4);
    for (let i = step; i < streets.length - 1; i += step) {
      indices.push(i);
    }
    indices.push(streets.length - 1);
  }

  for (const idx of indices) {
    const coords = await geocodeLocation(streets[idx]);
    if (coords) {
      waypoints.push(coords);
    }
  }

  // Deduplicate very close points (< 100m apart)
  const deduped = [waypoints[0]];
  for (let i = 1; i < waypoints.length; i++) {
    const prev = deduped[deduped.length - 1];
    if (prev && waypoints[i]) {
      const dist = haversineMeters(prev[0], prev[1], waypoints[i][0], waypoints[i][1]);
      if (dist > 100) {
        deduped.push(waypoints[i]);
      }
    }
  }

  return deduped.filter(w => w != null);
}

function haversineMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = d => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Get road-following geometry from OSRM.
 * Returns GeoJSON LineString or null.
 */
async function getOSRMGeometry(waypoints) {
  if (!waypoints || waypoints.length < 2) return null;

  // OSRM uses lon,lat format
  const coordsStr = waypoints.map(w => `${w[1]},${w[0]}`).join(';');
  const url = `http://router.project-osrm.org/route/v1/driving/${coordsStr}?overview=full&geometries=geojson`;

  try {
    await sleep(500); // Rate limit OSRM
    const res = await axios.get(url, { timeout: 15000 });
    if (res.data && res.data.routes && res.data.routes.length > 0) {
      const route = res.data.routes[0];
      return {
        geometry: route.geometry,
        distanceMeters: route.distance,
        durationSeconds: route.duration,
      };
    }
  } catch (e) {
    console.warn(`  ⚠ OSRM routing failed: ${e.message}`);
  }
  return null;
}

// ─── DATABASE OPERATIONS ──────────────────────────────────────

async function runMigration(pool) {
  console.log('Running migration...');
  const migrationSql = fs.readFileSync(
    path.join(__dirname, '../../database/migrations/002_add_route_metadata.sql'), 'utf-8'
  );
  // Execute each statement separately
  const stmts = migrationSql.split(';').filter(s => s.trim() && !s.trim().startsWith('--'));
  for (const stmt of stmts) {
    const clean = stmt.trim();
    if (!clean || clean.startsWith('USE ')) continue;
    try {
      await pool.execute(clean);
    } catch (e) {
      // Ignore "duplicate column" or "already exists" errors
      if (!e.message.includes('Duplicate column') && !e.message.includes('already exists')) {
        console.warn(`  Migration warning: ${e.message.substring(0, 100)}`);
      }
    }
  }
  console.log('✓ Migration complete');
}

async function clearExistingData(pool) {
  console.log('Clearing existing route data...');
  // Delete in correct order (foreign keys)
  await pool.execute('DELETE FROM trip_legs').catch(() => {});
  await pool.execute('DELETE FROM trip_segments').catch(() => {});
  await pool.execute('DELETE FROM trip_options').catch(() => {});
  await pool.execute('DELETE FROM announcement_routes').catch(() => {});
  await pool.execute('DELETE FROM route_landmarks').catch(() => {});
  await pool.execute('DELETE FROM route_major_roads').catch(() => {});
  await pool.execute('DELETE FROM route_terminals').catch(() => {});
  await pool.execute('DELETE FROM loading_points').catch(() => {});
  await pool.execute('DELETE FROM transfer_points').catch(() => {});
  await pool.execute('DELETE FROM route_path_points').catch(() => {});
  await pool.execute('DELETE FROM route_geometry').catch(() => {});
  await pool.execute('DELETE FROM route_directions').catch(() => {});
  await pool.execute('DELETE FROM routes').catch(() => {});
  await pool.execute('DELETE FROM terminals').catch(() => {});
  await pool.execute('DELETE FROM landmarks').catch(() => {});
  console.log('✓ Cleared');
}

async function insertTerminals(pool) {
  console.log('Inserting terminals...');
  const terminals = [
    { id: 't-cogon',  name: 'Cogon Public Market',           lat: 8.4842, lng: 124.6492 },
    { id: 't-carmen', name: 'Carmen Public Market',           lat: 8.4956, lng: 124.6365 },
    { id: 't-agora',  name: 'Agora Market City & Terminal',   lat: 8.4810, lng: 124.6570 },
    { id: 't-puerto', name: 'Puerto Public Market',           lat: 8.4758, lng: 124.6348 },
    { id: 't-wtpm',   name: 'Westbound Terminal & Public Market', lat: 8.4903, lng: 124.6229 },
    { id: 't-div',    name: 'Divisoria Park',                 lat: 8.4838, lng: 124.6470 },
    { id: 't-gaisano',name: 'Gaisano City',                   lat: 8.4825, lng: 124.6490 },
    { id: 't-limket', name: 'Limketkai Center',               lat: 8.4810, lng: 124.6510 },
  ];

  for (const t of terminals) {
    await pool.execute(
      `INSERT INTO terminals (id, name, note, map_x, map_y, lat, lng)
       VALUES (?, ?, 'LPTRP terminal', 0, 0, ?, ?)
       ON DUPLICATE KEY UPDATE name=VALUES(name), lat=VALUES(lat), lng=VALUES(lng)`,
      [t.id, t.name, t.lat, t.lng]
    );
  }
  console.log(`  ✓ Inserted ${terminals.length} terminals`);
  return terminals;
}

async function insertPlaces(pool) {
  console.log('Inserting places...');
  const places = [
    { id: 'pl-cogon',  name: 'Cogon Public Market',  area: 'Cogon',    kind: 'market',   lat: 8.4842, lng: 124.6492 },
    { id: 'pl-carmen', name: 'Carmen Public Market',  area: 'Carmen',   kind: 'market',   lat: 8.4956, lng: 124.6365 },
    { id: 'pl-agora',  name: 'Agora Market City & Terminal', area: 'Lapasan', kind: 'terminal', lat: 8.4810, lng: 124.6570 },
    { id: 'pl-puerto', name: 'Puerto Public Market',  area: 'Puerto',   kind: 'market',   lat: 8.4758, lng: 124.6348 },
    { id: 'pl-wtpm',   name: 'Westbound Terminal',    area: 'Bulua',    kind: 'terminal', lat: 8.4903, lng: 124.6229 },
    { id: 'pl-div',    name: 'Divisoria Park',        area: 'Poblacion',kind: 'landmark', lat: 8.4838, lng: 124.6470 },
    { id: 'pl-limket', name: 'Limketkai Center',      area: 'Lapasan',  kind: 'mall',     lat: 8.4810, lng: 124.6510 },
    { id: 'pl-xu',     name: 'Xavier University',     area: 'Poblacion',kind: 'school',   lat: 8.4857, lng: 124.6441 },
    { id: 'pl-liceo',  name: 'Liceo de Cagayan University', area: 'Kauswagan', kind: 'school', lat: 8.4788, lng: 124.6453 },
    { id: 'pl-centrio',name: 'Centrio Mall',          area: 'Poblacion',kind: 'mall',     lat: 8.4840, lng: 124.6460 },
    { id: 'pl-nmmc',   name: 'NMMC',                  area: 'Poblacion',kind: 'hospital', lat: 8.4875, lng: 124.6468 },
    { id: 'pl-cityhall',name:'Cagayan de Oro City Hall',area:'Poblacion',kind:'government',lat: 8.4843, lng: 124.6475 },
    { id: 'pl-gaisano',name: 'Gaisano City Mall',     area: 'Cogon',    kind: 'mall',     lat: 8.4825, lng: 124.6490 },
    { id: 'pl-sm',     name: 'SM CDO Downtown',       area: 'Cogon',    kind: 'mall',     lat: 8.4835, lng: 124.6485 },
    { id: 'pl-camp',   name: 'Camp Evangelista',       area: 'Patag',    kind: 'landmark', lat: 8.4940, lng: 124.6370 },
  ];

  for (const p of places) {
    await pool.execute(
      `INSERT INTO places (id, name, area, kind, map_x, map_y, lat, lng)
       VALUES (?, ?, ?, ?, 0, 0, ?, ?)
       ON DUPLICATE KEY UPDATE name=VALUES(name), lat=VALUES(lat), lng=VALUES(lng)`,
      [p.id, p.name, p.area, p.kind, p.lat, p.lng]
    );
  }
  console.log(`  ✓ Inserted ${places.length} places`);
  return places;
}

async function insertMajorRoads(pool) {
  console.log('Inserting major roads...');
  const roads = [
    { id: 'rd-cmrecto',   name: 'CM Recto Ave' },
    { id: 'rd-jrborja',   name: 'JR Borja Ave' },
    { id: 'rd-corrales',  name: 'Corrales Ave' },
    { id: 'rd-hayes',     name: 'Hayes St' },
    { id: 'rd-masterson', name: 'Masterson Ave' },
    { id: 'rd-rnpelaez',  name: 'RN Pelaez Blvd' },
    { id: 'rd-vamenta',   name: 'Vamenta Blvd' },
    { id: 'rd-pnroa',     name: 'PN Roa Ave' },
    { id: 'rd-velez',     name: 'A. Velez St' },
    { id: 'rd-capistrano',name: 'Capistrano St' },
    { id: 'rd-osmena',    name: 'Osmeña St' },
    { id: 'rd-yacapin',   name: 'Yacapin St' },
    { id: 'rd-valenzuela',name: 'Valenzuela Ave' },
    { id: 'rd-limketkai', name: 'Limketkai Drive' },
    { id: 'rd-saarenas',  name: 'Saarenas Ave' },
    { id: 'rd-cdiel',     name: 'C. Diel St' },
    { id: 'rd-villarin',  name: 'Villarin St' },
    { id: 'rd-suniel',    name: 'Max Suniel St' },
    { id: 'rd-macapagal', name: 'Macapagal Road' },
    { id: 'rd-sanpedro',  name: 'San Pedro St' },
    { id: 'rd-coastal',   name: 'Coastal Road' },
    { id: 'rd-national',  name: 'National Highway / Sayre Highway' },
  ];

  for (const r of roads) {
    await pool.execute(
      `INSERT INTO major_roads (id, name) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE name=VALUES(name)`,
      [r.id, r.name]
    );
  }
  console.log(`  ✓ Inserted ${roads.length} major roads`);
  return roads;
}

function getTerminalId(destName) {
  const d = (destName || '').toLowerCase();
  if (d.includes('cogon')) return 't-cogon';
  if (d.includes('carmen')) return 't-carmen';
  if (d.includes('agora')) return 't-agora';
  if (d.includes('puerto')) return 't-puerto';
  if (d.includes('westbound') || d.includes('wtpm')) return 't-wtpm';
  if (d.includes('divisoria')) return 't-div';
  if (d.includes('gaisano')) return 't-gaisano';
  if (d.includes('limketkai')) return 't-limket';
  return null;
}

function findMajorRoadIds(streetSequence) {
  const seq = (streetSequence || '').toLowerCase();
  const matched = [];
  const roadMap = {
    'rd-cmrecto': ['cm recto', 'c.m. recto', 'recto ave'],
    'rd-jrborja': ['jr borja', 'j.r. borja', 'borja ave', 'borja st'],
    'rd-corrales': ['corrales'],
    'rd-hayes': ['hayes'],
    'rd-masterson': ['masterson'],
    'rd-rnpelaez': ['rn pelaez', 'r.n. pelaez', 'pelaez blvd'],
    'rd-vamenta': ['vamenta'],
    'rd-pnroa': ['pn roa', 'p.n. roa'],
    'rd-velez': ['velez st', 'a. velez'],
    'rd-osmena': ['osmeña', 'osmena'],
    'rd-yacapin': ['yacapin'],
    'rd-valenzuela': ['valenzuela'],
    'rd-limketkai': ['limketkai'],
    'rd-saarenas': ['saarenas'],
    'rd-cdiel': ['c. diel', 'c.diel'],
    'rd-villarin': ['villarin'],
    'rd-suniel': ['suniel', 'm. suniel', 'max suniel'],
    'rd-macapagal': ['macapagal'],
    'rd-sanpedro': ['san pedro'],
    'rd-coastal': ['coastal'],
    'rd-national': ['national highway', 'sayre highway'],
  };

  for (const [id, aliases] of Object.entries(roadMap)) {
    for (const alias of aliases) {
      if (seq.includes(alias)) {
        matched.push(id);
        break;
      }
    }
  }
  return matched;
}

async function insertFareRule(pool) {
  // Ensure fare rule exists
  const [[existing]] = await pool.execute('SELECT COUNT(*) cnt FROM fare_rules WHERE is_current = 1');
  if (existing.cnt === 0) {
    await pool.execute(
      `INSERT INTO fare_rules (minimum, minimum_km, per_km, discount_rate, effective_from, is_current)
       VALUES (13.00, 4.00, 1.80, 0.200, '2024-01-01', 1)`
    );
    console.log('  ✓ Inserted fare rule');
  }
}

// ─── MAIN SEEDER ──────────────────────────────────────────────

async function main() {
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║  OroRuta LPTRP Route Seeder                     ║');
  console.log('║  Source: CDO LPTRP Districts 1 & 2              ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log('');

  if (DRY_RUN) console.log('🔍 DRY RUN MODE — no database changes\n');
  if (SKIP_GEOMETRY) console.log('⏭  Skipping OSRM geometry generation\n');

  // 1. Parse routes
  const rawRoutesPath = path.join(__dirname, 'raw_routes.txt');
  console.log(`Parsing routes from ${rawRoutesPath}...`);
  const routes = parseRawRoutes(rawRoutesPath);
  console.log(`  ✓ Parsed ${routes.length} routes\n`);

  if (DRY_RUN) {
    console.log('Parsed routes:');
    routes.forEach((r, i) => {
      console.log(`  ${i + 1}. [D${r.district}] ${r.code}: ${r.origin} → ${r.destination} (In: ${r.inbound.distanceKm}km, Out: ${r.outbound.distanceKm}km)`);
    });
    return;
  }

  // 2. Connect to DB
  console.log('Connecting to database...');
  const pool = mysql.createPool(DB_CONFIG);
  await pool.execute('SELECT 1'); // Test connection
  console.log('  ✓ Connected\n');

  try {
    // 3. Run migration
    await runMigration(pool);

    // 4. Clear existing data
    await clearExistingData(pool);

    // 5. Insert base data
    await insertTerminals(pool);
    await insertPlaces(pool);
    await insertMajorRoads(pool);
    await insertFareRule(pool);

    // 6. Process each route
    console.log(`\nProcessing ${routes.length} routes...\n`);

    const summary = { imported: 0, withGeometry: 0, unverified: [], errors: [] };

    for (let i = 0; i < routes.length; i++) {
      const r = routes[i];
      const routeId = `lptrp-${r.code.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
      const color = ROUTE_COLORS[i % ROUTE_COLORS.length];

      console.log(`[${i + 1}/${routes.length}] ${r.code}: ${r.origin} → ${r.destination}`);

      try {
        // Insert route
        await pool.execute(
          `INSERT INTO routes (id, code, name, origin, destination, jeepney_type, description,
            inbound_distance_km, outbound_distance_km, status, verification_status, color,
            offline_size_mb, district, source_reference, lptrp_name, last_updated_at)
           VALUES (?, ?, ?, ?, ?, 'Traditional', ?, ?, ?, 'Active', ?, ?, 0.5, ?, ?, ?, NOW())
           ON DUPLICATE KEY UPDATE
             name=VALUES(name), origin=VALUES(origin), destination=VALUES(destination),
             inbound_distance_km=VALUES(inbound_distance_km),
             outbound_distance_km=VALUES(outbound_distance_km)`,
          [
            routeId,
            r.code,
            `${r.barangay} – ${r.destination}`,
            r.origin,
            r.destination,
            `LPTRP District ${r.district}: ${r.lptrpName}`,
            r.inbound.distanceKm,
            r.outbound.distanceKm,
            'PENDING_VERIFICATION', // Until geometry is verified
            color,
            r.district,
            `https://sites.google.com/view/cdo-routes-lptrp/district-${r.district}`,
            r.lptrpName,
          ]
        );

        // Insert route directions
        if (r.inbound.streetSequence) {
          const dirId = `${routeId}-inbound`;
          await pool.execute(
            `INSERT INTO route_directions (id, route_id, direction, distance_km, street_sequence)
             VALUES (?, ?, 'Inbound', ?, ?)
             ON DUPLICATE KEY UPDATE distance_km=VALUES(distance_km), street_sequence=VALUES(street_sequence)`,
            [dirId, routeId, r.inbound.distanceKm, r.inbound.streetSequence]
          );
        }
        if (r.outbound.streetSequence) {
          const dirId = `${routeId}-outbound`;
          await pool.execute(
            `INSERT INTO route_directions (id, route_id, direction, distance_km, street_sequence)
             VALUES (?, ?, 'Outbound', ?, ?)
             ON DUPLICATE KEY UPDATE distance_km=VALUES(distance_km), street_sequence=VALUES(street_sequence)`,
            [dirId, routeId, r.outbound.distanceKm, r.outbound.streetSequence]
          );
        }

        // Link to terminals
        const destTermId = getTerminalId(r.destination);
        const origTermId = getTerminalId(r.origin);
        if (origTermId) {
          await pool.execute(
            `INSERT IGNORE INTO route_terminals (route_id, terminal_id, seq) VALUES (?, ?, 1)`,
            [routeId, origTermId]
          );
        }
        if (destTermId && destTermId !== origTermId) {
          await pool.execute(
            `INSERT IGNORE INTO route_terminals (route_id, terminal_id, seq) VALUES (?, ?, 2)`,
            [routeId, destTermId]
          );
        }

        // Link to major roads
        const allStreets = `${r.inbound.streetSequence} ${r.outbound.streetSequence}`;
        const roadIds = findMajorRoadIds(allStreets);
        for (let ri = 0; ri < roadIds.length; ri++) {
          await pool.execute(
            `INSERT IGNORE INTO route_major_roads (route_id, road_id, seq) VALUES (?, ?, ?)`,
            [routeId, roadIds[ri], ri + 1]
          );
        }

        // Generate geometry via OSRM
        let hasGeometry = false;
        if (!SKIP_GEOMETRY) {
          // Inbound geometry
          if (r.inbound.streets.length >= 2) {
            console.log(`  Generating inbound geometry (${r.inbound.streets.length} streets)...`);
            const waypoints = await getRouteWaypoints(r.inbound.streets);
            if (waypoints.length >= 2) {
              const result = await getOSRMGeometry(waypoints);
              if (result && result.geometry) {
                const geomId = `${routeId}-geom-inbound`;
                await pool.execute(
                  `INSERT INTO route_geometry (id, route_id, direction, geometry, geometry_status, generated_at)
                   VALUES (?, ?, 'Inbound', ?, 'GENERATED', NOW())
                   ON DUPLICATE KEY UPDATE geometry=VALUES(geometry), geometry_status='GENERATED', generated_at=NOW()`,
                  [geomId, routeId, JSON.stringify(result.geometry)]
                );

                // Also insert path points from geometry
                if (result.geometry.coordinates) {
                  // Sample every Nth point to keep manageable
                  const coords = result.geometry.coordinates;
                  const step = Math.max(1, Math.floor(coords.length / 50));
                  for (let ci = 0; ci < coords.length; ci += step) {
                    await pool.execute(
                      `INSERT INTO route_path_points (route_id, direction, seq, map_x, map_y, lat, lng)
                       VALUES (?, 'Inbound', ?, 0, 0, ?, ?)`,
                      [routeId, Math.floor(ci / step), coords[ci][1], coords[ci][0]]
                    );
                  }
                  // Always include last point
                  const last = coords[coords.length - 1];
                  await pool.execute(
                    `INSERT INTO route_path_points (route_id, direction, seq, map_x, map_y, lat, lng)
                     VALUES (?, 'Inbound', ?, 0, 0, ?, ?)`,
                    [routeId, 999, last[1], last[0]]
                  );
                }

                hasGeometry = true;
                console.log(`  ✓ Inbound geometry: ${result.geometry.coordinates.length} points, ${(result.distanceMeters / 1000).toFixed(1)}km`);
              }
            }
          }

          // Outbound geometry
          if (r.outbound.streets.length >= 2) {
            console.log(`  Generating outbound geometry (${r.outbound.streets.length} streets)...`);
            const waypoints = await getRouteWaypoints(r.outbound.streets);
            if (waypoints.length >= 2) {
              const result = await getOSRMGeometry(waypoints);
              if (result && result.geometry) {
                const geomId = `${routeId}-geom-outbound`;
                await pool.execute(
                  `INSERT INTO route_geometry (id, route_id, direction, geometry, geometry_status, generated_at)
                   VALUES (?, ?, 'Outbound', ?, 'GENERATED', NOW())
                   ON DUPLICATE KEY UPDATE geometry=VALUES(geometry), geometry_status='GENERATED', generated_at=NOW()`,
                  [geomId, routeId, JSON.stringify(result.geometry)]
                );

                // Path points for outbound
                if (result.geometry.coordinates) {
                  const coords = result.geometry.coordinates;
                  const step = Math.max(1, Math.floor(coords.length / 50));
                  for (let ci = 0; ci < coords.length; ci += step) {
                    await pool.execute(
                      `INSERT INTO route_path_points (route_id, direction, seq, map_x, map_y, lat, lng)
                       VALUES (?, 'Outbound', ?, 0, 0, ?, ?)`,
                      [routeId, Math.floor(ci / step), coords[ci][1], coords[ci][0]]
                    );
                  }
                  const last = coords[coords.length - 1];
                  await pool.execute(
                    `INSERT INTO route_path_points (route_id, direction, seq, map_x, map_y, lat, lng)
                     VALUES (?, 'Outbound', ?, 0, 0, ?, ?)`,
                    [routeId, 999, last[1], last[0]]
                  );
                }

                console.log(`  ✓ Outbound geometry: ${result.geometry.coordinates.length} points, ${(result.distanceMeters / 1000).toFixed(1)}km`);
              }
            }
          }
        }

        // Insert loading points at origin and destination
        const origCoords = await geocodeLocation(r.inbound.origin || r.origin);
        const destCoords = await geocodeLocation(r.inbound.destination || r.destination);

        if (origCoords) {
          await pool.execute(
            `INSERT INTO loading_points (id, route_id, name, note, point_type, direction, map_x, map_y, lat, lng)
             VALUES (?, ?, ?, 'Origin loading point', 'loading', 'Inbound', 0, 0, ?, ?)`,
            [`lp-${routeId}-orig`, routeId, `${r.origin} Loading`, origCoords[0], origCoords[1]]
          );
        }
        if (destCoords) {
          await pool.execute(
            `INSERT INTO loading_points (id, route_id, name, note, point_type, direction, map_x, map_y, lat, lng)
             VALUES (?, ?, ?, 'Destination unloading point', 'unloading', 'Inbound', 0, 0, ?, ?)`,
            [`lp-${routeId}-dest`, routeId, `${r.destination} Unloading`, destCoords[0], destCoords[1]]
          );
        }

        // Update verification status based on geometry
        if (hasGeometry) {
          await pool.execute(
            `UPDATE routes SET verification_status = 'PUBLISHED' WHERE id = ?`,
            [routeId]
          );
          summary.withGeometry++;
        } else {
          summary.unverified.push(`${r.code}: ${r.lptrpName}`);
        }

        summary.imported++;
        console.log(`  ✓ Route inserted ${hasGeometry ? '(with geometry)' : '(no geometry – needs review)'}\n`);

      } catch (err) {
        console.error(`  ✗ Error: ${err.message}\n`);
        summary.errors.push(`${r.code}: ${err.message}`);
      }
    }

    // ── PRINT SUMMARY ──
    console.log('\n═══════════════════════════════════════════════');
    console.log('IMPORT SUMMARY');
    console.log('═══════════════════════════════════════════════');
    console.log(`Total routes parsed:    ${routes.length}`);
    console.log(`Routes imported:        ${summary.imported}`);
    console.log(`Routes with geometry:   ${summary.withGeometry} (PUBLISHED)`);
    console.log(`Routes needing review:  ${summary.unverified.length} (PENDING_VERIFICATION)`);
    console.log(`Errors:                 ${summary.errors.length}`);

    if (summary.unverified.length > 0) {
      console.log('\nRoutes requiring manual geometry verification:');
      summary.unverified.forEach(r => console.log(`  ⚠ ${r}`));
    }

    if (summary.errors.length > 0) {
      console.log('\nErrors:');
      summary.errors.forEach(e => console.log(`  ✗ ${e}`));
    }

    // Save summary to file
    const summaryPath = path.join(__dirname, 'seed_summary.json');
    fs.writeFileSync(summaryPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      totalParsed: routes.length,
      imported: summary.imported,
      withGeometry: summary.withGeometry,
      unverified: summary.unverified,
      errors: summary.errors,
      routes: routes.map(r => ({
        code: r.code,
        name: r.lptrpName,
        district: r.district,
        inboundKm: r.inbound.distanceKm,
        outboundKm: r.outbound.distanceKm,
      })),
    }, null, 2));
    console.log(`\nSummary saved to ${summaryPath}`);

  } finally {
    await pool.end();
    console.log('\n✓ Database connection closed');
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

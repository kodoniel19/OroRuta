const https = require('https');
const fs = require('fs');
const path = require('path');
const db = require('../src/config/db');

// List of all 50 authoritative Google My Maps from the user prompt
const MAPS = [
  { mid: '1TtpHJrwjsjJWTLMztryGFYHPDvKpWQ8', label: 'Baikingon - Carmen Public Market', code: 'R-BAI', name: 'Baikingon (R-BAI)' },
  { mid: '1-4Or6Z-3qcUHDdG9_sOBZjAxat9UOBA', label: 'Balulang (R1) Centro – Carmen Public Market', code: 'R-BAL', name: 'Balulang R1 Centro (R-BAL)' },
  { mid: '15gwsYr9oqdLnmm2MHhbIhFX9b46rERQ', label: 'Balulang (R2) Villa Verde – Cogon Public Market', code: 'R2', name: 'Balulang (R2) Villa Verde' },
  { mid: '1uHhE9sguyeVcd9Or7XZChovHh2XaCrI', label: 'Balulang (R3) Xavier Heights – Cogon Public Market', code: 'R3', name: 'Balulang (R3) Xavier Heights' },
  { mid: '1fzRi8V_OanW0qwmGQpCL8lBPyCoJ9-s', label: 'Bayabas (R1) – Cogon Public Market', code: 'R1', name: 'Bayabas (R1)' },
  { mid: '1S8vMzhu4REZza3wUvN7C3sF8BPjFynA', label: 'Bayabas (R2) – Carmen Public Market', code: 'R2', name: 'Bayabas (R2)' },
  { mid: '1LZtRJ6OPcJ7hdW9fh6nzOCY1varBR4k', label: 'Bayabas (R3) – Carmen Public Market', code: 'R3', name: 'Bayabas (R3)' },
  { mid: '1ycyKmc9oAVeCuIwMduyOid9mGTwGUHg', label: 'Bayabas (R4) – Carmen Public Market', code: 'R4', name: 'Bayabas (R4)' },
  { mid: '1zrG3Bto-2HBwsal5rko6IknZaNp9fjU', label: 'Bayabas (R5) – Agora Market City and Terminal', code: 'R5', name: 'Bayabas (R5)' },
  { mid: '1aGBYq0t-J_Mpt3sGEsT7QopBnYFsBYs', label: 'Bonbon (R1) - Cogon Public Market', code: 'R-BON-COG', name: 'Bonbon–Cogon Loop Line' },
  { mid: '1SRQexM1A2rhJa9IngSrivkmhKcy1590', label: 'Bonbon (R2) – Carmen Public Market', code: 'R2', name: 'Bonbon (R2)' },
  { mid: '1K0VYe239AbN_Lg-iiFqcq7HWdG9Hcvk', label: 'Bonbon (R3) – Agora Market City and Terminal', code: 'R3', name: 'Bonbon (R3)' },
  { mid: '1iV8tfOFHcZavsxo44OtEaEHkN4qgTGQ', label: 'Bonbon (R4) – Carmen Public Market', code: 'R4', name: 'Bonbon (R4)' },
  { mid: '19nKBKwH19kU0YJzPdowxlfPS9EKTGNQ', label: 'Bulua (R1) – Agora Market City and Terminal', code: 'R1', name: 'Bulua (R1)' },
  { mid: '1SZiU99oTddsd2INzZCC-GJQUBzvwLsk', label: 'Bulua (R2) – Agora Market City and Terminal', code: 'R2', name: 'Bulua (R2)' },
  { mid: '1n_3ZExYSgHmpFYKIKuQLAK-Ril_fShU', label: 'Bulua (R3) – Carmen Public Market', code: 'R3', name: 'Bulua (R3)' },
  { mid: '1qzNUdE5mDrHmbWVo60g_IGOhBntzRtw', label: 'Bulua (R4) – Cogon Public Market', code: 'R4', name: 'Bulua (R4)' },
  { mid: '13ubt3mGeuFAjILaVz4hafRN6frZry4A', label: 'Bulua (R5) – Divisoria Park', code: 'R5', name: 'Bulua (R5)' },
  { mid: '1nN-upCvAWAzqaNqzs48MhHAadKafihM', label: 'Bulua (R6) – Carmen Public Market', code: 'R6', name: 'Bulua (R6)' },
  { mid: '1MiHNigms9rrA5hVxqh5uvQjFnxUtXZk', label: 'Bulua (R7) Terry Hills Subdivision', code: 'R7', name: 'Bulua (R7)' },
  { mid: '1trrNmgPA9Vck7mI2HNkzLL2D69nrUq0', label: 'Canitoan (R1) – Cogon Public Market', code: 'R1', name: 'Canitoan (R1)' },
  { mid: '1gy1cabU8PYV99tzcdXjkFkXTLlUBR18', label: 'Canitoan (R2) Calaanan (Relocation) – Cogon Public Market', code: 'R2', name: 'Canitoan (R2) Calaanan (Relocation)' },
  { mid: '1G25RJ_E9jh5q-yw1QjE7Qbo0tFexkk0', label: 'Carmen (R1) Silver Creek Subdivision – Cogon Public Market', code: 'R1', name: 'Carmen (R1) Silver Creek Subdivision' },
  { mid: '1BojYpsfy6YA5rTcxmtQFSWviTM0WOuY', label: 'Carmen (R2) San Agustin – Cogon Public Market', code: 'R2', name: 'Carmen (R2) San Agustin' },
  { mid: '1g2H-H6qyyTSDwbMc1Ya1Vmzt7YD8bz4', label: 'Carmen (R3) Pueblo de Oro (Xavier Estates Gate 3) – Carmen Public Market', code: 'R3', name: 'Carmen (R3) Pueblo de Oro (Xavier Estates Gate 3)' },
  { mid: '1SGE7SLQH7Qpx2bnGxamfza3j8YEK7gY', label: 'Carmen (R4) Pueblo de Oro (Xavier Estates Gate 3) – Agora Market City and Terminal', code: 'R4', name: 'Carmen (R4) Pueblo de Oro (Xavier Estates Gate 3)' },
  { mid: '1yeCi5nw9-fvAjM8Q33W3oWuGiwQdt5U', label: 'Carmen (R5) Carmen Public Market – Agora Market City and Terminal', code: 'R5', name: 'Carmen (R5) Carmen Public Market' },
  { mid: '1Q1_RWcZMRheFAnVbASdUnjDHJYUSs2k', label: 'Carmen (R6) Zone 10 – Cogon Public Market', code: 'R6', name: 'Carmen (R6) Zone 10' },
  { mid: '1LGnnmNLQkOY-GeYGuhI3LeRGUsF5xIM', label: 'Dansolihon (R1) – Carmen Public Market', code: 'R1', name: 'Dansolihon (R1)' },
  { mid: '1RPWpGWQewqbY2fNQNN0-c4_2sqkvNnA', label: 'Dansolihon (R2) – Carmen Public Market', code: 'R2', name: 'Dansolihon (R2)' },
  { mid: '14YSK9NP5exvZ3tPpJVeJz8hTbqb0V_U', label: 'Iponan (R1) Bulao – Carmen Public Market', code: 'R1', name: 'Iponan (R1) Bulao' },
  { mid: '12KOr6H-lR0Pa21LdLuZedqf3-uXdHhw', label: 'Iponan (R3) Kinasanghan Iponan – Limketkai via Agora Market City and Terminal', code: 'R3', name: 'Iponan (R3) Kinasanghan Iponan' },
  { mid: '1ki552DiWKfQkEhUawfh7Gqvdp-dm6ng', label: 'Iponan (R4) Kisanlu/Regency – Gaisano City', code: 'R4', name: 'Iponan (R4) Kisanlu/Regency' },
  { mid: '1T6Jg7nbbnNeCTG6g595jFq7UDO384no', label: 'Iponan (R5) Bulao – Cogon Public Market', code: 'R5', name: 'Iponan (R5) Bulao' },
  { mid: '1tJ1SPCTYKbnR_oBhajCszoLB78eYqFQ', label: 'Kauswagan (R1) NHA – Agora Terminal', code: 'R1', name: 'Kauswagan (R1) NHA' },
  { mid: '1Oz799snyviXfzJbbwbqTr9k_WAYUlTc', label: 'Kauswagan (R2) NHA – Carmen Public Market', code: 'R2', name: 'Kauswagan (R2) NHA' },
  { mid: '1xmKwEr_ymbTh_D5Td-9Q9gjAkUZC-n0', label: 'Kauswagan (R3) – Carmen Public Market', code: 'R3', name: 'Kauswagan (R3)' },
  { mid: '1sDL1RYZ_P-NjetH9N5JSI2oKlP9YLlU', label: 'Lumbia (R1) – Cogon Public Market', code: 'R1', name: 'Lumbia (R1)' },
  { mid: '1P9XvheMsObLlAh9rFL96IAmJSPs5Hgk', label: 'Lumbia (R2) – Carmen Public Market', code: 'R2', name: 'Lumbia (R2)' },
  { mid: '1-8dfJNNClNNmNuX4Vr6H3K9FV3byrfg', label: 'Lumbia (R3) Gran Europa – Carmen Public Market', code: 'R3', name: 'Lumbia (R3) Gran Europa' },
  { mid: '1RDNOfmbPlI9lPImz-sLKS70s79HSxSk', label: 'Lumbia (R4) Gran Europa – Cogon Public Market', code: 'R4', name: 'Lumbia (R4) Gran Europa' },
  { mid: '1aJvaW4dRdTpoeaZ8vzFtlLzJ8FBwir4', label: 'Pagatpat (R1) Centro – Westbound Terminal', code: 'R1', name: 'Pagatpat (R1) Centro' },
  { mid: '1jesthiEXd9h5Dt2Ojwx4kNPphBkf-Jg', label: 'Pagatpat (R2) – Carmen Public Market', code: 'R2', name: 'Pagatpat (R2)' },
  { mid: '1gf2sdN-vH_EroX3RbPRnx9k0ONPLML4', label: 'Pagatpat (R3) Pamalihi – Carmen Public Market', code: 'R3', name: 'Pagatpat (R3) Pamalihi' },
  { mid: '14XIiHN5Yge3Op6yRfY8fS4onQ1fUGpw', label: 'Patag Camp Evangelista – Divisoria Park', code: 'R-PAT', name: 'Patag Camp Evangelsita (R-PAT)' },
  { mid: '1OsV6p0J7H57xU9I9rCEb6hlwlj6f574', label: 'San Simon – Carmen Public Market', code: 'R-SAN', name: 'San Simon (R-SAN)' },
  { mid: '1yK65VDqFOCAfP81iKI14lZKt0ZGSCWA', label: 'Taglimao – Carmen Public Market', code: 'R-TAGL', name: 'Taglimao (R-TAGL)' },
  { mid: '1-xAGL4IsUe-Mp9-T9bkQO4iYZCRl87U', label: 'Tuburan – Carmen Public Market', code: 'R-TUB', name: 'Tuburan (R-TUB)' },
  { mid: '1uFSOK2cAsjsq6qLkeDzo4mTUZpQW0wY', label: 'Tagpangi – Carmen Public Market', code: 'R-TAG', name: 'Tagpangi (R-TAG)' },
  { mid: '1jwpsq9nK2jl-Rw7as0IGSNXdNuU3-bA', label: 'Tumpagon – Carmen Public Market', code: 'R-TUM', name: 'Tumpagon (R-TUM)' },
];

// Helper: Haversine distance in km
function distanceKm(a, b) {
  const R = 6371;
  const dLat = ((b[1] - a[1]) * Math.PI) / 180;
  const dLng = ((b[0] - a[0]) * Math.PI) / 180;
  const lat1 = (a[1] * Math.PI) / 180;
  const lat2 = (b[1] * Math.PI) / 180;
  const sinDlat = Math.sin(dLat / 2);
  const sinDlng = Math.sin(dLng / 2);
  const h = sinDlat * sinDlat + Math.cos(lat1) * Math.cos(lat2) * sinDlng * sinDlng;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function calculatePathDistanceKm(coords) {
  if (!coords || coords.length < 2) return 0;
  let total = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    total += distanceKm(coords[i], coords[i + 1]);
  }
  return Number(total.toFixed(2));
}

// Fetch KML from Google My Maps with retry
function fetchKml(mid, retries = 3) {
  return new Promise((resolve, reject) => {
    const url = `https://www.google.com/maps/d/kml?mid=${mid}&forcekml=1`;
    const req = https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        https.get(res.headers.location, (redir) => {
          let data = '';
          redir.on('data', chunk => data += chunk);
          redir.on('end', () => resolve(data));
        }).on('error', (err) => {
          if (retries > 0) return resolve(fetchKml(mid, retries - 1));
          reject(err);
        });
        return;
      }
      if (res.statusCode !== 200) {
        if (retries > 0) return resolve(fetchKml(mid, retries - 1));
        return reject(new Error(`HTTP ${res.statusCode} for mid ${mid}`));
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    req.on('error', (err) => {
      if (retries > 0) return resolve(fetchKml(mid, retries - 1));
      reject(err);
    });
    req.setTimeout(25000, () => {
      req.destroy();
      if (retries > 0) return resolve(fetchKml(mid, retries - 1));
      reject(new Error(`Timeout for mid ${mid}`));
    });
  });
}

function parseCoordinates(coordString) {
  return coordString
    .trim()
    .split(/\s+/)
    .map(p => {
      const parts = p.split(',').map(Number);
      if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        // [lng, lat]
        return [Number(parts[0].toFixed(6)), Number(parts[1].toFixed(6))];
      }
      return null;
    })
    .filter(Boolean);
}

function parseKml(kmlText) {
  const placemarks = [];
  const pmMatches = kmlText.match(/<Placemark>[\s\S]*?<\/Placemark>/g) || [];

  for (const pm of pmMatches) {
    const nameMatch = pm.match(/<name>(.*?)<\/name>/);
    const descMatch = pm.match(/<description>([\s\S]*?)<\/description>/);
    const name = nameMatch ? nameMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim() : '';
    const desc = descMatch ? descMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim() : '';

    const lineMatch = pm.match(/<LineString>[\s\S]*?<coordinates>([\s\S]*?)<\/coordinates>[\s\S]*?<\/LineString>/);
    const pointMatch = pm.match(/<Point>[\s\S]*?<coordinates>([\s\S]*?)<\/coordinates>[\s\S]*?<\/Point>/);

    if (lineMatch) {
      const coords = parseCoordinates(lineMatch[1]);
      placemarks.push({ type: 'LineString', name, desc, coordinates: coords });
    } else if (pointMatch) {
      const coords = parseCoordinates(pointMatch[1]);
      if (coords.length > 0) {
        placemarks.push({ type: 'Point', name, desc, coordinate: coords[0] });
      }
    }
  }

  return placemarks;
}

// Ensure the 3 missing LPTRP routes exist in DB
async function ensureMissingRoutesExist(routes) {
  const missingDefinitions = [
    {
      id: 'carmen-r1-silver-creek',
      code: 'R1',
      name: 'Carmen (R1) Silver Creek Subdivision',
      origin: 'Carmen  Silver Creek Subdivision',
      destination: 'Cogon Public Market',
      jeepney_type: 'Traditional',
      description: 'Silver Creek Subdivision to Cogon Public Market via Masterson Ave, Kagay-an Bridge, and Nazareth.',
      color: '#E11D48',
    },
    {
      id: 'iponan-r4-kisanlu-regency',
      code: 'R4',
      name: 'Iponan (R4) Kisanlu/Regency',
      origin: 'Iponan  Kisanlu/Regency',
      destination: 'Gaisano City',
      jeepney_type: 'Traditional',
      description: 'Kisanlu Subdivision to Gaisano City via Regency Road, CM Recto Ave, and Marcos Bridge.',
      color: '#0D9488',
    },
    {
      id: 'taglimao-r-tagl',
      code: 'R-TAGL',
      name: 'Taglimao (R-TAGL)',
      origin: 'Taglimao',
      destination: 'Carmen Public Market',
      jeepney_type: 'Traditional',
      description: 'Centro Brgy. Taglimao to Carmen Public Market via Taglimao Road, Pagalungan Road, Masterson Ave, and Villarin St.',
      color: '#D97706',
    },
  ];

  for (const def of missingDefinitions) {
    const existing = routes.find(r => r.name.toLowerCase() === def.name.toLowerCase() || r.id === def.id);
    if (!existing) {
      console.log(`Creating missing route record: [${def.id}] ${def.name}`);
      await db.execute(
        `INSERT INTO routes (id, code, name, origin, destination, jeepney_type, description, color, status, verification_status, last_updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Active', 'VERIFIED', NOW())`,
        [def.id, def.code, def.name, def.origin, def.destination, def.jeepney_type, def.description, def.color]
      );
      routes.push({ ...def, status: 'Active', verification_status: 'VERIFIED' });
    }
  }
}

async function backupDatabase() {
  console.log('--- Step 1: Backing up database tables ---');
  try {
    await db.query(`DROP TABLE IF EXISTS route_geometry_backup_mymaps;`);
    await db.query(`CREATE TABLE route_geometry_backup_mymaps AS SELECT * FROM route_geometry;`);
    console.log('✓ Created route_geometry_backup_mymaps');

    await db.query(`DROP TABLE IF EXISTS route_path_points_backup_mymaps;`);
    await db.query(`CREATE TABLE route_path_points_backup_mymaps AS SELECT * FROM route_path_points;`);
    console.log('✓ Created route_path_points_backup_mymaps');

    await db.query(`DROP TABLE IF EXISTS routes_backup_mymaps;`);
    await db.query(`CREATE TABLE routes_backup_mymaps AS SELECT * FROM routes;`);
    console.log('✓ Created routes_backup_mymaps');
  } catch (err) {
    console.error('Backup error:', err);
    throw err;
  }
}

async function run() {
  console.log('====================================================');
  console.log('  ORORUTA GOOGLE MY MAPS IMPORT & VERIFICATION');
  console.log('====================================================\n');

  await backupDatabase();

  console.log('\n--- Step 2: Loading routes & ensuring completeness ---');
  const [routes] = await db.query('SELECT * FROM routes');
  await ensureMissingRoutesExist(routes);

  console.log(`\n--- Step 3: Processing all ${MAPS.length} Google My Maps ---`);

  const results = {
    totalMaps: MAPS.length,
    processed: 0,
    matched: 0,
    updated: 0,
    totalCoords: 0,
    totalStops: 0,
    failures: [],
    details: [],
  };

  const uuidv4 = () => 'geom-' + Math.random().toString(36).substring(2, 10) + '-' + Date.now();

  for (let i = 0; i < MAPS.length; i++) {
    const item = MAPS[i];
    console.log(`\n[${i + 1}/${MAPS.length}] Processing "${item.label}" (mid: ${item.mid})...`);

    // Match route
    let route = routes.find(r => r.name.toLowerCase().trim() === item.name.toLowerCase().trim());
    if (!route) {
      route = routes.find(r => {
        const itemWords = item.name.toLowerCase().split(/[\s()–-]+/).filter(w => w.length > 2);
        const rWords = r.name.toLowerCase().split(/[\s()–-]+/).filter(w => w.length > 2);
        const overlap = itemWords.filter(w => rWords.includes(w));
        return overlap.length >= 2;
      });
    }

    if (!route) {
      console.error(`  ✗ ERROR: Could not find database route for "${item.label}"`);
      results.failures.push({ map: item, reason: 'Route not found in database' });
      continue;
    }

    results.matched++;
    console.log(`  ✓ Matched with DB Route [${route.id}]: "${route.name}"`);

    // Fetch KML
    let kmlText = '';
    try {
      kmlText = await fetchKml(item.mid);
    } catch (fetchErr) {
      console.error(`  ✗ ERROR: Failed to fetch KML for ${item.label}:`, fetchErr.message);
      results.failures.push({ map: item, routeId: route.id, reason: `Fetch error: ${fetchErr.message}` });
      continue;
    }

    // Parse KML
    const placemarks = parseKml(kmlText);
    const lineStrings = placemarks.filter(p => p.type === 'LineString');
    const pointPlacemarks = placemarks.filter(p => p.type === 'Point');

    if (lineStrings.length === 0) {
      console.error(`  ✗ ERROR: No LineString geometry found in KML for ${item.label}`);
      results.failures.push({ map: item, routeId: route.id, reason: 'No LineString geometry in KML' });
      continue;
    }

    console.log(`  -> Found ${lineStrings.length} LineString(s), ${pointPlacemarks.length} Point(s)`);

    // Determine Inbound and Outbound LineStrings
    let inboundLine = null;
    let outboundLine = null;

    if (lineStrings.length === 1) {
      inboundLine = lineStrings[0];
      outboundLine = lineStrings[0];
    } else {
      for (const line of lineStrings) {
        const lineNameUpper = line.name.toUpperCase();
        if (lineNameUpper.includes('OUTBOUND') || lineNameUpper.startsWith('DIRECTIONS FROM CARMEN') || lineNameUpper.startsWith('DIRECTIONS FROM COGON') || lineNameUpper.startsWith('DIRECTIONS FROM AGORA') || lineNameUpper.startsWith('DIRECTIONS FROM DIVISORIA') || lineNameUpper.startsWith('DIRECTIONS FROM GAISANO')) {
          if (!outboundLine) outboundLine = line;
        } else if (lineNameUpper.includes('INBOUND')) {
          if (!inboundLine) inboundLine = line;
        }
      }

      // Fallback if direction name wasn't explicit: first is Inbound, second is Outbound
      if (!inboundLine) inboundLine = lineStrings[0];
      if (!outboundLine) outboundLine = lineStrings.length > 1 ? lineStrings[1] : lineStrings[0];
    }

    const inDistance = calculatePathDistanceKm(inboundLine.coordinates);
    const outDistance = calculatePathDistanceKm(outboundLine.coordinates);
    const totalLineCoords = inboundLine.coordinates.length + (outboundLine !== inboundLine ? outboundLine.coordinates.length : 0);

    // Save Inbound geometry to route_geometry
    const inGeoJson = JSON.stringify({
      type: 'LineString',
      coordinates: inboundLine.coordinates, // [[lng, lat], ...]
    });

    const [existingIn] = await db.execute(
      'SELECT id FROM route_geometry WHERE route_id = ? AND direction = "Inbound"',
      [route.id]
    );

    if (existingIn && existingIn.length > 0) {
      await db.execute(
        `UPDATE route_geometry
         SET geometry = ?, geometry_status = 'VERIFIED', generated_at = NOW()
         WHERE route_id = ? AND direction = "Inbound"`,
        [inGeoJson, route.id]
      );
    } else {
      await db.execute(
        `INSERT INTO route_geometry (id, route_id, direction, geometry, geometry_status, generated_at)
         VALUES (?, ?, 'Inbound', ?, 'VERIFIED', NOW())`,
        [uuidv4(), route.id, inGeoJson]
      );
    }

    // Save Outbound geometry to route_geometry
    if (outboundLine) {
      const outGeoJson = JSON.stringify({
        type: 'LineString',
        coordinates: outboundLine.coordinates,
      });

      const [existingOut] = await db.execute(
        'SELECT id FROM route_geometry WHERE route_id = ? AND direction = "Outbound"',
        [route.id]
      );

      if (existingOut && existingOut.length > 0) {
        await db.execute(
          `UPDATE route_geometry
           SET geometry = ?, geometry_status = 'VERIFIED', generated_at = NOW()
           WHERE route_id = ? AND direction = "Outbound"`,
          [outGeoJson, route.id]
        );
      } else {
        await db.execute(
          `INSERT INTO route_geometry (id, route_id, direction, geometry, geometry_status, generated_at)
           VALUES (?, ?, 'Outbound', ?, 'VERIFIED', NOW())`,
          [uuidv4(), route.id, outGeoJson]
        );
      }
    }

    // Save ordered route_path_points (used by nearby and mobile app)
    await db.execute('DELETE FROM route_path_points WHERE route_id = ?', [route.id]);
    const pointsToInsert = inboundLine.coordinates.map((c, idx) => [
      route.id,
      idx,
      c[1], // lat
      c[0], // lng
      0,
      0,
    ]);

    // Batch insert points
    if (pointsToInsert.length > 0) {
      const BATCH_SIZE = 250;
      for (let b = 0; b < pointsToInsert.length; b += BATCH_SIZE) {
        const chunk = pointsToInsert.slice(b, b + BATCH_SIZE);
        const placeholders = chunk.map(() => '(?, ?, ?, ?, ?, ?)').join(', ');
        const flatValues = chunk.flat();
        await db.query(
          `INSERT INTO route_path_points (route_id, seq, lat, lng, map_x, map_y) VALUES ${placeholders}`,
          flatValues
        );
      }
    }

    // Update routes table metadata
    await db.execute(
      `UPDATE routes
       SET inbound_distance_km = ?, outbound_distance_km = ?, verification_status = 'VERIFIED', last_updated_at = NOW()
       WHERE id = ?`,
      [inDistance, outDistance, route.id]
    );

    // Save points / landmarks to transit_locations if present
    for (const pt of pointPlacemarks) {
      if (pt.name && pt.coordinate) {
        const [lng, lat] = pt.coordinate;
        // Check if location already exists nearby (< 30m)
        const [existingLocs] = await db.execute(
          `SELECT id, route_ids FROM transit_locations WHERE ABS(lat - ?) < 0.0003 AND ABS(lng - ?) < 0.0003 LIMIT 1`,
          [lat, lng]
        );

        if (existingLocs && existingLocs.length > 0) {
          const loc = existingLocs[0];
          let rIds = [];
          try {
            rIds = typeof loc.route_ids === 'string' ? JSON.parse(loc.route_ids) : (loc.route_ids || []);
          } catch (e) {}
          if (!rIds.includes(route.id)) {
            rIds.push(route.id);
            await db.execute('UPDATE transit_locations SET route_ids = ? WHERE id = ?', [JSON.stringify(rIds), loc.id]);
          }
        } else {
          // Determine point kind
          let kind = 'loading';
          const nameLower = pt.name.toLowerCase();
          if (nameLower.includes('terminal')) kind = 'terminal';
          else if (nameLower.includes('market') || nameLower.includes('mall') || nameLower.includes('school') || nameLower.includes('church') || nameLower.includes('hospital')) kind = 'landmark';
          else if (nameLower.includes('carmen') || nameLower.includes('cogon') || nameLower.includes('agora')) kind = 'terminal';

          const locId = 'loc-' + Math.random().toString(36).substring(2, 10);
          const safeName = (pt.name || 'Transit Stop').slice(0, 180);
          const safeAddr = (pt.desc || '').slice(0, 180);
          await db.execute(
            `INSERT INTO transit_locations (id, kind, name, address, barangay, lat, lng, route_ids, status, notes)
             VALUES (?, ?, ?, ?, '', ?, ?, ?, 'Active', 'Extracted from Google My Maps verified LPTRP data')`,
            [locId, kind, safeName, safeAddr, lat, lng, JSON.stringify([route.id])]
          );
          results.totalStops++;
        }
      }
    }

    results.processed++;
    results.updated++;
    results.totalCoords += totalLineCoords;

    console.log(`  ✓ Updated route: Inbound ${inDistance} km (${inboundLine.coordinates.length} pts), Outbound ${outDistance} km (${outboundLine.coordinates.length} pts)`);
    results.details.push({
      label: item.label,
      routeId: route.id,
      routeName: route.name,
      inDistance,
      outDistance,
      coordsCount: totalLineCoords,
    });
  }

  console.log('\n====================================================');
  console.log('              IMPORT SUMMARY REPORT');
  console.log('====================================================');
  console.log(`Total Maps in Request:       ${results.totalMaps}`);
  console.log(`Maps Successfully Processed: ${results.processed}`);
  console.log(`Routes Matched:              ${results.matched}`);
  console.log(`Routes Updated in DB:        ${results.updated}`);
  console.log(`Total GPS Coordinates Saved: ${results.totalCoords}`);
  console.log(`New Stops/Landmarks Saved:   ${results.totalStops}`);
  console.log(`Failures/Manual Action Req:  ${results.failures.length}`);

  if (results.failures.length > 0) {
    console.log('\nFailed Routes:');
    results.failures.forEach(f => console.log(`  - ${f.map.label} (mid: ${f.map.mid}): ${f.reason}`));
  }

  // Save report to JSON file
  fs.writeFileSync('scratch/mymaps_import_report.json', JSON.stringify(results, null, 2), 'utf8');
  console.log('\nDetailed report written to scratch/mymaps_import_report.json');
}

run().then(() => process.exit(0)).catch(err => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});

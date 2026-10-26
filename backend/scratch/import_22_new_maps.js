const https = require('https');
const fs = require('fs');
const path = require('path');
const db = require('../src/config/db');

const NEW_MAPS = [
  {
    mid: '1SYsQTJnTEcYVHdgBEUnKXC79mnKcEB4',
    label: 'Balubal (R1) – Puerto Public Market',
    dbId: '6ab4bbb9-0b0d-4392-92c5-886de139ef1b',
    name: 'Balubal (R1)'
  },
  {
    mid: '1Iz6uPzwnVW9jltAu4hNiGi17gKuJZpM',
    label: 'Balubal (R2) – Puerto Public Market',
    dbId: 'be4ced47-a35a-4c38-bc63-3d1a92d1f28c',
    name: 'Balubal (R2)'
  },
  {
    mid: '1HJRJ8iLal_co2SpH55hcchR0D5_zjAM',
    label: 'Bugo (R1) – Agora Market City and Terminal',
    dbId: '7f29e17a-f3e8-46b2-932c-c02377a48da3',
    name: 'Bugo (R1)'
  },
  {
    mid: '1BWMXAQmuc1Zcg9TeqiRjdPg7gPz70Wg',
    label: 'Bugo (R2) – Cogon Public Market',
    dbId: 'eebc29e6-2f6f-4c21-afa4-8348627fe8b7',
    name: 'Bugo (R2)'
  },
  {
    mid: '1b_jy9Qkhb7WVUSZs-2ED2urK05QUUf4',
    label: 'Cugman – Cogon Public Market',
    dbId: '316030ff-4cc4-4138-a08a-abfb6b12bdbb',
    name: 'Cugman (R-CUG)'
  },
  {
    mid: '1PmIw_b1zJyxRDiWCUH_5tL5ftwkn0ks',
    label: 'FS Catanico – Agora Market City and Terminal',
    dbId: 'cfd1871b-76c1-4c6d-a732-91e3abc9fc2e',
    name: 'FS Catanico (R-FS )'
  },
  {
    mid: '1KM3XRg0N9TN2s67vR8xvmAOygI6I65Y',
    label: 'Gusa (R1) – Puerto Public Market',
    dbId: '27664ce0-cf5b-4256-8deb-64da0a65b968',
    name: 'Gusa (R1)'
  },
  {
    mid: '1LSlCQE0ORaSUFQHPSv_CZd45jhVCOj8',
    label: 'Gusa (R2) – Divisoria Park',
    dbId: '306c43f2-66bd-4fa2-b90c-2f4a1ddde665',
    name: 'Gusa (R2)'
  },
  {
    mid: '1h-iKtiI5doxfXnng42FUtUxOi00mtvU',
    label: 'Indahag (R1) – Cogon Public Market',
    dbId: 'caaa37ea-c14f-4653-ba5e-4c162a5dc805',
    name: 'Indahag (R1)'
  },
  {
    mid: '1dN7EhLtbBnJK6_IU4KjNP35amMmW26M',
    label: 'Indahag (R2) – Cogon Public Market',
    dbId: '6be43e1b-1a51-4f3d-9ce5-41d2c41145a6',
    name: 'Indahag (R2)'
  },
  {
    mid: '1CHf--A7mY7oVhWQE55a1yk4jGhv05TQ',
    label: 'Indahag (R3) Taguanao – Cogon Public Market',
    dbId: '3d5d5000-37a0-40a2-854a-559adc221066',
    name: 'Indahag (R3) Taguanao'
  },
  {
    mid: '1lgq8KT9RZYeXfzIOSy7Lk0_qIsUXKpo',
    label: 'Camaman-an (R3) Macapaya – Cogon Public Market',
    dbId: '18e68cfd-1df1-4701-bf40-205b40bdbea4',
    name: 'Camaman-an (R3) Macapaya'
  },
  {
    mid: '1hJke1i4ax8qBcqpNqnH97rrswyOQG_E',
    label: 'Lapasan (R1) – Carmen Public Market',
    dbId: '38f1362f-d2a7-4e36-a989-9e178f2ddfae',
    name: 'Lapasan (R1)'
  },
  {
    mid: '1jhRbShCWclO5eCExvzaVB5CUtsGjkvs',
    label: 'Lapasan (R2) – Cogon Public Market',
    dbId: '2ce1cf85-2573-441b-affa-4e7c93124908',
    name: 'Lapasan (R2)'
  },
  {
    mid: '1ZfAOkDpR1OVVBU8zp9EiQNVGLZup2BQ',
    label: 'Lapasan (R3) – Cogon Public Market',
    dbId: '48b1687f-4271-41a1-983f-ca6b93a2fa46',
    name: 'Lapasan (R3)'
  },
  {
    mid: '131p2dJrEoyCfmE-XSfAsoIi3JAxO_yQ',
    label: 'Macabalan (R1) Centro – Cogon Public Market',
    dbId: '62f521fd-884a-4cbe-a02e-6bf47bc65017',
    name: 'Macabalan (R1) Centro'
  },
  {
    mid: '1pB4ablWgnKEVlwI-vfL_3_0sGsVlZ2w',
    label: 'Macabalan (R2) Centro – Westbound Terminal and Public Market',
    dbId: '35e62a9b-9819-4620-9a56-a13393e288b3',
    name: 'Macabalan (R2) Centro'
  },
  {
    mid: '1PQstIRULx27lpEz9ljRaFue6vK4JpuM',
    label: 'Macabalan (R3) Centro – Cogon Public Market',
    dbId: '126d970d-92b6-479a-bc84-ff91e86bd5b0',
    name: 'Macabalan (R3) Centro'
  },
  {
    mid: '17EoUgfs_okxHDwkxo99ekk9_2d23CEU',
    label: 'Macabalan (R4) Centro – Cogon Public Market',
    dbId: '4392dd9b-fe97-46da-921d-390e60728a62',
    name: 'Macabalan (R4) Centro'
  },
  {
    mid: '1Ec9xknePFyEj0-8bKf7LEk8uDiXe9bY',
    label: 'Macabalan (R5) Centro – Carmen Public Market',
    dbId: '9ef925b0-d6b4-4565-bd92-05b28173336d',
    name: 'Macabalan (R5) Centro'
  },
  {
    mid: '1ARLVkDhyTXObhT3V9nidkBL7xdD7Wnc',
    label: 'Macasandig (Centro Buena Oro) – Cogon Public Market',
    dbId: 'ed4b755a-1a27-4ef6-8b89-1abc2a2f5f75',
    name: 'Macasandig (Centro Buena Oro) (R-MAC)'
  },
  {
    mid: '1jGIxcVV3srk4kC1pi18CTOKqQUuNACA',
    label: 'Puerto (R1) Puerto Public Market – Agora Terminal',
    dbId: 'c80f880d-6491-4e83-89e7-1142a1c06749',
    name: 'Puerto (R1) Puerto Public Market'
  }
];

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

const uuidv4 = () => 'geom-' + Math.random().toString(36).substring(2, 10) + '-' + Date.now();

async function run() {
  console.log('====================================================');
  console.log(`  IMPORTING 22 GOOGLE MY MAPS ROUTES`);
  console.log('====================================================\n');

  const results = {
    total: NEW_MAPS.length,
    success: 0,
    failed: 0,
    details: []
  };

  for (let i = 0; i < NEW_MAPS.length; i++) {
    const item = NEW_MAPS[i];
    console.log(`\n[${i + 1}/${NEW_MAPS.length}] Processing "${item.label}" (mid: ${item.mid})...`);

    // Verify DB route exists
    const [existing] = await db.execute("SELECT id, code, name, origin, destination FROM routes WHERE id = ?", [item.dbId]);
    if (!existing || existing.length === 0) {
      console.error(`  ✗ Route ID ${item.dbId} not found in database!`);
      results.failed++;
      continue;
    }
    const route = existing[0];
    console.log(`  ✓ Matched DB route: [${route.id}] ${route.code} - ${route.name}`);

    // Fetch KML
    let kmlText = '';
    try {
      kmlText = await fetchKml(item.mid);
    } catch (e) {
      console.error(`  ✗ Failed to fetch KML:`, e.message);
      results.failed++;
      continue;
    }

    // Parse KML
    const placemarks = parseKml(kmlText);
    const lineStrings = placemarks.filter(p => p.type === 'LineString');
    const pointPlacemarks = placemarks.filter(p => p.type === 'Point');

    if (lineStrings.length === 0) {
      console.error(`  ✗ No LineString geometry found!`);
      results.failed++;
      continue;
    }

    console.log(`  -> Found ${lineStrings.length} LineString(s), ${pointPlacemarks.length} Point(s)`);

    // Determine Inbound & Outbound
    let inboundLine = null;
    let outboundLine = null;

    if (lineStrings.length === 1) {
      inboundLine = lineStrings[0];
      outboundLine = lineStrings[0];
    } else {
      for (const line of lineStrings) {
        const lineNameUpper = line.name.toUpperCase();
        if (lineNameUpper.includes('OUTBOUND') || 
            lineNameUpper.startsWith('DIRECTIONS FROM CARMEN') || 
            lineNameUpper.startsWith('DIRECTIONS FROM COGON') || 
            lineNameUpper.startsWith('DIRECTIONS FROM AGORA') || 
            lineNameUpper.startsWith('DIRECTIONS FROM DIVISORIA') || 
            lineNameUpper.startsWith('DIRECTIONS FROM GAISANO') ||
            lineNameUpper.startsWith('DIRECTIONS FROM PUERTO') ||
            lineNameUpper.startsWith('DIRECTIONS FROM WESTBOUND')) {
          if (!outboundLine) outboundLine = line;
        } else if (lineNameUpper.includes('INBOUND')) {
          if (!inboundLine) inboundLine = line;
        }
      }

      if (!inboundLine) inboundLine = lineStrings[0];
      if (!outboundLine) outboundLine = lineStrings.length > 1 ? lineStrings[1] : lineStrings[0];
    }

    const inDistance = calculatePathDistanceKm(inboundLine.coordinates);
    const outDistance = calculatePathDistanceKm(outboundLine.coordinates);

    // Save Inbound geometry
    const inGeoJson = JSON.stringify({
      type: 'LineString',
      coordinates: inboundLine.coordinates,
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

    // Save Outbound geometry
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

    // Save ordered route_path_points
    await db.execute('DELETE FROM route_path_points WHERE route_id = ?', [route.id]);
    const pointsToInsert = inboundLine.coordinates.map((c, idx) => [
      route.id,
      idx,
      c[1], // lat
      c[0], // lng
      0,
      0,
    ]);

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

    // Update routes metadata
    await db.execute(
      `UPDATE routes
       SET inbound_distance_km = ?, outbound_distance_km = ?, verification_status = 'VERIFIED', last_updated_at = NOW()
       WHERE id = ?`,
      [inDistance, outDistance, route.id]
    );

    // Save transit_locations / landmarks
    for (const pt of pointPlacemarks) {
      if (pt.name && pt.coordinate) {
        const [lng, lat] = pt.coordinate;
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
          let kind = 'loading';
          const nameLower = pt.name.toLowerCase();
          if (nameLower.includes('terminal')) kind = 'terminal';
          else if (nameLower.includes('market') || nameLower.includes('mall') || nameLower.includes('school') || nameLower.includes('church') || nameLower.includes('hospital')) kind = 'landmark';
          else if (nameLower.includes('carmen') || nameLower.includes('cogon') || nameLower.includes('agora') || nameLower.includes('puerto')) kind = 'terminal';

          const locId = 'loc-' + Math.random().toString(36).substring(2, 10);
          const safeName = (pt.name || 'Transit Stop').slice(0, 180);
          const safeAddr = (pt.desc || '').slice(0, 180);
          await db.execute(
            `INSERT INTO transit_locations (id, kind, name, address, barangay, lat, lng, route_ids, status, notes)
             VALUES (?, ?, ?, ?, '', ?, ?, ?, 'Active', 'Extracted from Google My Maps verified LPTRP data')`,
            [locId, kind, safeName, safeAddr, lat, lng, JSON.stringify([route.id])]
          );
        }
      }
    }

    results.success++;
    results.details.push({
      label: item.label,
      routeId: route.id,
      name: route.name,
      inboundPts: inboundLine.coordinates.length,
      outboundPts: outboundLine.coordinates.length,
      inKm: inDistance,
      outKm: outDistance,
      stops: pointPlacemarks.length
    });

    console.log(`  ✓ Updated geometry: Inbound ${inboundLine.coordinates.length} pts (${inDistance} km), Outbound ${outboundLine.coordinates.length} pts (${outDistance} km), Stops: ${pointPlacemarks.length}`);
  }

  console.log('\n====================================================');
  console.log(`SUMMARY: ${results.success}/${results.total} routes successfully imported & verified.`);
  if (results.failed > 0) {
    console.log(`WARNING: ${results.failed} routes failed.`);
  }
  console.log('====================================================');
}

run().then(() => process.exit(0)).catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});

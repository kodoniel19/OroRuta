const https = require('https');
const pool = require('../src/config/db');

const NEW_MID = '1hrIfl6wuWD2_JkawDAIYRcDlyarNsaQ';
const ROUTE_ID = 'c2-patag-gaisano-limketkai-cogon';

function fetchKml(mid) {
  return new Promise((resolve, reject) => {
    https.get(`https://www.google.com/maps/d/kml?mid=${mid}&forcekml=1`, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        https.get(res.headers.location, (redir) => {
          let data = ''; redir.on('data', c => data += c); redir.on('end', () => resolve(data));
          redir.on('error', reject);
        });
        return;
      }
      let data = ''; res.on('data', c => data += c); res.on('end', () => resolve(data));
      res.on('error', reject);
    }).on('error', reject);
  });
}

function parseCoords(str) {
  return str.trim().split(/\s+/).map(s => {
    const p = s.split(',').map(Number);
    return [p[0], p[1]];
  });
}

function calcLengthKm(coords) {
  let len = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    const [lng1, lat1] = coords[i];
    const [lng2, lat2] = coords[i + 1];
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    len += 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
  return len;
}

function distCoord(p1, p2) {
  const dx = (p1[0] - p2[0]) * 111320 * Math.cos(p1[1] * Math.PI / 180);
  const dy = (p1[1] - p2[1]) * 110540;
  return Math.sqrt(dx * dx + dy * dy);
}

function toGeoJSON(coords) {
  return JSON.stringify({ type: 'LineString', coordinates: coords });
}

async function updateC2() {
  console.log('=== Updating C2 route from new Google My Maps reference ===\n');

  // 1. Fetch KML
  console.log('Step 1: Fetching new KML...');
  const kml = await fetchKml(NEW_MID);
  console.log(`  KML size: ${kml.length} bytes\n`);

  // 2. Parse all LineStrings and Points
  const pms = kml.match(/<Placemark>[\s\S]*?<\/Placemark>/g) || [];
  const lineSegments = [];
  const points = [];

  for (const pm of pms) {
    const nameMatch = pm.match(/<name>(.*?)<\/name>/);
    const name = nameMatch ? nameMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim() : '';

    if (pm.includes('<LineString>') && !pm.includes('<MultiGeometry>')) {
      const coordMatch = pm.match(/<coordinates>([\s\S]*?)<\/coordinates>/);
      if (coordMatch) {
        lineSegments.push({ name, coords: parseCoords(coordMatch[1]) });
      }
    } else if (pm.includes('<Point>')) {
      const coordMatch = pm.match(/<coordinates>([\s\S]*?)<\/coordinates>/);
      if (coordMatch) {
        points.push({ name, coords: parseCoords(coordMatch[1])[0] });
      }
    }
  }

  console.log(`Step 2: Found ${lineSegments.length} LineString segments, ${points.length} Points`);
  points.forEach(p => console.log(`  Point: "${p.name}" -> [${p.coords}]`));
  lineSegments.forEach(l => console.log(`  Line: "${l.name}" | ${l.coords.length} pts | ${calcLengthKm(l.coords).toFixed(2)} km`));

  // 3. Build the full route by concatenating connected segments
  // The segments are ordered: Line 5 -> Line 6 -> Line 7 -> Line 8 -> Line 9 -> Line 11 -> Line 12
  // Each segment's end matches the next segment's start
  console.log('\nStep 3: Concatenating segments into full route...');

  // Sort segments by their natural order (end of one = start of next)
  let fullRoute = [...lineSegments[0].coords];
  const used = new Set([0]);

  for (let iter = 0; iter < lineSegments.length - 1; iter++) {
    const lastPoint = fullRoute[fullRoute.length - 1];
    let bestIdx = -1, bestDist = Infinity;

    for (let i = 0; i < lineSegments.length; i++) {
      if (used.has(i)) continue;
      // Check if this segment's start matches our current end
      const d = distCoord(lastPoint, lineSegments[i].coords[0]);
      if (d < bestDist) { bestDist = d; bestIdx = i; }
    }

    if (bestIdx >= 0 && bestDist < 50) { // Within 50m
      used.add(bestIdx);
      fullRoute = [...fullRoute, ...lineSegments[bestIdx].coords.slice(1)]; // skip duplicate junction point
      console.log(`  + "${lineSegments[bestIdx].name}" (${lineSegments[bestIdx].coords.length} pts, gap: ${bestDist.toFixed(1)}m)`);
    } else {
      console.log(`  WARNING: No matching next segment found (best gap: ${bestDist.toFixed(1)}m at idx ${bestIdx})`);
      if (bestIdx >= 0) {
        used.add(bestIdx);
        fullRoute = [...fullRoute, ...lineSegments[bestIdx].coords]; // include with gap
        console.log(`  + "${lineSegments[bestIdx].name}" (forced, gap: ${bestDist.toFixed(1)}m)`);
      }
    }
  }

  const fullLenKm = calcLengthKm(fullRoute);
  console.log(`\n  Full concatenated route: ${fullRoute.length} pts, ${fullLenKm.toFixed(2)} km`);
  console.log(`  Start: [${fullRoute[0]}]`);
  console.log(`  End:   [${fullRoute[fullRoute.length - 1]}]`);

  // 4. Determine Inbound vs Outbound
  // Known landmarks:
  //   Patag / Camp Evangelista: [124.6255, 8.4876] (origin)
  //   Cogon Public Market:     [124.6514, 8.4774] (destination area)
  //   Gaisano City Mall:       [124.6499, 8.4864]
  //   Limketkai Center:        [124.6561, 8.4816]
  //
  // The concatenated route starts near Patag and traces: Patag → Gaisano → Limketkai → Cogon → back toward Patag area
  // This forms a loop. Let me identify the turnaround/split point.
  
  const patag = [124.6255, 8.4876]; // origin
  const cogon = [124.6514, 8.4774]; // destination area
  
  // Find the point in the route closest to Cogon (farthest into the city)
  let cogonIdx = 0, cogonDist = Infinity;
  for (let i = 0; i < fullRoute.length; i++) {
    const d = distCoord(fullRoute[i], cogon);
    if (d < cogonDist) { cogonDist = d; cogonIdx = i; }
  }
  
  // Also find the point closest to Limketkai (past Gaisano)
  const limketkai = [124.6561, 8.4816];
  let lkkIdx = 0, lkkDist = Infinity;
  for (let i = 0; i < fullRoute.length; i++) {
    const d = distCoord(fullRoute[i], limketkai);
    if (d < lkkDist) { lkkDist = d; lkkIdx = i; }
  }

  console.log(`\n  Closest to Cogon: idx ${cogonIdx} (${cogonDist.toFixed(0)}m away)`);
  console.log(`  Closest to Limketkai: idx ${lkkIdx} (${lkkDist.toFixed(0)}m away)`);

  // The route goes: Patag -> Gaisano -> Limketkai -> past Cogon -> loops back
  // Check if this is a single loop or has a clear turnaround
  const startEndDist = distCoord(fullRoute[0], fullRoute[fullRoute.length - 1]);
  console.log(`  Start-to-End distance: ${startEndDist.toFixed(0)}m`);

  let inbound, outbound;

  if (startEndDist < 300) {
    // It's a loop — split at the farthest point from start
    console.log('  Route is a LOOP. Splitting at the farthest point from Patag...');
    let maxD = 0, splitIdx = 0;
    for (let i = 0; i < fullRoute.length; i++) {
      const d = distCoord(fullRoute[i], fullRoute[0]);
      if (d > maxD) { maxD = d; splitIdx = i; }
    }
    // Inbound: Patag → city center (first half)
    // Outbound: city center → Patag (second half)
    inbound = fullRoute.slice(0, splitIdx + 1);
    outbound = fullRoute.slice(splitIdx);
    console.log(`  Split at idx ${splitIdx}, maxDist from start: ${maxD.toFixed(0)}m`);
  } else {
    // Not a loop — the full route is one direction (Inbound: Patag → Cogon)
    // For outbound, reverse it
    console.log('  Route is ONE-WAY path. Using forward as Inbound, reverse as Outbound.');
    inbound = fullRoute;
    outbound = [...fullRoute].reverse();
  }

  const inboundKm = calcLengthKm(inbound);
  const outboundKm = calcLengthKm(outbound);

  console.log(`\n  Inbound:  ${inbound.length} pts, ${inboundKm.toFixed(2)} km`);
  console.log(`    Start: [${inbound[0]}] -> End: [${inbound[inbound.length - 1]}]`);
  console.log(`  Outbound: ${outbound.length} pts, ${outboundKm.toFixed(2)} km`);
  console.log(`    Start: [${outbound[0]}] -> End: [${outbound[outbound.length - 1]}]`);

  // 5. Validate no large gaps
  console.log('\nStep 4: Validating geometry gaps...');
  let gapCount = 0;
  for (const [label, coords] of [['Inbound', inbound], ['Outbound', outbound]]) {
    for (let i = 0; i < coords.length - 1; i++) {
      const d = distCoord(coords[i], coords[i + 1]);
      if (d > 500) {
        console.log(`  WARNING: ${label} gap at idx ${i}: ${d.toFixed(0)}m`);
        gapCount++;
      }
    }
  }
  if (gapCount === 0) console.log('  ✓ No gaps > 500m found');

  // 6. Update database
  console.log('\nStep 5: Updating MySQL database...');
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Update route distances
    await conn.execute(
      `UPDATE routes SET inbound_distance_km = ?, outbound_distance_km = ?, last_updated_at = NOW() WHERE id = ?`,
      [inboundKm.toFixed(2), outboundKm.toFixed(2), ROUTE_ID]
    );

    // Delete old geometry
    await conn.execute('DELETE FROM route_geometry WHERE route_id = ?', [ROUTE_ID]);

    // Insert new geometry
    const inId = `g-${ROUTE_ID.substring(0, 26)}-in`;
    const outId = `g-${ROUTE_ID.substring(0, 26)}-out`;

    await conn.execute(
      `INSERT INTO route_geometry (id, route_id, direction, geometry, geometry_status, generated_at)
       VALUES (?, ?, 'Inbound', ?, 'VERIFIED', NOW())`,
      [inId, ROUTE_ID, toGeoJSON(inbound)]
    );
    await conn.execute(
      `INSERT INTO route_geometry (id, route_id, direction, geometry, geometry_status, generated_at)
       VALUES (?, ?, 'Outbound', ?, 'VERIFIED', NOW())`,
      [outId, ROUTE_ID, toGeoJSON(outbound)]
    );

    // Update direction distances
    await conn.execute(
      `UPDATE route_directions SET distance_km = ? WHERE route_id = ? AND direction = 'Inbound'`,
      [inboundKm.toFixed(2), ROUTE_ID]
    );
    await conn.execute(
      `UPDATE route_directions SET distance_km = ? WHERE route_id = ? AND direction = 'Outbound'`,
      [outboundKm.toFixed(2), ROUTE_ID]
    );

    await conn.commit();
    console.log('  ✓ Database updated successfully');
  } catch (err) {
    await conn.rollback();
    console.error('  ✗ Database update failed:', err.message);
    throw err;
  } finally {
    conn.release();
  }

  // 7. Verify
  console.log('\nStep 6: Verifying database update...');
  const [routes] = await pool.query('SELECT id, code, name, origin, destination, inbound_distance_km, outbound_distance_km FROM routes WHERE id = ?', [ROUTE_ID]);
  console.log('  Route:', routes[0]);

  const [geos] = await pool.query('SELECT direction, geometry FROM route_geometry WHERE route_id = ?', [ROUTE_ID]);
  for (const g of geos) {
    const geom = typeof g.geometry === 'string' ? JSON.parse(g.geometry) : g.geometry;
    console.log(`  ${g.direction}: ${geom.coordinates.length} pts, ${calcLengthKm(geom.coordinates).toFixed(2)} km`);
    console.log(`    Start: [${geom.coordinates[0]}] -> End: [${geom.coordinates[geom.coordinates.length - 1]}]`);
  }

  console.log('\n✓ C2 route successfully updated from new Google My Maps reference!');
}

updateC2().then(() => process.exit(0)).catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});

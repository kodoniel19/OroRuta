/**
 * apply_new_c2_route.js
 * 
 * Applies the new authoritative Google My Maps reference (mid=1hrIfl6wuWD2_JkawDAIYRcDlyarNsaQ)
 * to the existing C2 route in OroRuta MySQL database.
 */

const https = require('https');
const pool = require('../src/config/db');

const NEW_MID = '1hrIfl6wuWD2_JkawDAIYRcDlyarNsaQ';
const ROUTE_ID = 'c2-patag-gaisano-limketkai-cogon';
const ROUTE_CODE = 'C2';
const ROUTE_NAME = 'C2 - Patag- Gaisano - Limketkai - Cogon';
const ORIGIN = 'Patag (Camp Evangelista)';
const DESTINATION = 'Cogon Public Market';

function fetchKml(mid) {
  return new Promise((resolve, reject) => {
    https.get(`https://www.google.com/maps/d/kml?mid=${mid}&forcekml=1`, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        https.get(res.headers.location, (r2) => {
          let data = '';
          r2.on('data', c => data += c);
          r2.on('end', () => resolve(data));
        }).on('error', reject);
        return;
      }
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function parseCoords(str) {
  return str.trim().split(/\s+/).map(pt => {
    const [lng, lat] = pt.split(',').map(Number);
    return [Number(lng.toFixed(6)), Number(lat.toFixed(6))];
  });
}

function distCoord(c1, c2) {
  const dx = (c2[0] - c1[0]) * 111000 * Math.cos(c1[1] * Math.PI / 180);
  const dy = (c2[1] - c1[1]) * 111000;
  return Math.sqrt(dx * dx + dy * dy);
}

function calcLengthKm(coords) {
  let d = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    d += distCoord(coords[i], coords[i + 1]);
  }
  return d / 1000;
}

function concatLines(lines) {
  const result = [];
  for (const line of lines) {
    if (result.length === 0) {
      result.push(...line);
    } else {
      const last = result[result.length - 1];
      const start = line[0];
      const d = distCoord(last, start);
      if (d < 1) {
        result.push(...line.slice(1));
      } else {
        result.push(...line);
      }
    }
  }
  return result;
}

async function main() {
  console.log(`=== Updating C2 from Google My Maps (mid=${NEW_MID}) ===`);

  const kml = await fetchKml(NEW_MID);
  const pms = kml.match(/<Placemark>[\s\S]*?<\/Placemark>/g) || [];
  const linesByName = {};

  for (const pm of pms) {
    if (!pm.includes('<LineString>')) continue;
    const name = (pm.match(/<name>(.*?)<\/name>/) || ['',''])[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim();
    const coords = parseCoords(pm.match(/<coordinates>([\s\S]*?)<\/coordinates>/)[1]);
    linesByName[name] = coords;
  }

  const l5 = linesByName['Line 5'];
  const l6 = linesByName['Line 6'];
  const l7 = linesByName['Line 7'];
  const l8 = linesByName['Line 8'];
  const l9 = linesByName['Line 9'];
  const l11 = linesByName['Line 11'];
  const l12 = linesByName['Line 12'];

  // Inbound: Patag -> Gaisano -> Limketkai -> Cogon Public Market (Line 8 pt 13)
  const inbound = concatLines([
    l5,
    l6,
    l7,
    l8.slice(0, 14)
  ]);

  // Outbound: Cogon Public Market -> Divisoria -> Carmen -> Patag Highway -> Patag
  const l5Return = l5.slice(0, 13).reverse();
  const outbound = concatLines([
    l8.slice(13),
    l9,
    l11,
    l12,
    l5Return
  ]);

  const inboundKm = calcLengthKm(inbound);
  const outboundKm = calcLengthKm(outbound);

  console.log(`Inbound:  ${inbound.length} pts, ${inboundKm.toFixed(2)} km`);
  console.log(`Outbound: ${outbound.length} pts, ${outboundKm.toFixed(2)} km`);

  const inboundGeoJSON = JSON.stringify({ type: 'LineString', coordinates: inbound });
  const outboundGeoJSON = JSON.stringify({ type: 'LineString', coordinates: outbound });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Update routes table
    await conn.execute(
      `UPDATE routes SET
         name = ?, code = ?, origin = ?, destination = ?,
         inbound_distance_km = ?, outbound_distance_km = ?,
         last_updated_at = NOW()
       WHERE id = ?`,
      [ROUTE_NAME, ROUTE_CODE, ORIGIN, DESTINATION,
       inboundKm.toFixed(2), outboundKm.toFixed(2), ROUTE_ID]
    );
    console.log('✓ Updated routes table');

    // 2. Update route_geometry
    await conn.execute('DELETE FROM route_geometry WHERE route_id = ?', [ROUTE_ID]);

    const inId = `g-${ROUTE_ID.substring(0, 26)}-in`;
    const outId = `g-${ROUTE_ID.substring(0, 26)}-out`;

    await conn.execute(
      `INSERT INTO route_geometry (id, route_id, direction, geometry, geometry_status, generated_at)
       VALUES (?, ?, 'Inbound', ?, 'VERIFIED', NOW())`,
      [inId, ROUTE_ID, inboundGeoJSON]
    );
    await conn.execute(
      `INSERT INTO route_geometry (id, route_id, direction, geometry, geometry_status, generated_at)
       VALUES (?, ?, 'Outbound', ?, 'VERIFIED', NOW())`,
      [outId, ROUTE_ID, outboundGeoJSON]
    );
    console.log('✓ Inserted route_geometry (Inbound & Outbound)');

    // 3. Update route_directions
    await conn.execute(
      `UPDATE route_directions SET
         distance_km = ?,
         street_sequence = ?
       WHERE route_id = ? AND direction = 'Inbound'`,
      [inboundKm.toFixed(2),
       'Patag (Camp Evangelista) → Butuan-CDO-Iligan Rd → Marcos Bridge → CM Recto Ave → Gaisano City Mall → Limketkai Center → Cogon Public Market',
       ROUTE_ID]
    );
    await conn.execute(
      `UPDATE route_directions SET
         distance_km = ?,
         street_sequence = ?
       WHERE route_id = ? AND direction = 'Outbound'`,
      [outboundKm.toFixed(2),
       'Cogon Public Market → JR Borja St → Plaza Divisoria → Carmen Bridge → Vamenta Blvd → Max Suniel St → Patag Road → Patag (Camp Evangelista)',
       ROUTE_ID]
    );
    console.log('✓ Updated route_directions');

    await conn.commit();
    console.log('\n✓ Successfully updated C2 in MySQL database!');
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

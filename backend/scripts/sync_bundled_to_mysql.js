/**
 * sync_bundled_to_mysql.js
 * 
 * Synchronizes the verified data from bundled_routes.json into the MySQL database:
 * 1. Corrects Carmen Market, Camp Evangelista, and Cogon coordinates across places, landmarks, terminals, loading_points
 * 2. Removes spurious Liceo loading points from non-Liceo routes
 * 3. Upserts all 86 routes from bundled_routes.json into routes table
 * 4. Upserts all 172 directional geometries into route_geometry table
 * 5. Upserts route_directions
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'ororuta',
  password: process.env.DB_PASS || process.env.DB_PASSWORD || 'ororuta',
  database: process.env.DB_NAME || 'ororuta'
};

const bundledPath = path.join(__dirname, '../../android/app/src/main/assets/bundled_routes.json');
const bundledRoutes = JSON.parse(fs.readFileSync(bundledPath, 'utf8'));

async function sync() {
  console.log('Connecting to MySQL...');
  const conn = await mysql.createConnection(DB_CONFIG);

  try {
    try {
      await conn.execute("ALTER TABLE routes MODIFY COLUMN verification_status VARCHAR(30) NOT NULL DEFAULT 'VERIFIED'");
      await conn.execute("ALTER TABLE routes MODIFY COLUMN code VARCHAR(20) NOT NULL");
    } catch (_) {}

    await conn.beginTransaction();

    console.log('1. Fixing places, landmarks, and terminals coordinates...');
    // Carmen Public Market
    await conn.execute("UPDATE places SET lat = 8.479498, lng = 124.636820 WHERE id = 'pl-carmen'");
    await conn.execute("UPDATE landmarks SET lat = 8.479498, lng = 124.636820 WHERE id = 'pl-carmen'");
    await conn.execute("UPDATE terminals SET lat = 8.479498, lng = 124.636820 WHERE id = 't-carmen'");

    // Camp Evangelista (Patag)
    await conn.execute("UPDATE places SET lat = 8.487848, lng = 124.625586, area = 'Patag' WHERE id = 'pl-campevang' OR id = 'pl-patag'");
    await conn.execute("UPDATE landmarks SET lat = 8.487848, lng = 124.625586 WHERE id = 'lm-07'");
    await conn.execute("UPDATE terminals SET lat = 8.487848, lng = 124.625586 WHERE id = 't-patag'");

    // Cogon Market
    await conn.execute("UPDATE places SET lat = 8.477160, lng = 124.651208 WHERE id = 'pl-cogon'");
    await conn.execute("UPDATE landmarks SET lat = 8.477160, lng = 124.651208 WHERE id = 'pl-cogon'");
    await conn.execute("UPDATE terminals SET lat = 8.477160, lng = 124.651208 WHERE id = 't-cogon'");

    // Carmen loading points
    await conn.execute("UPDATE loading_points SET lat = 8.479498, lng = 124.636820 WHERE name LIKE '%Carmen%'");

    console.log('2. Removing spurious Liceo loading points for non-Liceo routes...');
    const nonLiceoRouteCodes = ['R-BAI', 'R-BAL', 'R-SAN', 'R-TAG', 'R-TUB', 'R-TUM', 'R1', 'R3', 'R4', 'R5', 'R6'];
    for (const code of nonLiceoRouteCodes) {
      await conn.execute(
        "DELETE lp FROM loading_points lp JOIN routes r ON lp.route_id = r.id WHERE lp.name LIKE '%Liceo%' AND r.code = ?",
        [code]
      );
    }

    // Also remove from route_landmarks for these non-Liceo routes
    for (const code of ['R-BAI', 'R-BAL', 'R-SAN', 'R-TAG', 'R-TUB', 'R-TUM', 'R1', 'R3', 'R4', 'R5', 'R6']) {
      await conn.execute(
        "DELETE rl FROM route_landmarks rl JOIN routes r ON rl.route_id = r.id JOIN landmarks lm ON rl.landmark_id = lm.id WHERE lm.name LIKE '%Liceo%' AND r.code = ?",
        [code]
      );
    }

    // Ensure routes columns can hold required data
    try {
      await conn.execute("ALTER TABLE routes MODIFY COLUMN verification_status VARCHAR(30) NOT NULL DEFAULT 'VERIFIED'");
      await conn.execute("ALTER TABLE routes MODIFY COLUMN code VARCHAR(20) NOT NULL");
    } catch (_) {}

    console.log(`3. Upserting all ${bundledRoutes.length} routes from bundled_routes.json...`);
    for (const r of bundledRoutes) {
      const inboundDist = r.length_km || 5.0;
      const outboundDist = r.length_km || 5.0;

      await conn.execute(`
        INSERT INTO routes (
          id, code, name, origin, destination, jeepney_type, description,
          inbound_distance_km, outbound_distance_km, status, verification_status,
          color, offline_size_mb
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          code = VALUES(code),
          name = VALUES(name),
          origin = VALUES(origin),
          destination = VALUES(destination),
          jeepney_type = VALUES(jeepney_type),
          description = VALUES(description),
          inbound_distance_km = VALUES(inbound_distance_km),
          outbound_distance_km = VALUES(outbound_distance_km),
          status = VALUES(status),
          verification_status = VALUES(verification_status),
          color = VALUES(color),
          offline_size_mb = VALUES(offline_size_mb)
      `, [
        r.id,
        r.code,
        r.name,
        r.origin || '',
        r.destination || '',
        r.jeepney_type || 'Traditional',
        r.description || '',
        inboundDist,
        outboundDist,
        r.status || 'Active',
        r.verification_status || 'VERIFIED',
        r.color || '#1471B0',
        r.offline_size_mb || 0.5
      ]);

      // Route directions
      for (const d of (r.directions || [])) {
        await conn.execute(`
          INSERT INTO route_directions (id, route_id, direction, distance_km, street_sequence)
          VALUES (?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            distance_km = VALUES(distance_km),
            street_sequence = VALUES(street_sequence)
        `, [
          d.id || `dir-${r.id}-${d.direction.toLowerCase()}`,
          r.id,
          d.direction,
          d.distance_km || r.length_km || 5.0,
          d.street_sequence || ''
        ]);
      }

      // Route geometries
      for (const g of (r.geometries || [])) {
        let geomObj = g.geometry;
        if (typeof geomObj === 'string') {
          try { geomObj = JSON.parse(geomObj); } catch (_) {}
        }
        const geomJson = JSON.stringify(geomObj);

        await conn.execute(`
          INSERT INTO route_geometry (id, route_id, direction, geometry, geometry_status, generated_at)
          VALUES (?, ?, ?, ?, 'VERIFIED', NOW())
          ON DUPLICATE KEY UPDATE
            geometry = VALUES(geometry),
            geometry_status = 'VERIFIED',
            generated_at = NOW()
        `, [
          g.id || `geo-${r.id}-${g.direction.toLowerCase()}`,
          r.id,
          g.direction,
          geomJson
        ]);
      }
    }

    await conn.commit();
    console.log('✅ Successfully synchronized all routes, geometries, and coordinates to MySQL!');

  } catch (err) {
    await conn.rollback();
    console.error('Sync failed:', err);
    throw err;
  } finally {
    await conn.end();
  }
}

sync().catch(err => {
  console.error(err);
  process.exit(1);
});

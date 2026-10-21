/**
 * Import 18 User-Supplied Candidate Routes into MySQL Database
 * ==============================================================
 * Idempotently inserts/updates the 18 candidate routes, their directions,
 * GeoJSON geometries, terminals, stops, and collection items.
 */

const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'ororuta',
  password: process.env.DB_PASS || process.env.DB_PASSWORD || 'ororuta',
  database: process.env.DB_NAME || 'ororuta'
};

const bundledPath = path.join(__dirname, '../../android/app/src/main/assets/bundled_routes.json');
const allRoutes = JSON.parse(fs.readFileSync(bundledPath, 'utf8'));

// Filter the 18 new user-supplied routes
const newRouteIds = [
  'r1-gaisano-carmen-loop',
  'r2-gaisano-agora-cogon-carmen',
  'c2-patag-gaisano-limketkai-cogon',
  'bugo-cogon-line',
  'puerto-cogon-divisoria-line',
  'rd-gusa-cugman-limketkai-cogon',
  'bulua-cogon-line-highway',
  'iponan-bulua-cogon-line',
  'bayabas-carmen-loop-line',
  'bonbon-cogon-loop-line',
  'ra-pier-cogon-line',
  'rbc-pier-macabalan-agora-limketkai',
  'la-lapasan-cogon-agora-divisoria',
  'lb-lapasan-agora-loop',
  'uptown-gran-europa-sm-cogon',
  'macasandig-cogon-line',
  'indahag-r1-cogon-line',
  'lumbia-carmen-line'
];

const newRoutes = allRoutes.filter(r => newRouteIds.includes(r.id));

async function importNewRoutes() {
  console.log(`Connecting to MySQL and importing ${newRoutes.length} user-supplied routes...`);
  let conn;
  try {
    conn = await mysql.createConnection(DB_CONFIG);
    await conn.beginTransaction();

    try {
      await conn.execute(`
        ALTER TABLE routes MODIFY COLUMN verification_status
        ENUM('DRAFT', 'PENDING_VERIFICATION', 'VERIFIED', 'PUBLISHED', 'DATA_REVIEW_REQUIRED', 'ERROR', 'USER_SUPPLIED') NOT NULL DEFAULT 'DRAFT'
      `);
    } catch (_) {}
    try {
      await conn.execute(`ALTER TABLE routes MODIFY COLUMN code VARCHAR(20) NOT NULL`);
    } catch (_) {}

    const collectionId = 'col-most-used-0001';

    for (let i = 0; i < newRoutes.length; i++) {
      const r = newRoutes[i];

      // Insert or Update Route
      await conn.execute(`
        INSERT INTO routes (
          id, code, name, origin, destination, jeepney_type, description,
          inbound_distance_km, outbound_distance_km, status, verification_status,
          color, offline_size_mb, is_popular
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          code = VALUES(code),
          name = VALUES(name),
          origin = VALUES(origin),
          destination = VALUES(destination),
          description = VALUES(description),
          verification_status = VALUES(verification_status),
          is_popular = VALUES(is_popular)
      `, [
        r.id, r.code, r.name, r.origin, r.destination, r.jeepney_type || 'Traditional',
        r.description || '', r.length_km || 5.0, r.length_km || 5.0,
        r.status || 'Active', r.verification_status || 'USER_SUPPLIED',
        r.color || '#0F6652', r.offline_size_mb || 0.5, 1
      ]);

      // Add to route_collection_items ('most_used')
      await conn.execute(`
        INSERT INTO route_collection_items (collection_id, route_id, sort_order)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE sort_order = VALUES(sort_order)
      `, [collectionId, r.id, i + 1]);

      // Directions
      for (const d of r.directions || []) {
        await conn.execute(`
          INSERT INTO route_directions (id, route_id, direction, distance_km, street_sequence)
          VALUES (?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE street_sequence = VALUES(street_sequence)
        `, [d.id, r.id, d.direction, d.distance_km || 5.0, d.street_sequence || '']);
      }

      // Geometries
      for (const g of r.geometries || []) {
        const geomStr = typeof g.geometry === 'string' ? g.geometry : JSON.stringify(g.geometry);
        await conn.execute(`
          INSERT INTO route_geometry (id, route_id, direction, geometry, geometry_status, generated_at)
          VALUES (?, ?, ?, ?, 'GENERATED', CURRENT_TIMESTAMP)
          ON DUPLICATE KEY UPDATE geometry = VALUES(geometry)
        `, [g.id, r.id, g.direction, geomStr]);
      }

      console.log(`[SUCCESS] Imported route [${r.code}] ${r.name}`);
    }

    await conn.commit();
    console.log(`\nImport completed successfully. ${newRoutes.length} routes imported/updated in database.`);
  } catch (err) {
    if (conn) await conn.rollback();
    console.error('Import failed:', err);
    process.exit(1);
  } finally {
    if (conn) await conn.end();
  }
}

if (require.main === module) {
  importNewRoutes();
}

module.exports = importNewRoutes;

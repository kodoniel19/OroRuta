const db = require('../src/config/db');
const fs = require('fs');
const path = require('path');
const { calculateTraditionalFare } = require('../src/services/fareService');

async function exportBundledRoutes() {
  console.log('Generating updated bundled_routes.json for Android app...');

  const [rows] = await db.execute("SELECT * FROM routes ORDER BY code, name");
  console.log(`Exporting ${rows.length} routes...`);

  await Promise.all(rows.map(async (r) => {
    const [[tCount]] = await db.execute("SELECT COUNT(*) cnt FROM route_terminals WHERE route_id = ?", [r.id]);
    const [[lCount]] = await db.execute("SELECT COUNT(*) cnt FROM loading_points WHERE route_id = ?", [r.id]);
    r.terminal_count = tCount.cnt;
    r.stop_count = lCount.cnt;

    // Directions
    const [directions] = await db.execute("SELECT * FROM route_directions WHERE route_id = ?", [r.id]);
    r.directions = directions;

    // Geometries
    const [geometries] = await db.execute("SELECT * FROM route_geometry WHERE route_id = ?", [r.id]);
    for (const g of geometries) {
      if (g.geometry && typeof g.geometry === 'object') {
        g.geometry = JSON.stringify(g.geometry);
      }
    }
    r.geometries = geometries;

    // Construct path for mobile compatibility
    r.path = [];
    if (geometries && geometries.length > 0) {
      const inbound = geometries.find(g => g.direction === 'Inbound') || geometries[0];
      if (inbound && inbound.geometry) {
        try {
          const geom = typeof inbound.geometry === 'string' ? JSON.parse(inbound.geometry) : inbound.geometry;
          if (geom.coordinates) {
            r.path = geom.coordinates.map((c, i) => ({ route_id: r.id, seq: i, lat: c[1], lng: c[0], map_x: 0, map_y: 0 }));
          }
        } catch (e) {}
      }
    }

    // Direction and length
    const isLoopName = r.name.toLowerCase().includes("loop") || r.code.toLowerCase().includes("loop");
    const isLoopGeom = r.path.length >= 2 && Math.hypot(r.path[0].lat - r.path[r.path.length - 1].lat, r.path[0].lng - r.path[r.path.length - 1].lng) < 0.002;
    r.direction = (isLoopName || isLoopGeom) ? "Loop" : "Bidirectional";
    r.length_km = Math.max(parseFloat(r.inbound_distance_km) || 0, parseFloat(r.outbound_distance_km) || 0);

    // Major roads
    const [roads] = await db.execute(
      `SELECT mr.* FROM major_roads mr
       JOIN route_major_roads rmr ON rmr.road_id = mr.id
       WHERE rmr.route_id = ? ORDER BY rmr.seq`, [r.id]);
    r.roads = roads;

    // Terminals, stops, landmarks
    const [terms] = await db.execute(
      `SELECT t.* FROM terminals t
       JOIN route_terminals rt ON rt.terminal_id = t.id
       WHERE rt.route_id = ? ORDER BY rt.seq`, [r.id]);
    r.terminals = terms;

    const [lps] = await db.execute("SELECT * FROM loading_points WHERE route_id = ? ORDER BY name", [r.id]);
    r.stops = lps;

    const [transfers] = await db.execute("SELECT * FROM transfer_points WHERE route_id = ? ORDER BY name", [r.id]);
    r.transfers = transfers;

    const [lms] = await db.execute(
      `SELECT l.* FROM landmarks l
       JOIN route_landmarks rl ON rl.landmark_id = l.id
       WHERE rl.route_id = ? ORDER BY rl.seq`, [r.id]);
    r.landmarks = lms;

    // Fare
    const km = r.length_km || 5;
    try {
      const fareRes = calculateTraditionalFare(km, "Regular", r.jeepney_type);
      r.base_fare = fareRes.baseFare;
      r.total_fare = fareRes.totalFare;
    } catch (e) {
      r.base_fare = 15;
      r.total_fare = 15;
    }
  }));

  const targetPath = path.resolve(__dirname, '../../android/app/src/main/assets/bundled_routes.json');
  fs.writeFileSync(targetPath, JSON.stringify(rows, null, 2), 'utf8');
  console.log(`✓ Successfully updated Android asset: ${targetPath}`);
  console.log(`  File size: ${(fs.statSync(targetPath).size / 1024 / 1024).toFixed(2)} MB`);
}

exportBundledRoutes().then(() => process.exit(0)).catch(e => {
  console.error('Export failed:', e);
  process.exit(1);
});

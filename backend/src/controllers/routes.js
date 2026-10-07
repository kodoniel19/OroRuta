const db = require("../config/db");

async function list(req, res, next) {
  try {
    const { q = "", type = "", hasUpdates = "" } = req.query;
    let sql, params = [];

    if (q) {
      const like = `%${q}%`;
      // Multi-table search
      sql = `SELECT DISTINCT r.* FROM routes r
        LEFT JOIN route_terminals rt ON rt.route_id = r.id
        LEFT JOIN terminals t ON t.id = rt.terminal_id
        LEFT JOIN loading_points lp ON lp.route_id = r.id
        LEFT JOIN transfer_points tp ON tp.route_id = r.id
        LEFT JOIN route_landmarks rl ON rl.route_id = r.id
        LEFT JOIN landmarks lm ON lm.id = rl.landmark_id
        WHERE r.verification_status = 'PUBLISHED' AND (
          r.code LIKE ? OR r.name LIKE ? OR r.origin LIKE ? OR r.destination LIKE ? OR r.description LIKE ?
          OR t.name LIKE ?
          OR lp.name LIKE ?
          OR tp.name LIKE ?
          OR lm.name LIKE ?
        )`;
      params.push(like, like, like, like, like, like, like, like, like);
    } else {
      // The mobile app should only see published routes
      sql = "SELECT r.* FROM routes r WHERE r.verification_status = 'PUBLISHED'";
    }

    if (type) { sql += " AND r.jeepney_type = ?"; params.push(type); }
    if (hasUpdates === "true") { sql += " AND r.status != 'Active'"; }
    sql += " ORDER BY r.code";
    
    // Fallback: If no routes are PUBLISHED yet (because we just rebuilt DB), return DRAFT routes for testing
    let [rows] = await db.execute(sql, params);
    if (rows.length === 0 && !hasUpdates) {
       sql = "SELECT * FROM routes WHERE 1=1 ORDER BY code";
       [rows] = await db.execute(sql, []);
    }

    for (const r of rows) {
      const [[tCount]] = await db.execute("SELECT COUNT(*) cnt FROM route_terminals WHERE route_id = ?", [r.id]);
      const [[lCount]] = await db.execute("SELECT COUNT(*) cnt FROM loading_points WHERE route_id = ?", [r.id]);
      r.terminal_count = tCount.cnt;
      r.stop_count = lCount.cnt;

      // Directions
      const [directions] = await db.execute("SELECT * FROM route_directions WHERE route_id = ?", [r.id]);
      r.directions = directions;

      // Geometries
      const [geometries] = await db.execute("SELECT * FROM route_geometry WHERE route_id = ?", [r.id]);
      r.geometries = geometries;

      // Construct path for legacy compatibility
      r.path = [];
      if (geometries && geometries.length > 0) {
        // Just take inbound for the preview path
        const inbound = geometries.find(g => g.direction === 'Inbound');
        if (inbound && inbound.geometry) {
            try {
                const geom = JSON.parse(inbound.geometry);
                if (geom.coordinates) {
                    r.path = geom.coordinates.map((c, i) => ({ route_id: r.id, seq: i, lat: c[1], lng: c[0], map_x: 0, map_y: 0 }));
                }
            } catch(e) {}
        }
      }

      // Legacy fallback
      r.direction = "Loop";
      r.length_km = Math.max(parseFloat(r.inbound_distance_km) || 0, parseFloat(r.outbound_distance_km) || 0);

      // Major roads
      const [roads] = await db.execute(
        `SELECT mr.* FROM major_roads mr
         JOIN route_major_roads rmr ON rmr.road_id = mr.id
         WHERE rmr.route_id = ? ORDER BY rmr.seq`, [r.id]);
      r.roads = roads;

      // Fare estimate
      try {
        const [[rule]] = await db.execute("SELECT minimum, minimum_km, per_km FROM fare_rules WHERE is_current = 1 LIMIT 1");
        if (rule) {
          const km = r.length_km || 5;
          if (km <= rule.minimum_km) {
            r.fare = rule.minimum;
          } else {
            r.fare = rule.minimum + (km - rule.minimum_km) * rule.per_km;
          }
          r.fare = Math.round(r.fare * 100) / 100;
        } else {
          r.fare = r.jeepney_type === 'Modern' ? 15 : 13;
        }
      } catch (_) {
        r.fare = r.jeepney_type === 'Modern' ? 15 : 13;
      }

      // Terminals
      const [terminals] = await db.execute(
        `SELECT t.* FROM terminals t
         JOIN route_terminals rt ON rt.terminal_id = t.id
         WHERE rt.route_id = ? ORDER BY rt.seq`, [r.id]);
      r.terminals = terminals;

      const [stops] = await db.execute("SELECT * FROM loading_points WHERE route_id = ? ORDER BY name", [r.id]);
      r.stops = stops;

      const [transfers] = await db.execute("SELECT * FROM transfer_points WHERE route_id = ? ORDER BY name", [r.id]);
      r.transfers = transfers;

      const [landmarks] = await db.execute(
        `SELECT l.* FROM landmarks l
         JOIN route_landmarks rl ON rl.landmark_id = l.id
         WHERE rl.route_id = ? ORDER BY rl.seq`, [r.id]);
      r.landmarks = landmarks;

      r.travelTime = Math.round((r.length_km || 5) * 3.5);
    }
    res.json(rows);
  } catch (err) { next(err); }
}

async function getById(req, res, next) {
  try {
    const [rows] = await db.execute("SELECT * FROM routes WHERE id = ?", [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Route not found" } });
    const route = rows[0];
    
    const [terminals] = await db.execute(`SELECT t.* FROM terminals t JOIN route_terminals rt ON rt.terminal_id = t.id WHERE rt.route_id = ? ORDER BY rt.seq`, [route.id]);
    const [stops] = await db.execute("SELECT * FROM loading_points WHERE route_id = ? ORDER BY name", [route.id]);
    const [transfers] = await db.execute("SELECT * FROM transfer_points WHERE route_id = ? ORDER BY name", [route.id]);
    const [roads] = await db.execute(`SELECT mr.* FROM major_roads mr JOIN route_major_roads rmr ON rmr.road_id = mr.id WHERE rmr.route_id = ? ORDER BY rmr.seq`, [route.id]);
    const [landmarks] = await db.execute(`SELECT l.* FROM landmarks l JOIN route_landmarks rl ON rl.landmark_id = l.id WHERE rl.route_id = ? ORDER BY rl.seq`, [route.id]);
    
    const [directions] = await db.execute("SELECT * FROM route_directions WHERE route_id = ?", [route.id]);
    route.directions = directions;

    const [geometries] = await db.execute("SELECT * FROM route_geometry WHERE route_id = ?", [route.id]);
    route.geometries = geometries;

    route.path = [];
    if (geometries && geometries.length > 0) {
      const inbound = geometries.find(g => g.direction === 'Inbound');
      if (inbound && inbound.geometry) {
          try {
              const geom = JSON.parse(inbound.geometry);
              if (geom.coordinates) {
                  route.path = geom.coordinates.map((c, i) => ({ route_id: route.id, seq: i, lat: c[1], lng: c[0], map_x: 0, map_y: 0 }));
              }
          } catch(e) {}
      }
    }

    route.direction = "Loop";
    route.length_km = Math.max(parseFloat(route.inbound_distance_km) || 0, parseFloat(route.outbound_distance_km) || 0);

    const [announcements] = await db.execute(`SELECT a.* FROM announcements a JOIN announcement_routes ar ON ar.announcement_id = a.id WHERE ar.route_id = ? AND a.status != 'Expired' ORDER BY a.date DESC`, [route.id]);

    let fare = route.jeepney_type === 'Modern' ? 15 : 13;
    try {
      const [[rule]] = await db.execute("SELECT minimum, minimum_km, per_km FROM fare_rules WHERE is_current = 1 LIMIT 1");
      if (rule) {
        const km = route.length_km || 5;
        fare = km <= rule.minimum_km ? rule.minimum : rule.minimum + (km - rule.minimum_km) * rule.per_km;
        fare = Math.round(fare * 100) / 100;
      }
    } catch (_) {}

    const travelTime = Math.round((route.length_km || 5) * 3.5);

    res.json({ ...route, terminals, stops, transfers, roads, landmarks, announcements, fare, travelTime });
  } catch (err) { next(err); }
}

async function getOfflineBundle(req, res, next) {
  try {
    const [rows] = await db.execute("SELECT * FROM routes WHERE id = ?", [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Route not found" } });
    const route = rows[0];
    const [terminals] = await db.execute(`SELECT t.* FROM terminals t JOIN route_terminals rt ON rt.terminal_id=t.id WHERE rt.route_id=?`, [route.id]);
    const [stops] = await db.execute("SELECT * FROM loading_points WHERE route_id=?", [route.id]);
    const [transfers] = await db.execute("SELECT * FROM transfer_points WHERE route_id=?", [route.id]);
    
    const [geometries] = await db.execute("SELECT * FROM route_geometry WHERE route_id = ?", [route.id]);
    let path = [];
    if (geometries && geometries.length > 0) {
      const inbound = geometries.find(g => g.direction === 'Inbound');
      if (inbound && inbound.geometry) {
          try {
              const geom = JSON.parse(inbound.geometry);
              if (geom.coordinates) {
                  path = geom.coordinates.map((c, i) => ({ route_id: route.id, seq: i, lat: c[1], lng: c[0], map_x: 0, map_y: 0 }));
              }
          } catch(e) {}
      }
    }

    res.json({ route, terminals, stops, transfers, path, bundledAt: new Date().toISOString() });
  } catch (err) { next(err); }
}

module.exports = { list, getById, getOfflineBundle };

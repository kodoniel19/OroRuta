const db = require("../config/db");
const { calculateTraditionalFare } = require("../services/fareService");

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
        WHERE r.verification_status IN ('PUBLISHED', 'USER_SUPPLIED', 'VERIFIED') AND (
          r.code LIKE ? OR r.name LIKE ? OR r.origin LIKE ? OR r.destination LIKE ? OR r.description LIKE ?
          OR t.name LIKE ?
          OR lp.name LIKE ?
          OR tp.name LIKE ?
          OR lm.name LIKE ?
        )`;
      params.push(like, like, like, like, like, like, like, like, like);
    } else {
      // The mobile app should see published and user-supplied routes
      sql = "SELECT r.* FROM routes r WHERE r.verification_status IN ('PUBLISHED', 'USER_SUPPLIED', 'VERIFIED')";
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
      for (const g of geometries) {
        if (g.geometry && typeof g.geometry === 'object') {
          g.geometry = JSON.stringify(g.geometry);
        }
      }
      r.geometries = geometries;

      // Construct path for legacy compatibility
      r.path = [];
      if (geometries && geometries.length > 0) {
        // Just take inbound for the preview path
        const inbound = geometries.find(g => g.direction === 'Inbound') || geometries[0];
        if (inbound && inbound.geometry) {
            try {
                const geom = typeof inbound.geometry === 'string' ? JSON.parse(inbound.geometry) : inbound.geometry;
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

      // Traditional jeepney fare estimate
      const km = r.length_km || 5;
      const fareRes = calculateTraditionalFare(km, "Regular", r.jeepney_type);
      r.fare = fareRes.selectedCategoryFare ?? 13.00;
      r.discountedFare = fareRes.discountedFare ?? 10.40;

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
    const routeIdOrCode = req.params.id;
    let [rows] = await db.execute(
      "SELECT * FROM routes WHERE id = ? OR code = ? OR LOWER(code) = LOWER(?) LIMIT 1",
      [routeIdOrCode, routeIdOrCode, routeIdOrCode]
    );

    if (!rows.length) {
      const lower = routeIdOrCode.toLowerCase();
      const seedAliases = {
        'r-05': '785b6016-46e6-4dbb-9e9d-147d2ba36ef7',
        'r-02': 'ab2932ac-f720-4ddf-b8da-d1ce269bf890',
        'r-01': '04f8a2d2-6a9c-41a4-80fb-64368d6fe41c',
        'r-03': '306c43f2-66bd-4fa2-b90c-2f4a1ddde665',
        'r-04': '35e62a9b-9819-4620-9a56-a13393e288b3',
        'r-06': 'f9f9ff75-5901-4026-8cca-2024912ff3e6',
        'r1': '785b6016-46e6-4dbb-9e9d-147d2ba36ef7',
        'r2': 'ab2932ac-f720-4ddf-b8da-d1ce269bf890',
        'r3': '306c43f2-66bd-4fa2-b90c-2f4a1ddde665',
        'r4': '35e62a9b-9819-4620-9a56-a13393e288b3',
        'r5': 'ab2932ac-f720-4ddf-b8da-d1ce269bf890',
        'r6': '92f61e2e-6336-4010-9109-7789dd23a8eb',
        'c1': '3bcdc4d3-4790-4a3e-a1bf-ad48b2241ee0',
        'b1': '785b6016-46e6-4dbb-9e9d-147d2ba36ef7'
      };
      if (seedAliases[lower]) {
        const [aliasRows] = await db.execute("SELECT * FROM routes WHERE id = ?", [seedAliases[lower]]);
        if (aliasRows.length) rows = aliasRows;
      }
      if (!rows.length) {
        const [partialRows] = await db.execute(
          "SELECT * FROM routes WHERE code LIKE ? OR name LIKE ? ORDER BY code LIMIT 1",
          [`%${routeIdOrCode}%`, `%${routeIdOrCode}%`]
        );
        if (partialRows.length) rows = partialRows;
      }
    }

    if (!rows.length) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Route not found" } });
    let route = rows[0];
    
    const [terminals] = await db.execute(`SELECT t.* FROM terminals t JOIN route_terminals rt ON rt.terminal_id = t.id WHERE rt.route_id = ? ORDER BY rt.seq`, [route.id]);
    const [stops] = await db.execute("SELECT * FROM loading_points WHERE route_id = ? ORDER BY name", [route.id]);
    const [transfers] = await db.execute("SELECT * FROM transfer_points WHERE route_id = ? ORDER BY name", [route.id]);
    const [roads] = await db.execute(`SELECT mr.* FROM major_roads mr JOIN route_major_roads rmr ON rmr.road_id = mr.id WHERE rmr.route_id = ? ORDER BY rmr.seq`, [route.id]);
    const [landmarks] = await db.execute(`SELECT l.* FROM landmarks l JOIN route_landmarks rl ON rl.landmark_id = l.id WHERE rl.route_id = ? ORDER BY rl.seq`, [route.id]);
    
    let [directions] = await db.execute("SELECT * FROM route_directions WHERE route_id = ?", [route.id]);
    let [geometries] = await db.execute("SELECT * FROM route_geometry WHERE route_id = ?", [route.id]);

    // If this route record has no geometries, check if a verified route exists with the same code or name
    if (geometries.length === 0) {
      const [vRoute] = await db.execute(
        `SELECT r.* FROM routes r 
         WHERE (r.code = ? OR (r.name LIKE '%Bulua%' AND ? LIKE '%Bulua%'))
           AND (SELECT COUNT(*) FROM route_geometry WHERE route_id = r.id) > 0 
         LIMIT 1`,
        [route.code, route.name]
      );
      if (vRoute.length > 0) {
        const vr = vRoute[0];
        route.inbound_distance_km = route.inbound_distance_km || vr.inbound_distance_km;
        route.outbound_distance_km = route.outbound_distance_km || vr.outbound_distance_km;
        [directions] = await db.execute("SELECT * FROM route_directions WHERE route_id = ?", [vr.id]);
        [geometries] = await db.execute("SELECT * FROM route_geometry WHERE route_id = ?", [vr.id]);
      }
    }

    for (const g of geometries) {
      if (g.geometry && typeof g.geometry === 'object') {
        g.geometry = JSON.stringify(g.geometry);
      }
    }

    route.directions = directions;
    route.geometries = geometries;

    route.path = [];
    if (geometries && geometries.length > 0) {
      const inbound = geometries.find(g => g.direction === 'Inbound') || geometries[0];
      if (inbound && inbound.geometry) {
          try {
              const geom = typeof inbound.geometry === 'string' ? JSON.parse(inbound.geometry) : inbound.geometry;
              if (geom.coordinates) {
                  route.path = geom.coordinates.map((c, i) => ({ route_id: route.id, seq: i, lat: c[1], lng: c[0], map_x: 0, map_y: 0 }));
              }
          } catch(e) {}
      }
    }

    route.direction = "Loop";
    route.length_km = Math.max(parseFloat(route.inbound_distance_km) || 0, parseFloat(route.outbound_distance_km) || 0);

    const [announcements] = await db.execute(`SELECT a.* FROM announcements a JOIN announcement_routes ar ON ar.announcement_id = a.id WHERE ar.route_id = ? AND a.status != 'Expired' ORDER BY a.date DESC`, [route.id]);

    const km = route.length_km || 5;
    const fareRes = calculateTraditionalFare(km, "Regular", route.jeepney_type);
    const fare = fareRes.selectedCategoryFare ?? 13.00;
    const discountedFare = fareRes.discountedFare ?? 10.40;

    const travelTime = Math.round((route.length_km || 5) * 3.5);

    res.json({ ...route, terminals, stops, transfers, roads, landmarks, announcements, fare, discountedFare, travelTime });
  } catch (err) { next(err); }
}

async function getOfflineBundle(req, res, next) {
  try {
    const routeIdOrCode = req.params.id;
    let [rows] = await db.execute(
      "SELECT * FROM routes WHERE id = ? OR code = ? OR LOWER(code) = LOWER(?) LIMIT 1",
      [routeIdOrCode, routeIdOrCode, routeIdOrCode]
    );
    if (!rows.length) {
      const lower = routeIdOrCode.toLowerCase();
      const seedAliases = {
        'r-05': '785b6016-46e6-4dbb-9e9d-147d2ba36ef7',
        'r-02': 'ab2932ac-f720-4ddf-b8da-d1ce269bf890',
        'r-01': '04f8a2d2-6a9c-41a4-80fb-64368d6fe41c',
        'r-03': '306c43f2-66bd-4fa2-b90c-2f4a1ddde665',
        'r-04': '35e62a9b-9819-4620-9a56-a13393e288b3',
        'r-06': 'f9f9ff75-5901-4026-8cca-2024912ff3e6',
        'r1': '785b6016-46e6-4dbb-9e9d-147d2ba36ef7',
        'r2': 'ab2932ac-f720-4ddf-b8da-d1ce269bf890',
        'r3': '306c43f2-66bd-4fa2-b90c-2f4a1ddde665',
        'r4': '35e62a9b-9819-4620-9a56-a13393e288b3',
        'r5': 'ab2932ac-f720-4ddf-b8da-d1ce269bf890',
        'r6': '92f61e2e-6336-4010-9109-7789dd23a8eb',
        'c1': '3bcdc4d3-4790-4a3e-a1bf-ad48b2241ee0',
        'b1': '785b6016-46e6-4dbb-9e9d-147d2ba36ef7'
      };
      if (seedAliases[lower]) {
        const [aliasRows] = await db.execute("SELECT * FROM routes WHERE id = ?", [seedAliases[lower]]);
        if (aliasRows.length) rows = aliasRows;
      }
      if (!rows.length) {
        const [partialRows] = await db.execute(
          "SELECT * FROM routes WHERE code LIKE ? OR name LIKE ? ORDER BY code LIMIT 1",
          [`%${routeIdOrCode}%`, `%${routeIdOrCode}%`]
        );
        if (partialRows.length) rows = partialRows;
      }
    }
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

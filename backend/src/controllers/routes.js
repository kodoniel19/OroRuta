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
        WHERE (r.verification_status IN ('PUBLISHED', 'USER_SUPPLIED', 'VERIFIED', 'DRAFT') OR r.verification_status IS NULL) AND (
          r.code LIKE ? OR r.name LIKE ? OR r.origin LIKE ? OR r.destination LIKE ? OR r.description LIKE ?
          OR t.name LIKE ?
          OR lp.name LIKE ?
          OR tp.name LIKE ?
          OR lm.name LIKE ?
        )`;
      params.push(like, like, like, like, like, like, like, like, like);
    } else {
      // The mobile app should see published and user-supplied routes
      sql = "SELECT r.* FROM routes r WHERE (r.verification_status IN ('PUBLISHED', 'USER_SUPPLIED', 'VERIFIED', 'DRAFT') OR r.verification_status IS NULL)";
    }

    if (type) { sql += " AND r.jeepney_type = ?"; params.push(type); }

    const hasUpdatesCondition = `(
      r.status != 'Active'
      OR r.id IN (SELECT ar.route_id FROM announcement_routes ar JOIN announcements a ON a.id = ar.announcement_id WHERE a.status IN ('Active', 'Published'))
      OR r.code IN (SELECT ar.route_id FROM announcement_routes ar JOIN announcements a ON a.id = ar.announcement_id WHERE a.status IN ('Active', 'Published'))
      OR r.id IN (SELECT act.route_id FROM admin_activity act WHERE act.created_at >= DATE_SUB(NOW(), INTERVAL 14 DAY))
      OR r.code IN (SELECT act.route_id FROM admin_activity act WHERE act.created_at >= DATE_SUB(NOW(), INTERVAL 14 DAY))
      OR (r.last_updated_at IS NOT NULL AND r.last_updated_at >= DATE_SUB(NOW(), INTERVAL 7 DAY))
    )`;

    if (hasUpdates === "true") {
      sql += ` AND ${hasUpdatesCondition}`;
    } else {
      sql += " AND r.status = 'Active'";
    }
    sql += " ORDER BY r.code";
    
    // Fallback: If no routes are found yet, return active routes for testing
    let [rows] = await db.execute(sql, params);
    if (rows.length === 0 && !hasUpdates && !q) {
       sql = "SELECT * FROM routes WHERE status = 'Active' ORDER BY code";
       [rows] = await db.execute(sql, []);
    }

    // High-performance bulk hydration: 11 bulk queries instead of 979 individual per-route queries
    if (rows.length === 0) {
      return res.json([]);
    }

    const [
      [tCounts],
      [lCounts],
      [allDirections],
      [allGeometries],
      [allRoads],
      [allTerminals],
      [allStops],
      [allTransfers],
      [allLandmarks],
      [allAnns],
      [allActivities]
    ] = await Promise.all([
      db.execute("SELECT route_id, COUNT(*) cnt FROM route_terminals GROUP BY route_id"),
      db.execute("SELECT route_id, COUNT(*) cnt FROM loading_points GROUP BY route_id"),
      db.execute("SELECT * FROM route_directions"),
      db.execute("SELECT * FROM route_geometry"),
      db.execute("SELECT rmr.route_id, mr.* FROM major_roads mr JOIN route_major_roads rmr ON rmr.road_id = mr.id ORDER BY rmr.seq"),
      db.execute("SELECT rt.route_id, t.* FROM terminals t JOIN route_terminals rt ON rt.terminal_id = t.id ORDER BY rt.seq"),
      db.execute("SELECT * FROM loading_points ORDER BY name"),
      db.execute("SELECT * FROM transfer_points ORDER BY name"),
      db.execute("SELECT rl.route_id, l.* FROM landmarks l JOIN route_landmarks rl ON rl.landmark_id = l.id ORDER BY rl.seq"),
      db.execute("SELECT ar.route_id, a.id, a.title, a.date, a.category, a.description, a.effective, a.status FROM announcements a JOIN announcement_routes ar ON ar.announcement_id = a.id WHERE a.status IN ('Active', 'Published') ORDER BY a.date DESC").catch(() => [[]]),
      db.execute("SELECT DISTINCT route_id FROM admin_activity WHERE created_at >= DATE_SUB(NOW(), INTERVAL 14 DAY)").catch(() => [[]])
    ]);

    const tCountMap = new Map(tCounts.map(tc => [tc.route_id, tc.cnt]));
    const lCountMap = new Map(lCounts.map(lc => [lc.route_id, lc.cnt]));
    const actSet = new Set(allActivities.map(a => a.route_id));

    const groupBy = (items, key = 'route_id') => {
      const m = new Map();
      for (const item of items) {
        const k = item[key];
        let arr = m.get(k);
        if (!arr) { arr = []; m.set(k, arr); }
        arr.push(item);
      }
      return m;
    };

    const dirMap = groupBy(allDirections);
    const geomMap = groupBy(allGeometries);
    const roadMap = groupBy(allRoads);
    const termMap = groupBy(allTerminals);
    const stopMap = groupBy(allStops);
    const transMap = groupBy(allTransfers);
    const lmMap = groupBy(allLandmarks);
    const annMap = groupBy(allAnns);

    const now = new Date();

    for (const r of rows) {
      r.terminal_count = tCountMap.get(r.id) || 0;
      r.stop_count = lCountMap.get(r.id) || 0;
      r.is_popular = Boolean(r.is_popular);

      r.directions = dirMap.get(r.id) || [];

      const geometries = geomMap.get(r.id) || [];
      for (const g of geometries) {
        if (g.geometry && typeof g.geometry === 'object') {
          g.geometry = JSON.stringify(g.geometry);
        }
      }
      r.geometries = geometries;

      r.path = [];
      if (geometries && geometries.length > 0) {
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

      r.direction = "Loop";
      r.length_km = Math.max(parseFloat(r.inbound_distance_km) || 0, parseFloat(r.outbound_distance_km) || 0);
      r.roads = roadMap.get(r.id) || [];

      const km = r.length_km || 5;
      const fareRes = calculateTraditionalFare(km, "Regular", r.jeepney_type);
      r.fare = fareRes.selectedCategoryFare ?? 13.00;
      r.discountedFare = fareRes.discountedFare ?? 10.40;

      r.terminals = termMap.get(r.id) || [];
      r.stops = stopMap.get(r.id) || [];
      r.transfers = transMap.get(r.id) || [];
      r.landmarks = lmMap.get(r.id) || [];

      const routeAnns = (annMap.get(r.id) || []).concat(annMap.get(r.code) || []);
      r.announcements = routeAnns;

      const isRecentlyUpdated = r.last_updated_at && (now - new Date(r.last_updated_at)) < (7 * 24 * 60 * 60 * 1000);
      const hasAct = actSet.has(r.id) || actSet.has(r.code);
      r.has_updates = Boolean(r.status !== 'Active' || hasAct || routeAnns.length > 0 || isRecentlyUpdated);

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

    const [announcements] = await db.execute(`SELECT a.* FROM announcements a JOIN announcement_routes ar ON ar.announcement_id = a.id WHERE (ar.route_id = ? OR ar.route_id = ?) AND a.status IN ('Active', 'Published') ORDER BY a.date DESC`, [route.id, route.code]);

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
    const [terminals] = await db.execute(`SELECT t.* FROM terminals t JOIN route_terminals rt ON rt.terminal_id=t.id WHERE rt.route_id=? ORDER BY rt.seq`, [route.id]);
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

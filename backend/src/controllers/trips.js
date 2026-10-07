const db = require("../config/db");
const { haversineMeters, estimateFare } = require("../utils");
const { CDO_BASE_PLACES } = require("./places");

// In-memory cache for generated recommendations
const dynamicOptionsCache = new Map();

async function resolvePlace(queryStr, lat, lng, isOrigin = true) {
  let allPlaces = [];
  try {
    const [places] = await db.execute("SELECT * FROM places");
    allPlaces = places;
  } catch (_) {
    allPlaces = [];
  }

  // Load verified locations from the centralized locations table
  try {
    const [locs] = await db.execute(
      "SELECT id, name, barangay as area, latitude as lat, longitude as lng, 'landmark' as kind FROM locations WHERE latitude IS NOT NULL AND longitude IS NOT NULL"
    );
    for (const l of locs) {
      allPlaces.push({
        id: l.id,
        name: l.name,
        area: l.area || "Cagayan de Oro",
        kind: "landmark",
        lat: parseFloat(l.lat),
        lng: parseFloat(l.lng),
        map_x: 0,
        map_y: 0
      });
    }
  } catch (_) {}

  // Merge with base places
  const map = new Map();
  CDO_BASE_PLACES.forEach(p => map.set(p.id, p));
  allPlaces.forEach(p => map.set(p.id, p));
  const places = Array.from(map.values());

  const q = (queryStr || "").trim().toLowerCase();
  const isCurrent = !q || /current|location|here|gps|my location/i.test(q);

  // 1. If GPS coordinates provided or current location requested
  if (lat && lng && (isCurrent || isOrigin)) {
    let best = null, bestDist = Infinity;
    for (const p of places) {
      const d = haversineMeters(parseFloat(lat), parseFloat(lng), p.lat, p.lng);
      if (d < bestDist) { bestDist = d; best = p; }
    }
    if (best) return best;
  }

  if (isCurrent && places.length > 0) {
    const cdoCarmen = places.find(p => p.name.includes("Carmen")) || places[0];
    return cdoCarmen;
  }

  // 2. Exact match
  const exact = places.find(p => p.name.toLowerCase() === q);
  if (exact) return exact;

  // 3. Substring match
  const sub = places.find(p => p.name.toLowerCase().includes(q) || q.includes(p.name.toLowerCase()));
  if (sub) return sub;

  // 4. Token match
  const tokens = q.split(/[\s,.-]+/).filter(t => t.length > 2 && !["near", "cdo", "city", "public", "market", "the"].includes(t));
  for (const t of tokens) {
    const matched = places.find(p => p.name.toLowerCase().includes(t));
    if (matched) return matched;
  }

  // 5. Fallback
  if (!queryStr || !queryStr.trim()) {
    return isOrigin ? places[0] : (places[1] || places[0]);
  }

  return null;
}

/**
 * Geometric jeepney route finder.
 * Finds all routes from the database that pass near origin and destination.
 */
async function findJeepneyRoutesForOD(origLat, origLng, destLat, destLng, originName, destName) {
  let routes = [];
  try {
    const [dbRoutes] = await db.execute("SELECT * FROM routes WHERE status != 'Inactive'");
    routes = dbRoutes;
  } catch (_) {
    routes = [];
  }

  if (!routes.length) {
    // If no routes in DB, load mock seed routes
    return [];
  }

  // Fetch all path points and loading points for routes
  const routeCandidates = [];

  for (const r of routes) {
    let pathPoints = [];
    let loadingPoints = [];
    try {
      const [pts] = await db.execute("SELECT * FROM route_path_points WHERE route_id = ? ORDER BY seq", [r.id]);
      pathPoints = pts;
      const [lps] = await db.execute("SELECT * FROM loading_points WHERE route_id = ?", [r.id]);
      loadingPoints = lps;
    } catch (_) {}

    // Find closest point on route to origin
    let closestToOrigin = null;
    let minOrigDist = Infinity;
    let origSeq = -1;

    for (let i = 0; i < pathPoints.length; i++) {
      const pt = pathPoints[i];
      const dist = haversineMeters(origLat, origLng, pt.lat, pt.lng);
      if (dist < minOrigDist) {
        minOrigDist = dist;
        closestToOrigin = pt;
        origSeq = pt.seq;
      }
    }

    // Find closest point on route to destination
    let closestToDest = null;
    let minDestDist = Infinity;
    let destSeq = -1;

    for (let i = 0; i < pathPoints.length; i++) {
      const pt = pathPoints[i];
      const dist = haversineMeters(destLat, destLng, pt.lat, pt.lng);
      if (dist < minDestDist) {
        minDestDist = dist;
        closestToDest = pt;
        destSeq = pt.seq;
      }
    }

    // Check loading points if closer
    for (const lp of loadingPoints) {
      const distO = haversineMeters(origLat, origLng, lp.lat, lp.lng);
      if (distO < minOrigDist) {
        minOrigDist = distO;
        closestToOrigin = { lat: lp.lat, lng: lp.lng, name: lp.name };
      }
      const distD = haversineMeters(destLat, destLng, lp.lat, lp.lng);
      if (distD < minDestDist) {
        minDestDist = distD;
        closestToDest = { lat: lp.lat, lng: lp.lng, name: lp.name };
      }
    }

    // Calculate approximate travel distance along route
    const straightDistKm = haversineMeters(origLat, origLng, destLat, destLng) / 1000;
    const estRouteKm = Math.max(1.2, Math.round(straightDistKm * 1.25 * 10) / 10);

    routeCandidates.push({
      route: r,
      minOrigDist,
      minDestDist,
      closestToOrigin,
      closestToDest,
      origSeq,
      destSeq,
      estRouteKm,
      // Total score: distance to walk + route length
      score: minOrigDist * 1.5 + minDestDist * 1.5 + straightDistKm * 1000
    });
  }

  // Sort candidates by lowest score (closest walk & best path)
  routeCandidates.sort((a, b) => a.score - b.score);
  return routeCandidates;
}

async function search(req, res, next) {
  try {
    const { from = "", to = "", fromLat, fromLng, toLat, toLng, sort = "time" } = req.query;
    if (!to && !toLat) {
      return res.status(400).json({ error: { code: "BAD_REQUEST", message: "to destination is required" } });
    }

    const originPlace = await resolvePlace(from, fromLat, fromLng, true);
    let destPlace = await resolvePlace(to, toLat, toLng, false);

    if (!originPlace || !destPlace) {
      return res.json([]);
    }

    // Check pre-configured database trip options
    let [options] = await db.execute(
      `SELECT * FROM trip_options WHERE origin_place_id = ? AND destination_place_id = ?`,
      [originPlace.id, destPlace.id]
    ).catch(() => [[]]);

    let fareRule = null;
    try {
      const [[f]] = await db.execute("SELECT * FROM fare_rules WHERE is_current = 1 LIMIT 1");
      fareRule = f;
    } catch (_) {}

    if (options && options.length > 0) {
      const enriched = await Promise.all(options.map(async (opt) => {
        const [segments] = await db.execute(
          `SELECT ts.*, r.code, r.name as route_name, r.color, r.jeepney_type, r.status as route_status
           FROM trip_segments ts JOIN routes r ON r.id = ts.route_id
           WHERE ts.trip_option_id = ? ORDER BY ts.seq`, [opt.id]).catch(() => [[]]);
        const [legs] = await db.execute(
          `SELECT tl.*, r.code as route_code, r.color as route_color
           FROM trip_legs tl LEFT JOIN routes r ON r.id = tl.route_id
           WHERE tl.trip_option_id = ? ORDER BY tl.seq`, [opt.id]).catch(() => [[]]);
        const totalKm = segments.reduce((s, sg) => s + parseFloat(sg.km || 0), 0);
        const regularFare = fareRule ? estimateFare(totalKm, fareRule, "Regular") : 13;
        const discountFare = fareRule ? estimateFare(totalKm, fareRule, "Student") : 10;
        return { ...opt, segments, legs, totalKm, regularFare, discountFare, originPlace, destPlace };
      }));
      return res.json(enriched);
    }

    // Generate geometric route recommendations
    const oLat = fromLat ? parseFloat(fromLat) : originPlace.lat;
    const oLng = fromLng ? parseFloat(fromLng) : originPlace.lng;
    const dLat = toLat ? parseFloat(toLat) : destPlace.lat;
    const dLng = toLng ? parseFloat(toLng) : destPlace.lng;

    const candidates = await findJeepneyRoutesForOD(oLat, oLng, dLat, dLng, originPlace.name, destPlace.name);
    const results = [];

    // Take top 3 best matching routes
    const topCandidates = candidates.slice(0, 3);
    for (let i = 0; i < topCandidates.length; i++) {
      const cand = topCandidates[i];
      const r = cand.route;
      const walkToBoardM = Math.round(cand.minOrigDist);
      const walkFromDropM = Math.round(cand.minDestDist);
      const totalWalkM = walkToBoardM + walkFromDropM;
      const walkMinutes = Math.max(1, Math.round(totalWalkM / 70)); // ~70m per min
      const rideMinutes = Math.max(10, Math.round(cand.estRouteKm * 3.5));
      const totalMinutes = walkMinutes + rideMinutes;

      const regularFare = fareRule ? estimateFare(cand.estRouteKm, fareRule, "Regular") : 13;
      const discountFare = fareRule ? estimateFare(cand.estRouteKm, fareRule, "Student") : 10;

      const boardPointName = cand.closestToOrigin?.name || `Loading point near ${originPlace.name}`;
      const dropPointName = cand.closestToDest?.name || `Stop near ${destPlace.name}`;

      const optId = `rec-${r.id}-${i}-${originPlace.id}-${destPlace.id}`;
      const option = {
        id: optId,
        origin_place_id: originPlace.id,
        destination_place_id: destPlace.id,
        minutes: totalMinutes,
        transfers: 0,
        walk_meters: totalWalkM,
        walk_minutes: walkMinutes,
        totalKm: cand.estRouteKm,
        regularFare,
        discountFare,
        originPlace,
        destPlace,
        boarding_name: boardPointName,
        boarding_lat: cand.closestToOrigin?.lat || oLat,
        boarding_lng: cand.closestToOrigin?.lng || oLng,
        dropoff_name: dropPointName,
        dropoff_lat: cand.closestToDest?.lat || dLat,
        dropoff_lng: cand.closestToDest?.lng || dLng,
        segments: [
          {
            id: `seg-${optId}-1`,
            trip_option_id: optId,
            route_id: r.id,
            seq: 1,
            code: r.code,
            route_name: r.name,
            color: r.color,
            jeepney_type: r.jeepney_type,
            route_status: r.status,
            km: cand.estRouteKm,
            minutes: rideMinutes
          }
        ],
        legs: [
          {
            id: `leg-${optId}-1`,
            trip_option_id: optId,
            seq: 1,
            kind: "walk",
            title: `Walk to ${boardPointName}`,
            detail: `Head towards ${boardPointName} (~${walkToBoardM}m)`,
            distance_m: walkToBoardM,
            minutes: Math.max(1, Math.round(walkToBoardM / 70))
          },
          {
            id: `leg-${optId}-2`,
            trip_option_id: optId,
            seq: 2,
            kind: "board",
            title: `Ride Route ${r.code} – ${r.name}`,
            detail: `Board ${r.code} jeepney towards ${r.destination}`,
            distance_m: Math.round(cand.estRouteKm * 1000),
            minutes: rideMinutes,
            route_code: r.code,
            route_color: r.color
          },
          {
            id: `leg-${optId}-3`,
            trip_option_id: optId,
            seq: 3,
            kind: "walk",
            title: `Walk to ${destPlace.name}`,
            detail: `Arrive at destination (~${walkFromDropM}m)`,
            distance_m: walkFromDropM,
            minutes: Math.max(1, Math.round(walkFromDropM / 70))
          }
        ]
      };

      results.push(option);
      dynamicOptionsCache.set(option.id, option);
    }

    // Sort according to request
    results.sort((a, b) => {
      if (sort === "fare") return a.regularFare - b.regularFare;
      if (sort === "walk") return a.walk_meters - b.walk_meters;
      return a.minutes - b.minutes;
    });

    res.json(results);
  } catch (err) { next(err); }
}

async function getOption(req, res, next) {
  try {
    const { id } = req.params;
    if (dynamicOptionsCache.has(id)) {
      return res.json(dynamicOptionsCache.get(id));
    }
    const [rows] = await db.execute("SELECT * FROM trip_options WHERE id = ?", [id]);
    if (!rows.length) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Trip option not found" } });
    const opt = rows[0];
    const [segments] = await db.execute(
      `SELECT ts.*, r.code, r.name as route_name, r.color, r.jeepney_type, r.status as route_status
       FROM trip_segments ts JOIN routes r ON r.id = ts.route_id
       WHERE ts.trip_option_id = ? ORDER BY ts.seq`, [id]);
    const [legs] = await db.execute(
      `SELECT tl.*, r.code as route_code, r.color as route_color
       FROM trip_legs tl LEFT JOIN routes r ON r.id = tl.route_id
       WHERE tl.trip_option_id = ? ORDER BY tl.seq`, [id]);
    const [[fareRule]] = await db.execute("SELECT * FROM fare_rules WHERE is_current=1 LIMIT 1");
    const totalKm = segments.reduce((s, sg) => s + parseFloat(sg.km), 0);
    const regularFare = fareRule ? estimateFare(totalKm, fareRule, "Regular") : 13;
    const discountFare = fareRule ? estimateFare(totalKm, fareRule, "Student") : 10;
    const [[originPlace]] = await db.execute("SELECT * FROM places WHERE id=?", [opt.origin_place_id]);
    const [[destPlace]] = await db.execute("SELECT * FROM places WHERE id=?", [opt.destination_place_id]);
    res.json({ ...opt, segments, legs, totalKm, regularFare, discountFare, originPlace, destPlace });
  } catch (err) { next(err); }
}

async function routeRecommendations(req, res, next) {
  try {
    const { origin, destination } = req.body;
    if (!origin || !destination) {
      return res.status(400).json({ error: { code: "BAD_REQUEST", message: "origin and destination are required" } });
    }
    const origLat = origin.latitude || origin.lat;
    const origLng = origin.longitude || origin.lng;
    const destLat = destination.latitude || destination.lat;
    const destLng = destination.longitude || destination.lng;

    // Delegate to search logic using coordinates
    req.query.fromLat = origLat;
    req.query.fromLng = origLng;
    req.query.toLat = destLat;
    req.query.toLng = destLng;
    req.query.from = origin.name || "Current Location";
    req.query.to = destination.name || "Destination";
    return search(req, res, next);
  } catch (err) { next(err); }
}

async function recordCompleted(req, res, next) {
  try {
    const { tripOptionId } = req.body;
    const { uuidv4 } = require("../utils");
    await db.execute(
      "INSERT INTO completed_trips (id, device_id, trip_option_id, completed_at) VALUES (?,?,?,NOW())",
      [uuidv4(), req.deviceId, tripOptionId || null]
    );
    res.status(201).json({ ok: true });
  } catch (err) { next(err); }
}

module.exports = { search, getOption, routeRecommendations, recordCompleted };

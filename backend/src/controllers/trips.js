const db = require("../config/db");
const { haversineMeters, estimateFare } = require("../utils");
const { getRouteGeometry, getWalkingRoute } = require("../utils/routing");
const { rankDirectItineraries } = require("../domain/routeItineraryPlanner");

// In-memory cache for generated recommendations and trip options
const dynamicOptionsCache = new Map();

/**
 * Calculates polyline length in meters from [[lng, lat], ...]
 */
function calculatePolylineMeters(coords) {
  let meters = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    meters += haversineMeters(coords[i][1], coords[i][0], coords[i + 1][1], coords[i + 1][0]);
  }
  return meters;
}

// Common CDO known aliases for instant resolution
const CDO_ALIASES = [
  { keywords: ["sm downtown", "sm premier", "sm cdo downtown", "downtown premier"], name: "SM CDO Downtown Premier", area: "Lapasan", kind: "mall", lat: 8.4855, lng: 124.6535 },
  { keywords: ["miami inn", "miami inn carmen", "miami", "vamenta miami"], name: "Miami Inn Carmen", area: "Carmen", kind: "landmark", lat: 8.477285, lng: 124.637633 },
  { keywords: ["gumamela", "gumamela ext", "gumamela extension"], name: "Gumamela Extension, Carmen", area: "Carmen", kind: "landmark", lat: 8.4908, lng: 124.6338 },
  { keywords: ["centrio", "ayala centrio", "centrio mall"], name: "Centrio Mall", area: "Poblacion", kind: "mall", lat: 8.4877, lng: 124.6517 },
  { keywords: ["limketkai", "ketkai"], name: "Limketkai Center", area: "Lapasan", kind: "mall", lat: 8.4842, lng: 124.6568 },
  { keywords: ["gaisano", "gaisano city"], name: "Gaisano City Mall", area: "Lapasan", kind: "mall", lat: 8.4842, lng: 124.6515 },
  { keywords: ["cogon", "cogon market"], name: "Cogon Market", area: "Cogon", kind: "market", lat: 8.4735, lng: 124.6497 },
  { keywords: ["carmen market", "carmen public market"], name: "Carmen Market", area: "Carmen", kind: "market", lat: 8.4845, lng: 124.6335 },
  { keywords: ["agora", "agora terminal"], name: "Agora Terminal", area: "Lapasan", kind: "terminal", lat: 8.4857, lng: 124.6589 },
  { keywords: ["bulua", "bulua terminal", "wtpm", "westbound"], name: "Bulua Terminal", area: "Bulua", kind: "terminal", lat: 8.5040, lng: 124.6115 },
  { keywords: ["liceo", "liceo main", "liceo de cagayan"], name: "Liceo de Cagayan University", area: "Kauswagan", kind: "school", lat: 8.4965, lng: 124.6407 },
  { keywords: ["xavier", "xu", "ateneo de cagayan"], name: "Xavier University", area: "Poblacion", kind: "school", lat: 8.4784, lng: 124.6489 },
  { keywords: ["ustp", "must"], name: "USTP Lapasan", area: "Lapasan", kind: "school", lat: 8.4852, lng: 124.6572 },
  { keywords: ["nmmc", "provincial hospital"], name: "NMMC", area: "Poblacion", kind: "hospital", lat: 8.4875, lng: 124.6468 },
  { keywords: ["polymedic", "polymedic plaza"], name: "Cagayan de Oro Polymedic Plaza", area: "Kauswagan", kind: "hospital", lat: 8.4940, lng: 124.6305 },
  { keywords: ["savemore kauswagan", "savemore market"], name: "Savemore Market Kauswagan", area: "Kauswagan", kind: "market", lat: 8.4960, lng: 124.6340 },
  { keywords: ["capitol university", "cu"], name: "Capitol University", area: "Lapasan", kind: "school", lat: 8.4870, lng: 124.6550 }
];

/**
 * Resolves a place from query string or coordinates
 */
async function resolvePlace(queryStr, lat, lng, isOrigin = true) {
  // If coordinates are explicitly provided, prioritize exact coordinates
  if (lat !== undefined && lng !== undefined && !isNaN(parseFloat(lat)) && !isNaN(parseFloat(lng))) {
    const fLat = parseFloat(lat);
    const fLng = parseFloat(lng);
    let bestName = queryStr && queryStr.trim() ? queryStr.trim() : (isOrigin ? "Current Location" : "Destination");
    
    // Check if close to a known canonical place (< 150m)
    try {
      const [places] = await db.execute("SELECT * FROM places");
      for (const p of places) {
        if (haversineMeters(fLat, fLng, parseFloat(p.lat), parseFloat(p.lng)) < 150) {
          if (!queryStr || queryStr.toLowerCase().includes("current") || queryStr.toLowerCase().includes("location")) {
            bestName = p.name;
          }
          return {
            id: p.id,
            name: bestName,
            area: p.area,
            kind: p.kind,
            lat: fLat,
            lng: fLng
          };
        }
      }
    } catch (_) {}

    return {
      id: isOrigin ? "origin-coord" : "dest-coord",
      name: bestName,
      area: "Cagayan de Oro",
      kind: isOrigin ? "origin" : "destination",
      lat: fLat,
      lng: fLng
    };
  }

  const q = (queryStr || "").trim().toLowerCase();
  if (!q) return null;

  // Check alias table first
  for (const alias of CDO_ALIASES) {
    if (alias.keywords.some(k => q.includes(k) || k.includes(q))) {
      return {
        id: `alias-${alias.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
        name: alias.name,
        area: alias.area,
        kind: alias.kind,
        lat: alias.lat,
        lng: alias.lng
      };
    }
  }

  try {
    const [places] = await db.execute("SELECT * FROM places ORDER BY name");
    // 1. Exact match
    const exact = places.find(p => p.name.toLowerCase() === q);
    if (exact) {
      return { ...exact, lat: parseFloat(exact.lat), lng: parseFloat(exact.lng) };
    }

    // 2. Substring match
    const sub = places.find(p => p.name.toLowerCase().includes(q) || q.includes(p.name.toLowerCase()));
    if (sub) {
      return { ...sub, lat: parseFloat(sub.lat), lng: parseFloat(sub.lng) };
    }

    // 3. Search landmarks, terminals, and loading points
    const like = `%${q}%`;
    const [terms] = await db.execute("SELECT id, name, lat, lng FROM terminals WHERE name LIKE ? LIMIT 1", [like]);
    if (terms.length) {
      return { id: terms[0].id, name: terms[0].name, area: "Cagayan de Oro", kind: "terminal", lat: parseFloat(terms[0].lat), lng: parseFloat(terms[0].lng) };
    }

    const [lms] = await db.execute("SELECT id, name, lat, lng FROM landmarks WHERE name LIKE ? LIMIT 1", [like]);
    if (lms.length) {
      return { id: lms[0].id, name: lms[0].name, area: "Cagayan de Oro", kind: "landmark", lat: parseFloat(lms[0].lat), lng: parseFloat(lms[0].lng) };
    }

    const [lps] = await db.execute("SELECT id, name, lat, lng FROM loading_points WHERE (name LIKE ? OR note LIKE ?) AND lat != 0 LIMIT 1", [like, like]);
    if (lps.length) {
      return { id: lps[0].id, name: lps[0].name, area: "Cagayan de Oro", kind: "loading_point", lat: parseFloat(lps[0].lat), lng: parseFloat(lps[0].lng) };
    }

    // 4. Keyword / Token match
    const tokens = q.split(/[\s,.-]+/).filter(t => t.length > 2 && !["near", "cdo", "city", "public", "market", "the"].includes(t));
    for (const t of tokens) {
      const matched = places.find(p => p.name.toLowerCase().includes(t));
      if (matched) {
        return { ...matched, lat: parseFloat(matched.lat), lng: parseFloat(matched.lng) };
      }
    }
  } catch (_) {}

  return null;
}

/**
 * Identify a friendly boarding or dropoff stop name near coordinates.
 * Checks verified loading points and terminals in order;
 * falls back to a descriptive label using nearby CDO street aliases.
 */
function findStopLabel(lat, lng, defaultPrefix, fallbackLandmark, terminalList, loadingPointsList = []) {
  // 1. Check verified loading points (< 200m)
  if (loadingPointsList && loadingPointsList.length > 0) {
    let closest = null, closestDist = Infinity;
    for (const lp of loadingPointsList) {
      if (lp.lat && lp.lng) {
        const d = haversineMeters(lat, lng, parseFloat(lp.lat), parseFloat(lp.lng));
        if (d < closestDist) { closestDist = d; closest = lp; }
      }
    }
    if (closest && closestDist < 200) return closest.name;
  }

  // 2. Check terminals (< 280m)
  if (terminalList && terminalList.length > 0) {
    let closest = null, closestDist = Infinity;
    for (const t of terminalList) {
      if (t.lat && t.lng) {
        const d = haversineMeters(lat, lng, parseFloat(t.lat), parseFloat(t.lng));
        if (d < closestDist) { closestDist = d; closest = t; }
      }
    }
    if (closest && closestDist < 280) return closest.name;
  }

  // 3. Approximate by CDO street using lat/lng banding
  // Masterson Ave / CM Recto corridor runs roughly lng 124.62–124.66, lat 8.47–8.50
  const streetHints = [
    { minLat:8.510, maxLat:8.540, minLng:124.600, maxLng:124.640, name:"Masterson Ave (Bulua side)" },
    { minLat:8.490, maxLat:8.512, minLng:124.620, maxLng:124.650, name:"Masterson Ave (Kauswagan side)" },
    { minLat:8.475, maxLat:8.495, minLng:124.625, maxLng:124.645, name:"CM Recto Ave (Carmen side)" },
    { minLat:8.476, maxLat:8.490, minLng:124.645, maxLng:124.668, name:"CM Recto Ave (Cogon-Divisoria)" },
    { minLat:8.483, maxLat:8.495, minLng:124.648, maxLng:124.670, name:"Velez-Recto Junction area" },
    { minLat:8.475, maxLat:8.483, minLng:124.640, maxLng:124.655, name:"Cogon Market area" },
    { minLat:8.478, maxLat:8.492, minLng:124.638, maxLng:124.648, name:"Divisoria area" },
    { minLat:8.482, maxLat:8.490, minLng:124.650, maxLng:124.660, name:"Limketkai / Lapasan area" },
    { minLat:8.484, maxLat:8.492, minLng:124.655, maxLng:124.670, name:"Agora-Lapasan corridor" },
    { minLat:8.488, maxLat:8.500, minLng:124.670, maxLng:124.695, name:"Puerto/Gusa Highway area" },
  ];
  for (const s of streetHints) {
    if (lat >= s.minLat && lat <= s.maxLat && lng >= s.minLng && lng <= s.maxLng) {
      return `${defaultPrefix} along ${s.name}`;
    }
  }

  return `${defaultPrefix} near ${fallbackLandmark}`;
}

/**
 * Geometric jeepney route finder.
 * Finds all genuine traditional routes from the database that pass near origin and destination,
 * ensuring correct direction of travel and valid walking distances.
 */
async function findJeepneyRoutesForOD(origLat, origLng, destLat, destLng, originName, destName) {
  let routes = [];
  try {
    const [dbRoutes] = await db.execute(
      "SELECT * FROM routes WHERE status != 'Inactive' AND (jeepney_type = 'Traditional' OR jeepney_type IS NULL OR jeepney_type = '')"
    );
    routes = dbRoutes;
  } catch (_) {
    routes = [];
  }

  if (!routes.length) return [];

  let fareRule = null;
  try {
    const [[f]] = await db.execute("SELECT * FROM fare_rules WHERE is_current = 1 LIMIT 1");
    fareRule = f;
  } catch (_) {}

  const candidates = [];

  for (const r of routes) {
    let geos = [];
    try {
      const [gRows] = await db.execute("SELECT direction, geometry FROM route_geometry WHERE route_id = ?", [r.id]);
      geos = gRows;
    } catch (_) {}

    let dirs = [];
    try {
      const [dRows] = await db.execute("SELECT direction, distance_km, street_sequence FROM route_directions WHERE route_id = ?", [r.id]);
      dirs = dRows;
    } catch (_) {}
    const dirMap = {};
    dirs.forEach(d => { dirMap[d.direction] = d; });

    let routeTerminals = [], routeStops = [], routeTransfers = [];
    try {
      const [rows] = await db.execute("SELECT t.id, t.name, t.lat, t.lng FROM terminals t JOIN route_terminals rt ON rt.terminal_id=t.id WHERE rt.route_id=?", [r.id]);
      routeTerminals = rows;
    } catch (_) {}
    try {
      const [rows] = await db.execute("SELECT id, name, point_type, lat, lng FROM loading_points WHERE route_id=?", [r.id]);
      routeStops = rows;
    } catch (_) {}
    try {
      const [rows] = await db.execute("SELECT id, name, lat, lng FROM transfer_points WHERE route_id=?", [r.id]);
      routeTransfers = rows;
    } catch (_) {}

    for (const g of geos) {
      const direction = g.direction;
      let geom = g.geometry;
      if (typeof geom === "string") {
        try { geom = JSON.parse(geom); } catch (_) { geom = null; }
      }
      if (!geom || !geom.coordinates || geom.coordinates.length < 2) continue;

      const coords = geom.coordinates; // [[lng, lat], ...]

      const boardStops = [
        ...routeTerminals.map(p => ({ ...p, point_type: "terminal" })),
        ...routeStops.filter(p => String(p.point_type).toLowerCase() !== "unloading"),
        ...routeTransfers.map(p => ({ ...p, point_type: "transfer" }))
      ];
      const alightStops = [
        ...routeTerminals.map(p => ({ ...p, point_type: "terminal" })),
        ...routeStops,
        ...routeTransfers.map(p => ({ ...p, point_type: "transfer" }))
      ];
      candidates.push(...rankDirectItineraries({
        routes: [{ route: r, direction, coordinates: coords, boardingStops: boardStops,
          alightingStops: alightStops, streetSequence: dirMap[direction]?.street_sequence || "" }],
        origin: { lat: origLat, lng: origLng },
        destination: { lat: destLat, lng: destLng },
        fareRule
      }));
    }
  }

  // Public route codes repeat across different route records; retain each route and direction.
  const bestByRouteDirection = new Map();
  for (const c of candidates) {
    const key = `${c.route.id}:${c.direction}`;
    if (!bestByRouteDirection.has(key) || c.convenienceScore < bestByRouteDirection.get(key).convenienceScore) {
      bestByRouteDirection.set(key, c);
    }
  }
  return Array.from(bestByRouteDirection.values()).sort((a, b) =>
    a.convenienceScore - b.convenienceScore || a.totalWalkM - b.totalWalkM || a.regularFare - b.regularFare
  );
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

    const oLat = fromLat ? parseFloat(fromLat) : originPlace.lat;
    const oLng = fromLng ? parseFloat(fromLng) : originPlace.lng;
    const dLat = toLat ? parseFloat(toLat) : destPlace.lat;
    const dLng = toLng ? parseFloat(toLng) : destPlace.lng;

    // Find verified candidates along actual jeepney routes
    const candidates = await findJeepneyRoutesForOD(oLat, oLng, dLat, dLng, originPlace.name, destPlace.name);

    if (candidates.length === 0) {
      return res.json([]);
    }

    // Sort according to requested criterion
    candidates.sort((a, b) => {
      if (sort === "time") return a.convenienceScore - b.convenienceScore || a.totalWalkM - b.totalWalkM;
      if (sort === "fare") return a.regularFare - b.regularFare || a.walkFromDropM - b.walkFromDropM || a.totalMinutes - b.totalMinutes;
      if (sort === "walk") return a.totalWalkM - b.totalWalkM || a.walkFromDropM - b.walkFromDropM || a.totalMinutes - b.totalMinutes;
      if (sort === "transfers") return 0; // All direct routes have 0 transfers
      return a.convenienceScore - b.convenienceScore || a.totalMinutes - b.totalMinutes;
    });

    // Refine the leading candidates using real pedestrian routes when OSRM can provide them.
    // The remaining options retain explicitly approximate walking estimates.
    const walkRoutesByKey = new Map();
    const refineCandidates = candidates.slice(0, 10);
    await Promise.all(refineCandidates.map(async c => {
      const [walkTo, walkFrom] = await Promise.all([
        getWalkingRoute([oLng, oLat], c.boardingCoord).catch(() => null),
        getWalkingRoute(c.dropoffCoord, [dLng, dLat]).catch(() => null)
      ]);
      const info = {
        walkToCoords: walkTo?.coordinates?.length >= 2 ? walkTo.coordinates : [],
        walkToMeters: walkTo?.coordinates?.length >= 2 ? Math.round(walkTo.distanceMeters) : c.walkToBoardM,
        walkToIsEstimate: !(walkTo?.coordinates?.length >= 2),
        walkFromCoords: walkFrom?.coordinates?.length >= 2 ? walkFrom.coordinates : [],
        walkFromMeters: walkFrom?.coordinates?.length >= 2 ? Math.round(walkFrom.distanceMeters) : c.walkFromDropM,
        walkFromIsEstimate: !(walkFrom?.coordinates?.length >= 2)
      };
      c.walkToBoardM = info.walkToMeters;
      c.walkFromDropM = info.walkFromMeters;
      c.totalWalkM = info.walkToMeters + info.walkFromMeters;
      c.walkMinutesToBoard = Math.max(1, Math.round(info.walkToMeters / 75));
      c.walkMinutesFromDrop = Math.max(1, Math.round(info.walkFromMeters / 75));
      c.walkMinutes = c.walkMinutesToBoard + c.walkMinutesFromDrop;
      c.totalMinutes = c.walkMinutes + c.rideMinutes + 3;
      c.convenienceScore = c.totalMinutes + c.totalWalkM / 400;
      walkRoutesByKey.set(`${c.route.id}:${c.direction}`, info);
    }));
    candidates.sort((a, b) => {
      if (sort === "fare") return a.regularFare - b.regularFare || a.totalWalkM - b.totalWalkM || a.totalMinutes - b.totalMinutes;
      if (sort === "walk") return a.totalWalkM - b.totalWalkM || a.totalMinutes - b.totalMinutes || a.regularFare - b.regularFare;
      return a.convenienceScore - b.convenienceScore || a.totalWalkM - b.totalWalkM || a.regularFare - b.regularFare;
    });

    // Build rich, distinct trip option objects for top candidates
    const results = [];
    const topCandidates = candidates.slice(0, 5);

    for (let i = 0; i < topCandidates.length; i++) {
      const c = topCandidates[i];
      const r = c.route;
      const walkInfo = walkRoutesByKey.get(`${r.id}:${c.direction}`);
      const walkToBoardCoords = walkInfo?.walkToCoords || [];
      const walkToBoardMeters = walkInfo?.walkToMeters ?? c.walkToBoardM;
      const walkToBoardIsEstimate = walkInfo?.walkToIsEstimate ?? true;
      const walkFromDropCoords = walkInfo?.walkFromCoords || [];
      const walkFromDropMeters = walkInfo?.walkFromMeters ?? c.walkFromDropM;
      const walkFromDropIsEstimate = walkInfo?.walkFromIsEstimate ?? true;

      // Complete concatenated road geometry for map rendering
      const fullGeometryCoords = [
        ...walkToBoardCoords,
        ...c.rideCoords,
        ...walkFromDropCoords
      ];

      const optId = `trip-${r.id}-${c.direction.toLowerCase()}-${originPlace.id}-${destPlace.id}`;

      const option = {
        id: optId,
        origin_place_id: originPlace.id,
        destination_place_id: destPlace.id,
        minutes: c.rideMinutes + Math.max(1, Math.round(walkToBoardMeters / 75)) + Math.max(1, Math.round(walkFromDropMeters / 75)) + 3,
        transfers: 0,
        walk_meters: walkToBoardMeters + walkFromDropMeters,
        walk_minutes: Math.max(1, Math.round(walkToBoardMeters / 75)) + Math.max(1, Math.round(walkFromDropMeters / 75)),
        totalKm: c.rideKm,
        regularFare: c.regularFare,
        discountFare: c.discountFare,
        direction: c.direction,
        status: "Active",
        originPlace,
        destPlace,
        boarding_name: c.boardingName,
        boarding_lat: c.boardingCoord[1],
        boarding_lng: c.boardingCoord[0],
        dropoff_name: c.dropoffName,
        dropoff_lat: c.dropoffCoord[1],
        dropoff_lng: c.dropoffCoord[0],
        walk_to_board_coordinates: walkToBoardCoords,
        walk_to_board_is_estimate: walkToBoardIsEstimate,
        jeepney_coordinates: c.rideCoords,
        walk_from_drop_coordinates: walkFromDropCoords,
        walk_from_drop_is_estimate: walkFromDropIsEstimate,
        geometry_coordinates: fullGeometryCoords,
        segments: [
          {
            id: `seg-${optId}-1`,
            trip_option_id: optId,
            route_id: r.id,
            seq: 1,
            code: r.code,
            // Human-readable: "Code: Origin ↔ Destination" format
            route_name: `${r.code}: ${r.origin} ↔ ${r.destination}`,
            color: r.color,
            jeepney_type: r.jeepney_type || "Traditional",
            route_status: r.status || "Active",
            km: c.rideKm,
            minutes: c.rideMinutes
          }
        ],
        legs: [
          {
            id: `leg-${optId}-1`,
            trip_option_id: optId,
            seq: 1,
            kind: "walk",
            title: `Walk to ${c.boardingName}`,
            detail: `About ${Math.max(1, Math.round(walkToBoardMeters / 75))} min walk · ${walkToBoardMeters}m${walkToBoardIsEstimate ? " (distance estimate; pedestrian routing unavailable)" : ""}`,
            minutes: Math.max(1, Math.round(walkToBoardMeters / 75)),
            distance_m: walkToBoardMeters,
            start_lat: oLat,
            start_lng: oLng,
            end_lat: c.boardingCoord[1],
            end_lng: c.boardingCoord[0]
          },
          {
            id: `leg-${optId}-2`,
            trip_option_id: optId,
            seq: 2,
            kind: "board",
            title: `Board Route ${r.code} (${r.origin} ↔ ${r.destination})`,
            detail: `Look for "${r.code}" on the jeepney signboard heading towards ${c.direction === 'Inbound' ? r.destination : r.origin}`,
            minutes: 2,
            distance_m: 0,
            route_id: r.id,
            route_code: r.code,
            route_color: r.color
          },
          {
            id: `leg-${optId}-3`,
            trip_option_id: optId,
            seq: 3,
            kind: "stay",
            title: `Ride ${c.rideKm} km to ${c.dropoffName}`,
            detail: `Stay on jeepney · Prepare ₱${c.regularFare.toFixed(2)} exact fare (discounted: ₱${c.discountFare.toFixed(2)})`,
            minutes: c.rideMinutes,
            distance_m: Math.round(c.rideKm * 1000),
            route_id: r.id,
            route_code: r.code,
            route_color: r.color
          },
          {
            id: `leg-${optId}-4`,
            trip_option_id: optId,
            seq: 4,
            kind: "alight",
            title: `Alight at ${c.dropoffName}`,
            detail: "Prepare to alight (tell driver 'Lugar lang')",
            minutes: 1,
            distance_m: 0,
            point_lat: c.dropoffCoord[1],
            point_lng: c.dropoffCoord[0]
          },
          {
            id: `leg-${optId}-5`,
            trip_option_id: optId,
            seq: 5,
            kind: "walk",
            title: `Walk to ${destPlace.name}`,
            detail: `About ${Math.max(1, Math.round(walkFromDropMeters / 75))} min walk · ${walkFromDropMeters}m${walkFromDropIsEstimate ? " (distance estimate; pedestrian routing unavailable)" : ""}`,
            minutes: Math.max(1, Math.round(walkFromDropMeters / 75)),
            distance_m: walkFromDropMeters,
            start_lat: c.dropoffCoord[1],
            start_lng: c.dropoffCoord[0],
            end_lat: dLat,
            end_lng: dLng
          }
        ]
      };

      results.push(option);
      dynamicOptionsCache.set(option.id, option);
    }

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
    if (!rows.length) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Trip option not found" } });
    }
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

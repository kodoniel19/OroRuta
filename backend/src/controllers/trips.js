const db = require("../config/db");
const { haversineMeters } = require("../utils");
const { getRouteGeometry, getWalkingRoute } = require("../utils/routing");
const { calculateTraditionalFare, getDynamicFareConfig } = require("../services/fareService");

// In-memory cache for dynamic trip options
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
  { keywords: ["cogon", "cogon market"], name: "Cogon Market", area: "Cogon", kind: "market", lat: 8.477160465033135, lng: 124.65120822163647 },
  { keywords: ["carmen market", "carmen public market"], name: "Carmen Market", area: "Carmen", kind: "market", lat: 8.4845, lng: 124.6335 },
  { keywords: ["agora", "agora terminal"], name: "Agora Terminal", area: "Lapasan", kind: "terminal", lat: 8.4857, lng: 124.6589 },
  { keywords: ["bulua", "bulua terminal", "wtpm", "westbound"], name: "Bulua Terminal", area: "Bulua", kind: "terminal", lat: 8.5040, lng: 124.6115 },
  { keywords: ["liceo", "liceo main", "liceo de cagayan", "liceo university"], name: "Liceo de Cagayan University", area: "Kauswagan", kind: "school", lat: 8.4965, lng: 124.6407 },
  { keywords: ["xavier", "xu", "ateneo de cagayan"], name: "Xavier University", area: "Poblacion", kind: "school", lat: 8.4784, lng: 124.6489 },
  { keywords: ["ustp", "must"], name: "USTP Lapasan", area: "Lapasan", kind: "school", lat: 8.4852, lng: 124.6572 },
  { keywords: ["nmmc", "provincial hospital"], name: "NMMC", area: "Poblacion", kind: "hospital", lat: 8.4875, lng: 124.6468 },
  { keywords: ["polymedic", "polymedic plaza"], name: "Cagayan de Oro Polymedic Plaza", area: "Kauswagan", kind: "hospital", lat: 8.4940, lng: 124.6305 },
  { keywords: ["savemore kauswagan", "savemore market"], name: "Savemore Market Kauswagan", area: "Kauswagan", kind: "market", lat: 8.4960, lng: 124.6340 },
  { keywords: ["capitol university", "cu"], name: "Capitol University", area: "Lapasan", kind: "school", lat: 8.4870, lng: 124.6550 },
  { keywords: ["sm uptown", "sm cdo uptown"], name: "SM CDO Uptown", area: "Upper Carmen", kind: "mall", lat: 8.4578, lng: 124.6225 }
];

// Verified CDO transfer hubs for multi-jeepney journeys
const CDO_TRANSFER_HUBS = [
  { id: "hub-carmen", name: "Carmen Public Market Terminal", lat: 8.4845, lng: 124.6335, area: "Carmen" },
  { id: "hub-cogon", name: "Cogon Market Terminal", lat: 8.477160465033135, lng: 124.65120822163647, area: "Cogon" },
  { id: "hub-agora", name: "Agora Eastbound Terminal", lat: 8.4857, lng: 124.6589, area: "Lapasan" },
  { id: "hub-bulua", name: "Bulua Westbound Terminal", lat: 8.5040, lng: 124.6115, area: "Bulua" },
  { id: "hub-divisoria", name: "Divisoria Plaza Interchange", lat: 8.4777, lng: 124.6452, area: "Divisoria" },
  { id: "hub-velez-recto", name: "Velez-Recto Junction (Centrio / SM Downtown)", lat: 8.4871, lng: 124.6508, area: "Poblacion" }
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
 */
function findStopLabel(lat, lng, defaultPrefix, fallbackLandmark, terminalList, loadingPointsList = []) {
  // 1. Check verified loading points (< 220m)
  if (loadingPointsList && loadingPointsList.length > 0) {
    let closest = null, closestDist = Infinity;
    for (const lp of loadingPointsList) {
      if (lp.lat && lp.lng) {
        const d = haversineMeters(lat, lng, parseFloat(lp.lat), parseFloat(lp.lng));
        if (d < closestDist) { closestDist = d; closest = lp; }
      }
    }
    if (closest && closestDist < 220) return closest.name;
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

  // 3. Approximate by CDO street corridors
  const streetHints = [
    { minLat:8.500, maxLat:8.520, minLng:124.600, maxLng:124.625, name:"Bulua Westbound Terminal corridor" },
    { minLat:8.490, maxLat:8.505, minLng:124.625, maxLng:124.645, name:"Kauswagan / RN Pelaez corridor" },
    { minLat:8.475, maxLat:8.490, minLng:124.625, maxLng:124.640, name:"Carmen / Vamenta Blvd area" },
    { minLat:8.483, maxLat:8.492, minLng:124.646, maxLng:124.656, name:"CM Recto Ave (Centrio / SM Downtown area)" },
    { minLat:8.473, maxLat:8.482, minLng:124.642, maxLng:124.655, name:"Cogon Market area" },
    { minLat:8.475, maxLat:8.482, minLng:124.638, maxLng:124.648, name:"Divisoria area" },
    { minLat:8.480, maxLat:8.490, minLng:124.654, maxLng:124.665, name:"Limketkai / Lapasan corridor" },
    { minLat:8.484, maxLat:8.495, minLng:124.656, maxLng:124.672, name:"Agora Terminal / Valenzuela Ave corridor" },
    { minLat:8.445, maxLat:8.475, minLng:124.615, maxLng:124.635, name:"Masterson Ave corridor" },
    { minLat:8.475, maxLat:8.510, minLng:124.720, maxLng:124.770, name:"Puerto / Bugo Highway area" }
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
async function findDirectJeepneyRoutes(origLat, origLng, destLat, destLng, originName, destName, allRoutes, allGeos, allDirs, allTerminals, allLoadingPoints, maxWalkOrig = 850, maxWalkDest = 750) {
  const directDistM = haversineMeters(origLat, origLng, destLat, destLng);
  const fareConfig = await getDynamicFareConfig();

  const geoByRoute = {};
  for (const g of allGeos) {
    if (!geoByRoute[g.route_id]) geoByRoute[g.route_id] = [];
    geoByRoute[g.route_id].push(g);
  }

  const dirByRoute = {};
  for (const d of allDirs) {
    if (!dirByRoute[d.route_id]) dirByRoute[d.route_id] = {};
    dirByRoute[d.route_id][d.direction] = d;
  }

  const candidates = [];

  for (const r of allRoutes) {
    const geos = geoByRoute[r.id] || [];
    const dirMap = dirByRoute[r.id] || {};

    for (const g of geos) {
      const direction = g.direction;
      let geom = g.geometry;
      if (typeof geom === "string") {
        try { geom = JSON.parse(geom); } catch (_) { geom = null; }
      }
      if (!geom || !geom.coordinates || geom.coordinates.length < 2) continue;

      const coords = geom.coordinates; // [[lng, lat], ...]

      // 1. Find closest coordinate to Origin
      let minOrigDist = Infinity, origIdx = -1;
      for (let i = 0; i < coords.length; i++) {
        const d = haversineMeters(origLat, origLng, coords[i][1], coords[i][0]);
        if (d < minOrigDist) { minOrigDist = d; origIdx = i; }
      }

      // 2. Find closest coordinate to Destination
      let minDestDist = Infinity, destIdx = -1;
      for (let i = 0; i < coords.length; i++) {
        const d = haversineMeters(destLat, destLng, coords[i][1], coords[i][0]);
        if (d < minDestDist) { minDestDist = d; destIdx = i; }
      }

      // Proximity check: Boarding and Drop-off must be within walking distance
      if (minOrigDist > maxWalkOrig || minDestDist > maxWalkDest) {
        continue;
      }

      // Direction check: Must board BEFORE drop-off along the route direction!
      if (origIdx >= destIdx || (destIdx - origIdx) < 4) {
        continue;
      }

      // Extract coordinates along the route between boarding and drop-off
      const rideCoords = coords.slice(origIdx, destIdx + 1);
      const rideDistMeters = calculatePolylineMeters(rideCoords);

      // Must be a meaningful transit ride (at least 350 meters)
      if (rideDistMeters < 350) {
        continue;
      }

      // Reject massive detours for short trips
      if (directDistM < 1600 && rideDistMeters > directDistM * 2.5) {
        continue;
      }

      const rideKm = Math.round((rideDistMeters / 1000) * 10) / 10 || 0.4;
      const walkToBoardM = Math.round(minOrigDist);
      const walkFromDropM = Math.round(minDestDist);
      const totalWalkM = walkToBoardM + walkFromDropM;

      const walkMinutesToBoard = Math.max(1, Math.round(walkToBoardM / 75));
      const walkMinutesFromDrop = Math.max(1, Math.round(walkFromDropM / 75));
      const walkMinutes = walkMinutesToBoard + walkMinutesFromDrop;
      const rideMinutes = Math.max(3, Math.round((rideKm / 18) * 60)); // ~18 km/h typical CDO jeepney speed
      const totalMinutes = walkMinutes + rideMinutes;

      const fareRes = calculateTraditionalFare(rideKm, "Regular", r.jeepney_type, fareConfig);
      const regularFare = fareRes.regularFare;
      const discountFare = fareRes.discountedFare;

      const boardingCoord = [rideCoords[0][0], rideCoords[0][1]]; // [lng, lat]
      const dropoffCoord = [rideCoords[rideCoords.length - 1][0], rideCoords[rideCoords.length - 1][1]];

      const boardingName = findStopLabel(boardingCoord[1], boardingCoord[0], "Loading point", originName, allTerminals, allLoadingPoints);
      const dropoffName = findStopLabel(dropoffCoord[1], dropoffCoord[0], "Drop-off stop", destName, allTerminals, allLoadingPoints);

      const dropoffPenalty = walkFromDropM > 200 ? Math.pow((walkFromDropM - 200) / 30, 1.4) * 8 : 0;
      const compositeScore = (walkFromDropM / 30) * 3.5 + (walkToBoardM / 75) * 1.5 + totalMinutes + (regularFare * 0.35) + dropoffPenalty;

      candidates.push({
        type: "direct",
        transfers: 0,
        route: r,
        direction,
        origIdx,
        destIdx,
        rideCoords,
        rideDistMeters,
        rideKm,
        walkToBoardM,
        walkFromDropM,
        totalWalkM,
        walkMinutesToBoard,
        walkMinutesFromDrop,
        walkMinutes,
        rideMinutes,
        totalMinutes,
        compositeScore,
        regularFare,
        discountFare,
        boardingCoord,
        dropoffCoord,
        boardingName,
        dropoffName,
        streetSequence: dirMap[direction]?.street_sequence || ""
      });
    }
  }

  return candidates;
}

/**
 * Finds valid multi-jeepney journeys with 1 transfer when a direct route is unavailable or suboptimal.
 */
async function findTransferJeepneyRoutes(origLat, origLng, destLat, destLng, originName, destName, allRoutes, allGeos, allDirs, allTerminals, allLoadingPoints) {
  const directDistM = haversineMeters(origLat, origLng, destLat, destLng);
  const fareConfig = await getDynamicFareConfig();
  const transferCandidates = [];

  for (const hub of CDO_TRANSFER_HUBS) {
    const dOHub = haversineMeters(origLat, origLng, hub.lat, hub.lng);
    const dHubD = haversineMeters(hub.lat, hub.lng, destLat, destLng);

    // Skip if origin or destination is already right at the hub
    if (dOHub < 350 || dHubD < 350) continue;

    // Geometric sanity check: total transfer detour shouldn't be unreasonable
    if ((dOHub + dHubD) > Math.max(2.4 * directDistM, directDistM + 4500)) continue;

    // Find Leg 1 candidates: Origin -> Hub
    const leg1Candidates = await findDirectJeepneyRoutes(
      origLat, origLng, hub.lat, hub.lng, originName, hub.name,
      allRoutes, allGeos, allDirs, allTerminals, allLoadingPoints,
      850, 300
    );
    if (!leg1Candidates.length) continue;

    // Find Leg 2 candidates: Hub -> Destination
    const leg2Candidates = await findDirectJeepneyRoutes(
      hub.lat, hub.lng, destLat, destLng, hub.name, destName,
      allRoutes, allGeos, allDirs, allTerminals, allLoadingPoints,
      300, 750
    );
    if (!leg2Candidates.length) continue;

    // Sort to consider best matches
    leg1Candidates.sort((a,b) => a.compositeScore - b.compositeScore);
    leg2Candidates.sort((a,b) => a.compositeScore - b.compositeScore);

    const topLeg1 = leg1Candidates.slice(0, 3);
    const topLeg2 = leg2Candidates.slice(0, 3);

    for (const l1 of topLeg1) {
      for (const l2 of topLeg2) {
        if (l1.route.id === l2.route.id) continue; // Must be separate routes

        const transferWalkM = Math.round(haversineMeters(l1.dropoffCoord[1], l1.dropoffCoord[0], l2.boardingCoord[1], l2.boardingCoord[0]));
        if (transferWalkM > 350) continue;

        const totalWalkM = l1.walkToBoardM + transferWalkM + l2.walkFromDropM;
        const totalWalkMins = Math.max(2, Math.round(totalWalkM / 75));
        const transferWaitMins = 5; // realistic CDO transfer headway buffer
        const totalMinutes = l1.walkMinutesToBoard + l1.rideMinutes + transferWaitMins + l2.rideMinutes + l2.walkMinutesFromDrop;
        const totalKm = Math.round((l1.rideKm + l2.rideKm) * 10) / 10;

        // Fares calculated independently per jeepney according to official LTFRB rules
        const fare1 = calculateTraditionalFare(l1.rideKm, "Regular", l1.route.jeepney_type, fareConfig);
        const fare2 = calculateTraditionalFare(l2.rideKm, "Regular", l2.route.jeepney_type, fareConfig);

        const regularFare = fare1.regularFare + fare2.regularFare;
        const discountFare = fare1.discountedFare + fare2.discountedFare;

        const dropoffPenalty = l2.walkFromDropM > 250 ? Math.pow((l2.walkFromDropM - 250) / 60, 1.3) * 3 : 0;
        const compositeScore = (totalWalkM / 75) * 1.5 + totalMinutes + (regularFare * 0.35) + 8.0 + dropoffPenalty;

        transferCandidates.push({
          type: "transfer",
          transfers: 1,
          hub,
          transferWalkM,
          leg1: l1,
          leg2: l2,
          totalKm,
          totalWalkM,
          walkMinutes: totalWalkMins,
          totalMinutes,
          regularFare,
          discountFare,
          fare1,
          fare2,
          compositeScore,
          boardingName: l1.boardingName,
          boardingCoord: l1.boardingCoord,
          dropoffName: l2.dropoffName,
          dropoffCoord: l2.dropoffCoord,
          walkToBoardM: l1.walkToBoardM,
          walkFromDropM: l2.walkFromDropM,
          walkMinutesToBoard: l1.walkMinutesToBoard,
          walkMinutesFromDrop: l2.walkMinutesFromDrop
        });
      }
    }
  }

  return transferCandidates;
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

    // Load active traditional routes & geometries
    const [allRoutes] = await db.execute(
      "SELECT * FROM routes WHERE status != 'Inactive' AND (jeepney_type = 'Traditional' OR jeepney_type IS NULL OR jeepney_type = '')"
    );
    const [allGeos] = await db.execute("SELECT route_id, direction, geometry FROM route_geometry");
    const [allDirs] = await db.execute("SELECT route_id, direction, distance_km, street_sequence FROM route_directions");
    const [allTerminals] = await db.execute("SELECT id, name, lat, lng FROM terminals");
    const [allLoadingPoints] = await db.execute("SELECT id, name, note, point_type, lat, lng FROM loading_points WHERE lat != 0 AND lng != 0");

    // 1. Direct candidates
    const directCandidates = await findDirectJeepneyRoutes(
      oLat, oLng, dLat, dLng, originPlace.name, destPlace.name,
      allRoutes, allGeos, allDirs, allTerminals, allLoadingPoints
    );

    // 2. Transfer candidates (multi-jeepney journeys)
    const transferCandidates = await findTransferJeepneyRoutes(
      oLat, oLng, dLat, dLng, originPlace.name, destPlace.name,
      allRoutes, allGeos, allDirs, allTerminals, allLoadingPoints
    );

    // Filter direct candidates: If some direct candidates drop passenger very close (<= 300m),
    // exclude candidates that leave passenger with > 650m walk from drop-off.
    const hasCloseDirect = directCandidates.some(c => c.walkFromDropM <= 300);
    const viableDirect = hasCloseDirect
      ? directCandidates.filter(c => c.walkFromDropM <= 650)
      : directCandidates;

    // Deduplicate direct candidates by route code, prioritizing verified/USER_SUPPLIED routes
    const bestDirectByCode = new Map();
    for (const c of viableDirect) {
      const key = c.route.code;
      const existing = bestDirectByCode.get(key);
      if (!existing) {
        bestDirectByCode.set(key, c);
      } else {
        const cIsVerified = c.route.verification_status === 'USER_SUPPLIED' || c.route.verification_status === 'VERIFIED';
        const exIsVerified = existing.route.verification_status === 'USER_SUPPLIED' || existing.route.verification_status === 'VERIFIED';
        if ((cIsVerified && !exIsVerified) || (cIsVerified === exIsVerified && c.compositeScore < existing.compositeScore)) {
          bestDirectByCode.set(key, c);
        }
      }
    }

    // Deduplicate transfer candidates by route code pair
    const bestTransferByPair = new Map();
    for (const t of transferCandidates) {
      const key = `${t.leg1.route.code}_${t.leg2.route.code}`;
      if (!bestTransferByPair.has(key) || t.compositeScore < bestTransferByPair.get(key).compositeScore) {
        bestTransferByPair.set(key, t);
      }
    }

    // Combine direct and transfer options
    const combined = [...bestDirectByCode.values(), ...bestTransferByPair.values()];

    if (combined.length === 0) {
      return res.json([]);
    }

    // Sort according to requested criterion
    combined.sort((a, b) => {
      if (sort === "time") {
        return a.totalMinutes - b.totalMinutes || a.walkFromDropM - b.walkFromDropM || a.compositeScore - b.compositeScore;
      }
      if (sort === "fare") {
        return a.regularFare - b.regularFare || a.totalMinutes - b.totalMinutes || a.compositeScore - b.compositeScore;
      }
      if (sort === "walk") {
        return a.totalWalkM - b.totalWalkM || a.totalMinutes - b.totalMinutes || a.compositeScore - b.compositeScore;
      }
      if (sort === "transfers") {
        return a.transfers - b.transfers || a.totalMinutes - b.totalMinutes || a.compositeScore - b.compositeScore;
      }
      return a.compositeScore - b.compositeScore || a.totalMinutes - b.totalMinutes;
    });

    // Build rich TripOption objects for top candidates
    const results = [];
    const topCandidates = combined.slice(0, 5);

    // Find min fare and min time among top options to label them
    let minFare = Infinity, minTime = Infinity, minWalk = Infinity;
    topCandidates.forEach(c => {
      if (c.regularFare < minFare) minFare = c.regularFare;
      if (c.totalMinutes < minTime) minTime = c.totalMinutes;
      if (c.totalWalkM < minWalk) minWalk = c.totalWalkM;
    });

    for (let i = 0; i < topCandidates.length; i++) {
      const c = topCandidates[i];

      if (c.type === "direct") {
        const r = c.route;

        let walkToBoardCoords = [
          [oLng, oLat],
          [c.boardingCoord[0], c.boardingCoord[1]]
        ];
        try {
          const osrmWalk1 = await getWalkingRoute([oLng, oLat], [c.boardingCoord[0], c.boardingCoord[1]]);
          if (osrmWalk1 && osrmWalk1.coordinates && osrmWalk1.coordinates.length >= 2) {
            walkToBoardCoords = osrmWalk1.coordinates;
          }
        } catch (_) {}

        let walkFromDropCoords = [
          [c.dropoffCoord[0], c.dropoffCoord[1]],
          [dLng, dLat]
        ];
        try {
          const osrmWalk2 = await getWalkingRoute([c.dropoffCoord[0], c.dropoffCoord[1]], [dLng, dLat]);
          if (osrmWalk2 && osrmWalk2.coordinates && osrmWalk2.coordinates.length >= 2) {
            walkFromDropCoords = osrmWalk2.coordinates;
          }
        } catch (_) {}

        const fullGeometryCoords = [
          ...walkToBoardCoords,
          ...c.rideCoords,
          ...walkFromDropCoords
        ];

        const optId = `trip-${r.code.toLowerCase()}-${c.direction.toLowerCase()}-${originPlace.id}-${destPlace.id}`;

        const option = {
          id: optId,
          origin_place_id: originPlace.id,
          destination_place_id: destPlace.id,
          minutes: c.totalMinutes,
          transfers: 0,
          walk_meters: c.totalWalkM,
          walk_minutes: c.walkMinutes,
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
          transfer_name: null,
          isCheapest: c.regularFare === minFare,
          isFastest: c.totalMinutes === minTime,
          isLeastWalk: c.totalWalkM === minWalk,
          walk_to_board_coordinates: walkToBoardCoords,
          jeepney_coordinates: c.rideCoords,
          walk_from_drop_coordinates: walkFromDropCoords,
          geometry_coordinates: fullGeometryCoords,
          segments: [
            {
              id: `seg-${optId}-1`,
              trip_option_id: optId,
              route_id: r.id,
              seq: 1,
              code: r.code,
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
              detail: `About ${c.walkMinutesToBoard} min walk · ${c.walkToBoardM}m`,
              minutes: c.walkMinutesToBoard,
              distance_m: c.walkToBoardM,
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
              detail: `Stay on jeepney · Estimated fare: ₱${c.regularFare.toFixed(2)} (discounted: ₱${c.discountFare.toFixed(2)})`,
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
              detail: `About ${c.walkMinutesFromDrop} min walk · ${c.walkFromDropM}m`,
              minutes: c.walkMinutesFromDrop,
              distance_m: c.walkFromDropM,
              start_lat: c.dropoffCoord[1],
              start_lng: c.dropoffCoord[0],
              end_lat: dLat,
              end_lng: dLng
            }
          ]
        };

        results.push(option);
        dynamicOptionsCache.set(option.id, option);
      } else {
        // Multi-leg Transfer Option
        const l1 = c.leg1;
        const l2 = c.leg2;
        const hub = c.hub;
        const optId = `transfer-${l1.route.code.toLowerCase()}-${l2.route.code.toLowerCase()}-${hub.id}-${originPlace.id}-${destPlace.id}`;

        let walkToBoardCoords = [
          [oLng, oLat],
          [l1.boardingCoord[0], l1.boardingCoord[1]]
        ];
        try {
          const w1 = await getWalkingRoute([oLng, oLat], [l1.boardingCoord[0], l1.boardingCoord[1]]);
          if (w1 && w1.coordinates && w1.coordinates.length >= 2) walkToBoardCoords = w1.coordinates;
        } catch (_) {}

        let transferWalkCoords = [
          [l1.dropoffCoord[0], l1.dropoffCoord[1]],
          [l2.boardingCoord[0], l2.boardingCoord[1]]
        ];
        try {
          const wt = await getWalkingRoute([l1.dropoffCoord[0], l1.dropoffCoord[1]], [l2.boardingCoord[0], l2.boardingCoord[1]]);
          if (wt && wt.coordinates && wt.coordinates.length >= 2) transferWalkCoords = wt.coordinates;
        } catch (_) {}

        let walkFromDropCoords = [
          [l2.dropoffCoord[0], l2.dropoffCoord[1]],
          [dLng, dLat]
        ];
        try {
          const w2 = await getWalkingRoute([l2.dropoffCoord[0], l2.dropoffCoord[1]], [dLng, dLat]);
          if (w2 && w2.coordinates && w2.coordinates.length >= 2) walkFromDropCoords = w2.coordinates;
        } catch (_) {}

        const fullGeometryCoords = [
          ...walkToBoardCoords,
          ...l1.rideCoords,
          ...transferWalkCoords,
          ...l2.rideCoords,
          ...walkFromDropCoords
        ];

        const option = {
          id: optId,
          origin_place_id: originPlace.id,
          destination_place_id: destPlace.id,
          minutes: c.totalMinutes,
          transfers: 1,
          walk_meters: c.totalWalkM,
          walk_minutes: c.walkMinutes,
          totalKm: c.totalKm,
          regularFare: c.regularFare,
          discountFare: c.discountFare,
          direction: `${l1.direction} → ${l2.direction}`,
          status: "Active",
          originPlace,
          destPlace,
          boarding_name: l1.boardingName,
          boarding_lat: l1.boardingCoord[1],
          boarding_lng: l1.boardingCoord[0],
          dropoff_name: l2.dropoffName,
          dropoff_lat: l2.dropoffCoord[1],
          dropoff_lng: l2.dropoffCoord[0],
          transfer_name: hub.name,
          transfer_lat: hub.lat,
          transfer_lng: hub.lng,
          isCheapest: c.regularFare === minFare,
          isFastest: c.totalMinutes === minTime,
          isLeastWalk: c.totalWalkM === minWalk,
          walk_to_board_coordinates: walkToBoardCoords,
          jeepney_coordinates: [...l1.rideCoords, ...transferWalkCoords, ...l2.rideCoords],
          walk_from_drop_coordinates: walkFromDropCoords,
          geometry_coordinates: fullGeometryCoords,
          segments: [
            {
              id: `seg-${optId}-1`,
              trip_option_id: optId,
              route_id: l1.route.id,
              seq: 1,
              code: l1.route.code,
              route_name: `${l1.route.code}: ${l1.route.origin} ↔ ${l1.route.destination}`,
              color: l1.route.color,
              jeepney_type: l1.route.jeepney_type || "Traditional",
              route_status: l1.route.status || "Active",
              km: l1.rideKm,
              minutes: l1.rideMinutes,
              fare: c.fare1.regularFare,
              discountedFare: c.fare1.discountedFare
            },
            {
              id: `seg-${optId}-2`,
              trip_option_id: optId,
              route_id: l2.route.id,
              seq: 2,
              code: l2.route.code,
              route_name: `${l2.route.code}: ${l2.route.origin} ↔ ${l2.route.destination}`,
              color: l2.route.color,
              jeepney_type: l2.route.jeepney_type || "Traditional",
              route_status: l2.route.status || "Active",
              km: l2.rideKm,
              minutes: l2.rideMinutes,
              fare: c.fare2.regularFare,
              discountedFare: c.fare2.discountedFare
            }
          ],
          legs: [
            {
              id: `leg-${optId}-1`,
              trip_option_id: optId,
              seq: 1,
              kind: "walk",
              title: `Walk to ${l1.boardingName}`,
              detail: `About ${l1.walkMinutesToBoard} min walk · ${l1.walkToBoardM}m`,
              minutes: l1.walkMinutesToBoard,
              distance_m: l1.walkToBoardM,
              start_lat: oLat,
              start_lng: oLng,
              end_lat: l1.boardingCoord[1],
              end_lng: l1.boardingCoord[0]
            },
            {
              id: `leg-${optId}-2`,
              trip_option_id: optId,
              seq: 2,
              kind: "board",
              title: `Board Route ${l1.route.code} (${l1.route.origin} ↔ ${l1.route.destination})`,
              detail: `Look for "${l1.route.code}" signboard heading towards ${l1.direction === 'Inbound' ? l1.route.destination : l1.route.origin}`,
              minutes: 2,
              distance_m: 0,
              route_id: l1.route.id,
              route_code: l1.route.code,
              route_color: l1.route.color
            },
            {
              id: `leg-${optId}-3`,
              trip_option_id: optId,
              seq: 3,
              kind: "stay",
              title: `Ride ${l1.rideKm} km to ${hub.name}`,
              detail: `Prepare Leg 1 fare: ₱${c.fare1.regularFare.toFixed(2)} (discounted: ₱${c.fare1.discountedFare.toFixed(2)})`,
              minutes: l1.rideMinutes,
              distance_m: Math.round(l1.rideKm * 1000),
              route_id: l1.route.id,
              route_code: l1.route.code,
              route_color: l1.route.color
            },
            {
              id: `leg-${optId}-4`,
              trip_option_id: optId,
              seq: 4,
              kind: "alight",
              title: `Alight at ${hub.name}`,
              detail: "Transfer point: Alight from first jeepney",
              minutes: 1,
              distance_m: 0,
              point_lat: l1.dropoffCoord[1],
              point_lng: l1.dropoffCoord[0]
            },
            {
              id: `leg-${optId}-5`,
              trip_option_id: optId,
              seq: 5,
              kind: "walk",
              title: `Transfer walk at ${hub.name}`,
              detail: `Walk ~${c.transferWalkM}m to Route ${l2.route.code} boarding spot`,
              minutes: Math.max(1, Math.round(c.transferWalkM / 75)),
              distance_m: c.transferWalkM,
              start_lat: l1.dropoffCoord[1],
              start_lng: l1.dropoffCoord[0],
              end_lat: l2.boardingCoord[1],
              end_lng: l2.boardingCoord[0]
            },
            {
              id: `leg-${optId}-6`,
              trip_option_id: optId,
              seq: 6,
              kind: "board",
              title: `Board Route ${l2.route.code} (${l2.route.origin} ↔ ${l2.route.destination})`,
              detail: `Look for "${l2.route.code}" signboard heading towards ${l2.direction === 'Inbound' ? l2.route.destination : l2.route.origin}`,
              minutes: 3,
              distance_m: 0,
              route_id: l2.route.id,
              route_code: l2.route.code,
              route_color: l2.route.color
            },
            {
              id: `leg-${optId}-7`,
              trip_option_id: optId,
              seq: 7,
              kind: "stay",
              title: `Ride ${l2.rideKm} km to ${l2.dropoffName}`,
              detail: `Prepare Leg 2 fare: ₱${c.fare2.regularFare.toFixed(2)} (discounted: ₱${c.fare2.discountedFare.toFixed(2)})`,
              minutes: l2.rideMinutes,
              distance_m: Math.round(l2.rideKm * 1000),
              route_id: l2.route.id,
              route_code: l2.route.code,
              route_color: l2.route.color
            },
            {
              id: `leg-${optId}-8`,
              trip_option_id: optId,
              seq: 8,
              kind: "alight",
              title: `Alight at ${l2.dropoffName}`,
              detail: "Prepare to alight (tell driver 'Lugar lang')",
              minutes: 1,
              distance_m: 0,
              point_lat: l2.dropoffCoord[1],
              point_lng: l2.dropoffCoord[0]
            },
            {
              id: `leg-${optId}-9`,
              trip_option_id: optId,
              seq: 9,
              kind: "walk",
              title: `Walk to ${destPlace.name}`,
              detail: `About ${l2.walkMinutesFromDrop} min walk · ${l2.walkFromDropM}m`,
              minutes: l2.walkMinutesFromDrop,
              distance_m: l2.walkFromDropM,
              start_lat: l2.dropoffCoord[1],
              start_lng: l2.dropoffCoord[0],
              end_lat: dLat,
              end_lng: dLng
            }
          ]
        };

        results.push(option);
        dynamicOptionsCache.set(option.id, option);
      }
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

    const fareConfig = await getDynamicFareConfig();
    let totalKm = 0;
    let regularFare = 0;
    let discountFare = 0;

    for (const seg of segments) {
      const km = parseFloat(seg.km) || 0;
      totalKm += km;
      const f = calculateTraditionalFare(km, "Regular", seg.jeepney_type, fareConfig);
      regularFare += f.regularFare;
      discountFare += f.discountedFare;
    }

    const [[originPlace]] = await db.execute("SELECT * FROM places WHERE id=?", [opt.origin_place_id]);
    const [[destPlace]] = await db.execute("SELECT * FROM places WHERE id=?", [opt.destination_place_id]);
    res.json({ ...opt, segments, legs, totalKm: Math.round(totalKm * 10) / 10, regularFare, discountFare, originPlace, destPlace });
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

function getDynamicOption(id) {
  return dynamicOptionsCache.get(id);
}

module.exports = { search, getOption, routeRecommendations, recordCompleted, getDynamicOption };

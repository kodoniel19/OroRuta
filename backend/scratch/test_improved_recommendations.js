const db = require('../src/config/db');
const { haversineMeters } = require('../src/utils');
const { calculateTraditionalFare, getDynamicFareConfig } = require('../src/services/fareService');

function calculatePolylineMeters(coords) {
  let meters = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    meters += haversineMeters(coords[i][1], coords[i][0], coords[i + 1][1], coords[i + 1][0]);
  }
  return meters;
}

function findStopLabel(lat, lng, defaultPrefix, fallbackLandmark, terminalList, loadingPointsList = []) {
  if (loadingPointsList && loadingPointsList.length > 0) {
    let closest = null, closestDist = Infinity;
    for (const lp of loadingPointsList) {
      if (lp.lat && lp.lng && !lp.name.toLowerCase().includes("miami")) {
        const d = haversineMeters(lat, lng, parseFloat(lp.lat), parseFloat(lp.lng));
        if (d < closestDist) { closestDist = d; closest = lp; }
      }
    }
    if (closest && closestDist <= 250) return closest.name;
  }

  if (terminalList && terminalList.length > 0) {
    let closest = null, closestDist = Infinity;
    for (const t of terminalList) {
      if (t.lat && t.lng) {
        const d = haversineMeters(lat, lng, parseFloat(t.lat), parseFloat(t.lng));
        if (d < closestDist) { closestDist = d; closest = t; }
      }
    }
    if (closest && closestDist <= 250) return closest.name;
  }

  const streetHints = [
    { minLat:8.500, maxLat:8.520, minLng:124.600, maxLng:124.625, name:"Bulua Westbound Terminal" },
    { minLat:8.490, maxLat:8.505, minLng:124.625, maxLng:124.645, name:"Kauswagan National Highway" },
    { minLat:8.475, maxLat:8.490, minLng:124.625, maxLng:124.640, name:"Carmen Market / Vamenta Blvd" },
    { minLat:8.483, maxLat:8.492, minLng:124.646, maxLng:124.656, name:"CM Recto Ave (Centrio / SM Downtown)" },
    { minLat:8.473, maxLat:8.482, minLng:124.642, maxLng:124.655, name:"Cogon Market" },
    { minLat:8.475, maxLat:8.482, minLng:124.638, maxLng:124.648, name:"Plaza Divisoria" },
    { minLat:8.480, maxLat:8.490, minLng:124.654, maxLng:124.665, name:"Limketkai Center / Lapasan" },
    { minLat:8.484, maxLat:8.495, minLng:124.656, maxLng:124.672, name:"Agora Bus Terminal" },
    { minLat:8.445, maxLat:8.475, minLng:124.615, maxLng:124.635, name:"Masterson Ave / SM Uptown" },
    { minLat:8.475, maxLat:8.510, minLng:124.720, maxLng:124.770, name:"Puerto / Sayre Highway" }
  ];
  for (const s of streetHints) {
    if (lat >= s.minLat && lat <= s.maxLat && lng >= s.minLng && lng <= s.maxLng) {
      return s.name;
    }
  }

  return fallbackLandmark || `${defaultPrefix} at (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
}

async function findImprovedDirectRoutes(origLat, origLng, destLat, destLng, originName, destName) {
  const [allRoutes] = await db.execute(
    "SELECT * FROM routes WHERE status != 'Inactive' AND (jeepney_type = 'Traditional' OR jeepney_type IS NULL OR jeepney_type = '')"
  );
  const [allGeos] = await db.execute("SELECT route_id, direction, geometry FROM route_geometry");
  const [allDirs] = await db.execute("SELECT route_id, direction, distance_km, street_sequence FROM route_directions");
  const [allTerminals] = await db.execute("SELECT id, name, lat, lng FROM terminals");
  const [allRouteTerminals] = await db.execute(
    "SELECT rt.route_id, rt.terminal_id, rt.seq, t.name, t.lat, t.lng FROM route_terminals rt JOIN terminals t ON rt.terminal_id = t.id ORDER BY rt.seq"
  );
  const [allLoadingPoints] = await db.execute(
    "SELECT id, route_id, name, note, point_type, lat, lng FROM loading_points WHERE lat != 0 AND lng != 0"
  );

  const fareConfig = await getDynamicFareConfig();

  const geoByRoute = {};
  for (const g of allGeos) {
    if (!geoByRoute[g.route_id]) geoByRoute[g.route_id] = [];
    geoByRoute[g.route_id].push(g);
  }

  const termsByRoute = {};
  for (const rt of allRouteTerminals) {
    if (!termsByRoute[rt.route_id]) termsByRoute[rt.route_id] = [];
    termsByRoute[rt.route_id].push(rt);
  }

  const lpsByRoute = {};
  for (const lp of allLoadingPoints) {
    if (!lpsByRoute[lp.route_id]) lpsByRoute[lp.route_id] = [];
    lpsByRoute[lp.route_id].push(lp);
  }

  const candidates = [];

  for (const r of allRoutes) {
    const geos = geoByRoute[r.id] || [];
    const rTerms = termsByRoute[r.id] || [];
    const rLps = lpsByRoute[r.id] || [];

    for (const g of geos) {
      const direction = g.direction || "Inbound";
      const isOutbound = direction.toLowerCase() === 'outbound';
      let geom = g.geometry;
      if (typeof geom === "string") {
        try { geom = JSON.parse(geom); } catch (_) { geom = null; }
      }
      if (!geom || !geom.coordinates || geom.coordinates.length < 2) continue;
      const coords = geom.coordinates; // [[lng, lat], ...]

      const depTerm = rTerms.find(t => t.seq === (isOutbound ? 2 : 1)) || rTerms[0];
      const arrTerm = rTerms.find(t => t.seq === (isOutbound ? 1 : 2)) || rTerms[rTerms.length - 1];

      // 1. Find optimal drop-off point near destination
      let bestDestIdx = -1;
      let minDestDist = Infinity;
      for (let i = 0; i < coords.length; i++) {
        const d = haversineMeters(destLat, destLng, coords[i][1], coords[i][0]);
        if (d < minDestDist) {
          minDestDist = d;
          bestDestIdx = i;
        }
      }

      // Check if arrival terminal is closer
      let arrTermDist = arrTerm ? haversineMeters(destLat, destLng, arrTerm.lat, arrTerm.lng) : Infinity;

      // Must reach destination within 500 meters
      if (minDestDist > 500 && arrTermDist > 500) continue;

      let dropoffCoord = [coords[bestDestIdx][0], coords[bestDestIdx][1]];
      let walkFromDropM = Math.round(minDestDist);
      let dropoffName = "";
      let destMatchType = "Nearby Drop-off";

      if (arrTerm && arrTermDist <= 250) {
        dropoffCoord = [arrTerm.lng, arrTerm.lat];
        walkFromDropM = Math.round(arrTermDist);
        dropoffName = arrTerm.name;
        if (walkFromDropM <= 120) destMatchType = "Direct Route";
      } else {
        // Check closest loading point
        let closestLp = null, closestLpDist = Infinity;
        for (const lp of rLps) {
          const d = haversineMeters(coords[bestDestIdx][1], coords[bestDestIdx][0], lp.lat, lp.lng);
          if (d < closestLpDist) { closestLpDist = d; closestLp = lp; }
        }
        if (closestLp && closestLpDist <= 200) {
          dropoffCoord = [closestLp.lng, closestLp.lat];
          walkFromDropM = Math.round(haversineMeters(destLat, destLng, closestLp.lat, closestLp.lng));
          dropoffName = closestLp.name;
        } else {
          dropoffName = findStopLabel(coords[bestDestIdx][1], coords[bestDestIdx][0], "Drop-off stop", destName, allTerminals, rLps);
        }
        if (walkFromDropM <= 120) destMatchType = "Direct Route";
      }

      // 2. Find optimal boarding point that occurs BEFORE bestDestIdx
      let bestOrigIdx = -1;
      let minOrigDist = Infinity;
      for (let i = 0; i < bestDestIdx; i++) {
        const d = haversineMeters(origLat, origLng, coords[i][1], coords[i][0]);
        if (d < minOrigDist) {
          minOrigDist = d;
          bestOrigIdx = i;
        }
      }

      // Passenger must be within reasonable walk (850m) to board
      if (bestOrigIdx === -1 || minOrigDist > 850) continue;

      // Ensure at least 300 meters ride distance
      const rideCoords = coords.slice(bestOrigIdx, bestDestIdx + 1);
      const rideDistMeters = calculatePolylineMeters(rideCoords);
      if (rideDistMeters < 300) continue;

      let boardingCoord = [coords[bestOrigIdx][0], coords[bestOrigIdx][1]];
      let walkToBoardM = Math.round(minOrigDist);
      let boardingName = "";

      // Check if departure terminal is nearby
      const depTermDist = depTerm ? haversineMeters(origLat, origLng, depTerm.lat, depTerm.lng) : Infinity;
      if (depTerm && depTermDist <= 250 && bestOrigIdx <= 3) {
        boardingCoord = [depTerm.lng, depTerm.lat];
        walkToBoardM = Math.round(depTermDist);
        boardingName = depTerm.name;
      } else {
        let closestLp = null, closestLpDist = Infinity;
        for (const lp of rLps) {
          const d = haversineMeters(coords[bestOrigIdx][1], coords[bestOrigIdx][0], lp.lat, lp.lng);
          if (d < closestLpDist) { closestLpDist = d; closestLp = lp; }
        }
        if (closestLp && closestLpDist <= 200) {
          boardingCoord = [closestLp.lng, closestLp.lat];
          walkToBoardM = Math.round(haversineMeters(origLat, origLng, closestLp.lat, closestLp.lng));
          boardingName = closestLp.name;
        } else {
          boardingName = findStopLabel(coords[bestOrigIdx][1], coords[bestOrigIdx][0], "Loading point", originName, allTerminals, rLps);
        }
      }

      const totalWalkM = walkToBoardM + walkFromDropM;
      const rideKm = Math.round((rideDistMeters / 1000) * 10) / 10 || 0.5;
      const walkMinutesToBoard = Math.max(1, Math.round(walkToBoardM / 75));
      const walkMinutesFromDrop = Math.max(1, Math.round(walkFromDropM / 75));
      const walkMinutes = walkMinutesToBoard + walkMinutesFromDrop;
      const rideMinutes = Math.max(3, Math.round((rideKm / 18) * 60));
      const totalMinutes = walkMinutes + rideMinutes;

      const fareRes = calculateTraditionalFare(rideKm, "Regular", r.jeepney_type, fareConfig);
      const regularFare = fareRes.regularFare;
      const discountFare = fareRes.discountedFare;

      // Tiered Ranking:
      // Tier 1: Direct Route + Nearby Boarding (<= 250m) -> Tier base = 0
      // Tier 2: Direct Route + Longer Boarding Walk (> 250m) -> Tier base = 2000
      // Tier 3: Nearby Drop-off (120m < walkFromDropM <= 500m) -> Tier base = 5000
      let tierBase = 5000;
      if (destMatchType === "Direct Route") {
        tierBase = (walkToBoardM <= 250) ? 0 : 2000;
      }

      const compositeScore = tierBase + (walkFromDropM * 3.5) + (walkToBoardM * 1.5) + (rideMinutes * 1.0) + (regularFare * 0.1);

      candidates.push({
        type: "direct",
        transfers: 0,
        route: r,
        direction,
        destMatchType,
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
        dropoffName
      });
    }
  }

  // Deduplicate by route code, keeping lowest compositeScore
  const bestByCode = new Map();
  for (const c of candidates) {
    if (!bestByCode.has(c.route.code) || c.compositeScore < bestByCode.get(c.route.code).compositeScore) {
      bestByCode.set(c.route.code, c);
    }
  }

  const sorted = [...bestByCode.values()].sort((a, b) => a.compositeScore - b.compositeScore);
  return sorted.slice(0, 5);
}

async function runTests() {
  console.log('=== TESTING IMPROVED DIRECT ROUTE FINDER ===\n');

  const tests = [
    { name: 'Agora to SM CDO Downtown', from: [8.48813, 124.65800], to: [8.4855, 124.6535] },
    { name: 'Carmen Market to Cogon Market', from: [8.4795, 124.6368], to: [8.4770, 124.6513] },
    { name: 'Bulua Westbound to Carmen Market', from: [8.5122, 124.6242], to: [8.4793, 124.6366] },
    { name: 'Patag Camp Evangelista to Limketkai Center', from: [8.4877, 124.6258], to: [8.4842, 124.6568] }
  ];

  for (const t of tests) {
    console.log(`\n============================================================`);
    console.log(`TEST: ${t.name}`);
    const results = await findImprovedDirectRoutes(t.from[0], t.from[1], t.to[0], t.to[1], 'Origin', 'Destination');
    results.forEach((r, idx) => {
      console.log(`  #${idx + 1}: [${r.route.code}] ${r.route.name} (${r.direction}) [${r.destMatchType}]`);
      console.log(`      Board at: "${r.boardingName}" | Walk to board: ${r.walkToBoardM}m`);
      console.log(`      Alight at: "${r.dropoffName}" | Walk to dest: ${r.walkFromDropM}m`);
      console.log(`      Fare: ₱${r.regularFare} | Time: ~${r.totalMinutes}m | Ride: ${r.rideKm}km | Score: ${r.compositeScore.toFixed(1)}`);
    });
  }

  process.exit(0);
}

runTests().catch(console.error);

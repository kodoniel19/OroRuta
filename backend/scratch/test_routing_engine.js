const db = require('../src/config/db');
const { haversineMeters } = require('../src/utils');
const { calculateTraditionalFare, calculateTripFare, getDynamicFareConfig } = require('../src/services/fareService');

function calculatePolylineMeters(coords) {
  let meters = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    meters += haversineMeters(coords[i][1], coords[i][0], coords[i + 1][1], coords[i + 1][0]);
  }
  return meters;
}

const CDO_TRANSFER_HUBS = [
  { id: "hub-carmen", name: "Carmen Public Market Terminal", lat: 8.4845, lng: 124.6335, area: "Carmen" },
  { id: "hub-cogon", name: "Cogon Market Terminal", lat: 8.4735, lng: 124.6497, area: "Cogon" },
  { id: "hub-agora", name: "Agora Eastbound Terminal", lat: 8.4857, lng: 124.6589, area: "Lapasan" },
  { id: "hub-bulua", name: "Bulua Westbound Terminal", lat: 8.5040, lng: 124.6115, area: "Bulua" },
  { id: "hub-divisoria", name: "Divisoria Plaza Interchange", lat: 8.4777, lng: 124.6452, area: "Divisoria" },
  { id: "hub-velez-recto", name: "Velez-Recto Junction", lat: 8.4871, lng: 124.6508, area: "Poblacion" }
];

async function findDirectCandidates(origLat, origLng, destLat, destLng, maxWalkOrig = 850, maxWalkDest = 750) {
  const [routes] = await db.execute("SELECT * FROM routes WHERE status = 'Active'");
  const [geos] = await db.execute("SELECT route_id, direction, geometry FROM route_geometry");
  const fareConfig = await getDynamicFareConfig();

  const geoByRoute = {};
  for (const g of geos) {
    if (!geoByRoute[g.route_id]) geoByRoute[g.route_id] = [];
    geoByRoute[g.route_id].push(g);
  }

  const directDistM = haversineMeters(origLat, origLng, destLat, destLng);
  const candidates = [];

  for (const r of routes) {
    const routeGeos = geoByRoute[r.id] || [];
    for (const g of routeGeos) {
      let geom = g.geometry;
      if (typeof geom === "string") {
        try { geom = JSON.parse(geom); } catch (_) { geom = null; }
      }
      if (!geom || !geom.coordinates || geom.coordinates.length < 2) continue;
      const coords = geom.coordinates;

      let minOrigDist = Infinity, origIdx = -1;
      let minDestDist = Infinity, destIdx = -1;

      for (let i = 0; i < coords.length; i++) {
        const dO = haversineMeters(origLat, origLng, coords[i][1], coords[i][0]);
        if (dO < minOrigDist) { minOrigDist = dO; origIdx = i; }
        const dD = haversineMeters(destLat, destLng, coords[i][1], coords[i][0]);
        if (dD < minDestDist) { minDestDist = dD; destIdx = i; }
      }

      if (minOrigDist > maxWalkOrig || minDestDist > maxWalkDest) continue;
      if (origIdx >= destIdx || (destIdx - origIdx) < 4) continue;

      const rideCoords = coords.slice(origIdx, destIdx + 1);
      const rideMeters = calculatePolylineMeters(rideCoords);
      if (rideMeters < 350) continue;

      // Reject massive detours if direct distance is short
      if (directDistM < 1600 && rideMeters > directDistM * 2.5) continue;

      const rideKm = Math.round((rideMeters / 1000) * 10) / 10 || 0.4;
      const walkToBoardM = Math.round(minOrigDist);
      const walkFromDropM = Math.round(minDestDist);
      const totalWalkM = walkToBoardM + walkFromDropM;

      const walkMinutesToBoard = Math.max(1, Math.round(walkToBoardM / 75));
      const walkMinutesFromDrop = Math.max(1, Math.round(walkFromDropM / 75));
      const walkMinutes = walkMinutesToBoard + walkMinutesFromDrop;
      const rideMinutes = Math.max(3, Math.round((rideKm / 18) * 60));
      const totalMinutes = walkMinutes + rideMinutes;

      const fareRes = calculateTraditionalFare(rideKm, "Regular", r.jeepney_type, fareConfig);

      const dropoffPenalty = walkFromDropM > 250 ? Math.pow((walkFromDropM - 250) / 60, 1.3) * 3 : 0;
      const compositeScore = (totalWalkM / 75) * 1.5 + totalMinutes + (fareRes.regularFare * 0.35) + dropoffPenalty;

      candidates.push({
        type: 'direct',
        transfers: 0,
        route: r,
        direction: g.direction,
        origIdx,
        destIdx,
        rideCoords,
        rideKm,
        rideMeters,
        walkToBoardM,
        walkFromDropM,
        totalWalkM,
        walkMinutesToBoard,
        walkMinutesFromDrop,
        walkMinutes,
        rideMinutes,
        totalMinutes,
        regularFare: fareRes.regularFare,
        discountFare: fareRes.discountedFare,
        boardingCoord: [coords[origIdx][0], coords[origIdx][1]],
        dropoffCoord: [coords[destIdx][0], coords[destIdx][1]],
        compositeScore
      });
    }
  }

  return candidates;
}

async function findTransferCandidates(origLat, origLng, destLat, destLng) {
  const directDistM = haversineMeters(origLat, origLng, destLat, destLng);
  const transferOptions = [];
  const fareConfig = await getDynamicFareConfig();

  for (const hub of CDO_TRANSFER_HUBS) {
    const dOHub = haversineMeters(origLat, origLng, hub.lat, hub.lng);
    const dHubD = haversineMeters(hub.lat, hub.lng, destLat, destLng);

    // Skip if origin or destination is already within 350m of hub
    if (dOHub < 350 || dHubD < 350) continue;

    // Detour check: triangle inequality
    if ((dOHub + dHubD) > Math.max(2.4 * directDistM, directDistM + 4500)) continue;

    // Find Leg 1: Origin -> Hub
    const leg1Candidates = await findDirectCandidates(origLat, origLng, hub.lat, hub.lng, 850, 300);
    if (!leg1Candidates.length) continue;

    // Find Leg 2: Hub -> Destination
    const leg2Candidates = await findDirectCandidates(hub.lat, hub.lng, destLat, destLng, 300, 750);
    if (!leg2Candidates.length) continue;

    // Sort to get best leg 1 and leg 2 candidates
    leg1Candidates.sort((a,b) => a.compositeScore - b.compositeScore);
    leg2Candidates.sort((a,b) => a.compositeScore - b.compositeScore);

    const topLeg1 = leg1Candidates.slice(0, 3);
    const topLeg2 = leg2Candidates.slice(0, 3);

    for (const l1 of topLeg1) {
      for (const l2 of topLeg2) {
        if (l1.route.id === l2.route.id) continue; // Must be distinct routes

        const transferWalkM = Math.round(haversineMeters(l1.dropoffCoord[1], l1.dropoffCoord[0], l2.boardingCoord[1], l2.boardingCoord[0]));
        if (transferWalkM > 350) continue; // Transfer walk too far

        const totalWalkM = l1.walkToBoardM + transferWalkM + l2.walkFromDropM;
        const totalWalkMins = Math.max(2, Math.round(totalWalkM / 75));
        const transferWaitMins = 5; // Headway buffer
        const totalMinutes = l1.walkMinutesToBoard + l1.rideMinutes + transferWaitMins + l2.rideMinutes + l2.walkMinutesFromDrop;
        const totalKm = Math.round((l1.rideKm + l2.rideKm) * 10) / 10;

        const fare1 = calculateTraditionalFare(l1.rideKm, "Regular", l1.route.jeepney_type, fareConfig);
        const fare2 = calculateTraditionalFare(l2.rideKm, "Regular", l2.route.jeepney_type, fareConfig);

        const regularFare = fare1.regularFare + fare2.regularFare;
        const discountFare = fare1.discountedFare + fare2.discountedFare;

        const dropoffPenalty = l2.walkFromDropM > 250 ? Math.pow((l2.walkFromDropM - 250) / 60, 1.3) * 3 : 0;
        const compositeScore = (totalWalkM / 75) * 1.5 + totalMinutes + (regularFare * 0.35) + 8.0 + dropoffPenalty;

        transferOptions.push({
          type: 'transfer',
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
          compositeScore
        });
      }
    }
  }

  return transferOptions;
}

async function runTests() {
  console.log("==================================================================");
  console.log("RUNNING ROUTING ENGINE VALIDATION FOR USER'S TEST CASES");
  console.log("==================================================================");

  // Test 1: Current location (Masterson Ave Uptown: 8.4600, 124.6250) -> Liceo de Cagayan University (8.4965, 124.6407)
  console.log("\n[TEST 1] Current Location (Masterson Ave) -> Liceo de Cagayan University");
  const direct1 = await findDirectCandidates(8.4600, 124.6250, 8.4965, 124.6407);
  const transfer1 = await findTransferCandidates(8.4600, 124.6250, 8.4965, 124.6407);
  console.log(`Direct candidates: ${direct1.length}, Transfer candidates: ${transfer1.length}`);
  if (transfer1.length > 0) {
    transfer1.sort((a,b) => a.compositeScore - b.compositeScore);
    const best = transfer1[0];
    console.log(`  -> Recommended Transfer Journey via ${best.hub.name}:`);
    console.log(`     Leg 1: Board ${best.leg1.route.code} (${best.leg1.route.name}) at ${best.leg1.walkToBoardM}m walk -> Ride ${best.leg1.rideKm} km to ${best.hub.name} (Fare: ₱${best.fare1.regularFare})`);
    console.log(`     Transfer: Walk ${best.transferWalkM}m at ${best.hub.name}`);
    console.log(`     Leg 2: Board ${best.leg2.route.code} (${best.leg2.route.name}) -> Ride ${best.leg2.rideKm} km to Liceo (Fare: ₱${best.fare2.regularFare}, Alight ${best.leg2.walkFromDropM}m walk)`);
    console.log(`     Total: ₱${best.regularFare} (₱${best.discountFare} disc) · ${best.totalMinutes} mins · ${best.totalKm} km · ${best.totalWalkM}m total walk · 1 transfer`);
  }

  // Test 2: Masterson Ave -> SM CDO Downtown (8.4855, 124.6535)
  console.log("\n[TEST 2] Current Location (Masterson Ave) -> SM CDO Downtown");
  const direct2 = await findDirectCandidates(8.4600, 124.6250, 8.4855, 124.6535);
  console.log(`Direct candidates: ${direct2.length}`);
  direct2.sort((a,b) => a.compositeScore - b.compositeScore);
  direct2.slice(0, 3).forEach((d, i) => {
    console.log(`  [${i+1}] Direct: Route ${d.route.code} (${d.route.name}) - Ride ${d.rideKm} km, Fare ₱${d.regularFare}, Walk to board ${d.walkToBoardM}m, Walk to SM ${d.walkFromDropM}m, Total time ${d.totalMinutes} mins`);
  });

  // Test 3: Masterson Ave -> Centrio Mall (8.4877, 124.6517)
  console.log("\n[TEST 3] Current Location (Masterson Ave) -> Centrio Mall");
  const direct3 = await findDirectCandidates(8.4600, 124.6250, 8.4877, 124.6517);
  console.log(`Direct candidates: ${direct3.length}`);
  direct3.sort((a,b) => a.compositeScore - b.compositeScore);
  direct3.slice(0, 3).forEach((d, i) => {
    console.log(`  [${i+1}] Direct: Route ${d.route.code} (${d.route.name}) - Ride ${d.rideKm} km, Fare ₱${d.regularFare}, Walk to board ${d.walkToBoardM}m, Walk to Centrio ${d.walkFromDropM}m, Total time ${d.totalMinutes} mins`);
  });

  // Test 4: Masterson Ave -> Agora Market (8.4857, 124.6589)
  console.log("\n[TEST 4] Current Location (Masterson Ave) -> Agora Market");
  const direct4 = await findDirectCandidates(8.4600, 124.6250, 8.4857, 124.6589);
  console.log(`Direct candidates: ${direct4.length}`);
  direct4.sort((a,b) => a.compositeScore - b.compositeScore);
  direct4.slice(0, 3).forEach((d, i) => {
    console.log(`  [${i+1}] Direct: Route ${d.route.code} (${d.route.name}) - Ride ${d.rideKm} km, Fare ₱${d.regularFare}, Walk to board ${d.walkToBoardM}m, Walk to Agora ${d.walkFromDropM}m, Total time ${d.totalMinutes} mins`);
  });

  // Test 5: Carmen Market (8.4845, 124.6335) -> Liceo de Cagayan University (8.4965, 124.6407) [Direct destination]
  console.log("\n[TEST 5] Carmen Market -> Liceo de Cagayan University");
  const direct5 = await findDirectCandidates(8.4845, 124.6335, 8.4965, 124.6407);
  console.log(`Direct candidates: ${direct5.length}`);
  direct5.sort((a,b) => a.compositeScore - b.compositeScore);
  direct5.slice(0, 3).forEach((d, i) => {
    console.log(`  [${i+1}] Direct: Route ${d.route.code} (${d.route.name}) - Ride ${d.rideKm} km, Fare ₱${d.regularFare}, Walk to board ${d.walkToBoardM}m, Walk to Liceo ${d.walkFromDropM}m, Total time ${d.totalMinutes} mins`);
  });

  // Test 6: Puerto Public Market (8.499, 124.742) -> Bulua Westbound Terminal (8.504, 124.6115) [East to West Transfer Journey]
  console.log("\n[TEST 6] Puerto Public Market (East) -> Bulua Westbound Terminal (West) [Transfer Journey]");
  const transfer6 = await findTransferCandidates(8.499, 124.742, 8.504, 124.6115);
  console.log(`Transfer candidates found: ${transfer6.length}`);
  if (transfer6.length > 0) {
    transfer6.sort((a,b) => a.compositeScore - b.compositeScore);
    const best6 = transfer6[0];
    console.log(`  -> Recommended Transfer Journey via ${best6.hub.name}:`);
    console.log(`     Leg 1: Board ${best6.leg1.route.code} (${best6.leg1.route.name}) -> Ride ${best6.leg1.rideKm} km to ${best6.hub.name} (Fare: ₱${best6.fare1.regularFare})`);
    console.log(`     Transfer: Walk ${best6.transferWalkM}m at ${best6.hub.name}`);
    console.log(`     Leg 2: Board ${best6.leg2.route.code} (${best6.leg2.route.name}) -> Ride ${best6.leg2.rideKm} km to Bulua (Fare: ₱${best6.fare2.regularFare})`);
    console.log(`     Total: ₱${best6.regularFare} (₱${best6.discountFare} disc) · ${best6.totalMinutes} mins · ${best6.totalKm} km · 1 transfer`);
  }

  process.exit(0);
}

runTests().catch(console.error);

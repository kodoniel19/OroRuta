const { estimateFare, haversineMeters } = require("../utils");

const validCDOPoint = point => Number.isFinite(Number(point.lat)) && Number.isFinite(Number(point.lng)) &&
  Number(point.lat) >= 8.3 && Number(point.lat) <= 8.7 && Number(point.lng) >= 124.4 && Number(point.lng) <= 124.9;

function nearestGeometryPosition(point, coordinates) {
  let index = -1;
  let distance = Infinity;
  coordinates.forEach(([lng, lat], i) => {
    const meters = haversineMeters(Number(point.lat), Number(point.lng), lat, lng);
    if (meters < distance) { index = i; distance = meters; }
  });
  return { index, distance };
}

/**
 * Return only direct itineraries whose two passenger endpoints are route-linked stops.
 * Geometry defines ordering and ride distance, never an implicit pickup/drop-off.
 */
function rankDirectItineraries({ routes, origin, destination, fareRule = null, maxWalkMeters = 1000, maxStopSnapMeters = 250 }) {
  const results = [];
  if (![origin.lat, origin.lng, destination.lat, destination.lng].every(Number.isFinite)) return results;

  for (const data of routes) {
    const coordinates = data.coordinates;
    if (!Array.isArray(coordinates) || coordinates.length < 2 || coordinates.some(c =>
      !Array.isArray(c) || c.length < 2 || !Number.isFinite(c[0]) || !Number.isFinite(c[1]) ||
      c[0] < 124.4 || c[0] > 124.9 || c[1] < 8.3 || c[1] > 8.7
    )) continue;

    const withPosition = points => (points || []).filter(validCDOPoint)
      .map(point => ({ ...point, ...nearestGeometryPosition(point, coordinates) }))
      .filter(point => point.distance <= maxStopSnapMeters);
    const boardStops = withPosition(data.boardingStops);
    const alightStops = withPosition(data.alightingStops);

    for (const board of boardStops) {
      const walkToBoardM = Math.round(haversineMeters(origin.lat, origin.lng, Number(board.lat), Number(board.lng)) * 1.35);
      if (walkToBoardM > maxWalkMeters) continue;
      for (const alight of alightStops) {
        if (alight.index <= board.index) continue;
        const walkFromDropM = Math.round(haversineMeters(Number(alight.lat), Number(alight.lng), destination.lat, destination.lng) * 1.35);
        if (walkFromDropM > maxWalkMeters) continue;
        const rideCoords = coordinates.slice(board.index, alight.index + 1);
        let rideDistMeters = 0;
        for (let i = 1; i < rideCoords.length; i++) {
          rideDistMeters += haversineMeters(rideCoords[i - 1][1], rideCoords[i - 1][0], rideCoords[i][1], rideCoords[i][0]);
        }
        if (rideDistMeters < 400) continue;
        const rideKm = Math.round(rideDistMeters / 100) / 10;
        const totalWalkM = walkToBoardM + walkFromDropM;
        const walkMinutesToBoard = Math.max(1, Math.round(walkToBoardM / 75));
        const walkMinutesFromDrop = Math.max(1, Math.round(walkFromDropM / 75));
        const rideMinutes = Math.max(3, Math.round((rideKm / 18) * 60));
        const totalMinutes = walkMinutesToBoard + walkMinutesFromDrop + rideMinutes + 3;
        const regularFare = fareRule ? estimateFare(rideKm, fareRule, "Regular") : 13;
        const discountFare = fareRule ? estimateFare(rideKm, fareRule, "Student") : 10.4;
        results.push({
          route: data.route,
          direction: data.direction,
          origIdx: board.index,
          destIdx: alight.index,
          rideCoords,
          rideDistMeters,
          rideKm,
          walkToBoardM,
          walkFromDropM,
          totalWalkM,
          walkMinutesToBoard,
          walkMinutesFromDrop,
          walkMinutes: walkMinutesToBoard + walkMinutesFromDrop,
          rideMinutes,
          totalMinutes,
          convenienceScore: totalMinutes + totalWalkM / 400,
          regularFare,
          discountFare,
          boardingCoord: [Number(board.lng), Number(board.lat)],
          dropoffCoord: [Number(alight.lng), Number(alight.lat)],
          boardingName: board.name,
          dropoffName: alight.name,
          streetSequence: data.streetSequence || ""
        });
      }
    }
  }

  const bestByRouteDirection = new Map();
  for (const option of results) {
    const key = `${option.route.id}:${option.direction}`;
    if (!bestByRouteDirection.has(key) || option.convenienceScore < bestByRouteDirection.get(key).convenienceScore) {
      bestByRouteDirection.set(key, option);
    }
  }
  return [...bestByRouteDirection.values()].sort((a, b) =>
    a.convenienceScore - b.convenienceScore || a.totalWalkM - b.totalWalkM || a.regularFare - b.regularFare
  );
}

function rankItineraries({ routes, origin, destination, fareRule = null, maxWalkMeters = 1000, maxStopSnapMeters = 250, maxTransfers = 2 }) {
  if (![origin?.lat, origin?.lng, destination?.lat, destination?.lng].every(Number.isFinite)) return [];
  const arcs = [];
  for (const data of routes || []) {
    const coordinates = data.coordinates;
    if (!Array.isArray(coordinates) || coordinates.length < 2 || coordinates.some(c =>
      !Array.isArray(c) || c.length < 2 || !Number.isFinite(c[0]) || !Number.isFinite(c[1]) ||
      c[0] < 124.4 || c[0] > 124.9 || c[1] < 8.3 || c[1] > 8.7
    )) continue;
    const withPosition = points => (points || []).filter(validCDOPoint)
      .map(point => ({ ...point, ...nearestGeometryPosition(point, coordinates) }))
      .filter(point => point.distance <= maxStopSnapMeters);
    const boards = withPosition(data.boardingStops);
    const alights = withPosition(data.alightingStops);
    for (const board of boards) for (const alight of alights) {
      if (alight.index <= board.index) continue;
      const distanceAtBoard = haversineMeters(Number(board.lat), Number(board.lng), destination.lat, destination.lng);
      const distanceAtAlight = haversineMeters(Number(alight.lat), Number(alight.lng), destination.lat, destination.lng);
      if (distanceAtAlight + 100 >= distanceAtBoard) continue;
      const rideCoords = coordinates.slice(board.index, alight.index + 1);
      const rideDistMeters = rideCoords.slice(1).reduce((sum, p, i) =>
        sum + haversineMeters(rideCoords[i][1], rideCoords[i][0], p[1], p[0]), 0);
      if (rideDistMeters < 400) continue;
      const rideKm = Math.round(rideDistMeters / 100) / 10;
      arcs.push({
        route: data.route, direction: data.direction, boardingStop: board, alightingStop: alight,
        boardingKey: board.transfer_key || null, alightingKey: alight.transfer_key || null,
        boardingCoord: [Number(board.lng), Number(board.lat)], alightingCoord: [Number(alight.lng), Number(alight.lat)],
        rideCoords, rideDistMeters, rideKm,
        rideMinutes: Math.max(3, Math.round((rideKm / 18) * 60)),
        regularFare: fareRule ? estimateFare(rideKm, fareRule, "Regular") : 13,
        discountFare: fareRule ? estimateFare(rideKm, fareRule, "Student") : 10.4,
        streetSequence: data.streetSequence || ""
      });
    }
  }

  const byBoardKey = new Map();
  for (const arc of arcs) if (arc.boardingKey) {
    if (!byBoardKey.has(arc.boardingKey)) byBoardKey.set(arc.boardingKey, []);
    byBoardKey.get(arc.boardingKey).push(arc);
  }

  const options = new Map();
  let expanded = 0;
  const maxExpansions = 30_000;
  const addOption = (rideLegs, accessWalkM, finalWalkM) => {
    const transfers = rideLegs.length - 1;
    const rideMeters = rideLegs.reduce((sum, leg) => sum + leg.rideDistMeters, 0);
    const rideKm = rideLegs.reduce((sum, leg) => sum + leg.rideKm, 0);
    const regularFare = rideLegs.reduce((sum, leg) => sum + leg.regularFare, 0);
    const discountFare = rideLegs.reduce((sum, leg) => sum + leg.discountFare, 0);
    const transferWalkDistances = rideLegs.slice(0, -1).map((leg, i) =>
      Math.round(haversineMeters(leg.alightingStop.lat, leg.alightingStop.lng,
        rideLegs[i + 1].boardingStop.lat, rideLegs[i + 1].boardingStop.lng)));
    const transferWalkM = transferWalkDistances.reduce((sum, meters) => sum + meters, 0);
    const totalWalkM = accessWalkM + transferWalkM + finalWalkM;
    const walkMinutes = Math.max(1, Math.round(accessWalkM / 75)) +
      Math.max(1, Math.round(finalWalkM / 75)) + transferWalkDistances.reduce((sum, meters) => sum + Math.max(0, Math.round(meters / 75)), 0);
    const rideMinutes = rideLegs.reduce((sum, leg) => sum + leg.rideMinutes, 0);
    const totalMinutes = walkMinutes + rideMinutes + transfers * 5 + 3;
    const convenienceScore = totalMinutes + totalWalkM / 400 + transfers * 2;
    const key = rideLegs.map(leg => `${leg.route.id}:${leg.direction}:${leg.boardingStop.id}>${leg.alightingStop.id}`).join("|");
    const option = { rideLegs, transfers, accessWalkM, transferWalkM, finalWalkM, totalWalkM, rideMeters, rideKm,
      walkMinutes, rideMinutes, totalMinutes, regularFare, discountFare, convenienceScore,
      direction: rideLegs.length === 1 ? rideLegs[0].direction : "Multi-route", route: rideLegs[0].route,
      boardingCoord: rideLegs[0].boardingCoord, dropoffCoord: rideLegs.at(-1).alightingCoord,
      boardingName: rideLegs[0].boardingStop.name, dropoffName: rideLegs.at(-1).alightingStop.name,
      rideCoords: rideLegs[0].rideCoords, rideDistMeters: rideMeters, walkToBoardM: accessWalkM,
      walkFromDropM: finalWalkM, walkMinutesToBoard: Math.max(1, Math.round(accessWalkM / 75)),
      walkMinutesFromDrop: Math.max(1, Math.round(finalWalkM / 75)) };
    const prior = options.get(key);
    if (!prior || option.convenienceScore < prior.convenienceScore) options.set(key, option);
  };

  const walkTo = arc => Math.round(haversineMeters(origin.lat, origin.lng, arc.boardingStop.lat, arc.boardingStop.lng) * 1.35);
  const walkFrom = arc => Math.round(haversineMeters(arc.alightingStop.lat, arc.alightingStop.lng, destination.lat, destination.lng) * 1.35);
  const explore = (arc, path, usedRoutes, accessWalkM) => {
    if (++expanded > maxExpansions) return;
    const nextPath = [...path, arc];
    const finalWalkM = walkFrom(arc);
    if (finalWalkM <= maxWalkMeters) addOption(nextPath, accessWalkM, finalWalkM);
    if (nextPath.length > maxTransfers) return;
    if (!arc.alightingKey) return;
    const transferOptions = byBoardKey.get(arc.alightingKey) || [];
    for (const next of transferOptions) {
      if (usedRoutes.has(next.route.id)) continue;
      const transferWalkM = Math.round(haversineMeters(arc.alightingStop.lat, arc.alightingStop.lng,
        next.boardingStop.lat, next.boardingStop.lng));
      if (transferWalkM > 200) continue;
      const currentDestDistance = haversineMeters(arc.alightingStop.lat, arc.alightingStop.lng, destination.lat, destination.lng);
      const nextDestDistance = haversineMeters(next.alightingStop.lat, next.alightingStop.lng, destination.lat, destination.lng);
      if (nextDestDistance + 100 >= currentDestDistance) continue;
      explore(next, nextPath, new Set([...usedRoutes, next.route.id]), accessWalkM);
    }
  };

  for (const arc of arcs) {
    const accessWalkM = walkTo(arc);
    if (accessWalkM <= maxWalkMeters) explore(arc, [], new Set([arc.route.id]), accessWalkM);
  }
  return [...options.values()].sort((a, b) => a.convenienceScore - b.convenienceScore ||
    a.transfers - b.transfers || a.totalWalkM - b.totalWalkM || a.regularFare - b.regularFare);
}

module.exports = { rankDirectItineraries, rankItineraries };

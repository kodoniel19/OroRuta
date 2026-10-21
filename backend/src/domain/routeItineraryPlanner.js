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

module.exports = { rankDirectItineraries };

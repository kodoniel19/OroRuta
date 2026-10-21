const { rankDirectItineraries } = require("../src/domain/routeItineraryPlanner");

const coord = lng => ({ lat: 8.48, lng });
const stop = (name, lng, type = "loading") => ({ id: name, name, point_type: type, lat: 8.48, lng });
const makeRoute = (id, coordinates, boardingStops, alightingStops, direction = "Inbound") => ({
  route: { id, code: id, name: id }, direction, coordinates, boardingStops, alightingStops
});
const pts = (...lngs) => lngs.map(lng => [lng, 8.48]);
const plan = (origin, destination, routes) => rankDirectItineraries({
  origin: coord(origin), destination: coord(destination), routes
});

describe("verified direct itinerary ranking", () => {
  test("a closer verified stop wins when both stops reach the destination in order", () => {
    const route = makeRoute("closer", pts(124.630, 124.633, 124.636, 124.639, 124.642, 124.645),
      [stop("far", 124.636), stop("close", 124.633)], [stop("downtown terminal", 124.645, "terminal")]);
    const result = plan(124.633, 124.645, [route]);
    expect(result[0].boardingName).toBe("close");
  });

  test("geometry near a destination cannot replace a verified alighting stop", () => {
    const route = makeRoute("near-origin-only", pts(124.630, 124.633, 124.636, 124.639, 124.642, 124.645),
      [stop("near origin", 124.630)], [stop("far terminal", 124.642, "terminal")]);
    expect(plan(124.630, 124.660, [route])).toEqual([]);
  });

  test("a route direction that puts boarding after alighting is rejected", () => {
    const route = makeRoute("wrong-way", pts(124.630, 124.633, 124.636, 124.639, 124.642, 124.645),
      [stop("board east", 124.642)], [stop("alight west", 124.633, "terminal")], "Outbound");
    expect(plan(124.642, 124.633, [route])).toEqual([]);
  });

  test("missing and invalid route or stop data never creates a trip", () => {
    expect(plan(124.630, 124.645, [])).toEqual([]);
    const invalid = makeRoute("invalid", pts(124.630, 124.633, 124.636),
      [stop("invalid", 124.630)], [stop("invalid destination", 124.636, "terminal")]);
    invalid.boardingStops[0].lat = NaN;
    expect(plan(124.630, 124.636, [invalid])).toEqual([]);
    expect(rankDirectItineraries({ origin: { lat: 0, lng: 0 }, destination: coord(124.645), routes: [] })).toEqual([]);
  });

  test("different origins and destinations select different stop pairs on the same route", () => {
    const route = makeRoute("corridor", pts(124.630, 124.633, 124.636, 124.639, 124.642, 124.645),
      [stop("west", 124.630), stop("center", 124.636)],
      [stop("center terminus", 124.636, "terminal"), stop("east terminal", 124.645, "terminal")]);
    const westEast = plan(124.630, 124.645, [route])[0];
    const centerEast = plan(124.636, 124.645, [route])[0];
    expect(westEast.boardingName).toBe("west");
    expect(centerEast.boardingName).toBe("center");
    expect(centerEast.dropoffName).toBe("east terminal");
  });
});

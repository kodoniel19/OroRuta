const { rankDirectItineraries, rankItineraries } = require("../src/domain/routeItineraryPlanner");

const coord = lng => ({ lat: 8.48, lng });
const stop = (name, lng, type = "loading") => ({ id: name, name, point_type: type, lat: 8.48, lng });
const makeRoute = (id, coordinates, boardingStops, alightingStops, direction = "Inbound") => ({
  route: { id, code: id, name: id }, direction, coordinates, boardingStops, alightingStops
});
const pts = (...lngs) => lngs.map(lng => [lng, 8.48]);
const plan = (origin, destination, routes) => rankDirectItineraries({
  origin: coord(origin), destination: coord(destination), routes
});
const planAny = (origin, destination, routes) => rankItineraries({
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

describe("verified transfer itinerary ranking", () => {
  const hub = stop("Agora Terminal", 124.640, "terminal");
  hub.id = "terminal:agora";
  hub.transfer_key = "terminal:agora";
  const destination = stop("Cogon Terminal", 124.660, "terminal");
  destination.id = "terminal:cogon";
  destination.transfer_key = "terminal:cogon";
  const first = makeRoute("A", pts(124.630, 124.635, 124.640), [stop("Origin Terminal", 124.630, "terminal")], [hub]);
  const second = makeRoute("B", pts(124.640, 124.645, 124.650, 124.655, 124.660), [hub], [destination]);

  test("returns a verified one-transfer itinerary when no direct route can reach the destination", () => {
    const result = planAny(124.630, 124.660, [first, second]);
    expect(result[0].transfers).toBe(1);
    expect(result[0].rideLegs.map(leg => leg.route.id)).toEqual(["A", "B"]);
    expect(result[0].rideLegs[0].alightingStop.transfer_key).toBe(result[0].rideLegs[1].boardingStop.transfer_key);
  });

  test("supports a bounded two-transfer path through distinct linked terminals", () => {
    const hubOne = { ...hub, id: "terminal:one", transfer_key: "terminal:one", lng: 124.640 };
    const hubTwo = { ...destination, id: "terminal:two", transfer_key: "terminal:two", lng: 124.650 };
    const finalStop = { ...destination, id: "terminal:destination", lng: 124.660 };
    const firstLeg = makeRoute("first", pts(124.630, 124.635, 124.640), [stop("origin", 124.630)], [hubOne]);
    const secondLeg = makeRoute("second", pts(124.640, 124.645, 124.650), [hubOne], [hubTwo]);
    const thirdLeg = makeRoute("third", pts(124.650, 124.655, 124.660), [hubTwo], [finalStop]);
    const result = planAny(124.630, 124.660, [firstLeg, secondLeg, thirdLeg]);
    expect(result[0].transfers).toBe(2);
    expect(result[0].rideLegs.map(leg => leg.route.id)).toEqual(["first", "second", "third"]);
  });

  test("a practical direct trip ranks ahead of an unnecessary transfer", () => {
    const direct = makeRoute("direct", pts(124.630, 124.640, 124.650, 124.660),
      [stop("Origin Terminal", 124.630, "terminal")], [destination]);
    const result = planAny(124.630, 124.660, [first, second, direct]);
    expect(result[0].transfers).toBe(0);
    expect(result[0].rideLegs[0].route.id).toBe("direct");
  });

  test("does not connect a route-specific stop merely because its name resembles a terminal", () => {
    const unlinkedHub = { ...hub, id: "route-only-hub", transfer_key: undefined };
    const invalidSecond = makeRoute("C", pts(124.640, 124.650, 124.660), [unlinkedHub], [destination]);
    expect(planAny(124.630, 124.660, [first, invalidSecond])).toEqual([]);
  });

  test("rejects reverse-direction stop order on a transfer-capable route", () => {
    const reverse = makeRoute("reverse", pts(124.630, 124.635, 124.640, 124.645),
      [stop("east board", 124.645, "terminal")], [stop("west alight", 124.630, "terminal")], "Outbound");
    expect(planAny(124.645, 124.630, [reverse])).toEqual([]);
  });

  test("rejects looping transfers, repeated routes, and legs that move away from the destination", () => {
    const loopRoute = makeRoute("A", pts(124.630, 124.635, 124.640), [stop("Origin", 124.630)], [hub]);
    const away = stop("Westbound Hub", 124.640, "terminal"); away.id = "terminal:agora"; away.transfer_key = "terminal:agora";
    const backAway = makeRoute("B", pts(124.640, 124.635, 124.630), [away], [stop("West", 124.630, "terminal")]);
    expect(planAny(124.630, 124.660, [loopRoute, backAway])).toEqual([]);

    const repeatBoard = { ...destination, id: "terminal:repeat", transfer_key: "terminal:repeat", lat: 8.48, lng: 124.640 };
    const repeatAlight = { ...destination, id: "terminal:finish", transfer_key: "terminal:finish" };
    const firstRide = makeRoute("same-route", pts(124.630, 124.635, 124.640), [stop("origin", 124.630)], [repeatBoard]);
    const repeatedRide = makeRoute("same-route", pts(124.640, 124.650, 124.660), [repeatBoard], [repeatAlight], "Outbound");
    expect(planAny(124.630, 124.660, [firstRide, repeatedRide])).toEqual([]);
  });

  test("exposes complete journey metrics for walking, transfer count, time, and summed fare", () => {
    const trip = planAny(124.630, 124.660, [first, second])[0];
    expect(trip.totalWalkM).toBe(trip.accessWalkM + trip.transferWalkM + trip.finalWalkM);
    expect(trip.transfers).toBe(trip.rideLegs.length - 1);
    expect(trip.totalMinutes).toBeGreaterThan(trip.rideMinutes);
    expect(trip.regularFare).toBeCloseTo(trip.rideLegs.reduce((sum, leg) => sum + leg.regularFare, 0));
  });
});

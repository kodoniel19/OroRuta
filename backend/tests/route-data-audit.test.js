const routes = require("../../android/app/src/main/assets/bundled_routes.json");

const cdoCoordinate = (lat, lng) =>
  Number.isFinite(lat) && Number.isFinite(lng) && lat >= 8.3 && lat <= 8.7 && lng >= 124.4 && lng <= 124.9;

const haversine = (a, b) => {
  const rad = Math.PI / 180;
  const dLat = (b[1] - a[1]) * rad;
  const dLng = (b[0] - a[0]) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * rad) * Math.cos(b[1] * rad) * Math.sin(dLng / 2) ** 2;
  return 12_742_000 * Math.asin(Math.sqrt(h));
};

describe("bundled CDO route data audit", () => {
  test("all published routes have valid direction-specific geometries and stop coordinates", () => {
    expect(routes.length).toBeGreaterThan(0);
    for (const route of routes) {
      const directions = new Set((route.directions || []).map(d => d.direction));
      expect(directions.has("Inbound")).toBe(true);
      expect(directions.has("Outbound")).toBe(true);
      expect(new Set((route.geometries || []).map(g => g.direction))).toEqual(new Set(["Inbound", "Outbound"]));
      for (const geometry of route.geometries) {
        const coords = JSON.parse(geometry.geometry).coordinates;
        expect(coords.length).toBeGreaterThan(1);
        for (const [lng, lat] of coords) expect(cdoCoordinate(lat, lng)).toBe(true);
      }
      for (const point of [...(route.terminals || []), ...(route.stops || []), ...(route.transfers || [])]) {
        expect(cdoCoordinate(point.lat, point.lng)).toBe(true);
        if (point.route_id) expect(point.route_id).toBe(route.id);
      }
    }
  });

  test("R-BAL geometry proximity to SM Downtown is not treated as a verified stop", () => {
    const route = routes.find(r => r.code === "R-BAL");
    expect(route).toBeDefined();
    const smDowntown = [124.6535, 8.4855];
    const routeDistance = Math.min(...route.geometries.flatMap(g =>
      JSON.parse(g.geometry).coordinates.map(c => haversine(c, smDowntown))
    ));
    const knownStops = [...route.terminals, ...route.stops, ...route.transfers];
    const verifiedStopDistance = Math.min(...knownStops.map(s => haversine([s.lng, s.lat], smDowntown)));
    expect(routeDistance).toBeLessThan(1_000);
    expect(verifiedStopDistance).toBeGreaterThan(1_000);
  });
});

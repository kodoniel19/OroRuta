const request = require("supertest");
const app = require("../src/server");
const db = require("../src/config/db");

const DEVICE_ID = "test-device-uuid-1234-5678";
jest.setTimeout(20000);

afterAll(async () => {
  // Clean up test data
  try {
    await db.execute("DELETE FROM searches WHERE device_id=?", [DEVICE_ID]);
    await db.execute("DELETE FROM devices WHERE id=?", [DEVICE_ID]);
  } catch {}
  await db.end();
});

describe("Health", () => {
  it("GET /api/v1/health returns ok", async () => {
    const res = await request(app).get("/api/v1/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });
});

describe("Devices", () => {
  it("POST /api/v1/devices/register requires X-Device-Id", async () => {
    const res = await request(app).post("/api/v1/devices/register");
    expect(res.status).toBe(400);
  });

  it("POST /api/v1/devices/register creates device", async () => {
    const res = await request(app)
      .post("/api/v1/devices/register")
      .set("X-Device-Id", DEVICE_ID);
    expect([200, 201]).toContain(res.status);
    expect(res.body.deviceId).toBe(DEVICE_ID);
  });

  it("GET /api/v1/devices/me/preferences returns prefs", async () => {
    const res = await request(app)
      .get("/api/v1/devices/me/preferences")
      .set("X-Device-Id", DEVICE_ID);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("language");
  });
});

describe("Places", () => {
  it("GET /api/v1/places returns list", async () => {
    const res = await request(app).get("/api/v1/places");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it("GET /api/v1/places?q=Limketkai filters correctly", async () => {
    const res = await request(app).get("/api/v1/places?q=Limketkai");
    expect(res.status).toBe(200);
    expect(res.body.some(p => p.name.includes("Limketkai"))).toBe(true);
  });

  it("GET /api/v1/places?q=limkdtkai typo matches Limketkai Center", async () => {
    const res = await request(app).get("/api/v1/places?q=limkdtkai");
    expect(res.status).toBe(200);
    expect(res.body.some(p => p.name.includes("Limketkai"))).toBe(true);
  });

  it("GET /api/v1/places?filter=landmarks contains the 5 key landmarks", async () => {
    const res = await request(app).get("/api/v1/places?filter=landmarks");
    expect(res.status).toBe(200);
    const names = res.body.map(p => p.name);
    expect(names.some(n => n.includes("Limketkai"))).toBe(true);
    expect(names.some(n => n.includes("SM"))).toBe(true);
    expect(names.some(n => n.includes("Centrio"))).toBe(true);
    expect(names.some(n => n.includes("Cogon"))).toBe(true);
    expect(names.some(n => n.includes("Cathedral"))).toBe(true);
  });

  it("GET /api/v1/places?filter=terminals returns verified terminals", async () => {
    const res = await request(app).get("/api/v1/places?filter=terminals");
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body.some(p => p.name.includes("Terminal"))).toBe(true);
  });

  it("GET /api/v1/places?q=Miami returns Miami Inn Carmen", async () => {
    const res = await request(app).get("/api/v1/places?q=Miami");
    expect(res.status).toBe(200);
    expect(res.body.some(p => p.name.includes("Miami Inn"))).toBe(true);
  });
});

describe("Routes", () => {
  it("audits all live route directions, coordinates, associated stops, and landmarks", async () => {
    const [[routes], [geometries], [directions], [stops], [landmarks], [sharedTerminals]] = await Promise.all([
      db.execute("SELECT id FROM routes WHERE status != 'Inactive' AND (jeepney_type='Traditional' OR jeepney_type IS NULL OR jeepney_type='')"),
      db.execute("SELECT route_id,direction,geometry FROM route_geometry"),
      db.execute("SELECT route_id,direction FROM route_directions"),
      db.execute("SELECT route_id,lat,lng FROM loading_points UNION ALL SELECT rt.route_id,t.lat,t.lng FROM terminals t JOIN route_terminals rt ON rt.terminal_id=t.id UNION ALL SELECT route_id,lat,lng FROM transfer_points"),
      db.execute("SELECT lat,lng FROM landmarks"),
      db.execute("SELECT terminal_id,COUNT(DISTINCT route_id) AS n FROM route_terminals GROUP BY terminal_id HAVING n>1")
    ]);
    expect(routes.length).toBeGreaterThan(0);
    const routeIds = new Set(routes.map(route => route.id));
    for (const routeId of routeIds) {
      expect(new Set(geometries.filter(g => g.route_id === routeId).map(g => g.direction))).toEqual(new Set(["Inbound", "Outbound"]));
      expect(new Set(directions.filter(d => d.route_id === routeId).map(d => d.direction))).toEqual(new Set(["Inbound", "Outbound"]));
    }
    for (const entry of geometries.filter(g => routeIds.has(g.route_id))) {
      const geometry = typeof entry.geometry === "string" ? JSON.parse(entry.geometry) : entry.geometry;
      expect(geometry.coordinates.length).toBeGreaterThan(1);
      for (const [lng, lat] of geometry.coordinates) expect(lat >= 8.3 && lat <= 8.7 && lng >= 124.4 && lng <= 124.9).toBe(true);
    }
    for (const point of [...stops, ...landmarks]) {
      expect(Number.isFinite(Number(point.lat)) && Number.isFinite(Number(point.lng))).toBe(true);
      expect(Number(point.lat) >= 8.3 && Number(point.lat) <= 8.7 && Number(point.lng) >= 124.4 && Number(point.lng) <= 124.9).toBe(true);
    }
    expect(sharedTerminals.length).toBeGreaterThan(0);
  });

  it("GET /api/v1/routes returns all routes", async () => {
    const res = await request(app).get("/api/v1/routes");
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it("GET /api/v1/routes?q=R3 filters by code", async () => {
    const res = await request(app).get("/api/v1/routes?q=R3");
    expect(res.status).toBe(200);
    expect(res.body.some(r => r.code === "R3")).toBe(true);
  });

  it("GET /api/v1/routes/:id returns route detail", async () => {
    const listRes = await request(app).get("/api/v1/routes");
    const r3 = listRes.body.find(r => r.code === "R3");
    const res = await request(app).get(`/api/v1/routes/${r3.id}`);
    expect(res.status).toBe(200);
    expect(res.body.code).toBe("R3");
    expect(Array.isArray(res.body.terminals)).toBe(true);
    expect(Array.isArray(res.body.stops)).toBe(true);
    expect(Array.isArray(res.body.path)).toBe(true);
  });
});

describe("Trips", () => {
  it("GET /api/v1/trips/search does not invent a route for Liceo to Limketkai when linked stops do not form a valid segment", async () => {
    const res = await request(app)
      .get("/api/v1/trips/search?from=Liceo&to=Limketkai&sort=time");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toEqual([]);
  });

  it("GET /api/v1/trips/search reports unresolved places instead of disguising them as no-route results", async () => {
    const res = await request(app)
      .get("/api/v1/trips/search?from=UnknownPlace123&to=AnotherPlace456");
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("PLACE_NOT_RESOLVED");
  });

  it("GET /api/v1/trips/search recommends route-linked R5 stops for a verified Carmen to SM Downtown journey", async () => {
    const res = await request(app)
      .get("/api/v1/trips/search?from=Current%20Location&to=SM%20Downtown&fromLat=8.4845&fromLng=124.6335&toLat=8.4855&toLng=124.6535&sort=time");
    expect(res.status).toBe(200);
    const option = res.body.find(o => o.segments.some(s => s.route_id === "564269a7-bf89-4bff-a955-e8c518ba4dea"));
    expect(option).toBeDefined();
    expect(option.direction).toBe("Inbound");
    expect(option.boarding_name).toBe("Carmen Market Terminal");
    expect(option.dropoff_name).toBe("Limketkai Center Loading Bay");
    expect(option.walk_meters).toBeLessThan(1000);
  });

  it("GET /api/v1/trips/search does not suggest a backtracking transfer from Carmen to Cogon", async () => {
    const res = await request(app)
      .get("/api/v1/trips/search?from=Current%20Location&to=Cogon%20Public%20Market&fromLat=8.4845&fromLng=124.6335&sort=time");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toEqual([]);
  });

  it("GET /api/v1/trips/search returns a verified two-route journey when a transfer beats the direct option", async () => {
    const res = await request(app)
      .get("/api/v1/trips/search?from=Current%20Location&to=Divisoria&fromLat=8.504&fromLng=124.6115&toLat=8.4777&toLng=124.6452&sort=time");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    const option = res.body.find(o => o.transfers === 1 && o.segments.length === 2);
    expect(option).toBeDefined();
    expect(new Set(res.body.map(o => o.id)).size).toBe(res.body.length);
    expect(option.transfer_name).toBe("Cogon Market Jeepney Terminal");
    expect(option.legs.some(l => l.kind === "transfer")).toBe(true);
    expect(option.segments[0].dropoff_name).toBe(option.segments[1].boarding_name);
    expect(option.segments.every(s => s.geometry_coordinates.length > 1 && s.direction)).toBe(true);
    expect(res.body.some(o => o.transfers === 0)).toBe(true);
    expect(option.minutes).toBeLessThan(res.body.find(o => o.transfers === 0).minutes);
    const fewestTransfers = await request(app)
      .get("/api/v1/trips/search?from=Current%20Location&to=Divisoria&fromLat=8.504&fromLng=124.6115&toLat=8.4777&toLng=124.6452&sort=transfers");
    expect(fewestTransfers.status).toBe(200);
    expect(fewestTransfers.body[0].transfers).toBe(0);
  });

  it("GET /api/v1/trips/search rejects out-of-area coordinates", async () => {
    const res = await request(app).get("/api/v1/trips/search?from=Current%20Location&to=Cogon&fromLat=0&fromLng=0");
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INVALID_COORDINATES");
  });
});

describe("Fares", () => {
  it("GET /api/v1/fares/rules returns rules", async () => {
    const res = await request(app).get("/api/v1/fares/rules");
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0]).toHaveProperty("minimum");
  });
});

describe("Announcements", () => {
  it("GET /api/v1/announcements returns all announcements", async () => {
    const res = await request(app).get("/api/v1/announcements");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("GET /api/v1/announcements?status=Active returns only active", async () => {
    const res = await request(app).get("/api/v1/announcements?status=Active");
    expect(res.status).toBe(200);
    res.body.forEach(a => expect(a.status).toBe("Active"));
  });
});

describe("History", () => {
  it("POST /api/v1/history saves a search", async () => {
    const res = await request(app)
      .post("/api/v1/history")
      .set("X-Device-Id", DEVICE_ID)
      .send({ from: "Liceo de Cagayan University", to: "Limketkai Center" });
    expect([200, 201]).toContain(res.status);
    expect(res.body).toHaveProperty("id");
  });

  it("POST /api/v1/history deduplicates repeated search and updates existing record", async () => {
    // Post duplicate search
    const resDup = await request(app)
      .post("/api/v1/history")
      .set("X-Device-Id", DEVICE_ID)
      .send({ from: "Liceo de Cagayan University", to: "Limketkai Center" });
    expect([200, 201]).toContain(resDup.status);

    // Fetch history - should only contain 1 item for this pair
    const resList = await request(app)
      .get("/api/v1/history")
      .set("X-Device-Id", DEVICE_ID);
    expect(resList.status).toBe(200);
    const matches = resList.body.filter(h => h.destination === "Limketkai Center");
    expect(matches.length).toBe(1);
  });

  it("GET /api/v1/history returns history", async () => {
    const res = await request(app)
      .get("/api/v1/history")
      .set("X-Device-Id", DEVICE_ID);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it("DELETE /api/v1/history clears all", async () => {
    const res = await request(app)
      .delete("/api/v1/history")
      .set("X-Device-Id", DEVICE_ID);
    expect(res.status).toBe(200);
  });
});

describe("Reports", () => {
  it("POST /api/v1/reports validates description length", async () => {
    const res = await request(app)
      .post("/api/v1/reports")
      .set("X-Device-Id", DEVICE_ID)
      .send({ type: "Other", description: "short" });
    expect(res.status).toBe(422);
  });

  it("POST /api/v1/reports creates report", async () => {
    const res = await request(app)
      .post("/api/v1/reports")
      .set("X-Device-Id", DEVICE_ID)
      .send({ type: "Other", description: "This is a test report with enough characters." });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("referenceNo");
    expect(res.body.referenceNo).toMatch(/^OR-/);
  });
});

describe("Content", () => {
  it("GET /api/v1/content/privacy returns privacy page if available", async () => {
    const res = await request(app).get("/api/v1/content/privacy");
    expect([200, 404]).toContain(res.status);
  });

  it("GET /api/v1/help/topics returns topics", async () => {
    const res = await request(app).get("/api/v1/help/topics");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("GET /api/v1/help/faqs returns faqs", async () => {
    const res = await request(app).get("/api/v1/help/faqs");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe("Map", () => {
  it("GET /api/v1/map/base returns geometry", async () => {
    const res = await request(app).get("/api/v1/map/base");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

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
  it("GET /api/v1/trips/search returns options for Liceo to Limketkai", async () => {
    const res = await request(app)
      .get("/api/v1/trips/search?from=Liceo&to=Limketkai&sort=time");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    expect(res.body[0]).toHaveProperty("minutes");
    expect(res.body[0]).toHaveProperty("regularFare");
  });

  it("GET /api/v1/trips/search returns empty for unknown destinations", async () => {
    const res = await request(app)
      .get("/api/v1/trips/search?from=UnknownPlace123&to=AnotherPlace456");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("GET /api/v1/trips/search Carmen to Cogon calculates segment fare, not full route length", async () => {
    const res = await request(app)
      .get("/api/v1/trips/search?from=Carmen%20Market&to=Cogon%20Market&sort=time");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    const topTrip = res.body[0];
    // Segment ride distance must not equal full 11.9km route length
    expect(topTrip.totalKm).toBeLessThan(11.9);
    expect(topTrip.regularFare).toBeLessThan(27.25);
    expect(topTrip.regularFare).toBeGreaterThanOrEqual(13.00);
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

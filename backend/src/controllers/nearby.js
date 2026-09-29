const db = require("../config/db");
const { haversineMeters } = require("../utils");

async function nearby(req, res, next) {
  try {
    let { lat, lng, kind = "route", radius = 2000 } = req.query;
    radius = parseInt(radius);

    if (!lat || !lng) {
      // Try fallback to manual start place
      if (req.deviceId) {
        const [[dev]] = await db.execute(
          "SELECT manual_start_place_id FROM devices WHERE id=?", [req.deviceId]);
        if (dev?.manual_start_place_id) {
          const [[place]] = await db.execute("SELECT lat, lng FROM places WHERE id=?", [dev.manual_start_place_id]);
          if (place) { lat = place.lat; lng = place.lng; }
        }
      }
      if (!lat || !lng) {
        return res.status(400).json({ error: { code: "BAD_REQUEST", message: "lat and lng are required" } });
      }
    }

    const userLat = parseFloat(lat);
    const userLng = parseFloat(lng);
    const results = [];

    if (kind === "route") {
      const [routes] = await db.execute("SELECT * FROM routes ORDER BY code");
      for (const r of routes) {
        const [pts] = await db.execute(
          "SELECT lat, lng FROM route_path_points WHERE route_id=?", [r.id]);
        let minDist = Infinity;
        for (const pt of pts) {
          const d = haversineMeters(userLat, userLng, pt.lat, pt.lng);
          if (d < minDist) minDist = d;
        }
        if (minDist <= radius) results.push({ ...r, distance_m: Math.round(minDist) });
      }
    } else if (kind === "terminal") {
      const [items] = await db.execute("SELECT * FROM terminals");
      for (const t of items) {
        const d = haversineMeters(userLat, userLng, t.lat, t.lng);
        if (d <= radius) results.push({ ...t, kind: "terminal", distance_m: Math.round(d) });
      }
    } else if (kind === "loading" || kind === "unloading") {
      const [items] = await db.execute(
        "SELECT lp.*, r.code, r.color FROM loading_points lp JOIN routes r ON r.id=lp.route_id WHERE lp.point_type=?",
        [kind === "loading" ? "loading" : "unloading"]);
      for (const t of items) {
        const d = haversineMeters(userLat, userLng, t.lat, t.lng);
        if (d <= radius) results.push({ ...t, distance_m: Math.round(d) });
      }
    }

    results.sort((a, b) => a.distance_m - b.distance_m);
    res.json({
      results: results.slice(0, 20),
      userLat, userLng,
      notice: "Distances are straight-line estimates."
    });
  } catch (err) { next(err); }
}

module.exports = { nearby };

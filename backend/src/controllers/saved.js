const db = require("../config/db");
const { uuidv4, md5 } = require("../utils");

async function listTrips(req, res, next) {
  try {
    const [rows] = await db.execute(
      "SELECT * FROM saved_trips WHERE device_id=? ORDER BY created_at DESC", [req.deviceId]);
    res.json(rows);
  } catch (err) { next(err); }
}

async function saveTrip(req, res, next) {
  try {
    const { fromLabel, toLabel, routeIds, tripOptionId } = req.body;
    if (!fromLabel || !toLabel || !routeIds) {
      return res.status(400).json({ error: { code: "BAD_REQUEST", message: "fromLabel, toLabel, routeIds required" } });
    }
    const hash = md5(JSON.stringify(routeIds));
    const id = uuidv4();
    try {
      await db.execute(
        "INSERT INTO saved_trips (id, device_id, from_label, to_label, route_ids, route_ids_hash, trip_option_id) VALUES (?,?,?,?,?,?,?)",
        [id, req.deviceId, fromLabel, toLabel, JSON.stringify(routeIds), hash, tripOptionId || null]);
    } catch (e) {
      if (e.code === "ER_DUP_ENTRY") {
        return res.status(409).json({ error: { code: "CONFLICT", message: "Trip already saved" } });
      }
      throw e;
    }
    res.status(201).json({ id });
  } catch (err) { next(err); }
}

async function deleteTrip(req, res, next) {
  try {
    await db.execute("DELETE FROM saved_trips WHERE id=? AND device_id=?", [req.params.id, req.deviceId]);
    res.json({ ok: true });
  } catch (err) { next(err); }
}

async function listDests(req, res, next) {
  try {
    const [rows] = await db.execute(
      "SELECT * FROM saved_destinations WHERE device_id=? ORDER BY created_at DESC", [req.deviceId]);
    res.json(rows);
  } catch (err) { next(err); }
}

async function saveDest(req, res, next) {
  try {
    const { label, placeName, icon = "pin" } = req.body;
    const id = uuidv4();
    await db.execute(
      "INSERT INTO saved_destinations (id, device_id, label, place_name, icon) VALUES (?,?,?,?,?)",
      [id, req.deviceId, label, placeName, icon]);
    res.status(201).json({ id });
  } catch (err) { next(err); }
}

async function deleteDest(req, res, next) {
  try {
    await db.execute("DELETE FROM saved_destinations WHERE id=? AND device_id=?", [req.params.id, req.deviceId]);
    res.json({ ok: true });
  } catch (err) { next(err); }
}

module.exports = { listTrips, saveTrip, deleteTrip, listDests, saveDest, deleteDest };

const db = require("../config/db");
const { uuidv4 } = require("../utils");

async function list(req, res, next) {
  try {
    const [rows] = await db.execute(
      "SELECT * FROM searches WHERE device_id=? ORDER BY created_at DESC LIMIT 50",
      [req.deviceId]);
    res.json(rows);
  } catch (err) { next(err); }
}

async function add(req, res, next) {
  try {
    const { from: currentLocation, to: destination, routeId = null } = req.body;
    if (!currentLocation || !destination) {
      return res.status(400).json({ error: { code: "BAD_REQUEST", message: "from and to are required" } });
    }
    const id = uuidv4();
    await db.execute(
      "INSERT INTO searches (id, device_id, current_location, destination, route_id, created_at) VALUES (?,?,?,?,?,NOW())",
      [id, req.deviceId, currentLocation, destination, routeId]);
    res.status(201).json({ id });
  } catch (err) { next(err); }
}

async function deleteOne(req, res, next) {
  try {
    await db.execute("DELETE FROM searches WHERE id=? AND device_id=?", [req.params.id, req.deviceId]);
    res.json({ ok: true });
  } catch (err) { next(err); }
}

async function clearAll(req, res, next) {
  try {
    await db.execute("DELETE FROM searches WHERE device_id=?", [req.deviceId]);
    res.json({ ok: true });
  } catch (err) { next(err); }
}

module.exports = { list, add, deleteOne, clearAll };

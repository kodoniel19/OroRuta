const db = require("../config/db");
const { uuidv4 } = require("../utils");

async function list(req, res, next) {
  try {
    const [rows] = await db.execute(
      `SELECT s.* FROM searches s
       INNER JOIN (
         SELECT MAX(id) as max_id, MAX(created_at) as max_created_at, LOWER(TRIM(current_location)) as cl, LOWER(TRIM(destination)) as dst
         FROM searches WHERE device_id=?
         GROUP BY LOWER(TRIM(current_location)), LOWER(TRIM(destination))
       ) latest ON latest.max_id = s.id
       WHERE s.device_id=?
       ORDER BY s.created_at DESC LIMIT 20`,
      [req.deviceId, req.deviceId]);
    res.json(rows);
  } catch (err) { next(err); }
}

async function add(req, res, next) {
  try {
    const { from: currentLocation, to: destination, routeId = null } = req.body;
    if (!currentLocation || !destination) {
      return res.status(400).json({ error: { code: "BAD_REQUEST", message: "from and to are required" } });
    }
    const normFrom = currentLocation.trim();
    const normTo = destination.trim();

    // Check if exact search already exists for this device
    const [existing] = await db.execute(
      "SELECT id FROM searches WHERE device_id=? AND LOWER(TRIM(current_location))=LOWER(?) AND LOWER(TRIM(destination))=LOWER(?) ORDER BY created_at DESC LIMIT 1",
      [req.deviceId, normFrom, normTo]
    );

    if (existing && existing.length > 0) {
      const existingId = existing[0].id;
      await db.execute(
        "UPDATE searches SET created_at=NOW(), route_id=? WHERE id=?",
        [routeId, existingId]
      );
      // Clean up any extra duplicates for this pair
      await db.execute(
        "DELETE FROM searches WHERE device_id=? AND LOWER(TRIM(current_location))=LOWER(?) AND LOWER(TRIM(destination))=LOWER(?) AND id!=?",
        [req.deviceId, normFrom, normTo, existingId]
      );
      return res.status(200).json({ id: existingId });
    }

    const id = uuidv4();
    await db.execute(
      "INSERT INTO searches (id, device_id, current_location, destination, route_id, created_at) VALUES (?,?,?,?,?,NOW())",
      [id, req.deviceId, normFrom, normTo, routeId]);

    // Keep history capped to top 20
    await db.execute(
      `DELETE FROM searches WHERE device_id=? AND id NOT IN (
         SELECT id FROM (
           SELECT id FROM searches WHERE device_id=? ORDER BY created_at DESC LIMIT 20
         ) t
       )`,
      [req.deviceId, req.deviceId]
    ).catch(() => {});

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

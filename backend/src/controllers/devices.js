const db = require("../config/db");
const { uuidv4 } = require("../utils");

async function register(req, res, next) {
  try {
    const deviceId = req.deviceId;
    const now = new Date();
    await db.execute(
      `INSERT INTO devices (id, created_at, last_seen_at) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE last_seen_at = VALUES(last_seen_at)`,
      [deviceId, now, now]
    );
    // Ensure prefs row exists
    await db.execute(
      `INSERT IGNORE INTO device_notification_prefs (device_id) VALUES (?)`,
      [deviceId]
    );
    res.status(200).json({ deviceId });
  } catch (err) { next(err); }
}

async function getPreferences(req, res, next) {
  try {
    const [rows] = await db.execute(
      `SELECT d.language, d.precise_location, d.manual_start_place_id,
              p.route_changes, p.closures, p.terminals, p.offline_updates
       FROM devices d
       LEFT JOIN device_notification_prefs p ON p.device_id = d.id
       WHERE d.id = ?`,
      [req.deviceId]
    );
    if (!rows.length) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Device not found" } });
    res.json(rows[0]);
  } catch (err) { next(err); }
}

async function updatePreferences(req, res, next) {
  try {
    const { language, precise_location, manual_start_place_id,
            route_changes, closures, terminals, offline_updates } = req.body;
    if (language !== undefined || precise_location !== undefined || manual_start_place_id !== undefined) {
      const fields = [];
      const vals = [];
      if (language !== undefined) { fields.push("language = ?"); vals.push(language); }
      if (precise_location !== undefined) { fields.push("precise_location = ?"); vals.push(precise_location ? 1 : 0); }
      if (manual_start_place_id !== undefined) { fields.push("manual_start_place_id = ?"); vals.push(manual_start_place_id); }
      if (fields.length) {
        vals.push(req.deviceId);
        await db.execute(`UPDATE devices SET ${fields.join(", ")} WHERE id = ?`, vals);
      }
    }
    if (route_changes !== undefined || closures !== undefined || terminals !== undefined || offline_updates !== undefined) {
      const fields = [];
      const vals = [];
      if (route_changes !== undefined) { fields.push("route_changes = ?"); vals.push(route_changes ? 1 : 0); }
      if (closures !== undefined) { fields.push("closures = ?"); vals.push(closures ? 1 : 0); }
      if (terminals !== undefined) { fields.push("terminals = ?"); vals.push(terminals ? 1 : 0); }
      if (offline_updates !== undefined) { fields.push("offline_updates = ?"); vals.push(offline_updates ? 1 : 0); }
      if (fields.length) {
        vals.push(req.deviceId);
        await db.execute(
          `INSERT INTO device_notification_prefs (device_id) VALUES (?) ON DUPLICATE KEY UPDATE ${fields.join(", ")}`,
          [req.deviceId, ...vals]
        );
      }
    }
    res.json({ ok: true });
  } catch (err) { next(err); }
}

module.exports = { register, getPreferences, updatePreferences };

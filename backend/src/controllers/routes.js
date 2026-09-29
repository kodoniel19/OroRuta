const db = require("../config/db");

async function list(req, res, next) {
  try {
    const { q = "", type = "", hasUpdates = "" } = req.query;
    let sql = "SELECT * FROM routes WHERE 1=1";
    const params = [];
    if (q) {
      sql += ` AND (code LIKE ? OR name LIKE ? OR origin LIKE ? OR destination LIKE ? OR description LIKE ?)`;
      const like = `%${q}%`;
      params.push(like, like, like, like, like);
    }
    if (type) { sql += " AND jeepney_type = ?"; params.push(type); }
    if (hasUpdates === "true") { sql += " AND status != 'Active'"; }
    sql += " ORDER BY code";
    const [rows] = await db.execute(sql, params);
    // Add stop counts
    for (const r of rows) {
      const [[tCount]] = await db.execute(
        "SELECT COUNT(*) cnt FROM route_terminals WHERE route_id = ?", [r.id]);
      const [[lCount]] = await db.execute(
        "SELECT COUNT(*) cnt FROM loading_points WHERE route_id = ?", [r.id]);
      r.terminal_count = tCount.cnt;
      r.stop_count = lCount.cnt;
    }
    res.json(rows);
  } catch (err) { next(err); }
}

async function getById(req, res, next) {
  try {
    const [rows] = await db.execute("SELECT * FROM routes WHERE id = ?", [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Route not found" } });
    const route = rows[0];
    // Terminals
    const [terminals] = await db.execute(
      `SELECT t.* FROM terminals t
       JOIN route_terminals rt ON rt.terminal_id = t.id
       WHERE rt.route_id = ? ORDER BY rt.seq`, [route.id]);
    // Loading/unloading points
    const [stops] = await db.execute(
      "SELECT * FROM loading_points WHERE route_id = ? ORDER BY name", [route.id]);
    // Transfer points
    const [transfers] = await db.execute(
      "SELECT * FROM transfer_points WHERE route_id = ? ORDER BY name", [route.id]);
    // Roads
    const [roads] = await db.execute(
      `SELECT mr.* FROM major_roads mr
       JOIN route_major_roads rmr ON rmr.road_id = mr.id
       WHERE rmr.route_id = ? ORDER BY rmr.seq`, [route.id]);
    // Landmarks
    const [landmarks] = await db.execute(
      `SELECT l.* FROM landmarks l
       JOIN route_landmarks rl ON rl.landmark_id = l.id
       WHERE rl.route_id = ? ORDER BY rl.seq`, [route.id]);
    // Path
    const [path] = await db.execute(
      "SELECT * FROM route_path_points WHERE route_id = ? ORDER BY seq", [route.id]);
    // Related announcements
    const [announcements] = await db.execute(
      `SELECT a.* FROM announcements a
       JOIN announcement_routes ar ON ar.announcement_id = a.id
       WHERE ar.route_id = ? AND a.status != 'Expired'
       ORDER BY a.date DESC`, [route.id]);
    res.json({ ...route, terminals, stops, transfers, roads, landmarks, path, announcements });
  } catch (err) { next(err); }
}

async function getOfflineBundle(req, res, next) {
  try {
    const [rows] = await db.execute("SELECT * FROM routes WHERE id = ?", [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Route not found" } });
    const route = rows[0];
    const [terminals] = await db.execute(
      `SELECT t.* FROM terminals t JOIN route_terminals rt ON rt.terminal_id=t.id WHERE rt.route_id=?`, [route.id]);
    const [stops] = await db.execute("SELECT * FROM loading_points WHERE route_id=?", [route.id]);
    const [transfers] = await db.execute("SELECT * FROM transfer_points WHERE route_id=?", [route.id]);
    const [path] = await db.execute(
      "SELECT * FROM route_path_points WHERE route_id=? ORDER BY seq", [route.id]);
    res.json({ route, terminals, stops, transfers, path, bundledAt: new Date().toISOString() });
  } catch (err) { next(err); }
}

module.exports = { list, getById, getOfflineBundle };

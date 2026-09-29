const db = require("../config/db");

async function list(req, res, next) {
  try {
    const { status = "" } = req.query;
    let sql = "SELECT * FROM announcements WHERE 1=1";
    const params = [];
    if (status) { sql += " AND status=?"; params.push(status); }
    sql += " ORDER BY date DESC";
    const [rows] = await db.execute(sql, params);
    for (const a of rows) {
      const [routes] = await db.execute(
        `SELECT r.id, r.code, r.name, r.color FROM routes r
         JOIN announcement_routes ar ON ar.route_id=r.id WHERE ar.announcement_id=?`, [a.id]);
      a.routes = routes;
    }
    res.json(rows);
  } catch (err) { next(err); }
}

async function getById(req, res, next) {
  try {
    const [[ann]] = await db.execute("SELECT * FROM announcements WHERE id=?", [req.params.id]);
    if (!ann) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Announcement not found" } });
    const [details] = await db.execute(
      "SELECT * FROM announcement_details WHERE announcement_id=? ORDER BY seq", [ann.id]);
    const [routes] = await db.execute(
      `SELECT r.id, r.code, r.name, r.color FROM routes r
       JOIN announcement_routes ar ON ar.route_id=r.id WHERE ar.announcement_id=?`, [ann.id]);
    res.json({ ...ann, details, routes });
  } catch (err) { next(err); }
}

module.exports = { list, getById };

const db = require("../config/db");

async function list(req, res, next) {
  try {
    const { status = "" } = req.query;
    let sql = "SELECT * FROM announcements WHERE 1=1";
    const params = [];
    if (status) {
      if (status.toLowerCase() === "active") {
        sql += " AND (status = 'Active' OR status = 'Published')";
      } else {
        sql += " AND status=?";
        params.push(status);
      }
    } else {
      sql += " AND status != 'Inactive' AND status != 'Draft'";
    }
    sql += " ORDER BY date DESC";
    const [rows] = await db.execute(sql, params);
    for (const a of rows) {
      if (a.date) {
        if (typeof a.date === 'string') {
          a.date = a.date.split('T')[0];
        } else if (a.date instanceof Date) {
          a.date = a.date.toISOString().split('T')[0];
        }
      }
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
    if (ann.date) {
      if (typeof ann.date === 'string') {
        ann.date = ann.date.split('T')[0];
      } else if (ann.date instanceof Date) {
        ann.date = ann.date.toISOString().split('T')[0];
      }
    }
    const [details] = await db.execute(
      "SELECT * FROM announcement_details WHERE announcement_id=? ORDER BY seq", [ann.id]);
    const [routes] = await db.execute(
      `SELECT r.id, r.code, r.name, r.color FROM routes r
       JOIN announcement_routes ar ON ar.route_id=r.id WHERE ar.announcement_id=?`, [ann.id]);
    res.json({ ...ann, details, routes });
  } catch (err) { next(err); }
}

module.exports = { list, getById };

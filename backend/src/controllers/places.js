const db = require("../config/db");

async function list(req, res, next) {
  try {
    const { q = "", kind = "", filter = "all" } = req.query;
    let sql = "SELECT * FROM places WHERE 1=1";
    const params = [];
    if (q) { sql += " AND name LIKE ?"; params.push(`%${q}%`); }
    if (kind) { sql += " AND kind = ?"; params.push(kind); }
    if (filter === "landmark") { sql += " AND kind = 'landmark'"; }
    else if (filter === "terminal") { sql += " AND kind = 'terminal'"; }
    sql += " ORDER BY name LIMIT 50";
    const [rows] = await db.execute(sql, params);
    res.json(rows);
  } catch (err) { next(err); }
}

async function get(req, res, next) {
  try {
    const [rows] = await db.execute("SELECT * FROM places WHERE id = ?", [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Place not found" } });
    res.json(rows[0]);
  } catch (err) { next(err); }
}

module.exports = { list, get };

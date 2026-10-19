const db = require("../config/db");

// Removed hallucinated hardcoded places as per user instruction.
// The system must rely on verified coordinates.
const CDO_BASE_PLACES = [];

async function list(req, res, next) {
  try {
    const { q = "", kind = "", filter = "all" } = req.query;
    let sql = "SELECT * FROM places WHERE 1=1";
    const params = [];
    if (q) {
      sql += " AND (name LIKE ? OR area LIKE ?)";
      params.push(`%${q}%`, `%${q}%`);
    }
    if (kind) {
      sql += " AND kind = ?";
      params.push(kind);
    }
    if (filter === "landmark" || filter === "landmarks") {
      sql += " AND kind IN ('landmark', 'school', 'mall', 'government', 'hospital')";
    } else if (filter === "terminal" || filter === "terminals") {
      sql += " AND kind = 'terminal'";
    }
    sql += " ORDER BY name LIMIT 50";

    let rows = [];
    try {
      const [dbRows] = await db.execute(sql, params);
      rows = dbRows;
    } catch (_) {
      rows = [];
    }

    // Deduplicate by normalized name and ID
    const seenIds = new Set();
    const seenNames = new Set();
    const uniqueRows = [];

    for (const r of rows) {
      const normName = (r.name || "").toLowerCase().trim();
      if (!seenIds.has(r.id) && !seenNames.has(normName)) {
        seenIds.add(r.id);
        seenNames.add(normName);
        uniqueRows.push({
          id: r.id,
          name: r.name,
          area: r.area || "Cagayan de Oro",
          kind: r.kind || "landmark",
          map_x: r.map_x || 0,
          map_y: r.map_y || 0,
          lat: parseFloat(r.lat),
          lng: parseFloat(r.lng)
        });
      }
    }

    res.json(uniqueRows);
  } catch (err) { next(err); }
}

async function get(req, res, next) {
  try {
    const { id } = req.params;
    let place = null;
    try {
      const [rows] = await db.execute("SELECT * FROM places WHERE id = ?", [id]);
      if (rows.length) place = rows[0];
    } catch (_) {}

    if (!place) {
      try {
        const [locs] = await db.execute(
          "SELECT id, name, barangay, city, latitude, longitude FROM locations WHERE id = ? OR LOWER(name) = ?",
          [id, id.toLowerCase()]
        );
        if (locs.length) {
          const loc = locs[0];
          place = {
            id: loc.id,
            name: loc.name,
            area: loc.barangay || loc.city || "Cagayan de Oro",
            kind: "landmark",
            map_x: 0,
            map_y: 0,
            lat: parseFloat(loc.latitude || 0),
            lng: parseFloat(loc.longitude || 0)
          };
        }
      } catch (_) {}
    }

    if (!place) {
      place = CDO_BASE_PLACES.find(p => p.id === id || p.name.toLowerCase() === id.toLowerCase());
    }

    if (!place) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Place not found" } });
    res.json(place);
  } catch (err) { next(err); }
}

module.exports = { list, get, CDO_BASE_PLACES };

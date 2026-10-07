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
    if (kind) { sql += " AND kind = ?"; params.push(kind); }
    if (filter === "landmark" || filter === "landmarks") { sql += " AND (kind = 'landmark' OR kind = 'school' OR kind = 'government' OR kind = 'hospital')"; }
    else if (filter === "terminal" || filter === "terminals") { sql += " AND (kind = 'terminal' OR kind = 'market')"; }
    sql += " ORDER BY name LIMIT 50";
    
    let rows = [];
    try {
      const [dbRows] = await db.execute(sql, params);
      rows = dbRows;
    } catch (_) {
      // In case DB is not yet migrated, fallback to base places catalog
      rows = [];
    }

    // Ensure all critical base places match query if DB hasn't inserted them yet
    const queryLower = q.trim().toLowerCase();
    const catalogMatches = CDO_BASE_PLACES.filter((p) => {
      const matchesQ = !queryLower || p.name.toLowerCase().includes(queryLower) || (p.area && p.area.toLowerCase().includes(queryLower));
      const matchesKind = !kind || p.kind === kind;
      const matchesFilter = filter === "all" ||
        ((filter === "landmark" || filter === "landmarks") && ["landmark", "school", "government", "hospital"].includes(p.kind)) ||
        ((filter === "terminal" || filter === "terminals") && ["terminal", "market"].includes(p.kind));
      return matchesQ && matchesKind && matchesFilter;
    });

    // Merge and deduplicate by name or id
    const seenNames = new Set(rows.map(r => r.name.toLowerCase()));
    
    // Include all strictly verified locations from locations table
    try {
      let locSql = "SELECT id, name, barangay, city, latitude, longitude FROM locations WHERE verificationStatus = 'VERIFIED' AND latitude IS NOT NULL AND longitude IS NOT NULL";
      const locParams = [];
      if (q) {
        locSql += " AND (name LIKE ? OR barangay LIKE ? OR city LIKE ?)";
        locParams.push(`%${q}%`, `%${q}%`, `%${q}%`);
      }
      const [locRows] = await db.execute(locSql, locParams);
      for (const loc of locRows) {
        if (!seenNames.has(loc.name.toLowerCase())) {
          rows.push({
            id: loc.id,
            name: loc.name,
            area: loc.barangay || loc.city || "Cagayan de Oro",
            kind: "landmark",
            map_x: 0,
            map_y: 0,
            lat: parseFloat(loc.latitude),
            lng: parseFloat(loc.longitude)
          });
          seenNames.add(loc.name.toLowerCase());
        }
      }
    } catch (_) {}

    for (const cp of catalogMatches) {
      if (!seenNames.has(cp.name.toLowerCase())) {
        rows.push(cp);
        seenNames.add(cp.name.toLowerCase());
      }
    }

    res.json(rows);
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

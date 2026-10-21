const db = require("../config/db");

// Removed hallucinated hardcoded places as per user instruction.
// The system must rely on verified coordinates.
const CDO_BASE_PLACES = [];

const KEY_CDO_LANDMARKS = [
  { id: 'pl-limketkai', name: 'Limketkai Center', area: 'Lapasan', kind: 'mall', lat: 8.4842, lng: 124.6568, aliases: ['limketkai', 'limkdtkai', 'ketkai', 'limketkai mall', 'limketkai center'] },
  { id: 'pl-sm-downtown', name: 'SM CDO Downtown Premier', area: 'Lapasan', kind: 'mall', lat: 8.4855, lng: 124.6535, aliases: ['sm downtown', 'sm cdo downtown', 'sm premier', 'sm downtown premier', 'smdt', 'sm premier cdo', 'sm cdo'] },
  { id: 'pl-centrio', name: 'Centrio Mall', area: 'Poblacion', kind: 'mall', lat: 8.4877, lng: 124.6517, aliases: ['centrio', 'centrio mall', 'ayala centrio', 'ayala mall'] },
  { id: 'pl-cogon', name: 'Cogon Market', area: 'Cogon', kind: 'market', lat: 8.4735, lng: 124.6497, aliases: ['cogon', 'cogon market', 'cogon public market'] },
  { id: 'pl-cathedral', name: 'St. Augustine Metropolitan Cathedral', area: 'Poblacion', kind: 'landmark', lat: 8.4777, lng: 124.6433, aliases: ['cathedral', 'st augustine', 'st. augustine cathedral', 'san agustin', 'san agustin church'] },
  { id: 'pl-miami-inn', name: 'Miami Inn Carmen', area: 'Carmen', kind: 'landmark', lat: 8.477285, lng: 124.637633, aliases: ['miami inn', 'miami inn carmen', 'vamenta'] },
  { id: 'pl-madonna-hospital', name: 'Madonna and Child Hospital', area: 'Carmen', kind: 'hospital', lat: 8.4772152, lng: 124.6352344, aliases: ['madonna', 'madonna hospital', 'madonna and child', 'madonna & child', 'madonna & child hospital'] }
];

function levenshteinDistance(a, b) {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

async function list(req, res, next) {
  try {
    const { q = "", kind = "", filter = "all" } = req.query;
    const cleanQ = q.trim().toLowerCase();

    let rows = [];

    // Check alias / fuzzy match against key landmarks first
    if (cleanQ) {
      for (const lm of KEY_CDO_LANDMARKS) {
        const matchesAlias = lm.aliases.some(alias => {
          if (alias.includes(cleanQ) || cleanQ.includes(alias)) return true;
          if (cleanQ.length >= 4 && alias.length >= 4) {
            return levenshteinDistance(cleanQ, alias) <= 2;
          }
          return false;
        });
        if (matchesAlias) {
          if (filter === "terminals" && lm.kind !== "terminal") continue;
          rows.push({
            id: lm.id,
            name: lm.name,
            area: lm.area,
            kind: lm.kind,
            map_x: 0,
            map_y: 0,
            lat: lm.lat,
            lng: lm.lng
          });
        }
      }
    } else if (filter === "all" || filter === "landmarks" || filter === "landmark") {
      // When query is empty and viewing all or landmarks, display the 5 key CDO landmarks first
      for (const lm of KEY_CDO_LANDMARKS) {
        rows.push({
          id: lm.id,
          name: lm.name,
          area: lm.area,
          kind: lm.kind,
          map_x: 0,
          map_y: 0,
          lat: lm.lat,
          lng: lm.lng
        });
      }
    }

    let sql = "SELECT * FROM places WHERE 1=1";
    const params = [];
    if (cleanQ) {
      sql += " AND (name LIKE ? OR area LIKE ?)";
      params.push(`%${cleanQ}%`, `%${cleanQ}%`);
    }
    if (kind) {
      sql += " AND kind = ?";
      params.push(kind);
    }
    if (filter === "landmark" || filter === "landmarks") {
      sql += " AND kind IN ('landmark', 'school', 'mall', 'government', 'hospital', 'market', 'church')";
    } else if (filter === "terminal" || filter === "terminals") {
      sql += " AND kind = 'terminal'";
    }
    sql += " ORDER BY name LIMIT 50";

    try {
      const [dbRows] = await db.execute(sql, params);
      rows = rows.concat(dbRows);
    } catch (_) {}

    // Search or list terminals
    if (filter !== "landmarks" && filter !== "landmark") {
      try {
        let termSql = "SELECT id, name, 'terminal' as kind, 'Cagayan de Oro' as area, lat, lng FROM terminals WHERE lat != 0 AND lng != 0";
        const termParams = [];
        if (cleanQ) {
          termSql += " AND name LIKE ?";
          termParams.push(`%${cleanQ}%`);
        }
        termSql += " ORDER BY name LIMIT 20";
        const [terms] = await db.execute(termSql, termParams);
        rows = rows.concat(terms);
      } catch (_) {}
    }

    // Search landmarks table
    if (filter !== "terminals" && filter !== "terminal") {
      try {
        let lmSql = "SELECT id, name, 'landmark' as kind, 'Cagayan de Oro' as area, lat, lng FROM landmarks WHERE lat != 0 AND lng != 0";
        const lmParams = [];
        if (cleanQ) {
          lmSql += " AND name LIKE ?";
          lmParams.push(`%${cleanQ}%`);
        }
        lmSql += " ORDER BY name LIMIT 20";
        const [lms] = await db.execute(lmSql, lmParams);
        rows = rows.concat(lms);

        if (cleanQ) {
          const [lps] = await db.execute(
            "SELECT id, name, 'loading_point' as kind, 'Cagayan de Oro' as area, lat, lng FROM loading_points WHERE (name LIKE ? OR note LIKE ?) AND lat != 0 AND lng != 0 LIMIT 15",
            [`%${cleanQ}%`, `%${cleanQ}%`]
          );
          rows = rows.concat(lps);
        }
      } catch (_) {}
    }

    if (cleanQ && cleanQ.length >= 2 && filter !== "terminals") {
      try {
        const nomRes = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cleanQ)}&viewbox=124.40,8.65,124.85,8.30&countrycodes=ph&format=json&addressdetails=1&limit=6`,
          { headers: { 'User-Agent': 'OroRutaApp/1.0' }, signal: AbortSignal.timeout(2500) }
        );
        if (nomRes.ok) {
          const items = await nomRes.json();
          for (const item of items) {
            const lat = parseFloat(item.lat);
            const lng = parseFloat(item.lon);
            if (lat >= 8.30 && lat <= 8.65 && lng >= 124.45 && lng <= 124.85) {
              const name = item.name || (item.display_name ? item.display_name.split(',')[0].trim() : cleanQ);
              const addr = item.address || {};
              const area = addr.suburb || addr.neighbourhood || addr.quarter || addr.city || "Cagayan de Oro";
              const rawType = item.type || "";
              let kind = "landmark";
              if (rawType.includes("hospital") || name.toLowerCase().includes("hospital")) kind = "hospital";
              else if (rawType.includes("mall") || name.toLowerCase().includes("mall") || name.toLowerCase().includes("sm ")) kind = "mall";
              else if (rawType.includes("school") || rawType.includes("university") || name.toLowerCase().includes("university")) kind = "school";
              else if (rawType.includes("market") || name.toLowerCase().includes("market")) kind = "market";
              else if (rawType.includes("bus") || rawType.includes("terminal")) kind = "terminal";
              else if (rawType.includes("highway") || rawType.includes("residential") || name.toLowerCase().includes("street") || name.toLowerCase().includes("avenue")) kind = "street";

              rows.push({
                id: `geo_${lat}_${lng}`,
                name,
                area,
                kind,
                map_x: lng,
                map_y: lat,
                lat,
                lng
              });
            }
          }
        }
      } catch (_) {}
    }

    function canonicalTerminalKey(name) {
      const lower = (name || "").toLowerCase();
      if (lower.includes("agora terminal") || lower.includes("agora integrated")) return "agora terminal";
      if (lower.includes("bulua terminal") || lower.includes("bulua integrated")) return "bulua terminal";
      if (lower.includes("westbound terminal")) return "westbound terminal";
      if (lower.includes("carmen market") || lower.includes("carmen terminal")) return "carmen terminal";
      if (lower.includes("bugo terminal")) return "bugo terminal";
      return lower;
    }

    // Deduplicate by normalized name, canonical terminal, and ID while preserving ranking
    const seenIds = new Set();
    const seenNames = new Set();
    const seenCanonicals = new Set();
    const uniqueRows = [];

    for (const r of rows) {
      if (!r.lat || !r.lng || isNaN(parseFloat(r.lat)) || isNaN(parseFloat(r.lng))) continue;
      const normName = (r.name || "").toLowerCase().trim();
      const idStr = String(r.id);
      const canonKey = canonicalTerminalKey(normName);

      if (r.kind === 'terminal' || canonKey.includes('terminal')) {
        if (seenCanonicals.has(canonKey)) continue;
        seenCanonicals.add(canonKey);
      }

      if (!seenIds.has(idStr) && !seenNames.has(normName)) {
        seenIds.add(idStr);
        seenNames.add(normName);
        uniqueRows.push({
          id: idStr,
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

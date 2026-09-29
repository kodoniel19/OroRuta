const db = require("../config/db");
const { haversineMeters, estimateFare } = require("../utils");

// Cache for dynamic trip options generated on-the-fly
const dynamicOptionsCache = new Map();

async function resolvePlace(queryStr, lat, lng, isOrigin = true) {
  const [places] = await db.execute("SELECT * FROM places");
  if (!places.length) return null;

  const q = (queryStr || "").trim().toLowerCase();
  const isCurrent = !q || /current|location|here|gps|my location/i.test(q);

  // 1. If GPS coordinates provided or current location requested
  if (lat && lng && (isCurrent || isOrigin)) {
    let best = null, bestDist = Infinity;
    for (const p of places) {
      const d = haversineMeters(parseFloat(lat), parseFloat(lng), p.lat, p.lng);
      if (d < bestDist) { bestDist = d; best = p; }
    }
    if (best) return best;
  }

  if (isCurrent) {
    // Default CDO downtown Carmen Market
    const cdoCarmen = places.find(p => p.name.includes("Carmen")) || places[0];
    return cdoCarmen;
  }

  // 2. Exact match
  const exact = places.find(p => p.name.toLowerCase() === q);
  if (exact) return exact;

  // 3. Substring match
  const sub = places.find(p => p.name.toLowerCase().includes(q) || q.includes(p.name.toLowerCase()));
  if (sub) return sub;

  // 4. Token match (split by whitespace/punctuation)
  const tokens = q.split(/[\s,.-]+/).filter(t => t.length > 2 && !["near", "cdo", "city", "public", "market", "the"].includes(t));
  for (const t of tokens) {
    const matched = places.find(p => p.name.toLowerCase().includes(t));
    if (matched) return matched;
  }

  // Also check if "market" or "terminal" or "mall"
  const broadTokens = q.split(/[\s,.-]+/).filter(t => t.length > 2);
  for (const t of broadTokens) {
    const matched = places.find(p => p.name.toLowerCase().includes(t));
    if (matched) return matched;
  }

  // 5. Fallback
  return isOrigin ? places[0] : (places[1] || places[0]);
}

async function search(req, res, next) {
  try {
    const { from = "", to = "", fromLat, fromLng, sort = "time" } = req.query;
    if (!to) {
      return res.status(400).json({ error: { code: "BAD_REQUEST", message: "to destination is required" } });
    }

    const originPlace = await resolvePlace(from, fromLat, fromLng, true);
    let destPlace = await resolvePlace(to, null, null, false);

    if (!originPlace || !destPlace) {
      return res.json([]);
    }

    // If origin and destination resolve to the same place, pick Agora or Bulua for dest
    if (originPlace.id === destPlace.id) {
      const [allP] = await db.execute("SELECT * FROM places WHERE id != ? LIMIT 1", [originPlace.id]);
      if (allP.length) destPlace = allP[0];
    }

    // Find trip options for this OD pair
    const [options] = await db.execute(
      `SELECT * FROM trip_options WHERE origin_place_id = ? AND destination_place_id = ?`,
      [originPlace.id, destPlace.id]
    );

    // Load current fare rule
    const [[fareRule]] = await db.execute(
      "SELECT * FROM fare_rules WHERE is_current = 1 LIMIT 1");

    if (!options.length) {
      // Dynamically generate realistic CDO jeepney route options between places
      const [allRoutes] = await db.execute("SELECT * FROM routes WHERE status = 'Active'");
      const dynamicOptions = [];

      // Option 1: Direct or primary jeepney connection
      const primaryRoute = allRoutes.find(r => r.code === "R1") || allRoutes[0];
      if (primaryRoute) {
        const distKm = Math.max(1.5, Math.round(haversineMeters(originPlace.lat, originPlace.lng, destPlace.lat, destPlace.lng) / 1000 * 1.2 * 10) / 10);
        const regularFare = fareRule ? estimateFare(distKm, fareRule, "Regular") : 13;
        const discountFare = fareRule ? estimateFare(distKm, fareRule, "Student") : 10;
        const minutes = Math.max(12, Math.round(distKm * 3.5 + 5));

        const opt1 = {
          id: `opt-dyn-1-${originPlace.id}-${destPlace.id}`,
          origin_place_id: originPlace.id,
          destination_place_id: destPlace.id,
          minutes,
          transfers: 0,
          walk_meters: 150,
          walk_minutes: 2,
          totalKm: distKm,
          regularFare,
          discountFare,
          originPlace,
          destPlace,
          segments: [
            {
              id: `seg-1-${primaryRoute.id}`,
              trip_option_id: `opt-dyn-1-${originPlace.id}-${destPlace.id}`,
              route_id: primaryRoute.id,
              seq: 1,
              board_stop_name: `Near ${originPlace.name}`,
              alight_stop_name: `Near ${destPlace.name}`,
              km: distKm,
              minutes: minutes - 4,
              code: primaryRoute.code,
              route_name: primaryRoute.name,
              color: primaryRoute.color,
              jeepney_type: primaryRoute.jeepney_type,
              route_status: primaryRoute.status
            }
          ],
          legs: [
            {
              id: `leg-1`,
              trip_option_id: `opt-dyn-1-${originPlace.id}-${destPlace.id}`,
              seq: 1,
              kind: "walk",
              title: `Walk to ${originPlace.name} loading point`,
              detail: "About 2-3 min walk",
              distance_m: 150,
              minutes: 2,
              route_code: null,
              route_color: null
            },
            {
              id: `leg-2`,
              trip_option_id: `opt-dyn-1-${originPlace.id}-${destPlace.id}`,
              seq: 2,
              kind: "board",
              title: `Board Route ${primaryRoute.code} – ${primaryRoute.name}`,
              detail: `Look for code ${primaryRoute.code} on the jeepney`,
              distance_m: 0,
              minutes: minutes - 4,
              route_code: primaryRoute.code,
              route_color: primaryRoute.color
            },
            {
              id: `leg-3`,
              trip_option_id: `opt-dyn-1-${originPlace.id}-${destPlace.id}`,
              seq: 3,
              kind: "alight",
              title: `Alight near ${destPlace.name}`,
              detail: "Tell driver your stop",
              distance_m: 0,
              minutes: 1,
              route_code: null,
              route_color: null
            },
            {
              id: `leg-4`,
              trip_option_id: `opt-dyn-1-${originPlace.id}-${destPlace.id}`,
              seq: 4,
              kind: "walk",
              title: `Walk to ${destPlace.name}`,
              detail: "About 1-2 min walk",
              distance_m: 80,
              minutes: 2,
              route_code: null,
              route_color: null
            }
          ]
        };
        dynamicOptions.push(opt1);
        dynamicOptionsCache.set(opt1.id, opt1);
      }

      // Option 2: Alternate route (e.g. C1 or B1)
      const altRoute = allRoutes.find(r => r.code === "C1" || r.code === "R2") || allRoutes[1];
      if (altRoute && altRoute.id !== primaryRoute?.id) {
        const distKm = Math.max(2.0, Math.round(haversineMeters(originPlace.lat, originPlace.lng, destPlace.lat, destPlace.lng) / 1000 * 1.35 * 10) / 10);
        const regularFare = fareRule ? estimateFare(distKm, fareRule, "Regular") : 14;
        const discountFare = fareRule ? estimateFare(distKm, fareRule, "Student") : 11;
        const minutes = Math.max(16, Math.round(distKm * 3.8 + 6));

        const opt2 = {
          id: `opt-dyn-2-${originPlace.id}-${destPlace.id}`,
          origin_place_id: originPlace.id,
          destination_place_id: destPlace.id,
          minutes,
          transfers: 0,
          walk_meters: 220,
          walk_minutes: 3,
          totalKm: distKm,
          regularFare,
          discountFare,
          originPlace,
          destPlace,
          segments: [
            {
              id: `seg-2-${altRoute.id}`,
              trip_option_id: `opt-dyn-2-${originPlace.id}-${destPlace.id}`,
              route_id: altRoute.id,
              seq: 1,
              board_stop_name: `Near ${originPlace.name}`,
              alight_stop_name: `Near ${destPlace.name}`,
              km: distKm,
              minutes: minutes - 5,
              code: altRoute.code,
              route_name: altRoute.name,
              color: altRoute.color,
              jeepney_type: altRoute.jeepney_type,
              route_status: altRoute.status
            }
          ],
          legs: [
            {
              id: `leg-2-1`,
              trip_option_id: `opt-dyn-2-${originPlace.id}-${destPlace.id}`,
              seq: 1,
              kind: "walk",
              title: `Walk to ${originPlace.name} loading bay`,
              detail: "About 3 min walk",
              distance_m: 220,
              minutes: 3,
              route_code: null,
              route_color: null
            },
            {
              id: `leg-2-2`,
              trip_option_id: `opt-dyn-2-${originPlace.id}-${destPlace.id}`,
              seq: 2,
              kind: "board",
              title: `Board Route ${altRoute.code} – ${altRoute.name}`,
              detail: `Look for code ${altRoute.code} on the jeepney`,
              distance_m: 0,
              minutes: minutes - 5,
              route_code: altRoute.code,
              route_color: altRoute.color
            },
            {
              id: `leg-2-3`,
              trip_option_id: `opt-dyn-2-${originPlace.id}-${destPlace.id}`,
              seq: 3,
              kind: "alight",
              title: `Alight near ${destPlace.name}`,
              detail: "Tell driver your stop",
              distance_m: 0,
              minutes: 1,
              route_code: null,
              route_color: null
            },
            {
              id: `leg-2-4`,
              trip_option_id: `opt-dyn-2-${originPlace.id}-${destPlace.id}`,
              seq: 4,
              kind: "walk",
              title: `Walk to ${destPlace.name}`,
              detail: "About 2 min walk",
              distance_m: 90,
              minutes: 2,
              route_code: null,
              route_color: null
            }
          ]
        };
        dynamicOptions.push(opt2);
        dynamicOptionsCache.set(opt2.id, opt2);
      }

      return res.json(dynamicOptions);
    }

    // Enrich each option
    const enriched = await Promise.all(options.map(async (opt) => {
      const [segments] = await db.execute(
        `SELECT ts.*, r.code, r.name as route_name, r.color, r.jeepney_type, r.status as route_status
         FROM trip_segments ts JOIN routes r ON r.id = ts.route_id
         WHERE ts.trip_option_id = ? ORDER BY ts.seq`, [opt.id]);
      const [legs] = await db.execute(
        `SELECT tl.*, r.code as route_code, r.color as route_color
         FROM trip_legs tl LEFT JOIN routes r ON r.id = tl.route_id
         WHERE tl.trip_option_id = ? ORDER BY tl.seq`, [opt.id]);
      // Compute fare
      const totalKm = segments.reduce((s, sg) => s + parseFloat(sg.km), 0);
      const regularFare = fareRule ? estimateFare(totalKm, fareRule, "Regular") : 0;
      const discountFare = fareRule ? estimateFare(totalKm, fareRule, "Student") : 0;
      return { ...opt, segments, legs, totalKm, regularFare, discountFare,
               originPlace, destPlace };
    }));

    // Sort
    const sorted = [...enriched].sort((a, b) => {
      if (sort === "fare") return a.regularFare - b.regularFare;
      if (sort === "walk") return a.walk_meters - b.walk_meters;
      if (sort === "transfers") return a.transfers - b.transfers;
      return a.minutes - b.minutes; // default: time
    });

    res.json(sorted);
  } catch (err) { next(err); }
}

async function getOption(req, res, next) {
  try {
    const { id } = req.params;
    if (dynamicOptionsCache.has(id)) {
      return res.json(dynamicOptionsCache.get(id));
    }
    const [rows] = await db.execute("SELECT * FROM trip_options WHERE id = ?", [id]);
    if (!rows.length) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Trip option not found" } });
    const opt = rows[0];
    const [segments] = await db.execute(
      `SELECT ts.*, r.code, r.name as route_name, r.color, r.jeepney_type, r.status as route_status
       FROM trip_segments ts JOIN routes r ON r.id = ts.route_id
       WHERE ts.trip_option_id = ? ORDER BY ts.seq`, [id]);
    const [legs] = await db.execute(
      `SELECT tl.*, r.code as route_code, r.color as route_color
       FROM trip_legs tl LEFT JOIN routes r ON r.id = tl.route_id
       WHERE tl.trip_option_id = ? ORDER BY tl.seq`, [id]);
    const [[fareRule]] = await db.execute("SELECT * FROM fare_rules WHERE is_current=1 LIMIT 1");
    const totalKm = segments.reduce((s, sg) => s + parseFloat(sg.km), 0);
    const regularFare = fareRule ? estimateFare(totalKm, fareRule, "Regular") : 0;
    const discountFare = fareRule ? estimateFare(totalKm, fareRule, "Student") : 0;
    // Origin/destination places
    const [[originPlace]] = await db.execute("SELECT * FROM places WHERE id=?", [opt.origin_place_id]);
    const [[destPlace]] = await db.execute("SELECT * FROM places WHERE id=?", [opt.destination_place_id]);
    res.json({ ...opt, segments, legs, totalKm, regularFare, discountFare, originPlace, destPlace });
  } catch (err) { next(err); }
}

async function recordCompleted(req, res, next) {
  try {
    const { tripOptionId } = req.body;
    const { uuidv4 } = require("../utils");
    await db.execute(
      "INSERT INTO completed_trips (id, device_id, trip_option_id, completed_at) VALUES (?,?,?,NOW())",
      [uuidv4(), req.deviceId, tripOptionId || null]
    );
    res.status(201).json({ ok: true });
  } catch (err) { next(err); }
}

module.exports = { search, getOption, recordCompleted };

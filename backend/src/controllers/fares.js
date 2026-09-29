const db = require("../config/db");
const { estimateFare } = require("../utils");

async function getRules(req, res, next) {
  try {
    const [rows] = await db.execute("SELECT * FROM fare_rules ORDER BY effective_from DESC");
    res.json(rows);
  } catch (err) { next(err); }
}

async function estimate(req, res, next) {
  try {
    const { routeId, optionId, category = "Regular" } = req.query;
    const [[rule]] = await db.execute("SELECT * FROM fare_rules WHERE is_current=1 LIMIT 1");
    if (!rule) return res.status(404).json({ error: { code: "NOT_FOUND", message: "No fare rule configured" } });

    let totalKm = 0;
    const breakdown = [];

    if (routeId) {
      const [[route]] = await db.execute("SELECT * FROM routes WHERE id=?", [routeId]);
      if (!route) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Route not found" } });
      totalKm = parseFloat(route.length_km);
      breakdown.push({ routeCode: route.code, routeName: route.name, km: totalKm,
        fare: estimateFare(totalKm, rule, category),
        regularFare: estimateFare(totalKm, rule, "Regular") });
    } else if (optionId) {
      const [segments] = await db.execute(
        `SELECT ts.km, r.code, r.name as route_name
         FROM trip_segments ts JOIN routes r ON r.id=ts.route_id
         WHERE ts.trip_option_id=? ORDER BY ts.seq`, [optionId]);
      for (const seg of segments) {
        const km = parseFloat(seg.km);
        totalKm += km;
        breakdown.push({ routeCode: seg.code, routeName: seg.route_name, km,
          fare: estimateFare(km, rule, category),
          regularFare: estimateFare(km, rule, "Regular") });
      }
    } else {
      return res.status(400).json({ error: { code: "BAD_REQUEST", message: "routeId or optionId required" } });
    }

    res.json({
      category,
      totalKm,
      totalFare: estimateFare(totalKm, rule, category),
      regularFare: estimateFare(totalKm, rule, "Regular"),
      discountRate: rule.discount_rate,
      rule: { minimum: rule.minimum, minimumKm: rule.minimum_km, perKm: rule.per_km },
      breakdown,
      notice: "Fares are estimates and may change based on official fare updates."
    });
  } catch (err) { next(err); }
}

module.exports = { getRules, estimate };

const db = require("../config/db");
const { calculateTraditionalFare, TRADITIONAL_FARE_CONFIG } = require("../services/fareService");

async function getRules(req, res, next) {
  try {
    const [rows] = await db.execute("SELECT * FROM fare_rules ORDER BY effective_from DESC");
    res.json(rows);
  } catch (err) { next(err); }
}

async function estimate(req, res, next) {
  try {
    const { routeId, optionId, category = "Regular" } = req.query;

    let totalKm = 0;
    const breakdown = [];

    if (routeId) {
      const [[route]] = await db.execute("SELECT * FROM routes WHERE id=?", [routeId]);
      if (!route) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Route not found" } });
      totalKm = parseFloat(route.length_km) || 0;
      const fareRes = calculateTraditionalFare(totalKm, category, route.jeepney_type);
      breakdown.push({
        routeCode: route.code,
        routeName: route.name,
        km: totalKm,
        fare: fareRes.selectedCategoryFare,
        regularFare: fareRes.regularFare,
        discountedFare: fareRes.discountedFare,
        isAvailable: fareRes.isAvailable
      });
    } else if (optionId) {
      const [segments] = await db.execute(
        `SELECT ts.km, r.code, r.name as route_name, r.jeepney_type
         FROM trip_segments ts JOIN routes r ON r.id=ts.route_id
         WHERE ts.trip_option_id=? ORDER BY ts.seq`, [optionId]);
      for (const seg of segments) {
        const km = parseFloat(seg.km) || 0;
        totalKm += km;
        const fareRes = calculateTraditionalFare(km, category, seg.jeepney_type);
        breakdown.push({
          routeCode: seg.code,
          routeName: seg.route_name,
          km,
          fare: fareRes.selectedCategoryFare,
          regularFare: fareRes.regularFare,
          discountedFare: fareRes.discountedFare,
          isAvailable: fareRes.isAvailable
        });
      }
    } else {
      return res.status(400).json({ error: { code: "BAD_REQUEST", message: "routeId or optionId required" } });
    }

    const overallFare = calculateTraditionalFare(totalKm, category);

    res.json({
      category: overallFare.category,
      totalKm,
      totalFare: overallFare.selectedCategoryFare,
      regularFare: overallFare.regularFare,
      discountedFare: overallFare.discountedFare,
      discountRate: TRADITIONAL_FARE_CONFIG.discountRate,
      rule: {
        minimum: TRADITIONAL_FARE_CONFIG.regularBaseFare,
        minimumKm: TRADITIONAL_FARE_CONFIG.baseDistanceKm,
        perKm: TRADITIONAL_FARE_CONFIG.regularPerKmRate,
        discountedMinimum: TRADITIONAL_FARE_CONFIG.discountedBaseFare,
        discountedPerKm: TRADITIONAL_FARE_CONFIG.discountedPerKmRate
      },
      breakdown,
      notice: overallFare.disclaimer
    });
  } catch (err) { next(err); }
}

module.exports = { getRules, estimate };

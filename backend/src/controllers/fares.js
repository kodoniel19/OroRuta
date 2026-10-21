const db = require("../config/db");
const { calculateTraditionalFare, calculateTripFare, getDynamicFareConfig, TRADITIONAL_FARE_CONFIG } = require("../services/fareService");

async function getRules(req, res, next) {
  try {
    const [rows] = await db.execute("SELECT * FROM fare_rules ORDER BY effective_from DESC");
    res.json(rows);
  } catch (err) { next(err); }
}

async function estimate(req, res, next) {
  try {
    const { routeId, optionId, category = "Regular" } = req.query;
    const dynamicConfig = await getDynamicFareConfig();

    let totalKm = 0;
    const breakdown = [];
    let overallFare = 0;
    let overallRegular = 0;
    let overallDiscounted = 0;

    if (routeId) {
      const [[route]] = await db.execute("SELECT * FROM routes WHERE id=?", [routeId]);
      if (!route) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Route not found" } });
      totalKm = parseFloat(route.inbound_distance_km) || parseFloat(route.outbound_distance_km) || 4.0;
      const fareRes = calculateTraditionalFare(totalKm, category, route.jeepney_type, dynamicConfig);
      breakdown.push({
        routeCode: route.code,
        routeName: route.name,
        km: totalKm,
        fare: fareRes.selectedCategoryFare,
        regularFare: fareRes.regularFare,
        discountedFare: fareRes.discountedFare,
        isAvailable: fareRes.isAvailable
      });
      overallFare = fareRes.selectedCategoryFare;
      overallRegular = fareRes.regularFare;
      overallDiscounted = fareRes.discountedFare;
    } else if (optionId) {
      let segments = [];
      try {
        const { getDynamicOption } = require("./trips");
        const dynOpt = typeof getDynamicOption === "function" ? getDynamicOption(optionId) : null;
        if (dynOpt && Array.isArray(dynOpt.segments) && dynOpt.segments.length > 0) {
          segments = dynOpt.segments.map(s => ({
            km: parseFloat(s.km) || 0,
            jeepney_type: s.jeepney_type || s.jeepneyType || "Traditional",
            code: s.code,
            route_name: s.route_name || s.routeName
          }));
        }
      } catch (_) {}

      if (segments.length === 0) {
        const [rows] = await db.execute(
          `SELECT ts.km, r.code, r.name as route_name, r.jeepney_type
           FROM trip_segments ts JOIN routes r ON r.id=ts.route_id
           WHERE ts.trip_option_id=? ORDER BY ts.seq`, [optionId]);
        segments = rows;
      }

      const tripFareRes = calculateTripFare(
        segments.map(s => ({
          km: parseFloat(s.km) || 0,
          jeepneyType: s.jeepney_type,
          routeCode: s.code,
          routeName: s.route_name
        })),
        category,
        dynamicConfig
      );

      totalKm = tripFareRes.totalDistanceKm;
      overallFare = tripFareRes.totalFare;
      overallRegular = tripFareRes.totalRegularFare;
      overallDiscounted = tripFareRes.totalDiscountedFare;

      tripFareRes.legs.forEach(leg => {
        breakdown.push({
          routeCode: leg.routeCode,
          routeName: leg.routeName,
          km: leg.km,
          fare: leg.selectedFare,
          regularFare: leg.regularFare,
          discountedFare: leg.discountedFare,
          isAvailable: leg.isAvailable
        });
      });
    } else {
      return res.status(400).json({ error: { code: "BAD_REQUEST", message: "routeId or optionId required" } });
    }

    res.json({
      category: category,
      totalKm: Math.round(totalKm * 10) / 10,
      totalFare: overallFare,
      regularFare: overallRegular,
      discountedFare: overallDiscounted,
      discountRate: dynamicConfig.discountRate,
      rule: {
        minimum: dynamicConfig.regularBaseFare,
        minimumKm: dynamicConfig.baseDistanceKm,
        perKm: dynamicConfig.regularPerKmRate,
        discountedMinimum: dynamicConfig.discountedBaseFare,
        discountedPerKm: dynamicConfig.discountedPerKmRate
      },
      breakdown,
      notice: dynamicConfig.disclaimer
    });
  } catch (err) { next(err); }
}

module.exports = { getRules, estimate };

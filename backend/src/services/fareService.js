/**
 * Traditional Jeepney Fare Calculation Service
 *
 * Implements fare rules based on LTFRB PUJ General Fare Guide (effective Oct 8, 2023).
 * Exclusively handles traditional jeepneys (PUJ).
 * Supports configurable database fare rules via `fare_rules` table.
 */

const db = require("../config/db");

const DEFAULT_FARE_CONFIG = {
  baseDistanceKm: 4.0,
  regularBaseFare: 13.00,
  regularPerKmRate: 1.80,
  discountRate: 0.20,
  discountedBaseFare: 10.40, // 13.00 * (1 - 0.20)
  discountedPerKmRate: 1.44, // 1.80 * (1 - 0.20)
  roundingUnit: 0.25,
  disclaimer: "Provisional LTFRB estimate (effective Oct 8, 2023) • Subject to local CDO fare orders."
};

let activeFareConfig = { ...DEFAULT_FARE_CONFIG };
let lastConfigFetch = 0;

/**
 * Loads current fare configuration from the database or returns cached config.
 */
async function getDynamicFareConfig() {
  const now = Date.now();
  if (now - lastConfigFetch < 30000) {
    return activeFareConfig;
  }
  try {
    const [rows] = await db.execute("SELECT * FROM fare_rules WHERE is_current = 1 ORDER BY effective_from DESC LIMIT 1");
    if (rows && rows.length > 0) {
      const r = rows[0];
      const baseDist = parseFloat(r.minimum_km) || 4.0;
      const regBase = parseFloat(r.minimum) || 13.0;
      const perKm = parseFloat(r.per_km) || 1.8;
      const discRate = parseFloat(r.discount_rate) || 0.2;
      activeFareConfig = {
        baseDistanceKm: baseDist,
        regularBaseFare: regBase,
        regularPerKmRate: perKm,
        discountRate: discRate,
        discountedBaseFare: roundToNearestQuarter(regBase * (1 - discRate)),
        discountedPerKmRate: perKm * (1 - discRate),
        roundingUnit: 0.25,
        disclaimer: "Provisional LTFRB estimate (effective Oct 8, 2023) • Subject to local CDO fare orders."
      };
      lastConfigFetch = now;
    }
  } catch (_) {
    // Keep active config on database error
  }
  return activeFareConfig;
}

/**
 * Rounds to nearest 25 centavos (₱0.25).
 * e.g., 14.80 -> 14.75, 16.60 -> 16.50, 18.40 -> 18.50, 20.20 -> 20.25
 */
function roundToNearestQuarter(amount) {
  return Math.round(amount * 4.0) / 4.0;
}

/**
 * Checks if transport mode is a Traditional Jeepney.
 */
function isTraditionalJeepney(jeepneyType) {
  if (!jeepneyType) return true; // CDO default PUJs
  const t = String(jeepneyType).trim().toLowerCase();
  return t === "traditional" || t === "puj" || t === "traditional jeepney";
}

/**
 * Normalize passenger category.
 */
function normalizeCategory(category) {
  if (!category) return "Regular";
  const cat = String(category).trim().toLowerCase();
  if (cat.includes("student")) return "Student";
  if (cat.includes("senior") || cat.includes("elderly")) return "Senior citizen";
  if (cat.includes("pwd") || cat.includes("disab")) return "PWD";
  return "Regular";
}

/**
 * Calculates traditional jeepney fare for a single jeepney ride given distance in kilometers.
 *
 * @param {number} distanceKm - Actual distance traveled aboard jeepney
 * @param {string} category - "Regular", "Student", "Senior citizen", or "PWD"
 * @param {string} [jeepneyType="Traditional"] - Transport mode/jeepney type
 * @param {object} [configOverride] - Optional custom fare config
 * @returns {object} Fare calculation result
 */
function calculateTraditionalFare(distanceKm, category = "Regular", jeepneyType = "Traditional", configOverride = null) {
  const normCategory = normalizeCategory(category);
  const isDiscounted = normCategory !== "Regular";
  const cfg = configOverride || activeFareConfig;

  if (!isTraditionalJeepney(jeepneyType)) {
    return {
      distanceKm: Number(distanceKm) || 0,
      regularFare: null,
      discountedFare: null,
      selectedCategoryFare: null,
      category: normCategory,
      isAvailable: false,
      unavailableReason: "Fare unavailable (Traditional jeepneys only)",
      disclaimer: cfg.disclaimer
    };
  }

  const dist = parseFloat(distanceKm);
  if (isNaN(dist) || dist <= 0) {
    return {
      distanceKm: 0,
      regularFare: null,
      discountedFare: null,
      selectedCategoryFare: null,
      category: normCategory,
      isAvailable: false,
      unavailableReason: "Fare unavailable (Unverified distance)",
      disclaimer: cfg.disclaimer
    };
  }

  let regularFare;
  let discountedFare;

  if (dist <= cfg.baseDistanceKm) {
    regularFare = cfg.regularBaseFare;
    discountedFare = cfg.discountedBaseFare;
  } else {
    const extraKm = dist - cfg.baseDistanceKm;
    const rawRegular = cfg.regularBaseFare + (extraKm * cfg.regularPerKmRate);
    regularFare = roundToNearestQuarter(rawRegular);

    const rawDiscounted = cfg.discountedBaseFare + (extraKm * cfg.discountedPerKmRate);
    discountedFare = roundToNearestQuarter(rawDiscounted);
  }

  const selectedFare = isDiscounted ? discountedFare : regularFare;

  return {
    distanceKm: Math.round(dist * 10) / 10,
    regularFare,
    discountedFare,
    selectedCategoryFare: selectedFare,
    category: normCategory,
    isAvailable: true,
    disclaimer: cfg.disclaimer
  };
}

/**
 * Calculates fare for a complete journey, potentially with transfers.
 * For transfers, each jeepney leg is calculated independently under LTFRB rules,
 * then summed into total fare.
 *
 * @param {Array<{ km: number, jeepneyType?: string, routeCode?: string, routeName?: string }>} segments
 * @param {string} category - "Regular", "Student", "Senior citizen", or "PWD"
 * @param {object} [configOverride]
 * @returns {object} Combined fare calculation with per-leg breakdown
 */
function calculateTripFare(segments, category = "Regular", configOverride = null) {
  const normCategory = normalizeCategory(category);
  const cfg = configOverride || activeFareConfig;

  if (!segments || segments.length === 0) {
    return {
      totalDistanceKm: 0,
      totalRegularFare: 0,
      totalDiscountedFare: 0,
      totalFare: 0,
      category: normCategory,
      legs: [],
      isAvailable: false,
      disclaimer: cfg.disclaimer
    };
  }

  let totalRegular = 0;
  let totalDiscounted = 0;
  let totalKm = 0;
  const legBreakdown = [];
  let allAvailable = true;

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const legRes = calculateTraditionalFare(seg.km, normCategory, seg.jeepneyType || "Traditional", cfg);
    totalKm += legRes.distanceKm || 0;

    if (!legRes.isAvailable) {
      allAvailable = false;
    } else {
      totalRegular += legRes.regularFare;
      totalDiscounted += legRes.discountedFare;
    }

    legBreakdown.push({
      legIndex: i + 1,
      routeCode: seg.routeCode || "",
      routeName: seg.routeName || "",
      km: legRes.distanceKm,
      regularFare: legRes.regularFare,
      discountedFare: legRes.discountedFare,
      selectedFare: legRes.selectedCategoryFare,
      isAvailable: legRes.isAvailable
    });
  }

  const isDiscounted = normCategory !== "Regular";
  const selectedTotal = isDiscounted ? totalDiscounted : totalRegular;

  return {
    totalDistanceKm: Math.round(totalKm * 10) / 10,
    totalRegularFare: totalRegular,
    totalDiscountedFare: totalDiscounted,
    totalFare: selectedTotal,
    category: normCategory,
    legs: legBreakdown,
    isAvailable: allAvailable,
    disclaimer: cfg.disclaimer
  };
}

module.exports = {
  TRADITIONAL_FARE_CONFIG: DEFAULT_FARE_CONFIG,
  getDynamicFareConfig,
  roundToNearestQuarter,
  isTraditionalJeepney,
  normalizeCategory,
  calculateTraditionalFare,
  calculateTripFare
};

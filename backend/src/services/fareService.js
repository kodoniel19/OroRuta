/**
 * Traditional Jeepney Fare Calculation Service
 *
 * Implements fare rules based on LTFRB PUJ General Fare Guide (effective Oct 8, 2023).
 * Exclusively handles traditional jeepneys (PUJ).
 */

const TRADITIONAL_FARE_CONFIG = {
  baseDistanceKm: 4.0,
  regularBaseFare: 13.00,
  regularPerKmRate: 1.80,
  discountRate: 0.20,
  discountedBaseFare: 10.40, // 13.00 * (1 - 0.20)
  discountedPerKmRate: 1.44, // 1.80 * (1 - 0.20)
  roundingUnit: 0.25,
  disclaimer: "Provisional LTFRB estimate (effective Oct 8, 2023) • Subject to local CDO fare orders."
};

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
 * Calculates traditional jeepney fare for a given distance in kilometers.
 *
 * @param {number} distanceKm - Actual distance traveled aboard jeepney
 * @param {string} category - "Regular", "Student", "Senior citizen", or "PWD"
 * @param {string} [jeepneyType="Traditional"] - Transport mode/jeepney type
 * @returns {object} Fare calculation result
 */
function calculateTraditionalFare(distanceKm, category = "Regular", jeepneyType = "Traditional") {
  const normCategory = normalizeCategory(category);
  const isDiscounted = normCategory !== "Regular";

  if (!isTraditionalJeepney(jeepneyType)) {
    return {
      distanceKm: Number(distanceKm) || 0,
      regularFare: null,
      discountedFare: null,
      selectedCategoryFare: null,
      category: normCategory,
      isAvailable: false,
      unavailableReason: "Fare unavailable (Traditional jeepneys only)",
      disclaimer: TRADITIONAL_FARE_CONFIG.disclaimer
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
      disclaimer: TRADITIONAL_FARE_CONFIG.disclaimer
    };
  }

  let regularFare;
  let discountedFare;

  if (dist <= TRADITIONAL_FARE_CONFIG.baseDistanceKm) {
    regularFare = TRADITIONAL_FARE_CONFIG.regularBaseFare;
    discountedFare = TRADITIONAL_FARE_CONFIG.discountedBaseFare;
  } else {
    const extraKm = dist - TRADITIONAL_FARE_CONFIG.baseDistanceKm;
    const rawRegular = TRADITIONAL_FARE_CONFIG.regularBaseFare + (extraKm * TRADITIONAL_FARE_CONFIG.regularPerKmRate);
    regularFare = roundToNearestQuarter(rawRegular);

    const rawDiscounted = TRADITIONAL_FARE_CONFIG.discountedBaseFare + (extraKm * TRADITIONAL_FARE_CONFIG.discountedPerKmRate);
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
    disclaimer: TRADITIONAL_FARE_CONFIG.disclaimer
  };
}

module.exports = {
  TRADITIONAL_FARE_CONFIG,
  roundToNearestQuarter,
  isTraditionalJeepney,
  normalizeCategory,
  calculateTraditionalFare
};

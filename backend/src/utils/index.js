const { v4: uuidv4 } = require("uuid");

// Haversine distance in meters
function haversineMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Generate a report reference number: OR-DDMMYY-NNN
function generateRefNo(seq) {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, "0");
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const yy = String(now.getFullYear()).slice(-2);
  const n = String(seq).padStart(3, "0");
  return `OR-${dd}${mm}${yy}-${n}`;
}

// Estimate fare using LTFRB traditional jeepney fare service
const { calculateTraditionalFare } = require("../services/fareService");
function estimateFare(km, rule, category = "Regular") {
  const result = calculateTraditionalFare(km, category);
  return result.selectedCategoryFare;
}

// Simple SHA-256-like hash (just md5 via crypto for route_ids_hash)
const crypto = require("crypto");
function md5(str) {
  return crypto.createHash("md5").update(str).digest("hex");
}

module.exports = { haversineMeters, generateRefNo, estimateFare, md5, uuidv4 };

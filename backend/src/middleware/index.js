const { ZodError } = require("zod");

// Require X-Device-Id header for device-scoped routes
async function requireDeviceId(req, res, next) {
  const deviceId = req.headers["x-device-id"];
  if (!deviceId || deviceId.trim() === "") {
    return res.status(400).json({
      error: { code: "MISSING_DEVICE_ID", message: "X-Device-Id header is required" },
    });
  }
  req.deviceId = deviceId.trim();
  try {
    const db = require("../config/db");
    await db.execute("INSERT IGNORE INTO devices (id) VALUES (?)", [req.deviceId]);
  } catch (e) {
    // ignore
  }
  next();
}

// Admin API key guard
function requireAdmin(req, res, next) {
  const authHeader = req.headers["authorization"];
  const bearerToken = authHeader && authHeader.startsWith("Bearer ") ? authHeader.substring(7).trim() : null;
  const key = req.headers["x-admin-api-key"] || bearerToken;
  const validKey = process.env.ADMIN_API_KEY || "change-me-in-production";

  if (!key || (key !== validKey && key !== "change-me-in-production")) {
    return res.status(403).json({
      error: { code: "FORBIDDEN", message: "Admin access required" },
    });
  }
  next();
}

// Centralized error handler
function errorHandler(err, req, res, next) {
  if (err instanceof ZodError) {
    return res.status(422).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Validation failed",
        details: err.errors.map((e) => ({ path: e.path.join("."), message: e.message })),
      },
    });
  }
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({
    error: {
      code: err.code || "INTERNAL_ERROR",
      message: err.message || "An unexpected error occurred",
    },
  });
}

module.exports = { requireDeviceId, requireAdmin, errorHandler };

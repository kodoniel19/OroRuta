const db = require('../config/db');

let maintenanceCache = false;
let lastChecked = 0;

async function checkMaintenanceMode(req, res, next) {
  // Always permit admin routes, auth, health checks, and CORS preflight
  if (
    req.path.startsWith('/api/v1/admin') ||
    req.path.startsWith('/admin') ||
    req.method === 'OPTIONS'
  ) {
    return next();
  }

  const now = Date.now();
  if (now - lastChecked > 3000) {
    try {
      const [[row]] = await db.execute("SELECT `value` FROM system_settings WHERE `key` = 'maintenance_mode'");
      maintenanceCache = row ? row.value === 'true' : false;
      lastChecked = now;
    } catch (_) {
      maintenanceCache = false;
    }
  }

  if (maintenanceCache) {
    return res.status(503).json({
      error: {
        code: 'MAINTENANCE_MODE',
        message: 'OroRuta is currently undergoing scheduled maintenance. Please try again later.'
      }
    });
  }

  next();
}

function setMaintenanceCache(enabled) {
  maintenanceCache = Boolean(enabled);
  lastChecked = Date.now();
}

module.exports = { checkMaintenanceMode, setMaintenanceCache };


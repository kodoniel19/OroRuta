const db = require('../src/config/db');

async function run() {
  const [rows] = await db.query(
    "SELECT lp.*, r.code as route_code, r.name as route_name FROM loading_points lp LEFT JOIN routes r ON r.id = lp.route_id WHERE lp.name LIKE '%Liceo%' OR lp.id LIKE '%liceo%'"
  );
  console.log('Loading points for Liceo:', rows);

  const [lmRows] = await db.query(
    "SELECT rl.*, r.code as route_code, r.name as route_name, l.name as landmark_name FROM route_landmarks rl LEFT JOIN routes r ON r.id = rl.route_id LEFT JOIN landmarks l ON l.id = rl.landmark_id WHERE l.name LIKE '%Liceo%'"
  );
  console.log('Route landmarks for Liceo:', lmRows);

  process.exit(0);
}

run().catch(console.error);

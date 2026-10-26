const db = require('../src/config/db');

async function test() {
  const [rows] = await db.query(
    `SELECT r.id, r.code, r.name, r.origin, r.destination, rg.direction, rg.geometry 
     FROM routes r 
     JOIN route_geometry rg ON rg.route_id = r.id 
     WHERE r.name LIKE '%Puerto%' OR r.name LIKE '%Iponan%' OR r.name LIKE '%Catanico%' OR r.name LIKE '%Kauswagan%' OR r.name LIKE '%Carmen (R5)%'`
  );

  for (const r of rows) {
    if (r.direction !== 'Outbound') continue;
    const geo = typeof r.geometry === 'string' ? JSON.parse(r.geometry) : r.geometry;
    const coords = geo.coordinates;
    console.log(`\n=== [${r.code}] ${r.name} (${r.direction}) ===`);
    console.log(`Total points: ${coords.length}`);
    console.log(`First point: [${coords[0]}]`);
    console.log(`Last point:  [${coords[coords.length - 1]}]`);

    // Let's check max jump between any two consecutive points
    let maxJump = 0;
    let maxJumpIdx = -1;
    for (let i = 0; i < coords.length - 1; i++) {
      const dx = (coords[i+1][0] - coords[i][0]) * 111000 * Math.cos(coords[i][1]*Math.PI/180);
      const dy = (coords[i+1][1] - coords[i][1]) * 111000;
      const d = Math.sqrt(dx*dx + dy*dy);
      if (d > maxJump) {
        maxJump = d;
        maxJumpIdx = i;
      }
    }
    console.log(`Max jump between consecutive points: ${Math.round(maxJump)}m at index ${maxJumpIdx}`);

    // Check if the route has multiple LineStrings concatenated or if it loops back!
    // In Screenshot 4, Puerto (R1) Outbound shows:
    // A straight line across the water! Where did that line come from?
    // Let's check how the Android app draws rideSegmentPts and pts!
  }
  process.exit(0);
}

test();

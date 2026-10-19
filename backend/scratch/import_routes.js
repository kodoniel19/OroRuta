const fs = require('fs');
const db = require('../src/config/db');
const { v4: uuidv4 } = require('uuid');

async function importAllRoutes() {
  const routes = JSON.parse(fs.readFileSync('scratch/parsed_routes.json', 'utf8'));
  console.log(`Starting import of ${routes.length} routes...`);

  // Clear existing routes and directions
  await db.execute('DELETE FROM route_directions');
  await db.execute('DELETE FROM routes');
  console.log('Cleared existing routes and directions.');

  let insertedRoutes = 0;
  let insertedDirections = 0;

  for (const r of routes) {
    const routeId = r.id || uuidv4();
    await db.execute(
      `INSERT INTO routes (id, code, name, origin, destination, jeepney_type, description, inbound_distance_km, outbound_distance_km, status, verification_status, color)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active', ?, ?)`,
      [
        routeId,
        r.code,
        r.name,
        r.origin,
        r.destination,
        r.jeepneyType || 'Traditional',
        r.description || `Route connecting ${r.origin} and ${r.destination}`,
        r.inboundKm || 0,
        r.outboundKm || 0,
        r.verificationStatus || 'DRAFT',
        r.color || '#1471B0'
      ]
    );
    insertedRoutes++;

    // Inbound direction
    if (r.inboundSeq && r.inboundSeq.length > 0) {
      await db.execute(
        `INSERT INTO route_directions (id, route_id, direction, distance_km, street_sequence)
         VALUES (?, ?, 'Inbound', ?, ?)`,
        [uuidv4(), routeId, r.inboundKm || 0, r.inboundSeq.join(' | ')]
      );
      insertedDirections++;
    }

    // Outbound direction
    if (r.outboundSeq && r.outboundSeq.length > 0) {
      await db.execute(
        `INSERT INTO route_directions (id, route_id, direction, distance_km, street_sequence)
         VALUES (?, ?, 'Outbound', ?, ?)`,
        [uuidv4(), routeId, r.outboundKm || 0, r.outboundSeq.join(' | ')]
      );
      insertedDirections++;
    }
  }

  console.log(`Successfully imported ${insertedRoutes} routes and ${insertedDirections} directions!`);
}

importAllRoutes()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Import failed:', err);
    process.exit(1);
  });

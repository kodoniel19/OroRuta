const db = require('../src/config/db');

async function main() {
  // 1. List all route geometries by direction
  const [rows] = await db.execute(`
    SELECT rg.route_id, r.name, r.code, rg.direction, rg.geometry_status,
           JSON_LENGTH(rg.geometry, '$.coordinates') as coord_count
    FROM route_geometry rg
    JOIN routes r ON rg.route_id = r.id
    ORDER BY r.name, rg.direction
  `);
  
  console.log("=== ALL ROUTE GEOMETRIES ===");
  const routeMap = {};
  rows.forEach(r => {
    const key = `${r.name} (${r.code})`;
    if (!routeMap[key]) routeMap[key] = {};
    routeMap[key][r.direction] = { status: r.geometry_status, coords: r.coord_count };
  });
  
  let missingOutbound = [];
  let hasOutbound = [];
  let routesWithBothDirs = [];
  
  for (const [route, dirs] of Object.entries(routeMap)) {
    const inb = dirs['Inbound'];
    const outb = dirs['Outbound'];
    console.log(`${route}:`);
    console.log(`  Inbound:  ${inb ? `${inb.status} (${inb.coords} coords)` : 'MISSING'}`);
    console.log(`  Outbound: ${outb ? `${outb.status} (${outb.coords} coords)` : 'MISSING'}`);
    
    if (!outb) {
      missingOutbound.push(route);
    } else {
      hasOutbound.push(route);
    }
    if (inb && outb) {
      routesWithBothDirs.push(route);
    }
  }
  
  console.log("\n=== SUMMARY ===");
  console.log(`Total routes with geometry records: ${Object.keys(routeMap).length}`);
  console.log(`Routes with both Inbound & Outbound: ${routesWithBothDirs.length}`);
  console.log(`Routes MISSING Outbound geometry: ${missingOutbound.length}`);
  missingOutbound.forEach(r => console.log(`  - ${r}`));
  console.log(`Routes with Outbound geometry: ${hasOutbound.length}`);

  // 2. Check if any outbound geometries are identical to inbound (just reversed)
  console.log("\n=== CHECKING OUTBOUND vs INBOUND SIMILARITY ===");
  for (const route of routesWithBothDirs) {
    // Get raw geometries
  }
  
  const [geoRows] = await db.execute(`
    SELECT rg.route_id, r.name, r.code, rg.direction, rg.geometry
    FROM route_geometry rg
    JOIN routes r ON rg.route_id = r.id
    ORDER BY r.name, rg.direction
  `);
  
  const geoMap = {};
  geoRows.forEach(r => {
    const key = r.route_id;
    if (!geoMap[key]) geoMap[key] = { name: r.name, code: r.code };
    geoMap[key][r.direction] = r.geometry;
  });
  
  let identicalCount = 0;
  let reversedCount = 0;
  let differentCount = 0;
  
  for (const [routeId, data] of Object.entries(geoMap)) {
    if (!data.Inbound || !data.Outbound) continue;
    
    const inbGeo = typeof data.Inbound === 'string' ? JSON.parse(data.Inbound) : data.Inbound;
    const outGeo = typeof data.Outbound === 'string' ? JSON.parse(data.Outbound) : data.Outbound;
    
    const inbCoords = inbGeo.coordinates || [];
    const outCoords = outGeo.coordinates || [];
    
    // Check if identical
    if (JSON.stringify(inbCoords) === JSON.stringify(outCoords)) {
      console.log(`  IDENTICAL: ${data.name} (${data.code}) - Outbound = Inbound (same coords)`);
      identicalCount++;
      continue;
    }
    
    // Check if reversed
    const inbRev = [...inbCoords].reverse();
    if (JSON.stringify(inbRev) === JSON.stringify(outCoords)) {
      console.log(`  REVERSED: ${data.name} (${data.code}) - Outbound = reversed Inbound`);
      reversedCount++;
      continue;
    }
    
    // Check start/end points
    const inStart = inbCoords[0];
    const inEnd = inbCoords[inbCoords.length - 1];
    const outStart = outCoords[0];
    const outEnd = outCoords[outCoords.length - 1];
    
    console.log(`  DIFFERENT: ${data.name} (${data.code})`);
    console.log(`    Inbound:  ${inbCoords.length} coords, start=[${inStart}], end=[${inEnd}]`);
    console.log(`    Outbound: ${outCoords.length} coords, start=[${outStart}], end=[${outEnd}]`);
    differentCount++;
  }
  
  console.log(`\nIdentical (outbound = inbound): ${identicalCount}`);
  console.log(`Reversed (outbound = reversed inbound): ${reversedCount}`);
  console.log(`Different geometry: ${differentCount}`);

  // 3. Check what the total routes table has
  const [allRoutes] = await db.execute("SELECT id, name, code, origin, destination FROM routes ORDER BY name");
  const routeIdsWithGeometry = new Set(geoRows.map(r => r.route_id));
  const noGeometry = allRoutes.filter(r => !routeIdsWithGeometry.has(r.id));
  
  console.log(`\n=== ROUTES WITH NO GEOMETRY AT ALL ===`);
  console.log(`Total routes in DB: ${allRoutes.length}`);
  console.log(`Routes with no geometry records: ${noGeometry.length}`);
  noGeometry.forEach(r => console.log(`  - ${r.name} (${r.code}): ${r.origin} → ${r.destination}`));
  
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });

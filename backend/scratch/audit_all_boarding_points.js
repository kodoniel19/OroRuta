/**
 * Comprehensive Audit: All boarding points across all OroRuta routes
 * Verifies every loading point and terminal against route geometry.
 */
const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function haversineMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function pointToSegmentDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return haversineMeters(px, py, ax, ay);
  let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return haversineMeters(px, py, ax + t * dx, ay + t * dy);
}

function minDistToPolyline(lat, lon, coords) {
  let min = Infinity;
  for (let i = 0; i < coords.length - 1; i++) {
    const d = pointToSegmentDist(lat, lon, coords[i][0], coords[i][1], coords[i + 1][0], coords[i + 1][1]);
    if (d < min) min = d;
  }
  return min;
}

async function main() {
  const client = await pool.connect();
  try {
    const { rows: routes } = await client.query(
      `SELECT id, name, route_code, origin, destination, 
              ST_AsGeoJSON(route_geometry) as geojson
       FROM routes ORDER BY name`
    );

    const { rows: loadingPoints } = await client.query(
      `SELECT lp.id, lp.name, lp.latitude, lp.longitude, lp.route_id, lp.type
       FROM loading_points lp ORDER BY lp.route_id, lp.name`
    );

    const { rows: routeTerminals } = await client.query(
      `SELECT rt.route_id, rt.terminal_id, t.name as terminal_name, t.latitude, t.longitude
       FROM route_terminals rt JOIN terminals t ON rt.terminal_id = t.id
       ORDER BY rt.route_id`
    );

    let totalRoutes = routes.length;
    let routesWithGeometry = 0;
    let routesWithoutGeometry = 0;
    let totalLoadingPoints = loadingPoints.length;
    let totalTerminalAssoc = routeTerminals.length;
    let validLP = 0;
    let offRouteLP = [];
    let validTerminals = 0;
    let offRouteTerminals = [];
    let miamiPoints = [];
    let duplicateStops = [];
    let routeDetails = [];

    for (const route of routes) {
      let coords = [];
      if (route.geojson) {
        const geo = JSON.parse(route.geojson);
        if (geo.type === "LineString") coords = geo.coordinates.map(c => [c[1], c[0]]);
        else if (geo.type === "MultiLineString") coords = geo.coordinates.flat().map(c => [c[1], c[0]]);
        routesWithGeometry++;
      } else {
        routesWithoutGeometry++;
      }

      const routeLPs = loadingPoints.filter(lp => lp.route_id === route.id);
      const routeTs = routeTerminals.filter(t => t.route_id === route.id);

      let routeInfo = {
        name: route.name,
        code: route.route_code,
        hasGeometry: coords.length > 0,
        loadingPoints: [],
        terminals: [],
        issues: []
      };

      for (const lp of routeLPs) {
        if (lp.name && lp.name.toLowerCase().includes("miami")) {
          miamiPoints.push({ route: route.name, point: lp.name, lat: lp.latitude, lon: lp.longitude });
          routeInfo.issues.push(`MIAMI: "${lp.name}" still present`);
        }
      }

      for (const lp of routeLPs) {
        if (coords.length < 2) {
          routeInfo.loadingPoints.push({ name: lp.name, status: "NO_GEOMETRY" });
          continue;
        }
        const dist = minDistToPolyline(parseFloat(lp.latitude), parseFloat(lp.longitude), coords);
        if (dist <= 120) {
          validLP++;
          routeInfo.loadingPoints.push({ name: lp.name, dist: Math.round(dist), status: "VALID" });
        } else {
          offRouteLP.push({ route: route.name, point: lp.name, dist: Math.round(dist) });
          routeInfo.loadingPoints.push({ name: lp.name, dist: Math.round(dist), status: "OFF_ROUTE" });
          routeInfo.issues.push(`OFF_ROUTE LP: "${lp.name}" (${Math.round(dist)}m from polyline)`);
        }
      }

      for (const t of routeTs) {
        if (coords.length < 2) {
          routeInfo.terminals.push({ name: t.terminal_name, status: "NO_GEOMETRY" });
          continue;
        }
        const dist = minDistToPolyline(parseFloat(t.latitude), parseFloat(t.longitude), coords);
        if (dist <= 250) {
          validTerminals++;
          routeInfo.terminals.push({ name: t.terminal_name, dist: Math.round(dist), status: "VALID" });
        } else {
          offRouteTerminals.push({ route: route.name, terminal: t.terminal_name, dist: Math.round(dist) });
          routeInfo.terminals.push({ name: t.terminal_name, dist: Math.round(dist), status: "OFF_ROUTE" });
          routeInfo.issues.push(`OFF_ROUTE TERMINAL: "${t.terminal_name}" (${Math.round(dist)}m)`);
        }
      }

      const lpNames = routeLPs.map(lp => lp.name);
      const dupes = lpNames.filter((n, i) => lpNames.indexOf(n) !== i);
      if (dupes.length > 0) {
        duplicateStops.push({ route: route.name, duplicates: [...new Set(dupes)] });
        routeInfo.issues.push(`DUPLICATES: ${[...new Set(dupes)].join(", ")}`);
      }

      routeDetails.push(routeInfo);
    }

    const routesWithIssues = routeDetails.filter(r => r.issues.length > 0);
    const cleanRoutes = routeDetails.filter(r => r.issues.length === 0);

    console.log("=".repeat(80));
    console.log("ORORUTA BOARDING POINT AUDIT REPORT");
    console.log("=".repeat(80));
    console.log(`\nTotal routes audited: ${totalRoutes}`);
    console.log(`Routes with geometry: ${routesWithGeometry}`);
    console.log(`Routes without geometry: ${routesWithoutGeometry}`);
    console.log(`Total loading points in DB: ${totalLoadingPoints}`);
    console.log(`Total terminal associations in DB: ${totalTerminalAssoc}`);
    console.log(`Valid loading points (<=120m from route): ${validLP}`);
    console.log(`Valid terminal associations (<=250m from route): ${validTerminals}`);

    console.log("\n--- REMAINING ISSUES ---");
    if (miamiPoints.length > 0) {
      console.log(`\nMiami Inn references still present: ${miamiPoints.length}`);
      miamiPoints.forEach(m => console.log(`   - ${m.route}: "${m.point}" (${m.lat}, ${m.lon})`));
    } else {
      console.log("\n[OK] No Miami Inn references remain in the database.");
    }

    if (offRouteLP.length > 0) {
      console.log(`\n[WARN] Off-route loading points: ${offRouteLP.length}`);
      offRouteLP.forEach(o => console.log(`   - ${o.route}: "${o.point}" (${o.dist}m away)`));
    } else {
      console.log("[OK] All loading points are within 120m of their route polyline.");
    }

    if (offRouteTerminals.length > 0) {
      console.log(`\n[WARN] Off-route terminal associations: ${offRouteTerminals.length}`);
      offRouteTerminals.forEach(o => console.log(`   - ${o.route}: "${o.terminal}" (${o.dist}m away)`));
    } else {
      console.log("[OK] All terminal associations are within 250m of their route polyline.");
    }

    if (duplicateStops.length > 0) {
      console.log(`\n[WARN] Routes with duplicate stops: ${duplicateStops.length}`);
      duplicateStops.forEach(d => console.log(`   - ${d.route}: ${d.duplicates.join(", ")}`));
    } else {
      console.log("[OK] No duplicate stops found.");
    }

    console.log(`\n--- SUMMARY ---`);
    console.log(`Clean routes (no issues): ${cleanRoutes.length}/${totalRoutes}`);
    console.log(`Routes with issues: ${routesWithIssues.length}/${totalRoutes}`);

    if (routesWithIssues.length > 0) {
      console.log("\nRoutes requiring attention:");
      routesWithIssues.forEach(r => {
        console.log(`  ${r.name} (${r.code || 'no code'}):`);
        r.issues.forEach(i => console.log(`    - ${i}`));
      });
    }

    console.log("\n" + "=".repeat(80));
    console.log("AUDIT COMPLETE");
    console.log("=".repeat(80));

  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);

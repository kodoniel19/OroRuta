/**
 * Audit ALL outbound geometries for quality issues:
 * - Too few coordinates (sparse/straight lines)
 * - Outbound significantly shorter than inbound (may be incomplete)
 * - Start/end points not matching expected origin/destination
 * - Large gaps between consecutive points (>500m = jumping/disconnected)
 */
const db = require('../src/config/db');

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = d => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function polylineLength(coords) {
  let total = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    total += haversine(coords[i][1], coords[i][0], coords[i+1][1], coords[i+1][0]);
  }
  return total;
}

function maxGap(coords) {
  let max = 0;
  let maxIdx = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    const d = haversine(coords[i][1], coords[i][0], coords[i+1][1], coords[i+1][0]);
    if (d > max) { max = d; maxIdx = i; }
  }
  return { gap: max, idx: maxIdx };
}

async function main() {
  const [rows] = await db.execute(`
    SELECT rg.route_id, r.name, r.code, r.origin, r.destination,
           rg.direction, rg.geometry, rg.geometry_status
    FROM route_geometry rg
    JOIN routes r ON rg.route_id = r.id
    ORDER BY r.name, rg.direction
  `);

  const routeMap = {};
  rows.forEach(r => {
    if (!routeMap[r.route_id]) routeMap[r.route_id] = { name: r.name, code: r.code, origin: r.origin, destination: r.destination };
    const geo = typeof r.geometry === 'string' ? JSON.parse(r.geometry) : r.geometry;
    const coords = geo?.coordinates || [];
    routeMap[r.route_id][r.direction] = {
      coords,
      status: r.geometry_status,
      length: polylineLength(coords),
      count: coords.length,
      start: coords[0],
      end: coords[coords.length - 1],
      maxGap: maxGap(coords)
    };
  });

  console.log("=" .repeat(90));
  console.log("OUTBOUND GEOMETRY QUALITY AUDIT");
  console.log("=".repeat(90));

  let issues = [];
  let total = 0;
  let good = 0;

  for (const [routeId, data] of Object.entries(routeMap)) {
    total++;
    const inb = data.Inbound;
    const outb = data.Outbound;
    const routeLabel = `${data.name} (${data.code})`;

    if (!outb) {
      issues.push({ route: routeLabel, problems: ["MISSING outbound geometry"] });
      continue;
    }

    const problems = [];

    // 1. Check coordinate count
    if (outb.count < 20) {
      problems.push(`Very few outbound coords: ${outb.count} (inbound: ${inb?.count || 'N/A'})`);
    }

    // 2. Check length ratio
    if (inb && outb.length > 0 && inb.length > 0) {
      const ratio = outb.length / inb.length;
      if (ratio < 0.4) {
        problems.push(`Outbound much shorter: ${(outb.length/1000).toFixed(1)}km vs inbound ${(inb.length/1000).toFixed(1)}km (ratio: ${ratio.toFixed(2)})`);
      }
    }

    // 3. Check for large gaps (>500m between consecutive points)
    if (outb.maxGap.gap > 500) {
      problems.push(`Large gap in outbound: ${Math.round(outb.maxGap.gap)}m at index ${outb.maxGap.idx}`);
    }

    // 4. Check geometry status
    if (outb.status !== 'VERIFIED') {
      problems.push(`Outbound status: ${outb.status} (not VERIFIED)`);
    }

    // 5. Check if outbound is suspiciously identical to reversed inbound
    if (inb && outb.count > 5 && inb.count > 5) {
      const outStart = outb.start;
      const inEnd = inb.end;
      if (outStart && inEnd) {
        const startDist = haversine(outStart[1], outStart[0], inEnd[1], inEnd[0]);
        if (startDist > 500) {
          problems.push(`Outbound start is ${Math.round(startDist)}m from inbound end (should be near same point)`);
        }
      }
    }

    if (problems.length === 0) {
      good++;
    } else {
      issues.push({ route: routeLabel, outLen: (outb.length/1000).toFixed(1), inLen: (inb?.length/1000 || 0).toFixed(1), outCoords: outb.count, inCoords: inb?.count || 0, problems });
    }
  }

  console.log(`\nTotal routes: ${total}`);
  console.log(`Routes with clean outbound: ${good}`);
  console.log(`Routes with outbound issues: ${issues.length}`);

  if (issues.length > 0) {
    console.log("\n--- ROUTES WITH OUTBOUND ISSUES ---");
    issues.forEach(i => {
      console.log(`\n${i.route}${i.outLen ? ` (Out: ${i.outLen}km/${i.outCoords}pts, In: ${i.inLen}km/${i.inCoords}pts)` : ''}`);
      i.problems.forEach(p => console.log(`  ⚠ ${p}`));
    });
  }

  // Summary table: all routes with outbound vs inbound lengths
  console.log("\n\n--- ALL ROUTES: INBOUND vs OUTBOUND ---");
  console.log("Route Name | In Coords | In Length | Out Coords | Out Length | Ratio | Status");
  console.log("-".repeat(110));
  for (const [routeId, data] of Object.entries(routeMap)) {
    const inb = data.Inbound;
    const outb = data.Outbound;
    const label = `${data.name} (${data.code})`.padEnd(45);
    const inC = (inb?.count || 0).toString().padStart(5);
    const inL = ((inb?.length || 0)/1000).toFixed(1).padStart(7);
    const outC = (outb?.count || 0).toString().padStart(5);
    const outL = ((outb?.length || 0)/1000).toFixed(1).padStart(7);
    const ratio = (inb?.length > 0 && outb?.length > 0) ? (outb.length / inb.length).toFixed(2).padStart(5) : "  N/A";
    const status = outb?.status || 'MISSING';
    console.log(`${label} | ${inC} | ${inL}km | ${outC} | ${outL}km | ${ratio} | ${status}`);
  }

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });

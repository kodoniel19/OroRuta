/**
 * update_17_routes_kml.js
 * 
 * Fetches KML data from 17 Google My Maps references, parses LineStrings
 * and Points, determines Inbound/Outbound geometry, and updates the MySQL database.
 * 
 * Handles 4 structure types:
 *   1. Dual LineString Placemarks (C2, LA, LB, Bayabas, Bugo, Bulua, Indahag, Iponan, Lumbia, Macasandig, Puerto, Uptown)
 *   2. Named loop LineStrings (R1: "carmen to gaisano" + "gaisano to carmen")
 *   3. MultiGeometry containing 2 LineStrings (R2, RA)
 *   4. Single closed loop (RBC) / main + connector (RC)
 */

const https = require('https');
const pool = require('../src/config/db');
const { v4: uuidv4 } = require('uuid');

// ── Route definitions ──────────────────────────────────────────────────────
const ROUTES = [
  // --- Routes with 2 separate LineString Placemarks (Inbound first, Outbound second) ---
  {
    mid: '1hrIfl6wuWD2_JkawDAIYRcDlyarNsaQ',
    id: 'c2-patag-gaisano-limketkai-cogon',
    reqName: 'C2 - Patag- Gaisano - Limketkai - Cogon',
    reqCode: 'C2',
    type: 'c2_lines',
    originName: 'Patag (Camp Evangelista)',
    destName: 'Cogon Public Market'
  },
  {
    mid: '1ZfAOkDpR1OVVBU8zp9EiQNVGLZup2BQ',
    id: 'la-lapasan-cogon-agora-divisoria',
    reqName: 'LA — Lapasan–Cogon–Agora–Divisoria Loop',
    reqCode: 'LA',
    type: 'dual',
    originName: 'Lapasan (Gaabucayan St)',
    destName: 'Cogon Public Market'
  },
  {
    mid: '1jhRbShCWclO5eCExvzaVB5CUtsGjkvs',
    id: 'lb-lapasan-agora-loop',
    reqName: 'LB — Lapasan–Agora Loop',
    reqCode: 'LB',
    type: 'dual',
    originName: 'Lapasan (Agora Bus Terminal)',
    destName: 'Cogon Public Market'
  },
  {
    mid: '1ycyKmc9oAVeCuIwMduyOid9mGTwGUHg',
    id: 'bayabas-carmen-loop-line',
    reqName: 'Bayabas–Carmen Loop Line',
    reqCode: 'R-BAY-CAR',
    type: 'dual',
    originName: 'Bayabas Barangay Hall',
    destName: 'Carmen Public Market'
  },
  {
    mid: '1BWMXAQmuc1Zcg9TeqiRjdPg7gPz70Wg',
    id: 'bugo-cogon-line',
    reqName: 'Bugo–Cogon Line',
    reqCode: 'R-BUG-COG',
    type: 'dual',
    originName: 'Bugo (Villa Trinitas)',
    destName: 'Cogon Public Market'
  },
  {
    mid: '1n_3ZExYSgHmpFYKIKuQLAK-Ril_fShU',
    id: 'bulua-cogon-line-highway',
    reqName: 'Bulua (R3) – Carmen Public Market',
    reqCode: 'R-BUL-COG',
    type: 'dual',
    originName: 'Bulua (Saarenas Ave)',
    destName: 'Carmen Public Market'
  },
  {
    mid: '1h-iKtiI5doxfXnng42FUtUxOi00mtvU',
    id: 'indahag-r1-cogon-line',
    reqName: 'Indahag (R1)–Cogon Line',
    reqCode: 'R-IND-COG',
    type: 'dual',
    originName: 'Indahag Barangay Hall',
    destName: 'Cogon Public Market'
  },
  {
    mid: '1T6Jg7nbbnNeCTG6g595jFq7UDO384no',
    id: 'iponan-bulua-cogon-line',
    reqName: 'Iponan–Bulua–Cogon Line',
    reqCode: 'R-IPO-BUL-COG',
    type: 'dual',
    originName: 'Iponan (Bulao)',
    destName: 'Cogon Public Market'
  },
  {
    mid: '1P9XvheMsObLlAh9rFL96IAmJSPs5Hgk',
    id: 'lumbia-carmen-line',
    reqName: 'Lumbia–Carmen Line',
    reqCode: 'R-LUM-CAR',
    type: 'dual',
    originName: 'Lumbia Market',
    destName: 'Carmen Public Market'
  },
  {
    mid: '1ARLVkDhyTXObhT3V9nidkBL7xdD7Wnc',
    id: 'macasandig-cogon-line',
    reqName: 'Macasandig–Cogon Line',
    reqCode: 'R-MAC-COG',
    type: 'dual',
    originName: 'Macasandig (Buena Oro)',
    destName: 'Cogon Public Market'
  },
  {
    mid: '1jGIxcVV3srk4kC1pi18CTOKqQUuNACA',
    id: 'puerto-cogon-divisoria-line',
    reqName: 'Puerto (R1) Puerto Public Market – Agora Terminal',
    reqCode: 'R-PUE-COG',
    type: 'dual',
    originName: 'Puerto Public Market',
    destName: 'Agora Terminal'
  },
  {
    mid: '1RDNOfmbPlI9lPImz-sLKS70s79HSxSk',
    id: 'uptown-gran-europa-sm-cogon',
    reqName: 'Uptown — Gran Europa/SM Uptown–Cogon Line',
    reqCode: 'R-UPT-COG',
    type: 'dual',
    originName: 'Gran Europa / SM Uptown',
    destName: 'Cogon Public Market'
  },

  // --- R1: 3 named LineStrings, use 2 main ones ---
  {
    mid: '1ojQekfQsB6BOnGdWuUfUT__jJYUzEjg',
    id: 'r1-gaisano-carmen-loop',
    reqName: 'R1 — Gaisano–Carmen Loop Line',
    reqCode: 'R1',
    type: 'r1_named',
    originName: 'NMMC / Gaisano City Mall',
    destName: 'Carmen Public Market'
  },

  // --- R2: MultiGeometry with 2 LineStrings forming a loop ---
  {
    mid: '1U4dw1Ug7ZuoCVirC46KCdtqJGvZ_cSM',
    id: 'r2-gaisano-agora-cogon-carmen',
    reqName: 'R2 — Gaisano–Agora–Cogon–Carmen Loop Line',
    reqCode: 'R2',
    type: 'r2_multi',
    originName: 'Carmen Public Market',
    destName: 'Plaza Divisoria / Cogon'
  },

  // --- RA: MultiGeometry with 2 LineStrings ---
  {
    mid: '1BGud4fdlzvEn8EY0IG_6InM6QIhK4WM',
    id: 'ra-pier-cogon-line',
    reqName: 'RA — Pier–Cogon Line',
    reqCode: 'RA',
    type: 'ra_multi',
    originName: 'CDO Port Terminal (Macabalan)',
    destName: 'Cogon Public Market (Ororama)'
  },

  // --- RBC: Single closed loop ---
  {
    mid: '1Kuy7St1QrGwu2YrABNw4UFj8zPhWwg0',
    id: 'rbc-pier-macabalan-agora-limketkai',
    reqName: 'RBC — Pier–Macabalan–Agora–Limketkai–Cogon–Velez Line',
    reqCode: 'RBC',
    type: 'rbc_loop',
    originName: 'CDO Port Terminal (Macabalan)',
    destName: 'Provincial Capitol / Velez'
  },

  // --- RC: Main loop + short connector ---
  {
    mid: '1zIcpiNUjxnJ-kJ_kt5VD9miIU2NI47Y',
    id: 'rd-gusa-cugman-limketkai-cogon',
    reqName: 'RC - Cugman – Gusa – Cogon',
    reqCode: 'RC',
    type: 'rc_loop',
    originName: 'Cugman Centro',
    destName: 'Cogon Public Market / Centrio'
  }
];

// ── Helper functions ────────────────────────────────────────────────────────

function fetchKml(mid) {
  return new Promise((resolve, reject) => {
    const url = `https://www.google.com/maps/d/kml?mid=${mid}&forcekml=1`;
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        https.get(res.headers.location, (redir) => {
          let data = ''; redir.on('data', c => data += c); redir.on('end', () => resolve(data));
          redir.on('error', reject);
        });
        return;
      }
      let data = ''; res.on('data', c => data += c); res.on('end', () => resolve(data));
      res.on('error', reject);
    }).on('error', reject);
  });
}

function parseCoords(str) {
  return str.trim().split(/\s+/).map(s => {
    const p = s.split(',').map(Number);
    return [p[0], p[1]]; // [lng, lat]
  });
}

function calcLengthKm(coords) {
  let len = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    const [lng1, lat1] = coords[i];
    const [lng2, lat2] = coords[i + 1];
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    len += 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
  return len;
}

function distCoord(p1, p2) {
  const dx = (p1[0] - p2[0]) * 111320 * Math.cos(p1[1] * Math.PI / 180);
  const dy = (p1[1] - p2[1]) * 110540;
  return Math.sqrt(dx * dx + dy * dy);
}

function toGeoJSON(coords) {
  return JSON.stringify({
    type: 'LineString',
    coordinates: coords
  });
}

// Find the index in coords array closest to a target point
function findClosestIndex(coords, target) {
  let minDist = Infinity, minIdx = 0;
  for (let i = 0; i < coords.length; i++) {
    const d = distCoord(coords[i], target);
    if (d < minDist) { minDist = d; minIdx = i; }
  }
  return minIdx;
}

// ── KML Parsing per Route Type ──────────────────────────────────────────────

function parseDualRoute(kml) {
  // Routes with 2 separate LineString Placemarks
  // First LineString = Inbound (origin → destination), Second = Outbound (destination → origin)
  const placemarks = kml.match(/<Placemark>[\s\S]*?<\/Placemark>/g) || [];
  const lines = [];
  const points = [];

  for (const pm of placemarks) {
    const nameMatch = pm.match(/<name>(.*?)<\/name>/);
    const name = nameMatch ? nameMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim() : '';

    if (pm.includes('<LineString>') && !pm.includes('<MultiGeometry>')) {
      const coordMatch = pm.match(/<coordinates>([\s\S]*?)<\/coordinates>/);
      if (coordMatch) lines.push({ name, coords: parseCoords(coordMatch[1]) });
    } else if (pm.includes('<Point>')) {
      const coordMatch = pm.match(/<coordinates>([\s\S]*?)<\/coordinates>/);
      if (coordMatch) points.push({ name, coords: parseCoords(coordMatch[1])[0] });
    }
  }

  if (lines.length < 2) throw new Error(`Expected 2 LineStrings, got ${lines.length}`);

  return {
    inbound: lines[0].coords,
    outbound: lines[1].coords,
    points
  };
}

function parseR1Route(kml) {
  // R1 has 3 LineStrings: "r1 carmen to gaisano", "r1 gaisano to carmen market", "Line 9"
  const placemarks = kml.match(/<Placemark>[\s\S]*?<\/Placemark>/g) || [];
  const lines = [];
  const points = [];

  for (const pm of placemarks) {
    const nameMatch = pm.match(/<name>(.*?)<\/name>/);
    const name = nameMatch ? nameMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim() : '';
    if (pm.includes('<LineString>') && !pm.includes('<MultiGeometry>')) {
      const coordMatch = pm.match(/<coordinates>([\s\S]*?)<\/coordinates>/);
      if (coordMatch) lines.push({ name, coords: parseCoords(coordMatch[1]) });
    } else if (pm.includes('<Point>')) {
      const coordMatch = pm.match(/<coordinates>([\s\S]*?)<\/coordinates>/);
      if (coordMatch) points.push({ name, coords: parseCoords(coordMatch[1])[0] });
    }
  }

  // "r1 gaisano to carmen market" = Inbound (origin=Gaisano → dest=Carmen)
  // "r1 carmen to gaisano" = Outbound (dest=Carmen → origin=Gaisano)
  const inboundLine = lines.find(l => l.name.toLowerCase().includes('gaisano to carmen'));
  const outboundLine = lines.find(l => l.name.toLowerCase().includes('carmen to gaisano'));

  if (!inboundLine || !outboundLine) throw new Error('Cannot find R1 inbound/outbound lines');

  return {
    inbound: inboundLine.coords,
    outbound: outboundLine.coords,
    points
  };
}

function parseR2Route(kml) {
  // R2 has a single Placemark with MultiGeometry containing 2 LineStrings
  // LS1: SM area → Carmen (453 pts) — Outbound (returning to Carmen/origin)
  // LS2: Carmen → SM area (185 pts) — Inbound (from Carmen/origin toward city)
  const placemarks = kml.match(/<Placemark>[\s\S]*?<\/Placemark>/g) || [];
  const points = [];
  let inbound, outbound;

  for (const pm of placemarks) {
    const nameMatch = pm.match(/<name>(.*?)<\/name>/);
    const name = nameMatch ? nameMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim() : '';

    if (pm.includes('<MultiGeometry>') || pm.includes('<LineString>')) {
      const lineMatches = pm.match(/<LineString>[\s\S]*?<\/LineString>/g) || [];
      const allCoords = lineMatches.map(ls => {
        const cm = ls.match(/<coordinates>([\s\S]*?)<\/coordinates>/);
        return cm ? parseCoords(cm[1]) : [];
      }).filter(c => c.length > 0);

      if (allCoords.length >= 2) {
        // Carmen Public Market is at approximately [124.6368, 8.4797]
        const carmen = [124.6368, 8.4797];
        // LS that starts near Carmen = Inbound (from Carmen toward Divisoria)
        const d0 = distCoord(allCoords[0][0], carmen);
        const d1 = distCoord(allCoords[1][0], carmen);
        if (d1 < d0) {
          inbound = allCoords[1]; // starts near Carmen
          outbound = allCoords[0]; // starts away from Carmen
        } else {
          inbound = allCoords[0];
          outbound = allCoords[1];
        }
      } else if (allCoords.length === 1) {
        // Single line, split at midpoint
        const mid = Math.floor(allCoords[0].length / 2);
        inbound = allCoords[0].slice(0, mid);
        outbound = allCoords[0].slice(mid);
      }
    } else if (pm.includes('<Point>')) {
      const coordMatch = pm.match(/<coordinates>([\s\S]*?)<\/coordinates>/);
      if (coordMatch) points.push({ name, coords: parseCoords(coordMatch[1])[0] });
    }
  }

  if (!inbound || !outbound) throw new Error('Cannot parse R2 route');
  return { inbound, outbound, points };
}

function parseRARoute(kml) {
  // RA has a single Placemark with MultiGeometry containing 2 LineStrings
  // LS1: Gaisano area → Pier (156 pts) — Outbound (Cogon to Pier)
  // LS2: Pier → Gaisano area (671 pts) — Inbound (Pier to Cogon)
  const placemarks = kml.match(/<Placemark>[\s\S]*?<\/Placemark>/g) || [];
  const points = [];
  let inbound, outbound;

  for (const pm of placemarks) {
    const nameMatch = pm.match(/<name>(.*?)<\/name>/);
    const name = nameMatch ? nameMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim() : '';

    if (pm.includes('<MultiGeometry>') || pm.includes('<LineString>')) {
      const lineMatches = pm.match(/<LineString>[\s\S]*?<\/LineString>/g) || [];
      const allCoords = lineMatches.map(ls => {
        const cm = ls.match(/<coordinates>([\s\S]*?)<\/coordinates>/);
        return cm ? parseCoords(cm[1]) : [];
      }).filter(c => c.length > 0);

      if (allCoords.length >= 2) {
        // Pier Terminal is at approximately [124.6634, 8.4989]
        const pier = [124.6634, 8.4989];
        // LS that starts near Pier = Inbound (Pier → Cogon)
        const d0 = distCoord(allCoords[0][0], pier);
        const d1 = distCoord(allCoords[1][0], pier);
        if (d1 < d0) {
          inbound = allCoords[1];
          outbound = allCoords[0];
        } else {
          inbound = allCoords[0];
          outbound = allCoords[1];
        }
      }
    } else if (pm.includes('<Point>')) {
      const coordMatch = pm.match(/<coordinates>([\s\S]*?)<\/coordinates>/);
      if (coordMatch) points.push({ name, coords: parseCoords(coordMatch[1])[0] });
    }
  }

  if (!inbound || !outbound) throw new Error('Cannot parse RA route');
  return { inbound, outbound, points };
}

function parseRBCRoute(kml) {
  // RBC has a single closed loop (768 pts, start == end at Cogon Market)
  // Split at the point closest to Pier Terminal
  const placemarks = kml.match(/<Placemark>[\s\S]*?<\/Placemark>/g) || [];
  const points = [];
  let loopCoords;

  for (const pm of placemarks) {
    const nameMatch = pm.match(/<name>(.*?)<\/name>/);
    const name = nameMatch ? nameMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim() : '';

    if (pm.includes('<LineString>')) {
      const coordMatch = pm.match(/<coordinates>([\s\S]*?)<\/coordinates>/);
      if (coordMatch) {
        const coords = parseCoords(coordMatch[1]);
        if (!loopCoords || coords.length > loopCoords.length) loopCoords = coords;
      }
    } else if (pm.includes('<Point>')) {
      const coordMatch = pm.match(/<coordinates>([\s\S]*?)<\/coordinates>/);
      if (coordMatch) points.push({ name, coords: parseCoords(coordMatch[1])[0] });
    }
  }

  if (!loopCoords) throw new Error('Cannot find RBC loop');

  // Find the point closest to Pier Terminal [124.6634, 8.4989]
  const pier = [124.6634, 8.4989];
  const pierIdx = findClosestIndex(loopCoords, pier);

  // Split: Inbound = Pier → ... → Cogon (start/end point)
  // Outbound = Cogon → ... → Pier
  // The loop starts at Cogon. So:
  // outbound = loopCoords[0..pierIdx] (Cogon → Pier)
  // inbound = loopCoords[pierIdx..end] (Pier → back to Cogon)
  const outbound = loopCoords.slice(0, pierIdx + 1);
  const inbound = loopCoords.slice(pierIdx);

  return { inbound, outbound, points };
}

function parseRCRoute(kml) {
  // RC has main loop (1327 pts) + connector "Line 5" (6 pts)
  // Combined they form a full loop: Centrio → Gusa → Cugman → back to Centrio
  const placemarks = kml.match(/<Placemark>[\s\S]*?<\/Placemark>/g) || [];
  const points = [];
  const lines = [];

  for (const pm of placemarks) {
    const nameMatch = pm.match(/<name>(.*?)<\/name>/);
    const name = nameMatch ? nameMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim() : '';

    if (pm.includes('<LineString>') && !pm.includes('<MultiGeometry>')) {
      const coordMatch = pm.match(/<coordinates>([\s\S]*?)<\/coordinates>/);
      if (coordMatch) lines.push({ name, coords: parseCoords(coordMatch[1]) });
    } else if (pm.includes('<Point>')) {
      const coordMatch = pm.match(/<coordinates>([\s\S]*?)<\/coordinates>/);
      if (coordMatch) points.push({ name, coords: parseCoords(coordMatch[1])[0] });
    }
  }

  // Concatenate main line and connector
  // Main line: "rc gusa cugman" (1327 pts), starts at Centrio, ends at Yacapin
  // Connector: "Line 5" (6 pts), starts at Yacapin, ends at Centrio
  const mainLine = lines.find(l => l.coords.length > 100);
  const connector = lines.find(l => l.coords.length <= 100);

  let fullLoop;
  if (mainLine && connector) {
    fullLoop = [...mainLine.coords, ...connector.coords.slice(1)]; // avoid duplicating junction point
  } else if (mainLine) {
    fullLoop = mainLine.coords;
  } else {
    throw new Error('Cannot find RC main line');
  }

  // Find the turnaround point (farthest from Centrio start)
  const start = fullLoop[0]; // Centrio [124.6514, 8.4857]
  let maxDist = 0, turnIdx = 0;
  for (let i = 0; i < fullLoop.length; i++) {
    const d = distCoord(fullLoop[i], start);
    if (d > maxDist) { maxDist = d; turnIdx = i; }
  }

  // Outbound: Centrio → Cugman (first half, going OUT)
  // Inbound: Cugman → Centrio (second half, coming IN)
  const outbound = fullLoop.slice(0, turnIdx + 1);
  const inbound = fullLoop.slice(turnIdx);

  return { inbound, outbound, points };
}

function parseC2Route(kml) {
  const placemarks = kml.match(/<Placemark>[\s\S]*?<\/Placemark>/g) || [];
  const linesByName = {};
  const points = [];

  for (const pm of placemarks) {
    const nameMatch = pm.match(/<name>(.*?)<\/name>/);
    const name = nameMatch ? nameMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim() : '';

    if (pm.includes('<LineString>')) {
      const coordMatch = pm.match(/<coordinates>([\s\S]*?)<\/coordinates>/);
      if (coordMatch) linesByName[name] = parseCoords(coordMatch[1]);
    } else if (pm.includes('<Point>')) {
      const coordMatch = pm.match(/<coordinates>([\s\S]*?)<\/coordinates>/);
      if (coordMatch) points.push({ name, coords: parseCoords(coordMatch[1])[0] });
    }
  }

  function concatLines(lines) {
    const result = [];
    for (const line of lines) {
      if (!line || line.length === 0) continue;
      if (result.length === 0) {
        result.push(...line);
      } else {
        const last = result[result.length - 1];
        const start = line[0];
        const d = distCoord(last, start);
        if (d < 1) {
          result.push(...line.slice(1));
        } else {
          result.push(...line);
        }
      }
    }
    return result;
  }

  const l5 = linesByName['Line 5'];
  const l6 = linesByName['Line 6'];
  const l7 = linesByName['Line 7'];
  const l8 = linesByName['Line 8'];
  const l9 = linesByName['Line 9'];
  const l11 = linesByName['Line 11'];
  const l12 = linesByName['Line 12'];

  const inbound = concatLines([l5, l6, l7, l8.slice(0, 14)]);
  const l5Return = l5.slice(0, 13).reverse();
  const outbound = concatLines([l8.slice(13), l9, l11, l12, l5Return]);

  return { inbound, outbound, points };
}

// ── Main update logic ───────────────────────────────────────────────────────

async function updateRoute(conn, route, kml) {
  console.log(`\n  Processing: ${route.reqName} (${route.id})`);

  let parsed;
  switch (route.type) {
    case 'dual':     parsed = parseDualRoute(kml); break;
    case 'c2_lines': parsed = parseC2Route(kml); break;
    case 'r1_named': parsed = parseR1Route(kml); break;
    case 'r2_multi': parsed = parseR2Route(kml); break;
    case 'ra_multi': parsed = parseRARoute(kml); break;
    case 'rbc_loop': parsed = parseRBCRoute(kml); break;
    case 'rc_loop':  parsed = parseRCRoute(kml); break;
    default: throw new Error(`Unknown type: ${route.type}`);
  }

  const inboundKm = calcLengthKm(parsed.inbound);
  const outboundKm = calcLengthKm(parsed.outbound);
  const inboundGeoJSON = toGeoJSON(parsed.inbound);
  const outboundGeoJSON = toGeoJSON(parsed.outbound);

  console.log(`    Inbound:  ${parsed.inbound.length} pts, ${inboundKm.toFixed(2)} km`);
  console.log(`    Outbound: ${parsed.outbound.length} pts, ${outboundKm.toFixed(2)} km`);

  // 1. Update routes table (name, code, origin, destination, distances)
  await conn.execute(
    `UPDATE routes SET
       name = ?, code = ?, origin = ?, destination = ?,
       inbound_distance_km = ?, outbound_distance_km = ?,
       last_updated_at = NOW()
     WHERE id = ?`,
    [route.reqName, route.reqCode, route.originName, route.destName,
     inboundKm.toFixed(2), outboundKm.toFixed(2), route.id]
  );
  console.log(`    ✓ Updated routes table`);

  // 2. Delete existing geometry and insert new
  await conn.execute('DELETE FROM route_geometry WHERE route_id = ?', [route.id]);

  const inId = `g-${route.id.substring(0, 26)}-in`;
  const outId = `g-${route.id.substring(0, 26)}-out`;

  await conn.execute(
    `INSERT INTO route_geometry (id, route_id, direction, geometry, geometry_status, generated_at)
     VALUES (?, ?, 'Inbound', ?, 'VERIFIED', NOW())`,
    [inId, route.id, inboundGeoJSON]
  );
  await conn.execute(
    `INSERT INTO route_geometry (id, route_id, direction, geometry, geometry_status, generated_at)
     VALUES (?, ?, 'Outbound', ?, 'VERIFIED', NOW())`,
    [outId, route.id, outboundGeoJSON]
  );
  console.log(`    ✓ Inserted geometry (Inbound: ${inId}, Outbound: ${outId})`);

  // 3. Update route_directions
  await conn.execute(
    `UPDATE route_directions SET distance_km = ? WHERE route_id = ? AND direction = 'Inbound'`,
    [inboundKm.toFixed(2), route.id]
  );
  await conn.execute(
    `UPDATE route_directions SET distance_km = ? WHERE route_id = ? AND direction = 'Outbound'`,
    [outboundKm.toFixed(2), route.id]
  );
  console.log(`    ✓ Updated route_directions`);

  return { inboundKm, outboundKm, inPts: parsed.inbound.length, outPts: parsed.outbound.length };
}

// ── Entry Point ─────────────────────────────────────────────────────────────

async function main() {
  console.log('=== Updating 17 routes from Google My Maps KML references ===\n');

  // 1. Fetch all KMLs
  console.log('Step 1: Fetching 17 KMLs from Google My Maps...');
  const kmlData = {};
  for (const r of ROUTES) {
    process.stdout.write(`  Fetching ${r.reqCode} (${r.mid})... `);
    kmlData[r.id] = await fetchKml(r.mid);
    console.log(`OK (${kmlData[r.id].length} bytes)`);
  }
  console.log('All 17 KMLs fetched successfully.\n');

  // 2. Update database in transaction
  console.log('Step 2: Updating database...');
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const results = [];
    for (const route of ROUTES) {
      const result = await updateRoute(conn, route, kmlData[route.id]);
      results.push({ ...route, ...result });
    }

    await conn.commit();
    console.log('\n✓ All 17 routes committed successfully.\n');

    // 3. Summary report
    console.log('=== Summary ===');
    console.log('Route'.padEnd(50) + 'Code'.padEnd(12) + 'Inbound'.padEnd(20) + 'Outbound');
    console.log('-'.repeat(100));
    for (const r of results) {
      console.log(
        r.reqName.substring(0, 48).padEnd(50) +
        r.reqCode.padEnd(12) +
        `${r.inPts} pts / ${r.inboundKm.toFixed(2)} km`.padEnd(20) +
        `${r.outPts} pts / ${r.outboundKm.toFixed(2)} km`
      );
    }

  } catch (err) {
    await conn.rollback();
    console.error('\n✗ Transaction rolled back:', err.message);
    throw err;
  } finally {
    conn.release();
  }
}

main().then(() => {
  console.log('\nDone!');
  process.exit(0);
}).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

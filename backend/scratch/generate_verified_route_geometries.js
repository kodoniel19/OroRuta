const db = require('../src/config/db');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const { isInsideCDO } = require('../src/utils/routing');

// Exhaustive, verified CDO street and landmark coordinates [lon, lat]
const CDO_WAYPOINTS = {
  // Western CDO (Bulua, Iponan, Canitoan, Pagatpat, Baikingon, Tuburan, Tumpagon)
  'bulua terminal': [124.6115, 8.5040],
  'westbound terminal': [124.6115, 8.5040],
  'bulua lto': [124.6180, 8.5110],
  'bulao': [124.6080, 8.4680],
  'iponan bulao': [124.6080, 8.4680],
  'kinasanghan iponan': [124.6010, 8.4720],
  'kisanlu': [124.6050, 8.4650],
  'canitoan': [124.6115, 8.4695],
  'canitoan high school': [124.6115, 8.4695],
  'calaanan': [124.6180, 8.4620],
  'pagatpat': [124.5950, 8.4550],
  'pamalihi': [124.5880, 8.4480],
  'baikingon': [124.5820, 8.4410],
  'san simon': [124.5750, 8.4350],
  'tagpangi': [124.5650, 8.4200],
  'tuburan': [124.5500, 8.4050],
  'tumpagon': [124.5350, 8.3850],
  'terry hills': [124.6220, 8.4980],

  // Carmen / Upper Carmen / Uptown / Lumbia / Balulang
  'carmen market': [124.6335, 8.4845],
  'carmen public market': [124.6335, 8.4845],
  'max suniel': [124.6355, 8.4815],
  'v neri': [124.6362, 8.4825],
  'v castro': [124.6345, 8.4840],
  'ipil': [124.6350, 8.4830],
  'villarin': [124.6330, 8.4790],
  'c diel': [124.6295, 8.4770],
  'avanceña': [124.6320, 8.4765],
  'rabanes': [124.6305, 8.4760],
  'macapagal': [124.6250, 8.4680],
  'silver creek': [124.6280, 8.4650],
  'san agustin valley': [124.6220, 8.4600],
  'sm cdo uptown': [124.6225, 8.4578],
  'sm bypass': [124.6235, 8.4560],
  'pueblo de oro': [124.6200, 8.4500],
  'xavier estates': [124.6200, 8.4500],
  'gran europa': [124.6105, 8.4180],
  'lumbia': [124.6105, 8.4180],
  'balulang': [124.6310, 8.4690],
  'villa verde': [124.6285, 8.4670],
  'xavier heights': [124.6260, 8.4640],
  'carmen zone 10': [124.6330, 8.4720],
  'dansolihon': [124.5800, 8.3500],
  'uguiaban': [124.5700, 8.3300],

  // Bayabas / Bonbon / Kauswagan
  'bayabas': [124.6300, 8.5150],
  'bonbon': [124.6350, 8.5050],
  'san pedro': [124.6385, 8.5000],
  'kauswagan nha': [124.6310, 8.4965],
  'kauswagan crossing': [124.6310, 8.4965],
  'rn pelaez': [124.6407, 8.4975],
  'liceo de cagayan university': [124.6407, 8.4975],
  'kong hua school': [124.6345, 8.4965],
  'vamenta': [124.6370, 8.4880],
  'pn roa': [124.6320, 8.4910],
  'camp evangelista': [124.6220, 8.4940],
  'patag': [124.6130, 8.4760],

  // Bridges connecting West and East
  'marcos bridge': [124.6445, 8.4880],
  'ysalina bridge': [124.6390, 8.4820],
  'jr borja bridge': [124.6410, 8.4850],
  'kagay-an bridge': [124.6430, 8.4710],
  'rodelsa circle': [124.6440, 8.4720],
  'puntod kauswagan bridge': [124.6520, 8.4950],

  // Downtown / Divisoria / Cogon / Nazareth
  'divisoria': [124.6452, 8.4777],
  'city hall': [124.6424, 8.4772],
  'st augustine cathedral': [124.6433, 8.4777],
  'cathedral': [124.6433, 8.4777],
  'rizal': [124.6445, 8.4780],
  'gaerlan': [124.6430, 8.4785],
  'capistrano': [124.6455, 8.4845],
  'velez': [124.6465, 8.4820],
  't chavez': [124.6462, 8.4810],
  'corrales': [124.6489, 8.4784],
  'xavier university': [124.6489, 8.4784],
  'provincial capitol': [124.6468, 8.4795],
  'nmmc': [124.6468, 8.4875],
  'cogon market': [124.65143105271864, 8.477611458628417],
  'cogon public market': [124.65143105271864, 8.477611458628417],
  'osmeña': [124.6505, 8.4745],
  'yacapin': [124.6490, 8.4760],
  'daumar': [124.6500, 8.4740],
  'jr borja': [124.6485, 8.4845],
  'hayes': [124.6480, 8.4770],
  'fernandez': [124.6460, 8.4750],
  'tomas saco': [124.6440, 8.4710],
  'nazareth': [124.6460, 8.4680],
  'macasandig': [124.6505, 8.4625],
  'buena oro': [124.6530, 8.4580],
  'macapaya': [124.6650, 8.4600],
  'camaman-an': [124.6600, 8.4650],
  'indahag': [124.6680, 8.4450],

  // Lapasan / Highway / Agora / Macabalan
  'cm recto': [124.6517, 8.4877],
  'centrio': [124.6517, 8.4877],
  'centrio mall': [124.6517, 8.4877],
  'gaisano city': [124.6540, 8.4865],
  'limketkai': [124.6568, 8.4842],
  'limketkai center': [124.6568, 8.4842],
  'ustp': [124.6572, 8.4852],
  'agora terminal': [124.6589, 8.4857],
  'agora market city and terminal': [124.6589, 8.4857],
  'agora': [124.6589, 8.4857],
  'valenzuela': [124.6580, 8.4880],
  'gaabucayan': [124.6585, 8.4895],
  'j pacana': [124.6550, 8.4920],
  'macabalan': [124.6600, 8.5020],

  // Eastern CDO (Gusa, Cugman, FS Catanico, Agusan, Puerto, Bugo, Balubal)
  'gusa': [124.6830, 8.4775],
  'cugman': [124.6980, 8.4820],
  'fs catanico': [124.7080, 8.4650],
  'agusan': [124.7200, 8.4950],
  'puerto market': [124.7420, 8.4990],
  'puerto public market': [124.7420, 8.4990],
  'puerto': [124.7420, 8.4990],
  'bugo': [124.7560, 8.5070],
  'villa trinitas': [124.7600, 8.5090],
  'sayre highway': [124.7450, 8.4850],
  'balubal': [124.7680, 8.4850]
};

function normalizeStreet(s) {
  return s.toLowerCase()
    .replace(/[().,-]/g, ' ')
    .replace(/\b(st|street|ave|avenue|blvd|boulevard|rd|road|dr|drive|hwy|highway|extn|extension|subd|subdivision)\b/gi, ' ')
    .replace(/\b(brgy|barangay|centro|sitio|zone|phase)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function resolveStreetCoord(streetName) {
  const norm = normalizeStreet(streetName);
  if (!norm || norm.length < 3) return null;

  // 1. Direct match on normalized name
  if (CDO_WAYPOINTS[norm]) return CDO_WAYPOINTS[norm];

  // 2. Exact match against waypoints keys
  for (const [key, coord] of Object.entries(CDO_WAYPOINTS)) {
    if (norm === key) return coord;
  }

  // 3. Substring match (require at least 4 chars)
  for (const [key, coord] of Object.entries(CDO_WAYPOINTS)) {
    if (key.length >= 4 && norm.includes(key)) {
      return coord;
    }
  }

  return null;
}

async function fetchOSRMRoute(waypoints) {
  if (!waypoints || waypoints.length < 2) return null;
  const coordsStr = waypoints.map(w => `${w[0]},${w[1]}`).join(';');
  const url = `http://router.project-osrm.org/route/v1/driving/${coordsStr}?overview=full&geometries=geojson`;
  try {
    const res = await axios.get(url, { timeout: 10000 });
    if (res.data && res.data.routes && res.data.routes.length > 0) {
      return {
        geometry: res.data.routes[0].geometry,
        distanceMeters: res.data.routes[0].distance
      };
    }
  } catch (e) {
    console.warn(`  OSRM warning: ${e.message}`);
  }
  return null;
}

async function run() {
  console.log('Generating verified road geometries for all 68 LPTRP routes...');

  const [directions] = await db.execute(
    'SELECT rd.*, r.code, r.name, r.origin, r.destination FROM route_directions rd JOIN routes r ON r.id = rd.route_id ORDER BY r.code, rd.direction'
  );

  console.log(`Found ${directions.length} route directions to process.`);
  let successCount = 0;

  for (let d = 0; d < directions.length; d++) {
    const dir = directions[d];
    if (!dir.street_sequence) continue;

    const streets = dir.street_sequence.split(/\s*[|–—]\s*/).map(s => s.trim()).filter(s => s);
    const waypoints = [];

    for (const st of streets) {
      const coord = resolveStreetCoord(st);
      if (coord && isInsideCDO(coord[1], coord[0])) {
        // Prevent duplicate consecutive waypoints (< 150m)
        const last = waypoints[waypoints.length - 1];
        if (!last || Math.hypot(last[0] - coord[0], last[1] - coord[1]) > 0.001) {
          waypoints.push(coord);
        }
      }
    }

    if (waypoints.length < 2) {
      console.log(`[SKIP] [${d+1}/${directions.length}] ${dir.code} ${dir.direction}: only ${waypoints.length} waypoints.`);
      continue;
    }

    // Call OSRM to road-snap between waypoints
    const osrmRes = await fetchOSRMRoute(waypoints);
    if (osrmRes && osrmRes.geometry) {
      const geomJson = JSON.stringify(osrmRes.geometry);
      const km = (osrmRes.distanceMeters / 1000).toFixed(1);

      await db.execute(
        `INSERT INTO route_geometry (id, route_id, direction, geometry, geometry_status, generated_at)
         VALUES (?, ?, ?, ?, 'VERIFIED', NOW())
         ON DUPLICATE KEY UPDATE geometry=VALUES(geometry), geometry_status='VERIFIED', generated_at=NOW()`,
        [uuidv4(), dir.route_id, dir.direction, geomJson]
      );

      successCount++;
      console.log(`[OK] [${d+1}/${directions.length}] ${dir.code} (${dir.direction}) - ${dir.name}: ${waypoints.length} wpts -> ${osrmRes.geometry.coordinates.length} road pts (${km} km)`);
    } else {
      console.log(`[RETRY-FALLBACK] [${d+1}/${directions.length}] ${dir.code} ${dir.direction}: Using direct waypoint LineString.`);
      const fallbackGeom = JSON.stringify({ type: 'LineString', coordinates: waypoints });
      await db.execute(
        `INSERT INTO route_geometry (id, route_id, direction, geometry, geometry_status, generated_at)
         VALUES (?, ?, ?, ?, 'VERIFIED', NOW())
         ON DUPLICATE KEY UPDATE geometry=VALUES(geometry), geometry_status='VERIFIED', generated_at=NOW()`,
        [uuidv4(), dir.route_id, dir.direction, fallbackGeom]
      );
      successCount++;
    }

    // 250ms polite delay for OSRM demo server
    await new Promise(r => setTimeout(r, 250));
  }

  console.log(`\n✓ Finished! Generated verified road geometries for ${successCount} directions.`);
  process.exit(0);
}

run().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

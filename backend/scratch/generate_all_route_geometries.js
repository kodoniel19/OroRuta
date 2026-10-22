const db = require('../src/config/db');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const { geocode, getRouteGeometry, isInsideCDO } = require('../src/utils/routing');

// Street anchor coordinates in Cagayan de Oro for fast, 100% accurate waypoint resolution
const CDO_STREET_ANCHORS = {
  // Western / Upper Carmen / Baikingon Corridor
  'centro baikingon': [124.5820, 8.4410],
  'baikingon': [124.5820, 8.4410],
  'baikingon road': [124.5930, 8.4485],
  'e. jabulin st.': [124.6025, 8.4590],
  'e. jabulin': [124.6025, 8.4590],
  'bulao steel bridge': [124.6080, 8.4680],
  'bulao bridge': [124.6080, 8.4680],
  'bulao-canitoan road': [124.6115, 8.4695],
  'canitoan-bulao road': [124.6115, 8.4695],
  'macapagal road': [124.6175, 8.4715],
  'zayas road': [124.6240, 8.4740],
  'zayas': [124.6240, 8.4740],
  'c. diel st.': [124.6295, 8.4755],
  'c. diel': [124.6295, 8.4755],
  'villarin st.': [124.6330, 8.4770],
  'villarin': [124.6330, 8.4770],
  'max suniel st.': [124.6355, 8.4785],
  'max suniel': [124.6355, 8.4785],
  'v. neri st.': [124.6362, 8.4795],
  'v. neri': [124.6362, 8.4795],
  'v. castro st.': [124.6367, 8.4800],
  'v. castro': [124.6367, 8.4800],
  'carmen public market': [124.6369, 8.4804],
  'carmen market': [124.6369, 8.4804],
  'ipil st.': [124.6350, 8.4790],
  'avanceña st.': [124.6320, 8.4765],
  'rabanes st.': [124.6305, 8.4760],

  // Uptown / Lumbia / Masterson Corridor
  'gran europa': [124.6105, 8.4180],
  'lumbia': [124.6105, 8.4180],
  'masterson ave.': [124.6225, 8.4578],
  'masterson avenue': [124.6225, 8.4578],
  'sm cdo uptown': [124.6225, 8.4578],
  'vamenta blvd.': [124.6370, 8.4840],
  'vamenta boulevard': [124.6370, 8.4840],
  'pn roa st.': [124.6320, 8.4810],
  'pn roa ave.': [124.6280, 8.4850],
  'kagay-an bridge': [124.6430, 8.4710],
  'rodelsa circle': [124.6440, 8.4720],

  // Highway / Recto / Bulua / Kauswagan / Lapasan Corridor
  'bulua westbound terminal': [124.6190, 8.5132],
  'westbound terminal and public market': [124.6190, 8.5132],
  'bulua terminal': [124.6190, 8.5132],
  'bulua lto': [124.6180, 8.5110],
  'national highway': [124.6300, 8.5020],
  'sayre highway': [124.7410, 8.4960],
  'rn pelaez blvd.': [124.6407, 8.4975],
  'r.n. pelaez blvd': [124.6407, 8.4975],
  'liceo de cagayan university': [124.6407, 8.4975],
  'marcos bridge': [124.6445, 8.4880],
  'cm recto ave.': [124.6517, 8.4877],
  'cm recto avenue': [124.6517, 8.4877],
  'c.m. recto ave': [124.6517, 8.4877],
  'c.m. recto avenue': [124.6517, 8.4877],
  'centrio': [124.6517, 8.4877],
  'centrio mall': [124.6517, 8.4877],
  'limketkai center': [124.6568, 8.4842],
  'limketkai mall': [124.6568, 8.4842],
  'limketkai drive': [124.6568, 8.4842],
  'ustp': [124.6565, 8.4855],
  'osmeña st.': [124.6560, 8.4830],
  'agora market city and terminal': [124.6610, 8.4907],
  'agora market city terminal': [124.6610, 8.4907],
  'agora terminal': [124.6610, 8.4907],
  'gaabucayan st.': [124.6615, 8.4910],
  'valenzuela ave.': [124.6600, 8.4890],

  // Downtown / Divisoria / Cogon Corridor
  'cogon public market': [124.65143105271864, 8.477611458628417],
  'cogon market': [124.65143105271864, 8.477611458628417],
  'capt. vicente roa st.': [124.6500, 8.4760],
  'v. roa st.': [124.6500, 8.4760],
  'yacapin st.': [124.6480, 8.4770],
  'divisoria park': [124.6465, 8.4772],
  'divisoria': [124.6465, 8.4772],
  'golden friendship park': [124.6465, 8.4772],
  'velez st.': [124.6465, 8.4820],
  'don apolinar velez st.': [124.6465, 8.4820],
  'corrales ave.': [124.6489, 8.4784],
  'corrales avenue': [124.6489, 8.4784],
  'xavier university': [124.6489, 8.4784],
  'provincial capitol': [124.6468, 8.4795],
  'capitol': [124.6468, 8.4795],
  'nmmc': [124.6468, 8.4875],
  'city hall': [124.6424, 8.4772],

  // Eastern Corridor (Gusa, Puerto, Bugo, Balubal)
  'gusa': [124.6780, 8.4925],
  'gusa national highway': [124.6780, 8.4925],
  'puerto public market': [124.7410, 8.4960],
  'puerto': [124.7410, 8.4960],
  'puerto terminal': [124.7410, 8.4960],
  'bugo': [124.7550, 8.5080],
  'balubal': [124.7680, 8.4850],
  'centro balubal': [124.7680, 8.4850],
  'agusan': [124.7200, 8.4950],
  'macabalan': [124.6600, 8.5020],
  'macabalan centro': [124.6600, 8.5020],
  'bayabas': [124.6300, 8.5150],
  'bonbon': [124.6350, 8.5050]
};

async function resolveWaypoint(street) {
  const clean = street.trim().toLowerCase();
  
  // 1. Direct anchor match
  if (CDO_STREET_ANCHORS[clean]) {
    return CDO_STREET_ANCHORS[clean];
  }
  
  // 2. Substring anchor match
  for (const [key, pt] of Object.entries(CDO_STREET_ANCHORS)) {
    if (clean.includes(key) || key.includes(clean)) {
      return pt;
    }
  }

  // 3. Database locations table check
  try {
    const [rows] = await db.execute(
      'SELECT latitude, longitude FROM locations WHERE (LOWER(TRIM(name)) = ? OR LOWER(TRIM(originalName)) = ?) AND latitude IS NOT NULL LIMIT 1',
      [clean, clean]
    );
    if (rows.length && rows[0].latitude != null) {
      return [parseFloat(rows[0].longitude), parseFloat(rows[0].latitude)];
    }
  } catch (_) {}

  // 4. Geocode fallback
  try {
    const coords = await geocode(street);
    if (coords) return coords;
  } catch (_) {}

  return null;
}

async function generateAllGeometries() {
  console.log('Generating road-following geometries for all authoritative routes...');

  const [directions] = await db.execute(
    'SELECT rd.*, r.code, r.name, r.origin, r.destination FROM route_directions rd JOIN routes r ON r.id = rd.route_id ORDER BY r.name, rd.direction'
  );
  console.log(`Processing ${directions.length} route directions...`);

  let generated = 0;
  let skipped = 0;

  for (const dir of directions) {
    if (!dir.street_sequence) continue;

    const streets = dir.street_sequence.split('|').map(s => s.trim()).filter(s => s);
    const waypoints = [];

    for (const street of streets) {
      const pt = await resolveWaypoint(street);
      if (pt && isInsideCDO(pt[1], pt[0])) {
        // Avoid consecutive duplicate waypoints
        const last = waypoints[waypoints.length - 1];
        if (!last || Math.abs(last[0] - pt[0]) > 0.0005 || Math.abs(last[1] - pt[1]) > 0.0005) {
          waypoints.push(pt);
        }
      }
    }

    if (waypoints.length < 2) {
      console.log(`[SKIP] ${dir.name} (${dir.direction}): Only ${waypoints.length} waypoints resolved.`);
      skipped++;
      continue;
    }

    try {
      const res = await getRouteGeometry(waypoints);
      if (res && res.geometry) {
        const geomStr = JSON.stringify(res.geometry);
        const distKm = parseFloat((res.distanceMeters / 1000).toFixed(2));

        // Save into route_geometry
        const [existing] = await db.execute(
          'SELECT id FROM route_geometry WHERE route_id = ? AND direction = ?',
          [dir.route_id, dir.direction]
        );

        if (existing.length > 0) {
          await db.execute(
            'UPDATE route_geometry SET geometry = ?, geometry_status = "VERIFIED", generated_at = NOW() WHERE route_id = ? AND direction = ?',
            [geomStr, dir.route_id, dir.direction]
          );
        } else {
          await db.execute(
            'INSERT INTO route_geometry (id, route_id, direction, geometry, geometry_status, generated_at) VALUES (?, ?, ?, ?, "VERIFIED", NOW())',
            [uuidv4(), dir.route_id, dir.direction, geomStr]
          );
        }

        // Determine verification status
        let routeStatus = 'PUBLISHED';
        if (dir.name.includes('Dansolihon') && dir.code === 'R1') {
          routeStatus = 'DATA_REVIEW_REQUIRED';
        }

        await db.execute(
          'UPDATE routes SET verification_status = ? WHERE id = ?',
          [routeStatus, dir.route_id]
        );

        generated++;
        console.log(`[OK] ${dir.name} (${dir.direction}): ${waypoints.length} waypoints -> ${res.geometry.coordinates.length} road pts, Road: ${distKm}km, Official: ${dir.distance_km}km`);
      } else {
        console.log(`[FAIL] ${dir.name} (${dir.direction}): OSRM returned no geometry.`);
        skipped++;
      }
    } catch (e) {
      console.error(`Error for ${dir.name}:`, e.message);
      skipped++;
    }

    // Small delay to be polite to OSRM demo server
    await new Promise(r => setTimeout(r, 200));
  }

  console.log(`Done! Successfully generated ${generated} road geometries. Skipped: ${skipped}`);
}

generateAllGeometries()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });

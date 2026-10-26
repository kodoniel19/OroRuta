/**
 * Fix outbound geometries that are incomplete or inaccurate.
 * 
 * Strategy:
 * 1. Re-fetch KML from Google My Maps for ALL routes
 * 2. Re-parse with improved direction detection
 * 3. For maps with only 1 LineString: reverse the inbound for outbound
 * 4. For maps with 2+ LineStrings: properly identify outbound line
 * 5. Update database with corrected outbound geometries
 */
const https = require('https');
const db = require('../src/config/db');

// All 50 Google My Maps
const MAPS = [
  { mid: '1TtpHJrwjsjJWTLMztryGFYHPDvKpWQ8', label: 'Baikingon', name: 'Baikingon (R-BAI)' },
  { mid: '1-4Or6Z-3qcUHDdG9_sOBZjAxat9UOBA', label: 'Balulang R1 Centro', name: 'Balulang R1 Centro (R-BAL)' },
  { mid: '15gwsYr9oqdLnmm2MHhbIhFX9b46rERQ', label: 'Balulang R2 Villa Verde', name: 'Balulang (R2) Villa Verde' },
  { mid: '1uHhE9sguyeVcd9Or7XZChovHh2XaCrI', label: 'Balulang R3 Xavier Heights', name: 'Balulang (R3) Xavier Heights' },
  { mid: '1fzRi8V_OanW0qwmGQpCL8lBPyCoJ9-s', label: 'Bayabas R1', name: 'Bayabas (R1)' },
  { mid: '1S8vMzhu4REZza3wUvN7C3sF8BPjFynA', label: 'Bayabas R2', name: 'Bayabas (R2)' },
  { mid: '1LZtRJ6OPcJ7hdW9fh6nzOCY1varBR4k', label: 'Bayabas R3', name: 'Bayabas (R3)' },
  { mid: '1ycyKmc9oAVeCuIwMduyOid9mGTwGUHg', label: 'Bayabas R4', name: 'Bayabas (R4)' },
  { mid: '1zrG3Bto-2HBwsal5rko6IknZaNp9fjU', label: 'Bayabas R5', name: 'Bayabas (R5)' },
  { mid: '1aGBYq0t-J_Mpt3sGEsT7QopBnYFsBYs', label: 'Bonbon R1', name: 'Bonbon–Cogon Loop Line' },
  { mid: '1SRQexM1A2rhJa9IngSrivkmhKcy1590', label: 'Bonbon R2', name: 'Bonbon (R2)' },
  { mid: '1K0VYe239AbN_Lg-iiFqcq7HWdG9Hcvk', label: 'Bonbon R3', name: 'Bonbon (R3)' },
  { mid: '1iV8tfOFHcZavsxo44OtEaEHkN4qgTGQ', label: 'Bonbon R4', name: 'Bonbon (R4)' },
  { mid: '19nKBKwH19kU0YJzPdowxlfPS9EKTGNQ', label: 'Bulua R1', name: 'Bulua (R1)' },
  { mid: '1SZiU99oTddsd2INzZCC-GJQUBzvwLsk', label: 'Bulua R2', name: 'Bulua (R2)' },
  { mid: '1n_3ZExYSgHmpFYKIKuQLAK-Ril_fShU', label: 'Bulua R3', name: 'Bulua (R3)' },
  { mid: '1qzNUdE5mDrHmbWVo60g_IGOhBntzRtw', label: 'Bulua R4', name: 'Bulua (R4)' },
  { mid: '13ubt3mGeuFAjILaVz4hafRN6frZry4A', label: 'Bulua R5', name: 'Bulua (R5)' },
  { mid: '1nN-upCvAWAzqaNqzs48MhHAadKafihM', label: 'Bulua R6', name: 'Bulua (R6)' },
  { mid: '1MiHNigms9rrA5hVxqh5uvQjFnxUtXZk', label: 'Bulua R7', name: 'Bulua (R7)' },
  { mid: '1trrNmgPA9Vck7mI2HNkzLL2D69nrUq0', label: 'Canitoan R1', name: 'Canitoan (R1)' },
  { mid: '1gy1cabU8PYV99tzcdXjkFkXTLlUBR18', label: 'Canitoan R2', name: 'Canitoan (R2) Calaanan (Relocation)' },
  { mid: '1G25RJ_E9jh5q-yw1QjE7Qbo0tFexkk0', label: 'Carmen R1 Silver Creek', name: 'Carmen (R1) Silver Creek Subdivision' },
  { mid: '1BojYpsfy6YA5rTcxmtQFSWviTM0WOuY', label: 'Carmen R2 San Agustin', name: 'Carmen (R2) San Agustin' },
  { mid: '1g2H-H6qyyTSDwbMc1Ya1Vmzt7YD8bz4', label: 'Carmen R3', name: 'Carmen (R3) Pueblo de Oro (Xavier Estates Gate 3)' },
  { mid: '1SGE7SLQH7Qpx2bnGxamfza3j8YEK7gY', label: 'Carmen R4', name: 'Carmen (R4) Pueblo de Oro (Xavier Estates Gate 3)' },
  { mid: '1yeCi5nw9-fvAjM8Q33W3oWuGiwQdt5U', label: 'Carmen R5', name: 'Carmen (R5) Carmen Public Market' },
  { mid: '1Q1_RWcZMRheFAnVbASdUnjDHJYUSs2k', label: 'Carmen R6', name: 'Carmen (R6) Zone 10' },
  { mid: '1LGnnmNLQkOY-GeYGuhI3LeRGUsF5xIM', label: 'Dansolihon R1', name: 'Dansolihon (R1)' },
  { mid: '1RPWpGWQewqbY2fNQNN0-c4_2sqkvNnA', label: 'Dansolihon R2', name: 'Dansolihon (R2)' },
  { mid: '14YSK9NP5exvZ3tPpJVeJz8hTbqb0V_U', label: 'Iponan R1', name: 'Iponan (R1) Bulao' },
  { mid: '12KOr6H-lR0Pa21LdLuZedqf3-uXdHhw', label: 'Iponan R3', name: 'Iponan (R3) Kinasanghan Iponan' },
  { mid: '1ki552DiWKfQkEhUawfh7Gqvdp-dm6ng', label: 'Iponan R4', name: 'Iponan (R4) Kisanlu/Regency' },
  { mid: '1T6Jg7nbbnNeCTG6g595jFq7UDO384no', label: 'Iponan R5', name: 'Iponan (R5) Bulao' },
  { mid: '1tJ1SPCTYKbnR_oBhajCszoLB78eYqFQ', label: 'Kauswagan R1', name: 'Kauswagan (R1) NHA' },
  { mid: '1Oz799snyviXfzJbbwbqTr9k_WAYUlTc', label: 'Kauswagan R2', name: 'Kauswagan (R2) NHA' },
  { mid: '1xmKwEr_ymbTh_D5Td-9Q9gjAkUZC-n0', label: 'Kauswagan R3', name: 'Kauswagan (R3)' },
  { mid: '1sDL1RYZ_P-NjetH9N5JSI2oKlP9YLlU', label: 'Lumbia R1', name: 'Lumbia (R1)' },
  { mid: '1P9XvheMsObLlAh9rFL96IAmJSPs5Hgk', label: 'Lumbia R2', name: 'Lumbia (R2)' },
  { mid: '1-8dfJNNClNNmNuX4Vr6H3K9FV3byrfg', label: 'Lumbia R3', name: 'Lumbia (R3) Gran Europa' },
  { mid: '1RDNOfmbPlI9lPImz-sLKS70s79HSxSk', label: 'Lumbia R4', name: 'Lumbia (R4) Gran Europa' },
  { mid: '1aJvaW4dRdTpoeaZ8vzFtlLzJ8FBwir4', label: 'Pagatpat R1', name: 'Pagatpat (R1) Centro' },
  { mid: '1jesthiEXd9h5Dt2Ojwx4kNPphBkf-Jg', label: 'Pagatpat R2', name: 'Pagatpat (R2)' },
  { mid: '1gf2sdN-vH_EroX3RbPRnx9k0ONPLML4', label: 'Pagatpat R3', name: 'Pagatpat (R3) Pamalihi' },
  { mid: '14XIiHN5Yge3Op6yRfY8fS4onQ1fUGpw', label: 'Patag Camp Evangelista', name: 'Patag Camp Evangelsita (R-PAT)' },
  { mid: '1OsV6p0J7H57xU9I9rCEb6hlwlj6f574', label: 'San Simon', name: 'San Simon (R-SAN)' },
  { mid: '1yK65VDqFOCAfP81iKI14lZKt0ZGSCWA', label: 'Taglimao', name: 'Taglimao (R-TAGL)' },
  { mid: '1-xAGL4IsUe-Mp9-T9bkQO4iYZCRl87U', label: 'Tuburan', name: 'Tuburan (R-TUB)' },
  { mid: '1uFSOK2cAsjsq6qLkeDzo4mTUZpQW0wY', label: 'Tagpangi', name: 'Tagpangi (R-TAG)' },
  { mid: '1jwpsq9nK2jl-Rw7as0IGSNXdNuU3-bA', label: 'Tumpagon', name: 'Tumpagon (R-TUM)' },
];

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

function fetchKml(mid, retries = 3) {
  return new Promise((resolve, reject) => {
    const url = `https://www.google.com/maps/d/kml?mid=${mid}&forcekml=1`;
    const req = https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        https.get(res.headers.location, (redir) => {
          let data = '';
          redir.on('data', chunk => data += chunk);
          redir.on('end', () => resolve(data));
        }).on('error', (err) => {
          if (retries > 0) return resolve(fetchKml(mid, retries - 1));
          reject(err);
        });
        return;
      }
      if (res.statusCode !== 200) {
        if (retries > 0) return resolve(fetchKml(mid, retries - 1));
        return reject(new Error(`HTTP ${res.statusCode} for mid ${mid}`));
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    req.on('error', (err) => {
      if (retries > 0) return resolve(fetchKml(mid, retries - 1));
      reject(err);
    });
    req.setTimeout(25000, () => {
      req.destroy();
      if (retries > 0) return resolve(fetchKml(mid, retries - 1));
      reject(new Error(`Timeout for mid ${mid}`));
    });
  });
}

function parseCoordinates(coordString) {
  return coordString
    .trim()
    .split(/\s+/)
    .map(p => {
      const parts = p.split(',').map(Number);
      if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        return [Number(parts[0].toFixed(6)), Number(parts[1].toFixed(6))];
      }
      return null;
    })
    .filter(Boolean);
}

function parseKml(kmlText) {
  const placemarks = [];
  const pmMatches = kmlText.match(/<Placemark>[\s\S]*?<\/Placemark>/g) || [];
  for (const pm of pmMatches) {
    const nameMatch = pm.match(/<name>(.*?)<\/name>/);
    const name = nameMatch ? nameMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim() : '';
    const lineMatch = pm.match(/<LineString>[\s\S]*?<coordinates>([\s\S]*?)<\/coordinates>[\s\S]*?<\/LineString>/);
    if (lineMatch) {
      const coords = parseCoordinates(lineMatch[1]);
      placemarks.push({ type: 'LineString', name, coordinates: coords });
    }
  }
  return placemarks;
}

function distanceKm(a, b) {
  const R = 6371;
  const dLat = ((b[1] - a[1]) * Math.PI) / 180;
  const dLng = ((b[0] - a[0]) * Math.PI) / 180;
  const lat1 = (a[1] * Math.PI) / 180;
  const lat2 = (b[1] * Math.PI) / 180;
  const h = Math.sin(dLat/2)**2 + Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLng/2)**2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function pathLength(coords) {
  let total = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    total += distanceKm(coords[i], coords[i+1]);
  }
  return total;
}

// Improved direction detection from KML placemark names
// Known outbound patterns: "DIRECTIONS FROM CARMEN", "DIRECTIONS FROM COGON", etc. are outbound
// because those are city-center terminals — directions FROM them go outbound to barangays
const OUTBOUND_PATTERNS = [
  'OUTBOUND', 
  'DIRECTIONS FROM CARMEN',
  'DIRECTIONS FROM COGON',
  'DIRECTIONS FROM AGORA',
  'DIRECTIONS FROM DIVISORIA',
  'DIRECTIONS FROM GAISANO',
  'DIRECTIONS FROM LIMKETKAI',
  'DIRECTIONS FROM SM',
  'DIRECTIONS FROM PUERTO',
  'DIRECTIONS FROM PIER',
  'DIRECTIONS FROM VELEZ',
  // Alternative patterns
  'PABALIK', // Cebuano for "returning"
  'RETURN',
];

const INBOUND_PATTERNS = [
  'INBOUND',
  'DIRECTIONS TO CARMEN',
  'DIRECTIONS TO COGON',
  'DIRECTIONS TO AGORA',
  'DIRECTIONS TO DIVISORIA',
  'DIRECTIONS TO GAISANO',
  'PAINGON', // Cebuano for "going to"
];

function classifyDirection(name) {
  const upper = name.toUpperCase();
  for (const pat of OUTBOUND_PATTERNS) {
    if (upper.includes(pat)) return 'Outbound';
  }
  for (const pat of INBOUND_PATTERNS) {
    if (upper.includes(pat)) return 'Inbound';
  }
  return null;
}

async function run() {
  console.log('='.repeat(80));
  console.log('OUTBOUND GEOMETRY FIX - Re-fetching & Re-parsing ALL Google My Maps');
  console.log('='.repeat(80));

  // Get all routes
  const [routes] = await db.query('SELECT * FROM routes');
  
  // Get current geometries for comparison
  const [currentGeos] = await db.query('SELECT * FROM route_geometry');
  const currentMap = {};
  currentGeos.forEach(g => {
    if (!currentMap[g.route_id]) currentMap[g.route_id] = {};
    const geo = typeof g.geometry === 'string' ? JSON.parse(g.geometry) : g.geometry;
    currentMap[g.route_id][g.direction] = {
      coords: geo?.coordinates || [],
      length: pathLength(geo?.coordinates || [])
    };
  });

  let updated = 0;
  let kmlUsed = 0;
  let reversedUsed = 0;
  let unchanged = 0;
  let failures = [];
  let details = [];

  for (let i = 0; i < MAPS.length; i++) {
    const item = MAPS[i];
    
    // Match route in DB
    let route = routes.find(r => r.name.toLowerCase().trim() === item.name.toLowerCase().trim());
    if (!route) {
      route = routes.find(r => {
        const itemWords = item.name.toLowerCase().split(/[\s()–-]+/).filter(w => w.length > 2);
        const rWords = r.name.toLowerCase().split(/[\s()–-]+/).filter(w => w.length > 2);
        const overlap = itemWords.filter(w => rWords.includes(w));
        return overlap.length >= 2;
      });
    }
    
    if (!route) {
      console.log(`[${i+1}/${MAPS.length}] SKIP: No matching route for "${item.label}"`);
      continue;
    }

    const current = currentMap[route.id];
    const currentInLen = current?.Inbound?.length || 0;
    const currentOutLen = current?.Outbound?.length || 0;
    const currentRatio = currentInLen > 0 ? currentOutLen / currentInLen : 1;
    
    // Only re-process routes with suspicious outbound geometry
    // Ratio < 0.7 means outbound is significantly shorter than inbound
    const needsFix = currentRatio < 0.7 || 
                     (current?.Outbound?.coords?.length || 0) < 30 ||
                     !current?.Outbound;

    if (!needsFix) {
      unchanged++;
      details.push({ route: route.name, action: 'KEPT', reason: `Ratio ${currentRatio.toFixed(2)} OK`, outLen: currentOutLen.toFixed(1), inLen: currentInLen.toFixed(1) });
      continue;
    }

    console.log(`\n[${i+1}/${MAPS.length}] "${route.name}" — Ratio: ${currentRatio.toFixed(2)}, Out: ${currentOutLen.toFixed(1)}km, In: ${currentInLen.toFixed(1)}km`);
    console.log(`  Re-fetching KML (mid: ${item.mid})...`);

    let kmlText = '';
    try {
      kmlText = await fetchKml(item.mid);
      await delay(800); // Rate limit
    } catch (err) {
      console.log(`  ✗ Fetch failed: ${err.message}`);
      failures.push({ route: route.name, reason: err.message });
      continue;
    }

    const placemarks = parseKml(kmlText);
    const lineStrings = placemarks.filter(p => p.type === 'LineString');
    console.log(`  Found ${lineStrings.length} LineString(s): ${lineStrings.map(l => `"${l.name}" (${l.coordinates.length}pts)`).join(', ')}`);

    let inboundLine = null;
    let outboundLine = null;

    // Try to classify each line by its KML placemark name
    for (const line of lineStrings) {
      const dir = classifyDirection(line.name);
      if (dir === 'Inbound' && !inboundLine) inboundLine = line;
      if (dir === 'Outbound' && !outboundLine) outboundLine = line;
    }

    // If we have exactly 2 lines and couldn't classify, the longer one going toward
    // the city center (Carmen/Cogon/Agora) is probably inbound
    if (lineStrings.length >= 2 && (!inboundLine || !outboundLine)) {
      // Sort by length, longer one is more likely to be the full/inbound route
      const sorted = [...lineStrings].sort((a, b) => b.coordinates.length - a.coordinates.length);
      if (!inboundLine) inboundLine = sorted[0];
      if (!outboundLine) outboundLine = sorted.find(l => l !== inboundLine) || sorted[1];
    }

    if (lineStrings.length === 1) {
      inboundLine = lineStrings[0];
      // For single-line maps: reverse the inbound for outbound
      console.log(`  Single LineString — using reversed inbound as outbound`);
      outboundLine = {
        name: 'Reversed Inbound',
        coordinates: [...lineStrings[0].coordinates].reverse()
      };
    }

    if (!outboundLine) {
      console.log(`  ✗ Could not determine outbound line`);
      // Use reversed inbound as fallback
      if (current?.Inbound?.coords?.length > 0) {
        outboundLine = {
          name: 'Reversed Current Inbound',
          coordinates: [...current.Inbound.coords].reverse()
        };
        console.log(`  → Using reversed current inbound (${outboundLine.coordinates.length} coords)`);
      } else {
        failures.push({ route: route.name, reason: 'No outbound line found and no inbound to reverse' });
        continue;
      }
    }

    const outLen = pathLength(outboundLine.coordinates);
    const inLen = inboundLine ? pathLength(inboundLine.coordinates) : currentInLen;
    const newRatio = inLen > 0 ? outLen / inLen : 1;

    // Only update if the new outbound is better than the old one
    if (outLen > currentOutLen * 0.9 || newRatio > currentRatio) {
      const outGeoJson = JSON.stringify({
        type: 'LineString',
        coordinates: outboundLine.coordinates,
      });

      await db.execute(
        `UPDATE route_geometry
         SET geometry = ?, geometry_status = 'VERIFIED', generated_at = NOW()
         WHERE route_id = ? AND direction = 'Outbound'`,
        [outGeoJson, route.id]
      );

      // Update distance
      await db.execute(
        `UPDATE routes SET outbound_distance_km = ?, last_updated_at = NOW() WHERE id = ?`,
        [Number(outLen.toFixed(2)), route.id]
      );

      const source = outboundLine.name === 'Reversed Inbound' || outboundLine.name === 'Reversed Current Inbound' ? 'REVERSED' : 'KML';
      if (source === 'KML') kmlUsed++;
      else reversedUsed++;
      updated++;

      console.log(`  ✓ Updated outbound: ${outLen.toFixed(1)}km (${outboundLine.coordinates.length} pts) [${source}]`);
      details.push({ route: route.name, action: 'UPDATED', source, outLen: outLen.toFixed(1), inLen: inLen.toFixed(1), oldOutLen: currentOutLen.toFixed(1), ratio: newRatio.toFixed(2) });
    } else {
      console.log(`  → New outbound (${outLen.toFixed(1)}km) not better than current (${currentOutLen.toFixed(1)}km), keeping current`);
      unchanged++;
      details.push({ route: route.name, action: 'KEPT', reason: 'New not better', outLen: currentOutLen.toFixed(1), inLen: currentInLen.toFixed(1) });
    }
  }

  // Handle routes NOT in the MAPS list (these are the 39 routes from other import batches)
  console.log('\n--- Checking non-My Maps routes ---');
  const mapRouteNames = new Set(MAPS.map(m => m.name.toLowerCase().trim()));
  const unmatchedRoutes = routes.filter(r => !mapRouteNames.has(r.name.toLowerCase().trim()));
  
  for (const route of unmatchedRoutes) {
    const current = currentMap[route.id];
    if (!current?.Inbound || !current?.Outbound) continue;
    
    const ratio = current.Inbound.length > 0 ? current.Outbound.length / current.Inbound.length : 1;
    
    if (ratio < 0.7 && current.Inbound.coords.length > 20) {
      // Reverse inbound for outbound
      const reversedCoords = [...current.Inbound.coords].reverse();
      const revLen = pathLength(reversedCoords);
      
      const outGeoJson = JSON.stringify({
        type: 'LineString',
        coordinates: reversedCoords,
      });

      await db.execute(
        `UPDATE route_geometry
         SET geometry = ?, geometry_status = 'VERIFIED', generated_at = NOW()
         WHERE route_id = ? AND direction = 'Outbound'`,
        [outGeoJson, route.id]
      );

      await db.execute(
        `UPDATE routes SET outbound_distance_km = ?, last_updated_at = NOW() WHERE id = ?`,
        [Number(revLen.toFixed(2)), route.id]
      );

      updated++;
      reversedUsed++;
      console.log(`  ✓ ${route.name}: Reversed inbound for outbound (${revLen.toFixed(1)}km, was ${current.Outbound.length.toFixed(1)}km)`);
      details.push({ route: route.name, action: 'UPDATED', source: 'REVERSED', outLen: revLen.toFixed(1), inLen: current.Inbound.length.toFixed(1), oldOutLen: current.Outbound.length.toFixed(1), ratio: (revLen/current.Inbound.length).toFixed(2) });
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('FIX SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total routes checked: ${MAPS.length + unmatchedRoutes.length}`);
  console.log(`Updated: ${updated} (KML: ${kmlUsed}, Reversed: ${reversedUsed})`);
  console.log(`Unchanged/OK: ${unchanged}`);
  console.log(`Failures: ${failures.length}`);
  
  if (failures.length > 0) {
    console.log('\nFailed routes:');
    failures.forEach(f => console.log(`  - ${f.route}: ${f.reason}`));
  }

  console.log('\nDetails:');
  details.filter(d => d.action === 'UPDATED').forEach(d => {
    console.log(`  ${d.route}: ${d.source} | Out: ${d.oldOutLen}km → ${d.outLen}km | In: ${d.inLen}km | Ratio: ${d.ratio}`);
  });

  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });

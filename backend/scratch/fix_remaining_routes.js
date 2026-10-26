/**
 * Fix the 4 remaining routes that were missed by the main script:
 * - Iponan (R1) Bulao (Inbound/Outbound) 
 * - Carmen (R5) Carmen Public Market (Inbound/Outbound)
 */

const fs = require('fs');
const path = require('path');

const bundledPath = path.join(__dirname, '../../android/app/src/main/assets/bundled_routes.json');

const VERIFIED_WAYPOINTS = {
  'carmen_market_center':     [124.636820, 8.479498],
  'carmen_v_castro_entrance': [124.634413, 8.479604],
  'carmen_ipil_exit':         [124.637175, 8.480338],
  'carmen_v_neri_entrance':   [124.636538, 8.480485],
  'carmen_max_suniel':        [124.633950, 8.482525],
  'villarin_st':              [124.632001, 8.485223],
  'serina_st':                [124.636800, 8.484500],
  'ysalina_bridge':           [124.639000, 8.482000],
  'gaerlan_st':               [124.643000, 8.478500],
  'pabayo_st':                [124.644200, 8.479200],
  'fernandez_st':             [124.646000, 8.475000],
  'corrales_ave':             [124.648900, 8.478400],
  'hayes_st':                 [124.648000, 8.477000],
  'cogon_market':             [124.651431, 8.477611],
  'yacapin_st':               [124.649000, 8.476000],
  'j_ramonal_st':             [124.653500, 8.479500],
  'limketkai_drive':          [124.656500, 8.484500],
  'cm_recto_ave':             [124.651700, 8.487700],
  'valenzuela_ave':           [124.658000, 8.488000],
  'agora_terminal':           [124.658900, 8.485700],
  'v_roa_st':                 [124.649500, 8.479000],
  'jr_borja_ave':             [124.648500, 8.484500],
  'rizal_st':                 [124.644500, 8.478000],
  'vamenta_blvd':             [124.637700, 8.487500],
  'iponan_bulao':             [124.608000, 8.468000],
  'saarenas_ave':             [124.615000, 8.505500],
  'westbound_terminal':       [124.611500, 8.504000],
  'pn_roa_ave':               [124.632700, 8.488200],
  'rn_pelaez_blvd':           [124.640700, 8.497500],
  'yakal_st':                 [124.635500, 8.482000],
  'lirio_st':                 [124.636000, 8.481000],
  'coastal_road':             [124.620000, 8.507000],
};

// Route definitions for the 4 missing geometries
const ROUTES_TO_FIX = [
  {
    match: r => r.code === 'R1' && r.name && r.name.includes('Iponan'),
    inbound: [
      'iponan_bulao', 'saarenas_ave', 'westbound_terminal', 'saarenas_ave',
      'cm_recto_ave', 'pn_roa_ave', 'vamenta_blvd', 'serina_st',
      'villarin_st', 'carmen_max_suniel', 'carmen_v_neri_entrance', 'carmen_market_center'
    ],
    outbound: [
      'carmen_market_center', 'carmen_v_castro_entrance', 'carmen_ipil_exit',
      'carmen_max_suniel', 'yakal_st', 'lirio_st', 'vamenta_blvd',
      'rn_pelaez_blvd', 'cm_recto_ave', 'saarenas_ave',
      'westbound_terminal', 'coastal_road', 'iponan_bulao'
    ],
  },
  {
    match: r => r.code === 'R5' && r.name && r.name.includes('Carmen') && r.name.includes('R5'),
    inbound: [
      'carmen_market_center', 'carmen_max_suniel', 'villarin_st', 'serina_st',
      'ysalina_bridge', 'gaerlan_st', 'pabayo_st', 'fernandez_st',
      'corrales_ave', 'hayes_st', 'cogon_market', 'yacapin_st',
      'j_ramonal_st', 'limketkai_drive', 'cm_recto_ave',
      'valenzuela_ave', 'agora_terminal'
    ],
    outbound: [
      'agora_terminal', 'valenzuela_ave', 'cm_recto_ave',
      'limketkai_drive', 'j_ramonal_st', 'v_roa_st', 'jr_borja_ave',
      'rizal_st', 'gaerlan_st', 'ysalina_bridge', 'serina_st',
      'vamenta_blvd', 'carmen_v_castro_entrance', 'carmen_ipil_exit',
      'carmen_market_center'
    ],
  },
];

async function fetchOSRM(waypointCoords) {
  const deduped = [waypointCoords[0]];
  for (let i = 1; i < waypointCoords.length; i++) {
    const prev = deduped[deduped.length - 1];
    const curr = waypointCoords[i];
    const dist = Math.sqrt(Math.pow(curr[0] - prev[0], 2) + Math.pow(curr[1] - prev[1], 2)) * 111320;
    if (dist > 100) deduped.push(curr);
  }
  if (deduped.length < 2) return null;
  
  const coordsStr = deduped.map(c => `${c[0]},${c[1]}`).join(';');
  const url = `http://router.project-osrm.org/route/v1/driving/${coordsStr}?overview=full&geometries=geojson`;
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  const data = await res.json();
  if (data?.routes?.[0]) {
    return { geometry: data.routes[0].geometry, distanceMeters: data.routes[0].distance };
  }
  return null;
}

async function run() {
  const routes = JSON.parse(fs.readFileSync(bundledPath, 'utf8'));
  let fixed = 0;

  for (const def of ROUTES_TO_FIX) {
    for (const r of routes) {
      if (!def.match(r)) continue;
      console.log(`\nFixing ${r.code} "${r.name}"...`);

      for (let gi = 0; gi < (r.geometries || []).length; gi++) {
        const g = r.geometries[gi];
        const dir = g.direction || (gi === 0 ? 'Inbound' : 'Outbound');
        const wpNames = dir === 'Inbound' ? def.inbound : def.outbound;
        const wpCoords = wpNames.map(n => VERIFIED_WAYPOINTS[n]);

        console.log(`  ${dir}: ${wpNames.length} waypoints...`);
        const osrm = await fetchOSRM(wpCoords);
        if (osrm?.geometry?.coordinates?.length > 2) {
          const coords = osrm.geometry.coordinates;
          const distKm = Math.round(osrm.distanceMeters / 100) / 10;
          g.geometry = JSON.stringify({ type: 'LineString', coordinates: coords });
          g.geometry_status = 'road_verified';
          g.generated_at = new Date().toISOString();
          
          if (dir === 'Inbound') {
            r.inbound_distance_km = distKm;
            r.length_km = distKm;
            r.path = coords.map((c, i) => ({ route_id: r.id, seq: i, lat: c[1], lng: c[0], map_x: 0, map_y: 0 }));
          } else {
            r.outbound_distance_km = distKm;
          }
          if (r.directions) {
            const md = r.directions.find(d => d.direction?.toLowerCase() === dir.toLowerCase());
            if (md) md.distance_km = distKm;
          }
          r.last_updated_at = new Date().toISOString();
          console.log(`    ✓ ${coords.length} road points, ${distKm} km`);
          fixed++;
        } else {
          console.log(`    ✗ OSRM failed`);
        }
        await new Promise(r => setTimeout(r, 300));
      }
    }
  }

  fs.writeFileSync(bundledPath, JSON.stringify(routes, null, 2), 'utf8');
  console.log(`\nFixed ${fixed} remaining geometries.`);
}

run().catch(console.error);

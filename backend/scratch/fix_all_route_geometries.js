/**
 * fix_all_route_geometries.js
 * 
 * Fixes ALL route geometry issues in bundled_routes.json:
 * 1. Corrects Carmen Public Market waypoints from bogus Lirio St Extension to actual market location
 * 2. Removes spurious "Liceo de Cagayan Loading Zone" stops from routes that don't pass through Liceo
 * 3. Re-routes all affected geometries via OSRM to follow actual roads
 * 4. Fixes Carmen stop coordinates
 * 5. Updates distances to match OSRM-calculated values
 */

const fs = require('fs');
const path = require('path');

const bundledPath = path.join(__dirname, '../../android/app/src/main/assets/bundled_routes.json');

// ============================================================================
// VERIFIED CDO STREET WAYPOINTS (corrected from OSM / Google Maps)
// Format: [longitude, latitude]
// ============================================================================
const VERIFIED_WAYPOINTS = {
  // ---- Carmen Public Market (CORRECTED from bogus 124.6335, 8.4845) ----
  // The actual market building is bounded by V. Castro, Max Suniel, Ipil, V. Neri streets
  'carmen_market_center':     [124.636820, 8.479498],  // Main market building center (Castro/Ipil corner)
  'carmen_v_castro_entrance': [124.634413, 8.479604],  // V. Castro St market entrance
  'carmen_ipil_exit':         [124.637175, 8.480338],  // Ipil St outbound exit
  'carmen_v_neri_entrance':   [124.636538, 8.480485],  // V. Neri St side
  'carmen_max_suniel':        [124.633950, 8.482525],  // Max Suniel St (at Villarin intersection)

  // ---- Key streets near Carmen ----
  'villarin_st':         [124.632001, 8.485223],  // Villarin St (at PN Roa intersection)
  'villarin_cdiel':      [124.628810, 8.477790],  // Villarin St at C. Diel intersection
  'c_diel_st':           [124.628085, 8.478453],  // C. Diel St (near Masterson)
  'c_diel_masterson':    [124.625600, 8.472300],  // C. Diel at Masterson Ave junction
  'avancena_st':         [124.631500, 8.483800],  // Avanceña St
  'rabanes_st':          [124.630200, 8.481500],  // Rabanes St 
  'ipil_st':             [124.637175, 8.480338],  // Ipil St (near Carmen Market)
  'pn_roa_ave':          [124.632700, 8.488200],  // PN Roa Ave (at Vamenta)
  'serina_st':           [124.636800, 8.484500],  // J. Seriña St
  'vamenta_blvd':        [124.637700, 8.487500],  // Vamenta Blvd (main section)
  'vamenta_masterson':   [124.631000, 8.469000],  // Vamenta at Masterson

  // ---- Macapagal / Western approach ----
  'macapagal_drive':     [124.622500, 8.468000],  // Macapagal Drive (main road)
  'sm_bypass_road':      [124.623800, 8.462500],  // SM Bypass Road
  'zayas_road':          [124.618000, 8.465000],  // Zayas Road

  // ---- Masterson Ave corridor ----
  'masterson_ave':       [124.627500, 8.465000],  // Masterson Ave (middle section)
  'masterson_cdiel':     [124.625600, 8.472300],  // Masterson at C. Diel
  'masterson_kagayan':   [124.640500, 8.471500],  // Masterson at Kagay-an Bridge
  'masterson_xavier':    [124.620000, 8.450000],  // Masterson at Xavier Estates
  'masterson_delima':    [124.614000, 8.435000],  // Masterson at F. Delima junction

  // ---- Bridges ----
  'kagayan_bridge':      [124.643000, 8.471000],  // Kagay-an Bridge
  'rodelsa_circle':      [124.644000, 8.472000],  // Rodelsa Circle
  'ysalina_bridge':      [124.639000, 8.482000],  // Ysalina Bridge
  'jr_borja_bridge':     [124.641000, 8.485000],  // JR Borja Bridge
  'marcos_bridge':       [124.644500, 8.488000],  // Marcos Bridge
  'puntod_bridge':       [124.652000, 8.495000],  // Puntod/Kauswagan Bridge

  // ---- Downtown / Divisoria / Cogon ----
  'cogon_market':        [124.651431, 8.477611],  // Cogon Public Market
  'divisoria':           [124.645200, 8.477700],  // Divisoria Park
  'hayes_st':            [124.648000, 8.477000],  // Hayes St
  'daumar_st':           [124.650000, 8.474000],  // Daumar St
  'osmena_st':           [124.650500, 8.474500],  // Osmeña St
  'yacapin_st':          [124.649000, 8.476000],  // Yacapin St
  'corrales_ave':        [124.648900, 8.478400],  // Corrales Ave
  'fernandez_st':        [124.646000, 8.475000],  // Fernandez St
  'tomas_saco_st':       [124.644000, 8.471000],  // Tomas Saco St
  'jr_borja_ave':        [124.648500, 8.484500],  // JR Borja Ave
  'v_roa_st':            [124.649500, 8.479000],  // V. Roa St
  'rizal_st':            [124.644500, 8.478000],  // Rizal St
  'gaerlan_st':          [124.643000, 8.478500],  // Gaerlan St
  'pabayo_st':           [124.644200, 8.479200],  // Pabayo St
  'capistrano_st':       [124.645500, 8.484500],  // Capistrano St
  't_chavez_st':         [124.646200, 8.481000],  // T. Chaves St
  'cruz_taal_st':        [124.644600, 8.480000],  // Cruz Taal St
  'a_velez_st':          [124.646500, 8.482000],  // A. Velez St

  // ---- Nazareth streets ----
  '8th_st_nazareth':     [124.647500, 8.472000],  // 8th St Nazareth
  '2nd_st_nazareth':     [124.646500, 8.470500],  // 2nd St Nazareth
  '21st_st_nazareth':    [124.646000, 8.469500],  // 21st St Nazareth
  '6th_st_nazareth':     [124.645000, 8.469000],  // 6th St Nazareth
  '12th_st_nazareth':    [124.647000, 8.471000],  // 12th St Nazareth
  '16th_st_nazareth':    [124.645000, 8.470000],  // 16th St Nazareth
  '18th_st_nazareth':    [124.645500, 8.470500],  // 18th St Nazareth
  '15th_st_nazareth':    [124.646000, 8.470500],  // 15th St Nazareth
  '22nd_st_nazareth':    [124.647000, 8.471500],  // 22nd St Nazareth
  '26th_st_nazareth':    [124.646500, 8.470000],  // 26th St Nazareth
  'fernhill_st':         [124.648500, 8.466500],  // Fernhill St
  'mandumol_road':       [124.650500, 8.460000],  // Mandumol Road

  // ---- Highway / Lapasan / Agora corridor ----
  'cm_recto_ave':        [124.651700, 8.487700],  // CM Recto Ave (Centrio area)
  'gaisano_city':        [124.654000, 8.486500],  // Gaisano City Mall
  'limketkai_center':    [124.656800, 8.484200],  // Limketkai Center
  'limketkai_drive':     [124.656500, 8.484500],  // Limketkai Drive
  'agora_terminal':      [124.658900, 8.485700],  // Agora Market City & Terminal
  'valenzuela_ave':      [124.658000, 8.488000],  // Valenzuela Ave
  'gaabucayan_st':       [124.658500, 8.489500],  // Gaabucayan St
  'j_pacana_st':         [124.655000, 8.492000],  // J. Pacana St
  'j_ramonal_st':        [124.653500, 8.479500],  // J. Ramonal St
  'macabalan':           [124.660000, 8.502000],  // Centro Macabalan
  'saarenas_ave':        [124.615000, 8.505500],  // Saarenas Ave (near WTPM)

  // ---- RN Pelaez corridor ----
  'rn_pelaez_blvd':      [124.640700, 8.497500],  // RN Pelaez Blvd
  'san_pedro_st':        [124.638500, 8.500000],  // San Pedro St
  'eagle_st':            [124.637500, 8.498000],  // Eagle St
  'st_ignatius_st':      [124.638000, 8.496000],  // St. Ignatius St

  // ---- Western terminals ----
  'westbound_terminal':  [124.611500, 8.504000],  // Westbound Terminal & Public Market
  'bulua_lto':           [124.618000, 8.511000],  // Bulua LTO
  'terry_hills':         [124.622000, 8.498000],  // Terry Hills Subdivision

  // ---- Origins / far barangays ----
  'baikingon':           [124.582500, 8.445400],  // Centro Baikingon
  'balulang':            [124.631000, 8.469000],  // Centro Balulang
  'villa_verde':         [124.628500, 8.467000],  // Villa Verde Subd
  'xavier_heights':      [124.626000, 8.464000],  // Xavier Heights
  'san_simon':           [124.575100, 8.435300],  // Centro San Simon
  'pagatpat':            [124.595000, 8.455000],  // Pagatpat Centro
  'pamalihi':            [124.588000, 8.448000],  // Pamalihi
  'canitoan':            [124.611500, 8.469500],  // Canitoan/Canitoan HS
  'calaanan':            [124.618000, 8.462000],  // Calaanan (Relocation)
  'tagpangi':            [124.562100, 8.421600],  // Centro Tagpangi
  'tuburan':             [124.553800, 8.409700],  // Centro Tuburan
  'tumpagon':            [124.539100, 8.386300],  // Centro Tumpagon
  'dansolihon':          [124.580000, 8.350000],  // Brgy. Dansolihon
  'uguiaban':            [124.570000, 8.330000],  // Uguiaban
  'bayabas':             [124.630000, 8.515000],  // Brgy. Bayabas
  'bonbon':              [124.635000, 8.505000],  // Brgy. Bonbon
  'silver_creek':        [124.628000, 8.465000],  // Silver Creek
  'san_agustin_valley':  [124.622000, 8.460000],  // San Agustin Valley
  'pueblo_de_oro':       [124.620000, 8.450000],  // Pueblo de Oro / Xavier Estates
  'gran_europa':         [124.610500, 8.418000],  // Gran Europa
  'lumbia':              [124.610500, 8.418000],  // Lumbia/Airport area
  'carmen_zone_10':      [124.633000, 8.472000],  // Carmen Zone 10
  'camp_evangelista':     [124.622000, 8.494000],  // Camp Evangelista
  'kauswagan_nha':       [124.631000, 8.496500],  // Kauswagan NHA
  'kauswagan_pasil':     [124.630000, 8.500000],  // Kauswagan Pasil Road

  // ---- Iponan / Bulao ----
  'iponan_bulao':        [124.608000, 8.468000],  // Iponan Bulao
  'kinasanghan_iponan':  [124.601000, 8.472000],  // Kinasanghan Iponan
  'kisanlu':             [124.605000, 8.465000],  // Kisanlu Subd

  // ---- Eastern CDO ----
  'gusa':                [124.683000, 8.477500],  // Brgy. Gusa
  'cugman':              [124.698000, 8.482000],  // Brgy. Cugman
  'fs_catanico':         [124.708000, 8.465000],  // FS Catanico
  'puerto_market':       [124.742000, 8.499000],  // Puerto Public Market
  'bugo':                [124.756000, 8.507000],  // Bugo
  'villa_trinitas':      [124.760000, 8.509000],  // Villa Trinitas
  'balubal':             [124.768000, 8.485000],  // Balubal

  // ---- Additional Bonbon / Bayabas streets ----
  'bonbon_pasil_road':   [124.634000, 8.502000],  // Bonbon-Pasil Road
  'the_baptist_st':      [124.636500, 8.498000],  // John the Baptist St
  'st_paul_st':          [124.637500, 8.495000],  // St Paul St
  'coastal_road':        [124.620000, 8.507000],  // Coastal Road (western)
  'coastal_road_east':   [124.660000, 8.498000],  // Coastal Road (eastern/Macabalan)
  'salvador_st':         [124.610000, 8.480000],  // Salvador St
  'regency_road':        [124.608000, 8.470000],  // Regency Road

  // ---- F. Delima / Lumbia corridor ----
  'f_delima_st':         [124.614000, 8.435000],  // F. Delima St
  'pagalungan_road':     [124.590000, 8.430000],  // Pagalungan Road
  'taglimao_road':       [124.570000, 8.420000],  // Taglimao Road
  'pigsagan_road':       [124.550000, 8.400000],  // Pigsag-an Road (Tumpagon)

  // ---- South Diversion / Taguanao ----
  'south_diversion_road': [124.640000, 8.440000], // South Diversion Road
  'tibasak_road':         [124.645000, 8.450000], // Tibasak Road
  'taguanao':             [124.655000, 8.435000], // Centro Taguanao
  'buena_oro':            [124.653000, 8.458000], // Buena Oro

  // ---- Macasandig ----
  'macasandig':          [124.650500, 8.462500],  // Macasandig Centro
  'macapaya':            [124.665000, 8.460000],  // Macapaya
  'camaman_an':          [124.660000, 8.465000],  // Camaman-an
  'indahag':             [124.668000, 8.445000],  // Brgy. Indahag
  'p_chavez_st':         [124.648000, 8.462000],  // P. Chavez St

  // ---- Apovel / PN Roa ----
  'apovel':              [124.627000, 8.494000],  // Apovel Subdivision
  'l_velez_st':          [124.625000, 8.496000],  // L. Velez St
  'eva_velez_st':        [124.623000, 8.497000],  // Eva Velez St
  'galaxy_st':           [124.622000, 8.498000],  // Galaxy St

  // ---- Yakal / Rosal / Ferrabrel ----
  'yakal_st':            [124.635500, 8.482000],  // Yakal St
  'rosal_st':            [124.634500, 8.484000],  // Rosal St
  'ferrabrel_st':        [124.633500, 8.486000],  // Ferrabrel St
  'lirio_st':            [124.636000, 8.481000],  // Lirio St (the correct one near Vamenta)

  // ---- Additional ----
  'corrales_extn':       [124.654000, 8.490000],  // Corrales Extension
  'quirino_st':          [124.651000, 8.477000],  // Quirino St
  'roxas_st':            [124.651000, 8.477000],  // Roxas St (near Cogon)
  'san_agustin_st':      [124.643500, 8.479000],  // San Agustin St
  't_neri_st':           [124.644500, 8.479500],  // T. Neri St
  'echem_st':            [124.647500, 8.483500],  // Echem St
};


// ============================================================================
// ROUTE WAYPOINT DEFINITIONS
// Maps each route direction to ordered waypoints for OSRM routing
// Based on official LPTRP street sequences from raw_routes.txt
// ============================================================================

// Helper: get waypoint coordinates
function wp(name) {
  if (VERIFIED_WAYPOINTS[name]) return VERIFIED_WAYPOINTS[name];
  throw new Error(`Unknown waypoint: ${name}`);
}

// Common Carmen approach sequences (used by many routes)
const CARMEN_INBOUND_FINAL = ['c_diel_masterson', 'villarin_cdiel', 'carmen_max_suniel', 'carmen_v_neri_entrance', 'carmen_v_castro_entrance', 'carmen_market_center'];
const CARMEN_OUTBOUND_START = ['carmen_market_center', 'carmen_ipil_exit', 'carmen_max_suniel', 'villarin_cdiel'];
const CARMEN_OUTBOUND_VIA_AVANCENA = ['carmen_market_center', 'carmen_ipil_exit', 'carmen_max_suniel', 'avancena_st', 'rabanes_st'];

// Routes that go: ... Macapagal → C. Diel → Villarin → Max Suniel → V. Neri → V. Castro → Carmen
const CARMEN_VIA_MACAPAGAL_INBOUND = ['macapagal_drive', ...CARMEN_INBOUND_FINAL];
// Routes that go: Carmen → Ipil → Max Suniel → Villarin → Avanceña → Rabanes → C. Diel → Macapagal
const CARMEN_VIA_MACAPAGAL_OUTBOUND = [...CARMEN_OUTBOUND_VIA_AVANCENA, 'c_diel_masterson', 'macapagal_drive'];
// Routes outbound via Castro → Vamenta → Masterson
const CARMEN_OUTBOUND_VIA_VAMENTA = ['carmen_market_center', 'carmen_v_castro_entrance', 'vamenta_blvd', 'vamenta_masterson', 'masterson_ave'];

/**
 * Route definitions: code → name match → [inbound waypoints, outbound waypoints]
 * Only routes with bogus Carmen endpoint need re-routing.
 */
const ROUTE_WAYPOINTS = {
  // ===== R-BAI: Baikingon → Carmen =====
  'R-BAI': {
    match: name => name.includes('Baikingon'),
    inbound: ['baikingon', 'iponan_bulao', 'canitoan', ...CARMEN_VIA_MACAPAGAL_INBOUND],
    outbound: [...CARMEN_VIA_MACAPAGAL_OUTBOUND, 'canitoan', 'iponan_bulao', 'baikingon'],
  },

  // ===== R-BAL (Balulang R1): Balulang → Carmen =====
  'R-BAL': {
    match: name => name.includes('Balulang') && name.includes('R1'),
    inbound: ['balulang', 'masterson_ave', ...CARMEN_INBOUND_FINAL],
    outbound: ['carmen_market_center', 'carmen_v_castro_entrance', 'vamenta_blvd', 'vamenta_masterson', 'masterson_ave', 'balulang'],
  },

  // ===== R-SAN: San Simon → Carmen =====
  'R-SAN': {
    match: name => name.includes('San Simon'),
    inbound: ['san_simon', 'pagatpat', 'canitoan', ...CARMEN_VIA_MACAPAGAL_INBOUND],
    outbound: [...CARMEN_VIA_MACAPAGAL_OUTBOUND, 'canitoan', 'pagatpat', 'san_simon'],
  },

  // ===== R-TAG: Tagpangi → Carmen =====
  'R-TAG': {
    match: name => name.includes('Tagpangi'),
    inbound: ['tagpangi', 'pagalungan_road', 'f_delima_st', 'masterson_delima', 'masterson_ave', 'macapagal_drive', 'sm_bypass_road', ...CARMEN_INBOUND_FINAL],
    outbound: [...CARMEN_OUTBOUND_VIA_AVANCENA, 'c_diel_masterson', 'sm_bypass_road', 'macapagal_drive', 'masterson_ave', 'masterson_delima', 'f_delima_st', 'pagalungan_road', 'tagpangi'],
  },

  // ===== R-TUB: Tuburan → Carmen =====
  'R-TUB': {
    match: name => name.includes('Tuburan'),
    inbound: ['tuburan', 'pagalungan_road', 'f_delima_st', 'masterson_delima', 'masterson_ave', 'macapagal_drive', 'sm_bypass_road', ...CARMEN_INBOUND_FINAL],
    outbound: [...CARMEN_OUTBOUND_VIA_AVANCENA, 'c_diel_masterson', 'sm_bypass_road', 'macapagal_drive', 'masterson_ave', 'masterson_delima', 'f_delima_st', 'pagalungan_road', 'tuburan'],
  },

  // ===== R-TUM: Tumpagon → Carmen =====
  'R-TUM': {
    match: name => name.includes('Tumpagon'),
    inbound: ['tumpagon', 'tuburan', 'pagalungan_road', 'f_delima_st', 'masterson_delima', 'masterson_ave', 'macapagal_drive', 'sm_bypass_road', ...CARMEN_INBOUND_FINAL],
    outbound: [...CARMEN_OUTBOUND_VIA_AVANCENA, 'c_diel_masterson', 'sm_bypass_road', 'macapagal_drive', 'masterson_ave', 'masterson_delima', 'f_delima_st', 'pagalungan_road', 'tuburan', 'tumpagon'],
  },

  // ===== R1 Dansolihon → Carmen (note: raw_routes.txt says Dansolihon R1 goes to Cogon, R2 goes to Carmen)
  // The R1 in bundled_routes with Liceo stop that goes to Carmen could be Dansolihon R2 or Lapasan R1
  'R1_dansolihon_carmen': {
    match: name => name.includes('Dansolihon') && !name.includes('Cogon'),
    inbound: ['dansolihon', 'masterson_ave', 'macapagal_drive', 'sm_bypass_road', ...CARMEN_INBOUND_FINAL],
    outbound: [...CARMEN_OUTBOUND_VIA_AVANCENA, 'c_diel_masterson', 'sm_bypass_road', 'macapagal_drive', 'masterson_ave', 'dansolihon'],
  },

  // ===== R1 Lapasan R1 → Carmen =====
  'R1_lapasan_carmen': {
    match: name => name.includes('Lapasan') && name.includes('R1'),
    inbound: ['agora_terminal', 'valenzuela_ave', 'cm_recto_ave', 'marcos_bridge', 'rn_pelaez_blvd', 'vamenta_blvd', ...CARMEN_INBOUND_FINAL],
    outbound: ['carmen_market_center', 'carmen_ipil_exit', 'carmen_max_suniel', 'villarin_cdiel', 'c_diel_masterson', 'masterson_ave', 'rodelsa_circle', 'vamenta_blvd', 'rn_pelaez_blvd', 'marcos_bridge', 'cm_recto_ave', 'valenzuela_ave', 'agora_terminal'],
  },

  // ===== Bayabas R2 → Carmen =====
  'R2_bayabas_carmen': {
    match: name => name.includes('Bayabas') && name.includes('R2'),
    inbound: ['bayabas', 'san_pedro_st', 'eagle_st', 'rn_pelaez_blvd', 'pn_roa_ave', 'villarin_st', 'c_diel_masterson', 'vamenta_masterson', 'vamenta_blvd', 'carmen_v_castro_entrance', 'carmen_ipil_exit', 'carmen_market_center'],
    outbound: ['carmen_market_center', 'carmen_max_suniel', 'villarin_st', 'pn_roa_ave', 'rn_pelaez_blvd', 'eagle_st', 'san_pedro_st', 'bayabas'],
  },

  // ===== Bayabas R3 → Carmen =====
  'R2_bayabas_r3_carmen': {
    match: name => name.includes('Bayabas') && name.includes('R3'),
    inbound: ['bayabas', 'san_pedro_st', 'rn_pelaez_blvd', 'vamenta_blvd', 'vamenta_masterson', ...CARMEN_INBOUND_FINAL],
    outbound: ['carmen_market_center', 'carmen_v_castro_entrance', 'carmen_ipil_exit', 'carmen_max_suniel', 'villarin_cdiel', 'c_diel_masterson', 'vamenta_masterson', 'vamenta_blvd', 'rn_pelaez_blvd', 'san_pedro_st', 'bayabas'],
  },

  // ===== Bayabas R4 → Carmen =====
  'R3_bayabas_r4_carmen': {
    match: name => name.includes('Bayabas') && name.includes('R4'),
    inbound: ['bayabas', 'coastal_road', 'westbound_terminal', 'saarenas_ave', 'cm_recto_ave', 'pn_roa_ave', 'vamenta_blvd', 'serina_st', 'villarin_st', 'carmen_max_suniel', 'carmen_v_neri_entrance', 'carmen_v_castro_entrance', 'carmen_market_center'],
    outbound: ['carmen_market_center', 'carmen_ipil_exit', 'carmen_max_suniel', 'yakal_st', 'rosal_st', 'ferrabrel_st', 'pn_roa_ave', 'cm_recto_ave', 'saarenas_ave', 'westbound_terminal', 'coastal_road', 'bayabas'],
  },

  // ===== Lumbia R3 Gran Europa → Carmen =====
  'R3_lumbia_carmen': {
    match: name => name.includes('Lumbia') && name.includes('R3') && name.includes('Gran Europa'),
    inbound: ['gran_europa', 'masterson_ave', 'vamenta_masterson', 'vamenta_blvd', 'pn_roa_ave', 'villarin_st', 'carmen_max_suniel', 'carmen_v_neri_entrance', 'carmen_market_center'],
    outbound: ['carmen_market_center', 'carmen_v_castro_entrance', 'vamenta_blvd', 'vamenta_masterson', 'masterson_ave', 'gran_europa'],
  },

  // ===== Carmen R3 Pueblo de Oro → Carmen =====
  'R3_carmen_pueblo': {
    match: name => name.includes('Pueblo de Oro') && !name.includes('Agora'),
    inbound: ['pueblo_de_oro', 'masterson_ave', 'vamenta_masterson', 'vamenta_blvd', 'pn_roa_ave', 'villarin_st', 'carmen_max_suniel', 'carmen_v_neri_entrance', 'carmen_market_center'],
    outbound: ['carmen_market_center', 'carmen_v_castro_entrance', 'vamenta_blvd', 'vamenta_masterson', 'masterson_ave', 'pueblo_de_oro'],
  },

  // ===== Carmen R5 → Agora (starts from Carmen) =====
  'R5_carmen_agora': {
    match: name => name.includes('Carmen') && name.includes('R5') && name.includes('Agora'),
    inbound: ['carmen_market_center', 'carmen_max_suniel', 'villarin_st', 'serina_st', 'ysalina_bridge', 'gaerlan_st', 'pabayo_st', 'fernandez_st', 'corrales_ave', 'hayes_st', 'cogon_market', 'yacapin_st', 'j_ramonal_st', 'limketkai_drive', 'cm_recto_ave', 'valenzuela_ave', 'agora_terminal'],
    outbound: ['agora_terminal', 'valenzuela_ave', 'cm_recto_ave', 'limketkai_drive', 'j_ramonal_st', 'v_roa_st', 'jr_borja_ave', 'rizal_st', 'gaerlan_st', 'ysalina_bridge', 'serina_st', 'vamenta_blvd', 'carmen_v_castro_entrance', 'carmen_ipil_exit', 'carmen_market_center'],
  },

  // ===== Bulua R6 → Carmen =====
  'R6_bulua_carmen': {
    match: name => name.includes('Bulua') && name.includes('R6'),
    inbound: ['westbound_terminal', 'saarenas_ave', 'cm_recto_ave', 'macapagal_drive', ...CARMEN_INBOUND_FINAL],
    outbound: ['carmen_market_center', 'carmen_v_castro_entrance', 'vamenta_blvd', 'vamenta_masterson', 'masterson_ave', 'c_diel_masterson', 'macapagal_drive', 'cm_recto_ave', 'saarenas_ave', 'westbound_terminal'],
  },

  // ===== Bulua R3 → Carmen =====
  'R3_bulua_carmen': {
    match: name => name.includes('Bulua') && name.includes('R3'),
    inbound: ['westbound_terminal', 'saarenas_ave', 'cm_recto_ave', 'pn_roa_ave', 'vamenta_blvd', 'serina_st', 'villarin_st', 'carmen_max_suniel', 'carmen_v_neri_entrance', 'carmen_market_center'],
    outbound: ['carmen_market_center', 'carmen_v_castro_entrance', 'vamenta_blvd', 'pn_roa_ave', 'cm_recto_ave', 'saarenas_ave', 'coastal_road', 'westbound_terminal'],
  },

  // ===== Bonbon R2 → Carmen =====
  'R2_bonbon_carmen': {
    match: name => name.includes('Bonbon') && name.includes('R2'),
    inbound: ['bonbon', 'bonbon_pasil_road', 'the_baptist_st', 'rn_pelaez_blvd', 'vamenta_blvd', 'vamenta_masterson', ...CARMEN_INBOUND_FINAL],
    outbound: ['carmen_market_center', 'carmen_v_castro_entrance', 'carmen_ipil_exit', 'carmen_max_suniel', 'villarin_cdiel', 'c_diel_masterson', 'vamenta_masterson', 'vamenta_blvd', 'rn_pelaez_blvd', 'the_baptist_st', 'bonbon_pasil_road', 'bonbon'],
  },

  // ===== Bonbon R4 → Carmen =====
  'R4_bonbon_carmen': {
    match: name => name.includes('Bonbon') && name.includes('R4'),
    inbound: ['bonbon', 'bonbon_pasil_road', 'the_baptist_st', 'st_paul_st', 'rn_pelaez_blvd', 'cm_recto_ave', 'saarenas_ave', 'westbound_terminal', 'saarenas_ave', 'cm_recto_ave', 'pn_roa_ave', 'vamenta_blvd', 'carmen_max_suniel', 'carmen_v_neri_entrance', 'carmen_market_center'],
    outbound: ['carmen_market_center', 'carmen_v_castro_entrance', 'carmen_ipil_exit', 'carmen_max_suniel', 'yakal_st', 'rosal_st', 'ferrabrel_st', 'pn_roa_ave', 'cm_recto_ave', 'saarenas_ave', 'westbound_terminal', 'saarenas_ave', 'cm_recto_ave', 'rn_pelaez_blvd', 'st_paul_st', 'the_baptist_st', 'bonbon_pasil_road', 'bonbon'],
  },

  // ===== Kauswagan R2 → Carmen =====
  'R2_kauswagan_carmen': {
    match: name => name.includes('Kauswagan') && name.includes('R2'),
    inbound: ['kauswagan_nha', 'eagle_st', 'st_ignatius_st', 'rn_pelaez_blvd', 'vamenta_blvd', ...CARMEN_INBOUND_FINAL],
    outbound: ['carmen_market_center', 'carmen_v_castro_entrance', 'vamenta_blvd', 'rn_pelaez_blvd', 'st_ignatius_st', 'eagle_st', 'kauswagan_nha'],
  },

  // ===== Kauswagan R3 → Carmen =====
  'R3_kauswagan_carmen': {
    match: name => name.includes('Kauswagan') && name.includes('R3'),
    inbound: ['kauswagan_pasil', 'san_pedro_st', 'cm_recto_ave', 'saarenas_ave', 'westbound_terminal', 'saarenas_ave', 'cm_recto_ave', 'pn_roa_ave', 'vamenta_blvd', 'serina_st', 'villarin_st', 'carmen_max_suniel', 'carmen_v_neri_entrance', 'carmen_market_center'],
    outbound: ['carmen_market_center', 'carmen_v_castro_entrance', 'carmen_ipil_exit', 'carmen_max_suniel', 'yakal_st', 'rosal_st', 'ferrabrel_st', 'pn_roa_ave', 'cm_recto_ave', 'saarenas_ave', 'westbound_terminal', 'saarenas_ave', 'cm_recto_ave', 'san_pedro_st', 'kauswagan_pasil'],
  },

  // ===== Macabalan R5 → Carmen =====
  'R5_macabalan_carmen': {
    match: name => name.includes('Macabalan') && name.includes('R5'),
    inbound: ['macabalan', 'j_pacana_st', 'marcos_bridge', 'rn_pelaez_blvd', 'vamenta_blvd', 'serina_st', 'villarin_st', 'carmen_max_suniel', 'carmen_v_neri_entrance', 'carmen_market_center'],
    outbound: ['carmen_market_center', 'carmen_v_castro_entrance', 'vamenta_blvd', 'rn_pelaez_blvd', 'marcos_bridge', 'j_pacana_st', 'macabalan'],
  },

  // ===== Pagatpat R2 → Carmen =====
  'R2_pagatpat_carmen': {
    match: name => name.includes('Pagatpat') && name.includes('R2') && !name.includes('Pamalihi'),
    inbound: ['pagatpat', 'canitoan', ...CARMEN_VIA_MACAPAGAL_INBOUND],
    outbound: [...CARMEN_VIA_MACAPAGAL_OUTBOUND, 'canitoan', 'pagatpat'],
  },

  // ===== Pagatpat R3 Pamalihi → Carmen =====
  'R3_pagatpat_pamalihi_carmen': {
    match: name => name.includes('Pagatpat') && name.includes('R3'),
    inbound: ['pamalihi', 'pagatpat', 'canitoan', ...CARMEN_VIA_MACAPAGAL_INBOUND],
    outbound: [...CARMEN_VIA_MACAPAGAL_OUTBOUND, 'canitoan', 'pagatpat', 'pamalihi'],
  },

  // ===== Lumbia R2 → Carmen =====
  'R2_lumbia_carmen': {
    match: name => name.includes('Lumbia') && name.includes('R2') && !name.includes('Gran Europa'),
    inbound: ['lumbia', 'f_delima_st', 'masterson_delima', 'masterson_ave', 'macapagal_drive', 'sm_bypass_road', ...CARMEN_INBOUND_FINAL],
    outbound: ['carmen_market_center', 'carmen_v_castro_entrance', 'carmen_ipil_exit', 'carmen_max_suniel', 'avancena_st', 'rabanes_st', 'c_diel_masterson', 'sm_bypass_road', 'macapagal_drive', 'masterson_ave', 'masterson_delima', 'f_delima_st', 'lumbia'],
  },

  // ===== Dansolihon R2 → Carmen =====
  'R2_dansolihon_carmen': {
    match: name => name.includes('Dansolihon') && name.includes('R2'),
    inbound: ['uguiaban', 'dansolihon', 'masterson_ave', 'macapagal_drive', 'sm_bypass_road', ...CARMEN_INBOUND_FINAL],
    outbound: ['carmen_market_center', 'carmen_v_castro_entrance', 'carmen_ipil_exit', 'carmen_max_suniel', 'villarin_cdiel', 'c_diel_masterson', 'sm_bypass_road', 'macapagal_drive', 'masterson_ave', 'dansolihon', 'uguiaban'],
  },

  // ===== Iponan R1 Bulao → Carmen =====
  'R1_iponan_carmen': {
    match: name => name.includes('Iponan') && name.includes('R1') && name.includes('Carmen'),
    inbound: ['iponan_bulao', 'saarenas_ave', 'westbound_terminal', 'saarenas_ave', 'cm_recto_ave', 'pn_roa_ave', 'vamenta_blvd', 'serina_st', 'villarin_st', 'carmen_max_suniel', 'carmen_v_neri_entrance', 'carmen_market_center'],
    outbound: ['carmen_market_center', 'carmen_v_castro_entrance', 'carmen_ipil_exit', 'carmen_max_suniel', 'yakal_st', 'lirio_st', 'vamenta_blvd', 'rn_pelaez_blvd', 'cm_recto_ave', 'saarenas_ave', 'westbound_terminal', 'coastal_road', 'iponan_bulao'],
  },

  // ===== Carmen R2 San Agustin → Cogon (doesn't end at Carmen Market but might have it as stop) =====
  // These use Cogon as destination but may have Carmen stops
};


// ============================================================================
// OSRM Routing
// ============================================================================
async function fetchOSRMRoute(waypointCoords) {
  if (!waypointCoords || waypointCoords.length < 2) return null;
  
  // Remove consecutive duplicates (within 100m)
  const deduped = [waypointCoords[0]];
  for (let i = 1; i < waypointCoords.length; i++) {
    const prev = deduped[deduped.length - 1];
    const curr = waypointCoords[i];
    const dist = Math.sqrt(Math.pow(curr[0] - prev[0], 2) + Math.pow(curr[1] - prev[1], 2)) * 111320;
    if (dist > 100) {
      deduped.push(curr);
    }
  }
  
  if (deduped.length < 2) return null;

  const coordsStr = deduped.map(c => `${c[0]},${c[1]}`).join(';');
  const url = `http://router.project-osrm.org/route/v1/driving/${coordsStr}?overview=full&geometries=geojson`;
  
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    const data = await res.json();
    if (data && data.routes && data.routes.length > 0) {
      return {
        geometry: data.routes[0].geometry,
        distanceMeters: data.routes[0].distance,
      };
    }
  } catch (e) {
    console.warn(`  OSRM error: ${e.message}`);
  }
  return null;
}


// ============================================================================
// Main Fix Function
// ============================================================================
async function fixAllRoutes() {
  const routes = JSON.parse(fs.readFileSync(bundledPath, 'utf8'));
  console.log(`Loaded ${routes.length} routes from bundled_routes.json\n`);

  // Correct Carmen Market coordinates
  const CORRECT_CARMEN = { lat: 8.479498, lng: 124.636820 };
  const BOGUS_CARMEN_ENDPOINT = [124.633369, 8.484553]; // Lirio St Extension

  let fixedStops = 0;
  let removedLiceo = 0;
  let fixedGeometries = 0;
  let failedRoutes = [];

  // Codes that should NOT have Liceo stop (don't pass through Liceo/RN Pelaez corridor)
  const REMOVE_LICEO_CODES = new Set();

  for (const r of routes) {
    // Check if route has a Liceo stop that shouldn't be there
    const dirs = r.directions || [];
    const streetSeqs = dirs.map(d => d.street_sequence || '').join(' ').toLowerCase();
    const passesLiceo = streetSeqs.includes('liceo') || 
      (r.name && (r.name.includes('R2 —') || r.name.includes('C2 —') || r.name.includes('Bulua–Cogon')));
    
    if (r.stops) {
      // Fix 1: Correct Carmen stop coordinates
      for (const stop of r.stops) {
        if (stop.name && stop.name.includes('Carmen') && 
            Math.abs(stop.lat - 8.4845) < 0.001 && Math.abs(stop.lng - 124.6335) < 0.001) {
          console.log(`  [FIX STOP] ${r.code} "${stop.name}": (${stop.lat},${stop.lng}) → (${CORRECT_CARMEN.lat},${CORRECT_CARMEN.lng})`);
          stop.lat = CORRECT_CARMEN.lat;
          stop.lng = CORRECT_CARMEN.lng;
          fixedStops++;
        }
      }

      // Fix 2: Remove spurious Liceo stop from routes that don't pass through Liceo
      if (!passesLiceo) {
        const before = r.stops.length;
        r.stops = r.stops.filter(s => {
          if (s.name && s.name.includes('Liceo') && s.id && s.id.startsWith('lp-liceo')) {
            console.log(`  [REMOVE LICEO] ${r.code} "${s.name}" (spurious, route doesn't pass Liceo)`);
            return false;
          }
          return true;
        });
        removedLiceo += (before - r.stops.length);
      }
    }

    // Fix 3: Also fix Carmen terminal coordinates
    if (r.terminals) {
      for (const t of r.terminals) {
        if (t.name && t.name.includes('Carmen') && t.lat && t.lng &&
            Math.abs(t.lat - 8.4845) < 0.005 && Math.abs(t.lng - 124.6335) < 0.005) {
          t.lat = CORRECT_CARMEN.lat;
          t.lng = CORRECT_CARMEN.lng;
        }
      }
    }
  }

  // Fix 4: Re-route all geometries that end at the bogus Carmen endpoint
  console.log('\n=== Re-routing geometries via OSRM ===\n');

  for (const r of routes) {
    if (!r.geometries || r.geometries.length === 0) continue;

    for (let gi = 0; gi < r.geometries.length; gi++) {
      const g = r.geometries[gi];
      const geoStr = typeof g.geometry === 'string' ? g.geometry : Object.values(g.geometry).join('');
      
      let parsed;
      try {
        parsed = JSON.parse(geoStr);
      } catch (e) { continue; }

      const coords = parsed.coordinates;
      if (!coords || coords.length < 2) continue;

      const first = coords[0];
      const last = coords[coords.length - 1];
      const dir = g.direction || (gi === 0 ? 'Inbound' : 'Outbound');

      // Check if this geometry has the bogus Carmen endpoint
      const endAtBogus = Math.abs(last[0] - BOGUS_CARMEN_ENDPOINT[0]) < 0.002 && 
                         Math.abs(last[1] - BOGUS_CARMEN_ENDPOINT[1]) < 0.002;
      const startAtBogus = Math.abs(first[0] - BOGUS_CARMEN_ENDPOINT[0]) < 0.002 && 
                           Math.abs(first[1] - BOGUS_CARMEN_ENDPOINT[1]) < 0.002;

      if (!endAtBogus && !startAtBogus) continue;

      // Find matching route waypoint definition
      let waypointNames = null;
      for (const [key, def] of Object.entries(ROUTE_WAYPOINTS)) {
        if (def.match(r.name || '')) {
          waypointNames = dir === 'Inbound' ? def.inbound : def.outbound;
          break;
        }
      }

      if (!waypointNames) {
        // Fallback: try to find by code
        const codeDef = ROUTE_WAYPOINTS[r.code];
        if (codeDef && codeDef.match(r.name || '')) {
          waypointNames = dir === 'Inbound' ? codeDef.inbound : codeDef.outbound;
        }
      }

      if (!waypointNames) {
        console.log(`  [SKIP] ${r.code} "${r.name}" ${dir}: No waypoint definition found — needs manual routing`);
        failedRoutes.push(`${r.code} "${r.name}" ${dir}`);
        continue;
      }

      // Resolve waypoint names to coordinates
      const waypointCoords = [];
      let valid = true;
      for (const name of waypointNames) {
        const coord = VERIFIED_WAYPOINTS[name];
        if (!coord) {
          console.log(`  [ERROR] Unknown waypoint "${name}" in ${r.code} ${dir}`);
          valid = false;
          break;
        }
        waypointCoords.push(coord);
      }

      if (!valid) {
        failedRoutes.push(`${r.code} "${r.name}" ${dir} (bad waypoint)`);
        continue;
      }

      console.log(`  [ROUTE] ${r.code} "${r.name}" ${dir}: ${waypointNames.length} waypoints...`);
      
      const osrmRes = await fetchOSRMRoute(waypointCoords);
      if (osrmRes && osrmRes.geometry && osrmRes.geometry.coordinates.length > 2) {
        const newCoords = osrmRes.geometry.coordinates;
        const distKm = Math.round(osrmRes.distanceMeters / 100) / 10;
        
        // Store geometry as proper JSON string
        g.geometry = JSON.stringify({ type: 'LineString', coordinates: newCoords });
        g.geometry_status = 'road_verified';
        g.generated_at = new Date().toISOString();
        
        // Update distances
        if (dir === 'Inbound') {
          r.inbound_distance_km = distKm;
          r.length_km = distKm;
          r.path = newCoords.map((c, i) => ({ route_id: r.id, seq: i, lat: c[1], lng: c[0], map_x: 0, map_y: 0 }));
        } else {
          r.outbound_distance_km = distKm;
        }
        
        // Update direction distances
        if (r.directions) {
          const matchedDir = r.directions.find(d => d.direction && d.direction.toLowerCase() === dir.toLowerCase());
          if (matchedDir) matchedDir.distance_km = distKm;
        }
        
        r.last_updated_at = new Date().toISOString();
        
        console.log(`    ✓ ${newCoords.length} road points, ${distKm} km`);
        fixedGeometries++;
      } else {
        console.log(`    ✗ OSRM failed for ${r.code} ${dir}`);
        failedRoutes.push(`${r.code} "${r.name}" ${dir} (OSRM failed)`);
      }

      // Rate limit: 300ms between OSRM calls
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }

  // Save
  fs.writeFileSync(bundledPath, JSON.stringify(routes, null, 2), 'utf8');
  
  console.log('\n========================================');
  console.log(`SUMMARY:`);
  console.log(`  Fixed Carmen stop coordinates: ${fixedStops}`);
  console.log(`  Removed spurious Liceo stops: ${removedLiceo}`);
  console.log(`  Re-routed geometries via OSRM: ${fixedGeometries}`);
  console.log(`  Failed / needs manual review: ${failedRoutes.length}`);
  if (failedRoutes.length > 0) {
    console.log(`\nRoutes needing manual verification:`);
    failedRoutes.forEach(r => console.log(`  - ${r}`));
  }
  console.log('========================================');
}

fixAllRoutes().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

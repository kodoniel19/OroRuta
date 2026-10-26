/**
 * configure_16_routes_terminals_and_stops.js
 * 
 * Accurately configures origins, destinations, terminals, loading points,
 * and route direction sequences for the remaining 16 newly updated routes.
 */

const pool = require('../src/config/db');

const ROUTES_CONFIG = [
  {
    id: 'la-lapasan-cogon-agora-divisoria',
    code: 'LA',
    name: 'LA — Lapasan–Cogon–Agora–Divisoria Loop',
    origin: 'Lapasan (Gaabucayan St)',
    destination: 'Cogon Public Market',
    terminals: [
      { id: 't-lapasan-gaabucayan', name: 'Lapasan (Gaabucayan St)', note: 'Gaabucayan St / Agora Junction', lat: 8.48941, lng: 124.65810, seq: 1 },
      { id: 't-cogon', name: 'Cogon Public Market', note: 'Cogon Public Market Terminal', lat: 8.47706, lng: 124.65223, seq: 2 }
    ],
    loadingPoints: [
      { id: 'lp-la-lapasan', name: 'Lapasan (Gaabucayan St)', note: 'Gaabucayan St / Agora Junction', lat: 8.48941, lng: 124.65810 },
      { id: 'lp-la-cogon', name: 'Cogon Public Market', note: 'Cogon Market Boarding Area', lat: 8.47706, lng: 124.65223 },
      { id: 'lp-la-agora', name: 'Agora Integrated Bus Terminal', note: 'Agora Bus Terminal Gate', lat: 8.48813, lng: 124.65800 },
      { id: 'lp-la-divisoria', name: 'Plaza Divisoria', note: 'RN Abejuela St / Divisoria', lat: 8.47770, lng: 124.64520 }
    ],
    inboundDist: 7.09,
    inboundSeq: 'Lapasan (Gaabucayan St) → Agora Terminal → CM Recto Ave → Limketkai Center → JR Borja St → Cogon Public Market',
    outboundDist: 2.29,
    outboundSeq: 'Cogon Public Market → RN Abejuela St → Plaza Divisoria → Corrales Ave → Gaabucayan St → Lapasan'
  },
  {
    id: 'lb-lapasan-agora-loop',
    code: 'LB',
    name: 'LB — Lapasan–Agora Loop',
    origin: 'Agora Bus Terminal (Lapasan)',
    destination: 'Cogon Public Market',
    terminals: [
      { id: 't-agora-lapasan', name: 'Agora Bus Terminal (Lapasan)', note: 'Agora Integrated Bus Terminal', lat: 8.48957, lng: 124.65765, seq: 1 },
      { id: 't-cogon', name: 'Cogon Public Market', note: 'Cogon Public Market Terminal', lat: 8.47720, lng: 124.65224, seq: 2 }
    ],
    loadingPoints: [
      { id: 'lp-lb-agora', name: 'Agora Bus Terminal (Lapasan)', note: 'Agora Bus Terminal Main Gate', lat: 8.48957, lng: 124.65765 },
      { id: 'lp-lb-cogon', name: 'Cogon Public Market', note: 'Cogon Market Boarding Area', lat: 8.47720, lng: 124.65224 },
      { id: 'lp-lb-puregold', name: 'Puregold Lapasan', note: 'Lapasan Highway Commercial Point', lat: 8.48337, lng: 124.65858 }
    ],
    inboundDist: 4.30,
    inboundSeq: 'Agora Bus Terminal → Gaabucayan St → Lapasan Highway → Limketkai Center → Cogon Public Market',
    outboundDist: 3.88,
    outboundSeq: 'Cogon Public Market → Osmeña St → CM Recto Ave → Agora Bus Terminal (Lapasan)'
  },
  {
    id: 'bayabas-carmen-loop-line',
    code: 'R-BAY-CAR',
    name: 'Bayabas–Carmen Loop Line',
    origin: 'Bayabas Barangay Hall',
    destination: 'Carmen Public Market',
    terminals: [
      { id: 't-bayabas', name: 'Bayabas Barangay Hall Terminal', note: 'Bayabas Centro Terminal', lat: 8.51375, lng: 124.63890, seq: 1 },
      { id: 't-carmen', name: 'Carmen Public Market Terminal', note: 'Carmen Market Terminal', lat: 8.48005, lng: 124.63712, seq: 2 }
    ],
    loadingPoints: [
      { id: 'lp-bay-bayabas', name: 'Bayabas Barangay Hall', note: 'Bayabas Barangay Hall Terminal', lat: 8.51375, lng: 124.63890 },
      { id: 'lp-bay-carmen', name: 'Carmen Public Market', note: 'Carmen Public Market Terminal', lat: 8.48005, lng: 124.63712 },
      { id: 'lp-bay-westbound', name: 'Westbound Terminal (Bulua)', note: 'Bulua Westbound Bus Terminal', lat: 8.51230, lng: 124.62348 },
      { id: 'lp-bay-kauswagan', name: 'Kauswagan Junction', note: 'Kauswagan National Highway', lat: 8.49750, lng: 124.63350 }
    ],
    inboundDist: 10.60,
    inboundSeq: 'Bayabas Barangay Hall → Kauswagan Rd → National Highway → Bulua → Carmen Public Market',
    outboundDist: 7.37,
    outboundSeq: 'Carmen Public Market → Vamenta Blvd → Kauswagan Highway → Bayabas Road → Bayabas Barangay Hall'
  },
  {
    id: 'bugo-cogon-line',
    code: 'R-BUG-COG',
    name: 'Bugo–Cogon Line',
    origin: 'Bugo (Villa Trinitas)',
    destination: 'Cogon Public Market',
    terminals: [
      { id: 't-bugo', name: 'Bugo Terminal (Villa Trinitas)', note: 'Villa Trinitas Terminal Gate', lat: 8.51025, lng: 124.77210, seq: 1 },
      { id: 't-cogon', name: 'Cogon Public Market', note: 'Cogon Public Market Terminal', lat: 8.47742, lng: 124.65227, seq: 2 }
    ],
    loadingPoints: [
      { id: 'lp-bug-bugo', name: 'Bugo (Villa Trinitas)', note: 'Villa Trinitas Terminal Gate', lat: 8.51025, lng: 124.77210 },
      { id: 'lp-bug-cogon', name: 'Cogon Public Market', note: 'Cogon Market Loading Zone', lat: 8.47742, lng: 124.65227 },
      { id: 'lp-bug-puerto', name: 'Puerto Public Market', note: 'Puerto National Highway', lat: 8.49960, lng: 124.75050 },
      { id: 'lp-bug-tablon', name: 'Tablon Junction', note: 'Tablon Industrial Area', lat: 8.49200, lng: 124.72200 },
      { id: 'lp-bug-gusa', name: 'Gusa Highway', note: 'Gusa National Highway', lat: 8.47800, lng: 124.68500 }
    ],
    inboundDist: 16.19,
    inboundSeq: 'Bugo (Villa Trinitas) → Sayre Highway → Puerto → Tablon → Cugman → Gusa → CM Recto Ave → Cogon Public Market',
    outboundDist: 16.13,
    outboundSeq: 'Cogon Public Market → Osmeña St → Lapasan Highway → Gusa → Cugman → Tablon → Puerto → Bugo (Villa Trinitas)'
  },
  {
    id: 'bulua-cogon-line-highway',
    code: 'R-BUL-COG',
    name: 'Bulua (R3) – Carmen Public Market',
    origin: 'Bulua (Saarenas Ave)',
    destination: 'Carmen Public Market',
    terminals: [
      { id: 't-bulua-westbound', name: 'Westbound Terminal (Bulua)', note: 'Saarenas Ave / Westbound Terminal Gate', lat: 8.51224, lng: 124.62423, seq: 1 },
      { id: 't-carmen', name: 'Carmen Public Market Terminal', note: 'Carmen Market Terminal', lat: 8.47931, lng: 124.63664, seq: 2 }
    ],
    loadingPoints: [
      { id: 'lp-bul-bulua', name: 'Bulua (Saarenas Ave)', note: 'Westbound Terminal / Saarenas Ave Gate', lat: 8.51224, lng: 124.62423 },
      { id: 'lp-bul-carmen', name: 'Carmen Public Market', note: 'Carmen Market Boarding Area', lat: 8.47931, lng: 124.63664 },
      { id: 'lp-bul-highway', name: 'Bulua National Highway', note: 'Bulua Highway Crossing', lat: 8.50800, lng: 124.62800 }
    ],
    inboundDist: 8.24,
    inboundSeq: 'Bulua (Saarenas Ave) → Butuan-CDO-Iligan Rd → Kauswagan → Carmen Market Terminal',
    outboundDist: 5.25,
    outboundSeq: 'Carmen Public Market → Vamenta Blvd → Kauswagan Rd → National Highway → Bulua (Saarenas Ave)'
  },
  {
    id: 'indahag-r1-cogon-line',
    code: 'R-IND-COG',
    name: 'Indahag (R1)–Cogon Line',
    origin: 'Indahag Barangay Hall',
    destination: 'Cogon Public Market',
    terminals: [
      { id: 't-indahag', name: 'Indahag Barangay Hall Terminal', note: 'Indahag Centro Terminal', lat: 8.42149, lng: 124.66701, seq: 1 },
      { id: 't-cogon', name: 'Cogon Public Market', note: 'Cogon Public Market Terminal', lat: 8.47668, lng: 124.65287, seq: 2 }
    ],
    loadingPoints: [
      { id: 'lp-ind-indahag', name: 'Indahag Barangay Hall', note: 'Indahag Centro Terminal Gate', lat: 8.42149, lng: 124.66701 },
      { id: 'lp-ind-cogon', name: 'Cogon Public Market', note: 'Cogon Public Market Terminal', lat: 8.47668, lng: 124.65287 },
      { id: 'lp-ind-camaman', name: 'Camaman-an Junction', note: 'Camaman-an Barangay Road', lat: 8.46200, lng: 124.65500 }
    ],
    inboundDist: 7.72,
    inboundSeq: 'Indahag Barangay Hall → Indahag Road → Camaman-an → Hayes St → Cogon Public Market',
    outboundDist: 7.76,
    outboundSeq: 'Cogon Public Market → Yacapin St → Camaman-an Road → Indahag Road → Indahag Barangay Hall'
  },
  {
    id: 'iponan-bulua-cogon-line',
    code: 'R-IPO-BUL-COG',
    name: 'Iponan–Bulua–Cogon Line',
    origin: 'Iponan (Bulao)',
    destination: 'Cogon Public Market',
    terminals: [
      { id: 't-iponan', name: 'Iponan Terminal (Bulao)', note: 'Iponan Bulao Centro Terminal', lat: 8.48140, lng: 124.59108, seq: 1 },
      { id: 't-cogon', name: 'Cogon Public Market', note: 'Cogon Public Market Terminal', lat: 8.47726, lng: 124.65000, seq: 2 }
    ],
    loadingPoints: [
      { id: 'lp-ipo-iponan', name: 'Iponan (Bulao)', note: 'Iponan Bulao Centro Terminal', lat: 8.48140, lng: 124.59108 },
      { id: 'lp-ipo-cogon', name: 'Cogon Public Market', note: 'Cogon Market Loading Zone', lat: 8.47726, lng: 124.65000 },
      { id: 'lp-ipo-bulua', name: 'Westbound Terminal (Bulua)', note: 'Bulua Westbound Bus Terminal', lat: 8.51224, lng: 124.62423 },
      { id: 'lp-ipo-carmen', name: 'Carmen Market Crossing', note: 'Carmen Commercial Junction', lat: 8.48000, lng: 124.63700 }
    ],
    inboundDist: 12.27,
    inboundSeq: 'Iponan (Bulao) → Butuan-CDO-Iligan Rd → Bulua Westbound Terminal → Carmen → Cogon Public Market',
    outboundDist: 11.67,
    outboundSeq: 'Cogon Public Market → JR Borja St → Carmen Bridge → Bulua Highway → Iponan (Bulao)'
  },
  {
    id: 'lumbia-carmen-line',
    code: 'R-LUM-CAR',
    name: 'Lumbia–Carmen Line',
    origin: 'Lumbia Market',
    destination: 'Carmen Public Market',
    terminals: [
      { id: 't-lumbia', name: 'Lumbia Market Terminal', note: 'Lumbia Public Market Terminal', lat: 8.40247, lng: 124.59495, seq: 1 },
      { id: 't-carmen', name: 'Carmen Public Market Terminal', note: 'Carmen Market Terminal', lat: 8.47930, lng: 124.63675, seq: 2 }
    ],
    loadingPoints: [
      { id: 'lp-lum-lumbia', name: 'Lumbia Market', note: 'Lumbia Public Market Terminal', lat: 8.40247, lng: 124.59495 },
      { id: 'lp-lum-carmen', name: 'Carmen Public Market', note: 'Carmen Market Terminal', lat: 8.47930, lng: 124.63675 },
      { id: 'lp-lum-airport', name: 'Old Lumbia Airport Gate', note: 'Lumbia Airport Road', lat: 8.41500, lng: 124.61100 },
      { id: 'lp-lum-sm', name: 'SM City CDO Uptown', note: 'Masterson Ave Boarding Stop', lat: 8.46000, lng: 124.62400 }
    ],
    inboundDist: 15.15,
    inboundSeq: 'Lumbia Market → Airport Rd → Masterson Ave → Upper Carmen → Vamenta Blvd → Carmen Public Market',
    outboundDist: 16.27,
    outboundSeq: 'Carmen Public Market → Vamenta Blvd → Masterson Ave → SM Uptown → Lumbia Airport Rd → Lumbia Market'
  },
  {
    id: 'macasandig-cogon-line',
    code: 'R-MAC-COG',
    name: 'Macasandig–Cogon Line',
    origin: 'Macasandig (Buena Oro)',
    destination: 'Cogon Public Market',
    terminals: [
      { id: 't-macasandig', name: 'Macasandig Terminal (Buena Oro)', note: 'Buena Oro Terminal Gate', lat: 8.44911, lng: 124.64620, seq: 1 },
      { id: 't-cogon', name: 'Cogon Public Market', note: 'Cogon Public Market Terminal', lat: 8.47787, lng: 124.65102, seq: 2 }
    ],
    loadingPoints: [
      { id: 'lp-mac-buena', name: 'Macasandig (Buena Oro)', note: 'Buena Oro Terminal Gate', lat: 8.44911, lng: 124.64620 },
      { id: 'lp-mac-cogon', name: 'Cogon Public Market', note: 'Cogon Market Loading Zone', lat: 8.47787, lng: 124.65102 },
      { id: 'lp-mac-corpus', name: 'Corpus Christi School / Tomas Saco', note: 'Tomas Saco St Crossing', lat: 8.46500, lng: 124.64400 }
    ],
    inboundDist: 4.60,
    inboundSeq: 'Macasandig (Buena Oro) → Tomas Saco St → 17th St → Nazareth → Cogon Public Market',
    outboundDist: 4.12,
    outboundSeq: 'Cogon Public Market → Hayes St → 21st St → Tomas Saco St → Macasandig (Buena Oro)'
  },
  {
    id: 'puerto-cogon-divisoria-line',
    code: 'R-PUE-COG',
    name: 'Puerto (R1) Puerto Public Market – Agora Terminal',
    origin: 'Puerto Public Market',
    destination: 'Agora Terminal',
    terminals: [
      { id: 't-puerto', name: 'Puerto Public Market Terminal', note: 'Puerto Public Market Terminal Gate', lat: 8.49960, lng: 124.75050, seq: 1 },
      { id: 't-agora', name: 'Agora Terminal', note: 'Agora Integrated Bus Terminal', lat: 8.48813, lng: 124.65800, seq: 2 }
    ],
    loadingPoints: [
      { id: 'lp-pue-puerto', name: 'Puerto Public Market', note: 'Puerto Public Market Terminal Gate', lat: 8.49960, lng: 124.75050 },
      { id: 'lp-pue-agora', name: 'Agora Terminal', note: 'Agora Integrated Bus Terminal', lat: 8.48813, lng: 124.65800 },
      { id: 'lp-pue-tablon', name: 'Tablon Junction', note: 'Tablon National Highway', lat: 8.49200, lng: 124.72200 },
      { id: 'lp-pue-cugman', name: 'Cugman Crossing', note: 'Cugman National Highway', lat: 8.48200, lng: 124.70000 }
    ],
    inboundDist: 14.27,
    inboundSeq: 'Puerto Public Market → Sayre Highway → Tablon → Cugman → Gusa Highway → Agora Terminal',
    outboundDist: 12.26,
    outboundSeq: 'Agora Terminal → Gaabucayan St → National Highway → Gusa → Cugman → Tablon → Puerto Public Market'
  },
  {
    id: 'uptown-gran-europa-sm-cogon',
    code: 'R-UPT-COG',
    name: 'Uptown — Gran Europa/SM Uptown–Cogon Line',
    origin: 'Gran Europa / SM Uptown',
    destination: 'Cogon Public Market',
    terminals: [
      { id: 't-uptown-gran', name: 'Gran Europa / SM Uptown Terminal', note: 'Gran Europa Terminal Gate', lat: 8.42409, lng: 124.60563, seq: 1 },
      { id: 't-cogon', name: 'Cogon Public Market', note: 'Cogon Public Market Terminal', lat: 8.47711, lng: 124.65009, seq: 2 }
    ],
    loadingPoints: [
      { id: 'lp-upt-gran', name: 'Gran Europa / SM Uptown', note: 'Gran Europa Terminal Gate', lat: 8.42409, lng: 124.60563 },
      { id: 'lp-upt-cogon', name: 'Cogon Public Market', note: 'Cogon Market Boarding Area', lat: 8.47711, lng: 124.65009 },
      { id: 'lp-upt-smuptown', name: 'SM City CDO Uptown', note: 'Masterson Ave Boarding Stop', lat: 8.45900, lng: 124.62400 },
      { id: 'lp-upt-rotunda', name: 'Pueblo de Oro Rotunda', note: 'Pueblo de Oro Business Park', lat: 8.44800, lng: 124.62500 }
    ],
    inboundDist: 13.41,
    inboundSeq: 'Gran Europa → Masterson Ave → SM Uptown → Carmen Bridge → Cogon Public Market',
    outboundDist: 12.91,
    outboundSeq: 'Cogon Public Market → Vamenta Blvd → Masterson Ave → SM Uptown → Pueblo de Oro → Gran Europa'
  },
  {
    id: 'r1-gaisano-carmen-loop',
    code: 'R1',
    name: 'R1 — Gaisano–Carmen Loop Line',
    origin: 'NMMC / Gaisano City Mall',
    destination: 'Carmen Public Market',
    terminals: [
      { id: 't-gaisano-nmmc', name: 'NMMC / Gaisano City Mall Terminal', note: 'CM Recto Ave / NMMC Gate', lat: 8.48469, lng: 124.65013, seq: 1 },
      { id: 't-carmen', name: 'Carmen Public Market Terminal', note: 'Carmen Market Terminal', lat: 8.48062, lng: 124.63656, seq: 2 }
    ],
    loadingPoints: [
      { id: 'lp-r1-gaisano', name: 'NMMC / Gaisano City Mall', note: 'CM Recto Ave / NMMC Gate', lat: 8.48469, lng: 124.65013 },
      { id: 'lp-r1-carmen', name: 'Carmen Public Market', note: 'Carmen Market Terminal', lat: 8.48062, lng: 124.63656 },
      { id: 'lp-r1-divisoria', name: 'Plaza Divisoria', note: 'RN Abejuela St / Divisoria', lat: 8.47770, lng: 124.64520 }
    ],
    inboundDist: 2.90,
    inboundSeq: 'NMMC / Gaisano City Mall → CM Recto Ave → Marcos Bridge → Carmen Public Market',
    outboundDist: 2.75,
    outboundSeq: 'Carmen Public Market → Vamenta Blvd → Carmen Bridge → Plaza Divisoria → NMMC / Gaisano City Mall'
  },
  {
    id: 'r2-gaisano-agora-cogon-carmen',
    code: 'R2',
    name: 'R2 — Gaisano–Agora–Cogon–Carmen Loop Line',
    origin: 'Carmen Public Market',
    destination: 'SM CDO Downtown / Agora / Gaisano',
    terminals: [
      { id: 't-carmen', name: 'Carmen Public Market Terminal', note: 'Carmen Market Terminal', lat: 8.48170, lng: 124.63730, seq: 1 },
      { id: 't-agora-gaisano', name: 'SM CDO Downtown / Agora / Gaisano Terminal', note: 'Claro M Recto Ave / SM Downtown', lat: 8.48556, lng: 124.65374, seq: 2 }
    ],
    loadingPoints: [
      { id: 'lp-r2-carmen', name: 'Carmen Public Market', note: 'Carmen Market Terminal', lat: 8.48170, lng: 124.63730 },
      { id: 'lp-r2-sm-downtown', name: 'SM CDO Downtown / Agora / Gaisano', note: 'Claro M Recto Ave / SM Downtown', lat: 8.48556, lng: 124.65374 },
      { id: 'lp-r2-cogon', name: 'Cogon Public Market', note: 'Cogon Market Boarding Area', lat: 8.47699, lng: 124.65128 },
      { id: 'lp-r2-agora', name: 'Agora Terminal', note: 'Agora Integrated Bus Terminal', lat: 8.48813, lng: 124.65800 }
    ],
    inboundDist: 2.59,
    inboundSeq: 'Carmen Public Market → Marcos Bridge → CM Recto Ave → SM CDO Downtown / Agora / Gaisano',
    outboundDist: 5.83,
    outboundSeq: 'SM CDO Downtown / Agora / Gaisano → Agora Terminal → Limketkai Center → Cogon Public Market → Carmen Bridge → Carmen Public Market'
  },
  {
    id: 'ra-pier-cogon-line',
    code: 'RA',
    name: 'RA — Pier–Cogon Line',
    origin: 'CDO Port Terminal (Macabalan)',
    destination: 'Gaisano City Mall / Cogon',
    terminals: [
      { id: 't-macabalan-port', name: 'CDO Port Terminal (Macabalan)', note: 'Macabalan Port Main Passenger Terminal Gate', lat: 8.49902, lng: 124.66240, seq: 1 },
      { id: 't-gaisano-cogon', name: 'Gaisano City Mall / Cogon Terminal', note: 'CM Recto Ave / Ororama Cogon', lat: 8.48657, lng: 124.65084, seq: 2 }
    ],
    loadingPoints: [
      { id: 'lp-ra-port', name: 'CDO Port Terminal (Macabalan)', note: 'Macabalan Port Main Passenger Gate', lat: 8.49902, lng: 124.66240 },
      { id: 'lp-ra-gaisano', name: 'Gaisano City Mall / Cogon', note: 'CM Recto Ave / Ororama Cogon', lat: 8.48657, lng: 124.65084 },
      { id: 'lp-ra-cogon', name: 'Ororama Cogon Market', note: 'JR Borja St / Cogon', lat: 8.47700, lng: 124.65150 },
      { id: 'lp-ra-corrales', name: 'Corrales Ave Commercial Strip', note: 'Corrales Ave Boarding Stop', lat: 8.49200, lng: 124.65500 }
    ],
    inboundDist: 8.70,
    inboundSeq: 'CDO Port Terminal (Macabalan) → Julio Pacana St → CM Recto Ave → Limketkai → Cogon Market → Gaisano City Mall',
    outboundDist: 2.06,
    outboundSeq: 'Gaisano City Mall / Cogon → Corrales Ave → Julio Pacana St → CDO Port Terminal (Macabalan)'
  },
  {
    id: 'rbc-pier-macabalan-agora-limketkai',
    code: 'RBC',
    name: 'RBC — Pier–Macabalan–Agora–Limketkai–Cogon–Velez Line',
    origin: 'CDO Port Terminal (Macabalan)',
    destination: 'Cogon Public Market / Provincial Capitol',
    terminals: [
      { id: 't-macabalan-port', name: 'CDO Port Terminal (Macabalan)', note: 'Macabalan Port Main Passenger Gate', lat: 8.49927, lng: 124.66319, seq: 1 },
      { id: 't-cogon', name: 'Cogon Public Market Terminal', note: 'Cogon Public Market Terminal', lat: 8.47689, lng: 124.65189, seq: 2 }
    ],
    loadingPoints: [
      { id: 'lp-rbc-port', name: 'CDO Port Terminal (Macabalan)', note: 'Macabalan Port Main Passenger Gate', lat: 8.49927, lng: 124.66319 },
      { id: 'lp-rbc-cogon', name: 'Cogon Public Market', note: 'Cogon Market Boarding Area', lat: 8.47689, lng: 124.65189 },
      { id: 'lp-rbc-agora', name: 'Agora Terminal', note: 'Agora Integrated Bus Terminal', lat: 8.48813, lng: 124.65800 },
      { id: 'lp-rbc-lkk', name: 'Limketkai Center', note: 'Limketkai Commercial Center', lat: 8.48158, lng: 124.65606 },
      { id: 'lp-rbc-capitol', name: 'Provincial Capitol / Velez', note: 'Velez St / Provincial Capitol', lat: 8.48120, lng: 124.64650 }
    ],
    inboundDist: 6.74,
    inboundSeq: 'CDO Port Terminal (Macabalan) → Agora Terminal → Limketkai Center → Cogon Public Market',
    outboundDist: 4.15,
    outboundSeq: 'Cogon Public Market → Velez St → Provincial Capitol → Julio Pacana St → CDO Port Terminal (Macabalan)'
  },
  {
    id: 'rd-gusa-cugman-limketkai-cogon',
    code: 'RC',
    name: 'RC - Cugman – Gusa – Cogon',
    origin: 'Cugman Centro',
    destination: 'Ayala Centrio Mall / Cogon',
    terminals: [
      { id: 't-cugman-centro', name: 'Cugman Centro Terminal', note: 'Cugman Centro Terminal Area', lat: 8.46900, lng: 124.70552, seq: 1 },
      { id: 't-centrio-cogon', name: 'Ayala Centrio Mall / Cogon Terminal', note: 'Ayala Centrio Mall / CM Recto Ave', lat: 8.48573, lng: 124.65137, seq: 2 }
    ],
    loadingPoints: [
      { id: 'lp-rc-cugman', name: 'Cugman Centro', note: 'Cugman Centro Terminal Area', lat: 8.46900, lng: 124.70552 },
      { id: 'lp-rc-centrio', name: 'Ayala Centrio Mall / Cogon', note: 'Ayala Centrio Mall Boarding Point', lat: 8.48573, lng: 124.65137 },
      { id: 'lp-rc-gusa', name: 'Gusa Highway', note: 'Gusa National Highway', lat: 8.47800, lng: 124.68500 },
      { id: 'lp-rc-lkk', name: 'Limketkai Center', note: 'Limketkai Commercial Center', lat: 8.48158, lng: 124.65606 },
      { id: 'lp-rc-cogon', name: 'Cogon Public Market', note: 'Cogon Public Market Terminal', lat: 8.47699, lng: 124.65128 }
    ],
    inboundDist: 11.07,
    inboundSeq: 'Cugman Centro → Gusa Highway → Limketkai Center → Cogon Public Market → Ayala Centrio Mall',
    outboundDist: 7.61,
    outboundSeq: 'Ayala Centrio Mall / Cogon → CM Recto Ave → Gusa Highway → Cugman Centro'
  }
];

async function run() {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    console.log(`Starting configuration of ${ROUTES_CONFIG.length} routes...`);

    for (const r of ROUTES_CONFIG) {
      console.log(`\nConfiguring [${r.code}] ${r.name} (${r.id})...`);

      // 1. Update routes table
      await conn.execute(
        `UPDATE routes SET
           name = ?,
           code = ?,
           origin = ?,
           destination = ?,
           last_updated_at = NOW()
         WHERE id = ?`,
        [r.name, r.code, r.origin, r.destination, r.id]
      );
      console.log(`  ✓ Updated routes: code='${r.code}', name='${r.name}', origin='${r.origin}', dest='${r.destination}'`);

      // 2. Ensure terminals exist
      for (const t of r.terminals) {
        await conn.execute(
          `INSERT INTO terminals (id, name, note, lat, lng, map_x, map_y)
           VALUES (?, ?, ?, ?, ?, 0, 0)
           ON DUPLICATE KEY UPDATE
             name = VALUES(name),
             note = VALUES(note),
             lat = VALUES(lat),
             lng = VALUES(lng)`,
          [t.id, t.name, t.note, t.lat, t.lng]
        );
      }
      console.log(`  ✓ Ensured ${r.terminals.length} terminals in terminals table`);

      // 3. Link route_terminals
      await conn.execute('DELETE FROM route_terminals WHERE route_id = ?', [r.id]);
      for (const t of r.terminals) {
        await conn.execute(
          `INSERT INTO route_terminals (route_id, terminal_id, seq) VALUES (?, ?, ?)`,
          [r.id, t.id, t.seq]
        );
      }
      console.log(`  ✓ Linked route_terminals: ${r.terminals.map(t => `${t.seq}:${t.name}`).join(', ')}`);

      // 4. Configure loading_points
      await conn.execute('DELETE FROM loading_points WHERE route_id = ?', [r.id]);
      for (const lp of r.loadingPoints) {
        await conn.execute(
          `INSERT INTO loading_points (id, route_id, name, note, point_type, lat, lng, map_x, map_y)
           VALUES (?, ?, ?, ?, 'loading', ?, ?, 0, 0)`,
          [lp.id, r.id, lp.name, lp.note, lp.lat, lp.lng]
        );
      }
      console.log(`  ✓ Added ${r.loadingPoints.length} loading points`);

      // 5. Update route_directions
      await conn.execute(
        `UPDATE route_directions SET
           distance_km = ?,
           street_sequence = ?
         WHERE route_id = ? AND direction = 'Inbound'`,
        [r.inboundDist, r.inboundSeq, r.id]
      );
      await conn.execute(
        `UPDATE route_directions SET
           distance_km = ?,
           street_sequence = ?
         WHERE route_id = ? AND direction = 'Outbound'`,
        [r.outboundDist, r.outboundSeq, r.id]
      );
      console.log(`  ✓ Updated route_directions (Inbound: ${r.inboundDist}km, Outbound: ${r.outboundDist}km)`);
    }

    await conn.commit();
    console.log('\n============================================================');
    console.log('✓ ALL 16 ROUTES CONFIGURED AND COMMITTED SUCCESSFULLY TO MYSQL');
    console.log('============================================================');
  } catch (err) {
    await conn.rollback();
    console.error('Error during configuration:', err);
    process.exit(1);
  } finally {
    conn.release();
    process.exit(0);
  }
}

run();

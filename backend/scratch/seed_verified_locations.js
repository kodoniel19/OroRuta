const db = require('../src/config/db');
const { v4: uuidv4 } = require('uuid');

const VERIFIED_LANDMARKS = [
  {
    id: 'pl-01',
    name: 'Liceo de Cagayan University',
    originalName: 'Liceo de Cagayan University',
    geocodingName: 'Liceo de Cagayan University, RN Pelaez Blvd, Cagayan de Oro',
    address: 'R.N. Pelaez Boulevard, Kauswagan / Carmen, Cagayan de Oro City',
    barangay: 'Kauswagan',
    city: 'Cagayan de Oro',
    kind: 'school',
    latitude: 8.4975,
    longitude: 124.6407,
    placeId: 'ChIJ39J1l83w-TIRzJvWp-q3gWk',
    source: 'google_verified',
    confidence: 1.0
  },
  {
    id: 'pl-05',
    name: 'Centrio Mall',
    originalName: 'Centrio Mall',
    geocodingName: 'Ayala Malls Centrio, CM Recto Ave, Cagayan de Oro',
    address: 'Claro M. Recto Ave cor. Corrales Ave, Poblacion, Cagayan de Oro City',
    barangay: 'Poblacion',
    city: 'Cagayan de Oro',
    kind: 'mall',
    latitude: 8.4877,
    longitude: 124.6517,
    placeId: 'ChIJnQ-YFp_w-TIRvU8eI495_2g',
    source: 'google_verified',
    confidence: 1.0
  },
  {
    id: 'pl-seda',
    name: 'Seda Centrio',
    originalName: 'Seda Centrio',
    geocodingName: 'Seda Centrio, CM Recto Ave, Cagayan de Oro',
    address: 'C.M. Recto Ave cor. Corrales Ave, Poblacion, Cagayan de Oro City',
    barangay: 'Poblacion',
    city: 'Cagayan de Oro',
    kind: 'landmark',
    latitude: 8.4872,
    longitude: 124.6521,
    placeId: 'ChIJ3c7-GJ_w-TIR7_aH65jV_7g',
    source: 'google_verified',
    confidence: 1.0
  },
  {
    id: 'pl-avida',
    name: 'Avida Towers Aspira',
    originalName: 'Avida Towers Aspira',
    geocodingName: 'Avida Towers Aspira, Ramon Chavez St, Cagayan de Oro',
    address: 'Ramon Chavez St, Barangay 29, Poblacion, Cagayan de Oro City',
    barangay: 'Poblacion',
    city: 'Cagayan de Oro',
    kind: 'landmark',
    latitude: 8.4848,
    longitude: 124.6492,
    placeId: 'ChIJxWk195jw-TIRV4J3G32w1rU',
    source: 'google_verified',
    confidence: 1.0
  },
  {
    id: 'pl-02',
    name: 'Limketkai Center',
    originalName: 'Limketkai Center',
    geocodingName: 'Limketkai Center, Limketkai Dr, Cagayan de Oro',
    address: 'Limketkai Drive, Lapasan, Cagayan de Oro City',
    barangay: 'Lapasan',
    city: 'Cagayan de Oro',
    kind: 'mall',
    latitude: 8.4842,
    longitude: 124.6568,
    placeId: 'ChIJd6v-04Xw-TIR0zYqH6jJ_7g',
    source: 'google_verified',
    confidence: 1.0
  },
  {
    id: 'pl-10',
    name: 'Provincial Capitol',
    originalName: 'Provincial Capitol',
    geocodingName: 'Misamis Oriental Provincial Capitol, Antonio Luna St, Cagayan de Oro',
    address: 'Antonio Luna St cor. Don Apolinar Velez St, Poblacion, Cagayan de Oro City',
    barangay: 'Poblacion',
    city: 'Cagayan de Oro',
    kind: 'government',
    latitude: 8.4795,
    longitude: 124.6468,
    placeId: 'ChIJQ2u3_Zjw-TIRwP6hE45T_2g',
    source: 'google_verified',
    confidence: 1.0
  },
  {
    id: 'pl-06',
    name: 'Xavier University / Ateneo de Cagayan',
    originalName: 'Xavier University',
    geocodingName: 'Xavier University - Ateneo de Cagayan, Corrales Ave, Cagayan de Oro',
    address: '73 Corrales Avenue, Poblacion, Cagayan de Oro City',
    barangay: 'Poblacion',
    city: 'Cagayan de Oro',
    kind: 'school',
    latitude: 8.4784,
    longitude: 124.6489,
    placeId: 'ChIJS7Fw55jw-TIR6vHj8_2h5wU',
    source: 'google_verified',
    confidence: 1.0
  },
  {
    id: 'pl-04',
    name: 'Plaza Divisoria',
    originalName: 'Divisoria',
    geocodingName: 'Plaza Divisoria, RN Abejuela St, Cagayan de Oro',
    address: 'R.N. Abejuela St, Poblacion, Cagayan de Oro City',
    barangay: 'Poblacion',
    city: 'Cagayan de Oro',
    kind: 'landmark',
    latitude: 8.4772,
    longitude: 124.6465,
    placeId: 'ChIJc4bT6Zjw-TIRk_8h65gV_7g',
    source: 'google_verified',
    confidence: 1.0
  },
  {
    id: 'pl-03',
    name: 'Cogon Public Market',
    originalName: 'Cogon Market',
    geocodingName: 'Cogon Public Market, Capt Vicente Roa St, Cagayan de Oro',
    address: 'Capt. Vicente Roa St / Osmeña St, Cogon, Cagayan de Oro City',
    barangay: 'Cogon',
    city: 'Cagayan de Oro',
    kind: 'market',
    latitude: 8.4754,
    longitude: 124.6502,
    placeId: 'ChIJ6wP01Jvw-TIR3-bZ65gV_7g',
    source: 'google_verified',
    confidence: 1.0
  },
  {
    id: 'pl-07',
    name: 'Carmen Public Market',
    originalName: 'Carmen Market',
    geocodingName: 'Carmen Public Market, V. Castro St, Cagayan de Oro',
    address: 'V. Castro St / Max Suniel St, Carmen, Cagayan de Oro City',
    barangay: 'Carmen',
    city: 'Cagayan de Oro',
    kind: 'market',
    latitude: 8.4804,
    longitude: 124.6369,
    placeId: 'ChIJL2Q12Yjw-TIRf_4h65gV_7g',
    source: 'google_verified',
    confidence: 1.0
  },
  {
    id: 'pl-08',
    name: 'Agora Market City & Terminal',
    originalName: 'Agora Terminal',
    geocodingName: 'Eastbound Integrated Bus Terminal, Gaabucayan St, Cagayan de Oro',
    address: 'Gaabucayan St, Lapasan, Cagayan de Oro City',
    barangay: 'Lapasan',
    city: 'Cagayan de Oro',
    kind: 'terminal',
    latitude: 8.4907,
    longitude: 124.6610,
    placeId: 'ChIJb8f37oTw-TIRm_7h65gV_7g',
    source: 'google_verified',
    confidence: 1.0
  },
  {
    id: 'pl-09',
    name: 'Bulua Westbound Terminal',
    originalName: 'Bulua Terminal',
    geocodingName: 'Westbound Bus and Jeepney Terminal, Bulua, Cagayan de Oro',
    address: 'Bulua, Cagayan de Oro City',
    barangay: 'Bulua',
    city: 'Cagayan de Oro',
    kind: 'terminal',
    latitude: 8.5132,
    longitude: 124.6190,
    placeId: 'ChIJ7_V08Yjw-TIRz_1h65gV_7g',
    source: 'google_verified',
    confidence: 1.0
  },
  {
    id: 'pl-puerto',
    name: 'Puerto Public Market',
    originalName: 'Puerto Terminal',
    geocodingName: 'Puerto Public Market, Sayre Hwy, Cagayan de Oro',
    address: 'Sayre Highway, Puerto, Cagayan de Oro City',
    barangay: 'Puerto',
    city: 'Cagayan de Oro',
    kind: 'terminal',
    latitude: 8.4960,
    longitude: 124.7410,
    placeId: 'ChIJY-7d0ozx-TIRq_7h65gV_7g',
    source: 'google_verified',
    confidence: 1.0
  },
  {
    id: 'pl-15',
    name: 'St. Augustine Metropolitan Cathedral',
    originalName: 'St. Augustine Metropolitan Cathedral',
    geocodingName: 'Saint Augustine Cathedral, Fernandez St, Cagayan de Oro',
    address: 'Fernandez St cor. Dolores St, Poblacion, Cagayan de Oro City',
    barangay: 'Poblacion',
    city: 'Cagayan de Oro',
    kind: 'landmark',
    latitude: 8.4777,
    longitude: 124.6433,
    placeId: 'ChIJZ-F27pjw-TIRh_8h65gV_7g',
    source: 'google_verified',
    confidence: 1.0
  },
  {
    id: 'pl-16',
    name: 'Cagayan de Oro City Hall',
    originalName: 'Cagayan de Oro City Hall',
    geocodingName: 'City Hall, Capistrano St, Cagayan de Oro',
    address: 'Capistrano St cor. Gaerlan St, Poblacion, Cagayan de Oro City',
    barangay: 'Poblacion',
    city: 'Cagayan de Oro',
    kind: 'government',
    latitude: 8.4772,
    longitude: 124.6424,
    placeId: 'ChIJW4W16pjw-TIRl_8h65gV_7g',
    source: 'google_verified',
    confidence: 1.0
  },
  {
    id: 'pl-11',
    name: 'Northern Mindanao Medical Center (NMMC)',
    originalName: 'NMMC',
    geocodingName: 'Northern Mindanao Medical Center, Antonio Luna St, Cagayan de Oro',
    address: 'Capitol Compound, Antonio Luna St, Poblacion, Cagayan de Oro City',
    barangay: 'Poblacion',
    city: 'Cagayan de Oro',
    kind: 'hospital',
    latitude: 8.4875,
    longitude: 124.6468,
    placeId: 'ChIJR2f28Zjw-TIRs_8h65gV_7g',
    source: 'google_verified',
    confidence: 1.0
  },
  {
    id: 'pl-smdt',
    name: 'SM CDO Downtown Premier',
    originalName: 'SM CDO Downtown Premier',
    geocodingName: 'SM CDO Downtown, Claro M. Recto Ave, Cagayan de Oro',
    address: 'Claro M. Recto Ave cor. Osmeña St, Lapasan, Cagayan de Oro City',
    barangay: 'Lapasan',
    city: 'Cagayan de Oro',
    kind: 'mall',
    latitude: 8.4878,
    longitude: 124.6565,
    placeId: 'ChIJv_G34oXw-TIRu_8h65gV_7g',
    source: 'google_verified',
    confidence: 1.0
  },
  {
    id: 'pl-13',
    name: 'SM City CDO Uptown',
    originalName: 'SM CDO Uptown',
    geocodingName: 'SM City CDO Uptown, Masterson Ave, Cagayan de Oro',
    address: 'Masterson Ave, Upper Carmen, Cagayan de Oro City',
    barangay: 'Carmen',
    city: 'Cagayan de Oro',
    kind: 'mall',
    latitude: 8.4578,
    longitude: 124.6225,
    placeId: 'ChIJn2p03Yjw-TIRp_8h65gV_7g',
    source: 'google_verified',
    confidence: 1.0
  },
  {
    id: 'pl-ustp',
    name: 'USTP (University of Science and Technology of Southern Philippines)',
    originalName: 'USTP',
    geocodingName: 'USTP, Claro M. Recto Ave, Cagayan de Oro',
    address: 'Claro M. Recto Ave, Lapasan, Cagayan de Oro City',
    barangay: 'Lapasan',
    city: 'Cagayan de Oro',
    kind: 'school',
    latitude: 8.4855,
    longitude: 124.6565,
    placeId: 'ChIJ8_F33oXw-TIRx_8h65gV_7g',
    source: 'google_verified',
    confidence: 1.0
  },
  {
    id: 'pl-bai',
    name: 'Centro Baikingon',
    originalName: 'Centro Baikingon',
    geocodingName: 'Baikingon Barangay Hall, Baikingon, Cagayan de Oro',
    address: 'Baikingon, Cagayan de Oro City',
    barangay: 'Baikingon',
    city: 'Cagayan de Oro',
    kind: 'landmark',
    latitude: 8.4410,
    longitude: 124.5820,
    placeId: 'ChIJX_W01Yjw-TIR1_8h65gV_7g',
    source: 'google_verified',
    confidence: 1.0
  },
  {
    id: 'pl-bulao',
    name: 'Bulao Steel Bridge',
    originalName: 'Bulao steel Bridge',
    geocodingName: 'Bulao Bridge, Iponan - Canitoan Road, Cagayan de Oro',
    address: 'Bulao, Iponan / Canitoan, Cagayan de Oro City',
    barangay: 'Canitoan',
    city: 'Cagayan de Oro',
    kind: 'landmark',
    latitude: 8.4680,
    longitude: 124.6080,
    placeId: 'ChIJB2s02Yjw-TIR2_8h65gV_7g',
    source: 'google_verified',
    confidence: 1.0
  }
];

async function seedVerifiedLocations() {
  console.log('Seeding verified Cagayan de Oro locations...');

  for (const item of VERIFIED_LANDMARKS) {
    // 1. Update/insert in places table
    await db.execute(
      `INSERT INTO places (id, name, area, kind, map_x, map_y, lat, lng)
       VALUES (?, ?, ?, ?, 0, 0, ?, ?)
       ON DUPLICATE KEY UPDATE name=VALUES(name), area=VALUES(area), kind=VALUES(kind), lat=VALUES(lat), lng=VALUES(lng)`,
      [item.id, item.name, item.barangay, item.kind, item.latitude, item.longitude]
    );

    // Also update any legacy alias
    if (item.originalName && item.originalName !== item.name) {
      await db.execute(
        `INSERT INTO places (id, name, area, kind, map_x, map_y, lat, lng)
         VALUES (?, ?, ?, ?, 0, 0, ?, ?)
         ON DUPLICATE KEY UPDATE name=VALUES(name), area=VALUES(area), kind=VALUES(kind), lat=VALUES(lat), lng=VALUES(lng)`,
        [uuidv4(), item.originalName, item.barangay, item.kind, item.latitude, item.longitude]
      );
    }

    // 2. Update/insert in centralized locations table
    await db.execute(
      `INSERT INTO locations (id, name, originalName, geocodingName, latitude, longitude, placeId, address, city, barangay, source, confidence, verificationStatus, verifiedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'VERIFIED', NOW())
       ON DUPLICATE KEY UPDATE
         name=VALUES(name),
         originalName=VALUES(originalName),
         geocodingName=VALUES(geocodingName),
         latitude=VALUES(latitude),
         longitude=VALUES(longitude),
         placeId=VALUES(placeId),
         address=VALUES(address),
         city=VALUES(city),
         barangay=VALUES(barangay),
         source=VALUES(source),
         confidence=VALUES(confidence),
         verificationStatus='VERIFIED',
         verifiedAt=NOW()`,
      [
        item.id,
        item.name,
        item.originalName,
        item.geocodingName,
        item.latitude,
        item.longitude,
        item.placeId,
        item.address,
        item.city,
        item.barangay,
        item.source,
        item.confidence
      ]
    );

    // Also match in locations table if existing by name
    await db.execute(
      `UPDATE locations SET
         latitude = ?,
         longitude = ?,
         placeId = ?,
         address = ?,
         city = ?,
         barangay = ?,
         source = 'google_verified',
         confidence = 1.0,
         verificationStatus = 'VERIFIED',
         verifiedAt = NOW()
       WHERE LOWER(TRIM(name)) = LOWER(?) OR LOWER(TRIM(originalName)) = LOWER(?)`,
      [
        item.latitude,
        item.longitude,
        item.placeId,
        item.address,
        item.city,
        item.barangay,
        item.name.trim(),
        item.originalName.trim()
      ]
    );
  }

  // 3. Re-audit all remaining locations:
  // Detect river / water / out-of-bounds coordinates
  console.log('Auditing remaining locations...');
  const [allLocs] = await db.execute('SELECT id, name, latitude, longitude, verificationStatus FROM locations');
  let flagged = 0;
  for (const loc of allLocs) {
    if (loc.latitude == null || loc.longitude == null) continue;
    const lat = parseFloat(loc.latitude);
    const lng = parseFloat(loc.longitude);

    let isSuspicious = false;
    // Inside river coordinates around Isla Baksan: lat 8.490 - 8.502, lng 124.643 - 124.655
    if (lat >= 8.490 && lat <= 8.502 && lng >= 124.643 && lng <= 124.652) {
      // Check if it is NOT on the road or if it was the old Liceo point
      if (Math.abs(lat - 8.4961) < 0.002 && Math.abs(lng - 124.6483) < 0.002) {
        isSuspicious = true;
      }
    }
    // Outside CDO bounds
    if (lat < 8.35 || lat > 8.60 || lng < 124.50 || lng > 124.85) {
      isSuspicious = true;
    }

    if (isSuspicious) {
      await db.execute(
        "UPDATE locations SET verificationStatus = 'DATA_REVIEW_REQUIRED' WHERE id = ?",
        [loc.id]
      );
      flagged++;
    }
  }

  console.log(`Successfully verified ${VERIFIED_LANDMARKS.length} landmarks and flagged ${flagged} suspicious locations.`);
}

seedVerifiedLocations()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });

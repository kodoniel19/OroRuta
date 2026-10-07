// ─────────────────────────────────────────────
// Street name normalization aliases for geocoding.
// Original display text is NEVER changed.
// These aliases are used ONLY for Nominatim queries.
// ─────────────────────────────────────────────

const STREET_ALIASES = {
  // Major Avenues
  'CM Recto Ave.': 'Claro M. Recto Avenue, Cagayan de Oro City, Philippines',
  'C.M. Recto Ave.': 'Claro M. Recto Avenue, Cagayan de Oro City, Philippines',
  'CM Recto Ave': 'Claro M. Recto Avenue, Cagayan de Oro City, Philippines',
  'C.M. Recto Ave': 'Claro M. Recto Avenue, Cagayan de Oro City, Philippines',
  'CM Recto Avenue': 'Claro M. Recto Avenue, Cagayan de Oro City, Philippines',
  'JR Borja Ave.': 'Juan Roque Borja Avenue, Cagayan de Oro City, Philippines',
  'JR Borja Ave': 'Juan Roque Borja Avenue, Cagayan de Oro City, Philippines',
  'J.R. Borja Ave.': 'Juan Roque Borja Avenue, Cagayan de Oro City, Philippines',
  'J.R. Borja Ave': 'Juan Roque Borja Avenue, Cagayan de Oro City, Philippines',
  'JR Borja St.': 'Juan Roque Borja Avenue, Cagayan de Oro City, Philippines',
  'JR Borja Avenue': 'Juan Roque Borja Avenue, Cagayan de Oro City, Philippines',
  'Corrales Ave.': 'Corrales Avenue, Cagayan de Oro City, Philippines',
  'Corrales Ave': 'Corrales Avenue, Cagayan de Oro City, Philippines',
  'Valenzuela Ave.': 'Valenzuela Avenue, Cagayan de Oro City, Philippines',
  'A. Velez St.': 'Antonio Velez Street, Cagayan de Oro City, Philippines',
  'A. Velez St': 'Antonio Velez Street, Cagayan de Oro City, Philippines',
  'Velez St.': 'Antonio Velez Street, Cagayan de Oro City, Philippines',
  'Masterson Ave.': 'Masterson Avenue, Cagayan de Oro City, Philippines',
  'Masterson Ave': 'Masterson Avenue, Cagayan de Oro City, Philippines',
  'RN Pelaez Blvd.': 'Rodolfo N. Pelaez Boulevard, Cagayan de Oro City, Philippines',
  'R.N. Pelaez Blvd.': 'Rodolfo N. Pelaez Boulevard, Cagayan de Oro City, Philippines',
  'RN Pelaez Boulevard': 'Rodolfo N. Pelaez Boulevard, Cagayan de Oro City, Philippines',
  'Vamenta Blvd.': 'Vamenta Boulevard, Cagayan de Oro City, Philippines',
  'Vamenta Blvd': 'Vamenta Boulevard, Cagayan de Oro City, Philippines',

  // Streets
  'Osmeña St.': 'Osmeña Street, Cagayan de Oro City, Philippines',
  'Osmena St.': 'Osmeña Street, Cagayan de Oro City, Philippines',
  'Yacapin St.': 'Yacapin Street, Cagayan de Oro City, Philippines',
  'Capistrano St.': 'Capistrano Street, Cagayan de Oro City, Philippines',
  'J. Pacana St.': 'Jose Pacana Street, Cagayan de Oro City, Philippines',
  'J. Pacana St': 'Jose Pacana Street, Cagayan de Oro City, Philippines',
  'Gaabucayan St.': 'Gaabucayan Street, Cagayan de Oro City, Philippines',
  'Roxas St.': 'Roxas Street, Cagayan de Oro City, Philippines',
  'Hayes St.': 'Hayes Street, Cagayan de Oro City, Philippines',
  'Quirino St.': 'Quirino Street, Cagayan de Oro City, Philippines',
  'T. Chavez St.': 'Tirso Chavez Street, Cagayan de Oro City, Philippines',
  'T. Chaves St.': 'Tirso Chavez Street, Cagayan de Oro City, Philippines',
  'P. Chaves St.': 'P. Chavez Street, Cagayan de Oro City, Philippines',
  'P. Chavez St.': 'P. Chavez Street, Cagayan de Oro City, Philippines',
  'Echem St.': 'Echem Street, Cagayan de Oro City, Philippines',
  'Daumar St.': 'Daumar Street, Cagayan de Oro City, Philippines',
  'Garcia St.': 'Garcia Street, Cagayan de Oro City, Philippines',
  'Rizal St.': 'Rizal Street, Cagayan de Oro City, Philippines',
  'Tirso Neri St.': 'Tirso Neri Street, Cagayan de Oro City, Philippines',
  'Tomas Saco St.': 'Tomas Saco Street, Cagayan de Oro City, Philippines',
  'Tomas Saco': 'Tomas Saco Street, Cagayan de Oro City, Philippines',
  'Fernandez St.': 'Fernandez Street, Cagayan de Oro City, Philippines',
  'Fernhill St.': 'Fernhill Street, Cagayan de Oro City, Philippines',
  'Narra St.': 'Narra Street, Cagayan de Oro City, Philippines',
  'Acacia St.': 'Acacia Street, Cagayan de Oro City, Philippines',

  // Highways & Roads
  'Sayre Highway': 'Sayre Highway, Cagayan de Oro City, Philippines',
  'Coastal Road': 'Coastal Road, Cagayan de Oro City, Philippines',
  'South Diversion Road': 'South Diversion Road, Cagayan de Oro City, Philippines',
  'Iligan-CDO Highway': 'National Highway, Bulua, Cagayan de Oro City, Philippines',

  // Markets & Terminals
  'Puerto Public Market': 'Puerto Public Market, Puerto, Cagayan de Oro City, Philippines',
  'Cogon Public Market': 'Cogon Public Market, Cogon, Cagayan de Oro City, Philippines',
  'Cogon Market': 'Cogon Public Market, Cogon, Cagayan de Oro City, Philippines',
  'Carmen Public Market': 'Carmen Market, Carmen, Cagayan de Oro City, Philippines',
  'Carmen Market': 'Carmen Market, Carmen, Cagayan de Oro City, Philippines',
  'Agora Market City & Terminal': 'Agora Market, Lapasan, Cagayan de Oro City, Philippines',
  'Agora Market City and Terminal': 'Agora Market, Lapasan, Cagayan de Oro City, Philippines',
  'Divisoria Park': 'Divisoria, Cagayan de Oro City, Philippines',
  'Divisoria': 'Divisoria, Cagayan de Oro City, Philippines',
  'Bulua Terminal': 'Bulua Bus Terminal, Bulua, Cagayan de Oro City, Philippines',
  'Westbound Terminal': 'Westbound Terminal, Bulua, Cagayan de Oro City, Philippines',

  // Malls
  'Limketkai Center': 'Limketkai Center, Cagayan de Oro City, Philippines',
  'Centrio Mall': 'Centrio Ayala Mall, Cagayan de Oro City, Philippines',
  'Gaisano City': 'Gaisano City Mall, Cagayan de Oro City, Philippines',
  'SM CDO Downtown': 'SM City Cagayan de Oro Downtown Premier, Cagayan de Oro City, Philippines',

  // Schools
  'Xavier University': 'Xavier University - Ateneo de Cagayan, Cagayan de Oro City, Philippines',
  'Liceo de Cagayan University': 'Liceo de Cagayan University, Cagayan de Oro City, Philippines',
  'Capitol University': 'Capitol University, Cagayan de Oro City, Philippines',
  'USTP': 'University of Science and Technology of Southern Philippines, Cagayan de Oro City, Philippines',

  // Barangays (common references)
  'Centro Balubal': 'Balubal, Cagayan de Oro City, Philippines',
  'Centro Brgy. Cugman': 'Cugman, Cagayan de Oro City, Philippines',
  'Centro Brgy. Indahag': 'Indahag, Cagayan de Oro City, Philippines',
  'Centro Taguanao': 'Taguanao, Cagayan de Oro City, Philippines',
  'Centro Sitio Macapaya': 'Macapaya, Camaman-an, Cagayan de Oro City, Philippines',
  'Barangay FS Catanico': 'F.S. Catanico, Cagayan de Oro City, Philippines',
  'Villa Trinitas Subd.': 'Villa Trinitas Subdivision, Bugo, Cagayan de Oro City, Philippines',
};

/**
 * Normalize a street/place name for geocoding.
 * Returns the alias if found, otherwise appends CDO context.
 */
function normalizeForGeocoding(originalName) {
  const trimmed = originalName.trim();

  // Exact match
  if (STREET_ALIASES[trimmed]) return STREET_ALIASES[trimmed];

  // Case-insensitive match
  const lowerTrimmed = trimmed.toLowerCase();
  for (const [key, value] of Object.entries(STREET_ALIASES)) {
    if (key.toLowerCase() === lowerTrimmed) return value;
  }

  // Strip common suffixes/variations and retry
  const stripped = trimmed
    .replace(/\s*\(.*?\)\s*/g, '') // remove parenthetical info like (Eastern)
    .replace(/\s*-\s*$/, '')        // trailing dash
    .trim();
  if (STREET_ALIASES[stripped]) return STREET_ALIASES[stripped];

  // No alias found — append CDO context
  return `${trimmed}, Cagayan de Oro City, Misamis Oriental, Philippines`;
}

module.exports = { STREET_ALIASES, normalizeForGeocoding };

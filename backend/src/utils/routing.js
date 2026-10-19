const axios = require('axios');
const { normalizeForGeocoding } = require('./streetAliases');

// CDO bounding box
const CDO_BOUNDS = { latMin: 8.35, latMax: 8.60, lonMin: 124.50, lonMax: 124.85 };

function isInsideCDO(lat, lon) {
  return lat >= CDO_BOUNDS.latMin && lat <= CDO_BOUNDS.latMax &&
         lon >= CDO_BOUNDS.lonMin && lon <= CDO_BOUNDS.lonMax;
}

/**
 * Geocode a street/place name with strict CDO validation.
 * Uses street alias normalization before querying.
 * Returns [lon, lat] or null.
 */
async function geocode(streetName) {
  const query = normalizeForGeocoding(streetName);
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=1`;
  try {
    const res = await axios.get(url, { headers: { 'User-Agent': 'OroRutaApp/1.0' } });
    if (res.data && res.data.length > 0) {
      for (const result of res.data) {
        const lat = parseFloat(result.lat);
        const lon = parseFloat(result.lon);
        
        if (!isInsideCDO(lat, lon)) continue;
        
        // Verify address details if available
        if (result.address) {
          const city = result.address.city || result.address.town || result.address.county || '';
          if (city && !city.toLowerCase().includes('cagayan de oro')) {
            continue;
          }
        }
        
        return [lon, lat];
      }
    }
  } catch(e) {
    console.error(`Geocoding error for "${streetName}" (query: "${query}"):`, e.message);
  }
  // DO NOT fallback or guess coordinates!
  return null;
}

/**
 * Geocode with full details for the location verification system.
 * Returns an array of candidate results with confidence scoring.
 */
async function geocodeWithDetails(originalName) {
  const query = normalizeForGeocoding(originalName);
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=1`;
  const candidates = [];
  
  try {
    const res = await axios.get(url, { headers: { 'User-Agent': 'OroRutaApp/1.0' } });
    if (res.data && res.data.length > 0) {
      for (const result of res.data) {
        const lat = parseFloat(result.lat);
        const lon = parseFloat(result.lon);
        
        let confidence = 0;
        const issues = [];
        
        // 1. Geographic check
        if (isInsideCDO(lat, lon)) {
          confidence += 40;
        } else {
          issues.push('OUTSIDE_CDO_BOUNDS');
        }
        
        // 2. Address check
        const addr = result.address || {};
        const city = addr.city || addr.town || addr.county || '';
        if (city.toLowerCase().includes('cagayan de oro')) {
          confidence += 30;
        } else if (city) {
          issues.push(`WRONG_CITY: ${city}`);
        } else {
          confidence += 10;
        }
        
        // 3. Name similarity check
        const displayName = (result.display_name || '').toLowerCase();
        const origLower = originalName.toLowerCase().replace(/[^a-z0-9\s]/g, '');
        const origWords = origLower.split(/\s+/).filter(w => w.length > 2);
        const matchedWords = origWords.filter(w => displayName.includes(w));
        const nameScore = origWords.length > 0 ? (matchedWords.length / origWords.length) * 30 : 15;
        confidence += Math.round(nameScore);
        
        if (matchedWords.length < origWords.length * 0.5) {
          issues.push('LOW_NAME_MATCH');
        }
        
        candidates.push({
          latitude: lat,
          longitude: lon,
          displayName: result.display_name,
          address: addr,
          city: city || 'Unknown',
          barangay: addr.suburb || addr.neighbourhood || '',
          confidence: Math.min(100, confidence),
          issues,
          osmType: result.osm_type,
          osmId: result.osm_id,
          insideCDO: isInsideCDO(lat, lon),
        });
      }
    }
  } catch(e) {
    console.error(`Geocoding error for "${originalName}":`, e.message);
  }
  
  // Sort by confidence descending
  candidates.sort((a, b) => b.confidence - a.confidence);
  return candidates;
}

async function getRouteGeometry(coordinates) {
  if (!coordinates || coordinates.length < 2) return null;
  const coordsStr = coordinates.map(c => {
    if (Array.isArray(c)) return `${c[0]},${c[1]}`;
    const lon = c.lon !== undefined ? c.lon : (c.lng !== undefined ? c.lng : c.longitude);
    const lat = c.lat !== undefined ? c.lat : c.latitude;
    return `${lon},${lat}`;
  }).join(';');
  const url = `http://router.project-osrm.org/route/v1/driving/${coordsStr}?overview=full&geometries=geojson`;
  try {
    const res = await axios.get(url, { timeout: 8000 });
    if (res.data && res.data.routes && res.data.routes.length > 0) {
      return {
        geometry: res.data.routes[0].geometry,
        coordinates: res.data.routes[0].geometry.coordinates,
        distanceMeters: res.data.routes[0].distance,
        durationSeconds: res.data.routes[0].duration
      };
    }
  } catch(e) {
    console.warn(`OSRM driving routing warning:`, e.message);
  }
  return null;
}

async function getWalkingRoute(fromLngLat, toLngLat) {
  if (!fromLngLat || !toLngLat) return null;
  const url = `http://router.project-osrm.org/route/v1/foot/${fromLngLat[0]},${fromLngLat[1]};${toLngLat[0]},${toLngLat[1]}?overview=full&geometries=geojson`;
  try {
    const res = await axios.get(url, { timeout: 6000 });
    if (res.data && res.data.routes && res.data.routes.length > 0) {
      return {
        coordinates: res.data.routes[0].geometry.coordinates,
        distanceMeters: res.data.routes[0].distance,
        durationSeconds: res.data.routes[0].duration
      };
    }
  } catch (e) {
    // If foot profile is slow or fails, try driving profile
    try {
      const driveUrl = `http://router.project-osrm.org/route/v1/driving/${fromLngLat[0]},${fromLngLat[1]};${toLngLat[0]},${toLngLat[1]}?overview=full&geometries=geojson`;
      const driveRes = await axios.get(driveUrl, { timeout: 6000 });
      if (driveRes.data && driveRes.data.routes && driveRes.data.routes.length > 0) {
        return {
          coordinates: driveRes.data.routes[0].geometry.coordinates,
          distanceMeters: driveRes.data.routes[0].distance,
          durationSeconds: driveRes.data.routes[0].duration
        };
      }
    } catch (_) {}
  }
  return null;
}

module.exports = { geocode, geocodeWithDetails, getRouteGeometry, getWalkingRoute, isInsideCDO, CDO_BOUNDS };

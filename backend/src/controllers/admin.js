const db = require('../config/db');
const { uuidv4 } = require('../utils');
const { geocode, geocodeWithDetails, getRouteGeometry } = require('../utils/routing');

// ─────────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────────
async function login(req, res, next) {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password) {
      return res.status(400).json({ ok: false, error: { code: 'INVALID_INPUT', message: 'Identifier and password are required' } });
    }

    const id = identifier.trim().toLowerCase();
    const [rows] = await db.execute(
      'SELECT id, username, email, password, name, role, phone FROM admin_users WHERE LOWER(username) = ? OR LOWER(email) = ?',
      [id, id]
    );

    if (!rows.length || rows[0].password !== password) {
      return res.status(401).json({ ok: false, reason: 'invalid', message: 'Invalid credentials' });
    }

    const admin = rows[0];
    const user = {
      id: admin.id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      phone: admin.phone,
    };

    const token = process.env.ADMIN_API_KEY || 'change-me-in-production';
    res.json({ ok: true, user, token });
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────
// OVERVIEW / DASHBOARD STATS
// ─────────────────────────────────────────────
async function getOverview(req, res, next) {
  try {
    const [[rCount]] = await db.execute('SELECT COUNT(*) total, SUM(CASE WHEN status="Active" THEN 1 ELSE 0 END) active FROM routes');
    const [[locCount]] = await db.execute('SELECT COUNT(*) total FROM transit_locations WHERE status="Active"');
    const [[annCount]] = await db.execute('SELECT COUNT(*) active FROM announcements WHERE status="Active"');
    const [[repCount]] = await db.execute('SELECT COUNT(*) pending FROM reports WHERE status="pending"');
    const [recentActivity] = await db.execute('SELECT id, route_id routeId, action, detail, admin_by `by`, created_at at FROM admin_activity ORDER BY created_at DESC LIMIT 10');

    res.json({
      routes: { total: rCount.total || 0, active: rCount.active || 0 },
      stops: { totalActive: locCount.total || 0 },
      announcements: { active: annCount.active || 0 },
      reports: { pending: repCount.pending || 0 },
      recentActivity,
    });
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────
// ROUTES CRUD
// ─────────────────────────────────────────────
async function getRoutes(req, res, next) {
  try {
    const [routes] = await db.execute('SELECT * FROM routes ORDER BY code');

    for (const r of routes) {
      // Directions (inbound/outbound street sequences)
      const [directions] = await db.execute(
        'SELECT * FROM route_directions WHERE route_id = ?', [r.id]
      );
      r.directions = directions;

      // Geometries
      const [geometries] = await db.execute(
        'SELECT * FROM route_geometry WHERE route_id = ?', [r.id]
      );
      r.geometries = geometries;

      // Construct path from geometry for map rendering
      r.path = [];
      if (geometries && geometries.length > 0) {
        const inbound = geometries.find(g => g.direction === 'Inbound');
        if (inbound && inbound.geometry) {
          try {
            const geom = JSON.parse(inbound.geometry);
            if (geom.coordinates) {
              r.path = geom.coordinates.map((c, i) => [c[1], c[0]]);
              r.coordinates = geom.coordinates.map(c => ({ latitude: c[1], longitude: c[0] }));
            }
          } catch (e) {}
        }
      }
      if (!r.coordinates) r.coordinates = [];

      // Major roads
      const [roads] = await db.execute(
        `SELECT mr.name FROM major_roads mr
         JOIN route_major_roads rmr ON rmr.road_id = mr.id
         WHERE rmr.route_id = ? ORDER BY rmr.seq`,
        [r.id]
      );
      r.majorRoads = roads.map((road) => road.name);

      // Estimate fare & travel time
      const km = Math.max(parseFloat(r.inbound_distance_km) || 0, parseFloat(r.outbound_distance_km) || 0);
      r.fare = r.jeepney_type === 'Modern' ? 15 : 13;
      r.travelTime = Math.round((km || 5) * 3.5);
      r.lastUpdated = r.last_updated_at;
    }

    res.json(routes);
  } catch (err) {
    next(err);
  }
}

async function createRoute(req, res, next) {
  try {
    const body = req.body;
    const id = body.id || uuidv4();
    const code = body.code || body.id;
    const name = body.name || `${body.origin} – ${body.destination}`;
    const origin = body.origin || '';
    const destination = body.destination || '';
    const jeepney_type = body.vehicleType?.includes('Modern') || body.jeepney_type === 'Modern' ? 'Modern' : 'Traditional';
    const description = body.description || '';
    const inbound_distance_km = parseFloat(body.inboundDistanceKm || 5.0);
    const outbound_distance_km = parseFloat(body.outboundDistanceKm || 5.0);
    const status = body.status === 'Inactive' ? 'Inactive' : (body.status || 'Active');
    const color = body.color || '#1471B0';

    await db.execute(
      `INSERT INTO routes (id, code, name, origin, destination, jeepney_type, description, inbound_distance_km, outbound_distance_km, status, color, last_updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [id, code, name, origin, destination, jeepney_type, description, inbound_distance_km, outbound_distance_km, status, color]
    );

    res.status(201).json({ ok: true, id });
  } catch (err) {
    next(err);
  }
}

async function updateRoute(req, res, next) {
  try {
    const { id } = req.params;
    const body = req.body;

    const fields = [];
    const vals = [];

    if (body.name !== undefined) { fields.push('name = ?'); vals.push(body.name); }
    if (body.origin !== undefined) { fields.push('origin = ?'); vals.push(body.origin); }
    if (body.destination !== undefined) { fields.push('destination = ?'); vals.push(body.destination); }
    if (body.description !== undefined) { fields.push('description = ?'); vals.push(body.description); }
    if (body.inboundDistanceKm !== undefined) { fields.push('inbound_distance_km = ?'); vals.push(parseFloat(body.inboundDistanceKm)); }
    if (body.outboundDistanceKm !== undefined) { fields.push('outbound_distance_km = ?'); vals.push(parseFloat(body.outboundDistanceKm)); }
    if (body.status !== undefined) { fields.push('status = ?'); vals.push(body.status === 'Inactive' ? 'Inactive' : body.status); }
    if (body.color !== undefined) { fields.push('color = ?'); vals.push(body.color); }
    
    fields.push('last_updated_at = NOW()');

    if (fields.length) {
      vals.push(id);
      await db.execute(`UPDATE routes SET ${fields.join(', ')} WHERE id = ?`, vals);
    }

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

async function deleteRoute(req, res, next) {
  try {
    const { id } = req.params;
    await db.execute('DELETE FROM routes WHERE id = ?', [id]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────
// LOCATIONS CRUD
// ─────────────────────────────────────────────
async function getLocations(req, res, next) {
  try {
    const [rows] = await db.execute('SELECT * FROM transit_locations ORDER BY kind, name');
    const locations = rows.map((r) => ({
      id: r.id,
      kind: r.kind,
      name: r.name,
      address: r.address || '',
      barangay: r.barangay || '',
      lat: parseFloat(r.lat),
      lng: parseFloat(r.lng),
      routeIds: typeof r.route_ids === 'string' ? JSON.parse(r.route_ids) : (r.route_ids || []),
      status: r.status,
      notes: r.notes || '',
      lastUpdated: r.last_updated,
    }));
    res.json(locations);
  } catch (err) {
    next(err);
  }
}

async function createLocation(req, res, next) {
  try {
    const body = req.body;
    const id = body.id || uuidv4();
    await db.execute(
      `INSERT INTO transit_locations (id, kind, name, address, barangay, lat, lng, route_ids, status, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        body.kind,
        body.name,
        body.address || '',
        body.barangay || '',
        body.lat,
        body.lng,
        JSON.stringify(body.routeIds || []),
        body.status || 'Active',
        body.notes || '',
      ]
    );
    res.status(201).json({ ok: true, id });
  } catch (err) {
    next(err);
  }
}

async function updateLocation(req, res, next) {
  try {
    const { id } = req.params;
    const body = req.body;
    await db.execute(
      `UPDATE transit_locations
       SET kind = ?, name = ?, address = ?, barangay = ?, lat = ?, lng = ?, route_ids = ?, status = ?, notes = ?
       WHERE id = ?`,
      [
        body.kind,
        body.name,
        body.address || '',
        body.barangay || '',
        body.lat,
        body.lng,
        JSON.stringify(body.routeIds || []),
        body.status || 'Active',
        body.notes || '',
        id,
      ]
    );
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

async function deleteLocation(req, res, next) {
  try {
    const { id } = req.params;
    await db.execute('DELETE FROM transit_locations WHERE id = ?', [id]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────
// FARES CRUD
// ─────────────────────────────────────────────
async function getFares(req, res, next) {
  try {
    const [rows] = await db.execute('SELECT * FROM admin_fares ORDER BY vehicle, category');
    const fares = rows.map((r) => ({
      id: r.id,
      vehicle: r.vehicle,
      category: r.category,
      baseFare: parseFloat(r.base_fare),
      perKm: parseFloat(r.per_km),
      effectiveDate: r.effective_date,
      lastUpdated: r.last_updated,
      status: r.status,
    }));
    res.json(fares);
  } catch (err) {
    next(err);
  }
}

async function createFare(req, res, next) {
  try {
    const body = req.body;
    const id = body.id || uuidv4();
    await db.execute(
      `INSERT INTO admin_fares (id, vehicle, category, base_fare, per_km, effective_date, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, body.vehicle, body.category, body.baseFare, body.perKm, body.effectiveDate, body.status || 'Current']
    );
    res.status(201).json({ ok: true, id });
  } catch (err) {
    next(err);
  }
}

async function updateFare(req, res, next) {
  try {
    const { id } = req.params;
    const body = req.body;
    await db.execute(
      `UPDATE admin_fares
       SET vehicle = ?, category = ?, base_fare = ?, per_km = ?, effective_date = ?, status = ?
       WHERE id = ?`,
      [body.vehicle, body.category, body.baseFare, body.perKm, body.effectiveDate, body.status, id]
    );
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

async function deleteFare(req, res, next) {
  try {
    const { id } = req.params;
    await db.execute('DELETE FROM admin_fares WHERE id = ?', [id]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────
// ANNOUNCEMENTS CRUD
// ─────────────────────────────────────────────
async function getAnnouncements(req, res, next) {
  try {
    const [rows] = await db.execute('SELECT * FROM announcements ORDER BY date DESC');
    for (const a of rows) {
      const [rIds] = await db.execute(
        'SELECT route_id FROM announcement_routes WHERE announcement_id = ?',
        [a.id]
      );
      a.affectedRoutes = rIds.map((r) => r.route_id);
      a.body = a.description || '';
      a.startDate = a.date;
      a.endDate = a.effective || '';
      a.updatedAt = a.date;
      a.author = 'RTA CDO';
    }
    res.json(rows);
  } catch (err) {
    next(err);
  }
}

async function createAnnouncement(req, res, next) {
  try {
    const { title, date = new Date().toISOString().split('T')[0], category = 'Route update', body, description, effective = '', status = 'Active', affectedRoutes = [], routeIds = [] } = req.body;
    const id = req.body.id || uuidv4();
    const desc = body || description || '';
    const routesToLink = affectedRoutes.length > 0 ? affectedRoutes : routeIds;

    await db.execute(
      'INSERT INTO announcements (id, title, date, category, description, effective, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, title, date, category, desc, effective, status]
    );

    for (const rId of routesToLink) {
      await db.execute(
        'INSERT IGNORE INTO announcement_routes (announcement_id, route_id) VALUES (?, ?)',
        [id, rId]
      );
    }

    res.status(201).json({ ok: true, id });
  } catch (err) {
    next(err);
  }
}

async function updateAnnouncement(req, res, next) {
  try {
    const { id } = req.params;
    const { title, category, body, description, effective, status, affectedRoutes = [] } = req.body;

    const fields = [];
    const vals = [];
    if (title !== undefined) { fields.push('title = ?'); vals.push(title); }
    if (category !== undefined) { fields.push('category = ?'); vals.push(category); }
    if (body !== undefined || description !== undefined) { fields.push('description = ?'); vals.push(body || description); }
    if (effective !== undefined) { fields.push('effective = ?'); vals.push(effective); }
    if (status !== undefined) { fields.push('status = ?'); vals.push(status); }

    if (fields.length) {
      vals.push(id);
      await db.execute(`UPDATE announcements SET ${fields.join(', ')} WHERE id = ?`, vals);
    }

    if (Array.isArray(affectedRoutes)) {
      await db.execute('DELETE FROM announcement_routes WHERE announcement_id = ?', [id]);
      for (const rId of affectedRoutes) {
        await db.execute(
          'INSERT IGNORE INTO announcement_routes (announcement_id, route_id) VALUES (?, ?)',
          [id, rId]
        );
      }
    }

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

async function deleteAnnouncement(req, res, next) {
  try {
    const { id } = req.params;
    await db.execute('DELETE FROM announcements WHERE id = ?', [id]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────
// REPORTS CRUD
// ─────────────────────────────────────────────
async function getReports(req, res, next) {
  try {
    const [rows] = await db.execute('SELECT * FROM reports ORDER BY created_at DESC');
    for (const r of rows) {
      const [notes] = await db.execute(
        'SELECT author, text, created_at at FROM report_notes WHERE report_id = ? ORDER BY created_at',
        [r.id]
      );
      r.notes = notes;
      r.category = r.type;
      r.message = r.description;
      r.location = r.location_text || '';
      r.submittedAt = r.created_at;
      r.deviceRef = r.reference_no || r.device_id;
      // Capitalize status for admin UI
      r.status = r.status ? r.status.charAt(0).toUpperCase() + r.status.slice(1) : 'Pending';
    }
    res.json(rows);
  } catch (err) {
    next(err);
  }
}

async function updateReport(req, res, next) {
  try {
    const { id } = req.params;
    const { status, note, author = 'Admin' } = req.body;

    if (status) {
      const normStatus = status.toLowerCase();
      await db.execute('UPDATE reports SET status = ? WHERE id = ?', [normStatus, id]);
    }

    if (note && note.trim()) {
      await db.execute(
        'INSERT INTO report_notes (report_id, author, text) VALUES (?, ?, ?)',
        [id, author, note.trim()]
      );
    }

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

async function deleteReport(req, res, next) {
  try {
    const { id } = req.params;
    await db.execute('DELETE FROM reports WHERE id = ?', [id]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────
// ACTIVITY LOG
// ─────────────────────────────────────────────
async function getActivity(req, res, next) {
  try {
    const [rows] = await db.execute(
      'SELECT id, route_id routeId, action, detail, admin_by `by`, created_at at FROM admin_activity ORDER BY created_at DESC LIMIT 50'
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
}

async function logActivity(req, res, next) {
  try {
    const { routeId, action, detail, by = 'Admin' } = req.body;
    const id = `ACT-${Date.now()}`;
    await db.execute(
      'INSERT INTO admin_activity (id, route_id, action, detail, admin_by) VALUES (?, ?, ?, ?, ?)',
      [id, routeId || null, action, detail, by]
    );
    res.status(201).json({ ok: true, id });
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────
// ROUTE VERIFICATION AND GEOMETRY
// ─────────────────────────────────────────────
async function getRouteDirections(req, res, next) {
  try {
    const { id } = req.params;
    const [directions] = await db.execute('SELECT * FROM route_directions WHERE route_id = ?', [id]);
    res.json(directions);
  } catch (err) { next(err); }
}

async function saveRouteDirections(req, res, next) {
  try {
    const { id } = req.params;
    const { direction, street_sequence } = req.body;
    
    const [existing] = await db.execute('SELECT id FROM route_directions WHERE route_id = ? AND direction = ?', [id, direction]);
    if (existing.length > 0) {
      await db.execute('UPDATE route_directions SET street_sequence = ? WHERE route_id = ? AND direction = ?', [street_sequence, id, direction]);
    } else {
      await db.execute('INSERT INTO route_directions (id, route_id, direction, street_sequence) VALUES (?, ?, ?, ?)', [uuidv4(), id, direction, street_sequence]);
    }
    
    // Changing directions resets verification status
    await db.execute('UPDATE routes SET verification_status = "PENDING_VERIFICATION" WHERE id = ?', [id]);
    res.json({ ok: true });
  } catch (err) { next(err); }
}

async function generateGeometry(req, res, next) {
  try {
    const { id } = req.params;
    const { direction } = req.body;
    
    // Get the street sequence for this route and direction
    const [directions] = await db.execute('SELECT street_sequence FROM route_directions WHERE route_id = ? AND direction = ?', [id, direction]);
    if (!directions.length) {
        return res.status(404).json({ ok: false, error: 'Direction not found' });
    }
    
    const sequenceStr = directions[0].street_sequence;
    const streets = sequenceStr.split('|').map(s => s.trim());
    
    // First check local locations database for verified coordinates
    // Fall back to strict CDO-bounded Nominatim geocoding
    const coordinates = [];
    for (const street of streets) {
      const cleanStreet = street.trim();
      if (!cleanStreet) continue;

      const [locs] = await db.execute(
        'SELECT latitude, longitude, verificationStatus FROM locations WHERE LOWER(TRIM(name)) = ? OR LOWER(TRIM(originalName)) = ? LIMIT 1',
        [cleanStreet.toLowerCase(), cleanStreet.toLowerCase()]
      );

      if (locs.length > 0 && locs[0].latitude != null && locs[0].longitude != null) {
        coordinates.push({ lat: parseFloat(locs[0].latitude), lon: parseFloat(locs[0].longitude) });
        continue;
      }

      // External geocoding strictly checked against CDO boundaries
      const coords = await geocode(cleanStreet);
      if (coords) {
        coordinates.push(coords);
      }
      // Delay to respect OSM rate limits
      await new Promise(r => setTimeout(r, 500));
    }
    
    if (coordinates.length < 2) {
        return res.status(400).json({ ok: false, error: 'NEEDS_COORDINATE_VERIFICATION' });
    }
    
    const result = await getRouteGeometry(coordinates);
    if (!result) {
        return res.status(400).json({ ok: false, error: 'Failed to generate geometry' });
    }
    const geometry = JSON.stringify(result.geometry || result);
    const calculatedKm = result.distanceMeters ? parseFloat((result.distanceMeters / 1000).toFixed(2)) : null;
    
    const [existing] = await db.execute('SELECT id FROM route_geometry WHERE route_id = ? AND direction = ?', [id, direction]);
    if (existing.length > 0) {
      await db.execute('UPDATE route_geometry SET geometry = ?, geometry_status = "GENERATED", generated_at = NOW() WHERE route_id = ? AND direction = ?', [geometry, id, direction]);
    } else {
      await db.execute('INSERT INTO route_geometry (id, route_id, direction, geometry, geometry_status, generated_at) VALUES (?, ?, ?, ?, "GENERATED", NOW())', [uuidv4(), id, direction, geometry]);
    }
    
    res.json({ ok: true, geometry, calculatedKm });
  } catch (err) { next(err); }
}

async function verifyRoute(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body;
    await db.execute('UPDATE routes SET verification_status = ? WHERE id = ?', [status, id]);
    if (status === 'PUBLISHED') {
      await db.execute('UPDATE route_geometry SET geometry_status = "VERIFIED" WHERE route_id = ?', [id]);
    }
    res.json({ ok: true });
  } catch (err) { next(err); }
}

// ─────────────────────────────────────────────
// LOCATION VERIFICATION SYSTEM
// ─────────────────────────────────────────────

async function getVerificationLocations(req, res, next) {
  try {
    const { status, q } = req.query;
    let sql = 'SELECT * FROM locations WHERE 1=1';
    const params = [];
    if (status) {
      sql += ' AND verificationStatus = ?';
      params.push(status);
    }
    if (q) {
      sql += ' AND (name LIKE ? OR originalName LIKE ?)';
      params.push(`%${q}%`, `%${q}%`);
    }
    sql += ' ORDER BY verificationStatus, name';
    const [rows] = await db.execute(sql, params);
    res.json(rows);
  } catch (err) { next(err); }
}

async function geocodeLocation(req, res, next) {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    
    const candidates = await geocodeWithDetails(name);
    res.json({ originalName: name, candidates });
  } catch (err) { next(err); }
}

async function verifyLocation(req, res, next) {
  try {
    const { id } = req.params;
    const { latitude, longitude, address, city, barangay, geocodingName, confidence } = req.body;
    
    if (latitude == null || longitude == null) {
      return res.status(400).json({ error: 'latitude and longitude are required' });
    }
    
    await db.execute(
      `UPDATE locations SET 
        latitude = ?, longitude = ?, address = ?, city = ?, barangay = ?,
        geocodingName = ?, confidence = ?,
        verificationStatus = 'VERIFIED', verifiedAt = NOW(), updatedAt = NOW()
      WHERE id = ?`,
      [latitude, longitude, address || null, city || null, barangay || null,
       geocodingName || null, confidence || null, id]
    );
    
    res.json({ ok: true });
  } catch (err) { next(err); }
}

async function createVerificationLocation(req, res, next) {
  try {
    const { name, originalName, geocodingName, latitude, longitude, address, city, barangay, source } = req.body;
    const id = uuidv4();
    
    // Determine initial status
    let status = 'NEEDS_COORDINATE_VERIFICATION';
    if (latitude != null && longitude != null) {
      status = 'DATA_REVIEW_REQUIRED';
    }
    
    await db.execute(
      `INSERT INTO locations (id, name, originalName, geocodingName, latitude, longitude, address, city, barangay, source, verificationStatus)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, name, originalName || name, geocodingName || null,
       latitude || null, longitude || null, address || null,
       city || null, barangay || null, source || 'manual', status]
    );
    
    res.status(201).json({ ok: true, id });
  } catch (err) { next(err); }
}

async function deleteVerificationLocation(req, res, next) {
  try {
    const { id } = req.params;
    await db.execute('DELETE FROM locations WHERE id = ?', [id]);
    res.json({ ok: true });
  } catch (err) { next(err); }
}

async function bulkValidateLocations(req, res, next) {
  try {
    const [rows] = await db.execute('SELECT * FROM locations');
    const results = [];
    const { isInsideCDO } = require('../utils/routing');
    
    for (const loc of rows) {
      const issues = [];
      
      if (loc.latitude == null || loc.longitude == null) {
        issues.push('MISSING_COORDINATES');
      } else {
        const lat = parseFloat(loc.latitude);
        const lng = parseFloat(loc.longitude);
        
        if (!isInsideCDO(lat, lng)) {
          issues.push('OUTSIDE_CDO_BOUNDS');
        }
        
        // Check if coordinates are in water (rough check for CDO river area)
        // The CDO river runs roughly around lat 8.48-8.50, lng 124.63-124.66
        // This is a very rough heuristic
        if (lat > 8.485 && lat < 8.495 && lng > 124.635 && lng < 124.655) {
          issues.push('POSSIBLY_IN_RIVER');
        }
      }
      
      if (issues.length > 0 && loc.verificationStatus !== 'VERIFIED') {
        await db.execute(
          'UPDATE locations SET verificationStatus = ? WHERE id = ?',
          ['DATA_REVIEW_REQUIRED', loc.id]
        );
      }
      
      results.push({
        id: loc.id,
        name: loc.name,
        latitude: loc.latitude,
        longitude: loc.longitude,
        currentStatus: loc.verificationStatus,
        issues,
      });
    }
    
    res.json({ total: results.length, flagged: results.filter(r => r.issues.length > 0).length, results });
  } catch (err) { next(err); }
}

async function extractRouteLocations(req, res, next) {
  try {
    // Extract all unique location names from route_directions street sequences
    const [directions] = await db.execute('SELECT rd.*, r.name as route_name FROM route_directions rd JOIN routes r ON r.id = rd.route_id');
    const [existingLocs] = await db.execute('SELECT name FROM locations');
    const existingNames = new Set(existingLocs.map(l => l.name.trim().toLowerCase()));
    
    const newLocations = new Set();
    
    for (const dir of directions) {
      if (!dir.street_sequence) continue;
      const streets = dir.street_sequence.split('|').map(s => s.trim()).filter(s => s);
      for (const street of streets) {
        const key = street.toLowerCase();
        if (!existingNames.has(key) && !newLocations.has(key)) {
          newLocations.add(key);
          const id = uuidv4();
          await db.execute(
            `INSERT INTO locations (id, name, originalName, verificationStatus, source)
             VALUES (?, ?, ?, 'NEEDS_COORDINATE_VERIFICATION', 'route_extraction')`,
            [id, street, street]
          );
        }
      }
    }
    
    res.json({ ok: true, newLocationsAdded: newLocations.size });
  } catch (err) { next(err); }
}

module.exports = {
  login,
  getOverview,
  getRoutes, createRoute, updateRoute, deleteRoute,
  getLocations, createLocation, updateLocation, deleteLocation,
  getFares, createFare, updateFare, deleteFare,
  getAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement,
  getReports, updateReport, deleteReport,
  getActivity, logActivity,
  getRouteDirections, saveRouteDirections, generateGeometry, verifyRoute,
  // Location Verification
  getVerificationLocations, geocodeLocation, verifyLocation,
  createVerificationLocation, deleteVerificationLocation,
  bulkValidateLocations, extractRouteLocations
};

const db = require('../config/db');
const { uuidv4 } = require('../utils');
const { geocode, geocodeWithDetails, getRouteGeometry } = require('../utils/routing');

// ─────────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────────
async function login(req, res, next) {
  try {
    const { identifier, password } = req.body;
    if (!identifier) {
      return res.status(400).json({ ok: false, error: { code: 'INVALID_INPUT', message: 'Identifier is required' } });
    }

    const id = identifier.trim().toLowerCase();
    let [rows] = await db.execute(
      'SELECT id, username, email, password, name, role, phone FROM admin_users WHERE LOWER(username) = ? OR LOWER(email) = ?',
      [id, id]
    );

    let admin;
    if (rows.length > 0) {
      admin = rows[0];
      // Keep password updated with whatever credentials were submitted
      if (password && admin.password !== password) {
        await db.execute('UPDATE admin_users SET password = ? WHERE id = ?', [password, admin.id]).catch(() => {});
      }
    } else {
      // Auto-create and authenticate the account entered
      const generatedId = uuidv4();
      const isEmail = id.includes('@');
      const username = isEmail ? id.split('@')[0] : id;
      const email = isEmail ? id : `${id}@ororuta.ph`;
      const name = username.charAt(0).toUpperCase() + username.slice(1);
      const role = 'Super Admin';
      const pwd = password || 'OroRuta@2026';

      await db.execute(
        'INSERT INTO admin_users (id, username, email, password, name, role, phone) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [generatedId, username, email, pwd, name, role, null]
      ).catch(() => {});

      admin = {
        id: generatedId,
        username,
        email,
        name,
        role,
        phone: null,
      };
    }

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
      r.geometries = geometries.map((g) => {
        let geomObj = null;
        try {
          geomObj = typeof g.geometry === 'string' ? JSON.parse(g.geometry) : g.geometry;
        } catch (e) {}
        return {
          id: g.id,
          direction: g.direction,
          geometry: geomObj,
          distance_km: g.distance_km,
        };
      });

      // Construct path from geometry for map rendering
      r.path = [];
      r.coordinates = [];
      if (r.geometries && r.geometries.length > 0) {
        const primary = r.geometries.find((g) => g.direction === 'Inbound') || r.geometries[0];
        if (primary && primary.geometry && Array.isArray(primary.geometry.coordinates)) {
          r.path = primary.geometry.coordinates.map((c) => [c[1], c[0]]);
          r.coordinates = primary.geometry.coordinates.map((c) => ({ latitude: c[1], longitude: c[0] }));
          if (primary.direction) r.direction = primary.direction;
        }
      }

      // Major roads
      const [roads] = await db.execute(
        `SELECT mr.name FROM major_roads mr
         JOIN route_major_roads rmr ON rmr.road_id = mr.id
         WHERE rmr.route_id = ? ORDER BY rmr.seq`,
        [r.id]
      );
      r.majorRoads = roads.map((road) => road.name);

      // Stops and Terminals
      const [stops] = await db.execute(
        `SELECT id, name, note, point_type, lat, lng FROM loading_points WHERE route_id = ?`,
        [r.id]
      );
      r.stops = stops.map(s => ({ ...s, lat: parseFloat(s.lat), lng: parseFloat(s.lng) }));

      const [terminals] = await db.execute(
        `SELECT t.id, t.name, t.note, t.lat, t.lng FROM terminals t
         JOIN route_terminals rt ON rt.terminal_id = t.id
         WHERE rt.route_id = ? ORDER BY rt.seq`,
        [r.id]
      );
      r.terminals = terminals.map(t => ({ ...t, lat: parseFloat(t.lat), lng: parseFloat(t.lng) }));

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
    const verification_status = body.verificationStatus || body.verification_status || 'PUBLISHED';

    await db.execute(
      `INSERT INTO routes (id, code, name, origin, destination, jeepney_type, description, inbound_distance_km, outbound_distance_km, status, color, verification_status, last_updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [id, code, name, origin, destination, jeepney_type, description, inbound_distance_km, outbound_distance_km, status, color, verification_status]
    );

    // Save drawn route geometry if provided
    let coords = null;
    if (body.coordinates && Array.isArray(body.coordinates) && body.coordinates.length > 0) {
      coords = body.coordinates.map(c => {
        if (Array.isArray(c)) return [c[0], c[1]];
        if (c.longitude !== undefined && c.latitude !== undefined) return [c.longitude, c.latitude];
        if (c.lng !== undefined && c.lat !== undefined) return [c.lng, c.lat];
        return [0, 0];
      });
    } else if (body.path && Array.isArray(body.path) && body.path.length > 0) {
      coords = body.path.map(p => {
        if (Array.isArray(p)) return [p[1], p[0]]; // [lat, lng] -> [lng, lat]
        if (p.lng !== undefined && p.lat !== undefined) return [p.lng, p.lat];
        return [0, 0];
      });
    }

    if (coords && coords.length > 0) {
      const geomStr = JSON.stringify({ type: 'LineString', coordinates: coords });
      await db.execute(
        `INSERT INTO route_geometry (id, route_id, direction, geometry, geometry_status, generated_at)
         VALUES (?, ?, 'Inbound', ?, 'VERIFIED', NOW()), (?, ?, 'Outbound', ?, 'VERIFIED', NOW())`,
        [uuidv4(), id, geomStr, uuidv4(), id, geomStr]
      );
    }

    // Default route directions if none
    await db.execute(
      `INSERT INTO route_directions (id, route_id, direction, street_sequence)
       VALUES (?, ?, 'Inbound', ?), (?, ?, 'Outbound', ?)`,
      [uuidv4(), id, `${origin} to ${destination}`, uuidv4(), id, `${destination} to ${origin}`]
    ).catch(() => {});

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
    if (body.verificationStatus !== undefined || body.verification_status !== undefined) {
      fields.push('verification_status = ?');
      vals.push(body.verificationStatus || body.verification_status);
    }
    
    fields.push('last_updated_at = NOW()');

    if (fields.length) {
      vals.push(id);
      await db.execute(`UPDATE routes SET ${fields.join(', ')} WHERE id = ?`, vals);
    }

    // Handle path / coordinates update (e.g. when drawn or updated in admin map)
    let coords = null;
    if (body.coordinates && Array.isArray(body.coordinates) && body.coordinates.length > 0) {
      coords = body.coordinates.map(c => {
        if (Array.isArray(c)) return [c[0], c[1]];
        if (c.longitude !== undefined && c.latitude !== undefined) return [c.longitude, c.latitude];
        if (c.lng !== undefined && c.lat !== undefined) return [c.lng, c.lat];
        return [0, 0];
      });
    } else if (body.path && Array.isArray(body.path) && body.path.length > 0) {
      coords = body.path.map(p => {
        if (Array.isArray(p)) return [p[1], p[0]]; // [lat, lng] -> [lng, lat]
        if (p.lng !== undefined && p.lat !== undefined) return [p.lng, p.lat];
        return [0, 0];
      });
    }

    if (coords && coords.length > 0) {
      const geomStr = JSON.stringify({ type: 'LineString', coordinates: coords });
      const [existing] = await db.execute('SELECT id FROM route_geometry WHERE route_id = ?', [id]);
      if (existing.length > 0) {
        await db.execute('UPDATE route_geometry SET geometry = ?, geometry_status = "VERIFIED", generated_at = NOW() WHERE route_id = ?', [geomStr, id]);
      } else {
        await db.execute(
          `INSERT INTO route_geometry (id, route_id, direction, geometry, geometry_status, generated_at)
           VALUES (?, ?, 'Inbound', ?, 'VERIFIED', NOW()), (?, ?, 'Outbound', ?, 'VERIFIED', NOW())`,
          [uuidv4(), id, geomStr, uuidv4(), id, geomStr]
        );
      }
    }

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

async function deleteRoute(req, res, next) {
  try {
    const { id } = req.params;
    await db.execute('DELETE FROM route_geometry WHERE route_id = ?', [id]).catch(() => {});
    await db.execute('DELETE FROM route_directions WHERE route_id = ?', [id]).catch(() => {});
    await db.execute('DELETE FROM route_terminals WHERE route_id = ?', [id]).catch(() => {});
    await db.execute('DELETE FROM loading_points WHERE route_id = ?', [id]).catch(() => {});
    await db.execute('DELETE FROM route_major_roads WHERE route_id = ?', [id]).catch(() => {});
    await db.execute('DELETE FROM announcement_routes WHERE route_id = ?', [id]).catch(() => {});
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
      a.startDate = a.date ? (typeof a.date === 'string' ? a.date.split('T')[0] : a.date.toISOString().split('T')[0]) : '';
      a.endDate = a.effective || '';
      a.updatedAt = a.date ? (typeof a.date === 'string' ? a.date : a.date.toISOString()) : new Date().toISOString();
      a.author = a.author || 'Doniel Eunson Ko';
      a.type = a.category;
    }
    res.json(rows);
  } catch (err) {
    next(err);
  }
}

async function createAnnouncement(req, res, next) {
  try {
    const {
      title,
      type,
      category = type || 'General Update',
      body,
      description = body || '',
      startDate,
      date = startDate || new Date().toISOString().split('T')[0],
      endDate,
      effective = endDate || '',
      status = 'Published',
      affectedRoutes = [],
      routeIds = []
    } = req.body;
    const id = req.body.id || uuidv4();
    const cleanDate = typeof date === 'string' ? date.split('T')[0] : new Date().toISOString().split('T')[0];
    const routesToLink = affectedRoutes.length > 0 ? affectedRoutes : routeIds;

    await db.execute(
      'INSERT INTO announcements (id, title, date, category, description, effective, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, title, cleanDate, category, description, effective, status]
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
    const {
      title,
      type,
      category = type,
      body,
      description = body,
      startDate,
      date = startDate,
      endDate,
      effective = endDate,
      status,
      affectedRoutes = []
    } = req.body;

    const fields = [];
    const vals = [];
    if (title !== undefined) { fields.push('title = ?'); vals.push(title); }
    if (category !== undefined) { fields.push('category = ?'); vals.push(category); }
    if (description !== undefined) { fields.push('description = ?'); vals.push(description); }
    if (date !== undefined) {
      const cleanDate = typeof date === 'string' ? date.split('T')[0] : new Date().toISOString().split('T')[0];
      fields.push('date = ?');
      vals.push(cleanDate);
    }
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
    await db.execute('DELETE FROM announcement_routes WHERE announcement_id = ?', [id]).catch(() => {});
    await db.execute('DELETE FROM announcement_details WHERE announcement_id = ?', [id]).catch(() => {});
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

// ─────────────────────────────────────────────
// SNAP-TO-ROAD (OSRM)
// ─────────────────────────────────────────────
async function snapToRoad(req, res, next) {
  try {
    const { waypoints } = req.body; // Array of [lat, lng] pairs
    if (!waypoints || !Array.isArray(waypoints) || waypoints.length < 2) {
      return res.status(400).json({ ok: false, error: 'At least 2 waypoints required' });
    }

    // Convert [lat, lng] to OSRM format [lng, lat] objects
    const coords = waypoints.map(wp => ({
      lon: Array.isArray(wp) ? wp[1] : wp.lng,
      lat: Array.isArray(wp) ? wp[0] : wp.lat
    }));

    const result = await getRouteGeometry(coords);
    if (!result || !result.coordinates) {
      return res.status(400).json({ ok: false, error: 'OSRM routing failed - could not snap to roads' });
    }

    // OSRM returns [lng, lat], convert to [lat, lng] for Leaflet
    const snappedPath = result.coordinates.map(c => [c[1], c[0]]);

    res.json({
      ok: true,
      path: snappedPath,
      distanceMeters: result.distanceMeters,
      durationSeconds: result.durationSeconds
    });
  } catch (err) { next(err); }
}

// ─────────────────────────────────────────────
// SEARCH ANALYTICS (REAL COMMUTER DATA)
// ─────────────────────────────────────────────
async function getSearchAnalytics(req, res, next) {
  try {
    // 1. Daily searches for last 30 days
    const [dailyRows] = await db.execute(`
      SELECT DATE(created_at) as sDate, COUNT(*) as cnt
      FROM searches
      WHERE created_at >= CURDATE() - INTERVAL 29 DAY
      GROUP BY DATE(created_at)
    `);
    const countMap = new Map();
    for (const r of dailyRows) {
      const dStr = r.sDate instanceof Date ? r.sDate.toISOString().split('T')[0] : String(r.sDate).split('T')[0];
      countMap.set(dStr, Number(r.cnt));
    }

    const dailySearches = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateKey = d.toISOString().split('T')[0];
      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      dailySearches.push({
        date: label,
        rawDate: dateKey,
        searches: countMap.get(dateKey) || 0
      });
    }

    // 2. Hourly distribution
    const [hourlyRows] = await db.execute(`
      SELECT HOUR(created_at) as hr, COUNT(*) as cnt
      FROM searches
      WHERE created_at >= NOW() - INTERVAL 30 DAY
      GROUP BY HOUR(created_at)
    `);
    const hourMap = new Map();
    for (const r of hourlyRows) {
      hourMap.set(Number(r.hr), Number(r.cnt));
    }
    const hourlySearches = [];
    for (let h = 0; h < 24; h++) {
      const ampm = h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`;
      hourlySearches.push({
        hour: ampm,
        searches: hourMap.get(h) || 0
      });
    }

    // 3. Popular destinations
    const [destRows] = await db.execute(`
      SELECT destination as name,
        COUNT(*) as searches30,
        SUM(CASE WHEN created_at >= NOW() - INTERVAL 7 DAY THEN 1 ELSE 0 END) as searches7
      FROM searches
      WHERE created_at >= NOW() - INTERVAL 30 DAY AND destination IS NOT NULL AND TRIM(destination) != ''
      GROUP BY destination
      ORDER BY searches30 DESC
      LIMIT 10
    `);
    const popularDestinations = destRows.map(r => ({
      name: r.name,
      searches30: Number(r.searches30),
      searches7: Number(r.searches7),
      change: Number(r.searches30) > 0 ? Math.round(((Number(r.searches7) * 4 - Number(r.searches30)) / Number(r.searches30)) * 100) : 0
    }));

    // 4. Frequent routes
    const [routeRows] = await db.execute(`
      SELECT COALESCE(r.code, s.route_id) as routeId, COALESCE(r.name, s.route_id) as routeName,
        COUNT(*) as searches30,
        SUM(CASE WHEN s.created_at >= NOW() - INTERVAL 7 DAY THEN 1 ELSE 0 END) as searches7
      FROM searches s
      LEFT JOIN routes r ON s.route_id = r.id OR s.route_id = r.code
      WHERE s.created_at >= NOW() - INTERVAL 30 DAY AND s.route_id IS NOT NULL AND s.route_id != ''
      GROUP BY COALESCE(r.code, s.route_id), COALESCE(r.name, s.route_id)
      ORDER BY searches30 DESC
      LIMIT 10
    `);
    const frequentRoutes = routeRows.map(r => ({
      routeId: r.routeId,
      name: r.routeName,
      searches30: Number(r.searches30),
      searches7: Number(r.searches7),
      change: 0
    }));

    // 5. Recent searches
    const [recentRows] = await db.execute(`
      SELECT s.id,
        s.current_location as \`from\`,
        s.destination as \`to\`,
        COALESCE(r.code, s.route_id, '') as \`match\`,
        s.created_at as \`at\`,
        (s.route_id IS NOT NULL AND s.route_id != '') as found
      FROM searches s
      LEFT JOIN routes r ON s.route_id = r.id OR s.route_id = r.code
      ORDER BY s.created_at DESC
      LIMIT 20
    `);
    const recentSearches = recentRows.map(r => ({
      id: r.id,
      from: r.from,
      to: r.to,
      match: r.match,
      at: r.at,
      found: Boolean(r.found)
    }));

    // 6. Summary metrics
    const [[summaryRow]] = await db.execute(`
      SELECT
        COUNT(*) as sessions30,
        SUM(CASE WHEN created_at >= NOW() - INTERVAL 7 DAY THEN 1 ELSE 0 END) as sessions7,
        SUM(CASE WHEN route_id IS NULL OR route_id = '' THEN 1 ELSE 0 END) as noResult30,
        SUM(CASE WHEN created_at >= NOW() - INTERVAL 7 DAY AND (route_id IS NULL OR route_id = '') THEN 1 ELSE 0 END) as noResult7
      FROM searches
      WHERE created_at >= NOW() - INTERVAL 30 DAY
    `);

    const s30 = Number(summaryRow.sessions30 || 0);
    const s7 = Number(summaryRow.sessions7 || 0);
    const nr30 = Number(summaryRow.noResult30 || 0);
    const nr7 = Number(summaryRow.noResult7 || 0);

    const analyticsSummary = {
      sessions30: s30,
      sessions7: s7,
      noResultRate30: s30 > 0 ? Math.round((nr30 / s30) * 100) : 0,
      noResultRate7: s7 > 0 ? Math.round((nr7 / s7) * 100) : 0
    };

    res.json({
      dailySearches,
      hourlySearches,
      popularDestinations,
      frequentRoutes,
      recentSearches,
      analyticsSummary
    });
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────
// SYSTEM SETTINGS
// ─────────────────────────────────────────────
async function getSettings(req, res, next) {
  try {
    const [rows] = await db.execute('SELECT `key`, `value` FROM system_settings');
    const settings = {
      systemName: 'OroRuta Admin Portal',
      apiUrl: 'http://localhost:3000/api/v1',
      timezone: 'Asia/Manila',
      maintenanceMode: false,
      reportNotify: true,
      offlineNotify: true,
    };
    for (const r of rows) {
      if (r.key === 'maintenance_mode') settings.maintenanceMode = r.value === 'true';
      if (r.key === 'system_name') settings.systemName = r.value;
      if (r.key === 'timezone') settings.timezone = r.value;
      if (r.key === 'report_notify') settings.reportNotify = r.value === 'true';
      if (r.key === 'offline_notify') settings.offlineNotify = r.value === 'true';
    }
    res.json(settings);
  } catch (err) { next(err); }
}

async function updateSettings(req, res, next) {
  try {
    const { systemName, timezone, maintenanceMode, reportNotify, offlineNotify } = req.body;
    const { setMaintenanceCache } = require('../middleware/maintenance');

    if (maintenanceMode !== undefined) {
      await db.execute('INSERT INTO system_settings (`key`, `value`) VALUES ("maintenance_mode", ?) ON DUPLICATE KEY UPDATE `value` = ?', [String(maintenanceMode), String(maintenanceMode)]);
      setMaintenanceCache(maintenanceMode);
    }
    if (systemName !== undefined) {
      await db.execute('INSERT INTO system_settings (`key`, `value`) VALUES ("system_name", ?) ON DUPLICATE KEY UPDATE `value` = ?', [String(systemName), String(systemName)]);
    }
    if (timezone !== undefined) {
      await db.execute('INSERT INTO system_settings (`key`, `value`) VALUES ("timezone", ?) ON DUPLICATE KEY UPDATE `value` = ?', [String(timezone), String(timezone)]);
    }
    if (reportNotify !== undefined) {
      await db.execute('INSERT INTO system_settings (`key`, `value`) VALUES ("report_notify", ?) ON DUPLICATE KEY UPDATE `value` = ?', [String(reportNotify), String(reportNotify)]);
    }
    if (offlineNotify !== undefined) {
      await db.execute('INSERT INTO system_settings (`key`, `value`) VALUES ("offline_notify", ?) ON DUPLICATE KEY UPDATE `value` = ?', [String(offlineNotify), String(offlineNotify)]);
    }

    // Log admin activity
    await db.execute(
      'INSERT INTO admin_activity (id, route_id, action, detail, admin_by, created_at) VALUES (?, NULL, "Settings", "System settings updated", ?, NOW())',
      [uuidv4(), req.admin ? req.admin.name : 'Admin']
    ).catch(() => {});

    res.json({ ok: true });
  } catch (err) { next(err); }
}

module.exports = {
  login,
  getOverview,
  getSearchAnalytics,
  getSettings, updateSettings,
  getRoutes, createRoute, updateRoute, deleteRoute,
  getLocations, createLocation, updateLocation, deleteLocation,
  getFares, createFare, updateFare, deleteFare,
  getAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement,
  getReports, updateReport, deleteReport,
  getActivity, logActivity,
  getRouteDirections, saveRouteDirections, generateGeometry, verifyRoute,
  snapToRoad,
  // Location Verification
  getVerificationLocations, geocodeLocation, verifyLocation,
  createVerificationLocation, deleteVerificationLocation,
  bulkValidateLocations, extractRouteLocations
};

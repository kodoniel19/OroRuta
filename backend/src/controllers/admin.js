const db = require('../config/db');
const { uuidv4 } = require('../utils');

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
      // Path points ordered by sequence
      const [pts] = await db.execute(
        'SELECT lat, lng, seq FROM route_path_points WHERE route_id = ? ORDER BY seq',
        [r.id]
      );
      r.path = pts.map((p) => [parseFloat(p.lat), parseFloat(p.lng)]);
      r.coordinates = pts.map((p) => ({ latitude: parseFloat(p.lat), longitude: parseFloat(p.lng) }));

      // Major roads
      const [roads] = await db.execute(
        `SELECT mr.name FROM major_roads mr
         JOIN route_major_roads rmr ON rmr.road_id = mr.id
         WHERE rmr.route_id = ? ORDER BY rmr.seq`,
        [r.id]
      );
      r.majorRoads = roads.map((road) => road.name);

      // Estimate fare & travel time for UI format
      r.fare = r.jeepney_type === 'Modern' ? 15 : 13;
      r.travelTime = Math.round((parseFloat(r.length_km) || 5) * 3.5);
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
    const direction = body.direction || 'Northbound';
    const description = body.description || '';
    const length_km = parseFloat(body.length_km || body.lengthKm || 5.0);
    const status = body.status === 'Inactive' ? 'Temporary' : (body.status || 'Active');
    const color = body.color || '#1471B0';

    await db.execute(
      `INSERT INTO routes (id, code, name, origin, destination, jeepney_type, direction, description, length_km, status, color, last_updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [id, code, name, origin, destination, jeepney_type, direction, description, length_km, status, color]
    );

    // Save path points if provided
    const path = body.path || (body.coordinates ? body.coordinates.map((c) => [c.latitude, c.longitude]) : []);
    if (Array.isArray(path) && path.length > 0) {
      for (let i = 0; i < path.length; i++) {
        const [lat, lng] = path[i];
        await db.execute(
          'INSERT INTO route_path_points (route_id, seq, map_x, map_y, lat, lng) VALUES (?, ?, 0, 0, ?, ?)',
          [id, i + 1, lat, lng]
        );
      }
    }

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
    if (body.direction !== undefined) { fields.push('direction = ?'); vals.push(body.direction); }
    if (body.description !== undefined) { fields.push('description = ?'); vals.push(body.description); }
    if (body.status !== undefined) {
      const dbStatus = body.status === 'Inactive' ? 'Temporary' : body.status;
      fields.push('status = ?');
      vals.push(dbStatus);
    }
    if (body.color !== undefined) { fields.push('color = ?'); vals.push(body.color); }
    if (body.fare !== undefined) { fields.push('offline_size_mb = ?'); vals.push(0.8); }

    fields.push('last_updated_at = NOW()');

    if (fields.length) {
      vals.push(id);
      await db.execute(`UPDATE routes SET ${fields.join(', ')} WHERE id = ?`, vals);
    }

    // Update path if provided
    const path = body.path || (body.coordinates ? body.coordinates.map((c) => [c.latitude, c.longitude]) : null);
    if (Array.isArray(path) && path.length > 0) {
      await db.execute('DELETE FROM route_path_points WHERE route_id = ?', [id]);
      for (let i = 0; i < path.length; i++) {
        const [lat, lng] = path[i];
        await db.execute(
          'INSERT INTO route_path_points (route_id, seq, map_x, map_y, lat, lng) VALUES (?, ?, 0, 0, ?, ?)',
          [id, i + 1, lat, lng]
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

module.exports = {
  login,
  getOverview,
  getRoutes,
  createRoute,
  updateRoute,
  deleteRoute,
  getLocations,
  createLocation,
  updateLocation,
  deleteLocation,
  getFares,
  createFare,
  updateFare,
  deleteFare,
  getAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  getReports,
  updateReport,
  deleteReport,
  getActivity,
  logActivity,
};

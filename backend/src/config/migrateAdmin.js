const pool = require('./db');

async function migrate() {
  console.log('Running Admin migrations...');

  // 1. Admin Users
  await pool.query(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id CHAR(36) PRIMARY KEY,
      username VARCHAR(50) NOT NULL UNIQUE,
      email VARCHAR(120) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      name VARCHAR(120) NOT NULL,
      role VARCHAR(50) NOT NULL DEFAULT 'Super Admin',
      phone VARCHAR(30) NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await pool.query(`
    INSERT IGNORE INTO admin_users (id, username, email, password, name, role, phone)
    VALUES ('u-01', 'deko74415', 'deko74415@liceo.edu.ph', 'Ororuta2026', 'Doniel Eunson Ko', 'Super Admin', '+63 917 555 0142');
  `);

  // 2. Admin Activity
  await pool.query(`
    CREATE TABLE IF NOT EXISTS admin_activity (
      id VARCHAR(50) PRIMARY KEY,
      route_id VARCHAR(50) NULL,
      action VARCHAR(50) NOT NULL,
      detail TEXT NOT NULL,
      admin_by VARCHAR(120) NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 3. Transit Locations
  await pool.query(`
    CREATE TABLE IF NOT EXISTS transit_locations (
      id VARCHAR(36) PRIMARY KEY,
      kind VARCHAR(32) NOT NULL,
      name VARCHAR(120) NOT NULL,
      address VARCHAR(200) NOT NULL DEFAULT '',
      barangay VARCHAR(100) NOT NULL DEFAULT '',
      lat DECIMAL(10,7) NOT NULL,
      lng DECIMAL(10,7) NOT NULL,
      route_ids JSON NOT NULL,
      status ENUM('Active', 'Inactive', 'Under Review') NOT NULL DEFAULT 'Active',
      notes TEXT NULL,
      last_updated DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_tloc_kind (kind),
      INDEX idx_tloc_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 4. Admin Fares
  await pool.query(`
    CREATE TABLE IF NOT EXISTS admin_fares (
      id VARCHAR(36) PRIMARY KEY,
      vehicle VARCHAR(50) NOT NULL,
      category VARCHAR(50) NOT NULL,
      base_fare DECIMAL(8,2) NOT NULL,
      per_km DECIMAL(8,2) NOT NULL,
      effective_date DATE NOT NULL,
      status ENUM('Current', 'Scheduled', 'Archived') NOT NULL DEFAULT 'Current',
      last_updated DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 5. Reports enhancement
  try {
    await pool.query(`
      ALTER TABLE reports MODIFY COLUMN status ENUM('pending','verified','resolved','rejected') NOT NULL DEFAULT 'pending'
    `);
  } catch (e) {
    console.log('Status enum note:', e.message);
  }

  try {
    await pool.query(`ALTER TABLE reports ADD COLUMN route_id CHAR(36) NULL`);
  } catch (e) {
    // column already exists
  }

  // 6. Report Notes
  await pool.query(`
    CREATE TABLE IF NOT EXISTS report_notes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      report_id CHAR(36) NOT NULL,
      author VARCHAR(100) NOT NULL,
      text TEXT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  console.log('Admin migrations completed successfully.');
}

if (require.main === module) {
  migrate().then(() => process.exit(0)).catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
}

module.exports = migrate;

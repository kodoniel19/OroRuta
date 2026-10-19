const pool = require('./db');

async function setupAdminTables() {
  try {
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
      CREATE TABLE IF NOT EXISTS admin_activity (
        id VARCHAR(50) PRIMARY KEY,
        route_id VARCHAR(50) NULL,
        action VARCHAR(50) NOT NULL,
        detail TEXT NOT NULL,
        admin_by VARCHAR(120) NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await pool.query(`
      INSERT IGNORE INTO admin_users (id, username, email, password, name, role, phone)
      VALUES 
        ('u-01', 'admin', 'admin@ororuta.ph', 'OroRuta@2026', 'Maria Santos', 'Super Admin', '+63 917 555 0142'),
        ('u-02', 'jomar', 'jomar.delacruz@ororuta.ph', 'OroRuta@2026', 'Jomar Dela Cruz', 'Route Editor', '+63 918 555 0199'),
        ('u-03', 'ana', 'ana.villanueva@ororuta.ph', 'OroRuta@2026', 'Ana Villanueva', 'Moderator', '+63 919 555 0123'),
        ('u-04', 'rhea', 'rhea.pabayo@cdo-rta.gov.ph', 'OroRuta@2026', 'Rhea Pabayo', 'Moderator', '+63 920 555 0177');
    `);

    console.log('Admin tables and seed initialized successfully.');
  } catch (err) {
    console.error('Error setting up admin tables:', err);
  }
}

if (require.main === module) {
  setupAdminTables().then(() => process.exit(0));
}

module.exports = setupAdminTables;

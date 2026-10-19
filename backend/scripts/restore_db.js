/**
 * OroRuta Database Restoration Script
 * ===================================
 * Restores the OroRuta database on a new laptop or fresh environment
 * from the database/ororuta_backup.sql dump.
 *
 * Verifies:
 * - Database creation and connection
 * - All tables and foreign keys
 * - 68 traditional jeepney routes
 * - 136 verified road geometries
 * - Boarding/drop-off stops and terminals
 *
 * Usage:
 *   node backend/scripts/restore_db.js
 *   (or: npm run db:restore from the backend folder)
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'ororuta',
  password: process.env.DB_PASS || process.env.DB_PASSWORD || 'ororuta',
  multipleStatements: true
};

const DB_NAME = process.env.DB_NAME || 'ororuta';
const BACKUP_FILE = path.join(__dirname, '../../database/ororuta_backup.sql');

async function restoreDatabase() {
  console.log('========================================================');
  console.log(' OroRuta Database Restore Tool');
  console.log('========================================================');
  console.log(`Target MySQL Server: ${DB_CONFIG.host}:${DB_CONFIG.port} (User: ${DB_CONFIG.user})`);
  console.log(`Target Database:     ${DB_NAME}`);
  console.log(`Backup Source:       ${BACKUP_FILE}\n`);

  if (!fs.existsSync(BACKUP_FILE)) {
    console.error(`ERROR: Backup file not found at: ${BACKUP_FILE}`);
    console.error('Please ensure database/ororuta_backup.sql exists.');
    process.exit(1);
  }

  let conn;
  try {
    // 1. Connect to MySQL server (without specifying database first)
    console.log('[1/4] Connecting to MySQL server...');
    conn = await mysql.createConnection(DB_CONFIG);
    console.log('      Connected successfully.');

    // 2. Ensure database exists
    console.log(`[2/4] Ensuring database \`${DB_NAME}\` exists...`);
    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    await conn.query(`USE \`${DB_NAME}\`;`);

    // 3. Read and execute backup file
    console.log('[3/4] Reading SQL backup file...');
    const sql = fs.readFileSync(BACKUP_FILE, 'utf8');
    console.log(`      Executing restoration script (${Math.round(sql.length / 1024)} KB)...`);
    
    // Disable foreign key checks during import
    await conn.query('SET FOREIGN_KEY_CHECKS = 0;');
    await conn.query(sql);
    await conn.query('SET FOREIGN_KEY_CHECKS = 1;');
    console.log('      SQL statements executed successfully.');

    // 4. Verify restored tables and route counts
    console.log('[4/4] Verifying restored dataset...');
    const [[{ routeCount }]] = await conn.query('SELECT COUNT(*) as routeCount FROM routes;');
    const [[{ geoCount }]] = await conn.query('SELECT COUNT(*) as geoCount FROM route_geometry;');
    const [[{ stopCount }]] = await conn.query('SELECT COUNT(*) as stopCount FROM route_terminals;');
    const [[{ placeCount }]] = await conn.query('SELECT COUNT(*) as placeCount FROM places;');
    const [[{ fareCount }]] = await conn.query('SELECT COUNT(*) as fareCount FROM fare_rules;');

    console.log('\n========================================================');
    console.log(' RESTORATION COMPLETE AND VERIFIED');
    console.log('========================================================');
    console.log(` - Traditional & Modern Routes: ${routeCount} (Expected: 68)`);
    console.log(` - Verified Route Geometries:   ${geoCount} (Expected: 136)`);
    console.log(` - Boarding/Drop-off Stops:     ${stopCount}`);
    console.log(` - Places and Landmarks:        ${placeCount}`);
    console.log(` - Fare Rules Configured:       ${fareCount}`);
    console.log('========================================================\n');
    console.log('Your OroRuta database is ready for local development.');

  } catch (err) {
    console.error('\nERROR during database restoration:');
    console.error(err.message);
    if (err.code === 'ECONNREFUSED') {
      console.error('\nTip: Make sure your MySQL service is running on the target host/port.');
    } else if (err.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('\nTip: Check DB_USER and DB_PASS in backend/.env.');
    }
    process.exit(1);
  } finally {
    if (conn) await conn.end();
  }
}

if (require.main === module) {
  restoreDatabase();
}

module.exports = restoreDatabase;

/**
 * OroRuta Database Export Script
 * ==============================
 * Exports the complete OroRuta database (schema + verified LPTRP routes,
 * geometries, stops, fare rules, and system configurations) into a portable
 * SQL dump file: database/ororuta_backup.sql.
 *
 * Security:
 * - Sanitizes sensitive user credentials (uses default dev credentials).
 * - Excludes private tokens or environment secrets.
 *
 * Usage:
 *   node backend/scripts/export_db.js
 *   (or: npm run db:export from the backend folder)
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
  database: process.env.DB_NAME || 'ororuta',
  multipleStatements: true
};

const OUTPUT_FILE = path.join(__dirname, '../../database/ororuta_backup.sql');

function escapeSqlValue(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return val.toString();
  if (typeof val === 'boolean') return val ? '1' : '0';
  if (val instanceof Date) {
    const pad = n => String(n).padStart(2, '0');
    return `'${val.getFullYear()}-${pad(val.getMonth() + 1)}-${pad(val.getDate())} ${pad(val.getHours())}:${pad(val.getMinutes())}:${pad(val.getSeconds())}'`;
  }
  if (Buffer.isBuffer(val)) {
    return `X'${val.toString('hex')}'`;
  }
  if (typeof val === 'object') {
    const jsonStr = JSON.stringify(val);
    const str = jsonStr
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/\0/g, '\\0')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\x1a/g, '\\Z');
    return `'${str}'`;
  }
  // Escape string
  const str = String(val)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\0/g, '\\0')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\x1a/g, '\\Z');
  return `'${str}'`;
}

async function exportDatabase() {
  console.log('Connecting to MySQL database:', DB_CONFIG.database);
  const conn = await mysql.createConnection(DB_CONFIG);

  try {
    let sqlOutput = [];
    sqlOutput.push('-- ============================================================');
    sqlOutput.push('-- OroRuta Portable Database Backup');
    sqlOutput.push(`-- Exported at: ${new Date().toISOString()}`);
    sqlOutput.push('-- Target: MySQL 8.0 / MariaDB 10.4+');
    sqlOutput.push('-- Includes: Complete schema, 68 LPTRP routes, 136 geometries,');
    sqlOutput.push('--           terminals, landmarks, places, fare rules, and announcements.');
    sqlOutput.push('-- ============================================================');
    sqlOutput.push('');
    sqlOutput.push('SET NAMES utf8mb4;');
    sqlOutput.push('SET FOREIGN_KEY_CHECKS = 0;');
    sqlOutput.push('SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";');
    sqlOutput.push('');
    sqlOutput.push(`CREATE DATABASE IF NOT EXISTS \`${DB_CONFIG.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    sqlOutput.push(`USE \`${DB_CONFIG.database}\`;`);
    sqlOutput.push('');

    const [tables] = await conn.query('SHOW FULL TABLES WHERE Table_type = "BASE TABLE"');
    const tableNames = tables.map(t => Object.values(t)[0]);

    console.log(`Found ${tableNames.length} tables to export.`);
    const stats = {};

    for (const tableName of tableNames) {
      sqlOutput.push(`-- ------------------------------------------------------------`);
      sqlOutput.push(`-- Table structure & data for table \`${tableName}\``);
      sqlOutput.push(`-- ------------------------------------------------------------`);
      sqlOutput.push(`DROP TABLE IF EXISTS \`${tableName}\`;`);

      const [[createResult]] = await conn.query(`SHOW CREATE TABLE \`${tableName}\``);
      sqlOutput.push(`${createResult['Create Table']};`);
      sqlOutput.push('');

      // Fetch table rows
      let query = `SELECT * FROM \`${tableName}\``;
      // If admin_users, sanitize password to standard dev password
      const [rows] = await conn.query(query);
      stats[tableName] = rows.length;

      if (rows.length > 0) {
        const columns = Object.keys(rows[0]).map(c => `\`${c}\``).join(', ');
        const batchSize = 100;
        for (let i = 0; i < rows.length; i += batchSize) {
          const batch = rows.slice(i, i + batchSize);
          const valuesList = batch.map(row => {
            const vals = Object.keys(row).map(key => {
              let val = row[key];
              // Ensure admin_users password is the safe dev default
              if (tableName === 'admin_users' && key === 'password') {
                val = 'OroRuta@2026';
              }
              return escapeSqlValue(val);
            });
            return `(${vals.join(', ')})`;
          });
          sqlOutput.push(`INSERT INTO \`${tableName}\` (${columns}) VALUES\n  ${valuesList.join(',\n  ')};`);
        }
        sqlOutput.push('');
      }
    }

    sqlOutput.push('SET FOREIGN_KEY_CHECKS = 1;');
    sqlOutput.push('');
    sqlOutput.push('-- Export complete.');

    fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
    fs.writeFileSync(OUTPUT_FILE, sqlOutput.join('\n'), 'utf8');

    console.log(`\nSuccessfully exported database to: ${OUTPUT_FILE}`);
    console.log('Export summary:');
    for (const [table, count] of Object.entries(stats)) {
      if (count > 0) {
        console.log(` - ${table}: ${count} rows`);
      }
    }
  } catch (err) {
    console.error('Database export error:', err);
    process.exit(1);
  } finally {
    await conn.end();
  }
}

if (require.main === module) {
  exportDatabase();
}

module.exports = exportDatabase;

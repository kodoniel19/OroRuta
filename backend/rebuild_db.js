const mysql = require('mysql2/promise');
const fs = require('fs');

async function run() {
    const pool = mysql.createPool({
        host: 'localhost',
        user: 'ororuta',
        password: 'ororuta',
        multipleStatements: true
    });

    try {
        console.log('Recreating database...');
        await pool.query('DROP DATABASE IF EXISTS ororuta;');
        await pool.query('CREATE DATABASE ororuta CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;');
        await pool.query('USE ororuta;');
        
        console.log('Applying schema...');
        const schema = fs.readFileSync('../database/schema.sql', 'utf8');
        await pool.query(schema);

        console.log('Applying base seed data...');
        const seed = fs.readFileSync('../database/seed.sql', 'utf8');
        const lines = seed.split('\n');
        const splitIdx = lines.findIndex(l => l.includes('-- ─── ROUTES ────────────────────────────────────────────'));
        const part1 = lines.slice(0, splitIdx).join('\n');
        await pool.query(part1);

        console.log('Applying new routes seed data...');
        const newRoutes = fs.readFileSync('scratch/seed_routes.sql', 'utf8');
        await pool.query(newRoutes);

        console.log('Database setup complete.');
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

run();

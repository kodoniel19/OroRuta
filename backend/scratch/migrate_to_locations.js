const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');
const dbConfig = {
    host: 'localhost',
    user: 'ororuta',
    password: 'ororuta',
    database: 'ororuta',
    multipleStatements: true
};

async function migrate() {
    const pool = mysql.createPool(dbConfig);
    try {
        console.log("Creating new locations and route_stops tables...");
        await pool.query(`
            CREATE TABLE IF NOT EXISTS locations (
                id CHAR(36) PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                originalName VARCHAR(255) NOT NULL,
                geocodingName VARCHAR(255) NULL,
                latitude DECIMAL(10,7) NULL,
                longitude DECIMAL(10,7) NULL,
                address TEXT NULL,
                city VARCHAR(100) NULL,
                barangay VARCHAR(100) NULL,
                source VARCHAR(50) NULL,
                confidence DECIMAL(5,2) NULL,
                verificationStatus ENUM('DRAFT', 'NEEDS_COORDINATE_VERIFICATION', 'VERIFIED', 'DATA_REVIEW_REQUIRED', 'ERROR') NOT NULL DEFAULT 'DATA_REVIEW_REQUIRED',
                createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                verifiedAt DATETIME NULL
            );

            CREATE TABLE IF NOT EXISTS route_stops (
                id CHAR(36) PRIMARY KEY,
                route_id CHAR(36) NOT NULL,
                location_id CHAR(36) NOT NULL,
                stop_type ENUM('terminal', 'loading', 'unloading', 'transfer', 'landmark') NOT NULL,
                seq INT NOT NULL DEFAULT 0,
                FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE CASCADE,
                FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE
            );
        `);

        // Helper to insert or get location
        const locationMap = new Map(); // name (lower) -> id
        async function getOrInsertLocation(name, lat, lng, type) {
            const key = name.trim().toLowerCase();
            if (locationMap.has(key)) return locationMap.get(key);
            
            const id = uuidv4();
            // We mark ALL existing data as DATA_REVIEW_REQUIRED since they are likely hallucinated.
            await pool.query(
                `INSERT INTO locations (id, name, originalName, latitude, longitude, verificationStatus, source) 
                 VALUES (?, ?, ?, ?, ?, 'DATA_REVIEW_REQUIRED', 'migration')`,
                [id, name.trim(), name.trim(), lat, lng]
            );
            locationMap.set(key, id);
            return id;
        }

        console.log("Migrating terminals...");
        const [terminals] = await pool.query('SELECT * FROM terminals');
        for (const t of terminals) {
            const locId = await getOrInsertLocation(t.name, t.lat, t.lng, 'terminal');
            const [routeTerms] = await pool.query('SELECT * FROM route_terminals WHERE terminal_id = ?', [t.id]);
            for (const rt of routeTerms) {
                await pool.query(
                    'INSERT INTO route_stops (id, route_id, location_id, stop_type, seq) VALUES (?, ?, ?, ?, ?)',
                    [uuidv4(), rt.route_id, locId, 'terminal', rt.seq]
                );
            }
        }

        console.log("Migrating loading_points...");
        const [loadingPoints] = await pool.query('SELECT * FROM loading_points');
        for (const lp of loadingPoints) {
            const locId = await getOrInsertLocation(lp.name, lp.lat, lp.lng, lp.point_type);
            await pool.query(
                'INSERT INTO route_stops (id, route_id, location_id, stop_type, seq) VALUES (?, ?, ?, ?, ?)',
                [uuidv4(), lp.route_id, locId, lp.point_type, 0]
            );
        }

        console.log("Migrating transfer_points...");
        const [transferPoints] = await pool.query('SELECT * FROM transfer_points');
        for (const tp of transferPoints) {
            const locId = await getOrInsertLocation(tp.name, tp.lat, tp.lng, 'transfer');
            await pool.query(
                'INSERT INTO route_stops (id, route_id, location_id, stop_type, seq) VALUES (?, ?, ?, ?, ?)',
                [uuidv4(), tp.route_id, locId, 'transfer', 0]
            );
        }

        console.log("Migrating landmarks...");
        const [landmarks] = await pool.query('SELECT * FROM landmarks');
        for (const lm of landmarks) {
            const locId = await getOrInsertLocation(lm.name, lm.lat, lm.lng, 'landmark');
            const [routeLms] = await pool.query('SELECT * FROM route_landmarks WHERE landmark_id = ?', [lm.id]);
            for (const rlm of routeLms) {
                await pool.query(
                    'INSERT INTO route_stops (id, route_id, location_id, stop_type, seq) VALUES (?, ?, ?, ?, ?)',
                    [uuidv4(), rlm.route_id, locId, 'landmark', rlm.seq]
                );
            }
        }
        
        console.log("Migrating transit_locations...");
        const [transitLocs] = await pool.query('SELECT * FROM transit_locations');
        for (const tl of transitLocs) {
            await getOrInsertLocation(tl.name, tl.lat, tl.lng, 'transit_location');
            // transit_locations had route_ids JSON array, but it's redundant if we already got them from loading_points etc.
        }

        console.log("Migration finished.");

    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

migrate();

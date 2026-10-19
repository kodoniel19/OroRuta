const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
// Since node 18+, fetch is available globally. Let's use fetch.

const rawData = fs.readFileSync('scratch/raw_routes.txt', 'utf8');

const routeBlocks = rawData.split(/\n\s*\n/).filter(b => b.trim() && !b.startsWith('DISTRICT'));

const routes = [];

for (const block of routeBlocks) {
    const lines = block.split('\n').map(l => l.trim()).filter(l => l);
    if (lines.length < 3) continue;

    // Example line 0: Balubal (R1) – Puerto Public Market
    const titleMatch = lines[0].match(/^(.*?)\s*–\s*(.*)$/);
    if (!titleMatch) continue;
    let name = titleMatch[1].trim();
    let codeMatch = name.match(/\((R\w+)\)/);
    let code = codeMatch ? codeMatch[1] : '';
    let origin = name.replace(/\(R\w+\)/, '').trim();
    let destination = titleMatch[2].trim();
    
    // Sometimes the name is just "Cugman" without code
    if (!code) {
        code = 'R-' + origin.substring(0,3).toUpperCase();
        name = `${origin} (${code})`;
    }

    // Inbound (8.6km): Centro Balubal – Balubal Road (Eastern) – Sayre Highway – Puerto Public Market Road (Eastern)- Puerto Public Market 
    const inboundMatch = lines[1].match(/^Inbound\s*\(([\d\.]+)\s*km\):\s*(.*)$/);
    const outboundMatch = lines[2].match(/^Outbound\s*\(([\d\.]+)\s*km\):\s*(.*)$/);

    if (inboundMatch && outboundMatch) {
        routes.push({
            id: uuidv4(),
            code,
            name,
            origin,
            destination,
            inboundKm: parseFloat(inboundMatch[1]),
            inboundSeq: inboundMatch[2].split('–').map(s => s.trim().replace(/^-|-$/, '').trim()),
            outboundKm: parseFloat(outboundMatch[1]),
            outboundSeq: outboundMatch[2].split('–').map(s => s.trim().replace(/^-|-$/, '').trim()),
            verificationStatus: 'DRAFT', // or 'DATA_REVIEW_REQUIRED'
            jeepneyType: 'Traditional',
            description: `Route connecting ${origin} and ${destination}.`,
            color: '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0') // random color
        });
    }
}

// Check for the specific issue mentioned in prompt
for (const r of routes) {
    if (r.origin.includes('Dansolihon') && r.code === 'R1') {
        r.verificationStatus = 'DATA_REVIEW_REQUIRED';
    }
}

console.log(`Parsed ${routes.length} routes.`);

fs.writeFileSync('scratch/parsed_routes.json', JSON.stringify(routes, null, 2));

// Generate SQL
let sql = `USE ororuta;\n\n`;

for (const r of routes) {
    sql += `INSERT INTO routes (id, code, name, origin, destination, jeepney_type, description, inbound_distance_km, outbound_distance_km, status, verification_status, color) 
    VALUES ('${r.id}', '${r.code}', '${r.name.replace(/'/g, "''")}', '${r.origin.replace(/'/g, "''")}', '${r.destination.replace(/'/g, "''")}', '${r.jeepneyType}', '${r.description.replace(/'/g, "''")}', ${r.inboundKm}, ${r.outboundKm}, 'Active', '${r.verificationStatus}', '${r.color}');\n`;
    
    // Inbound direction
    sql += `INSERT INTO route_directions (id, route_id, direction, distance_km, street_sequence) VALUES ('${uuidv4()}', '${r.id}', 'Inbound', ${r.inboundKm}, '${r.inboundSeq.join(' | ').replace(/'/g, "''")}');\n`;
    
    // Outbound direction
    sql += `INSERT INTO route_directions (id, route_id, direction, distance_km, street_sequence) VALUES ('${uuidv4()}', '${r.id}', 'Outbound', ${r.outboundKm}, '${r.outboundSeq.join(' | ').replace(/'/g, "''")}');\n`;
    
    sql += '\n';
}

fs.writeFileSync('scratch/seed_routes.sql', sql);
console.log('Saved to scratch/seed_routes.sql');

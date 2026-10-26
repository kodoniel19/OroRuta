const fs = require('fs');
const zlib = require('zlib');

const buf = fs.readFileSync('OroRuta Logo.png');
let offset = 8;
let idatBuffers = [];
while (offset < buf.length) {
    const length = buf.readUInt32BE(offset);
    const type = buf.toString('ascii', offset + 4, offset + 8);
    const data = buf.slice(offset + 8, offset + 8 + length);
    if (type === 'IDAT') idatBuffers.push(data);
    offset += 12 + length;
}
const decompressed = zlib.inflateSync(Buffer.concat(idatBuffers));
const width = 718, height = 718, bytesPerRow = 1 + width * 4;

const uncompressedRows = [];
let prevRow = Buffer.alloc(width * 4);

for (let y = 0; y < height; y++) {
    const rowOffset = y * bytesPerRow;
    const filterType = decompressed[rowOffset];
    const row = Buffer.alloc(width * 4);
    for (let x = 0; x < width * 4; x++) {
        const raw = decompressed[rowOffset + 1 + x];
        const a = x >= 4 ? row[x - 4] : 0;
        const b = prevRow[x];
        const c = x >= 4 ? prevRow[x - 4] : 0;

        let val = 0;
        if (filterType === 0) val = raw;
        else if (filterType === 1) val = (raw + a) & 0xff;
        else if (filterType === 2) val = (raw + b) & 0xff;
        else if (filterType === 3) val = (raw + Math.floor((a + b) / 2)) & 0xff;
        else if (filterType === 4) {
            const p = a + b - c;
            const pa = Math.abs(p - a);
            const pb = Math.abs(p - b);
            const pc = Math.abs(p - c);
            let pr = a;
            if (pb < pa && pb < pc) pr = b;
            else if (pc < pa) pr = c;
            val = (raw + pr) & 0xff;
        }
        row[x] = val;
    }
    uncompressedRows.push(row);
    prevRow = row;
}

// Sample across horizontal line y = 359
const row359 = uncompressedRows[359];
let lastColor = '';
console.log('Horizontal center scan (y=359):');
for (let x = 0; x < width; x += 15) {
    const r = row359[x * 4];
    const g = row359[x * 4 + 1];
    const b = row359[x * 4 + 2];
    const a = row359[x * 4 + 3];
    console.log(`x=${x}: R=${r}, G=${g}, B=${b}, A=${a}`);
}

// Sample across vertical center line x = 359
console.log('\nVertical center scan (x=359):');
for (let y = 0; y < height; y += 30) {
    const r = uncompressedRows[y][359 * 4];
    const g = uncompressedRows[y][359 * 4 + 1];
    const b = uncompressedRows[y][359 * 4 + 2];
    const a = uncompressedRows[y][359 * 4 + 3];
    console.log(`y=${y}: R=${r}, G=${g}, B=${b}, A=${a}`);
}

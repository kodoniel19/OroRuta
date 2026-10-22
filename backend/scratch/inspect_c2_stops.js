const fs = require('fs');
const path = require('path');

const bundledPath = path.join(__dirname, '../../android/app/src/main/assets/bundled_routes.json');
const routes = JSON.parse(fs.readFileSync(bundledPath, 'utf8'));

const c2 = routes.find(r => r.id === 'c2-patag-gaisano-limketkai-cogon' || r.code === 'C2');

if (c2) {
  console.log(`Route Code: [${c2.code}] ${c2.name}`);
  console.log('Terminals:', JSON.stringify(c2.terminals, null, 2));
  console.log('Stops:', JSON.stringify(c2.stops, null, 2));
} else {
  console.log('Route C2 not found');
}

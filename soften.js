const fs = require('fs');

let content = fs.readFileSync('src/main.jsx', 'utf8');

// Icons
content = content.replace(/Orbit,/g, 'Home,');
content = content.replace(/<Orbit /g, '<Home ');

// Techy terms
content = content.replace(/Local Sync Simulator/g, 'Connection Status');
content = content.replace(/TETHERED/g, 'CONNECTED');
content = content.replace(/Tether Code/g, 'Connection Code');
content = content.replace(/Co-regulation/g, 'Harmony');
content = content.replace(/coreg/g, 'harmony');
content = content.replace(/Thermal Blanket/g, 'Warm Embrace');
content = content.replace(/Re-entry/g, 'Reunion');
content = content.replace(/reEntry/g, 'reunion');
content = content.replace(/The Afterglow/g, 'The Warmth');
content = content.replace(/Stardust/g, 'Traces');
content = content.replace(/stardust/g, 'traces');
content = content.replace(/Sanctuary/g, 'Space');
content = content.replace(/sanctuary/g, 'space');

// Romanticizing
content = content.replace(/The timeline of two orbits/g, 'The timeline of our love');
content = content.replace(/The timeline of two stars/g, 'The timeline of our love');

fs.writeFileSync('src/main.jsx', content, 'utf8');
console.log('Language softened.');

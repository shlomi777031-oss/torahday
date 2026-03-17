import fs from 'fs';
const data = fs.readFileSync('hayomyom2.html', 'utf8');
console.log("Length:", data.length);

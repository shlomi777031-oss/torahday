import fs from 'fs';
const data = fs.readFileSync('lesson.html', 'utf8');
console.log("Length:", data.length);

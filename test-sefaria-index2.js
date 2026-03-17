import fs from 'fs';
const data = JSON.parse(fs.readFileSync('sefaria-index.json', 'utf8'));
function search(obj) {
  if (typeof obj === 'string') {
    if (obj.toLowerCase().includes('hayom')) console.log(obj);
  } else if (Array.isArray(obj)) {
    obj.forEach(search);
  } else if (obj && typeof obj === 'object') {
    Object.values(obj).forEach(search);
  }
}
search(data);

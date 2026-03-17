import fs from 'fs';
const data = fs.readFileSync('hayomyom2.html', 'utf8');
const matches = data.match(/<a[^>]+href="([^"]+)"/gi);
if (matches) {
  for (const m of matches) {
    if (m.toLowerCase().includes('lesson') || m.toLowerCase().includes('hayom')) {
      console.log(m);
    }
  }
}

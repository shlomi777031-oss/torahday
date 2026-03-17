import fs from 'fs';
const data = fs.readFileSync('hayomyom2.html', 'utf8');
const matches = data.match(/<a[^>]+href="([^"]+)"[^>]*>([^<]+)<\/a>/gi);
if (matches) {
  for (const m of matches) {
    if (m.includes('יום')) {
      console.log(m);
    }
  }
}

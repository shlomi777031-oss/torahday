import fs from 'fs';
const data = fs.readFileSync('lessons.html', 'utf8');
const matches = data.match(/<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi);
if (matches) {
  for (const m of matches) {
    if (m.includes('יום')) {
      console.log(m.replace(/\s+/g, ' '));
    }
  }
}

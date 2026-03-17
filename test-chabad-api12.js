import fs from 'fs';
const data = fs.readFileSync('hayomyom2.html', 'utf8');
const matches = data.match(/<td[^>]*>([\s\S]*?)<\/td>/gi);
if (matches) {
  for (const m of matches) {
    const text = m.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (text.includes('יום') && text.length > 50) {
      console.log("MATCH:", text.substring(0, 100));
    }
  }
}

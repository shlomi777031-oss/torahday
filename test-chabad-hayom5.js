import fs from 'fs';
const data = fs.readFileSync('hayomyom.html', 'utf8');
const matches = data.match(/<[^>]+class="[^"]+"[^>]*>|<[^>]+id="[^"]+"[^>]*>/gi);
if (matches) {
  console.log(matches.slice(0, 50).join('\n'));
}

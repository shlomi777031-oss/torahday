import fs from 'fs';
async function checkSefaria() {
  const res = await fetch('https://www.sefaria.org/api/index');
  const data = await res.json();
  fs.writeFileSync('sefaria-index.json', JSON.stringify(data));
}
checkSefaria();

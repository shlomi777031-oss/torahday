import fs from 'fs';
async function checkChabad() {
  const res = await fetch('https://www.chabad.org.il/Lessons/Lessons.asp?CategoryID=175');
  const buffer = await res.arrayBuffer();
  const decoder = new TextDecoder('windows-1255');
  const data = decoder.decode(buffer);
  fs.writeFileSync('lessons.html', data);
}
checkChabad();

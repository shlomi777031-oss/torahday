import fs from 'fs';
async function checkChabad() {
  const res = await fetch('https://www.chabad.org.il/Lessons/Yom.asp?SelectdDate=15/03/2026&DateType=0');
  const buffer = await res.arrayBuffer();
  const decoder = new TextDecoder('windows-1255');
  const data = decoder.decode(buffer);
  fs.writeFileSync('yom.html', data);
}
checkChabad();

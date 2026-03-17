import fs from 'fs';
async function checkChabad() {
  const res = await fetch('https://www.chabad.org.il/Lessons/Hayom_Yom.asp');
  const buffer = await res.arrayBuffer();
  const decoder = new TextDecoder('windows-1255');
  const data = decoder.decode(buffer);
  console.log("Length:", data.length);
}
checkChabad();

import fs from 'fs';
async function checkChabadInfo() {
  const res = await fetch('https://api.codetabs.com/v1/proxy?quest=https://chabad.info/daily-study/');
  const data = await res.text();
  fs.writeFileSync('chabad-info.html', data);
}
checkChabadInfo();

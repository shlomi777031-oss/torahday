import https from 'https';
https.get('https://corsproxy.io/?https://www.chabad.org/rss/daily-study/sefer-hamitzvot.xml', (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => console.log(data.substring(0, 1000)));
});

import https from 'https';

https.get('https://api.codetabs.com/v1/proxy?quest=https://www.chabad.org.il/Lessons/RambamMitzvot.asp?SelectdDate=15/03/2026%26DateType=0', (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    console.log("Data length:", data.length);
    console.log("First 500 chars:", data.substring(0, 500));
  });
});

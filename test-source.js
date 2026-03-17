import https from 'https';
https.get('https://api.codetabs.com/v1/proxy?quest=https://www.chabad.org.il/Lessons/RambamMitzvot.asp?SelectdDate=15/03/2026%26DateType=0', (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    const blocks = data.match(/<(?:P|DIV|SPAN|TD)[^>]*>([\s\S]*?)<\/(?:P|DIV|SPAN|TD)>/gi) || [];
    for (const block of blocks) {
      if (block.includes('מצוה') || block.includes('מ צ ו ה') || block.includes('מצווה')) {
        console.log("BLOCK:", block.substring(0, 150));
      }
    }
  });
});

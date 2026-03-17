import https from 'https';

https.get('https://api.codetabs.com/v1/proxy?quest=https://www.chabad.org.il/Lessons/RambamMitzvot.asp?SelectdDate=15/03/2026%26DateType=0', (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    const blocks = data.match(/<(?:P|DIV|SPAN|TD)[^>]*>([\s\S]*?)<\/(?:P|DIV|SPAN|TD)>/gi) || [];
    let count = 0;
    for (const block of blocks) {
      let cleanBlock = block.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
      if (cleanBlock.includes('מצוה') || cleanBlock.includes('מ צ ו ה') || cleanBlock.includes('מצווה') || cleanBlock.includes('עשה')) {
        console.log("BLOCK:", cleanBlock.substring(0, 150));
        count++;
        if (count > 5) break;
      }
    }
  });
});

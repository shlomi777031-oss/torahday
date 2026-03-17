import https from 'https';
https.get('https://api.allorigins.win/raw?url=https://www.chabad.org.il/Lessons/RambamMitzvot.asp?SelectdDate=15/03/2026%26DateType=0', (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    const blocks = data.match(/<(?:P|DIV|SPAN|TD)[^>]*>([\s\S]*?)<\/(?:P|DIV|SPAN|TD)>/gi) || [];
    for (const block of blocks) {
      let cleanBlock = block.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      if (cleanBlock.includes('מ צ ו ה') || cleanBlock.includes('מ צ ו ו ת')) {
        console.log("FOUND WITH SPACES:", cleanBlock.substring(0, 100));
      }
      let cleanBlock2 = block.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
      if (cleanBlock2.includes('מצוה') || cleanBlock2.includes('מצוות')) {
        console.log("FOUND WITHOUT SPACES:", cleanBlock2.substring(0, 100));
      }
    }
  });
});

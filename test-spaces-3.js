import https from 'https';

https.get('https://api.codetabs.com/v1/proxy?quest=https://www.chabad.org.il/Lessons/RambamMitzvot.asp?SelectdDate=15/03/2026%26DateType=0', (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    const blocks = data.match(/<(?:P|DIV|SPAN|TD)[^>]*>([\s\S]*?)<\/(?:P|DIV|SPAN|TD)>/gi) || [];
    for (const block of blocks) {
      let cleanBlock = block.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
      if (cleanBlock.length > 10) {
        // Look for single letters followed by space and then a word
        const matches = cleanBlock.match(/(?<=^|\s)([א-ת])\s+([א-ת]{2,})/g);
        if (matches) {
          console.log("Found potential split words:", matches);
          console.log("Context:", cleanBlock.substring(0, 100));
        }
      }
    }
  });
});

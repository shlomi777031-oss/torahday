async function test() {
  try {
    const targetUrl = 'https://www.chabad.org.il/Lessons/RambamMitzvot.asp';
    const proxyUrl = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}`;
    const res = await fetch(proxyUrl);
    const buffer = await res.arrayBuffer();
    const decoder = new TextDecoder('windows-1255');
    const text = decoder.decode(buffer);
    
    const blocks = text.match(/<(?:P|DIV|SPAN|TD)[^>]*>([\s\S]*?)<\/(?:P|DIV|SPAN|TD)>/gi) || [];
    let currentMitzvah: any = null;
    const mitzvot = [];
    
    for (const block of blocks) {
      let cleanBlock = block.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      if (cleanBlock.length < 10) continue;
      
      if (cleanBlock.includes('נא לשמור על קדושת הדף') || cleanBlock.includes('דרונט דיגיטל')) {
        cleanBlock = cleanBlock.split('נא לשמור על קדושת הדף')[0].split('דרונט דיגיטל')[0].trim();
        if (!cleanBlock) continue;
      }
      
      const titleMatch = cleanBlock.match(/^((?:מצוה|מצווה|מצוות|מצות|לא תעשה|עשה)\s+(?:עשה\s+|לא תעשה\s+)?(?:מצוה\s+|מצווה\s+)?(?:[א-ת"']+))(?:\s*[:-]\s*(.*))?$/i);
      const isHeader = (cleanBlock.includes('מצות עשה') || cleanBlock.includes('מצות לא תעשה') || 
                       cleanBlock.includes('מצווה עשה') || cleanBlock.includes('מצווה לא תעשה')) && cleanBlock.length < 100;
      
      if (titleMatch) {
        if (currentMitzvah) mitzvot.push(currentMitzvah);
        currentMitzvah = { heRef: titleMatch[1], he: titleMatch[2] || '' };
      } else if (isHeader) {
        if (currentMitzvah) mitzvot.push(currentMitzvah);
        currentMitzvah = { heRef: cleanBlock, he: '' };
      } else if (currentMitzvah) {
        currentMitzvah.he += (currentMitzvah.he ? ' ' : '') + cleanBlock;
      } else if (cleanBlock.startsWith('מצו')) {
        currentMitzvah = { heRef: 'מצוה', he: cleanBlock };
      }
    }
    if (currentMitzvah) mitzvot.push(currentMitzvah);
    
    const processedMitzvot = mitzvot.map(m => {
      if (m.he.length < 10) {
        const splitMatch = m.heRef.match(/^((?:מצוה|מצווה|מצוות|מצות|לא תעשה|עשה)\s+(?:עשה\s+|לא תעשה\s+)?(?:מצוה\s+|מצווה\s+)?(?:[א-ת"']+))\s*[:-]\s*(.*)/i);
        if (splitMatch) {
          return { heRef: splitMatch[1], he: splitMatch[2] };
        }
      }
      return m;
    }).filter(m => m.he.length > 20 && m.heRef !== 'מצוות נדירות' && !m.he.includes('לבית היהודי ולעסק'));
    
    console.log(JSON.stringify(processedMitzvot, null, 2));
  } catch (e) {
    console.error(e);
  }
}
test();

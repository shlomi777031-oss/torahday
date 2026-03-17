async function run() {
  try {
    const res = await fetch('https://www.chabad.org.il/Lessons/RambamMitzvot.asp?SelectdDate=15/03/2026&DateType=0');
    const buffer = await res.arrayBuffer();
    const decoder = new TextDecoder('windows-1255');
    const data = decoder.decode(buffer);
    
    const blocks = data.match(/<(?:P|DIV|SPAN|TD)[^>]*>([\s\S]*?)<\/(?:P|DIV|SPAN|TD)>/gi) || [];
    let count = 0;
    for (const block of blocks) {
      let cleanBlock = block.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
      if (cleanBlock.includes('מצוה') || cleanBlock.includes('מ צ ו ה') || cleanBlock.includes('מצווה') || cleanBlock.includes('עשה')) {
        console.log("BLOCK:", cleanBlock);
        
        // Find single letter prefixes
        const matches = cleanBlock.match(/(?<=^|\s)([א-ת])\s+([א-ת]{2,})/g);
        if (matches) {
          console.log("FOUND SPLIT:", matches);
        }
        
        count++;
        if (count > 5) break;
      }
    }
  } catch (e) {
    console.error(e);
  }
}

run();

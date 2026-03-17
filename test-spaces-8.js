async function run() {
  try {
    const res = await fetch('https://corsproxy.io/?https%3A%2F%2Fwww.chabad.org.il%2FLessons%2FRambamMitzvot.asp%3FSelectdDate%3D15%2F03%2F2026%26DateType%3D0');
    const buffer = await res.arrayBuffer();
    const decoder = new TextDecoder('windows-1255');
    const data = decoder.decode(buffer);
    
    console.log("Data length:", data.length);
    
    const blocks = data.match(/<(?:P|DIV|SPAN|TD)[^>]*>([\s\S]*?)<\/(?:P|DIV|SPAN|TD)>/gi) || [];
    let count = 0;
    for (const block of blocks) {
      let cleanBlock = block.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
      if (cleanBlock.includes('מצוה') || cleanBlock.includes('מ צ ו ה') || cleanBlock.includes('מצווה') || cleanBlock.includes('עשה')) {
        console.log("BLOCK:", cleanBlock.substring(0, 150));
        
        // Find single letter prefixes
        const matches = cleanBlock.match(/(?<=^|\s)([א-ת])\s+([א-ת]{2,})/g);
        if (matches) {
          console.log("FOUND SPLIT:", matches);
        }
        
        count++;
        if (count > 20) break;
      }
    }
  } catch (e) {
    console.error(e);
  }
}

run();

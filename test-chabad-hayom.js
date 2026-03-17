async function checkChabad() {
  const res = await fetch('https://www.chabad.org.il/Lessons/HayomYom.asp?SelectdDate=15/03/2026&DateType=0');
  const buffer = await res.arrayBuffer();
  const decoder = new TextDecoder('windows-1255');
  const data = decoder.decode(buffer);
  
  const blocks = data.match(/<(?:P|DIV|SPAN|TD)[^>]*>([\s\S]*?)<\/(?:P|DIV|SPAN|TD)>/gi) || [];
  let count = 0;
  for (const block of blocks) {
    let cleanBlock = block.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
    if (cleanBlock.length > 50) {
      console.log("BLOCK:", cleanBlock.substring(0, 150));
      count++;
      if (count > 10) break;
    }
  }
}
checkChabad();

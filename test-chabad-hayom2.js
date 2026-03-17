async function checkChabad() {
  const res = await fetch('https://www.chabad.org.il/Lessons/HayomYom.asp?SelectdDate=15/03/2026&DateType=0');
  const buffer = await res.arrayBuffer();
  const decoder = new TextDecoder('windows-1255');
  const data = decoder.decode(buffer);
  
  const match = data.match(/<div[^>]*id="HayomYomText"[^>]*>([\s\S]*?)<\/div>/i) || data.match(/<td[^>]*class="Text"[^>]*>([\s\S]*?)<\/td>/i);
  if (match) {
    console.log("FOUND:", match[1].replace(/<[^>]+>/g, '').trim().substring(0, 500));
  } else {
    console.log("Not found by regex. Printing some lines with 'יום':");
    const lines = data.split('\n');
    for (const line of lines) {
      if (line.includes('יום')) {
        console.log(line.replace(/<[^>]+>/g, '').trim().substring(0, 100));
      }
    }
  }
}
checkChabad();

async function search() {
  const res = await fetch('https://html.duckduckgo.com/html/?q=site:chabad.org.il+"היום+יום"');
  const data = await res.text();
  const matches = data.match(/href="([^"]+)"/g);
  if (matches) {
    const urls = matches.map(m => m.substring(6, m.length - 1)).filter(u => u.includes('chabad.org.il'));
    console.log(urls.slice(0, 10).join('\n'));
  }
}
search();

async function searchSefaria() {
  const res = await fetch('https://www.sefaria.org/api/search-wrapper', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: "היום יום",
      type: "text"
    })
  });
  const data = await res.json();
  if (data.hits && data.hits.hits) {
    console.log(data.hits.hits.slice(0, 5).map(h => h._source.ref));
  } else {
    console.log(data);
  }
}
searchSefaria();

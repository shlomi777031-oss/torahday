async function checkSefaria() {
  const res = await fetch('https://www.sefaria.org/api/search-wrapper?query=Hayom%20Yom&type=text');
  const data = await res.json();
  console.log(data.hits.hits.slice(0, 5).map(h => h._source.ref));
}
checkSefaria();

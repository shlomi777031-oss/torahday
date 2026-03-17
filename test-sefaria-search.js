async function searchSefaria() {
  const res = await fetch('https://www.sefaria.org/api/search-wrapper?query=%D7%94%D7%99%D7%95%D7%9D%20%D7%99%D7%95%D7%9D&type=text');
  const data = await res.json();
  if (data.hits && data.hits.hits) {
    console.log(data.hits.hits.slice(0, 5).map(h => h._source.ref));
  } else {
    console.log(data);
  }
}
searchSefaria();

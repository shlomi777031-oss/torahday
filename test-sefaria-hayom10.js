async function checkSefaria() {
  const res = await fetch('https://www.sefaria.org/api/name/Hayom%20Yom');
  const data = await res.json();
  console.log(data);
}
checkSefaria();

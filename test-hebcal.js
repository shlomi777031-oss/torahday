async function checkHebcal() {
  const res = await fetch('https://www.hebcal.com/leyning?v=1&cfg=json&date=2026-03-15');
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}
checkHebcal();

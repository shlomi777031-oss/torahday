async function checkChabadApi() {
  const res = await fetch('https://api.allorigins.win/raw?url=https://he.chabad.org/dailystudy/hayomyom.htm');
  const data = await res.text();
  console.log(data.substring(0, 1000));
}
checkChabadApi();

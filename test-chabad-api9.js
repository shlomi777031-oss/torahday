async function checkChabadApi() {
  const res = await fetch('https://api.codetabs.com/v1/proxy?quest=https://he.chabad.org/dailystudy/hayomyom.htm');
  const data = await res.text();
  console.log(data.substring(0, 500));
}
checkChabadApi();

async function checkChabadApi() {
  const res = await fetch('https://api.chabad.org/api/v2/dailystudy/hayomyom');
  console.log(res.status);
}
checkChabadApi();

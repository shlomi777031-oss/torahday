async function checkChabadApi() {
  const res = await fetch('https://www.chabad.org/api/dailystudy');
  console.log(res.status);
}
checkChabadApi();

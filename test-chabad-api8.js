async function checkChabadApi() {
  const res = await fetch('https://corsproxy.io/?https%3A%2F%2Fhe.chabad.org%2Fdailystudy%2Fhayomyom.htm');
  const data = await res.text();
  console.log(data.substring(0, 500));
}
checkChabadApi();

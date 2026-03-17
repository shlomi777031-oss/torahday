async function checkChabadInfo() {
  const res = await fetch('https://api.codetabs.com/v1/proxy?quest=https://chabad.info/daily-study/');
  const data = await res.text();
  console.log(data.substring(0, 500));
}
checkChabadInfo();

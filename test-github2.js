async function searchGithub() {
  const res = await fetch('https://api.github.com/search/repositories?q=hayomyom');
  const data = await res.json();
  console.log(data.items.slice(0, 5).map(i => i.html_url));
}
searchGithub();

async function checkSefaria() {
  const res = await fetch('https://www.sefaria.org/api/calendars?timezone=Asia/Jerusalem&year=2026&month=3&day=15');
  const data = await res.json();
  data.calendar_items.forEach(item => {
    console.log(item.title.en, item.ref);
  });
}
checkSefaria();

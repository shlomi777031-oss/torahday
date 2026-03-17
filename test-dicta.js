async function run() {
  try {
    const response = await fetch('https://nakdan-2-0.loadbalancer.dicta.org.il/api', {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain; charset=utf-8'
      },
      body: JSON.stringify({
        task: "nakdan",
        data: "הזהיר מענוש הגדרים על החוטא",
        addmorph: true,
        keepqq: false,
        matchpartial: true,
        generate_links: false,
        genre: "rabbinic"
      })
    });
    const result = await response.json();
    console.log(JSON.stringify(result, null, 2));
    
    const vocalizedText = result.map((word) => 
      word.options && word.options.length > 0 ? word.options[0][0] : word.word
    ).join('');
    console.log("VOCALIZED:", vocalizedText);
  } catch (e) {
    console.error(e);
  }
}
run();

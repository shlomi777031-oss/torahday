let text = "מ צ ו ה עשה קכג";
while (text.match(/(?<=^|\s)([א-ת])\s+(?=[א-ת](?:\s|$))/)) {
  text = text.replace(/(?<=^|\s)([א-ת])\s+(?=[א-ת](?:\s|$))/g, '$1');
}
console.log(text);

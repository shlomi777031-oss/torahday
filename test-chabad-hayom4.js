import fs from 'fs';
const data = fs.readFileSync('hayomyom.html', 'utf8');
console.log("Length:", data.length);
const match = data.match(/<td[^>]*class="Text"[^>]*>([\s\S]*?)<\/td>/i);
if (match) {
  console.log("FOUND:", match[1].substring(0, 500));
} else {
  console.log("Not found.");
}

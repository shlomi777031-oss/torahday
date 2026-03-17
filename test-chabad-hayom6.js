import fs from 'fs';
const data = fs.readFileSync('hayomyom.html', 'utf8');
const bodyMatch = data.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
if (bodyMatch) {
  const bodyText = bodyMatch[1].replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  console.log(bodyText.substring(0, 1000));
}

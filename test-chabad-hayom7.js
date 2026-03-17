import fs from 'fs';
const data = fs.readFileSync('hayomyom.html', 'utf8');
const bodyMatch = data.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
if (bodyMatch) {
  const bodyText = bodyMatch[1].replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const index = bodyText.indexOf('היום יום');
  if (index !== -1) {
    console.log("FOUND AT", index, ":", bodyText.substring(Math.max(0, index - 100), index + 500));
  } else {
    console.log("Not found.");
  }
}

import https from 'https';

const data = JSON.stringify({
  task: "nakdan",
  data: "שלום עולם",
  addmorph: true,
  keepqq: false,
  matchpartial: true,
  generate_links: false,
  genre: "rabbinic"
});

const options = {
  hostname: 'nakdan-2-0.loadbalancer.dicta.org.il',
  port: 443,
  path: '/api',
  method: 'POST',
  headers: {
    'Content-Type': 'text/plain',
    'Content-Length': Buffer.byteLength(data),
    'Origin': 'http://localhost:3000'
  }
};

const req = https.request(options, res => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => console.log(res.statusCode, body));
});

req.on('error', error => {
  console.error(error);
});

req.write(data);
req.end();

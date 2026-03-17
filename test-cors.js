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
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(data),
    'Origin': 'http://localhost:3000'
  }
};

const req = https.request(options, res => {
  console.log(res.headers);
});

req.on('error', error => {
  console.error(error);
});

req.write(data);
req.end();

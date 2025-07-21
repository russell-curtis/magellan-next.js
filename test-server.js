const http = require('http');

const server = http.createServer((req, res) => {
  res.writeHead(200, {'Content-Type': 'text/html'});
  res.end('<h1>Test Server Working</h1>');
});

server.listen(3004, () => {
  console.log('Test server running on http://localhost:3004');
});
EOF < /dev/null
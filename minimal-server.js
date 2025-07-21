const http = require('http');

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Hello from minimal server!');
});

const PORT = 4000;

server.listen(PORT, '127.0.0.1', (err) => {
  if (err) {
    console.error('Server failed to start:', err);
    return;
  }
  console.log(`Server running on http://127.0.0.1:${PORT}`);
});

server.on('error', (err) => {
  console.error('Server error:', err);
});

server.on('listening', () => {
  console.log('Server is listening...');
});
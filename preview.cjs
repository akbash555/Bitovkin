const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, 'dist');
http.createServer((request, response) => {
  const url = new URL(request.url, 'http://localhost');
  const file = path.resolve(root, '.' + decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname));
  if (!file.startsWith(root + path.sep)) { response.writeHead(403).end(); return; }
  fs.readFile(file, (error, data) => {
    if (error) { response.writeHead(404).end('Not found'); return; }
    const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript' };
    response.setHeader('Content-Type', (types[path.extname(file)] || 'text/plain') + '; charset=utf-8');
    response.end(data);
  });
}).listen(8080, '127.0.0.1', () => console.log('http://127.0.0.1:8080'));

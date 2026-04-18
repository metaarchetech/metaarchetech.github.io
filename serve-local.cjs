const http = require('http');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, 'public');
const mime = { '.html':'text/html','.css':'text/css','.js':'application/javascript','.json':'application/json','.png':'image/png','.ico':'image/x-icon','.xml':'text/xml','.svg':'image/svg+xml','.webp':'image/webp','.woff2':'font/woff2','.woff':'font/woff' };

function resolve(u) {
  const candidates = [];
  if (u === '/' || u.endsWith('/')) {
    candidates.push(path.join(root, u, 'index.html'));
  } else if (path.extname(u)) {
    candidates.push(path.join(root, u));
  } else {
    candidates.push(path.join(root, u + '.html'));
    candidates.push(path.join(root, u, 'index.html'));
  }
  for (const fp of candidates) {
    if (fs.existsSync(fp)) return fp;
  }
  return path.join(root, '404.html');
}

http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  const fp = resolve(u);
  fs.readFile(fp, (err, data) => {
    if (err) { res.writeHead(404); res.end('not found'); return; }
    const status = fp.endsWith('404.html') ? 404 : 200;
    res.writeHead(status, { 'Content-Type': mime[path.extname(fp)] || 'text/plain', 'Access-Control-Allow-Origin': '*' });
    res.end(data);
  });
}).listen(process.env.PORT || 8082, () => console.log('ready on port', process.env.PORT || 8082));

const http = require('http');
const fs = require('fs');
const path = require('path');
const api = require('./netlify/functions/api.js');

const PORT = 3005;

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml'
};

const server = http.createServer(async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const urlObj = new URL(req.url, `http://localhost:${PORT}`);

  // 1. API Route Handler (Netlify Serverless Emulation)
  if (urlObj.pathname.startsWith('/api')) {
    console.log(`[API Request] ${req.method} ${req.url}`);
    
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      // Parse query string parameters into plain object
      const queryParams = {};
      urlObj.searchParams.forEach((val, key) => {
        queryParams[key] = val;
      });

      // Build Netlify event payload structure
      const event = {
        httpMethod: req.method,
        queryStringParameters: queryParams,
        body: body || null,
        headers: req.headers
      };

      try {
        const result = await api.handler(event, {});
        
        // Merge headers and send response
        const headers = {
          'Content-Type': 'application/json',
          ...(result.headers || {})
        };
        res.writeHead(result.statusCode || 200, headers);
        res.end(result.body);
      } catch (err) {
        console.error('Local Server API Error:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Internal Server Error', message: err.message }));
      }
    });
    return;
  }

  // 2. Static File Serving
  let filePath = path.join(__dirname, urlObj.pathname);
  if (urlObj.pathname === '/') {
    filePath = path.join(__dirname, 'index.html');
  }

  // Prevent directory traversal attacks
  const relative = path.relative(__dirname, filePath);
  const isSafe = relative && !relative.startsWith('..') && !path.isAbsolute(relative);
  if (urlObj.pathname !== '/' && !isSafe) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        console.log(`[404] Not Found: ${req.url}`);
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('404 Not Found - ไฟล์ไม่มีอยู่ในระบบ');
      } else {
        console.error(`[500] Read Error: ${req.url}`, err);
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('500 Internal Server Error - เกิดข้อผิดพลาดของเซิร์ฟเวอร์');
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, () => {
  console.log('================================================================');
  console.log(`🚀 Bancha HR System Dev Server running at http://localhost:${PORT}`);
  console.log(`📂 Serving static files from: ${__dirname}`);
  console.log('⚡ Local Netlify Serverless API emulation fully active');
  console.log('================================================================\n');
});

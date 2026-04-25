#!/usr/bin/env node

/**
 * Simple HTTP Server for Team Click Tracker
 * 
 * Usage:
 *   node server.js
 * 
 * Then open browser: http://localhost:5000
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 5000;
const HOSTNAME = '127.0.0.1';

// MIME types
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.wav': 'audio/wav',
  '.mp4': 'video/mp4',
  '.woff': 'application/font-woff',
  '.ttf': 'application/font-ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.otf': 'application/font-otf',
  '.wasm': 'application/wasm'
};

const server = http.createServer((req, res) => {
  // Parse the request URL
  const parsedUrl = url.parse(req.url, true);
  let pathname = `.${parsedUrl.pathname}`;

  // Default to index.html or welcome.html
  if (pathname === './') {
    pathname = './welcome.html';
  }

  // Get file extension
  const ext = path.parse(pathname).ext;

  // Read and serve the file
  fs.readFile(pathname, (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        // File not found
        res.statusCode = 404;
        res.contentType = 'text/html';
        res.end(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>404 - Not Found</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                margin: 0;
                background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
              }
              .container {
                text-align: center;
                background: white;
                padding: 2rem;
                border-radius: 1rem;
                box-shadow: 0 10px 30px rgba(0,0,0,0.3);
              }
              h1 { color: #ef4444; margin: 0 0 1rem 0; }
              p { color: #6b7280; margin: 0.5rem 0; }
              a { color: #6366f1; text-decoration: none; font-weight: bold; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>404 - Page Not Found</h1>
              <p>Requested: ${pathname}</p>
              <p><a href="/welcome.html">← Back to Welcome</a></p>
            </div>
          </body>
          </html>
        `);
      } else {
        // Server error
        res.statusCode = 500;
        res.end(`Server error: ${err}`);
      }
    } else {
      // Set proper content type
      res.statusCode = 200;
      res.contentType = mimeTypes[ext] || 'text/plain';
      res.end(data);
    }
  });
});

server.listen(PORT, HOSTNAME, () => {
  console.log('\n');
  console.log('╔════════════════════════════════════════════╗');
  console.log('║   Team Click Tracker - Local Web Server    ║');
  console.log('╚════════════════════════════════════════════╝');
  console.log('\n');
  console.log(`🚀 Server running at:`);
  console.log(`   http://${HOSTNAME}:${PORT}/`);
  console.log('\n');
  console.log('📍 Quick Links:');
  console.log(`   Welcome:     http://localhost:${PORT}/welcome.html`);
  console.log(`   Login:       http://localhost:${PORT}/frontend/index.html`);
  console.log(`   Signup:      http://localhost:${PORT}/frontend/signup.html`);
  console.log(`   Diagnostics: http://localhost:${PORT}/diagnostics.html`);
  console.log('\n');
  console.log('Press CTRL+C to stop the server');
  console.log('\n');
});

process.on('SIGINT', () => {
  console.log('\n\n🛑 Server stopped.\n');
  process.exit(0);
});

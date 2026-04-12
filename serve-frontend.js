// Simple static file server for the built frontend
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.FRONTEND_PORT || 4200;
const DIST_DIR = path.join(__dirname, 'dist/apps/frontend/browser');

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
};

const server = http.createServer((req, res) => {
    // SPA fallback: serve index.html for non-file routes
    let filePath = path.join(DIST_DIR, req.url === '/' ? 'index.html' : req.url);
    const ext = path.extname(filePath);
    const contentType = MIME_TYPES[ext] || 'text/html';

    fs.exists(filePath, (exists) => {
        if (!exists) {
            // SPA fallback
            filePath = path.join(DIST_DIR, 'index.html');
        }
        fs.readFile(filePath, (err, data) => {
            if (err) {
                res.writeHead(404);
                res.end('Not found');
            } else {
                res.writeHead(200, { 'Content-Type': contentType });
                res.end(data);
            }
        });
    });
});

server.listen(PORT, () => {
    console.log(`Frontend running on http://localhost:${PORT}`);
});

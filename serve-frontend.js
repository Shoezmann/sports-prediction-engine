const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.FRONTEND_PORT || 4200;
const BACKEND_URL = process.env.BACKEND_URL || 'http://127.0.0.1:3000';
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
    // ── Proxy /api requests to backend ──
    if (req.url.startsWith('/api')) {
        const options = {
            hostname: '127.0.0.1',
            port: 3000,
            path: req.url,
            method: req.method,
            headers: {
                ...req.headers,
                host: '127.0.0.1:3000',
            },
        };

        const proxyReq = http.request(options, (proxyRes) => {
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

            if (req.method === 'OPTIONS') {
                res.writeHead(204);
                res.end();
                return;
            }

            res.writeHead(proxyRes.statusCode, proxyRes.headers);
            proxyRes.pipe(res);
        });

        proxyReq.on('error', (err) => {
            console.error(`[Proxy Error] ${req.url}: ${err.message}`);
            res.writeHead(502, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Backend unavailable', detail: err.message }));
        });

        req.pipe(proxyReq);
        return;
    }

    // ── Handle CORS preflight ──
    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        res.writeHead(204);
        res.end();
        return;
    }

    // ── Serve static files ──
    let filePath = path.join(DIST_DIR, req.url === '/' ? 'index.html' : req.url);
    const ext = path.extname(filePath);
    const contentType = MIME_TYPES[ext] || 'text/html';

    // No caching for HTML, short cache for JS/CSS with hash
    if (ext === '.html') {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
    } else if (ext === '.js' || ext === '.css') {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }

    fs.exists(filePath, (exists) => {
        if (!exists) {
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
    console.log(`API proxying to ${BACKEND_URL}`);
});

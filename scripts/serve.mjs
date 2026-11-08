#!/usr/bin/env node
/**
 * Minimal static server for local previews. No dependencies, no caching.
 *   npm run dev  →  http://127.0.0.1:4173
 */
import http from 'node:http';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT || 4173);
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.md': 'text/markdown; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.yml': 'text/yaml; charset=utf-8'
};

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
    let pathname = decodeURIComponent(url.pathname);
    if (pathname.endsWith('/')) pathname += 'index.html';
    const file = path.resolve(ROOT, `.${pathname}`);
    if (!file.startsWith(ROOT + path.sep) && file !== ROOT) {
      response.writeHead(403, { 'Content-Type': 'text/plain' });
      response.end('Forbidden');
      return;
    }
    let stats;
    try {
      stats = await fsp.stat(file);
    } catch {
      response.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      response.end(`<!doctype html><meta charset="utf-8"><title>Not found</title><body style="font-family:system-ui;background:#0D0A13;color:#F1ECF8;padding:48px"><h1>404</h1><p><a style="color:#C6A6FF" href="/">Back to the profile</a></p>`);
      return;
    }
    if (stats.isDirectory()) {
      response.writeHead(302, { Location: `${url.pathname.replace(/\/?$/, '/')}index.html` });
      response.end();
      return;
    }
    const type = MIME[path.extname(file).toLowerCase()] || 'application/octet-stream';
    const body = await fsp.readFile(file);
    response.writeHead(200, {
      'Content-Type': type,
      'Content-Length': body.byteLength,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff'
    });
    response.end(body);
  } catch (error) {
    response.writeHead(500, { 'Content-Type': 'text/plain' });
    response.end(`Server error: ${error.message}`);
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`\n  Profile preview: http://127.0.0.1:${PORT}\n  Serving: ${ROOT}\n  Ctrl+C to stop.\n`);
});

process.on('SIGINT', () => {
  server.close(() => process.exit(0));
});

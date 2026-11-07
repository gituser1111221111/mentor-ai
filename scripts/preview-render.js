// Local UI preview backed by the existing Render service. Credentials stay on Render.
import http from 'node:http';
import https from 'node:https';
import {serveStatic} from '../lib/routes.js';
const backend = new URL('https://mentor-ai-ahjs.onrender.com');
const port = Number(process.env.PORT) || 4182;
http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (req.headers.origin && new URL(req.headers.origin).host !== req.headers.host) {
    res.writeHead(403); return res.end('Cross-origin requests disabled');
  }
  if (url.pathname.startsWith('/api/')) {
    const headers = {...req.headers, host: backend.host};
    delete headers.origin; delete headers.referer; delete headers.connection;
    const upstream = https.request(new URL(url.pathname + url.search, backend), {method:req.method, headers}, response => {
      res.writeHead(response.statusCode, {...response.headers, 'cache-control':'no-store'});
      response.pipe(res);
    });
    upstream.setTimeout(180000, () => upstream.destroy(new Error('Backend timed out')));
    upstream.on('error', () => {
      if (!res.headersSent) { res.writeHead(502, {'Content-Type':'application/json'}); res.end(JSON.stringify({error:'Could not reach the live service. Please try again.'})); }
      else res.destroy();
    });
    res.on('close', () => { if (!res.writableEnded) upstream.destroy(); });
    req.pipe(upstream);
    return;
  }
  try { if (await serveStatic(req,res,url.pathname)) return; }
  catch { res.writeHead(500); return res.end('Preview could not load'); }
  res.writeHead(404); res.end('Not found');
}).listen(port,'127.0.0.1',()=>console.log(`Local UI with Render backend: http://127.0.0.1:${port}`));

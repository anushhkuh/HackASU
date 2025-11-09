const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');

const app = express();
app.use(cors({ origin: 'http://localhost:3000' }));
app.use(express.json());

const PORT = process.env.PORT || 4000;
const BASE = process.env.CANVAS_BASE_URL || '';
const TOKEN = process.env.CANVAS_TOKEN || '';

if (!BASE) {
  console.warn('CANVAS_BASE_URL not set — proxy will not be able to reach Canvas until configured');
}
if (!TOKEN) {
  console.warn('CANVAS_TOKEN not set — proxy will not be able to reach Canvas until configured');
}

// simple passthrough: /api/canvas/* -> ${BASE}/*
app.use('/api/canvas', async (req, res) => {
  try {
    if (!BASE) return res.status(400).json({ error: 'CANVAS_BASE_URL not configured on proxy' });
    const upstreamPath = req.originalUrl.replace('/api/canvas', '');
    const upstream = `${BASE}${upstreamPath}`;

    const headers = Object.assign({}, req.headers || {});
    // override host and remove host header
    delete headers.host;
    // set authorization header from server env for security
    if (TOKEN) headers['authorization'] = `Bearer ${TOKEN}`;

    const opts = {
      method: req.method,
      headers: headers,
      body: (req.method !== 'GET' && req.method !== 'HEAD') ? JSON.stringify(req.body) : undefined,
    };

    const resp = await fetch(upstream, opts);
    const text = await resp.text();
    res.status(resp.status);
    // try to parse JSON
    try {
      const json = text ? JSON.parse(text) : null;
      res.json(json);
    } catch (e) {
      res.send(text);
    }
  } catch (err) {
    console.error('Proxy error', err);
    res.status(500).json({ error: 'Proxy error', detail: String(err) });
  }
});

app.listen(PORT, () => {
  console.log(`Canvas proxy listening on http://localhost:${PORT}/api/canvas`);
  console.log('Make sure CANVAS_BASE_URL and CANVAS_TOKEN are set in environment before starting the proxy.');
});

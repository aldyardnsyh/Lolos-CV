// Bridge CORS lokal untuk 9Router (atau server LLM lokal lain).
//
// MASALAH: browser memblokir request dari halaman publik (mis. hasil deploy
// Vercel) ke http://localhost:PORT bila server tidak menjawab preflight
// OPTIONS dengan header CORS + Private-Network. 9Router menjawab OPTIONS
// dengan 401 TANPA header tersebut, jadi browser membunuh request duluan.
//
// SOLUSI: script ini duduk di antara browser dan 9Router (default :20129 ->
// :20128), menjawab preflight sendiri dan menempel header yang dibutuhkan
// ke setiap respons. Tanpa dependensi, murni Node.js.
//
// PAKAI:
//   1. node bridge/9router-cors.mjs
//      (opsional) PORT=20129 TARGET=http://localhost:20128 node bridge/9router-cors.mjs
//   2. Di aplikasi (Konfigurasi API → Custom): Base URL = http://localhost:20129/v1
//   3. Biarkan script ini jalan selama memakai API lokal.
// CATATAN: hanya listen di 127.0.0.1 (tidak terekspos ke LAN).

import http from "node:http";

const PORT = Number(process.env.PORT || 20129);
const TARGET = (process.env.TARGET || "http://localhost:20128").replace(/\/$/, "");
const BIND = process.env.BIND || "127.0.0.1";

const target = new URL(TARGET);
const useTls = target.protocol === "https:";
const httpMod = useTls ? await import("node:https") : http;

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Vary": "Origin",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "authorization, content-type, x-api-key, x-goog-api-key, anthropic-version, anthropic-dangerous-direct-browser-access",
    "Access-Control-Max-Age": "86400",
    // Wajib agar Chrome mengizinkan halaman publik mengakses loopback:
    "Access-Control-Allow-Private-Network": "true",
  };
}

const server = http.createServer((req, res) => {
  const origin = req.headers.origin || "";

  if (req.method === "OPTIONS") {
    res.writeHead(204, corsHeaders(origin));
    res.end();
    return;
  }

  const fwdHeaders = { ...req.headers };
  delete fwdHeaders["host"];
  delete fwdHeaders["connection"];
  fwdHeaders["host"] = target.host;
  if (origin) {
    // Jangan teruskan Origin agar server hilir tidak bingung; browser hanya
    // peduli header respons dari bridge ini.
    delete fwdHeaders["origin"];
  }

  const proxyReq = httpMod.request(
    {
      hostname: target.hostname,
      port: target.port || (useTls ? 443 : 80),
      path: req.url || "/",
      method: req.method,
      headers: fwdHeaders,
    },
    (proxyRes) => {
      const outHeaders = { ...proxyRes.headers };
      // Buang header CORS hilir dulu: dua nilai Access-Control-Allow-Origin
      // (mis. "*" dari 9Router + echo bridge) DITOLAK browser.
      for (const k of Object.keys(outHeaders)) {
        if (k.toLowerCase().startsWith("access-control-")) delete outHeaders[k];
      }
      Object.assign(outHeaders, corsHeaders(origin));
      delete outHeaders["content-length"]; // biarkan Node hitung ulang
      delete outHeaders["transfer-encoding"];
      res.writeHead(proxyRes.statusCode || 502, outHeaders);
      proxyRes.pipe(res);
    }
  );

  proxyReq.on("error", (err) => {
    if (!res.headersSent) {
      res.writeHead(502, { "Content-Type": "application/json", ...corsHeaders(origin) });
    }
    res.end(JSON.stringify({ error: `Bridge gagal meneruskan ke ${TARGET}: ${err.message}` }));
  });

  req.pipe(proxyReq);
});

server.listen(PORT, BIND, () => {
  console.log(`[bridge] http://${BIND}:${PORT} -> ${TARGET} (CORS+Private-Network aktif)`);
});

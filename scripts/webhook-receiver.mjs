// Récepteur webhook local pour tester le bot de ping (port 9999).
// Usage : node scripts/webhook-receiver.mjs — journalise chaque requête
// reçue dans scripts/receiver.log et sur stdout.
import http from "node:http";
import { appendFileSync } from "node:fs";

const LOG = new URL("./receiver.log", import.meta.url).pathname;

http
  .createServer((req, res) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      const line = `${new Date().toISOString()} ${req.method} ${req.url} :: ${body}`;
      console.log(`[receiver] ${line}`);
      try {
        appendFileSync(LOG, line + "\n");
      } catch {}
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, received: true }));
    });
  })
  .listen(9999, "127.0.0.1", () =>
    console.log("[receiver] en écoute sur http://127.0.0.1:9999")
  );

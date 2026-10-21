/**
 * Test de planification réelle du bot (sans serveur Next) :
 * boot (+10 s), manuel, intervalle (1 min). Le récepteur local doit
 * recevoir 3 POST /hook-test. Exécuter : bun scripts/verify-bot-schedule.ts
 */
process.env.PING_WEBHOOK_URL = "http://127.0.0.1:9999/hook-test";
process.env.PING_INTERVAL_MINUTES = "1";

const { startPingBot, runPing, getBotStatus } = await import("@/lib/ping-bot");

startPingBot();

// Le ping de démarrage part ~10 s après startPingBot
await new Promise((r) => setTimeout(r, 13_000));

// Ping manuel immédiat
const manual = await runPing("manual");
if (!manual.ok) throw new Error("ping manuel en échec : " + manual.error);

// Le ping planifié par intervalle part ~70 s après le boot
await new Promise((r) => setTimeout(r, 60_000));

const status = getBotStatus();
console.log("STATUT FINAL :", JSON.stringify(status, null, 2));
if (status.totalPings < 3) {
  throw new Error(`pings insuffisants : ${status.totalPings} (attendu ≥ 3)`);
}
if (status.totalErrors !== 0) {
  throw new Error(`erreurs inattendues : ${status.totalErrors}`);
}
console.log("PLANIFICATION OK — boot + manuel + intervalle envoyés sans erreur");
process.exit(0);

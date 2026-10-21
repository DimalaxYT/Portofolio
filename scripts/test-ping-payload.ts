/**
 * Test unitaire du bot de ping : lecture de la config env + payloads
 * Discord / générique. Exécuter avec : bun scripts/test-ping-payload.ts
 */
import {
  buildPingMessage,
  buildPingPayload,
  readConfig,
} from "@/lib/ping-bot";

// — Cas 1 : webhook Discord —
process.env.PING_WEBHOOK_URL =
  "https://discord.com/api/webhooks/123456789/abcdefABCDEF";
process.env.PING_INTERVAL_MINUTES = "7";

const cfg = readConfig();
if (!cfg.discordMode) throw new Error("discordMode devrait être true");
if (cfg.intervalMinutes !== 7) throw new Error("intervalle devrait valoir 7");

const discordPayload = buildPingPayload(cfg, "Ping de test");
if (discordPayload.username !== "Portfolio Bot")
  throw new Error("username Discord manquant");
if (discordPayload.content !== "Ping de test")
  throw new Error("content Discord manquant");
if ("event" in discordPayload || "timestamp" in discordPayload)
  throw new Error("payload Discord pollué par des champs génériques");

// — Cas 2 : webhook générique —
process.env.PING_WEBHOOK_URL = "http://127.0.0.1:9999/hook-test";
delete process.env.PING_INTERVAL_MINUTES;

const cfg2 = readConfig();
if (cfg2.discordMode) throw new Error("discordMode devrait être false");
if (cfg2.intervalMinutes !== 5)
  throw new Error("l'intervalle par défaut devrait être 5");

const genericPayload = buildPingPayload(cfg2, "Ping de test");
if (genericPayload.event !== "ping" || genericPayload.bot !== "portfolio-ping-bot")
  throw new Error("payload générique invalide");
if (typeof genericPayload.timestamp !== "string")
  throw new Error("timestamp manquant");

// — Cas 3 : message par défaut (avec comptage DB, tolérant aux erreurs) —
const message = await buildPingMessage(cfg2);
if (!message.includes("Ping automatique"))
  throw new Error("message par défaut inattendu : " + message);

console.log("TOUS LES TESTS PASSENT");
console.log("Payload Discord :", JSON.stringify(discordPayload));
console.log("Payload générique :", JSON.stringify(genericPayload));
console.log("Message défaut :", JSON.stringify(message));

import { db } from "@/lib/db";

/**
 * Bot de ping automatique.
 *
 * Envoie périodiquement un ping HTTP POST vers un webhook configuré
 * uniquement via des variables d'environnement :
 *
 *   PING_WEBHOOK_URL      — URL du webhook (Discord, Slack, ou tout endpoint
 *                           acceptant un POST JSON). Vide = bot désactivé.
 *   PING_INTERVAL_MINUTES — intervalle entre deux pings en minutes (défaut : 5).
 *   PING_MESSAGE          — message personnalisé (optionnel).
 *   PING_BOT_SECRET       — protège /api/bot/ping pour les crons externes (optionnel).
 *
 * Détection automatique des webhooks Discord : le payload est alors adapté
 * au format attendu { username, content }.
 */

export interface PingResult {
  ok: boolean;
  httpStatus: number | null;
  durationMs: number;
  error: string | null;
}

export type BotLastStatus = "idle" | "ok" | "error";

export interface BotPublicStatus {
  enabled: boolean;
  running: boolean;
  intervalMinutes: number;
  /** Hôte du webhook, sans le chemin ni le token (jamais l'URL complète). */
  targetHost: string | null;
  discordMode: boolean;
  messagePreview: string;
  secretProtected: boolean;
  startedAt: string | null;
  lastRunAt: string | null;
  nextRunAt: string | null;
  lastStatus: BotLastStatus;
  lastHttpStatus: number | null;
  lastError: string | null;
  totalPings: number;
  totalErrors: number;
}

interface BotState {
  startedAt: Date | null;
  lastRunAt: Date | null;
  nextRunAt: Date | null;
  lastStatus: BotLastStatus;
  lastHttpStatus: number | null;
  lastError: string | null;
  totalPings: number;
  totalErrors: number;
  timer: ReturnType<typeof setTimeout> | null;
  bootTimer: ReturnType<typeof setTimeout> | null;
}

interface BotConfig {
  webhookUrl: string | null;
  intervalMinutes: number;
  customMessage: string;
  discordMode: boolean;
  secret: string | null;
}

/** État conservé sur globalThis pour survivre au hot-reload en dev. */
const globalForBot = globalThis as unknown as {
  __portfolioPingBot?: BotState;
};

function state(): BotState {
  if (!globalForBot.__portfolioPingBot) {
    globalForBot.__portfolioPingBot = {
      startedAt: null,
      lastRunAt: null,
      nextRunAt: null,
      lastStatus: "idle",
      lastHttpStatus: null,
      lastError: null,
      totalPings: 0,
      totalErrors: 0,
      timer: null,
      bootTimer: null,
    };
  }
  return globalForBot.__portfolioPingBot;
}

/** Webhooks Discord reconnus pour adapter le format du message. */
const DISCORD_PATTERN = /(?:discord\.com|discordapp\.com)\/api\/webhooks/;

export const DEFAULT_PING_MESSAGE =
  "Ping automatique — le portfolio est en ligne.";

export function readConfig(): BotConfig {
  const webhookUrl = process.env.PING_WEBHOOK_URL?.trim() || null;
  const rawInterval = Number.parseInt(
    process.env.PING_INTERVAL_MINUTES ?? "",
    10
  );
  const intervalMinutes =
    Number.isFinite(rawInterval) && rawInterval >= 1
      ? Math.min(rawInterval, 1440)
      : 5;
  const customMessage = process.env.PING_MESSAGE?.trim() || "";
  return {
    webhookUrl,
    intervalMinutes,
    customMessage,
    discordMode: webhookUrl ? DISCORD_PATTERN.test(webhookUrl) : false,
    secret: process.env.PING_BOT_SECRET?.trim() || null,
  };
}

function formatParis(date: Date): string {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

/** Nombre de réalisations en ligne (info bonus du message, jamais bloquant). */
async function countArtworks(): Promise<number | null> {
  try {
    const timeout = new Promise<null>((resolve) =>
      setTimeout(() => resolve(null), 3000)
    );
    return await Promise.race([db.artwork.count(), timeout]);
  } catch {
    return null;
  }
}

export async function buildPingMessage(config: BotConfig): Promise<string> {
  if (config.customMessage) return config.customMessage;
  const lines: string[] = [DEFAULT_PING_MESSAGE];
  const count = await countArtworks();
  if (count !== null) {
    lines.push(
      count > 1 ? `${count} réalisations en ligne` : `${count} réalisation en ligne`
    );
  }
  lines.push(formatParis(new Date()));
  return lines.join("\n");
}

export function buildPingPayload(
  config: BotConfig,
  message: string
): Record<string, unknown> {
  if (config.discordMode) {
    return { username: "Portfolio Bot", content: message };
  }
  return {
    bot: "portfolio-ping-bot",
    event: "ping",
    message,
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.round(process.uptime()),
    intervalMinutes: config.intervalMinutes,
  };
}

/** Exécute un ping vers le webhook et met à jour l'état interne du bot. */
export async function runPing(
  reason: "boot" | "schedule" | "manual"
): Promise<PingResult> {
  const s = state();
  const config = readConfig();
  const startedAt = Date.now();

  s.lastRunAt = new Date();
  s.totalPings += 1;

  if (!config.webhookUrl) {
    s.lastStatus = "error";
    s.lastHttpStatus = null;
    s.lastError = "PING_WEBHOOK_URL non configuré";
    s.totalErrors += 1;
    return { ok: false, httpStatus: null, durationMs: 0, error: s.lastError };
  }

  try {
    const message = await buildPingMessage(config);
    const payload = buildPingPayload(config, message);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    let res: Response;
    try {
      res = await fetch(config.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    const durationMs = Date.now() - startedAt;
    const ok = res.ok;
    s.lastStatus = ok ? "ok" : "error";
    s.lastHttpStatus = res.status;
    s.lastError = ok ? null : `HTTP ${res.status}`;
    if (!ok) s.totalErrors += 1;
    console.log(
      `[ping-bot] ping ${reason} → ${ok ? "OK" : "ÉCHEC"} (HTTP ${res.status}) en ${durationMs} ms`
    );
    return { ok, httpStatus: res.status, durationMs, error: s.lastError };
  } catch (err) {
    const durationMs = Date.now() - startedAt;
    const error =
      err instanceof Error
        ? err.name === "AbortError"
          ? "Délai dépassé (10 s)"
          : err.message
        : "Erreur inconnue";
    s.lastStatus = "error";
    s.lastHttpStatus = null;
    s.lastError = error;
    s.totalErrors += 1;
    console.error(`[ping-bot] ping ${reason} → erreur : ${error}`);
    return { ok: false, httpStatus: null, durationMs, error };
  }
}

/**
 * Démarre le planificateur (appelé une fois au démarrage du serveur
 * via instrumentation.ts). Sans PING_WEBHOOK_URL, le bot reste inactif.
 */
export function startPingBot(): void {
  const s = state();
  if (s.startedAt) return; // déjà démarré (protège du hot-reload dev)

  const config = readConfig();
  if (!config.webhookUrl) {
    console.log(
      "[ping-bot] désactivé — définissez PING_WEBHOOK_URL dans .env pour activer le ping automatique"
    );
    return;
  }

  const intervalMs = config.intervalMinutes * 60_000;
  s.startedAt = new Date();
  console.log(
    `[ping-bot] actif — ping ${config.discordMode ? "Discord" : "webhook"} toutes les ${config.intervalMinutes} minute(s)`
  );

  // Premier ping peu après le démarrage pour confirmer la configuration.
  s.nextRunAt = new Date(Date.now() + 10_000);
  s.bootTimer = setTimeout(() => {
    void runPing("boot");
  }, 10_000);

  s.timer = setInterval(() => {
    s.nextRunAt = new Date(Date.now() + intervalMs);
    void runPing("schedule");
  }, intervalMs);
}

/** Statut sûr à exposer (jamais l'URL complète du webhook ni son token). */
export function getBotStatus(): BotPublicStatus {
  const s = state();
  const config = readConfig();
  let targetHost: string | null = null;
  if (config.webhookUrl) {
    try {
      targetHost = new URL(config.webhookUrl).host;
    } catch {
      targetHost = "URL invalide";
    }
  }
  return {
    enabled: Boolean(config.webhookUrl),
    running: Boolean(s.startedAt),
    intervalMinutes: config.intervalMinutes,
    targetHost,
    discordMode: config.discordMode,
    messagePreview: config.customMessage || DEFAULT_PING_MESSAGE,
    secretProtected: Boolean(config.secret),
    startedAt: s.startedAt?.toISOString() ?? null,
    lastRunAt: s.lastRunAt?.toISOString() ?? null,
    nextRunAt: s.nextRunAt?.toISOString() ?? null,
    lastStatus: s.lastStatus,
    lastHttpStatus: s.lastHttpStatus,
    lastError: s.lastError,
    totalPings: s.totalPings,
    totalErrors: s.totalErrors,
  };
}

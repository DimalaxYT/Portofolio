import { getDb } from "@/lib/db";
import { countArtworks as countStoredArtworks } from "@/lib/repository";
import { AppError } from "@/lib/errors";

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
 *   PING_BOT_SECRET       — requis pour les crons externes.
 *   PING_INTERNAL_SCHEDULER — true active le planificateur interne (désactivé par défaut).
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
function isDiscordWebhook(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      ["discord.com", "discordapp.com"].includes(url.hostname) &&
      url.pathname.startsWith("/api/webhooks/")
    );
  } catch {
    return false;
  }
}

export const DEFAULT_PING_MESSAGE =
  "Ping automatique — le portfolio est en ligne.";

export function readConfig(): BotConfig {
  const webhookUrl = process.env.PING_WEBHOOK_URL?.trim() || null;
  const rawInterval = Number.parseInt(
    process.env.PING_INTERVAL_MINUTES ?? "",
    10,
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
    discordMode: webhookUrl ? isDiscordWebhook(webhookUrl) : false,
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
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      countStoredArtworks(),
      new Promise<null>((resolve) => {
        timer = setTimeout(() => resolve(null), 3000);
      }),
    ]);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function buildPingMessage(config: BotConfig): Promise<string> {
  if (config.customMessage) return config.customMessage;
  const lines: string[] = [DEFAULT_PING_MESSAGE];
  const count = await countArtworks();
  if (count !== null) {
    lines.push(
      count > 1
        ? `${count} réalisations en ligne`
        : `${count} réalisation en ligne`,
    );
  }
  lines.push(formatParis(new Date()));
  return lines.join("\n");
}

export function buildPingPayload(
  config: BotConfig,
  message: string,
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
  reason: "boot" | "schedule" | "manual",
): Promise<PingResult> {
  const s = state();
  const config = readConfig();
  const startedAt = Date.now();
  if (config.webhookUrl) {
    // Reserve before sending: prevents concurrent cron calls and webhook spam.
    const lease = await getDb().execute({
      sql: `INSERT INTO bot_locks(key,expires_at) VALUES ('ping',?)
        ON CONFLICT(key) DO UPDATE SET expires_at=excluded.expires_at
        WHERE bot_locks.expires_at<=? RETURNING key`,
      args: [
        startedAt +
          (reason === "manual" ? 30_000 : config.intervalMinutes * 60_000),
        startedAt,
      ],
    });
    if (!lease.rows.length)
      throw new AppError(
        429,
        "Un ping est déjà planifié ou vient de partir. Réessayez plus tard.",
      );
  }

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
      const target = new URL(config.webhookUrl);
      if (
        target.protocol !== "https:" &&
        !(process.env.NODE_ENV !== "production" && target.protocol === "http:")
      ) {
        throw new Error("Invalid webhook protocol");
      }
      res = await fetch(target, {
        method: "POST",
        redirect: "error",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      await res.body?.cancel();
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
      `[ping-bot] ping ${reason} → ${ok ? "OK" : "ÉCHEC"} (HTTP ${res.status}) en ${durationMs} ms`,
    );
    return { ok, httpStatus: res.status, durationMs, error: s.lastError };
  } catch (err) {
    const durationMs = Date.now() - startedAt;
    const error =
      err instanceof Error
        ? err.name === "AbortError"
          ? "Délai dépassé (10 s)"
          : "Impossible de joindre le webhook"
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
  // External cron is the default: timers cannot wake a sleeping Render service.
  if (process.env.PING_INTERNAL_SCHEDULER !== "true") return;
  const s = state();
  const config = readConfig();
  if (s.startedAt || !config.webhookUrl) return;
  s.startedAt = new Date();
  const tick = async () => {
    try {
      await runPing("schedule");
    } catch (e) {
      if (!(e instanceof AppError && e.status === 429))
        console.error("[ping-bot] Échec de planification");
    } finally {
      const delay = readConfig().intervalMinutes * 60_000;
      s.nextRunAt = new Date(Date.now() + delay);
      s.timer = setTimeout(() => {
        void tick();
      }, delay);
      s.timer.unref?.();
    }
  };
  s.nextRunAt = new Date(Date.now() + 10_000);
  s.bootTimer = setTimeout(() => {
    void tick();
  }, 10_000);
  s.bootTimer.unref?.();
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

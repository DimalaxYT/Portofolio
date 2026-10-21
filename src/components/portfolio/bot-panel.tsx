"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bot, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import type { BotLastStatus } from "@/lib/ping-bot";

interface BotStatus {
  enabled: boolean;
  running: boolean;
  intervalMinutes: number;
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

interface PingResponse {
  ok: boolean;
  httpStatus: number | null;
  durationMs: number;
  error: string | null;
}

async function fetchBotStatus(): Promise<BotStatus> {
  const res = await fetch("/api/bot/status");
  if (!res.ok) throw new Error("Statut indisponible");
  return res.json();
}

const dateTimeFmt = new Intl.DateTimeFormat("fr-FR", {
  timeZone: "Europe/Paris",
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  return dateTimeFmt.format(new Date(iso));
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 truncate text-right font-medium">{children}</span>
    </div>
  );
}

function StatusDot({ status, enabled }: { status: BotLastStatus; enabled: boolean }) {
  const color = !enabled
    ? "bg-muted-foreground/40"
    : status === "ok"
      ? "bg-emerald-500"
      : status === "error"
        ? "bg-red-500"
        : "bg-amber-500";
  return (
    <span className="relative inline-flex h-2.5 w-2.5 shrink-0">
      {enabled && status !== "error" && (
        <span
          className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${color}`}
        />
      )}
      <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${color}`} />
    </span>
  );
}

export function BotPanel() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: bot } = useQuery({
    queryKey: ["bot-status"],
    queryFn: fetchBotStatus,
    refetchInterval: 30_000,
  });

  const testPing = useMutation({
    mutationFn: async (): Promise<PingResponse> => {
      const res = await fetch("/api/bot/ping", { method: "POST" });
      const data = (await res.json().catch(() => null)) as
        | (PingResponse & { error?: string })
        | null;
      if (!res.ok && !data) {
        throw new Error(`Impossible de contacter le serveur (HTTP ${res.status})`);
      }
      if (data && !data.ok && data.error && !data.httpStatus) {
        // Erreur renvoyée par le serveur (ex. secret requis)
        throw new Error(data.error);
      }
      return data as PingResponse;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["bot-status"] });
      if (data.ok) {
        toast({
          title: "Ping envoyé",
          description: `Le webhook a répondu${data.httpStatus ? ` (HTTP ${data.httpStatus})` : ""} en ${data.durationMs} ms.`,
        });
      } else {
        toast({
          title: "Ping en échec",
          description: data.error ?? "Le webhook n'a pas répondu.",
          variant: "destructive",
        });
      }
    },
    onError: (err) => {
      toast({
        title: "Erreur",
        description: err instanceof Error ? err.message : "Échec du test.",
        variant: "destructive",
      });
    },
  });

  const enabled = bot?.enabled ?? false;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display text-lg">
          <Bot className="h-5 w-5 text-primary" />
          Bot de ping
        </CardTitle>
        <CardDescription>
          Envoie automatiquement un ping au webhook configuré dans les
          variables d&apos;environnement (fichier .env).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <Row label="État">
          <span className="inline-flex items-center gap-2">
            <StatusDot
              enabled={enabled}
              status={bot?.lastStatus ?? "idle"}
            />
            {enabled
              ? bot?.running
                ? `Actif · toutes les ${bot.intervalMinutes} min`
                : "Configuré · démarre au redémarrage"
              : "Désactivé"}
          </span>
        </Row>
        <Row label="Cible">
          {bot?.targetHost
            ? `${bot.targetHost}${bot.discordMode ? " (Discord)" : ""}`
            : "—"}
        </Row>
        <Row label="Dernier ping">
          {bot?.lastRunAt
            ? bot.lastStatus === "ok"
              ? `Succès · ${formatDateTime(bot.lastRunAt)}`
              : `Échec · ${formatDateTime(bot.lastRunAt)}`
            : "Pas encore de ping"}
        </Row>
        {enabled && bot?.running && (
          <Row label="Prochain ping">{formatDateTime(bot.nextRunAt)}</Row>
        )}
        <Row label="Historique">
          {bot
            ? `${bot.totalPings} ping${bot.totalPings > 1 ? "s" : ""} · ${bot.totalErrors} erreur${bot.totalErrors > 1 ? "s" : ""}`
            : "—"}
        </Row>
        {bot?.lastStatus === "error" && bot.lastError && (
          <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
            {bot.lastError}
          </p>
        )}
        {!enabled && (
          <p className="rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground">
            Pour activer le bot, définissez{" "}
            <code className="rounded bg-muted px-1 py-0.5">
              PING_WEBHOOK_URL
            </code>{" "}
            dans le fichier{" "}
            <code className="rounded bg-muted px-1 py-0.5">.env</code> (par
            exemple l&apos;URL d&apos;un webhook Discord), puis redémarrez le
            serveur. L&apos;intervalle se règle avec{" "}
            <code className="rounded bg-muted px-1 py-0.5">
              PING_INTERVAL_MINUTES
            </code>{" "}
            (5 min par défaut).
          </p>
        )}
        {bot?.secretProtected && (
          <p className="text-xs text-muted-foreground">
            Déclenchement externe protégé par{" "}
            <code className="rounded bg-muted px-1 py-0.5">PING_BOT_SECRET</code>.
          </p>
        )}
      </CardContent>
      <CardFooter>
        <Button
          type="button"
          variant="outline"
          disabled={!enabled || testPing.isPending}
          onClick={() => testPing.mutate()}
          className="touch-manipulation"
        >
          <Send className="mr-2 h-4 w-4" />
          Tester maintenant
        </Button>
      </CardFooter>
    </Card>
  );
}

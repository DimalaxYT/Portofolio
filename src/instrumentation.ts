/**
 * Hook de démarrage Next.js (exécuté une fois au lancement du serveur).
 * Démarre le bot de ping automatique côté runtime Node.js.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  try {
    const { startPingBot } = await import("@/lib/ping-bot");
    startPingBot();
  } catch (err) {
    console.error("[ping-bot] échec du démarrage :", err);
  }
}

#!/bin/bash
# Test E2E du bot de ping : serveur de test sur le port 3100 (config par
# variables d'environnement) + récepteur local sur 9999.
# Vérifie : ping de démarrage (+10 s), ping manuel via API, ping planifié
# par intervalle, route de statut. Tout se déroule dans CET appel.
set -uo pipefail
cd /home/z/my-project

echo "== 1. Récepteur local (port 9999) =="
rm -f scripts/receiver.log
pkill -f webhook-receiver 2>/dev/null; sleep 0.5
nohup node scripts/webhook-receiver.mjs > scripts/receiver-stdout.log 2>&1 &
RECEIVER_PID=$!
sleep 1
curl -s -X POST http://127.0.0.1:9999/selftest -d '{"self":1}' --max-time 3 && echo " ← récepteur OK"

echo
echo "== 2. Serveur de test sur le port 3100 (env : URL récepteur + 1 min) =="
pkill -f "next dev -p 3100" 2>/dev/null; sleep 0.5
PING_WEBHOOK_URL="http://127.0.0.1:9999/hook-test" PING_INTERVAL_MINUTES=1 \
  nohup bunx next dev -p 3100 > scripts/test-server.log 2>&1 &
TEST_PID=$!
READY=0
for i in $(seq 1 60); do
  code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3100 --max-time 2 2>/dev/null)
  if [ "$code" = "200" ]; then echo "serveur de test prêt (tentative $i)"; READY=1; break; fi
  sleep 1
done
if [ "$READY" != "1" ]; then echo "ÉCHEC : serveur de test jamais prêt"; tail -20 scripts/test-server.log; kill $RECEIVER_PID 2>/dev/null; exit 1; fi

echo
echo "== 3. Ping de démarrage (attendu ~10 s après le boot) =="
sleep 14
cat scripts/receiver.log

echo
echo "== 4. GET /api/bot/status puis POST /api/bot/ping (manuel) =="
curl -s http://localhost:3100/api/bot/status; echo
curl -s -X POST -w "  (HTTP %{http_code})" http://localhost:3100/api/bot/ping; echo

echo
echo "== 5. Ping planifié par intervalle (attente ~65 s supplémentaires) =="
sleep 65
echo "--- receiver.log complet ---"
cat scripts/receiver.log
NB=$(grep -c "POST /hook-test" scripts/receiver.log || true)
echo ">>> PINGS /hook-test reçus : $NB (attendu ≥ 3 : boot + manuel + intervalle)"

echo
echo "== 6. Arrêt du serveur de test et du récepteur =="
kill $TEST_PID 2>/dev/null
pkill -f "next dev -p 3100" 2>/dev/null
kill $RECEIVER_PID 2>/dev/null
pkill -f webhook-receiver 2>/dev/null
sleep 1
echo "Terminé."

# Portfolio — Next.js + Turso

Portfolio public en français et administration protégée (projets, catégories,
images et textes). **Aucun disque persistant Render n'est nécessaire.**

## Architecture et correction du déploiement

L'ancien build échouait sur `.prisma/client/default` : le client Prisma n'était pas
généré. Cette version retire Prisma et la base SQLite locale de production au
profit de **`@libsql/client` connecté à une base Turso distante compatible libSQL**.
Il n'y a plus de `prisma generate`, `db push` ou synchronisation destructive.

- Projets, catégories relationnelles, réglages, identifiants administrateur et
  compteurs de sécurité : Turso.
- Images importées : BLOB WebP dans la table `media` de la même base.
- Aucun accès à Turso depuis le navigateur ; les identifiants restent côté serveur.
- Le build ne se connecte pas à la base et n'a pas besoin de ses secrets.
- `npm start` applique les migrations versionnées, puis lance le serveur standalone
  sur `0.0.0.0` et le port `PORT` fourni par Render.
- Une configuration `file:` est autorisée **uniquement en développement/test**.
  La production refuse de démarrer avec une base locale pour éviter les pertes.

## Déployer sur Render

### 1. Préparer Turso

Dans ton compte Turso, crée une base compatible libSQL, puis récupère son URL
`libsql://…turso.io` et un token **lecture/écriture** pour cette base.
Configure ces valeurs dans **Render → service → Environment**, jamais dans le
code ou dans une conversation. Aucun compte Turso n'est créé automatiquement.

### 2. Régler le service Web

Un Blueprint est fourni dans [`render.yaml`](render.yaml). Pour un service Render
existant, reporte ces réglages manuellement : le fichier ne reconfigure pas à lui
seul un service déjà créé.

| Réglage       | Valeur                                  |
| ------------- | --------------------------------------- |
| Runtime       | Node                                    |
| Node          | 22.16 ou version 22 plus récente        |
| Build command | `npm ci --include=dev && npm run build` |
| Start command | `npm start`                             |
| Health check  | `/api/health`                           |

Variables :

```dotenv
NODE_ENV=production
TURSO_DATABASE_URL=libsql://ton-instance.turso.io
TURSO_AUTH_TOKEN=ta-valeur-configuree-dans-render
ADMIN_PASSWORD=un-mot-de-passe-unique-de-12-caracteres-minimum
APP_ORIGIN=https://ton-portfolio.onrender.com
TRUST_PROXY=true
PING_INTERNAL_SCHEDULER=false
```

Les valeurs ci-dessus sont des exemples, pas des identifiants utilisables.
`APP_ORIGIN` doit être l'origine publique exacte (protocole + domaine + port
éventuel, sans chemin). Utilise ton domaine personnalisé si c'est celui par
lequel tu administres le site. `TRUST_PROXY=true` suppose que le proxy ajoute
l'adresse réelle en dernier dans `X-Forwarded-For`, comme attendu sur Render.
Sans proxy de confiance, garde `false` : le quota de connexion est alors partagé.

Supprime les anciennes variables `DATABASE_URL` et les anciennes commandes Bun /
Prisma de la configuration Render. Le gestionnaire de référence est maintenant
**npm**, avec `package-lock.json` et `npm ci` pour des installations reproductibles.
Ne place aucun secret dans une variable préfixée `NEXT_PUBLIC_`.

### 3. Redéployer et vérifier

1. Le démarrage doit afficher `Migration appliquée : 001_initial.sql` la première
   fois. Les démarrages suivants conservent les données et ignorent cette migration.
2. `/api/health` doit répondre `200` avec `{"ok":true}` ; cela vérifie aussi la base.
3. Ouvre le portfolio, clique sur le petit logo du pied de page et connecte-toi
   avec `ADMIN_PASSWORD`.
4. Ajoute un projet et une image ; redémarre le service et vérifie leur présence.

Les cinq catégories initiales sont créées par la migration ; aucun faux projet
n'est ajouté automatiquement. Le service Render gratuit peut se mettre en veille :
le premier accès sera alors plus lent. La persistance Turso ne supprime pas cette
limite de l'hébergement.

**Validation effectuée dans ce dépôt :** typage, lint, tests libSQL locaux,
parcours HTTP et build standalone. La connexion à ta base Turso et le déploiement
Render réels restent à vérifier avec ta configuration.

## Développement local

Prérequis : Node >= 22.12.

```sh
npm ci
cp .env.example .env
mkdir -p .local
```

Pour ne pas utiliser la base de production, configure dans `.env` :

```dotenv
TURSO_DATABASE_URL=file:.local/portfolio.db
TURSO_AUTH_TOKEN=
ADMIN_PASSWORD=choisis-un-mot-de-passe-local-unique
APP_ORIGIN=
TRUST_PROXY=false
```

```sh
npm run dev
```

Le script `predev` applique les migrations. La base `.local/` est ignorée par Git.
Pour un essai de production avec `npm start`, utilise une **base Turso de test
séparée**, car `file:` est interdit en production.

## Administration et sécurité

- Aucun mot de passe public par défaut. `ADMIN_PASSWORD` sert uniquement à
  l'initialisation du premier compte ; après cela le hash conservé dans Turso fait
  autorité. Modifier la variable Render ne remplace pas le mot de passe enregistré.
- Hashage `scrypt` asynchrone, sel aléatoire, comparaison en temps constant.
- Cookie `HttpOnly`, `SameSite=Lax`, `Secure` en production, durée maximale 7 jours.
- Changer le mot de passe ou se déconnecter invalide **toutes les sessions**
  (application mono-administrateur).
- Vérification d'origine des mutations, schémas Zod et limites de taille des corps.
- Connexion : 10 essais par adresse / 15 minutes, et plafond global de 100.
  Le quota compte tous les essais, y compris les connexions réussies.
- Les compteurs sont dans Turso et ne sont pas remis à zéro par un redémarrage.
- Le fragment `#admin` n'est pas une protection : toutes les écritures sont
  authentifiées sur le serveur. Le dashboard est chargé à la demande.
- Les réglages publics n'exposent jamais les hashes, les sels ou la clé de session.

### Mot de passe oublié

Depuis un accès administrateur à **la bonne base Turso**, sauvegarde d'abord la
base, puis supprime uniquement les paramètres d'authentification :

```sql
DELETE FROM settings
WHERE key IN ('admin_password_hash', 'admin_password_salt', 'session_secret');
```

Configure ensuite un nouveau `ADMIN_PASSWORD` fort dans Render et redémarre.
La prochaine connexion réinitialisera l'accès. Les projets et images ne sont pas
supprimés. Cette procédure révoque toutes les anciennes sessions.

## Images sans disque persistant

`POST /api/upload` exige une session administrateur. Le serveur vérifie le contenu
réel, pas seulement l'extension ou le MIME fourni par le navigateur :

- JPEG, PNG, WebP et AVIF non animés ; **pas de SVG**.
- Entrée : 8 Mio maximum, 24 mégapixels maximum.
- Rotation EXIF appliquée, métadonnées supprimées, conversion WebP.
- Dimensions maximales 1600 × 1600 ; compression/réduction supplémentaire si besoin.
- Sortie : **256 Kio maximum par image**, pour rester adaptée à un BLOB libSQL.
- Déduplication par SHA-256. Les originaux ne sont pas conservés.
- Lecture publique `/api/files/<sha256>.webp`, ETag et cache immutable un an.
- Les images locales passent par `next/image` pour les tailles responsives ; les
  URL externes restent non optimisées pour ne pas ouvrir un proxy d'images arbitraire.

C'est une solution adaptée aux petits visuels d'un portfolio, **pas un stockage
pour vidéos, fichiers 3D ou originaux haute définition**. Les quotas de stockage,
lectures et écritures de ton offre Turso s'appliquent. Une sauvegarde complète doit
inclure `media` et les réglages privés : protège-la comme un secret.

Remplacer/supprimer un projet ne supprime pas immédiatement son image : elle peut
être partagée ou encore utilisée par un formulaire ouvert. Nettoyage manuel :

```sh
npm run db:media:prune             # aperçu, aucune suppression
npm run db:media:prune -- --apply # supprimer les images sans référence de plus de 24 h
```

Cette commande agit sur la base des variables d'environnement courantes. Vérifie
sa cible et dispose d'une sauvegarde avant `--apply`.

## Migrations et anciennes données

Les fichiers `migrations/NNN_description.sql` sont appliqués dans l'ordre et
mémorisés dans `schema_migrations`. Chaque migration est transactionnelle. Ne
modifie pas un fichier déjà déployé : ajoute un nouveau fichier. Les instructions
sont séparées par `-- statement-breakpoint`.

```sh
npm run db:migrate
```

La migration initiale crée les nouvelles tables sans `DROP` ni suppression de
contenu existant. Les anciens modèles Prisma `Artwork` / `Setting` et le dossier
local `uploads/` **ne sont pas importés automatiquement**. Si tu as déjà des
contenus dans une ancienne base ou un ancien déploiement, exporte-les **avant**
sa destruction et prévois un import explicite. Un fichier déjà perdu sur un disque
éphémère ne peut pas être récupéré par ce changement.

Utilise les outils d'export/sauvegarde et de restauration proposés par ton offre
Turso et vérifie régulièrement la restauration sur une base de test. La
persistance externe ne remplace pas une sauvegarde.

## Bot et cron externe

Le bot est facultatif. Configure `PING_WEBHOOK_URL` et un `PING_BOT_SECRET` fort
côté Render. Un cron externe peut appeler GET ou POST sur `/api/bot/ping` avec :

```http
Authorization: Bearer <PING_BOT_SECRET>
```

`x-bot-secret` est également accepté. **Pas de secret dans l'URL.** Sans secret,
seul un POST d'administrateur connecté est accepté ; un GET avec cookie ne suffit
pas. Le statut `/api/bot/status` est privé.

La base impose un verrou anti-concurrence / anti-spam : au moins 30 secondes entre
appels manuels ou cron. Le cron définit sa propre fréquence ;
`PING_INTERVAL_MINUTES` ne planifie rien à lui seul. La cible doit utiliser HTTPS
en production. Les redirections du webhook ne sont pas suivies et son URL complète
n'est jamais renvoyée au navigateur.

`PING_INTERNAL_SCHEDULER=true` réactive, en option, un minuteur interne au serveur
avec `PING_INTERVAL_MINUTES` (1 à 1440, défaut 5). Il est désactivé par défaut, car
il ne fonctionne pas pendant la veille Render. Évite de combiner ce mode avec un
cron externe. Les statistiques du panneau bot sont celles du processus courant ;
seuls le verrou et les données du portfolio sont persistants.

## Vérifications

```sh
npm run typecheck
npm run lint
npm test
npm run test:http:auto
npm run build
npm audit --omit=dev
```

`test:http:auto` démarre un serveur Next sur un port libre et une base locale
jetable, teste le parcours HTTP, puis les supprime. Arrête d'abord ton serveur
`next dev` habituel : Next n'autorise pas deux serveurs de développement dans le
même répertoire. Aucun compte Turso ni secret réel n'est requis pour ces tests.

Les tests couvrent migrations idempotentes, CRUD, relations de catégories et casse
Unicode, transactions, réordonnancement complet, validation, sessions et rotation,
limitation des tentatives, CSRF, images, cache et permissions du bot. Le parcours
HTTP vérifie aussi l'import multipart et la présence des projets dans le HTML
initial. Ce ne sont pas des tests visuels ou un audit de sécurité exhaustif.

La CI GitHub exécute typage, lint sans avertissement, tests locaux/HTTP et build.
Les dépendances sont verrouillées avec npm ; les polices sont auto-hébergées via
Fontsource, sans requête Google Fonts pendant le build.

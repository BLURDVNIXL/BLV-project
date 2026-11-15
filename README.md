# 🇨🇮 BLV — Babi Life Vibes (V3)

Simulation de vie urbaine 3D temps réel à Abidjan (Côte d’Ivoire), construite sur un moteur physique **C++/WASM à 120 Hz**, une ville procédurale découpée en chunks de 64 m, et un backend autoritatif **Express + WebSocket + SQLite**.

## Architecture Technique

- **Physique & Ville (`physics/`, `src/physics/`, `src/world/`)** :
  - Moteur C++ compilé en WebAssembly (`public/physics.wasm`) gérant véhicules (suspension, dérapage, collisions), personnages, raycasts caméra et trafic routier autonome.
  - Géographie schématique d’Abidjan couvrant la Lagune Ébrié, l’Océan Atlantique, la Baie du Banco, la Baie de Cocody, l’Île Boulay, 5 ponts (FHB, De Gaulle, HKB, ADO, Yopougon) et 14 zones/communes dont Grand-Bassam.
  - Génération déterministe par chunks 64×64 m (`WorldStreamer`) avec parcelles résidentielles (`playerHouse.ts`), intérieurs hors carte (`src/world/interiors.ts`), architecture différenciée par commune et monuments emblématiques (Stade FHB, Cathédrale Saint-Paul, Hôtel Ivoire, La Pyramide, Tour Postel, Mairie, Maquis Le Temple, Lycée Classique, Lycée Sainte-Marie, Lycée d’Excellence de Bassam).
- **Rendu & Ambiance (`src/3d/`)** :
  - Ambiance tropicale continue (`ambiance.ts`) : palette chaude interpolée selon l’heure de jeu (aube rosée → matinée dorée → plein jour → heure dorée → coucher → crépuscule → nuit) et soleil qui voyage d’est en ouest, la lune prenant le relais la nuit.
  - Intérieurs 3D (`src/3d/interiors.ts`, `WallFader`) : registre de constructeurs de mobilier et thèmes par lieu ; les murs côté caméra s’effacent sans solide `BUILDING` (utilisé par les 4 hôpitaux, le Maquis Le Temple, la Grande Halle du Marché d’Adjamé avec foule PNJ animée, la Mairie du Plateau et les 3 lycées : Classique, Sainte-Marie et Bassam).
  - Dôme de ciel (`sky.ts`) : dégradé zénith → horizon, brume chaude collée à l’horizon (même couleur que le brouillard, donc sans couture) et halo/disque solaire.
  - Lagune : reflet de Fresnel vers l’horizon et scintillement du soleil sur les vaguelettes ; arbres balancés par le vent (vertex shader, aucun coût CPU).
  - Qualité : tous ces effets sont désactivés sur rendu logiciel (le fond uni est alors utilisé). `?quality=high` force le chemin complet pour les tests ; `?blvdebug` expose `window.__blvScene`.
- **Interface (`src/components/` et `src/components/ui/`)** : style convivial et chaleureux, clair et peu dense. Jetons de couleur et boutons « gélatine » dans `src/index.css` ; kit réutilisable (`Jelly`, `Gauge`, `Modal`, `icons`) ; variantes d’écran `short` et `touch-short` pour les téléphones en paysage. Les boutons n’ont jamais de texte incrusté dans une image (le jeu doit pouvoir passer en anglais). **HUD compact** : radar, pastilles destin/mission et besoins en haut à gauche ; heure/météo, Étoile et menu ⚙ en haut à droite ; joystick et 5 boutons (BabiOS, Utiliser, Saut, Interagir, Sprint/Frein) en bas, sans barre.
  **GPS de BabiOS** (`src/core/gpsDestinations.ts`) : « Chez moi », lieux (hôpitaux, maquis, marché, stade…), repères de la ville (stade, cathédrale, port, aéroport…) et communes, avec recherche sans accents ni majuscules ; le taxi (**500 FCFA dans ta commune, 1 000 FCFA entre communes**, `fastTravelFare` dans `simulation.ts`) dépose devant l’entrée du lieu, au perron de la maison ou sur la route la plus proche d’un repère. Depuis l’étape B1 (`feat/taxi-appel`), le taxi est **appelé** : compte à rebours de 10 à 20 s (« Taxi vers … dans 12 s ») avec bouton **Annuler**, le prix n’est débité qu’à la montée ; depuis l’étape B2 (`feat/taxi-arrive`), un **woro-woro jaune** apparaît à environ 120 m sur le grand axe le plus proche, roule jusqu’à toi et s’arrête au bord de la route avant la fin de l’attente (visible seulement chez toi, il disparaît quand tu montes ou annules) ; depuis l’étape B3 (`feat/taxi-cinematique`), tu montes dans le taxi : **fondu au noir, cinématique accélérée de 15 à 30 s** (selon la distance du trajet) où la caméra suit le woro-woro sur l’itinéraire des grands axes et des ponts, nouveau fondu au noir, puis tu es déposé devant le lieu. Pendant la cinématique tu ne peux ni bouger ni interagir. Depuis l’étape B4 (`feat/taxi-temps`), le trajet **fait passer le temps de jeu** (environ 3 min de jeu par km, de 5 à 90 min) : l’heure avance et la faim et l’énergie baissent un peu. Il n’y aura pas de bouton « Passer » ; le multijoueur du taxi (les autres joueurs te voient monter puis réapparaître) est repoussé à plus tard.
- **Gameplay & Identité BLV (`src/core/`)** :
  - Chronologie stricte : Écran Titre (`title`) → Création du personnage (pseudo, genre, PLAY ; le genre choisit l’avatar 3D : Homme → garçon, Femme → fille, visible aussi par les autres joueurs) puis carrousel 3D du destin imposé (`roulette`, pondération 35% / 25% / 25% / 15% + 7 Easter Eggs, aucun choix) → Monde 3D d’Abidjan (`playing`), plus raccourci `?autostart=1` pour les tests.
  - Missions principales dédiées en 3 étapes pour chacun des 19 destins (`src/core/missions.ts`).
  - Temps accéléré (**1 heure réelle = 4 heures en jeu**), jauge d’Étoile / Chance, jauge d’Envie Universelle, besoins vitaux, Sape, Babi Cribs, BabiOS 26 et manette PlayStation tactile en format paysage.
  - Module WebAssembly `public/blv_core.wasm` pour les formules de chance, dépression et noyade moteur. Note : WebAssembly protège la logique contre une lecture naïve, mais reste inspectable côté client ; l’intégrité économique critique est donc vérifiée côté serveur.
- **Serveur Autoritatif & Multijoueur (`server.ts`, `src/network/`)** :
  - Sessions signées HMAC et persistées dans SQLite (`blv_world.sqlite`), avec réconciliation économique (`/api/economy/action`).
  - WebSocket `/ws` avec filtrage spatial (340 m), limitation de débit, filtre anti-insultes, mute local et signalement en base (`chat_reports`).
  - Tontine multijoueur réelle entre joueurs connectés uniquement (minimum 2 joueurs réels, 0 faux PNJ).
  - Visites de maisons entre joueurs (bouton « Visiter » dans Babi Chat) (`open` / `friends` / `closed`).
  - Espace Admin protégé par secret serveur (`ADMIN_SANDBOX_SECRET` ou code éphémère généré par CSPRNG au démarrage en dev), limitation par IP (5 essais / 10 min) et journal d’audit SQLite (`admin_audit_log`).

## Documentation de reprise

Trois fichiers à lire en premier et à mettre à jour à **chaque** livraison : `README.md` (ce fichier), `CONTEXT.md` (règles inviolables, décisions, feuille de route) et `Continue.md` (comment reprendre le projet dans une nouvelle discussion).

## Hébergement & Limites Connues

- Le serveur full-stack Node/Express/WebSocket/SQLite fonctionne en autonomie complète (mode solo hors-ligne également supporté via IndexedDB + Service Worker PWA).
- Un déploiement sur Cloudflare Pages/Workers (configuration d’assets dans `wrangler.json`) est soumis aux quotas du plan gratuit choisi et nécessiterait Durable Objects / D1 pour la persistance distribuée en production.

## Scripts & Tests

```bash
npm install
npm run dev          # Lance Express + Vite + WS sur le port 3000
npm run test:physics # Tests C++/WASM physiques et d'intégration
npm run test:world   # Tests de la géographie lagunaire et du streaming
npm run test:city    # Tests de non-chevauchement routier/lagunaire de la ville
npm run build:wasm   # Recompile physics/physics.cpp vers public/physics.wasm (clang + lld requis)
npm run test:e2e     # Test navigateur Chromium de bout en bout (Playwright, python3)
npm test             # Tests des 19 destins, 19 missions, économie et RGPD
npm run lint         # Vérification TypeScript (tsc --noEmit)
npm run build        # Build production Vite
```

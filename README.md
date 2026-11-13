# 🇨🇮 BLV — Babi Life Vibes (V3)

Simulation de vie urbaine 3D temps réel à Abidjan (Côte d’Ivoire), construite sur un moteur physique **C++/WASM à 120 Hz**, une ville procédurale découpée en chunks de 64 m, et un backend autoritatif **Express + WebSocket + SQLite**.

## Architecture Technique

- **Physique & Ville (`physics/`, `src/physics/`, `src/world/`)** :
  - Moteur C++ compilé en WebAssembly (`public/physics.wasm`) gérant véhicules (suspension, dérapage, collisions), personnages, raycasts caméra et trafic routier autonome.
  - Géographie schématique d’Abidjan couvrant la Lagune Ébrié, l’Océan Atlantique, la Baie du Banco, la Baie de Cocody, l’Île Boulay, 5 ponts (FHB, De Gaulle, HKB, ADO, Yopougon) et 14 zones/communes dont Grand-Bassam.
  - Génération déterministe par chunks 64×64 m (`WorldStreamer`) avec parcelles résidentielles (`playerHouse.ts`), architecture différenciée par commune et monuments emblématiques (Stade FHB, Cathédrale Saint-Paul, Hôtel Ivoire, La Pyramide, Tour Postel, Mairie, Lycée d’Excellence de Bassam).
- **Gameplay & Identité BLV (`src/core/`)** :
  - Chronologie stricte : Écran Titre (`title`) → Roulette des 19 Destins (`roulette`, pondération 35% / 25% / 25% / 15% + 7 Easter Eggs) → Monde 3D d’Abidjan (`playing`), plus raccourci `?autostart=1` pour les tests.
  - Missions principales dédiées en 3 étapes pour chacun des 19 destins (`src/core/missions.ts`).
  - Temps accéléré (**1 heure réelle = 4 heures en jeu**), jauge d’Étoile / Chance, jauge d’Envie Universelle, besoins vitaux, Sape, Babi Cribs, 3 concours d’écoles d’élite, BabiOS 26 et manette PlayStation tactile en format paysage.
  - Module WebAssembly `public/blv_core.wasm` pour les formules de chance, dépression et noyade moteur. Note : WebAssembly protège la logique contre une lecture naïve, mais reste inspectable côté client ; l’intégrité économique critique est donc vérifiée côté serveur.
- **Serveur Autoritatif & Multijoueur (`server.ts`, `src/network/`)** :
  - Sessions signées HMAC et persistées dans SQLite (`blv_world.sqlite`), avec réconciliation économique (`/api/economy/action`).
  - WebSocket `/ws` avec filtrage spatial (340 m), limitation de débit, filtre anti-insultes, mute local et signalement en base (`chat_reports`).
  - Tontine multijoueur réelle entre joueurs connectés uniquement (minimum 2 joueurs réels, 0 faux PNJ).
  - Consentement bilatéral persistant et annulable (`consent_requests`), plus visites de maisons entre joueurs (`open` / `friends` / `closed`).
  - Espace Admin protégé par secret serveur (`ADMIN_SANDBOX_SECRET` ou code éphémère généré par CSPRNG au démarrage en dev), limitation par IP (5 essais / 10 min) et journal d’audit SQLite (`admin_audit_log`).

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
npm test             # Tests des 19 destins, 19 missions, économie et RGPD
npm run lint         # Vérification TypeScript (tsc --noEmit)
npm run build        # Build production Vite
```

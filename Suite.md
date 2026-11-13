# SUITE — Comment reprendre BLV dans une nouvelle discussion

> Rédigé à la fin de la session du 11–12 novembre 2026 (contexte saturé). Dernier commit : `137ec5c` sur `main`.
> **Le jeton GitHub ne figure nulle part dans ce dépôt.** Révoque l'ancien (il a été collé en clair dans une conversation) et fournis-en un nouveau, limité à ce dépôt, au début de la prochaine discussion.

## 1. Verdict honnête : le cahier des charges n'est PAS entièrement respecté

La question posée était : « ton travail respecte-t-il l'intégralité du README ? ». **Non.** Ce qui est fait, ce qui ne l'est pas :

### ✅ Fait et testé dans cette session
| Sujet | État |
|---|---|
| Restauration de BLV (destins, Chance, Jauge d'Envie, smartphone, admin…) à la place de la version « GTA Abidjan : Babi Stories » de Gemini | ✅ (l'ancienne version est conservée sur la branche `gemini-gta-abidjan-backup`) |
| Moteur physique **C++ → WebAssembly** (`physics/physics.cpp`) : voitures (dérapage, frein à main, transfert de masse), piéton, collisions, rayons, retrait de solides | ✅ ≈ 25 tests du cœur + 10 d'intégration |
| Commandes du CONTEXT §4 : Shift/□ sprint, Espace/tap □ saut, Espace/◯ frein à main, E/F/✕ action | ✅ (« Frapper » non implémenté : pas de combat) |
| Géographie réelle d'Abidjan à l'échelle 1:4 (lagune, 2 baies, île Boulay, **5 ponts**, 13 communes, repères) | ✅ schématique (±300 m), ≈ 40 invariants |
| Ville générée par chunks (Web Worker), rues, bâtiments, arbres, repères, parcelles de maisons, forêt du Banco | ✅ ≈ 30 invariants (rien dans l'eau, sur une rue, sur un pont ; aucun chevauchement ; déterminisme) |
| Maison du joueur posée sur sa parcelle, voiture garée dans la rue, trafic sur les grands axes, radar vectoriel, bandeau de quartier réel | ✅ + test navigateur de bout en bout (11 contrôles) |
| Corrections de fond : `npm install` cassé (esbuild/vite), scène reconstruite toutes les ~0,9 s, ponts en marche de 1,2 m, caméra, `bun.lock` | ✅ |
| Conception multijoueur 100 % gratuite (CONTEXT §13) | ✅ **documentée seulement, pas codée** |

### ❌ Pas fait (écarts avec le README / les demandes du créateur)
1. **Multijoueur** : aucun serveur, aucune présence des autres joueurs, **aucune visite de maisons d'autres joueurs**, aucun chat. (Exigence centrale du créateur.)
2. **Frontend calqué sur GTA** : étoiles de recherche, menu d'armes, carte de pause réelle (`AbidjanMapModal` reste une carte illustrée narrative), sous-titres de mission.
3. **Missions principales** : aucune.
4. **Assets originaux** : modèles 3D de personnages/véhicules/props, textures, PNG d'actifs. Les modèles actuels sont les primitives de la version d'origine. Arbitrage non tranché (voir §5).
5. **Tableau de comparaison avec « Terre d'Ivoire »** (promis avant de coder la partie concernée) : non présenté.
6. **Rust** : le README dit « Rust / C++ » ; C++ retenu (pas de cible `wasm32` Rust dans l'environnement de l'agent).
7. **Géographie** : rives schématiques, sol plat (le Plateau réel est en altitude), ponts plats sans pylônes ni haubans, eau non animée.
8. **Performances** : mesurées uniquement en rendu logiciel (aucun GPU). **À tester sur un vrai téléphone** (rayon de ville 4 chunks, 3 sur mobile).
9. **Sections héritées du README (§4 temps accéléré, §5 Chance, §6 destins, §7 Jauge, §8 romance, §9 améliorations, §10 radios, §11 badges des lycées, §12 admin, §13 fin tragique)** : ces fonctions viennent de la version d'origine ; elles n'ont **pas été retestées une à une** après mes modifications (seul le démarrage, la marche, la conduite et le bandeau de quartier l'ont été).
10. Les 3 lycées sont des repères fictifs posés à Cocody/Marcory (positions provisoires).

## 2. Reprendre le travail (procédure)

```bash
git clone https://github.com/BLURDVNIXL/BLV-project.git && cd BLV-project
npm install
npm run lint          # tsc strict
npm run test          # physique + géographie + ville (≈ 100 contrôles)
npm run build         # build de production (inclut public/physics.wasm)
npm run dev           # port 3000
```
* Recompiler le moteur physique : `sudo apt install clang lld` puis `npm run build:wasm` (le `.wasm` est versionné : Cloudflare n'a pas besoin de clang).
* Test navigateur : `pip install playwright && playwright install chromium`, puis `npm run build && npx vite preview --port 4173` et, dans un autre terminal, `npm run test:e2e`. Le jeu expose son état avec `?blvdebug` dans l'URL (`window.__blv`).
* **Rendu logiciel (sans GPU) très lent** : le chargement des chunks prend des dizaines de secondes ; utiliser des attentes basées sur l'état, pas sur des durées.

## 3. Règles à respecter (CONTEXT.md)
* **Règle 1** : poser des questions avant de coder tant que le plan n'est pas validé ; ne pas agir « bêtement » (la carte et le multijoueur ont été conçus en amont).
* **Règle 2** : cœur compilé WASM ; **aucune donnée personnelle** (RGPD) ; pas de `dangerouslySetInnerHTML`.
* **Règle 3** : mettre à jour `README.md` et `CONTEXT.md` à chaque itération.
* **Projet 100 % gratuit** : aucun service payant (décision du créateur).
* Le créateur veut les réponses **en conversation** ; ne pas livrer de fichiers sans son accord.

## 4. Carte du code
| Dossier | Contenu |
|---|---|
| `physics/` | `physics.cpp` (cœur C++), `build.sh`, tests (`test.mjs`, `integration.test.ts`, `world.test.ts`, `city.test.ts`) |
| `public/physics.wasm` | binaire (≈ 22 Ko) — **à recompiler après toute modification de `physics.cpp`** |
| `src/physics/` | `PhysicsCore.ts` (passerelle typée), `controls.ts` (commandes maintenues), `abidjanWorld.ts` + `trafficAI.ts` (historiques, utilisés seulement par les tests d'intégration) |
| `src/world/` | `geo.ts`, `abidjanGeography.ts`, `roads.ts`, `city.ts`, `terrain.ts`, `rng.ts`, `chunkMesh.ts`, `chunkProvider.ts`, `worldWorker.ts`, `WorldStreamer.ts`, `playerHouse.ts`, `roadTraffic.ts` |
| `src/components/ThreeCanvas.tsx` | scène 3D + boucle de jeu (≈ 1 250 lignes : le gros morceau à découper un jour) |
| `e2e/` | test Chromium de bout en bout |

**Conventions piégeuses** : x = est, z = sud (nord = −z) ; cap voiture `h` : avant = (sin h, cos h) ; angle physique d'une boîte = **−`rotation.y`** Three.js ; braquage + = droite ; `HouseLot.rotationY` oriente la façade (+z local) vers la rue ; l'effet principal de `ThreeCanvas` se reconstruit seulement quand l'éclairage change (nuit/coucher/jour) ou quand `physics`/`homeLot` changent.

## 5. Décisions du créateur et points ouverts
* **Décidé** : base = BLV d'origine ; projet gratuit ; 24 joueurs par monde ; chat **texte** avec filtre local, signalement, mise en sourdine ; échelle 1:4 ; géographie inspirée des lieux réels d'internet (sans OSM) ; moteur physique WASM ; améliorer « Terre d'Ivoire » (tableau à présenter).
* **Ouvert — assets/code Rockstar** : le créateur veut réutiliser des assets GTA et juge qu'une copie n'est pas « la version de Rockstar ». **Position de l'agent (non validée) : ne pas intégrer d'assets ni de code GTA/portages/fuites** (œuvres protégées) ; reproduire le *ressenti* avec des assets originaux ; s'inspirer de SanAndreasUnity (MIT) pour les algorithmes seulement. À retrancher avant l'étape « assets ». Le dépôt `gtasamobile-source-code` n'a pas été exploité.
* **Ouvert — OSM** : si le créateur exporte un extrait OpenStreetMap d'Abidjan (GeoJSON), remplacer les rives schématiques (`abidjanGeography.ts`).

## 6. Prochaines étapes recommandées (dans l'ordre)
1. **Multijoueur gratuit** (CONTEXT §13) :
   * `server/` : Worker Cloudflare + Durable Object (SQLite) avec **WebSocket Hibernation**, sans `setInterval`, relais pur ; limite ≈ 2 M messages/jour (plan gratuit) → gouverneur de budget, seau de jetons par connexion, déconnexion au dépassement, jeton de connexion signé.
   * Client : module réseau (`src/net/`) avec extrapolation (envoi au changement de direction, ≈ 0,7 msg/s/joueur), interpolation ≈ 150 ms, intérêt spatial ≈ 300 m, dégradation douce vers le mode solo.
   * Catalogue de maisons (type, agencement, couleurs, accès ouvert/amis/fermé), « frapper à la porte », visite hors-ligne en lecture seule, parcelles attribuées par le serveur (`reservedLots` identique à celui du Worker de chunks).
   * Critères d'acceptation : 2 navigateurs voient leurs avatars ; l'un visite la maison de l'autre ; le quota simulé est respecté ; rien de personnel n'est stocké.
2. **Frontend GTA** (HUD, étoiles, carte pause réelle, menu d'armes) puis **missions principales** liées aux destins et à la Chance.
3. **Assets originaux** (après arbitrage §5) : personnages, véhicules d'Abidjan, props, textures.
4. **Tableau de comparaison avec Terre d'Ivoire** (à présenter avant de coder cette partie).
5. **Audit des sections héritées du README (§4–§13)** : les retester une par une dans le navigateur.
6. Relief, vrais ponts, eau animée, PNJ piétons, intérieurs explorables, découpage de `ThreeCanvas.tsx`.

## 7. Texte à coller au début de la nouvelle discussion
> Je reprends le projet BLV (https://github.com/BLURDVNIXL/BLV-project, branche `main`). Lis d'abord `Suite.md`, `CONTEXT.md` et `README.md` du dépôt et respecte-les absolument (Règles 1, 2, 3 ; projet 100 % gratuit). Voici un NOUVEAU jeton GitHub limité à ce dépôt : `<à fournir>`. Ne code pas avant d'avoir résumé ce que tu as compris et posé tes questions. On commence par l'étape 1 de `Suite.md` §6 (multijoueur gratuit).

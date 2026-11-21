# 🇨🇮 BLV

**BLV** est un jeu de simulation de vie urbaine en 3D inspiré d'Abidjan, en Côte d'Ivoire. Le joueur découvre la ville, incarne un personnage dont le destin est déterminé par le hasard et évolue dans un environnement urbain interactif.

Le projet associe une simulation 3D avec Three.js, un moteur physique C++ compilé en WebAssembly et une architecture applicative React/TypeScript.

---

## 1. Technologies

| Domaine | Technologies |
|---|---|
| Interface | React 19, TypeScript |
| Rendu 3D | Three.js |
| Styles | Tailwind CSS 4, CSS |
| Bundler | Vite |
| Physique | C++ / WebAssembly |
| Backend | Node.js, Express |
| Persistance serveur | SQLite |
| Application mobile | PWA, Service Worker |

---

## 2. Architecture technique

### Monde 3D et géographie

Le monde de BLV représente une version schématique et jouable d'Abidjan.

- Géographie inspirée de la lagune Ébrié, de ses baies, de l'île Boulay et des principaux ponts.
- Représentation de 13 communes et de leurs caractéristiques urbaines.
- Réseau de grands axes routiers et de rues locales.
- Génération procédurale et déterministe de la ville.
- Découpage du monde en chunks de 64 × 64 mètres.
- Chargement et déchargement progressifs des zones autour du joueur.
- Maisons et parcelles adaptées aux différents destins.

La géographie reprend la topologie générale d'Abidjan, mais les contours des rives et certaines positions restent approximatifs. Il ne s'agit pas d'une reproduction cartographique exacte.

Modules principaux :
- `src/world/geo.ts`
- `src/world/abidjanGeography.ts`
- `src/world/city.ts`
- `src/world/roads.ts`
- `src/world/WorldStreamer.ts`
- `src/world/chunkProvider.ts`
- `src/world/routePreload.ts`
- `src/world/playerHouses.ts`

Chargement du monde (côté client, sur l'appareil de chaque joueur) :
- La construction des chunks tourne dans un pool de Web Workers (deux sur les appareils à plus de 2 cœurs, un sinon).
- Au démarrage, à un chargement de sauvegarde et à l'arrivée d'un taxi, l'écran reste noir (simple fondu, pas d'écran de chargement) jusqu'à ce que les chunks autour du joueur soient construits.
- Pendant un trajet en taxi, la route jusqu'à la destination est préchargée (`routePreload.ts`) ; la cinématique ne dépasse jamais ce qui est chargé.

### Moteur physique

Le moteur physique est développé en C++ et compilé en WebAssembly.

Il prend notamment en charge :
- La simulation des déplacements du personnage.
- La conduite et la dynamique des véhicules.
- Les collisions avec les éléments solides du monde.
- Les collisions entre véhicules et environnement.
- Les raycasts utilisés notamment pour la caméra.
- La gestion des commandes maintenues.

Le moteur utilise un pas de simulation fixe de 120 Hz.

Fichiers principaux :
- `physics/physics.cpp`
- `physics/build.sh`
- `public/physics.wasm`
- `src/physics/PhysicsCore.ts`
- `src/physics/controls.ts`

Le binaire WebAssembly est versionné dans le dépôt. Toute modification du moteur C++ doit être suivie de sa recompilation.

### Rendu et environnement

Le rendu 3D repose sur Three.js.

Les systèmes environnementaux comprennent :
- Une ambiance lumineuse évolutive selon l'heure de jeu.
- Un cycle jour/nuit avec soleil et lune.
- Un ciel avec dégradé et brume atmosphérique.
- Une eau avec reflets et effets lumineux.
- Des arbres animés par le vent.
- Des bâtiments, routes, végétations et monuments adaptés aux différentes communes.

Modules principaux :
- `src/3d/sceneManager.ts`
- `src/3d/ambiance.ts`
- `src/3d/sky.ts`
- `src/3d/models.ts`
- `src/3d/avatars.ts`
- `src/3d/interiors.ts`

### Personnages et avatars

Le joueur dispose d'un avatar 3D distinct selon le genre choisi lors de la création du personnage.

Les avatars utilisent des modèles GLB, un squelette animé et un contrôleur d'animation.

Les animations comprennent notamment :
- Idle
- Walk
- Run
- Jump

Le système prévoit également la personnalisation des tenues à partir des données de la simulation.

### Intérieurs et habitations

BLV comprend des maisons individualisées selon les différents destins.

Les habitations disposent de façades fermées, de portes interactives et de collisions adaptées. Certains logements possèdent plusieurs étages.

Des intérieurs dédiés existent également pour certains bâtiments publics, notamment les hôpitaux.

Modules principaux :
- `src/world/playerHouses.ts`
- `src/world/houseShared.ts`
- `src/world/houseGroupA.ts`
- `src/world/houseGroupB.ts`
- `src/world/houseGroupC.ts`
- `src/world/interiors.ts`
- `src/3d/houseModels.ts`
- `src/3d/wallFader.ts`

### Interface utilisateur

L'interface utilise un thème clair, convivial et peu dense.

Elle comprend :
- Un système de composants réutilisables.
- Des boutons et panneaux personnalisés.
- Un HUD compact.
- Des jauges circulaires.
- Des commandes tactiles adaptées aux écrans mobiles.
- Une interface responsive tenant compte du format paysage.

Le HUD regroupe notamment le radar, les informations du destin, les besoins du personnage, l'heure, la météo et les indicateurs de jeu.

Le kit d'interface se trouve dans :
- `src/components/`
- `src/components/ui/`
- `src/index.css`

---

## 3. Gameplay

### Création du personnage et destin

Le parcours de nouvelle partie comprend :

1. L'écran titre.
2. La création du personnage (pseudonyme et genre).
3. Le carrousel animé des destins.
4. L'entrée dans le monde d'Abidjan.

Le destin est déterminé automatiquement par un tirage pondéré. Le joueur ne choisit pas librement sa condition de départ.

Le système comprend 19 destins, répartis entre plusieurs niveaux de rareté.

### Simulation de vie

Le cœur de la simulation repose sur plusieurs systèmes interdépendants :

- Gestion des besoins du personnage.
- Étoile et Chance.
- Gestion financière.
- Travail et activités.
- Logement et améliorations.
- Vêtements et tenues.
- Temps et météo.
- Interactions avec les lieux de la ville.

Le temps de jeu est accéléré : une heure réelle correspond à quatre heures dans le jeu.

### MyOS et déplacements

MyOS constitue le téléphone intégré au jeu.

Il permet notamment d'accéder aux applications, au GPS et aux services disponibles dans la simulation.

Le GPS propose :
- Le domicile du joueur.
- Les lieux interactifs.
- Les principaux repères urbains.
- Les différentes communes.
- Une recherche par nom ou par localisation.

Le déplacement rapide se fait en taxi (woro-woro) :
- Le joueur appelle un taxi (attente de 10 à 20 secondes, annulation libre).
- Le taxi arrive sur le grand axe le plus proche et s'arrête avant la montée.
- Le paiement a lieu à la montée : 500 FCFA dans la même commune, 1 000 FCFA entre communes.
- Une cinématique accélérée emmène le joueur devant le lieu choisi ; la route est chargée pendant l'attente du taxi et le taxi ne roule jamais plus vite que le monde construit.
- Le trajet fait passer le temps de jeu (3 minutes par kilomètre, de 5 à 90 minutes) et baisse légèrement la faim et l'énergie.

Si aucun trajet n'est possible, le joueur est téléporté à destination.

Une carte plein écran permet de visualiser la ville et de consulter les lieux. Un système d'itinéraire calcule également un parcours sur les grands axes et les ponts.

---

### Sauvegardes

- 5 emplacements de sauvegarde, stockés uniquement sur l'appareil du joueur (module `src/core/saveSlots.ts`).
- Chaque emplacement est écrit à deux endroits indépendants (`localStorage` clé `blv_slot_N` et IndexedDB clé `slot_N`) ; au chargement, la version la plus récente est retenue.
- Sauvegarde automatique toutes les 6 secondes en jeu, à la fermeture ou au masquage de la page (`pagehide`, `visibilitychange`) et au retour à l'écran titre.
- Bouton « Sauvegarder » dans le téléphone MyOS (sauvegarde immédiate avec confirmation).
- La position et l'orientation du joueur sont sauvegardées : « Continuer » replace le joueur où il s'était arrêté (dans un intérieur : devant la porte).
- L'écran « Continuer » liste les emplacements par nom (renommable) et permet de les supprimer.
- L'ancienne sauvegarde unique (`blv_save_v3` / IndexedDB `current_player_state`) est reprise dans l'emplacement 1.
- Le serveur reçoit toujours une copie de l'état pour valider l'économie, mais n'est plus la source des sauvegardes.

## 4. Backend

Le backend est géré par `server.ts`.

Il repose sur :
- Express pour les routes HTTP.
- SQLite pour la persistance des données.
- Des sessions signées.
- Des opérations économiques validées côté serveur.

Routes disponibles :
- `GET /api/health` : état du serveur.
- `/api/session/*` : création, sauvegarde, lecture et suppression de la session.
- `POST /api/economy/action` : actions économiques validées côté serveur.

Le client et le serveur se partagent les responsabilités : les opérations sensibles ne doivent pas reposer uniquement sur les valeurs envoyées par le navigateur.

BLV est actuellement un jeu solo. L'ancien multijoueur (WebSocket, joueurs distants, chat, tontine, visites de maisons) a été retiré ; il sera repensé dans une future version.

---

## 5. Organisation du projet

| Chemin | Responsabilité |
|---|---|
| `src/core/` | Simulation, règles de gameplay, profils et données du jeu |
| `src/components/` | Interface React et écrans |
| `src/components/ui/` | Composants graphiques réutilisables |
| `src/3d/` | Scène Three.js, rendu, avatars et environnements |
| `src/world/` | Géographie, ville, routes, chunks et habitations |
| `src/physics/` | Interface TypeScript du moteur physique |
| `src/network/` | Appels REST du client vers le serveur (session, économie) |
| `physics/` | Source C++ et tests du moteur physique |
| `public/` | Ressources publiques, WebAssembly et assets PWA |
| `e2e/` | Tests de bout en bout |
| `server.ts` | Serveur Express (sessions, économie) |

---

## 6. Installation et lancement

### Prérequis

- Node.js compatible avec les fonctionnalités utilisées par le serveur.
- npm.
- Python 3 pour les tests de bout en bout.
- Chromium et Playwright pour les tests navigateur.

Pour recompiler le moteur physique, Clang et LLD sont également nécessaires.

### Installation

```bash
npm install
```

### Lancement en développement

```bash
npm run dev
```

Le serveur de développement démarre sur le port 3000.

### Lancement en production

```bash
npm run build
npm run start
```

---

## 7. Scripts disponibles

| Commande | Fonction |
|---|---|
| `npm run dev` | Lance le serveur de développement |
| `npm run start` | Démarre le serveur |
| `npm run build` | Génère le build de production |
| `npm run preview` | Prévisualise le build Vite |
| `npm run lint` | Vérifie le typage TypeScript |
| `npm test` | Exécute les tests automatisés du projet |
| `npm run test:physics` | Tests du moteur physique et de son intégration |
| `npm run test:world` | Tests de la géographie et du monde |
| `npm run test:city` | Tests de cohérence de la ville |
| `npm run test:e2e` | Test navigateur de bout en bout |
| `npm run build:wasm` | Recompile le moteur physique en WebAssembly |
| `npm run clean` | Nettoie les fichiers de build ciblés |

Les tests exécutés par `npm test` sont définis directement dans `package.json`. Ils couvrent notamment la simulation, les ambiances, les avatars, les habitations, les intérieurs, les PNJ, les collisions, les itinéraires et les destinations GPS.

---

## 8. État du projet

BLV est en développement actif.

Le projet possède déjà une base technique comprenant :
- Un monde 3D généré procéduralement.
- Un moteur physique C++/WASM.
- Des systèmes de simulation et de gestion du personnage.
- Des avatars animés.
- Des habitations et certains intérieurs explorables.
- Une interface adaptée aux écrans mobiles et aux ordinateurs.
- Un backend Node.js avec SQLite.

Certaines fonctionnalités et certains parcours restent en cours de développement, d'intégration ou de validation.

La documentation principale doit être maintenue dans `README.md` et refléter les fonctionnalités effectivement présentes dans le code.

---

## 9. Documentation du projet

- `README.md` : présentation générale, architecture, installation et commandes disponibles.
- `PRIVACY.md` : informations relatives à la confidentialité et aux données traitées.

Ces documents doivent rester cohérents avec le code réellement présent dans le dépôt.
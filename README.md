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
| Communication temps réel | WebSocket |
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
- `src/world/playerHouses.ts`

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

### BabiOS et déplacements

BabiOS constitue le téléphone intégré au jeu.

Il permet notamment d'accéder aux applications et aux services disponibles dans la simulation.

Le GPS propose :
- Le domicile du joueur.
- Les lieux interactifs.
- Les principaux repères urbains.
- Les différentes communes.
- Une recherche par nom ou par localisation.

Le déplacement rapide est actuellement effectué par téléportation, avec un tarif de 500 FCFA dans la même commune et de 1 000 FCFA entre communes.

Une carte plein écran permet de visualiser la ville et de consulter les lieux. Un système d'itinéraire calcule également un parcours sur les grands axes et les ponts.

---

## 4. Backend et réseau

Le backend est géré par `server.ts`.

Il repose sur :
- Express pour les routes HTTP.
- WebSocket pour les communications temps réel.
- SQLite pour la persistance des données.
- Des sessions signées.
- Des opérations économiques validées côté serveur.

Les systèmes serveur comprennent notamment :
- La gestion des sessions des joueurs.
- La synchronisation des joueurs connectés.
- Les communications réseau.
- Le chat et les signalements.
- La gestion de la tontine.
- Les visites et interactions réseau prévues par l'architecture.
- La validation des opérations économiques.

Le client et le serveur se partagent les responsabilités : les opérations sensibles ne doivent pas reposer uniquement sur les valeurs envoyées par le navigateur.

Le fonctionnement de chaque fonctionnalité multijoueur doit être évalué séparément : la présence d'un système réseau ne signifie pas que tous les parcours multijoueurs sont finalisés.

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
| `src/network/` | Communication réseau côté client |
| `physics/` | Source C++ et tests du moteur physique |
| `public/` | Ressources publiques, WebAssembly et assets PWA |
| `e2e/` | Tests de bout en bout |
| `server.ts` | Serveur Express et WebSocket |

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
- Un backend Node.js avec WebSocket et SQLite.

Certaines fonctionnalités et certains parcours restent en cours de développement, d'intégration ou de validation.

Les descriptions détaillées de leur état d'avancement doivent être maintenues dans `CONTEXT.md` et `Continue.md`.

---

## 9. Documentation du projet

Trois documents assurent le suivi du projet :

- `README.md` : présentation générale, architecture et installation.
- `CONTEXT.md` : décisions techniques, règles de développement et contexte détaillé.
- `Continue.md` : état de reprise et informations nécessaires pour poursuivre le travail.

Ces documents doivent rester cohérents avec le code réellement présent dans le dépôt.
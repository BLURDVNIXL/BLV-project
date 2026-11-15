# BLV — Histoire V1 (étape 1 : moteur, bible commune, 3 pilotes)

Livraison du 13–14/11/2026. Basée sur le GDD V1 (BLV_Audit_GDD_V1.docx) et sur les décisions de l'auteur.

## Contenu

| Dossier | Rôle |
|---|---|
| `story/common/` | Bible commune : `systeme.yaml` (écoles, diplômes, métiers, badges, règles d'argent), `factions.yaml`, `personnages.yaml` (fiches maîtres), `projet.yaml` (Cité Lagune-Nord), `chronologie.yaml`, `lieux.yaml` |
| `story/destins/` | **Les 3 pilotes V1 complets** : `poignon`, `baron_ombre`, `styliste_marcory` (dialogues, tirages avec effets par issue, événements différés, 5 fins à épilogue causal) |
| `story/legacy_v0/` | Les 16 autres destins en version V0 (squelettes, textes sans accents), renommages appliqués. **À migrer** à l'étape 2 |
| `story/parcours/` | Parcours de référence par fin (générés par la simulation, rejoués par les tests) |
| `engine/` | Moteur Python : parseur de conditions **sans `eval()`**, état complet, effets typés, tirages de l'Étoile, relations, factions, fins, exécuteur de campagne (temps, paie, trimestres, événements différés, sauvegarde) |
| `tools/` | `validate.py`, `simulate.py`, `graph.py`, `report.py`, `build.py` |
| `tests/` | 50 tests unitaires et d'intégration (`python3 -m unittest discover -s tests`) |
| `docs/` | Décisions, glossaire, charte de représentation, guide d'écriture, plan d'action V1, rapport de couverture |

## Lancer

```bash
pip install pyyaml
python3 tools/validate.py                 # schéma, références, conditions, effets, règles auteur
python3 tools/simulate.py [destin ...]    # tous les chemins sur l'état complet (quelques minutes par destin)
python3 -m unittest discover -s tests     # tests
python3 tools/build.py                    # tout, dans l'ordre ; s'arrête à la première erreur
```

## Ce que cette étape corrige par rapport à la V0 (audit T01–T10)

* **T01 état incomplet** : l'état suit argent, santé, énergie, dettes, métier, échelon, école, diplômes, badges, compétences, relations (confiance, dette, peur, faits), factions (réputation, dette, exposition, alliance), preuves, flags, temps, événements planifiés.
* **T02/T03 tirages** : formule `etoile-v1` documentée (`engine/random_events.py`), total exactement 1000 ‰, jamais 0 ni 100 %, reproductible par seed ; **chaque issue a ses propres effets et sa destination**.
* **T04 conditions** : revalidées avant affichage et avant exécution ; un choix impossible (fonds, bac, porte illégale) n'est pas proposé.
* **T05 `eval()`** : supprimé. Parseur à grammaire fermée ; tout nom inconnu lève une erreur.
* **T06–T08 validation stricte** : fins uniques par type, départs bornés, clés d'effet et de nœud inconnues refusées, catalogues vérifiés.
* **T09 accessibilité réelle** : la simulation explore l'état complet (≈ 150 000 états distincts pour le Poignon) et vérifie impasses, fins et choix jamais disponibles.
* **T10** : les schémas Mermaid et les rapports sont régénérés à chaque build, jamais sources de vérité.

## Règles de l'auteur appliquées

* Un seul lycée choisi parmi 3 (Caïman, Alysma, Alex), concours d'entrée, 3 trimestres, **bac** (moyenne ≥ 10) et **badge** (mention Très Bien + aucun trimestre manqué + épreuve spéciale réussie) séparés. Alysma réservé aux filles.
* Plus de CEPE, BEPC ni cours du soir. Bac obligatoire pour le supérieur et les emplois formels (le moteur et le validateur le refusent).
* Petits boulots (revenu plafonné sans bac), indépendants (sans bac), formels (bac), illégaux (derrière une porte).
* 4 sources d'argent : missions, quêtes PNJ, travail (paie mensuelle), entrepreneuriat.
* Renommages : **INPolytec** (ex INP-HB) et **Reel Madird** (ex Real Madrid) ; le validateur refuse toute occurrence de l'ancien nom.
* Suicide absent de l'histoire ; les fins tragiques viennent d'une chaîne causale (violence ou chute) et sont avertissantes.

## Limites connues (étape 1)

* Les 16 autres destins sont encore en V0 (`story/legacy_v0/`) : ils ne passent pas le validateur V1. Le brief pour les migrer est prêt (`docs/brief_destin.md`) ; le validateur exige désormais une porte vers le crime au jalon 0 ou 1 pour les destins « propres » et une fiche pour chaque personnage du cercle.
* Les dialogues sont écrits pour les 3 pilotes ; nouchi dosé, pas de passage anglais (le Golden Boy est à l'étape 2).
* Équilibrage non testé par des joueurs : les seuils de compromission et les revenus sont des estimations.
* Le moteur est en Python (outil d'auteur et de test). Le branchement dans le jeu (TypeScript / WASM) n'est pas fait : le format YAML est la source ; l'identifiant du destin Élève est `eleve_inpolytec` ici alors que le code du jeu utilise encore `eleve_inphb`.

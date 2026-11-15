# Passation BLV : histoire V1 (pour un autre agent)

## RÈGLES D'ÉCONOMIE (priorité absolue : l'auteur a déjà épuisé sa limite d'usage plusieurs fois)
- Un seul destin à la fois. Aucun agent parallèle. Demander à l'auteur quel destin traiter.
- Ne pas relire tout le projet : `docs/guide_ecriture.md` + `story/destins/chauffeur_woro.yaml` ou `djassaman.yaml` pour un destin camp illégal (modèles récents, 13 nœuds) + le V0 du destin en cours.
- `tools/validate.py` est rapide. `tools/simulate.py` dure ~6 à 10 min (chauffeur_woro : 292 144 états, djassaman : 163 207) : lancer en arrière-plan avec `timeout`, une seule fois par destin, après validation. Garder peu de montants d'argent différents.
- Narration minimale entre les outils. Si l'auteur dit « stop », s'arrêter.
- **Ne rien pousser sur le dépôt BLURDVNIXL/BLV-project** (l'auteur y travaille). Cette branche est locale à ce projet.

## Règles de l'auteur
Un lycée au choix (Caïman, Alysma filles seulement, Alex) : concours, 3 trimestres, bac ≥ 10 ; badge = mention Très Bien + aucun trimestre manqué + épreuve spéciale. Pas de CEPE/BEPC/cours du soir. Bac obligatoire pour le supérieur et les emplois formels ; petits boulots plafonnés sans bac, indépendants ouverts. 4 sources d'argent : missions, quêtes PNJ, travail, entrepreneuriat. INP-HB → INPolytec ; Real Madrid → Reel Madird. Suicide absent. Destin « propre » : une porte vers l'illégal au jalon 1 (`porte: true`). Démarrent dans l'illégal : Baron, Djassaman, Brouteur, Rescapé. Français, nouchi dosé (1 à 3 expressions par scène).

## Les 19 destins
| Destin | État |
|---|---|
| poignon, baron_ombre, styliste_marcory | V1 terminés (validés, simulés) |
| chauffeur_woro | **V1 terminé** (validé ; simulation : 0 impasse, 5 fins ; fiches Mariam/Lassina/Kader dans `story/fiches/`) |
| djassaman | **V1 terminé** (validé ; simulation : 163 207 états, 0 impasse, 5 fins ; fiche d'Ange). Équilibrage : fin lumière très rare (~0,1 %), à revoir |
| brouteur, rescape_bas_fonds | V0 à migrer (camp illégal ; Rescapé : réduction des risques, charte) |
| debrouillard_abobo | V0 à migrer ; brouillon de fiches dans `story/fiches_brouillons/` |
| cadre_plateau, classe_moyenne_angre, commercant_adjame, eleve_inpolytec, etudiant_ufhb, gerant_maquis, golden_boy, late_cocody, mecanicien_treichville, politicien_decheu, yannis_diomande | V0 à migrer |

« Migrer » = réécrire le squelette V0 (`story/legacy_v0/destins/`) au format V1 (`story/destins/`) : dialogues, intention/coût des choix, tirages, événements différés, 5 fins causales ; puis validation et simulation ; puis fiches des personnages sans fiche maître.

## Procédure
1. Lire guide + V0. 2. Écrire `story/destins/<id>.yaml` (préfixe d'ids 2 à 3 lettres). 3. `python3 -I tools/validate.py` (lignes `[<id>]`). 4. `python3 -I tools/simulate.py <id>` (une fois). 5. Fiches dans `story/fiches/<id>.yaml`.

## Pièges du validateur
- Les relations ne visent que des ids du `cercle` du destin (ajouter dabo, sekou, etc.).
- Un métier `illegal` ne s'attribue que dans un nœud `porte: true`.
- `echelon` est vérifié statiquement contre le métier de départ.
- Diplôme : `examen: <id>` sur le choix. Faction touchée : `vu_par`. Chaque relation du cercle doit être modifiée au moins une fois. Tout flag/fait/preuve/actif doit être déclaré en tête.
- Les fins tragiques sont `imposee: true`, fondées sur une chaîne causale, avec avertissement dans le libellé du choix décisif.

## Questions ouvertes (à poser à l'auteur)
1. La styliste est-elle une femme ? 2. Garder l'anglais forcé du Golden Boy ? 3. Renommer `eleve_inphb` en `eleve_inpolytec` dans le code du jeu ? (le V0 du zip s'appelle déjà `eleve_inpolytec`).

## Plus tard
Branchement du moteur dans le jeu en TypeScript (YAML → JSON compilé pour `src/core/`). Playtests et équilibrage.

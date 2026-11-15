# Plan d'action V1 (d'après l'audit GDD V1)

| Phase | Travaux | État |
|---|---|---|
| P0 Conception | Décisions consignées (`decisions.md`), glossaire, charte | ✅ fait (4 questions ouvertes) |
| P1 Moteur | Parseur sans `eval`, état complet, effets typés, tirages, sauvegarde, journal, tests | ✅ fait |
| P2 Vertical slice | Poignon, Baron, Styliste : dialogues, fiches, simulation complète | ✅ fait |
| P3 19 arbres | Migrer les 16 autres destins en V1 : brief prêt (`docs/brief_destin.md`), validateur et simulateur prêts ; 2 brouillons de fiches dans `story/fiches_brouillons/` | ⏳ étape 2 non commencée (interrompue par la limite d'usage) |
| P4 Bible et dialogues | Fiches maîtres des personnages, factions, chronologie ✅ ; fiches propres aux 16 destins et épilogues à compléter | 🟡 partiel |
| P5 Équilibrage | Playtests, revenus, seuils de compromission | ⏳ |
| P6 Gel V1 | Release candidate, branchement dans le jeu (TypeScript/WASM) | ⏳ |

## Backlog (GDD §10)
BLV-001 ✅ décision de travail · BLV-002 ✅ sentinelles, santé, logement (descriptif) · BLV-003 ✅ parseur · BLV-004 ✅ état complet ·
BLV-005 ✅ tirages et effets par issue · BLV-006 ✅ validation stricte · BLV-007 ✅ fiches des 4 factions ·
BLV-008 ✅ fiches maîtres (18 personnages) · BLV-009 🟡 crue et descente différenciées pour les 3 pilotes ·
BLV-010 ✅ états relationnels · BLV-011 ✅ fins conditionnelles, priorités, fin imposée · BLV-012 ✅ vertical slice ·
BLV-013 ✅ chronologie maître et lieux · BLV-014 ⏳ 16 autres destins · BLV-015 🟡 dialogues des 3 pilotes ·
BLV-016 ✅ rapport de couverture · BLV-017 ⏳ playtests.

## Étape 2 proposée
1. Migrer les 16 destins restants (voir `docs/guide_ecriture.md`), en différenciant crue et descente par protagoniste.
2. Passage anglais du Golden Boy et traitement du Rescapé (réduction des risques) selon la charte.
3. Fiches personnages propres à chaque destin (cercle de départ).
4. Branchement dans le jeu : décider du format (YAML → JSON compilé consommé par `src/core/`).

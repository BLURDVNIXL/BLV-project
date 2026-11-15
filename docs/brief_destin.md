# Brief : migrer un destin V0 en V1

Tu écris des destins de l'histoire du jeu BLV (Abidjan), en français accentué, au format V1 validé par outil.
Projet : /home/claude/blv-v1. Ne touche qu'aux fichiers de tes destins (`story/destins/<id>.yaml`, `story/fiches/<id>.yaml`).
Ne touche ni à engine/, tools/, tests/, story/common/, ni à aucun dépôt git (aucun push, aucun commit).

## À lire (peu, pour économiser le contexte)
1. docs/guide_ecriture.md (format complet)
2. story/destins/poignon.yaml (modèle) ; consulte baron_ombre.yaml seulement pour un destin `camp: ombre`
3. story/common/systeme.yaml (écoles, métiers, règles) et le début de story/common/personnages.yaml (noms et rôles des fiches maîtres) ; docs/charte_representation.md
4. Le squelette V0 de chaque destin : story/legacy_v0/destins/<id>.yaml (garde titre, esprit, fins et personnages ; RÉÉCRIS tout en V1 ; les champs `cur`, `logement`, `police` n'existent plus)

## Livrables par destin
* `story/destins/<id>.yaml` : 11 à 14 nœuds, jalons 0 à 5, carrefours A (jour 110), B (jour 281), C (jour 283) différenciés pour ce protagoniste (si un autre héros pouvait jouer la scène sans rien changer, elle est ratée). Dialogues accentués, nouchi dosé (1 à 3 expressions par scène). Chaque choix a `intention` et `cout`. Au moins 4 tirages dont chaque issue a ses effets/destinations propres. Au moins 4 événements différés où des secondaires agissent sans le héros. 5 fins (lumiere, ombre, entre_deux, tragique, secrete) à épilogue causal ; la tragique est `imposee: true`, fondée sur une chaîne causale (jamais un seuil de compromission), précédée d'un avertissement dans le libellé du choix décisif.
* `story/fiches/<id>.yaml` : fiche (nom, age, role, objectif, methode, limites, savoir, secret, offre, evolution) pour chaque personnage du `cercle` sans fiche maître dans personnages.yaml (inutile si tous en ont une).

## Règles auteur
Un seul lycée au choix (lycee_classique, ste_marie filles seulement, lycee_excellence_bassam) : concours, 3 trimestres, bac (moyenne >= 10), badge difficile (mention Très Bien + aucun trimestre manqué + épreuve spéciale) ; facultatif selon le destin. Pas de CEPE, BEPC ni cours du soir. Bac obligatoire pour le supérieur et les emplois formels. Petits boulots plafonnés sans bac, indépendants ouverts. Sources d'argent : missions, quêtes PNJ, travail (paie mensuelle automatique), entrepreneuriat.
Un destin `camp: propre` a au moins un nœud `porte: true` au jalon 1 (métier illégal ou arrangement compromis) avec sortie, résistance ou coût ; le crime n'est jamais acquis. Les destins `camp: ombre` démarrent dans l'illégal : leur arc est la sortie, la résistance ou l'enracinement, avec victime nommable et coût visibles.
Noms INP-HB et Real Madrid INTERDITS (INPolytec, Reel Madird). Suicide absent. Charte de représentation à respecter.

## Technique
Préfixe tes ids de nœuds, de fins et d'événements (2 ou 3 lettres propres au destin). Tout flag, fait, preuve, objet, actif utilisé doit être déclaré en tête. Effets numériques modérés (peu de montants d'argent différents) pour garder la simulation rapide.

## Boucle (par destin)
1. `cd /home/claude/blv-v1 && python3 -I tools/validate.py` : ne regarde que les lignes préfixées [<id>] ; corrige jusqu'à zéro erreur.
2. `python3 -I tools/simulate.py <id>` (plusieurs minutes ; au-delà de ~400 000 états, réduis la variété des montants). Il doit afficher [OK] : zéro impasse, 5 fins atteignables, aucun choix jamais disponible. Corrige ce qu'il trouve. Un destin n'est fini qu'après ça.

## Rapport final (court, français)
Par destin : nœuds/choix/fins, états simulés, résultat, limites du moteur rencontrées, décisions à confirmer par l'auteur. Pas de contenu de fichier.

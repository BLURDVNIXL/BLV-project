# Guide d'écriture d'un destin V1

Modèle de référence : `story/destins/poignon.yaml`. Un destin = un fichier YAML validé par `tools/validate.py`.

## Squelette
```yaml
destin: id_du_destin          # = nom du fichier
titre: "..."
rarete: commun|rare|epique|legendaire   # métadonnée sans effet
genre: m|f|libre
resume: "..."
themes: [...]
fonction_dramatique: "Ce que ce protagoniste est seul à voir de la Cité Lagune-Nord."
depart: {camp, compromission, argent_fcfa, etoile, sante, energie, metier, echelon, ecole, diplomes,
         charges_mensuelles, logement_descriptif, competences, relations, factions, actifs, preuves}
cercle: [{id, nom, rel}]     # personnages dont on suit la relation
flags: [...]  faits: [...]  preuves: [...]  objets: [...]  actifs: [...]   # TOUT doit être déclaré
evenements: [{id, jour|planifié, si, txt, eff, sinon_txt, sinon_eff}]       # retombées et actions autonomes
noeuds: [...]
fins: [...]
```

## Nœud
`id, jalon (0-5), jour (1-304), lieu, moment, objectif, present[], savoir, dialogue[], choix[]`
Optionnels : `porte: true` (nœud-porte vers l'illégal), `carrefour: A|B|C` (jours 110, 281, 283),
`si` + `sinon` (accès conditionnel : si faux, bascule sur le nœud `sinon`), `denouement: true` (un seul, jalon 5).
Le jour doit rester dans la fenêtre du jalon (voir `systeme.yaml: calendrier`) et ne jamais reculer.
Dialogue : `{narr: "..."}` ou `{qui: id, dit: "...", si: "condition"}` (réplique variable selon la mémoire).
`savoir` = ce que le protagoniste sait ; la vérité objective reste dans `projet.yaml`.

## Choix
`id, l, intention, cout` obligatoires (le joueur doit voir ce qu'il gagne et sacrifie).
`si` (condition), `eff` (effet immédiat), puis **soit** `vers`, **soit** `tirage` :
```yaml
tirage:
  difficulte: 0-10                      # -5 Étoile par point
  modificateurs: [{si: "...", valeur: ±n}]
  issues: {miracle: {vers, eff, txt}, normal: {...}, mauvaise: {...}}   # ≥ 2 issues, effets/destinations différents
```
`vu_par: [factions]` : obligatoire dès qu'un effet touche une faction (une faction ne réagit qu'à ce qu'elle observe).
`examen: id_diplome` : obligatoire pour attribuer un diplôme (hors bac, qui passe par `scolarite.bac`).

## Effets (clés autorisées, toute autre est refusée)
`argent, dette{nom,montant}, rembourser, sante, energie, compromission, etoile, etoile_mod{valeur,jours},
relations{id:{trust,dette,peur,fait}}, factions{id:{reputation,dette,exposition,alliance}}, flags, flags_off,
metier, echelon, ecole, scolarite{admis|absence|epreuve|bac{mod}}, diplome, competences, inventaire{add,remove},
actifs, preuves{id:{action: obtenir|transmettre|contester|perdre, a}}, planifier[{event,delai}]`

## Conditions
Opérateurs : `== != < <= > >= and or not in`, parenthèses, listes. Noms : `argent sante energie compromission etoile jour
jalon metier echelon ecole genre camp etat_sante`, `flags.x`, `diplomes.x`, `badges.x`, `skills.x`, `inventaire.x`,
`actifs.x`, `preuves.x` (aucune|detenue|transmise|contestee|perdue), `dettes.total`, `relations.p.trust|dette|peur`,
`relations.p.faits.f`, `factions.f.reputation|dette|exposition|alliance`, `scolarite.trimestres_valides|…`.

## Fins
5 types, exactement une de chaque : `lumiere ombre entre_deux tragique secrete`. Champs : `id type priorite si titre resume epilogue[]`.
* L'épilogue est une liste de paragraphes dont chacun peut avoir un `si` : il raconte les causes.
* La tragique est **causale** (pas un seuil de compromission) et peut être `imposee: true` ; elle doit être précédée d'un avertissement.
* La secrète a des indices préparatoires dans les scènes et ne récompense pas le grind.
* L'entre-deux peut avoir `si: "true"` mais doit rester un dénouement complet.

## Qualité (checklist de relecture)
1. Si le héros peut être remplacé sans changer l'enjeu, la scène est trop générique.
2. Chaque choix important change au moins un axe autre que la compromission.
3. Les secondaires peuvent refuser, partir, mentir, agir sans le héros (événements différés).
4. Un personnage ne révèle pas ce qu'il n'a pas appris (borne : `savoir` de sa fiche).
5. Un tirage sans effet significatif est supprimé.
6. Nouchi dosé : 1 à 3 expressions par scène, jamais en caricature.

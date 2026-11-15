# Décisions (GDD §12)

## Décisions de l'auteur (13/11/2026)
| Sujet | Décision |
|---|---|
| Renommages | INP-HB → **INPolytec** ; Real Madrid → **Reel Madird** |
| Écoles | 3 lycées au choix (Caïman, Alysma, Alex) ; plus de CEPE, BEPC, cours du soir |
| Badge | Mention Très Bien + aucun trimestre manqué + épreuve spéciale ; le bac seul suffit pour la suite |
| Alysma | Réservé aux filles |
| Bac | Obligatoire pour le supérieur et les emplois formels |
| Argent | Missions de l'histoire, quêtes PNJ, travail, entrepreneuriat |
| Petits boulots | Sans bac, revenus plafonnés ; indépendants ouverts ; formels avec bac |
| Poignon | Jeune adulte (pas de CEPE) ; peut tenter le concours du Lycée Classique |
| Périmètre | Tout le GDD, en étapes ; chaque étape livrée en ZIP |

## Choix de travail (recommandations du GDD retenues, à confirmer)
| Sujet | Choix de travail |
|---|---|
| BLV-001 Mode de jeu | Campagnes indépendantes, état non partagé ; architecture compatible avec une méta-progression |
| Lumière/Ombre | « Compromission » -10..+10 ; les faits vivent dans les flags, relations et preuves |
| Étoile | Base stable par destin + modificateurs temporaires datés ; probabilités `etoile-v1` |
| Fins | Le joueur choisit parmi les fins vraies ; une fin **imposée** (tragique) l'emporte si sa chaîne causale est réunie |
| Santé | Score physique 0–100 + états dérivés ; santé mentale/addiction jamais réduites à un score |
| Rareté | Métadonnée descriptive, sans effet de jeu |
| `police: 3` du Baron | Remplacé par `factions.ordre.exposition = 3` (échelle 0–5) |
| Poignon âge/CEPE | Jeune adulte ; CEPE supprimé |
| Durée | Une campagne = 304 jours de jeu (1ᵉʳ septembre → 4 juillet), ≈ 10 à 17 scènes selon le destin |
| Tonalité | Voir `docs/charte_representation.md` |
| Genre | Champ `genre` par destin : m, f ou libre (le joueur choisit) ; Poignon et Baron : m ; Styliste : f |

## Questions encore ouvertes pour l'auteur
1. Le Styliste est-il une femme ? (choix actuel : oui ; Alysma lui serait alors accessible.) Sinon : `genre: libre`.
2. Les relations entre destins (même crue vue par plusieurs protagonistes) : sont-elles visibles d'un joueur à l'autre ? (aujourd'hui non, campagnes indépendantes).
3. Le Golden Boy : le passage anglais forcé est-il toujours souhaité en V1 ?
4. Faut-il renommer `eleve_inphb` en `eleve_inpolytec` dans le code du jeu ?

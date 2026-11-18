# pensetete — idées à garder en tête

Notes du créateur, pas encore implémentées. Ne pas les coder sans demande explicite.

## Couleur des vêtements modifiable (avatars 3D)
- Dans le fichier original, le joueur pouvait changer la couleur de ses vêtements. À remettre plus tard.
- Base technique : les matériaux `haut` et `bas` sont déjà séparés et nommés dans `avatar_homme.glb` et `avatar_femme.glb` ; `AvatarController.applyOutfit` (`src/3d/avatars.ts`) les colore déjà pour les tenues de sape.
- À décider : couleur unie (comme les tenues) ou multipliée sur la texture (garde les détails, plus sombre) ; où choisir la couleur (écran de création, BabiOS, garde-robe : retrouver où c'était dans le fichier original).
- Multijoueur : à revoir avec la future version (l'ancien envoi dans `player:join` a été retiré avec le multijoueur) ; valider côté serveur.

## Autres idées liées aux avatars
- Motif wax sur l'avatar (aujourd'hui : couleur unie).
- Avatars 3D pour les PNJ (aujourd'hui : personnages procéduraux).

# Politique de Confidentialité & Conformité RGPD — BLV

## Données traitées

1. **Sauvegarde locale (navigateur)** :
   - `localStorage` et IndexedDB : 5 emplacements de sauvegarde (clés `blv_slot_1` à `blv_slot_5`, état de partie et position du joueur).
   - `IndexedDB` : base `blv_db` (sauvegarde asynchrone).
   - Cache PWA : caches préfixés `blv` / `workbox` pour le fonctionnement hors-ligne.
2. **Données serveur (SQLite `blv_world.sqlite`)** :
   - Identifiant anonyme généré côté serveur (`blv_<uuid>`), jeton de session HMAC, état de simulation.
   - Aucune donnée personnelle nominative (nom réel, e-mail, téléphone, géolocalisation GPS réelle) n’est collectée.

## Mesures de sécurité (RGPD Art. 25 / Bonnes pratiques OWASP)

- Authentification par jetons HMAC signés à la session.
- Aucun secret administrateur codé en dur dans le code client (`src/`).
- Limitation du taux de requêtes sur `/api/admin/verify` et journalisation d’audit côté serveur.

## Droit à l’effacement (RGPD Art. 17)

Le bouton **Purge Intégrale (RGPD Art. 17)** dans les Réglages déclenche `purgeAllDataRGPD()` :
- Supprime uniquement les clés `localStorage` et `sessionStorage` préfixées par `blv_` (sans affecter d’autres applications sur la même origine).
- Supprime la base `IndexedDB` `blv_db` et les caches PWA BLV.
- Envoie une requête authentifiée `DELETE /api/session/:playerId` pour effacer la session côté serveur.

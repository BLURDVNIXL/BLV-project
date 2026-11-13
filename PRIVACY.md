# Politique de Confidentialité & Conformité RGPD — BLV (Babi Life Vibes)

## Données traitées

1. **Sauvegarde locale (navigateur)** :
   - `localStorage` : clé `blv_babi_life_vibes_save_v3` (état de partie solo/session).
   - `IndexedDB` : base `blv_babi_life_vibes_db` (sauvegarde asynchrone).
   - Cache PWA : caches préfixés `blv` / `workbox` pour le fonctionnement hors-ligne.
2. **Données serveur (SQLite `blv_world.sqlite`)** :
   - Identifiant anonyme généré côté serveur (`blv_<uuid>`), jeton de session HMAC, état de simulation, participation éventuelle à la Tontine, demandes de consentement et signalements de chat.
   - Aucune donnée personnelle nominative (nom réel, e-mail, téléphone, géolocalisation GPS réelle) n’est collectée.

## Mesures de sécurité (RGPD Art. 25 / Bonnes pratiques OWASP)

- Authentification par jetons HMAC signés à la session.
- Aucun secret administrateur codé en dur dans le code client (`src/`).
- Limitation du taux de requêtes sur `/api/admin/verify` et journalisation d’audit côté serveur.
- Modération du chat multijoueur (filtre lexical, limitation de fréquence, boutons Masquer et Signaler).

## Droit à l’effacement (RGPD Art. 17)

Le bouton **Purge Intégrale (RGPD Art. 17)** dans les Réglages déclenche `purgeAllDataRGPD()` :
- Supprime uniquement les clés `localStorage` et `sessionStorage` préfixées par `blv_` (sans affecter d’autres applications sur la même origine).
- Supprime la base `IndexedDB` `blv_babi_life_vibes_db` et les caches PWA BLV.
- Envoie une requête authentifiée `DELETE /api/session/:playerId` pour effacer la session, les entrées de Tontine et les demandes de consentement liées côté serveur.

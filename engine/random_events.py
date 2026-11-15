"""Tirages de l'Étoile : probabilités documentées, reproductibles, jamais automatiques.

Étoile effective e = clamp(Étoile + modificateurs − 5×difficulté, 0, 100)
Poids (en ‰) :   miracle = 20 + 280·e/100      mauvaise = 20 + 380·(100−e)/100
                 normal  = 1000 − miracle − mauvaise
Aux extrêmes (e=0 ou e=100) aucune issue n'est ni certaine ni impossible.
Si une scène ne déclare qu'une partie des issues, les poids sont renormalisés
sur les issues déclarées ; le total vaut toujours exactement 1000 ‰ (= 100 %).
FORMULE_VERSION est enregistrée dans le journal : toute modification la change."""
import random

FORMULE_VERSION = "etoile-v1"


def poids(e):
    miracle = 20 + (280 * e) // 100
    mauvaise = 20 + (380 * (100 - e)) // 100
    return {"miracle": miracle, "mauvaise": mauvaise, "normal": 1000 - miracle - mauvaise}


def probabilites(etoile_effective, difficulte, issues):
    """-> dict issue -> ‰ (entiers, somme = 1000) pour les issues déclarées."""
    e = max(0, min(100, etoile_effective - 5 * difficulte))
    w = {k: v for k, v in poids(e).items() if k in issues}
    total = sum(w.values())
    perm = {k: (v * 1000) // total for k, v in w.items()}
    reste = 1000 - sum(perm.values())
    cible = "normal" if "normal" in perm else max(perm, key=perm.get)
    perm[cible] += reste
    assert sum(perm.values()) == 1000
    return perm


def resoudre(rng, perm, force=None):
    """Tire une issue ; `force` permet de rejouer un parcours de référence."""
    if force is not None:
        if force not in perm:
            raise ValueError(f"issue forcée {force} absente du tirage")
        return force
    x = rng.randrange(1000)
    acc = 0
    for k in ("miracle", "normal", "mauvaise"):
        if k in perm:
            acc += perm[k]
            if x < acc:
                return k
    raise AssertionError("tirage hors bornes")


def rng_pour(seed, compteur):
    """Générateur indépendant par tirage : le résultat ne dépend que de (seed, n°)."""
    return random.Random(f"{seed}:{compteur}")

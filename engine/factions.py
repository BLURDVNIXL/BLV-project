"""Factions : réputation, dette, exposition, alliance (quatre axes distincts)."""
from .state import clamp

CLES = ("reputation", "dette", "exposition")


def apply(state, cat, fid, delta, err):
    if fid not in cat.factions:
        raise err(f"faction inconnue : {fid}")
    f = state.factions.setdefault(fid, {"reputation": 0, "dette": 0, "exposition": 0, "alliance": False})
    for k, v in delta.items():
        if k in CLES:
            if not isinstance(v, int) or isinstance(v, bool):
                raise err(f"faction {fid}.{k} doit être un entier")
            f[k] = clamp(f[k] + v, k)
        elif k == "alliance":
            if not isinstance(v, bool):
                raise err("alliance doit être true/false")
            f["alliance"] = v
        else:
            raise err(f"clé de faction inconnue : {k}")

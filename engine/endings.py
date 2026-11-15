"""Fins : seules les fins dont la condition est vraie sont proposées ; priorité explicite."""
from .state import check

ORDRE_TYPES = {"secrete": 0, "lumiere": 1, "ombre": 1, "tragique": 2, "entre_deux": 3}


def disponibles(state, story):
    cat = story["catalogue"]
    res = [f for f in story["fins"] if check(state, cat, f["si"])]
    res.sort(key=lambda f: (f.get("priorite", 5), ORDRE_TYPES[f["type"]], f["id"]))
    return res


def epilogue(state, story, fin):
    """Épilogue causal : chaque paragraphe n'apparaît que si le fait qui le justifie est vrai."""
    cat = story["catalogue"]
    return [p["txt"] for p in fin.get("epilogue", []) if not p.get("si") or check(state, cat, p["si"])]

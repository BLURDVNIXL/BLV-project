"""Relations : jauges (confiance, dette, peur) + faits mémorisés qui déclenchent des scènes."""
from .state import clamp

CLES = ("trust", "dette", "peur")


def apply(state, cat, pid, delta, err):
    if pid not in cat.relations:
        raise err(f"relation hors cercle : {pid}")
    r = state.relations.setdefault(pid, {"trust": 0, "dette": 0, "peur": 0, "faits": []})
    for k, v in delta.items():
        if k in CLES:
            if not isinstance(v, int) or isinstance(v, bool):
                raise err(f"relation {pid}.{k} doit être un entier")
            r[k] = clamp(r[k] + v, k)
        elif k == "fait":
            if v not in cat.faits:
                raise err(f"fait non déclaré : {v}")
            if v not in r["faits"]:
                r["faits"].append(v)
        else:
            raise err(f"clé de relation inconnue : {k}")


def etat(state, pid):
    """État relationnel dérivé, utile aux conditions narratives et aux rapports."""
    r = state.relations.get(pid, {"trust": 0, "dette": 0, "peur": 0})
    if r["trust"] <= -5:
        return "rupture"
    if r["peur"] >= 6 and r["trust"] < 3:
        return "soumis"
    if r["trust"] >= 6:
        return "loyal"
    if r["trust"] >= 3:
        return "allie"
    if r["trust"] <= -2:
        return "hostile"
    return "neutre"

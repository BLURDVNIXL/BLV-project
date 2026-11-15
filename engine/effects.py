"""Effets typés. Toute clé inconnue ou valeur mal typée lève EffectError ;
toute violation d'une règle du jeu (bac, fonds, porte illégale…) lève RuleError."""
from . import factions as F
from . import relationships as R
from .state import clamp


class EffectError(Exception):
    """Données d'histoire invalides (clé inconnue, type faux)."""


class RuleError(Exception):
    """Règle du jeu violée : le choix n'est pas exécutable dans cet état."""


CLES = {
    "argent", "dette", "rembourser", "sante", "energie", "compromission", "etoile",
    "etoile_mod", "relations", "factions", "flags", "flags_off", "metier", "echelon",
    "ecole", "scolarite", "diplome", "competences", "inventaire", "actifs", "preuves",
    "planifier", "note",
}
MENTIONS = [(16, "tres_bien"), (14, "bien"), (12, "assez_bien"), (10, "passable")]


def _int(v, nom):
    if not isinstance(v, int) or isinstance(v, bool):
        raise EffectError(f"{nom} doit être un entier, reçu {v!r}")
    return v


def calcul_moyenne(state, mod=0):
    """Moyenne au bac : déterministe. 8 + 0,8×études + (Étoile−50)/25 + mod.
    Le hasard passe par les tirages ; ici l'Étoile ne fait que nuancer la note."""
    m = 8 + 0.8 * state.competences.get("etudes", 0) + (state.etoile_effective() - 50) / 25 + mod
    return round(max(0.0, min(20.0, m)), 1)


def apply(state, eff, ctx):
    """Applique `eff` à `state` (modifié en place). ctx : story, cat, node, choice."""
    if eff is None:
        return
    if not isinstance(eff, dict):
        raise EffectError("eff doit être un dictionnaire")
    inconnues = set(eff) - CLES
    if inconnues:
        raise EffectError(f"clés d'effet inconnues : {sorted(inconnues)}")
    sysm, cat = ctx["systeme"], ctx["cat"]
    node, choice = ctx.get("node") or {}, ctx.get("choice") or {}

    if "dette" in eff:
        d = eff["dette"]
        nom, montant = d["nom"], _int(d["montant"], "dette.montant")
        if montant <= 0:
            raise EffectError("dette.montant doit être > 0")
        state.dettes[nom] = state.dettes.get(nom, 0) + montant
        state.argent += montant
    if "rembourser" in eff:
        d = eff["rembourser"]
        nom, montant = d["nom"], _int(d["montant"], "rembourser.montant")
        montant = min(montant, state.dettes.get(nom, 0))
        if montant > state.argent:
            raise RuleError("fonds insuffisants pour rembourser")
        state.argent -= montant
        state.dettes[nom] = state.dettes.get(nom, 0) - montant
        if state.dettes[nom] <= 0:
            state.dettes.pop(nom, None)
    if "argent" in eff:
        a = _int(eff["argent"], "argent")
        if state.argent + a < 0:
            raise RuleError("fonds insuffisants")
        state.argent += a
    for k in ("sante", "energie", "compromission", "etoile"):
        if k in eff:
            state.__dict__[k] = clamp(state.__dict__[k] + _int(eff[k], k), k)
    if "etoile_mod" in eff:
        m = eff["etoile_mod"]
        state.etoile_mods.append({"valeur": _int(m["valeur"], "etoile_mod.valeur"),
                                  "jusqua": state.jour + _int(m["jours"], "etoile_mod.jours")})
    for pid, delta in (eff.get("relations") or {}).items():
        R.apply(state, cat, pid, delta, EffectError)
    for fid, delta in (eff.get("factions") or {}).items():
        F.apply(state, cat, fid, delta, EffectError)
    for fl in eff.get("flags", []):
        if fl not in cat.flags:
            raise EffectError(f"flag non déclaré : {fl}")
        if fl not in state.flags:
            state.flags.append(fl)
    for fl in eff.get("flags_off", []):
        if fl not in cat.flags:
            raise EffectError(f"flag non déclaré : {fl}")
        if fl in state.flags:
            state.flags.remove(fl)
    if "metier" in eff:
        _metier(state, eff["metier"], sysm, node)
    if "echelon" in eff:
        m = sysm["metiers"].get(state.metier, {})
        ids = [e["id"] for e in m.get("echelons", [])]
        if eff["echelon"] not in ids:
            raise EffectError(f"échelon {eff['echelon']} inconnu pour {state.metier}")
        state.echelon = eff["echelon"]
    if "scolarite" in eff and "bac" not in eff["scolarite"]:
        _scolarite(state, eff["scolarite"], sysm)  # admission avant inscription
    if "ecole" in eff:
        _ecole(state, eff["ecole"], sysm)
    if "scolarite" in eff and "bac" in eff["scolarite"]:
        _scolarite(state, eff["scolarite"], sysm)  # le bac après (re)inscription éventuelle
    if "diplome" in eff:
        _diplome(state, eff["diplome"], sysm, choice)
    for c, v in (eff.get("competences") or {}).items():
        if c not in cat.competences:
            raise EffectError(f"compétence inconnue : {c}")
        state.competences[c] = clamp(state.competences.get(c, 0) + _int(v, c), "competence")
    inv = eff.get("inventaire") or {}
    for o in inv.get("add", []):
        if o not in cat.inventaire:
            raise EffectError(f"objet inconnu : {o}")
        if o not in state.inventaire:
            state.inventaire.append(o)
    for o in inv.get("remove", []):
        if o not in state.inventaire:
            raise RuleError(f"objet absent : {o}")
        state.inventaire.remove(o)
    for a, etat in (eff.get("actifs") or {}).items():
        if a not in cat.actifs:
            raise EffectError(f"actif inconnu : {a}")
        if etat is None:
            state.actifs.pop(a, None)
        else:
            state.actifs[a] = etat
    for pid, d in (eff.get("preuves") or {}).items():
        _preuve(state, cat, pid, d)
    for p in eff.get("planifier", []):
        ev = {e["id"] for e in ctx["story"].get("evenements", [])}
        if p["event"] not in ev:
            raise EffectError(f"événement inconnu : {p['event']}")
        state.planifies.append({"event": p["event"], "due": state.jour + _int(p["delai"], "delai")})


def _metier(state, mid, sysm, node):
    m = sysm["metiers"].get(mid)
    if m is None and mid != "aucun":
        raise EffectError(f"métier inconnu : {mid}")
    if mid == "aucun":
        state.metier, state.echelon = "aucun", None
        return
    cat_m = m["categorie"]
    for d in m.get("requiert", []):
        if d not in state.diplomes:
            raise RuleError(f"{mid} exige le diplôme {d}")
    if cat_m == "formel" and "bac" not in state.diplomes:
        raise RuleError(f"{mid} est un emploi formel : le bac est obligatoire")
    if cat_m == "illegal" and state.camp == "propre" and state.metier != mid and not node.get("porte"):
        raise RuleError(f"{mid} est illégal : accessible seulement par une porte")
    state.metier = mid
    state.echelon = m["echelons"][0]["id"] if m.get("echelons") else None


def _ecole(state, eid, sysm):
    e = sysm["ecoles"].get(eid)
    if e is None and eid != "aucune":
        raise EffectError(f"école inconnue : {eid}")
    if eid == "aucune":
        state.ecole = "aucune"
        return
    if e["type"] == "superieur" and "bac" not in state.diplomes:
        raise RuleError(f"{eid} (supérieur) exige le bac")
    if e["type"] == "lycee":
        if eid not in state.scolarite["admis"]:
            raise RuleError(f"concours d'entrée de {eid} non réussi")
        if e.get("genre", "tous") != "tous" and state.genre != e["genre"]:
            raise RuleError(f"{eid} n'est pas ouvert à ce personnage")
        s = state.scolarite
        s.update(trimestres_valides=0, trimestres_manques=0, absence_courante=False,
                 epreuve=None, bac_passe=False, moyenne=0.0, mention="aucune")
    state.ecole = eid


def _scolarite(state, d, sysm):
    s = state.scolarite
    inconnues = set(d) - {"admis", "absence", "epreuve", "bac"}
    if inconnues:
        raise EffectError(f"scolarité : clés inconnues {sorted(inconnues)}")
    if "admis" in d:
        e = sysm["ecoles"].get(d["admis"])
        if not e or e["type"] != "lycee":
            raise EffectError("scolarite.admis attend un lycée")
        if e.get("genre", "tous") != "tous" and state.genre != e["genre"]:
            raise RuleError(f"{d['admis']} n'est pas ouvert à ce personnage")
        if d["admis"] not in s["admis"]:
            s["admis"].append(d["admis"])
    if "absence" in d:
        if sysm["ecoles"].get(state.ecole, {}).get("type") != "lycee":
            raise RuleError("absence sans lycée")
        s["absence_courante"] = bool(d["absence"])
    if "epreuve" in d:
        if d["epreuve"] not in ("reussie", "ratee"):
            raise EffectError("epreuve : reussie | ratee")
        s["epreuve"] = d["epreuve"]
    if "bac" in d:
        e = sysm["ecoles"].get(state.ecole, {})
        if e.get("type") != "lycee":
            raise RuleError("le bac se passe depuis un lycée")
        if s["trimestres_valides"] + s["trimestres_manques"] < 3:
            raise RuleError("le bac ne peut pas être passé avant la fin des 3 trimestres")
        if s["bac_passe"]:
            raise RuleError("bac déjà passé")
        mod = d["bac"].get("mod", 0)
        moy = calcul_moyenne(state, mod)
        s["moyenne"], s["bac_passe"] = moy, True
        s["mention"] = next((m for seuil, m in MENTIONS if moy >= seuil), "echec")
        if moy >= 10:
            if "bac" not in state.diplomes:
                state.diplomes.append("bac")
            if (e.get("badge") and s["mention"] == "tres_bien" and s["trimestres_manques"] == 0
                    and s["epreuve"] == "reussie" and e["badge"] not in state.badges):
                state.badges.append(e["badge"])


def _diplome(state, did, sysm, choice):
    if did not in sysm["diplomes"]:
        raise EffectError(f"diplôme inconnu : {did}")
    if did == "bac":
        raise RuleError("le bac s'obtient uniquement par scolarite.bac")
    if choice.get("examen") != did and not choice.get("equivalence"):
        raise RuleError(f"diplôme {did} attribué hors examen (déclarer `examen: {did}` ou une `equivalence`)")
    if did in ("licence", "master", "ingenieur"):
        e = sysm["ecoles"].get(state.ecole, {})
        if "bac" not in state.diplomes or did not in e.get("donne", []):
            raise RuleError(f"{did} exige le bac et l'école qui le délivre")
    if did not in state.diplomes:
        state.diplomes.append(did)


def _preuve(state, cat, pid, d):
    if pid not in cat.preuves:
        raise EffectError(f"preuve inconnue : {pid}")
    act = d["action"]
    p = state.preuves.get(pid)
    if act == "obtenir":
        if p and p["etat"] == "detenue":
            return
        state.preuves[pid] = {"etat": "detenue", "detenteur": "joueur"}
    elif act == "transmettre":
        if not p or p["etat"] != "detenue":
            raise RuleError(f"preuve {pid} non détenue : impossible de la transmettre")
        state.preuves[pid] = {"etat": "transmise", "detenteur": d["a"]}
    elif act == "contester":
        if not p or p["etat"] != "transmise":
            raise RuleError(f"preuve {pid} non transmise : rien à contester")
        p["etat"] = "contestee"
    elif act == "perdre":
        if not p:
            raise RuleError(f"preuve {pid} inconnue du joueur")
        state.preuves[pid] = {"etat": "perdue", "detenteur": None}
    else:
        raise EffectError(f"action de preuve inconnue : {act}")

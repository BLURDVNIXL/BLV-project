"""État de campagne BLV V1 : sérialisable, bornes explicites, résolution de noms stricte."""
import copy
import json

from .conditions import ConditionError, evaluate

SCHEMA_VERSION = 1

BORNES = {
    "sante": (0, 100),
    "energie": (0, 100),
    "compromission": (-10, 10),
    "etoile": (0, 100),
    "trust": (-10, 10),
    "dette": (0, 10),
    "peur": (0, 10),
    "reputation": (-10, 10),
    "exposition": (0, 5),
    "competence": (0, 10),
}


def clamp(v, key):
    lo, hi = BORNES[key]
    return max(lo, min(hi, v))


class State:
    """Toutes les données de campagne ; aucun champ « décoratif » caché."""

    def __init__(self, **kw):
        self.destin = kw["destin"]
        self.genre = kw.get("genre", "libre")
        self.camp = kw.get("camp", "propre")
        self.jour = kw.get("jour", 1)
        self.jalon = 0
        self.noeud = None
        self.argent = kw.get("argent", 0)
        self.sante = kw.get("sante", 80)
        self.energie = kw.get("energie", 80)
        self.dettes = dict(kw.get("dettes", {}))
        self.inventaire = list(kw.get("inventaire", []))
        self.actifs = dict(kw.get("actifs", {}))
        self.metier = kw.get("metier", "aucun")
        self.echelon = kw.get("echelon")
        self.ecole = kw.get("ecole", "aucune")
        self.diplomes = list(kw.get("diplomes", []))
        self.badges = list(kw.get("badges", []))
        self.competences = dict(kw.get("competences", {}))
        self.relations = copy.deepcopy(kw.get("relations", {}))
        self.factions = copy.deepcopy(kw.get("factions", {}))
        self.compromission = kw.get("compromission", 0)
        self.etoile = kw.get("etoile", 50)
        self.etoile_mods = []  # [{valeur, jusqua}]
        self.flags = []
        self.preuves = {}  # id -> {etat, detenteur}
        self.planifies = []  # [{event, due}]
        self.declenches = []  # ids d'événements déjà exécutés (anti double exécution)
        self.charges_mensuelles = kw.get("charges_mensuelles", 0)
        self.scolarite = {
            "admis": [],
            "trimestres_valides": 0,
            "trimestres_manques": 0,
            "absence_courante": False,
            "epreuve": None,
            "bac_passe": False,
            "moyenne": 0.0,
            "mention": "aucune",
        }
        self.jours_mois = 0  # dernier jour de paie traité
        self.dernier_trim = 0  # dernière fin de trimestre traitée
        self.journal = []
        self.tirages = 0  # compteur de tirages (pour la reproductibilité)

    # -- sérialisation -----------------------------------------------------
    def to_dict(self):
        return copy.deepcopy(self.__dict__)

    @classmethod
    def from_dict(cls, d):
        s = cls(destin=d["destin"])
        s.__dict__.update(copy.deepcopy(d))
        return s

    def copy(self):
        return State.from_dict(self.to_dict())

    def key(self):
        """Clé de mémoïsation : tout l'état sauf le journal."""
        d = self.to_dict()
        d.pop("journal")
        d.pop("tirages")  # compteur de reproductibilité, pas un fait de l'histoire
        d["flags"] = sorted(d["flags"])
        d["diplomes"] = sorted(d["diplomes"])
        d["badges"] = sorted(d["badges"])
        d["inventaire"] = sorted(d["inventaire"])
        d["declenches"] = sorted(d["declenches"])
        d["planifies"] = sorted(d["planifies"], key=lambda x: (x["due"], x["event"]))
        return json.dumps(d, sort_keys=True, ensure_ascii=False)

    # -- grandeurs dérivées -------------------------------------------------
    def etat_sante(self):
        s = self.sante
        return "critique" if s < 20 else "fragile" if s < 50 else "correct" if s < 80 else "bon"

    def etoile_effective(self):
        mods = sum(m["valeur"] for m in self.etoile_mods if m["jusqua"] >= self.jour)
        return max(0, min(100, self.etoile + mods))

    def dettes_total(self):
        return sum(self.dettes.values())


class Catalogue:
    """Noms valides pour une histoire donnée (issus du système et du destin)."""

    def __init__(self, systeme, destin):
        self.systeme = systeme
        self.flags = set(destin.get("flags", []))
        self.relations = {c["id"] for c in destin.get("cercle", [])}
        self.faits = set(destin.get("faits", []))
        self.factions = set(systeme["factions"])
        self.diplomes = set(systeme["diplomes"])
        self.badges = set(systeme["badges"])
        self.competences = set(systeme["competences"])
        self.preuves = set(destin.get("preuves", []))
        self.inventaire = set(destin.get("objets", []))
        self.actifs = set(destin.get("actifs", []))
        self.metiers = set(systeme["metiers"])
        self.ecoles = set(systeme["ecoles"])


_SCALAIRES = {
    "argent": lambda s: s.argent,
    "sante": lambda s: s.sante,
    "energie": lambda s: s.energie,
    "compromission": lambda s: s.compromission,
    "etoile": lambda s: s.etoile_effective(),
    "jour": lambda s: s.jour,
    "jalon": lambda s: s.jalon,
    "metier": lambda s: s.metier,
    "echelon": lambda s: s.echelon or "aucun",
    "ecole": lambda s: s.ecole,
    "genre": lambda s: s.genre,
    "camp": lambda s: s.camp,
    "etat_sante": lambda s: s.etat_sante(),
}


def resolve(state, cat, name):
    """Résout un nom pointé. Espace de noms explicite ; tout inconnu = erreur."""
    p = name.split(".")
    h = p[0]
    if len(p) == 1:
        if h in _SCALAIRES:
            return _SCALAIRES[h](state)
        raise ConditionError(f"nom inconnu « {name} »")
    if h == "flags" and len(p) == 2:
        if p[1] not in cat.flags:
            raise ConditionError(f"flag non déclaré « {p[1]} »")
        return p[1] in state.flags
    if h == "diplomes" and len(p) == 2:
        if p[1] not in cat.diplomes:
            raise ConditionError(f"diplôme inconnu « {p[1]} »")
        return p[1] in state.diplomes
    if h == "badges" and len(p) == 2:
        if p[1] not in cat.badges:
            raise ConditionError(f"badge inconnu « {p[1]} »")
        return p[1] in state.badges
    if h == "skills" and len(p) == 2:
        if p[1] not in cat.competences:
            raise ConditionError(f"compétence inconnue « {p[1]} »")
        return state.competences.get(p[1], 0)
    if h == "inventaire" and len(p) == 2:
        if p[1] not in cat.inventaire:
            raise ConditionError(f"objet inconnu « {p[1]} »")
        return p[1] in state.inventaire
    if h == "actifs" and len(p) == 2:
        if p[1] not in cat.actifs:
            raise ConditionError(f"actif inconnu « {p[1]} »")
        return p[1] in state.actifs
    if h == "preuves" and len(p) == 2:
        if p[1] not in cat.preuves:
            raise ConditionError(f"preuve inconnue « {p[1]} »")
        return state.preuves.get(p[1], {}).get("etat", "aucune")
    if h == "dettes" and p[1:] == ["total"]:
        return state.dettes_total()
    if h == "relations" and len(p) >= 3:
        if p[1] not in cat.relations:
            raise ConditionError(f"personnage hors cercle « {p[1]} »")
        r = state.relations.get(p[1], {"trust": 0, "dette": 0, "peur": 0, "faits": []})
        if len(p) == 3 and p[2] in ("trust", "dette", "peur"):
            return r.get(p[2], 0)
        if len(p) == 4 and p[2] == "faits":
            if p[3] not in cat.faits:
                raise ConditionError(f"fait non déclaré « {p[3]} »")
            return p[3] in r.get("faits", [])
    if h == "factions" and len(p) == 3:
        if p[1] not in cat.factions:
            raise ConditionError(f"faction inconnue « {p[1]} »")
        f = state.factions.get(p[1], {"reputation": 0, "dette": 0, "exposition": 0, "alliance": False})
        if p[2] in ("reputation", "dette", "exposition", "alliance"):
            return f.get(p[2], 0 if p[2] != "alliance" else False)
    if h == "scolarite" and len(p) == 2 and p[1] in state.scolarite:
        return state.scolarite[p[1]]
    raise ConditionError(f"nom inconnu « {name} »")


def check(state, cat, expr):
    return evaluate(expr, lambda n: resolve(state, cat, n))

"""Exécuteur de campagne : temps, paie, trimestres, événements différés, choix, tirages, fins."""
import copy
import zlib

from . import choices as C
from . import effects as E
from . import endings as EN
from . import random_events as RE
from .conditions import ConditionError
from .state import SCHEMA_VERSION, Catalogue, State, check

CONTENT_VERSION = "v1.0"


def charger_histoire(systeme, destin):
    story = dict(destin)
    story["systeme"] = systeme
    story["catalogue"] = Catalogue(systeme, destin)
    story["_noeuds"] = {n["id"]: n for n in destin["noeuds"]}
    return story


def etat_initial(story):
    d, sysm = story["depart"], story["systeme"]
    s = State(
        destin=story["destin"], genre=story.get("genre", "libre"), camp=d.get("camp", "propre"),
        argent=d.get("argent_fcfa", 0), sante=d.get("sante", 80), energie=d.get("energie", 80),
        compromission=d.get("compromission", 0), etoile=d.get("etoile", 50),
        metier=d.get("metier", "aucun"), echelon=d.get("echelon"), ecole=d.get("ecole", "aucune"),
        diplomes=d.get("diplomes", []), competences=d.get("competences", {}),
        actifs=d.get("actifs", {}), dettes=d.get("dettes", {}), inventaire=d.get("inventaire", []),
        charges_mensuelles=d.get("charges_mensuelles", 0), jour=d.get("jour", 1),
    )
    for pid, r in d.get("relations", {}).items():
        s.relations[pid] = {"trust": r.get("trust", 0), "dette": r.get("dette", 0),
                            "peur": r.get("peur", 0), "faits": list(r.get("faits", []))}
    for fid, f in d.get("factions", {}).items():
        s.factions[fid] = {"reputation": f.get("reputation", 0), "dette": f.get("dette", 0),
                           "exposition": f.get("exposition", 0), "alliance": f.get("alliance", False)}
    for pid in d.get("preuves", []):
        s.preuves[pid] = {"etat": "detenue", "detenteur": "joueur"}
    s.noeud = story["noeuds"][0]["id"]
    s.jalon = story["noeuds"][0]["jalon"]
    return s


# --------------------------------------------------------------------------- temps
def revenu_mensuel(state, sysm):
    m = sysm["metiers"].get(state.metier)
    if not m or not m.get("echelons"):
        return 0
    ech = next((e for e in m["echelons"] if e["id"] == state.echelon), m["echelons"][0])
    rev = ech["revenu"]
    if m["categorie"] == "petit_boulot" and "bac" not in state.diplomes:
        rev = min(rev, sysm["regles_argent"]["plafond_petit_boulot_sans_bac"])
    return rev


def avancer(state, story, vers_jour, messages):
    """Fait passer le temps jusqu'à `vers_jour` en traitant, dans l'ordre chronologique :
    paie/charges mensuelles, fin de trimestre, événements différés ou datés."""
    sysm = story["systeme"]
    if vers_jour < state.jour:
        raise E.RuleError(f"le temps ne recule pas ({state.jour} -> {vers_jour})")
    trimestres = sysm["calendrier"]["fins_de_trimestre"]
    while True:
        prochains = []
        m = (state.jours_mois // 30 + 1) * 30
        if m <= vers_jour:
            prochains.append((m, 0, "paie", None))
        for t in trimestres:
            if state.jour < t <= vers_jour and t > state.dernier_trim:
                prochains.append((t, 1, "trimestre", t))
        for ev in story.get("evenements", []):
            if ev.get("jour") and ev["id"] not in state.declenches and state.jour <= ev["jour"] <= vers_jour:
                prochains.append((ev["jour"], 2, "event", ev["id"]))
        for p in state.planifies:
            if p["due"] <= vers_jour:
                prochains.append((max(p["due"], state.jour), 2, "plan", p))
        if not prochains:
            break
        prochains.sort(key=lambda x: (x[0], x[1], str(x[3])))
        jour, _, genre, ref = prochains[0]
        state.jour = jour
        if genre == "paie":
            state.jours_mois = jour
            net = revenu_mensuel(state, sysm) - state.charges_mensuelles
            state.argent += net
            if state.argent < 0:
                state.dettes["arriérés"] = state.dettes.get("arriérés", 0) - state.argent
                state.argent = 0
                state.sante = max(0, state.sante - 5)
                messages.append("Fin de mois difficile : des arriérés s'accumulent.")
        elif genre == "trimestre":
            state.dernier_trim = ref
            if sysm["ecoles"].get(state.ecole, {}).get("type") == "lycee":
                s = state.scolarite
                if s["absence_courante"] or state.sante < 30:
                    s["trimestres_manques"] += 1
                else:
                    s["trimestres_valides"] += 1
                s["absence_courante"] = False
        elif genre == "event":
            _declencher(state, story, next(e for e in story["evenements"] if e["id"] == ref), messages)
        else:
            state.planifies.remove(ref)
            _declencher(state, story, next(e for e in story["evenements"] if e["id"] == ref["event"]), messages)
    state.jour = vers_jour


def _declencher(state, story, ev, messages):
    if ev["id"] in state.declenches and not ev.get("repetable"):
        return
    ctx = {"story": story, "systeme": story["systeme"], "cat": story["catalogue"], "node": {}, "choice": {}}
    ok = not ev.get("si") or check(state, story["catalogue"], ev["si"])
    eff = ev.get("eff") if ok else ev.get("sinon_eff")
    txt = ev.get("txt") if ok else ev.get("sinon_txt")
    if eff:
        _appliquer_tolerant(state, eff, ctx)
    if txt:
        messages.append(txt)
    state.declenches.append(ev["id"])
    state.journal.append({"evenement": ev["id"], "jour": state.jour, "execute": ok})


def _appliquer_tolerant(state, eff, ctx):
    """Conséquences subies : une perte d'argent est écrêtée au solde disponible."""
    eff = copy.deepcopy(eff)
    if isinstance(eff.get("argent"), int) and state.argent + eff["argent"] < 0:
        eff["argent"] = -state.argent
    E.apply(state, eff, ctx)


# --------------------------------------------------------------------------- exécuteur
class Runner:
    def __init__(self, story, state=None, seed=0, journaliser=True):
        self.story = story
        self.journaliser = journaliser
        self.seed = seed
        self.state = state or etat_initial(story)
        self.messages = []
        if state is None:
            avancer(self.state, story, self.node().get("jour", self.state.jour), self.messages)

    def node(self):
        return self.story["_noeuds"][self.state.noeud]

    def est_denouement(self):
        return bool(self.node().get("denouement"))

    def options(self):
        return C.options(self.state, self.story, self.node())

    def fins(self):
        return EN.disponibles(self.state, self.story)

    def probabilites(self, choice):
        t = choice["tirage"]
        mods = sum(m["valeur"] for m in t.get("modificateurs", [])
                   if check(self.state, self.story["catalogue"], m["si"]))
        e = max(0, min(100, self.state.etoile_effective() + mods))
        return RE.probabilites(e, t.get("difficulte", 0), t["issues"])

    def choisir(self, choice_id, issue_forcee=None):
        """Exécute un choix. Retourne un dict {issue, probabilites, messages}."""
        node = self.node()
        choice = next((c for c in node["choix"] if c["id"] == choice_id), None)
        if choice is None:
            raise E.RuleError(f"choix {choice_id} absent du nœud {node['id']} (double exécution ?)")
        ok, why = C.executable(self.state, self.story, node, choice)
        if not ok:
            raise E.RuleError(f"choix {choice_id} indisponible : {why}")
        avant = self.state.key() if self.journaliser else None
        self.messages = []
        ctx = C.contexte(self.story, node, choice)
        E.apply(self.state, choice.get("eff"), ctx)
        issue, perm, dest = None, None, choice.get("vers")
        if "tirage" in choice:
            perm = self.probabilites(choice)
            rng = RE.rng_pour(self.seed, self.state.tirages)
            self.state.tirages += 1
            issue = RE.resoudre(rng, perm, issue_forcee)
            iss = choice["tirage"]["issues"][issue]
            if iss.get("eff"):
                _appliquer_tolerant(self.state, iss["eff"], ctx)
            if iss.get("txt"):
                self.messages.append(iss["txt"])
            dest = iss["vers"]
        if self.journaliser:
          self.state.journal.append({
            "noeud": node["id"], "choix": choice_id, "issue": issue, "probabilites": perm,
            "formule": RE.FORMULE_VERSION if perm else None, "seed": self.seed,
            "tirage_n": self.state.tirages if perm else None, "jour": self.state.jour,
            "etat_avant": zlib.crc32(avant.encode()), "etat_apres": zlib.crc32(self.state.key().encode())})
        self._aller(dest)
        return {"issue": issue, "probabilites": perm, "messages": list(self.messages)}

    def _aller(self, dest):
        story = self.story
        n = story["_noeuds"][dest]
        # accès conditionnel : si la condition d'entrée est fausse, on bascule sur `sinon`
        guard = 0
        while n.get("si") and not check(self.state, story["catalogue"], n["si"]):
            n = story["_noeuds"][n["sinon"]]
            guard += 1
            if guard > 10:
                raise E.RuleError("boucle de redirection de nœud")
        avancer(self.state, story, max(n.get("jour", self.state.jour), self.state.jour), self.messages)
        self.state.noeud, self.state.jalon = n["id"], n["jalon"]

    def choisir_fin(self, fin_id):
        dispo = {f["id"]: f for f in self.fins()}
        if not self.est_denouement():
            raise E.RuleError("pas encore au dénouement")
        if fin_id not in dispo:
            raise E.RuleError(f"fin {fin_id} non disponible dans cet état")
        self.state.journal.append({"fin": fin_id})
        return dispo[fin_id], EN.epilogue(self.state, self.story, dispo[fin_id])

    # -- sauvegarde / chargement -----------------------------------------------
    def sauvegarder(self):
        return {"schema_version": SCHEMA_VERSION, "contenu_version": CONTENT_VERSION,
                "destin": self.story["destin"], "seed": self.seed, "etat": self.state.to_dict()}

    @classmethod
    def charger(cls, story, data):
        if data["schema_version"] != SCHEMA_VERSION:
            raise E.RuleError(f"schéma de sauvegarde {data['schema_version']} incompatible")
        if data["contenu_version"] != CONTENT_VERSION:
            raise E.RuleError(f"contenu {data['contenu_version']} incompatible : migration requise")
        return cls(story, State.from_dict(data["etat"]), data["seed"])

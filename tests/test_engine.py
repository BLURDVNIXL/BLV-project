"""Tests du moteur V1 (unittest, sans dépendance). Lancer : python3 -m unittest discover -s tests -v"""
import json
import os
import sys
import unittest
import warnings

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, RACINE)
sys.path.insert(0, os.path.join(RACINE, "tools"))

from engine import effects as E  # noqa: E402
from engine import random_events as RE  # noqa: E402
from engine.conditions import ConditionError, evaluate, names, parse  # noqa: E402
from engine.narrative_runner import Runner, avancer, charger_histoire, etat_initial  # noqa: E402
from engine.state import Catalogue, State, check  # noqa: E402
from loader import charger_destin, commun, fichiers_destins, lire  # noqa: E402

warnings.simplefilter("ignore", ResourceWarning)
C = commun()
SYS = C["systeme"]


def histoire(nom):
    return charger_destin(os.path.join(RACINE, "story", "destins", nom + ".yaml"), SYS)


def ctx(story, node=None, choice=None):
    return {"story": story, "systeme": SYS, "cat": story["catalogue"], "node": node or {}, "choice": choice or {}}


class TestConditions(unittest.TestCase):
    @staticmethod
    def R(n):
        valeurs = {"a": 3, "b": 5, "x": True, "y": False, "s": "abc"}
        if n not in valeurs:
            raise ConditionError(f"nom inconnu {n}")  # comme le vrai résolveur : jamais de valeur par défaut
        return valeurs[n]

    def test_operateurs(self):
        for src, att in [("a < b", True), ("a >= 3 and b == 5", True), ("not y", True), ("x or y", True),
                         ("(a < b) and not (b < a)", True), ("a in [1, 3]", True), ("s == 'abc'", True),
                         ("a != 3", False), ("b <= 4", False)]:
            self.assertEqual(evaluate(src, self.R), att, src)

    def test_pas_de_eval(self):
        for mauvais in ["__import__('os')", "a.__class__", "open('x')", "a + b", "1; 2", "lambda: 1", "a if b else x"]:
            with self.assertRaises(ConditionError, msg=mauvais):
                evaluate(mauvais, self.R)

    def test_types_stricts(self):
        with self.assertRaises(ConditionError):
            evaluate("a < 'abc'", self.R)
        with self.assertRaises(ConditionError):
            evaluate("a and b", self.R)  # entiers non booléens

    def test_noms_inconnus(self):
        s = etat_initial(histoire("poignon"))
        cat = histoire("poignon")["catalogue"]
        for mauvais in ["flags.inexistant", "relations.inconnu.trust", "factions.nulle.reputation",
                        "diplomes.licence_magique", "truc", "relations.gnamien.faits.inconnu"]:
            with self.assertRaises(ConditionError, msg=mauvais):
                check(s, cat, mauvais + " == true" if "." in mauvais else mauvais)

    def test_names(self):
        self.assertEqual(sorted(names(parse("flags.a and relations.x.trust >= 2"))), ["flags.a", "relations.x.trust"])


class TestEtoile(unittest.TestCase):
    def test_total_exact_et_jamais_automatique(self):
        for e in (0, 25, 50, 75, 100):
            for diff in range(0, 11):
                for issues in ({"miracle", "normal", "mauvaise"}, {"normal", "mauvaise"}, {"miracle", "normal"}, {"miracle", "mauvaise"}):
                    p = RE.probabilites(e, diff, issues)
                    self.assertEqual(sum(p.values()), 1000, (e, diff, issues))
                    self.assertEqual(set(p), issues)
                    for k, v in p.items():
                        self.assertGreater(v, 0, (e, diff, issues, k))
                        self.assertLess(v, 1000, (e, diff, issues, k))

    def test_monotonie(self):
        bas = RE.probabilites(0, 0, {"miracle", "normal", "mauvaise"})
        haut = RE.probabilites(100, 0, {"miracle", "normal", "mauvaise"})
        self.assertGreater(haut["miracle"], bas["miracle"])
        self.assertLess(haut["mauvaise"], bas["mauvaise"])

    def test_reproductible(self):
        p = RE.probabilites(50, 3, {"miracle", "normal", "mauvaise"})
        a = [RE.resoudre(RE.rng_pour("s", i), p) for i in range(50)]
        b = [RE.resoudre(RE.rng_pour("s", i), p) for i in range(50)]
        self.assertEqual(a, b)

    def test_frequences_proches_des_probabilites(self):
        p = RE.probabilites(50, 0, {"miracle", "normal", "mauvaise"})
        n = 20000
        c = {"miracle": 0, "normal": 0, "mauvaise": 0}
        for i in range(n):
            c[RE.resoudre(RE.rng_pour("freq", i), p)] += 1
        for k, v in p.items():
            self.assertAlmostEqual(c[k] / n, v / 1000, delta=0.015, msg=k)


class TestRegles(unittest.TestCase):
    def setUp(self):
        self.story = histoire("poignon")
        self.s = etat_initial(self.story)

    def app(self, eff, node=None, choice=None, state=None):
        E.apply(state or self.s, eff, ctx(self.story, node, choice))

    def test_cle_inconnue_rejetee(self):
        with self.assertRaises(E.EffectError):
            self.app({"gloire": 3})

    def test_fonds_insuffisants(self):
        with self.assertRaises(E.RuleError):
            self.app({"argent": -999999})
        self.app({"dette": {"nom": "x", "montant": 5000}, "argent": -6000})  # dette explicite
        self.assertEqual(self.s.dettes["x"], 5000)

    def test_bornes(self):
        self.app({"compromission": 99, "sante": 500, "etoile": 500})
        self.assertEqual((self.s.compromission, self.s.sante, self.s.etoile), (10, 100, 100))
        self.app({"compromission": -99, "sante": -500})
        self.assertEqual((self.s.compromission, self.s.sante), (-10, 0))

    def test_emploi_formel_exige_bac(self):
        with self.assertRaises(E.RuleError):
            self.app({"metier": "instituteur"})
        self.s.diplomes.append("bac")
        self.app({"metier": "instituteur"})

    def test_superieur_exige_bac(self):
        with self.assertRaises(E.RuleError):
            self.app({"ecole": "ufhb"})
        with self.assertRaises(E.RuleError):
            self.app({"ecole": "inpolytec"})

    def test_metier_illegal_exige_porte(self):
        with self.assertRaises(E.RuleError):
            self.app({"metier": "convoyeur_illicite"}, node={"porte": False})
        self.app({"metier": "convoyeur_illicite"}, node={"porte": True})
        self.assertEqual(self.s.metier, "convoyeur_illicite")

    def test_diplome_hors_examen_refuse(self):
        with self.assertRaises(E.RuleError):
            self.app({"diplome": "permis_b"})
        self.app({"diplome": "permis_b"}, choice={"examen": "permis_b"})
        self.assertIn("permis_b", self.s.diplomes)

    def test_bac_pas_attribuable_directement(self):
        with self.assertRaises(E.RuleError):
            self.app({"diplome": "bac"}, choice={"examen": "bac"})

    def test_lycee_exige_concours_et_genre(self):
        with self.assertRaises(E.RuleError):
            self.app({"ecole": "lycee_classique"})
        with self.assertRaises(E.RuleError):
            self.app({"scolarite": {"admis": "ste_marie"}})  # Poignon est un homme
        self.s.genre = "f"
        self.app({"scolarite": {"admis": "ste_marie"}, "ecole": "ste_marie"})
        self.assertEqual(self.s.ecole, "ste_marie")

    def test_cep_bepc_supprimes(self):
        for d in ("cepe", "bepc"):
            self.assertNotIn(d, SYS["diplomes"])
        self.assertNotIn("cours_du_soir_adjame", SYS["ecoles"])

    def test_bac_et_badge(self):
        s = self.s
        self.app({"scolarite": {"admis": "lycee_classique"}, "ecole": "lycee_classique"})
        with self.assertRaises(E.RuleError):  # avant la fin des 3 trimestres
            self.app({"scolarite": {"bac": {"mod": 0}}})
        s.scolarite["trimestres_valides"] = 3
        s.competences["etudes"] = 10
        s.etoile = 100
        s.scolarite["epreuve"] = "reussie"
        self.app({"scolarite": {"bac": {"mod": 0}}})
        self.assertIn("bac", s.diplomes)
        self.assertEqual(s.scolarite["mention"], "tres_bien")
        self.assertIn("caiman", s.badges)

    def test_badge_refuse_si_trimestre_manque_ou_epreuve_ratee(self):
        for manque, epreuve in ((1, "reussie"), (0, "ratee"), (0, None)):
            s = etat_initial(self.story)
            self.app({"scolarite": {"admis": "lycee_classique"}, "ecole": "lycee_classique"}, state=s)
            s.scolarite.update(trimestres_valides=3 - manque, trimestres_manques=manque, epreuve=epreuve)
            s.competences["etudes"] = 10
            s.etoile = 100
            self.app({"scolarite": {"bac": {"mod": 0}}}, state=s)
            self.assertIn("bac", s.diplomes, "le bac sans badge ouvre quand même la suite")
            self.assertNotIn("caiman", s.badges)

    def test_bac_echec(self):
        s = self.s
        self.app({"scolarite": {"admis": "lycee_classique"}, "ecole": "lycee_classique"})
        s.scolarite["trimestres_valides"] = 3
        s.competences["etudes"] = 0
        s.etoile = 0
        self.app({"scolarite": {"bac": {"mod": -2}}})
        self.assertNotIn("bac", s.diplomes)
        self.assertEqual(s.scolarite["mention"], "echec")

    def test_preuve_cycle_de_vie(self):
        with self.assertRaises(E.RuleError):
            self.app({"preuves": {"film_caisses": {"action": "transmettre", "a": "fatou"}}})
        self.app({"preuves": {"film_caisses": {"action": "obtenir"}}})
        self.app({"preuves": {"film_caisses": {"action": "transmettre", "a": "fatou"}}})
        self.app({"preuves": {"film_caisses": {"action": "contester"}}})
        self.assertEqual(self.s.preuves["film_caisses"]["etat"], "contestee")

    def test_plafond_petit_boulot_sans_bac(self):
        s = etat_initial(self.story)
        s.metier, s.echelon = "manoeuvre_marche", "chef_equipe"
        from engine.narrative_runner import revenu_mensuel
        self.assertEqual(revenu_mensuel(s, SYS), SYS["regles_argent"]["plafond_petit_boulot_sans_bac"])
        s.diplomes.append("bac")
        self.assertEqual(revenu_mensuel(s, SYS), 75000)


class TestTemps(unittest.TestCase):
    def test_paie_arrieres_et_trimestres(self):
        story = histoire("poignon")
        s = etat_initial(story)
        s.argent = 0
        msgs = []
        avancer(s, story, 31, msgs)  # 1 paie : aucun revenu, 20 000 de charges -> arriérés
        self.assertEqual(s.dettes.get("arriérés"), 20000)
        self.assertEqual(s.argent, 0)
        self.assertEqual(s.sante, 65)
        with self.assertRaises(E.RuleError):
            avancer(s, story, 10, [])

    def test_trimestres_comptes_pour_un_lycee(self):
        story = histoire("poignon")
        s = etat_initial(story)
        E.apply(s, {"scolarite": {"admis": "lycee_classique"}, "ecole": "lycee_classique"}, ctx(story))
        avancer(s, story, 275, [])
        self.assertEqual(s.scolarite["trimestres_valides"] + s.scolarite["trimestres_manques"], 3)

    def test_evenement_une_seule_fois(self):
        story = histoire("poignon")
        s = etat_initial(story)
        avancer(s, story, 100, [])
        n = s.declenches.count("ev_racket_zephyrine")
        avancer(s, story, 120, [])
        self.assertEqual(n, 1)
        self.assertEqual(s.declenches.count("ev_racket_zephyrine"), 1)


class TestRunner(unittest.TestCase):
    def test_sauvegarde_chargement(self):
        story = histoire("poignon")
        r = Runner(story, seed=7)
        r.choisir("aider", issue_forcee="normal")
        data = json.loads(json.dumps(r.sauvegarder()))
        r2 = Runner.charger(story, data)
        self.assertEqual(r2.state.key(), r.state.key())
        data["schema_version"] = 99
        with self.assertRaises(E.RuleError):
            Runner.charger(story, data)
        data["schema_version"] = 1
        data["contenu_version"] = "v0.0"
        with self.assertRaises(E.RuleError):
            Runner.charger(story, data)

    def test_double_execution_refusee(self):
        story = histoire("poignon")
        r = Runner(story, seed=1)
        r.choisir("dormir")
        with self.assertRaises(E.RuleError):
            r.choisir("dormir")  # le nœud a changé : même choix refusé

    def test_choix_impossible_non_propose(self):
        story = histoire("poignon")
        r = Runner(story, seed=1)
        for cid in ("dormir", "marche", "refuser"):
            r.choisir(cid)
        self.assertEqual(r.state.noeud, "po_1_concours")
        r.state.argent = 100
        dispo = {c["id"]: ok for c, ok, _ in r.options()}
        self.assertFalse(dispo["tenter"])
        with self.assertRaises(E.RuleError):
            r.choisir("tenter")

    def test_journal_reproductible(self):
        story = histoire("poignon")
        runs = []
        for _ in range(2):
            r = Runner(story, seed=42)
            r.choisir("aider")
            runs.append([(j.get("choix"), j.get("issue"), j.get("etat_apres")) for j in r.state.journal if "choix" in j])
        self.assertEqual(runs[0], runs[1])

    def test_seulement_les_fins_vraies(self):
        story = histoire("poignon")
        r = Runner(story, seed=0)
        r.state.noeud = "po_5_ceremonie"
        ids = [f["id"] for f in r.fins()]
        self.assertIn("po_f_entre", ids)
        self.assertNotIn("po_f_lum", ids)
        self.assertNotIn("po_f_secret", ids)
        with self.assertRaises(E.RuleError):
            r.choisir_fin("po_f_lum")


class TestParcoursReference(unittest.TestCase):
    """Chaque fin est couverte par un état reproductible : on rejoue les parcours enregistrés."""

    def test_replay(self):
        vus = 0
        for f in fichiers_destins():
            story = charger_destin(f, SYS)
            p = os.path.join(RACINE, "story", "parcours", story["destin"] + ".json")
            if not os.path.exists(p):
                continue
            ref = json.load(open(p, encoding="utf8"))
            for fid, par in ref["fins"].items():
                r = Runner(story, seed=0)
                for etape in par["chemin"]:
                    self.assertEqual(r.state.noeud, etape["noeud"], f"{story['destin']}:{fid}")
                    r.choisir(etape["choix"], issue_forcee=etape["issue"])
                self.assertTrue(r.est_denouement(), f"{story['destin']}:{fid}")
                dispo = [x["id"] for x in r.fins()]
                self.assertIn(fid, dispo, f"{story['destin']} : la fin {fid} n'est pas rejouable")
                r.choisir_fin(fid)
                vus += 1
        self.assertGreater(vus, 0)


class TestValidateurNegatif(unittest.TestCase):
    """Le validateur doit REFUSER les données fautives."""

    def erreurs(self, mutateur):
        import validate as V
        raw = lire(os.path.join(RACINE, "story", "destins", "poignon.yaml"))
        mutateur(raw)
        story = charger_histoire(SYS, raw)
        errs, warns = [], []
        V.valider_destin(story, C, errs, warns)
        return errs

    def test_condition_eval(self):
        def m(d):
            d["fins"][0]["si"] = "__import__('os').system('x')"
        self.assertTrue(any("invalide" in e for e in self.erreurs(m)))

    def test_cle_effet_inconnue(self):
        def m(d):
            d["noeuds"][0]["choix"][0]["eff"]["gloire"] = 3
        self.assertTrue(any("gloire" in e for e in self.erreurs(m)))

    def test_reference_inconnue(self):
        def m(d):
            d["noeuds"][0]["choix"][1]["vers"] = "nulle_part"
        self.assertTrue(any("nulle_part" in e for e in self.erreurs(m)))

    def test_flag_non_declare(self):
        def m(d):
            d["noeuds"][0]["choix"][1]["eff"]["flags"] = ["fantome"]
        self.assertTrue(any("fantome" in e for e in self.erreurs(m)))

    def test_metier_illegal_hors_porte(self):
        def m(d):
            d["noeuds"][0]["choix"][2]["eff"]["metier"] = "dealer_rue"
        self.assertTrue(any("hors nœud `porte" in e for e in self.erreurs(m)))

    def test_depart_illegal_pour_destin_propre(self):
        def m(d):
            d["depart"]["metier"] = "parrain"
        self.assertTrue(any("illégal" in e for e in self.erreurs(m)))

    def test_depart_hors_bornes(self):
        def m(d):
            d["depart"]["etoile"] = 150
        self.assertTrue(any("hors bornes" in e for e in self.erreurs(m)))

    def test_faction_sans_observation(self):
        def m(d):
            d["noeuds"][1]["choix"][1]["vu_par"] = []
            d["noeuds"][1]["choix"][1]["eff"]["factions"] = {"ordre": {"reputation": 1}}
        self.assertTrue(any("sans avoir observé" in e for e in self.erreurs(m)))

    def test_diplome_sans_examen(self):
        def m(d):
            d["noeuds"][0]["choix"][1]["eff"]["diplome"] = "permis_b"
        self.assertTrue(any("sans `examen" in e for e in self.erreurs(m)))

    def test_fin_tragique_par_simple_seuil(self):
        def m(d):
            for f in d["fins"]:
                if f["type"] == "tragique":
                    f["si"] = "compromission >= 8"
        self.assertTrue(any("simple seuil" in e for e in self.erreurs(m)))

    def test_impasse(self):
        def m(d):
            d["noeuds"][2]["choix"] = []
        self.assertTrue(any("impasse" in e for e in self.erreurs(m)))

    def test_temps_qui_recule(self):
        def m(d):
            d["noeuds"][1]["jour"] = 500
        self.assertTrue(any("jalon" in e or "temps" in e for e in self.erreurs(m)))

    def test_tirage_sans_effet(self):
        def m(d):
            t = d["noeuds"][0]["choix"][0]["tirage"]["issues"]
            for k in t:
                t[k] = {"vers": "po_0_aube"}
        self.assertTrue(any("sans effet significatif" in e for e in self.erreurs(m)))

    def test_fin_manquante(self):
        def m(d):
            d["fins"] = [f for f in d["fins"] if f["type"] != "secrete"]
        self.assertTrue(any("secrete" in e for e in self.erreurs(m)))

    def test_nom_interdit(self):
        import re
        for f in ("story/common/systeme.yaml", "story/common/personnages.yaml", "story/destins/poignon.yaml"):
            txt = open(os.path.join(RACINE, f), encoding="utf8").read()
            self.assertIsNone(re.search(r"INP-?HB|Real Madrid", txt), f)


class TestCoherenceHistoires(unittest.TestCase):
    def test_tout_valide(self):
        import validate as V
        errs, warns = [], []
        V.valider_commun(C, errs)
        for f in fichiers_destins():
            V.valider_destin(charger_destin(f, SYS), C, errs, warns)
        self.assertEqual(errs, [])

    def test_aucun_flag_orphelin(self):
        import validate as V
        for f in fichiers_destins():
            errs, warns = [], []
            V.valider_destin(charger_destin(f, SYS), C, errs, warns)
            self.assertFalse([w for w in warns if "jamais posé" in w], warns)


if __name__ == "__main__":
    unittest.main()

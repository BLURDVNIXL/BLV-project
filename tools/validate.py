"""Validation stricte de la bible et des destins V1.

Contrôles (GDD §8) : schéma, clés inconnues, références, conditions (noms résolus statiquement),
effets (clés, catalogues), règles auteur (bac, portes illégales, diplômes sans examen,
visibilité des factions), tirages, jalons/chronologie, fins, renommages interdits.
Code de sortie 1 s'il y a au moins une erreur.
"""
import json
import os
import re
import sys

import yaml

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from loader import RACINE, charger_destin, commun, fichiers_destins  # noqa: E402

from engine import effects as E  # noqa: E402
from engine.conditions import ConditionError, names, parse  # noqa: E402
from engine.narrative_runner import etat_initial  # noqa: E402
from engine.state import resolve  # noqa: E402

ISSUES = {"miracle", "normal", "mauvaise"}
TYPES_FIN = {"lumiere", "ombre", "entre_deux", "tragique", "secrete"}
CLES_DESTIN = {"destin", "titre", "rarete", "genre", "resume", "themes", "fonction_dramatique", "langue",
               "depart", "cercle", "flags", "faits", "preuves", "objets", "actifs", "evenements",
               "noeuds", "fins"}
CLES_DEPART = {"camp", "compromission", "argent_fcfa", "etoile", "sante", "energie", "metier", "echelon",
               "ecole", "diplomes", "charges_mensuelles", "logement_descriptif", "competences",
               "relations", "factions", "dettes", "inventaire", "actifs", "jour", "preuves"}
CLES_NOEUD = {"id", "jalon", "jour", "porte", "carrefour", "si", "sinon", "lieu", "moment", "objectif",
              "present", "savoir", "verite", "dialogue", "tags", "denouement", "choix"}
CLES_CHOIX = {"id", "l", "intention", "cout", "si", "eff", "vers", "tirage", "vu_par", "examen",
              "equivalence", "irreversible", "info"}
CLES_TIRAGE = {"difficulte", "modificateurs", "issues"}
CLES_ISSUE = {"vers", "eff", "txt"}
CLES_FIN = {"id", "type", "priorite", "si", "titre", "resume", "epilogue", "imposee"}
CLES_EVENT = {"id", "jour", "si", "txt", "eff", "sinon_txt", "sinon_eff", "repetable"}
INTERDITS = [r"INP-?HB", r"Real Madrid", r"INPHB"]
CARREFOURS = {"A": 110, "B": 281, "C": 283}


def valider_commun(C, errs):
    S = C["systeme"]
    for mid, m in S["metiers"].items():
        if m["categorie"] not in ("petit_boulot", "independant", "formel", "illegal"):
            errs.append(f"[systeme] métier {mid} : catégorie inconnue")
        for d in m.get("requiert", []):
            if d not in S["diplomes"]:
                errs.append(f"[systeme] métier {mid} requiert un diplôme inconnu {d}")
        for e in m.get("echelons", []):
            if not isinstance(e.get("revenu"), int):
                errs.append(f"[systeme] métier {mid}.{e.get('id')} : revenu entier requis")
    for eid, e in S["ecoles"].items():
        for d in e.get("donne", []):
            if d not in S["diplomes"]:
                errs.append(f"[systeme] école {eid} donne un diplôme inconnu {d}")
        if e["type"] == "lycee" and e.get("badge") not in S["badges"]:
            errs.append(f"[systeme] lycée {eid} : badge inconnu")
        if e["type"] == "superieur" and "bac" not in e.get("requiert", []):
            errs.append(f"[systeme] école supérieure {eid} sans exigence de bac")
    for fid in S["factions"]:
        if fid not in C["factions"]:
            errs.append(f"[factions] fiche manquante pour {fid}")
    for pid in ("baron", "gnamien", "zephyrine", "yao", "aya", "gbe", "dede", "fatou", "sanogo", "traore", "maire"):
        if pid not in C["personnages"]:
            errs.append(f"[personnages] fiche maître manquante : {pid}")
    for pid, p in C["personnages"].items():
        for champ in ("nom", "role", "objectif", "savoir"):
            if champ not in p:
                errs.append(f"[personnages] {pid} : champ « {champ} » manquant")


def verifier_condition(expr, state, cat, ou, errs):
    try:
        ast = parse(expr)
        for n in names(ast):
            resolve(state, cat, n)
        return ast
    except ConditionError as e:
        errs.append(f"{ou} : condition « {expr} » invalide : {e}")


def fiches_destin(d):
    p = os.path.join(RACINE, "story", "fiches", d + ".yaml")
    return yaml.safe_load(open(p, encoding="utf8")) if os.path.exists(p) else {}


def valider_destin(story, C, errs, warns):
    d = story["destin"]
    fiches = fiches_destin(d)
    connus = set(C["personnages"]) | set(fiches)
    for pid, p in fiches.items():
        for champ in ("nom", "role", "objectif", "savoir"):
            if champ not in p:
                errs.append(f"[{d}] fiche {pid} : champ « {champ} » manquant")
    for c in story.get("cercle", []):
        if c["id"] not in connus:
            errs.append(f"[{d}] personnage du cercle sans fiche : {c['id']} (story/fiches/{d}.yaml ou personnages.yaml)")
    S = story["systeme"]
    cat = story["catalogue"]
    pre = f"[{d}]"
    inconnues = set(story) - CLES_DESTIN - {"systeme", "catalogue", "_noeuds"}
    if inconnues:
        errs.append(f"{pre} clés de destin inconnues : {sorted(inconnues)}")
    for req in ("titre", "genre", "depart", "cercle", "noeuds", "fins"):
        if req not in story:
            errs.append(f"{pre} champ obligatoire manquant : {req}")
            return
    if story["genre"] not in ("m", "f", "libre"):
        errs.append(f"{pre} genre inconnu")

    # ---- départ
    dep = story["depart"]
    if set(dep) - CLES_DEPART:
        errs.append(f"{pre} clés de départ inconnues : {sorted(set(dep) - CLES_DEPART)}")
    for k, (lo, hi) in {"compromission": (-10, 10), "etoile": (0, 100), "sante": (0, 100), "energie": (0, 100)}.items():
        v = dep.get(k, 0)
        if not isinstance(v, int) or not lo <= v <= hi:
            errs.append(f"{pre} départ : {k}={v!r} hors bornes [{lo},{hi}]")
    if not isinstance(dep.get("argent_fcfa", 0), int) or dep.get("argent_fcfa", 0) < 0:
        errs.append(f"{pre} départ : argent_fcfa doit être un entier >= 0")
    m = dep.get("metier", "aucun")
    if m != "aucun":
        if m not in S["metiers"]:
            errs.append(f"{pre} départ : métier inconnu {m}")
        else:
            cm = S["metiers"][m]["categorie"]
            if cm == "illegal" and dep.get("camp") == "propre":
                errs.append(f"{pre} départ : métier illégal {m} pour un destin « propre »")
            if cm == "illegal" and dep.get("camp") != "ombre":
                errs.append(f"{pre} départ : métier illégal sans camp « ombre »")
            if cm == "formel" and "bac" not in dep.get("diplomes", []):
                errs.append(f"{pre} départ : emploi formel {m} sans bac")
            for dd in S["metiers"][m].get("requiert", []):
                if dd not in dep.get("diplomes", []):
                    errs.append(f"{pre} départ : {m} exige {dd}")
    ec = dep.get("ecole", "aucune")
    if ec != "aucune":
        if ec not in S["ecoles"]:
            errs.append(f"{pre} départ : école inconnue {ec}")
        elif S["ecoles"][ec]["type"] == "superieur" and "bac" not in dep.get("diplomes", []):
            errs.append(f"{pre} départ : école supérieure {ec} sans bac")
    for dd in dep.get("diplomes", []):
        if dd not in S["diplomes"]:
            errs.append(f"{pre} départ : diplôme inconnu {dd}")
    for pid in dep.get("relations", {}):
        if pid not in cat.relations:
            errs.append(f"{pre} départ : relation hors cercle {pid}")
    for fid in dep.get("factions", {}):
        if fid not in cat.factions:
            errs.append(f"{pre} départ : faction inconnue {fid}")
    for pr in dep.get("preuves", []):
        if pr not in cat.preuves:
            errs.append(f"{pre} départ : preuve inconnue {pr}")
    for c in dep.get("competences", {}):
        if c not in cat.competences:
            errs.append(f"{pre} départ : compétence inconnue {c}")

    # ---- nœuds
    noeuds = story["noeuds"]
    ids = [n["id"] for n in noeuds]
    if len(ids) != len(set(ids)):
        errs.append(f"{pre} ids de nœuds dupliqués")
    fins_ids = [f["id"] for f in story["fins"]]
    if len(fins_ids) != len(set(fins_ids)):
        errs.append(f"{pre} ids de fins dupliqués")
    if set(ids) & set(fins_ids):
        errs.append(f"{pre} id partagé entre nœud et fin")
    N = story["_noeuds"]
    base = etat_initial(story)
    jalons = S["calendrier"]["jalons_communs"]
    utilises_hors_fin = {"flags": set(), "relations": set()}
    denou = [n for n in noeuds if n.get("denouement")]
    if len(denou) != 1:
        errs.append(f"{pre} il faut exactement 1 nœud de dénouement (trouvé {len(denou)})")
    elif denou[0]["jalon"] != 5:
        errs.append(f"{pre} le dénouement doit être au jalon 5")
    ctx = lambda n, c: {"story": story, "systeme": S, "cat": cat, "node": n, "choice": c}  # noqa: E731

    def check_eff(eff, ou, n, c, observe, est_issue=False):
        if eff is None:
            return
        try:
            E.apply(base.copy(), eff, ctx(n, c))
        except E.RuleError:
            pass  # règle dynamique : vérifiée par la simulation
        except E.EffectError as e:
            errs.append(f"{ou} : effet invalide : {e}")
        except (KeyError, TypeError) as e:
            errs.append(f"{ou} : effet mal formé ({type(e).__name__} {e})")
        for fid in (eff.get("factions") or {}):
            if observe is not None and fid not in observe:
                errs.append(f"{ou} : la faction « {fid} » réagit sans avoir observé (ajouter à `vu_par`)")
        met = eff.get("metier")
        if met and S["metiers"].get(met, {}).get("categorie") == "illegal" and story["depart"].get("camp") == "propre":
            if not n.get("porte"):
                errs.append(f"{ou} : métier illégal {met} hors nœud `porte: true`")
        if "diplome" in eff and not (c.get("examen") == eff["diplome"] or c.get("equivalence")):
            errs.append(f"{ou} : diplôme {eff['diplome']} sans `examen:` ni `equivalence:` sur le choix")
        for fl in eff.get("flags", []) + eff.get("flags_off", []):
            utilises_hors_fin["flags"].add(fl)
        for pid in (eff.get("relations") or {}):
            utilises_hors_fin["relations"].add(pid)

    for n in noeuds:
        nid = n["id"]
        ou = f"{pre} nœud {nid}"
        if set(n) - CLES_NOEUD:
            errs.append(f"{ou} : clés inconnues {sorted(set(n) - CLES_NOEUD)}")
        for req in ("jalon", "jour", "lieu", "moment", "objectif", "dialogue"):
            if req not in n:
                errs.append(f"{ou} : champ obligatoire manquant « {req} »")
        j = n.get("jalon", 0)
        if j not in jalons:
            errs.append(f"{ou} : jalon {j} inconnu")
        else:
            lo = jalons[j]
            hi = jalons.get(j + 1, 10 ** 9)
            if not lo <= n.get("jour", 0) < hi:
                errs.append(f"{ou} : jour {n.get('jour')} hors de la fenêtre du jalon {j} [{lo},{hi})")
        if n.get("carrefour"):
            exp = CARREFOURS.get(n["carrefour"])
            if n.get("jour") != exp:
                errs.append(f"{ou} : carrefour {n['carrefour']} doit être au jour {exp}")
        for lg in n.get("dialogue", []):
            if not ("narr" in lg or ("qui" in lg and "dit" in lg)):
                errs.append(f"{ou} : ligne de dialogue invalide {lg}")
            if lg.get("qui") and lg["qui"] not in ("radio",) and lg["qui"] not in cat.relations \
                    and lg["qui"] not in connus:
                errs.append(f"{ou} : locuteur inconnu « {lg['qui']} »")
            if lg.get("si"):
                verifier_condition(lg["si"], base, cat, ou, errs)
        for p in n.get("present", []):
            if p not in cat.relations and p not in connus:
                errs.append(f"{ou} : personnage présent inconnu « {p} »")
        if n.get("si"):
            verifier_condition(n["si"], base, cat, ou, errs)
            if n.get("sinon") not in N:
                errs.append(f"{ou} : `sinon` manquant ou inconnu (nœud à accès conditionnel)")
        if n.get("denouement"):
            if n.get("choix"):
                errs.append(f"{ou} : un dénouement n'a pas de choix")
            continue
        if not n.get("choix"):
            errs.append(f"{ou} : impasse (aucun choix)")
            continue
        cids = [c["id"] for c in n["choix"]]
        if len(cids) != len(set(cids)):
            errs.append(f"{ou} : ids de choix dupliqués")
        for c in n["choix"]:
            cou = f"{ou}/{c.get('id')}"
            if set(c) - CLES_CHOIX:
                errs.append(f"{cou} : clés inconnues {sorted(set(c) - CLES_CHOIX)}")
            for req in ("id", "l", "intention", "cout"):
                if req not in c:
                    errs.append(f"{cou} : « {req} » manquant (le joueur doit voir ce qu'il gagne et sacrifie)")
            if ("vers" in c) == ("tirage" in c):
                errs.append(f"{cou} : exactement un de `vers` ou `tirage`")
            if c.get("si"):
                verifier_condition(c["si"], base, cat, cou, errs)
            observe = set(c["vu_par"]) if "vu_par" in c else set()
            for fid in observe:
                if fid not in cat.factions:
                    errs.append(f"{cou} : vu_par faction inconnue {fid}")
            check_eff(c.get("eff"), cou, n, c, observe)
            dests = []
            if "vers" in c:
                dests.append(c["vers"])
            if "tirage" in c:
                t = c["tirage"]
                if set(t) - CLES_TIRAGE:
                    errs.append(f"{cou} : tirage, clés inconnues {sorted(set(t) - CLES_TIRAGE)}")
                diff = t.get("difficulte", 0)
                if not isinstance(diff, int) or not 0 <= diff <= 10:
                    errs.append(f"{cou} : difficulté {diff!r} hors [0,10]")
                for mo in t.get("modificateurs", []):
                    verifier_condition(mo["si"], base, cat, cou, errs)
                    if not isinstance(mo["valeur"], int):
                        errs.append(f"{cou} : modificateur non entier")
                iss = t.get("issues", {})
                if len(iss) < 2 or set(iss) - ISSUES:
                    errs.append(f"{cou} : issues invalides (au moins 2 parmi {sorted(ISSUES)})")
                sigs = set()
                for k, i in iss.items():
                    if set(i) - CLES_ISSUE:
                        errs.append(f"{cou}.{k} : clés inconnues {sorted(set(i) - CLES_ISSUE)}")
                    check_eff(i.get("eff"), f"{cou}.{k}", n, c, observe, est_issue=True)
                    dests.append(i.get("vers"))
                    sigs.add(json.dumps([i.get("eff"), i.get("vers")], sort_keys=True))
                if len(iss) >= 2 and len(sigs) == 1 and not any(i.get("txt") for i in iss.values()):
                    errs.append(f"{cou} : tirage sans effet significatif (toutes les issues sont identiques)")
                elif len(iss) >= 2 and len(sigs) == 1:
                    warns.append(f"{cou} : issues identiques hors texte (conséquence à écrire)")
            for dst in dests:
                if dst not in N:
                    errs.append(f"{cou} : destination inconnue « {dst} »")
                else:
                    dn = N[dst]
                    if dn["jalon"] < n["jalon"]:
                        errs.append(f"{cou} : retour en arrière de jalon {n['jalon']} -> {dn['jalon']}")
                    if dn["jour"] < n["jour"]:
                        errs.append(f"{cou} : le temps recule ({n['jour']} -> {dn['jour']})")
        # destination `sinon` : mêmes règles de temps
        if n.get("sinon") in N and N[n["sinon"]]["jour"] < n["jour"]:
            errs.append(f"{ou} : `sinon` fait reculer le temps")

    if story["depart"].get("camp") == "propre" and not any(n.get("porte") and n["jalon"] <= 1 for n in noeuds):
        errs.append(f"{pre} destin « propre » sans porte d'entrée vers le crime (`porte: true`) au jalon 0 ou 1")

    # ---- accessibilité structurelle
    start = noeuds[0]["id"]
    graph = {}
    for n in noeuds:
        s = set()
        if n.get("sinon"):
            s.add(n["sinon"])
        for c in n.get("choix", []):
            if "vers" in c:
                s.add(c["vers"])
            for i in c.get("tirage", {}).get("issues", {}).values():
                s.add(i.get("vers"))
        graph[n["id"]] = {x for x in s if x in N}
    seen, pile = {start}, [start]
    while pile:
        x = pile.pop()
        for y in graph.get(x, ()):
            if y not in seen:
                seen.add(y)
                pile.append(y)
    for i in ids:
        if i not in seen:
            errs.append(f"{pre} nœud inatteignable : {i}")

    # ---- événements
    evids = []
    for ev in story.get("evenements", []):
        eou = f"{pre} événement {ev.get('id')}"
        if set(ev) - CLES_EVENT:
            errs.append(f"{eou} : clés inconnues")
        evids.append(ev["id"])
        if ev.get("si"):
            verifier_condition(ev["si"], base, cat, eou, errs)
        if "jour" in ev and not (1 <= ev["jour"] <= 400):
            errs.append(f"{eou} : jour hors campagne")
        check_eff(ev.get("eff"), eou, {}, {}, None)
        check_eff(ev.get("sinon_eff"), eou, {}, {}, None)
    for n in noeuds:
        for c in n.get("choix", []):
            effs = [c.get("eff")] + [i.get("eff") for i in c.get("tirage", {}).get("issues", {}).values()]
            for eff in effs:
                for p in (eff or {}).get("planifier", []):
                    if p["event"] not in evids:
                        errs.append(f"{pre} {n['id']}/{c['id']} : événement planifié inconnu {p['event']}")

    # ---- fins
    types = [f["type"] for f in story["fins"]]
    for t in TYPES_FIN:
        if types.count(t) != 1:
            errs.append(f"{pre} il faut exactement une fin de type {t} (trouvé {types.count(t)})")
    for f in story["fins"]:
        fou = f"{pre} fin {f['id']}"
        if set(f) - CLES_FIN:
            errs.append(f"{fou} : clés inconnues {sorted(set(f) - CLES_FIN)}")
        for req in ("type", "si", "titre", "resume", "epilogue"):
            if req not in f:
                errs.append(f"{fou} : « {req} » manquant")
        ast = verifier_condition(f["si"], base, cat, fou, errs) if "si" in f else None
        if f.get("type") == "tragique" and ast is not None:
            autres = [x for x in names(ast) if x != "compromission"]
            if not autres:
                errs.append(f"{fou} : fin tragique fondée sur un simple seuil de compromission (chaîne causale requise)")
        if f.get("type") == "secrete" and ast is not None and f["si"].strip() == "true":
            errs.append(f"{fou} : fin secrète sans condition")
        for p in f.get("epilogue", []):
            if p.get("si"):
                verifier_condition(p["si"], base, cat, fou, errs)
        if len(f.get("epilogue", [])) < 2:
            warns.append(f"{fou} : épilogue court (< 2 paragraphes)")

    # ---- usages
    for fl in cat.flags:
        if fl not in utilises_hors_fin["flags"]:
            warns.append(f"{pre} flag déclaré mais jamais posé : {fl}")
    for pid in cat.relations:
        if pid not in utilises_hors_fin["relations"] and pid not in story["depart"].get("relations", {}):
            warns.append(f"{pre} relation jamais modifiée : {pid}")


def interdits(errs):
    for racine in ("story/common", "story/destins", "docs"):
        base = os.path.join(RACINE, racine)
        for dp, _, fs in os.walk(base):
            for fn in fs:
                if not fn.endswith((".yaml", ".md", ".json")) or fn in ("decisions.md", "brief_destin.md"):
                    continue  # ces docs citent les anciens noms pour les interdire
                txt = open(os.path.join(dp, fn), encoding="utf8").read()
                for pat in INTERDITS:
                    if re.search(pat, txt):
                        errs.append(f"[renommage] « {pat} » trouvé dans {os.path.relpath(os.path.join(dp, fn), RACINE)}")


def main():
    errs, warns = [], []
    C = commun()
    valider_commun(C, errs)
    rapport = []
    fich = fichiers_destins()
    for f in fich:
        try:
            story = charger_destin(f, C["systeme"])
        except Exception as e:  # noqa: BLE001
            errs.append(f"[{os.path.basename(f)}] chargement impossible : {type(e).__name__} {e}")
            continue
        valider_destin(story, C, errs, warns)
        rapport.append((story["destin"], len(story["noeuds"]),
                        sum(len(n.get("choix", [])) for n in story["noeuds"]), len(story["fins"])))
    interdits(errs)
    print(f"{len(fich)} destin(s) V1")
    for r in rapport:
        print("  %-22s nœuds=%2d choix=%2d fins=%d" % r)
    for w in warns:
        print("  avertissement :", w)
    if errs:
        print("ERREURS :")
        for e in errs:
            print("  ", e)
    else:
        print("OK : aucune erreur")
    return 1 if errs else 0


if __name__ == "__main__":
    sys.exit(main())

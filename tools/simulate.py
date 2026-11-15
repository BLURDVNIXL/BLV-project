"""Simulateur : parcourt TOUS les chemins sur l'état complet (argent, santé, bac, relations, preuves…).

Pour chaque destin :
  - aucune impasse (état où aucun choix n'est exécutable, ou dénouement sans fin disponible) ;
  - chaque fin atteignable par un état reproductible (parcours de référence enregistré) ;
  - chaque nœud et chaque choix utilisé au moins une fois ; aucun choix « toujours indisponible » ;
  - distribution exacte des fins sous politique uniforme, pour une Étoile de 0, 50 et 100.
Les parcours de référence sont écrits dans story/parcours/<destin>.json et rejoués par les tests.
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from loader import RACINE, charger_destin, commun, fichiers_destins  # noqa: E402

from engine.narrative_runner import Runner  # noqa: E402

MAX_CHEMINS = 3_000_000


def explorer(story, etoile=None):
    """Programmation dynamique sur l'état complet.
    f(état) = distribution des fins sous politique uniforme + chemin le plus court vers chaque fin.
    Les états identiques (même clé) ne sont explorés qu'une fois."""
    racine = Runner(story, seed=0, journaliser=False)
    if etoile is not None:
        racine.state.etoile = etoile
    memo = {}
    glob = {"etats": 0, "softlocks": [], "etat_vide": [], "noeuds": set(), "choix_dispo": set(),
            "choix_total": set(), "issues": set()}
    for n in story["noeuds"]:
        for c in n.get("choix", []):
            glob["choix_total"].add((n["id"], c["id"]))

    def fusion(cible, src, poids, pas):
        """Ajoute au dictionnaire `cible` la distribution `src` pondérée, avec un pas de chemin en tête."""
        for fid, (p, suffixe) in src["fins"].items():
            cur = cible["fins"].get(fid)
            chem = [pas] + suffixe
            if cur is None:
                cible["fins"][fid] = [p * poids, chem]
            else:
                cur[0] += p * poids
                if len(chem) < len(cur[1]):
                    cur[1] = chem
        for nom, (val, suffixe) in src["ext"].items():
            mieux = (lambda a, b: a < b) if nom in ("compromission_min", "sante_min") else (lambda a, b: a > b)
            cur = cible["ext"].get(nom)
            if cur is None or mieux(val, cur[0]):
                cible["ext"][nom] = (val, [pas] + suffixe)

    def rec(r):
        k = r.state.key()
        if k in memo:
            return memo[k]
        glob["etats"] += 1
        glob["noeuds"].add(r.state.noeud)
        out = {"fins": {}, "ext": {}}
        if r.est_denouement():
            fins = r.fins()
            if not fins:
                glob["etat_vide"].append(r.state.noeud)
            else:
                imposees = [f for f in fins if f.get("imposee")]
                retenues = imposees or fins
                for f in retenues:
                    out["fins"][f["id"]] = (1.0 / len(retenues), [{"fin": f["id"]}])
                s = r.state
                out["ext"] = {"compromission_max": (s.compromission, []), "compromission_min": (s.compromission, []),
                              "sante_min": (s.sante, []), "argent_max": (s.argent, [])}
            memo[k] = out
            return out
        opts = [(c, ok) for c, ok, _ in r.options()]
        dispo = [c for c, ok in opts if ok]
        for c in dispo:
            glob["choix_dispo"].add((r.state.noeud, c["id"]))
        if not dispo:
            glob["softlocks"].append(r.state.noeud)
            memo[k] = out
            return out
        nid = r.state.noeud
        for c in dispo:
            if "tirage" in c:
                for issue, pm in r.probabilites(c).items():
                    glob["issues"].add((nid, c["id"], issue))
                    r2 = Runner(story, r.state.copy(), 0, journaliser=False)
                    r2.choisir(c["id"], issue_forcee=issue)
                    fusion(out, rec(r2), (pm / 1000) / len(dispo), {"noeud": nid, "choix": c["id"], "issue": issue})
            else:
                r2 = Runner(story, r.state.copy(), 0, journaliser=False)
                r2.choisir(c["id"])
                fusion(out, rec(r2), 1.0 / len(dispo), {"noeud": nid, "choix": c["id"], "issue": None})
        memo[k] = out
        return out

    sys.setrecursionlimit(10000)
    tot = rec(racine)
    res = dict(glob)
    res["chemins"] = glob["etats"]
    res["fins"] = {fid: {"proba": p, "chemins": 1, "ref": {"chemin": chem, "fin": fid},
                          "type": next(f["type"] for f in story["fins"] if f["id"] == fid)}
                   for fid, (p, chem) in tot["fins"].items()}
    res["extremes"] = {n: {"valeur": v, "chemin": ch} for n, (v, ch) in tot["ext"].items()}
    # les chemins de référence se terminent par {"fin": id} : on le retire
    for e in res["fins"].values():
        e["ref"]["chemin"] = [x for x in e["ref"]["chemin"] if "fin" not in x]
    for e in res["extremes"].values():
        e["chemin"] = [x for x in e["chemin"] if "fin" not in x]
    res["softlocks"] = [{"noeud": n, "chemin": []} for n in glob["softlocks"]]
    res["etat_vide"] = [[] for _ in glob["etat_vide"]]
    return res


def main():
    C = commun()
    code = 0
    os.makedirs(os.path.join(RACINE, "story", "parcours"), exist_ok=True)
    filtre = set(sys.argv[1:])
    for f in fichiers_destins():
        if filtre and os.path.basename(f)[:-5] not in filtre:
            continue
        story = charger_destin(f, C["systeme"])
        d = story["destin"]
        res = explorer(story)
        tous_fins = {fi["id"]: fi["type"] for fi in story["fins"]}
        manquantes = sorted(set(tous_fins) - set(res["fins"]))
        nid_tous = {n["id"] for n in story["noeuds"]}
        jamais = sorted(res["choix_total"] - res["choix_dispo"])
        inacc = sorted(nid_tous - res["noeuds"])
        statut = "OK"
        if res["softlocks"] or res["etat_vide"] or manquantes or jamais or inacc:
            statut = "A CORRIGER"
            code = 1
        print(f"{d:22s} états={res['chemins']:7d} impasses={len(res['softlocks'])} dénouements_sans_fin={len(res['etat_vide'])}"
              f" fins_manquantes={[tous_fins[m] for m in manquantes] or '-'} [{statut}]")
        if jamais:
            print("   choix jamais disponibles :", jamais)
        if inacc:
            print("   nœuds jamais atteints :", inacc)
        for s in res["softlocks"][:3]:
            print("   impasse en", s["noeud"], "via", [(x['noeud'], x['choix'], x['issue']) for x in s['chemin']])
        for s in res["etat_vide"][:3]:
            print("   dénouement sans fin via", [(x['noeud'], x['choix'], x['issue']) for x in s])
        # distribution des fins pour Étoile 0 / 50 / 100
        dist = {}
        for e in (0, 50, 100):
            r2 = explorer(story, etoile=e) if e != story["depart"].get("etoile") else res
            dist[e] = {k: round(v["proba"] * 100, 1) for k, v in r2["fins"].items()}
        for fid, t in tous_fins.items():
            print("   %-12s %-14s P(0)=%5.1f%%  P(50)=%5.1f%%  P(100)=%5.1f%%  chemins=%s" % (
                t, fid, dist[0].get(fid, 0), dist[50].get(fid, 0), dist[100].get(fid, 0),
                res["fins"].get(fid, {}).get("chemins", 0)))
        sortie = {"destin": d, "formule": "etoile-v1", "fins": {k: v["ref"] for k, v in res["fins"].items()},
                  "extremes": res["extremes"], "distribution_pct": dist}
        with open(os.path.join(RACINE, "story", "parcours", f"{d}.json"), "w", encoding="utf8") as fh:
            json.dump(sortie, fh, ensure_ascii=False, indent=1)
    return code


if __name__ == "__main__":
    sys.exit(main())

"""Rapport de couverture reproductible (docs/rapport_couverture.md) à partir de story/parcours/*.json."""
import glob
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from loader import RACINE, charger_destin, commun, fichiers_destins  # noqa: E402


def main():
    C = commun()
    lignes = ["# Rapport de couverture (généré par tools/report.py)", "",
              "Distribution exacte des fins sous une politique de choix uniforme, pour une Étoile de 0, 50 et 100.",
              "Elle sert à repérer une fin hors d'atteinte ou écrasante ; ce n'est pas une cible d'équilibrage.", ""]
    for f in fichiers_destins():
        s = charger_destin(f, C["systeme"])
        p = os.path.join(RACINE, "story", "parcours", s["destin"] + ".json")
        if not os.path.exists(p):
            lignes += [f"## {s['destin']}", "(simulation non exécutée)", ""]
            continue
        d = json.load(open(p, encoding="utf8"))
        lignes += [f"## {s['destin']} — {s['titre']}", "",
                   f"Nœuds : {len(s['noeuds'])} · Choix : {sum(len(n.get('choix', [])) for n in s['noeuds'])} · "
                   f"Événements différés : {len(s.get('evenements', []))}", "",
                   "| Fin | Type | Étoile 0 | Étoile 50 | Étoile 100 | Parcours de référence (étapes) |",
                   "|---|---|---|---|---|---|"]
        for fin in s["fins"]:
            ref = d["fins"].get(fin["id"])
            dist = d["distribution_pct"]
            lignes.append("| %s | %s | %s %% | %s %% | %s %% | %s |" % (
                fin["titre"], fin["type"], dist["0"].get(fin["id"], 0), dist["50"].get(fin["id"], 0),
                dist["100"].get(fin["id"], 0), len(ref["chemin"]) if ref else "—"))
        lignes.append("")
    os.makedirs(os.path.join(RACINE, "docs"), exist_ok=True)
    with open(os.path.join(RACINE, "docs", "rapport_couverture.md"), "w", encoding="utf8") as fh:
        fh.write("\n".join(lignes) + "\n")
    print("docs/rapport_couverture.md écrit")


if __name__ == "__main__":
    main()

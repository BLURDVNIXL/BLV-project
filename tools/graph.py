"""Génère les schémas Mermaid des arbres (artefacts de build : jamais une source de vérité)."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from loader import RACINE, charger_destin, commun, fichiers_destins  # noqa: E402


def mermaid(story):
    out = ["flowchart TD"]
    for n in story["noeuds"]:
        etiquette = f"J{n['jalon']} j{n['jour']}: {n['id']}"
        if n.get("denouement"):
            out.append(f'  {n["id"]}(["{etiquette}"])')
        else:
            out.append(f'  {n["id"]}["{etiquette}"]')
    for n in story["noeuds"]:
        if n.get("sinon"):
            out.append(f'  {n["id"]} -. sinon .-> {n["sinon"]}')
        for c in n.get("choix", []):
            if "vers" in c:
                out.append(f'  {n["id"]} -->|{c["id"]}| {c["vers"]}')
            for k, i in c.get("tirage", {}).get("issues", {}).items():
                out.append(f'  {n["id"]} -->|{c["id"]}:{k}| {i["vers"]}')
    return "\n".join(out) + "\n"


def main():
    C = commun()
    os.makedirs(os.path.join(RACINE, "out"), exist_ok=True)
    for f in fichiers_destins():
        s = charger_destin(f, C["systeme"])
        with open(os.path.join(RACINE, "out", s["destin"] + ".mmd"), "w", encoding="utf8") as fh:
            fh.write(mermaid(s))
    print("schémas Mermaid régénérés dans out/")


if __name__ == "__main__":
    main()

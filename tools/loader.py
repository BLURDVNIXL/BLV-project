"""Chargement des fichiers d'histoire (source de vérité : story/common et story/destins)."""
import glob
import os
import sys

import yaml

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, RACINE)

from engine.narrative_runner import charger_histoire  # noqa: E402


def lire(chemin):
    with open(chemin, encoding="utf8") as f:
        return yaml.safe_load(f)


def commun():
    d = os.path.join(RACINE, "story", "common")
    return {nom: lire(os.path.join(d, nom + ".yaml"))
            for nom in ("systeme", "factions", "personnages", "projet", "chronologie", "lieux")}


def fichiers_destins():
    return sorted(glob.glob(os.path.join(RACINE, "story", "destins", "*.yaml")))


def charger_destin(chemin, systeme):
    return charger_histoire(systeme, lire(chemin))

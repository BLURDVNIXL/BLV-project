"""Choix : conditions validées avant affichage ET revalidées avant exécution."""
from . import effects as E
from .conditions import ConditionError
from .state import check


def contexte(story, node, choice):
    return {"story": story, "systeme": story["systeme"], "cat": story["catalogue"],
            "node": node, "choice": choice}


def executable(state, story, node, choice):
    """(ok, raison). L'effet immédiat est simulé sur une copie : un choix impossible
    (fonds, bac, porte illégale…) n'est jamais proposé. Les effets d'issue de tirage
    sont des conséquences subies : ils sont écrêtés à l'exécution (voir runner)."""
    cat = story["catalogue"]
    if choice.get("si"):
        try:
            if not check(state, cat, choice["si"]):
                return False, "condition non remplie"
        except ConditionError as e:
            return False, f"condition invalide : {e}"
    s2 = state.copy()
    try:
        E.apply(s2, choice.get("eff"), contexte(story, node, choice))
    except E.RuleError as e:
        return False, str(e)
    return True, ""


def options(state, story, node):
    return [(c, *executable(state, story, node, c)) for c in node.get("choix", [])]

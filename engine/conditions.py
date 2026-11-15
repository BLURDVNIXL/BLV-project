"""Parseur de conditions BLV V1 (remplace eval()).

Grammaire (priorité croissante) :
    expr   := or
    or     := and ('or' and)*
    and    := not ('and' not)*
    not    := 'not' not | cmp
    cmp    := atom (('=='|'!='|'<'|'<='|'>'|'>='|'in') atom)?
    atom   := nombre | 'chaine' | true | false | nom.pointé | [a, b] | ( expr )

Aucune fonction, aucun import, aucun attribut arbitraire : un nom est résolu
uniquement par le résolveur fourni (voir state.resolve). Tout nom inconnu lève
ConditionError, jamais une valeur par défaut silencieuse.
"""
import re
from functools import lru_cache


class ConditionError(Exception):
    pass


_TOKEN = re.compile(
    r"\s*(?:(?P<num>-?\d+(?:\.\d+)?)"
    r"|(?P<str>'[^']*'|\"[^\"]*\")"
    r"|(?P<op>==|!=|<=|>=|<|>)"
    r"|(?P<name>[A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z0-9_]+)*)"
    r"|(?P<punct>[()\[\],]))"
)
_KEYWORDS = {"and", "or", "not", "in", "true", "false"}


def _tokenize(src):
    pos, out = 0, []
    src = src.strip()
    while pos < len(src):
        m = _TOKEN.match(src, pos)
        if not m or m.end() == pos:
            raise ConditionError(f"caractère illégal dans « {src} » à la position {pos}")
        pos = m.end()
        kind = m.lastgroup
        val = m.group(kind)
        if kind == "name" and val in _KEYWORDS:
            kind = "kw"
        out.append((kind, val))
    return out


class _Parser:
    def __init__(self, toks, src):
        self.t, self.i, self.src = toks, 0, src

    def peek(self):
        return self.t[self.i] if self.i < len(self.t) else (None, None)

    def eat(self, kind=None, val=None):
        k, v = self.peek()
        if k is None or (kind and k != kind) or (val is not None and v != val):
            raise ConditionError(f"syntaxe invalide dans « {self.src} »")
        self.i += 1
        return v

    def parse(self):
        node = self.p_or()
        if self.i != len(self.t):
            raise ConditionError(f"texte en trop dans « {self.src} »")
        return node

    def p_or(self):
        n = self.p_and()
        while self.peek() == ("kw", "or"):
            self.eat()
            n = ("or", n, self.p_and())
        return n

    def p_and(self):
        n = self.p_not()
        while self.peek() == ("kw", "and"):
            self.eat()
            n = ("and", n, self.p_not())
        return n

    def p_not(self):
        if self.peek() == ("kw", "not"):
            self.eat()
            return ("not", self.p_not())
        return self.p_cmp()

    def p_cmp(self):
        a = self.p_atom()
        k, v = self.peek()
        if k == "op":
            self.eat()
            return ("cmp", v, a, self.p_atom())
        if (k, v) == ("kw", "in"):
            self.eat()
            return ("cmp", "in", a, self.p_atom())
        return a

    def p_atom(self):
        k, v = self.peek()
        if k == "num":
            self.eat()
            return ("lit", float(v) if "." in v else int(v))
        if k == "str":
            self.eat()
            return ("lit", v[1:-1])
        if k == "kw" and v in ("true", "false"):
            self.eat()
            return ("lit", v == "true")
        if k == "name":
            self.eat()
            return ("name", v)
        if (k, v) == ("punct", "("):
            self.eat()
            n = self.p_or()
            self.eat("punct", ")")
            return n
        if (k, v) == ("punct", "["):
            self.eat()
            items = []
            if self.peek() != ("punct", "]"):
                items.append(self.p_atom())
                while self.peek() == ("punct", ","):
                    self.eat()
                    items.append(self.p_atom())
            self.eat("punct", "]")
            return ("list", items)
        raise ConditionError(f"élément inattendu dans « {self.src} »")


@lru_cache(maxsize=4096)
def parse(src):
    if not isinstance(src, str) or not src.strip():
        raise ConditionError("condition vide ou non textuelle")
    return _Parser(_tokenize(src), src).parse()


def names(ast):
    """Tous les noms pointés utilisés par une condition (pour la validation)."""
    if ast[0] == "name":
        yield ast[1]
    elif ast[0] == "list":
        for x in ast[1]:
            yield from names(x)
    elif ast[0] in ("not",):
        yield from names(ast[1])
    elif ast[0] in ("and", "or"):
        yield from names(ast[1])
        yield from names(ast[2])
    elif ast[0] == "cmp":
        yield from names(ast[2])
        yield from names(ast[3])


def _ev(ast, resolve):
    t = ast[0]
    if t == "lit":
        return ast[1]
    if t == "name":
        return resolve(ast[1])
    if t == "list":
        return [_ev(x, resolve) for x in ast[1]]
    if t == "not":
        return not _truthy(_ev(ast[1], resolve))
    if t == "and":
        return _truthy(_ev(ast[1], resolve)) and _truthy(_ev(ast[2], resolve))
    if t == "or":
        return _truthy(_ev(ast[1], resolve)) or _truthy(_ev(ast[2], resolve))
    if t == "cmp":
        op, a, b = ast[1], _ev(ast[2], resolve), _ev(ast[3], resolve)
        if op == "in":
            if not isinstance(b, list):
                raise ConditionError("« in » attend une liste à droite")
            return a in b
        if op in ("==", "!="):
            return (a == b) if op == "==" else (a != b)
        num = (int, float)
        if isinstance(a, bool) or isinstance(b, bool) or not (
            isinstance(a, num) and isinstance(b, num)
        ):
            raise ConditionError(f"comparaison {op} impossible entre {a!r} et {b!r}")
        return {"<": a < b, "<=": a <= b, ">": a > b, ">=": a >= b}[op]
    raise ConditionError(f"nœud inconnu {t}")


def _truthy(v):
    if not isinstance(v, bool):
        raise ConditionError(f"valeur non booléenne dans une condition logique : {v!r}")
    return v


def evaluate(src, resolve):
    """Évalue une condition. `resolve(nom) -> valeur` ; résultat toujours bool."""
    v = _ev(parse(src), resolve)
    return _truthy(v)

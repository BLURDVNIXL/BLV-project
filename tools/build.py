"""Build reproductible : validation -> simulation -> schémas -> rapport. S'arrête à la première erreur."""
import os
import subprocess
import sys

ICI = os.path.dirname(os.path.abspath(__file__))
for etape in ("validate.py", "simulate.py", "graph.py", "report.py"):
    print(f"== {etape}")
    r = subprocess.run([sys.executable, "-I", os.path.join(ICI, etape)] + sys.argv[1:] if etape == "simulate.py"
                       else [sys.executable, "-I", os.path.join(ICI, etape)])
    if r.returncode:
        sys.exit(r.returncode)
print("BUILD OK")

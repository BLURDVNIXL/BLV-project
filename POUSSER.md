# Pousser la branche feat/histoire (depuis ton ordinateur)
unzip blv-histoire-v1-passation.zip && cd blv-v1
git branch --show-current            # feat/histoire
cd /chemin/vers/BLV-project
git remote add histoire /chemin/vers/blv-v1
git fetch histoire feat/histoire
git push origin FETCH_HEAD:refs/heads/feat/histoire   # historique indépendant, ne touche pas à main

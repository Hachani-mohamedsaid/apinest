# Guide pour pousser le projet sur Git

## ÉTAPE 1 : Installer Git (si pas déjà installé)

1. Téléchargez Git : https://git-scm.com/download/win
2. Installez Git avec les options par défaut
3. Redémarrez votre terminal/PowerShell après l'installation

## ÉTAPE 2 : Vérifier l'installation

Ouvrez un nouveau PowerShell et tapez :
```powershell
git --version
```

## ÉTAPE 3 : Configurer Git (première fois uniquement)

```powershell
git config --global user.name "Votre Nom"
git config --global user.email "votre.email@example.com"
```

## ÉTAPE 4 : Initialiser le dépôt Git

Dans le dossier du projet, exécutez :

```powershell
# Initialiser Git
git init

# Ajouter tous les fichiers
git add .

# Créer le premier commit
git commit -m "Initial commit: Fitness API avec NestJS"
```

## ÉTAPE 5 : Créer un dépôt sur GitHub

1. Allez sur https://github.com
2. Cliquez sur "New repository"
3. Donnez un nom (ex: "fitness-api")
4. **Ne cochez PAS** "Initialize with README"
5. Cliquez sur "Create repository"

## ÉTAPE 6 : Connecter et pousser sur GitHub

Après avoir créé le dépôt sur GitHub, exécutez :

```powershell
# Ajouter le remote (remplacez USERNAME et REPO_NAME par vos valeurs)
git remote add origin https://github.com/USERNAME/REPO_NAME.git

# Pousser le code
git branch -M main
git push -u origin main
```

## ÉTAPE 7 : Commandes Git utiles

```powershell
# Voir l'état des fichiers
git status

# Ajouter des fichiers modifiés
git add .

# Créer un commit
git commit -m "Description des changements"

# Pousser les changements
git push

# Voir l'historique
git log
```

## Fichiers ignorés

Le fichier `.gitignore` est déjà configuré pour ignorer :
- `node_modules/`
- `.env` (vos variables d'environnement)
- `dist/` (fichiers compilés)
- Fichiers macOS (`._*`)

## Important : Le fichier .env ne sera PAS poussé

C'est normal et sécurisé. Les variables d'environnement sensibles ne doivent pas être dans Git.
Créez un fichier `.env.example` pour montrer la structure sans les valeurs réelles.



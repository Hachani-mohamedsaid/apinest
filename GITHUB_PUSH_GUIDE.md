# Guide pour pousser le projet sur GitHub

## Étapes pour pousser votre projet fitness-api sur GitHub

### 1. Initialiser le dépôt Git (si pas déjà fait)
```bash
git init
```

### 2. Ajouter tous les fichiers au dépôt
```bash
git add .
```

### 3. Faire le premier commit
```bash
git commit -m "Initial commit: Fitness API avec NestJS"
```

### 4. Créer un nouveau dépôt sur GitHub
1. Allez sur [GitHub.com](https://github.com)
2. Cliquez sur le bouton "+" en haut à droite
3. Sélectionnez "New repository"
4. Donnez un nom à votre dépôt (ex: `fitness-api`)
5. Choisissez si vous voulez un dépôt public ou privé
6. **NE PAS** cocher "Initialize this repository with a README" (vous avez déjà des fichiers)
7. Cliquez sur "Create repository"

### 5. Ajouter le remote GitHub
Copiez l'URL de votre dépôt GitHub (ex: `https://github.com/votre-username/fitness-api.git`) et exécutez :

```bash
git remote add origin https://github.com/votre-username/fitness-api.git
```

**Note:** Remplacez `votre-username` et `fitness-api` par vos propres valeurs.

### 6. Renommer la branche principale en "main" (si nécessaire)
```bash
git branch -M main
```

### 7. Pousser le code sur GitHub
```bash
git push -u origin main
```

Vous devrez vous authentifier avec votre nom d'utilisateur et votre token GitHub.

---

## Commandes résumées (tout en une fois)

```bash
# 1. Initialiser Git
git init

# 2. Ajouter les fichiers
git add .

# 3. Premier commit
git commit -m "Initial commit: Fitness API avec NestJS"

# 4. Créer le dépôt sur GitHub (via le site web)

# 5. Ajouter le remote (remplacez par votre URL)
git remote add origin https://github.com/votre-username/fitness-api.git

# 6. Renommer la branche
git branch -M main

# 7. Pousser sur GitHub
git push -u origin main
```

---

## Pour les commits suivants

Une fois le dépôt configuré, pour pousser vos modifications futures :

```bash
# 1. Vérifier les fichiers modifiés
git status

# 2. Ajouter les fichiers modifiés
git add .

# 3. Faire un commit avec un message descriptif
git commit -m "Description de vos modifications"

# 4. Pousser sur GitHub
git push
```

---

## Notes importantes

- **Fichiers sensibles** : Assurez-vous que votre `.gitignore` exclut les fichiers `.env` contenant vos clés secrètes (c'est déjà fait dans votre projet)
- **Authentification** : GitHub nécessite maintenant un token d'accès personnel au lieu d'un mot de passe
- **Première connexion** : La première fois que vous poussez, Git vous demandera de vous authentifier

---

## En cas de problème

Si vous avez déjà un dépôt distant et voulez le remplacer :
```bash
git remote remove origin
git remote add origin https://github.com/votre-username/fitness-api.git
```


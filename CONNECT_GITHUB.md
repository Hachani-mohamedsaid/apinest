# Comment connecter votre projet à GitHub

## ✅ Ce qui est déjà fait :
- ✅ Git est initialisé
- ✅ Les fichiers sont ajoutés
- ✅ Le premier commit est créé

## 📋 Prochaines étapes :

### 1. Créer un dépôt sur GitHub

1. Allez sur **https://github.com** et connectez-vous
2. Cliquez sur le bouton **"+"** en haut à droite
3. Sélectionnez **"New repository"**
4. Donnez un nom à votre dépôt (ex: `fitness-api`)
5. Choisissez **Public** ou **Private**
6. **⚠️ IMPORTANT :** Ne cochez PAS "Initialize this repository with a README"
7. Cliquez sur **"Create repository"**

### 2. Connecter votre projet local à GitHub

Après avoir créé le dépôt, GitHub vous montrera des instructions. Utilisez l'une de ces méthodes :

#### **Méthode 1 : Via HTTPS (recommandé pour débutants)**

```bash
# Remplacez VOTRE-USERNAME et fitness-api par vos valeurs
git remote add origin https://github.com/VOTRE-USERNAME/fitness-api.git

# Renommer la branche en "main" (si nécessaire)
git branch -M main

# Pousser le code sur GitHub
git push -u origin main
```

#### **Méthode 2 : Via SSH (si vous avez configuré SSH)**

```bash
# Remplacez VOTRE-USERNAME et fitness-api par vos valeurs
git remote add origin git@github.com:VOTRE-USERNAME/fitness-api.git

# Renommer la branche en "main" (si nécessaire)
git branch -M main

# Pousser le code sur GitHub
git push -u origin main
```

### 3. Authentification

Si vous utilisez HTTPS, GitHub vous demandera de vous authentifier :
- **Nom d'utilisateur** : Votre nom d'utilisateur GitHub
- **Mot de passe** : Vous devez utiliser un **Personal Access Token** (pas votre mot de passe GitHub)

#### Pour créer un Personal Access Token :
1. Allez sur GitHub → **Settings** → **Developer settings** → **Personal access tokens** → **Tokens (classic)**
2. Cliquez sur **"Generate new token"**
3. Donnez un nom (ex: "fitness-api")
4. Sélectionnez les permissions : cochez au minimum **"repo"**
5. Cliquez sur **"Generate token"**
6. **⚠️ IMPORTANT :** Copiez le token immédiatement (vous ne pourrez plus le voir après)

Utilisez ce token comme mot de passe lors du `git push`.

---

## 🔍 Vérifier la connexion

Pour vérifier que votre projet est bien connecté à GitHub :

```bash
# Voir les remotes configurés
git remote -v
```

Vous devriez voir quelque chose comme :
```
origin  https://github.com/VOTRE-USERNAME/fitness-api.git (fetch)
origin  https://github.com/VOTRE-USERNAME/fitness-api.git (push)
```

---

## 🚀 Commandes pour les prochaines fois

Une fois connecté, pour pousser vos modifications futures :

```bash
# 1. Voir les fichiers modifiés
git status

# 2. Ajouter les fichiers modifiés
git add .

# 3. Faire un commit
git commit -m "Description de vos modifications"

# 4. Pousser sur GitHub
git push
```

---

## ❓ Problèmes courants

### "remote origin already exists"
Si vous avez déjà un remote, supprimez-le d'abord :
```bash
git remote remove origin
git remote add origin https://github.com/VOTRE-USERNAME/fitness-api.git
```

### "Authentication failed"
Assurez-vous d'utiliser un Personal Access Token et non votre mot de passe GitHub.

### La branche s'appelle "master" au lieu de "main"
C'est normal, utilisez la commande :
```bash
git branch -M main
```


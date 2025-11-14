# 🚨 Correction immédiate - Erreur MongoDB

## ❌ Erreur actuelle
```
MongooseServerSelectionError: connect ECONNREFUSED ::1:27017, connect ECONNREFUSED 127.0.0.1:27017
```

## ✅ Solution en 3 étapes

### Étape 1 : Ouvrir le fichier `.env`

Ouvrez le fichier `.env` dans votre projet (à la racine du dossier `fitness-api`).

### Étape 2 : Décommenter et configurer MONGODB_URI

Trouvez la ligne qui contient `MONGODB_URI` (elle est probablement commentée avec `#`).

**Remplacez cette ligne :**
```env
# MONGODB_URI=mongodb://localhost:27017/fitness-db
```

**Par cette ligne (utilisez votre URI MongoDB Atlas) :**
```env
MONGODB_URI=mongodb+srv://ilbab:93274190@cluster0.gajiubz.mongodb.net/fitnessNestjs?appName=Cluster0
```

**OU si vous avez votre propre URI MongoDB Atlas :**
```env
MONGODB_URI=mongodb+srv://VOTRE_USERNAME:VOTRE_PASSWORD@cluster0.xxxxx.mongodb.net/fitness-db?retryWrites=true&w=majority
```

⚠️ **Important :**
- Enlevez le `#` au début
- Remplacez `VOTRE_USERNAME` et `VOTRE_PASSWORD` par vos vraies valeurs
- Ajoutez `/fitness-db` ou `/fitnessNestjs` avant le `?`

### Étape 3 : Redémarrer l'application

Arrêtez l'application (Ctrl+C) et redémarrez-la :

```bash
npm run start:dev
```

Vous devriez voir :
```
✅ MongoDB URI configured (not localhost)
[Nest] LOG [MongooseModule] Successfully connected to the database
```

---

## 🔍 Si vous n'avez pas encore d'URI MongoDB Atlas

### Option A : Utiliser l'URI existante (si vous avez accès)

Si vous avez déjà un compte MongoDB Atlas avec ces identifiants :
```env
MONGODB_URI=mongodb+srv://ilbab:93274190@cluster0.gajiubz.mongodb.net/fitnessNestjs?appName=Cluster0
```

### Option B : Créer un nouveau cluster MongoDB Atlas (5 minutes)

1. **Allez sur** https://www.mongodb.com/cloud/atlas
2. **Créez un compte** (gratuit) ou connectez-vous
3. **Créez un cluster M0 FREE** :
   - Cliquez sur "Build a Database"
   - Choisissez "M0 FREE"
   - Sélectionnez une région
   - Cliquez sur "Create"
4. **Configurez l'accès réseau** :
   - Menu → "Network Access" → "Add IP Address"
   - Cliquez sur "Allow Access from Anywhere" (0.0.0.0/0)
5. **Créez un utilisateur** :
   - Menu → "Database Access" → "Add New Database User"
   - Nom d'utilisateur et mot de passe (notez-les !)
   - Permissions : "Atlas Admin"
6. **Obtenez l'URI** :
   - Menu → "Database" → Cliquez sur "Connect" sur votre cluster
   - Choisissez "Connect your application"
   - Copiez l'URI
7. **Dans `.env`**, mettez :
   ```env
   MONGODB_URI=mongodb+srv://VOTRE_USERNAME:VOTRE_PASSWORD@cluster0.xxxxx.mongodb.net/fitness-db?retryWrites=true&w=majority
   ```

---

## ✅ Vérification

Après avoir modifié `.env` et redémarré, vous devriez voir dans les logs :

```
✅ MongoDB URI configured (not localhost)
[Nest] LOG [MongooseModule] Successfully connected to the database
Application is running on: http://0.0.0.0:3000
```

Si vous voyez toujours l'erreur `ECONNREFUSED`, vérifiez que :
1. Le fichier `.env` est bien à la racine du projet
2. La ligne `MONGODB_URI` n'a pas de `#` au début
3. L'URI est correcte (commence par `mongodb+srv://` ou `mongodb://`)
4. Vous avez redémarré l'application après modification


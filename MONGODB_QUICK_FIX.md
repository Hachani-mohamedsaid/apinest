# 🔧 Correction rapide - Erreur MongoDB

## ❌ Problème actuel

```
MongooseServerSelectionError: connect ECONNREFUSED ::1:27017, connect ECONNREFUSED 127.0.0.1:27017
```

L'application essaie de se connecter à MongoDB en local, mais MongoDB n'est pas installé ou ne fonctionne pas.

## ✅ Solution rapide : Utiliser MongoDB Atlas (Gratuit)

### Étape 1 : Créer un compte MongoDB Atlas

1. Allez sur https://www.mongodb.com/cloud/atlas
2. Créez un compte gratuit (ou connectez-vous)

### Étape 2 : Créer un cluster gratuit

1. Cliquez sur **"Build a Database"**
2. Choisissez **"M0 FREE"** (gratuit, 512 MB)
3. Sélectionnez une région (choisissez la plus proche)
4. Cliquez sur **"Create"**

### Étape 3 : Configurer l'accès réseau

1. Dans le menu de gauche, allez dans **"Network Access"**
2. Cliquez sur **"Add IP Address"**
3. Cliquez sur **"Allow Access from Anywhere"** (ajoute `0.0.0.0/0`)
4. Cliquez sur **"Confirm"**

### Étape 4 : Créer un utilisateur

1. Dans le menu de gauche, allez dans **"Database Access"**
2. Cliquez sur **"Add New Database User"**
3. Choisissez **"Password"** comme méthode
4. Créez un nom d'utilisateur et un mot de passe (⚠️ **Notez-les bien !**)
5. Donnez les permissions **"Atlas Admin"**
6. Cliquez sur **"Add User"**

### Étape 5 : Obtenir l'URI de connexion

1. Dans le menu de gauche, cliquez sur **"Database"**
2. Cliquez sur **"Connect"** sur votre cluster
3. Choisissez **"Connect your application"**
4. Sélectionnez **"Node.js"** et la version la plus récente
5. Copiez l'URI qui ressemble à :
   ```
   mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

### Étape 6 : Configurer dans le fichier .env

1. Ouvrez le fichier `.env` dans votre projet
2. **Décommentez** la ligne `MONGODB_URI` (enlevez le `#`)
3. **Remplacez** la valeur par votre URI MongoDB Atlas
4. **Ajoutez** `/fitness-db` avant le `?` pour spécifier le nom de la base de données

**Exemple :**

Si votre URI est :
```
mongodb+srv://monuser:monpassword@cluster0.abc123.mongodb.net/?retryWrites=true&w=majority
```

Dans le fichier `.env`, mettez :
```env
MONGODB_URI=mongodb+srv://monuser:monpassword@cluster0.abc123.mongodb.net/fitness-db?retryWrites=true&w=majority
```

**⚠️ Important :**
- Remplacez `monuser` et `monpassword` par vos vraies valeurs
- Ajoutez `/fitness-db` avant le `?`
- Ne mettez pas d'espaces autour du `=`

### Étape 7 : Redémarrer l'application

```bash
npm run start:dev
```

Vous devriez voir :
```
✅ MongoDB URI configured (not localhost)
[Nest] LOG [MongooseModule] Successfully connected to the database
```

---

## 🔄 Solution alternative : Installer MongoDB localement

Si vous préférez utiliser MongoDB en local :

### Windows

1. **Téléchargez MongoDB Community Server** :
   - https://www.mongodb.com/try/download/community
   - Choisissez Windows et la version la plus récente
   - Installez avec les options par défaut

2. **Démarrez MongoDB** :
   - MongoDB devrait démarrer automatiquement comme service Windows
   - Vérifiez avec : `Get-Service -Name MongoDB`

3. **Configurez le fichier .env** :
   ```env
   MONGODB_URI=mongodb://localhost:27017/fitness-db
   ```

4. **Redémarrez l'application** :
   ```bash
   npm run start:dev
   ```

### Vérifier que MongoDB fonctionne

```powershell
# Vérifier le service
Get-Service -Name MongoDB

# Tester la connexion
mongosh mongodb://localhost:27017
```

---

## 🎯 Recommandation

**Utilisez MongoDB Atlas** (Solution 1) car :
- ✅ Gratuit (512 MB)
- ✅ Pas d'installation nécessaire
- ✅ Accessible depuis n'importe où
- ✅ Fonctionne sur Railway en production
- ✅ Sauvegarde automatique

---

## 🆘 Si ça ne fonctionne toujours pas

1. **Vérifiez que l'URI est correcte** dans `.env`
2. **Vérifiez que MongoDB Atlas autorise votre IP** (Network Access → `0.0.0.0/0`)
3. **Vérifiez que l'utilisateur existe** dans Database Access
4. **Vérifiez les logs** de l'application pour plus de détails


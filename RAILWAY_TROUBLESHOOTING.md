# 🔧 Dépannage Railway - Erreur MongoDB

## ❌ Erreur actuelle
```
MongooseServerSelectionError: connect ECONNREFUSED ::1:27017, connect ECONNREFUSED 127.0.0.1:27017
```

Cette erreur signifie que la variable `MONGODB_URI` n'est **pas configurée** ou **pas lue correctement** sur Railway.

---

## ✅ Étapes de vérification sur Railway

### 1. Vérifier que la variable MONGODB_URI existe

1. Allez sur https://railway.com
2. Sélectionnez votre projet (kind-liberation)
3. Cliquez sur votre service **"apinest"**
4. Allez dans l'onglet **"Variables"** (ou **"Environment"**)
5. Cherchez la variable `MONGODB_URI`

**Si elle n'existe pas :**
- Cliquez sur **"New Variable"** ou **"+ Add Variable"**
- Nom : `MONGODB_URI`
- Valeur : Votre URI MongoDB Atlas (voir ci-dessous)

**Si elle existe :**
- Vérifiez que la valeur est correcte
- Elle doit ressembler à : `mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/fitness-db?retryWrites=true&w=majority`

---

### 2. Obtenir votre URI MongoDB Atlas

Si vous n'avez pas encore d'URI MongoDB :

1. **Créez un compte MongoDB Atlas** (gratuit)
   - https://www.mongodb.com/cloud/atlas
   
2. **Créez un cluster M0 FREE**

3. **Configurez l'accès réseau**
   - Menu → **Network Access** → **Add IP Address** → **Allow Access from Anywhere** (`0.0.0.0/0`)

4. **Créez un utilisateur**
   - Menu → **Database Access** → **Add New Database User**
   - Nom d'utilisateur et mot de passe (notez-les !)

5. **Obtenez l'URI**
   - Menu → **Database** → Cliquez sur **"Connect"** sur votre cluster
   - Choisissez **"Connect your application"**
   - Copiez l'URI et **ajoutez `/fitness-db` avant le `?`**

Exemple :
```
mongodb+srv://monuser:monpassword@cluster0.abc123.mongodb.net/fitness-db?retryWrites=true&w=majority
```

---

### 3. Ajouter la variable sur Railway

1. Dans Railway, service **"apinest"** → **Variables**
2. Cliquez sur **"New Variable"**
3. Remplissez :
   - **Name** : `MONGODB_URI`
   - **Value** : Votre URI MongoDB complète (avec `/fitness-db`)
4. Cliquez sur **"Add"** ou **"Save"**

---

### 4. Redéployer

Après avoir ajouté/modifié la variable :

1. Railway devrait redéployer automatiquement
2. Si ce n'est pas le cas, allez dans **"Settings"** → **"Redeploy"**

---

### 5. Vérifier les logs

Après le redéploiement, vérifiez les logs :

1. Onglet **"Deploy Logs"** ou **"Logs"**
2. Vous devriez voir :
   - ✅ `✅ MongoDB URI configured (not localhost)` (si configuré correctement)
   - ✅ `[Nest] LOG [MongooseModule] Successfully connected to the database`
   
   OU
   
   - ⚠️ `⚠️  WARNING: Using localhost MongoDB...` (si la variable n'est toujours pas lue)

---

## 🔍 Vérifications supplémentaires

### Vérifier le nom de la variable

Assurez-vous que le nom est exactement :
```
MONGODB_URI
```

Pas :
- `MONGO_URI`
- `MONGODB_URL`
- `MONGO_URL`
- `mongodb_uri` (minuscules)

### Vérifier le format de l'URI

L'URI doit être au format :
```
mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/fitness-db?retryWrites=true&w=majority
```

**Points importants :**
- Commence par `mongodb+srv://` ou `mongodb://`
- Contient le nom d'utilisateur et le mot de passe
- Contient `/fitness-db` (nom de la base de données)
- Pas d'espaces avant ou après

### Vérifier que Railway redéploie

Après avoir modifié une variable :
- Railway devrait automatiquement redéployer
- Attendez 1-2 minutes
- Vérifiez les logs pour voir le nouveau déploiement

---

## 🆘 Si ça ne fonctionne toujours pas

### Option 1 : Utiliser les variables de service Railway

Si vous utilisez MongoDB Railway (service payant) :
1. Ajoutez un service MongoDB dans votre projet Railway
2. Railway créera automatiquement une variable `MONGO_URL`
3. Dans votre service API, ajoutez : `MONGODB_URI=${{MONGO.MONGO_URL}}`
   (Cela référence la variable du service MongoDB)

### Option 2 : Vérifier le code

Le code a été amélioré pour mieux lire les variables. Assurez-vous que :
1. Les modifications dans `src/app.module.ts` sont bien commitées
2. Le code est bien poussé sur GitHub
3. Railway déploie la dernière version

### Option 3 : Forcer un redéploiement

1. Dans Railway → Service **"apinest"**
2. Onglet **"Settings"**
3. Cliquez sur **"Redeploy"** ou **"Deploy Latest"**

---

## 📝 Checklist rapide

- [ ] Variable `MONGODB_URI` existe dans Railway
- [ ] La valeur contient `mongodb+srv://` ou `mongodb://`
- [ ] La valeur contient `/fitness-db` avant le `?`
- [ ] Pas d'espaces dans l'URI
- [ ] MongoDB Atlas autorise l'accès depuis toutes les IPs (`0.0.0.0/0`)
- [ ] Railway a redéployé après la modification
- [ ] Les logs montrent "MongoDB URI configured (not localhost)"
- [ ] Les logs montrent "Successfully connected to the database"

---

## 💡 Conseil

Après avoir ajouté la variable `MONGODB_URI` sur Railway, attendez 1-2 minutes et vérifiez les logs. Si vous voyez toujours l'erreur `localhost:27017`, cela signifie que la variable n'est toujours pas lue. Dans ce cas :

1. Vérifiez que le nom de la variable est exactement `MONGODB_URI`
2. Vérifiez qu'il n'y a pas d'espaces avant/après
3. Redéployez manuellement depuis Railway


# Configuration de MONGODB_URI sur Railway

## 🔧 Étapes pour ajouter la variable d'environnement

### 1. Sur Railway

1. **Allez sur https://railway.com**
2. **Sélectionnez votre projet** (kind-liberation)
3. **Cliquez sur le service "apinest"**
4. **Allez dans l'onglet "Variables"** (ou "Environment Variables")
5. **Cliquez sur "New Variable"** ou **"+ Add Variable"**

### 2. Ajoutez la variable

**Nom de la variable :**
```
MONGODB_URI
```

**Valeur de la variable :**
```
mongodb+srv://ilbab:93274190@cluster0.gajiubz.mongodb.net/fitnessNestjs?appName=Cluster0
```

⚠️ **Important :**
- Le nom doit être exactement `MONGODB_URI` (en majuscules)
- Pas d'espaces avant ou après
- Copiez-collez exactement l'URI ci-dessus

### 3. Sauvegarder

- Cliquez sur **"Add"** ou **"Save"**
- Railway redéploiera automatiquement votre application

### 4. Vérifier les logs

Après le redéploiement (1-2 minutes), vérifiez les logs :
- Vous devriez voir : `✅ MongoDB URI configured (not localhost)`
- Puis : `[Nest] LOG [MongooseModule] Successfully connected to the database`

---

## 🔍 Si ça ne fonctionne toujours pas

### Vérifier que la variable est bien ajoutée

1. Retournez dans **Variables**
2. Cherchez `MONGODB_URI`
3. Vérifiez que la valeur est exactement :
   ```
   mongodb+srv://ilbab:93274190@cluster0.gajiubz.mongodb.net/fitnessNestjs?appName=Cluster0
   ```

### Vérifier MongoDB Atlas

1. Allez sur https://cloud.mongodb.com
2. Vérifiez que votre cluster est actif
3. Allez dans **Network Access** → Vérifiez que `0.0.0.0/0` est autorisé
4. Allez dans **Database Access** → Vérifiez que l'utilisateur `ilbab` existe

### Forcer un redéploiement

1. Dans Railway → Service "apinest"
2. Onglet **"Settings"**
3. Cliquez sur **"Redeploy"** ou **"Deploy Latest"**

---

## 📝 Note sur la base de données

Votre URI utilise `fitnessNestjs` comme nom de base de données. C'est correct ! Si vous voulez utiliser `fitness-db` à la place, changez l'URI en :

```
mongodb+srv://ilbab:93274190@cluster0.gajiubz.mongodb.net/fitness-db?appName=Cluster0
```

Mais `fitnessNestjs` fonctionnera parfaitement aussi.


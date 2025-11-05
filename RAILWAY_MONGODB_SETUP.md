# Configuration MongoDB sur Railway

## 🚨 Problème actuel
Votre application essaie de se connecter à `localhost:27017`, ce qui ne fonctionne pas sur Railway car MongoDB n'est pas sur la même machine.

## ✅ Solution : Configurer MongoDB sur Railway

Vous avez **deux options** :

---

## Option 1 : Utiliser MongoDB Atlas (RECOMMANDÉ - Gratuit)

MongoDB Atlas offre un cluster gratuit de 512 MB.

### Étapes :

1. **Créer un compte MongoDB Atlas**
   - Allez sur https://www.mongodb.com/cloud/atlas
   - Créez un compte gratuit

2. **Créer un cluster**
   - Cliquez sur "Build a Database"
   - Choisissez "M0 FREE" (gratuit)
   - Sélectionnez une région proche
   - Cliquez sur "Create"

3. **Configurer l'accès réseau**
   - Dans le menu de gauche, allez dans **"Network Access"**
   - Cliquez sur **"Add IP Address"**
   - Cliquez sur **"Allow Access from Anywhere"** (ou ajoutez `0.0.0.0/0`)
   - Cliquez sur "Confirm"

4. **Créer un utilisateur de base de données**
   - Dans le menu de gauche, allez dans **"Database Access"**
   - Cliquez sur **"Add New Database User"**
   - Choisissez "Password" comme méthode d'authentification
   - Créez un nom d'utilisateur et un mot de passe (notez-les bien !)
   - Donnez les permissions "Atlas Admin" ou "Read and write to any database"
   - Cliquez sur "Add User"

5. **Obtenir l'URI de connexion**
   - Dans le menu de gauche, cliquez sur **"Database"**
   - Cliquez sur **"Connect"** sur votre cluster
   - Choisissez **"Connect your application"**
   - Sélectionnez **"Node.js"** et la version la plus récente
   - Copiez l'URI qui ressemble à :
     ```
     mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
     ```

6. **Configurer sur Railway**
   - Dans votre projet Railway, allez dans l'onglet **"Variables"**
   - Cliquez sur **"New Variable"**
   - Nom de la variable : `MONGODB_URI`
   - Valeur : Collez votre URI MongoDB Atlas, mais **ajoutez le nom de la base de données** :
     ```
     mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/fitness-db?retryWrites=true&w=majority
     ```
     **Important :** Ajoutez `/fitness-db` avant le `?` pour créer/utiliser la base de données "fitness-db"
   - Cliquez sur "Add"

7. **Redéployer**
   - Railway redéploiera automatiquement votre application
   - Vérifiez les logs pour confirmer la connexion

---

## Option 2 : Utiliser MongoDB Railway (Payant)

Railway offre un service MongoDB intégré.

### Étapes :

1. **Ajouter MongoDB sur Railway**
   - Dans votre projet Railway, cliquez sur **"New"** ou **"+"**
   - Sélectionnez **"Database"** → **"Add MongoDB"**
   - Railway créera automatiquement un service MongoDB

2. **Obtenir l'URI de connexion**
   - Cliquez sur le service MongoDB créé
   - Allez dans l'onglet **"Variables"**
   - Copiez la variable `MONGO_URL` ou `MONGODB_URL`

3. **Configurer la variable d'environnement**
   - Allez dans votre service API (apinest)
   - Allez dans l'onglet **"Variables"**
   - Cliquez sur **"New Variable"**
   - Nom : `MONGODB_URI`
   - Valeur : Collez l'URI MongoDB de Railway (elle devrait ressembler à `mongodb://mongo...`)
   - Cliquez sur "Add"

4. **Redéployer**
   - Railway redéploiera automatiquement

---

## 🔍 Vérifier que ça fonctionne

Après avoir configuré MongoDB, vérifiez les logs Railway :

1. Allez dans votre service sur Railway
2. Cliquez sur l'onglet **"Deploy Logs"**
3. Vous devriez voir :
   ```
   [Nest] LOG [MongooseModule] Successfully connected to the database
   ```
   Au lieu des erreurs de connexion.

---

## 📝 Configuration complète des variables d'environnement sur Railway

Variables d'environnement à configurer sur Railway pour votre service API :

### Variables OBLIGATOIRES :

1. **MONGODB_URI** (OBLIGATOIRE)
   ```
   mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/fitness-db?retryWrites=true&w=majority
   ```
   - Remplacez `username`, `password` et `cluster0.xxxxx` par vos valeurs MongoDB Atlas
   - Ajoutez `/fitness-db` pour spécifier le nom de la base de données

2. **JWT_SECRET** (Recommandé pour la production)
   ```
   JWT_SECRET=un-secret-tres-long-et-aleatoire-pour-signer-les-tokens-jwt
   ```
   - Générez une chaîne aléatoire sécurisée (minimum 32 caractères)
   - Vous pouvez utiliser : `openssl rand -base64 32` ou un générateur en ligne

### Variables OPTIONNELLES :

3. **PORT** (Optionnel - Railway définit automatiquement)
   ```
   PORT=3000
   ```
   - Railway définit automatiquement le PORT, mais vous pouvez le spécifier

4. **JWT_EXPIRES_IN** (Optionnel - défaut: 7d)
   ```
   JWT_EXPIRES_IN=7d
   ```
   - Durée de validité des tokens JWT (ex: 1h, 24h, 7d, 30d)

5. **APP_URL** (Optionnel - pour les emails de vérification)
   ```
   APP_URL=https://votre-app.railway.app
   ```
   - URL publique de votre application sur Railway
   - Utilisé pour les liens dans les emails (verification, reset password)

### Comment ajouter les variables sur Railway :

1. Allez dans votre projet Railway
2. Cliquez sur votre service API (apinest)
3. Allez dans l'onglet **"Variables"**
4. Cliquez sur **"New Variable"** pour chaque variable
5. Entrez le **Nom** et la **Valeur**
6. Railway redéploiera automatiquement votre application

---

## ⚠️ Important

- **Ne jamais** commiter le fichier `.env` avec vos vraies credentials
- Utilisez toujours les **Variables d'environnement** sur Railway
- Pour MongoDB Atlas, assurez-vous que l'accès réseau est configuré (`0.0.0.0/0` pour autoriser toutes les IPs)

---

## 🆘 En cas de problème

Si vous voyez encore des erreurs de connexion :

1. Vérifiez que la variable `MONGODB_URI` est bien définie sur Railway
2. Vérifiez que l'URI contient le nom de la base de données (`/fitness-db`)
3. Vérifiez que MongoDB Atlas autorise l'accès depuis toutes les IPs
4. Vérifiez que le nom d'utilisateur et le mot de passe sont corrects dans l'URI


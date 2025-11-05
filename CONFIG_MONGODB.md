# Configuration MongoDB en ligne

## Comment obtenir votre URI MongoDB (MongoDB Atlas)

### 1. Connectez-vous à MongoDB Atlas
- Allez sur https://www.mongodb.com/cloud/atlas
- Connectez-vous à votre compte

### 2. Obtenez votre URI de connexion
1. Cliquez sur **"Connect"** sur votre cluster
2. Choisissez **"Connect your application"**
3. Sélectionnez **"Node.js"** comme driver
4. Copiez l'URI qui ressemble à :
   ```
   mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

### 3. Modifiez le fichier .env
Ouvrez le fichier `.env` et remplacez :
```env
MONGODB_URI=mongodb+srv://VOTRE_USERNAME:VOTRE_PASSWORD@cluster0.xxxxx.mongodb.net/fitness-db?retryWrites=true&w=majority
```

**Important :**
- Remplacez `VOTRE_USERNAME` par votre nom d'utilisateur MongoDB
- Remplacez `VOTRE_PASSWORD` par votre mot de passe MongoDB
- Remplacez `cluster0.xxxxx.mongodb.net` par votre URL de cluster
- Ajoutez `/fitness-db` avant le `?` pour créer/utiliser la base de données "fitness-db"

### 4. Exemple complet
Si votre URI est :
```
mongodb+srv://monuser:monpassword123@cluster0.abc123.mongodb.net/?retryWrites=true&w=majority
```

Dans le fichier `.env`, mettez :
```env
MONGODB_URI=mongodb+srv://monuser:monpassword123@cluster0.abc123.mongodb.net/fitness-db?retryWrites=true&w=majority
```

### 5. Vérifiez l'accès réseau
- Dans MongoDB Atlas, allez dans **Network Access**
- Assurez-vous que votre IP est autorisée ou ajoutez `0.0.0.0/0` (toutes les IPs) pour le développement

### 6. Redémarrez l'application
Après avoir modifié le fichier `.env`, redémarrez l'application :
```bash
npm run start:dev
```

## Autres services MongoDB en ligne

Si vous utilisez un autre service (MongoDB Atlas, MongoDB Compass Cloud, etc.), l'URI sera similaire. Assurez-vous simplement que :
- L'URI commence par `mongodb://` ou `mongodb+srv://`
- Elle contient votre username et password
- Le port est correct (27017 ou spécifié dans l'URI)


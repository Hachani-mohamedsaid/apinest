# Guide MongoDB Desktop

## Si vous avez installé MongoDB Compass (Interface Graphique)

### Pour se connecter à MongoDB Atlas (en ligne) :

1. **Ouvrez MongoDB Compass**
2. **Collez votre URI MongoDB Atlas** :
   ```
   mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
   (Remplacez username, password et cluster0.xxxxx par vos valeurs)
3. **Cliquez sur "Connect"**

### Pour se connecter à MongoDB local :

1. **Ouvrez MongoDB Compass**
2. **Collez cette URI** :
   ```
   mongodb://localhost:27017
   ```
3. **Cliquez sur "Connect"**

---

## Si vous avez installé MongoDB Community Server (Serveur local)

### 1. Installer MongoDB Community Server

Suivez l'installation normale. MongoDB démarrera automatiquement en service Windows.

### 2. Vérifier que MongoDB est en cours d'exécution

Dans PowerShell :
```powershell
Get-Service -Name MongoDB
```

### 3. Modifier le fichier `.env`

Dans votre fichier `.env`, mettez :
```env
MONGODB_URI=mongodb://localhost:27017/fitness-db
```

### 4. Redémarrer l'application

```bash
npm run start:dev
```

---

## Quelle option choisir ?

- **MongoDB Atlas (en ligne)** : Plus facile, pas d'installation, accessible partout
- **MongoDB Local** : Plus rapide, pas de dépendance internet, gratuit

Si vous voulez utiliser MongoDB local, modifiez simplement le fichier `.env` avec :
```env
MONGODB_URI=mongodb://localhost:27017/fitness-db
```


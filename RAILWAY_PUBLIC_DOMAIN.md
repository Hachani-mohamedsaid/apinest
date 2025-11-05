# Configuration du domaine public sur Railway

## 🚨 Problème actuel

Votre application démarre correctement mais retourne une erreur **404 "Application not found"** quand vous essayez d'y accéder via l'URL publique.

## ✅ Solution : Configurer un domaine public sur Railway

### 1. Vérifier que l'application écoute correctement

Le code a été mis à jour pour écouter sur `0.0.0.0` (toutes les interfaces réseau) au lieu de seulement `localhost`. Cela permet à Railway de router le trafic vers votre application.

### 2. Configurer un domaine public sur Railway

1. **Allez sur Railway** → Votre projet → Service "apinest"
2. Allez dans l'onglet **"Settings"** (ou **"Network"**)
3. Cherchez la section **"Networking"** ou **"Public Domain"**
4. Cliquez sur **"Generate Domain"** ou **"Add Domain"**
5. Railway générera automatiquement un domaine comme :
   - `apinest-production.up.railway.app`
   - Ou un domaine personnalisé si vous en avez un

### 3. Vérifier le port

Railway définit automatiquement la variable `PORT`. Votre application devrait :
- Lire `process.env.PORT` (Railway le définit automatiquement)
- Écouter sur `0.0.0.0` (pas seulement `localhost`)

Le code a été mis à jour pour faire cela.

### 4. Vérifier les logs

Après avoir configuré le domaine public, vérifiez les logs :
- Vous devriez voir : `Application is running on: http://0.0.0.0:8080` (ou le port défini par Railway)
- L'application devrait être accessible via l'URL publique

---

## 🔍 Étapes détaillées sur Railway

### Méthode 1 : Via Settings

1. **Service "apinest"** → **"Settings"**
2. Section **"Networking"**
3. Cliquez sur **"Generate Domain"**
4. Railway créera un domaine comme `apinest-production-xxxxx.up.railway.app`
5. Copiez cette URL

### Méthode 2 : Via l'onglet Network (si disponible)

1. **Service "apinest"** → **"Network"** ou **"Public"**
2. Cliquez sur **"Generate Domain"**
3. Le domaine sera créé automatiquement

---

## 📝 Important

### Variables d'environnement à vérifier

Sur Railway, dans les **Variables** de votre service :

1. **PORT** - Railway le définit automatiquement, vous n'avez pas besoin de le définir manuellement
2. **MONGODB_URI** - Doit être configuré (vous l'avez déjà fait)

### Vérifier que l'application écoute correctement

Dans les logs Railway, vous devriez voir :
```
Application is running on: http://0.0.0.0:8080
Application is accessible on port: 8080
```

Si vous voyez `localhost` au lieu de `0.0.0.0`, l'application ne sera pas accessible depuis l'extérieur.

---

## 🧪 Tester l'API

Une fois le domaine public configuré, testez avec Postman :

**URL :** `https://votre-domaine.up.railway.app/auth/register`

**Méthode :** `POST`

**Body (JSON) :**
```json
{
  "email": "test@example.com",
  "password": "password123",
  "name": "Test User",
  "location": "Paris, France"
}
```

---

## 🆘 Si ça ne fonctionne toujours pas

### Vérifier que le domaine est actif

1. Dans Railway → Service "apinest" → Settings
2. Vérifiez que le domaine public est bien **"Active"** ou **"Enabled"**

### Vérifier les logs

1. Onglet **"Deploy Logs"**
2. Vérifiez que l'application démarre sans erreur
3. Vérifiez que vous voyez : `Application is running on: http://0.0.0.0:XXXX`

### Vérifier le health check

Testez l'endpoint de santé :
```
https://votre-domaine.up.railway.app/health
```

Cela devrait retourner une réponse JSON si l'application fonctionne.

---

## 📌 Résumé

1. ✅ Code mis à jour pour écouter sur `0.0.0.0`
2. ⏳ **À faire :** Configurer un domaine public sur Railway
3. ⏳ **À faire :** Tester l'API avec Postman

Une fois le domaine public configuré, votre API sera accessible publiquement !


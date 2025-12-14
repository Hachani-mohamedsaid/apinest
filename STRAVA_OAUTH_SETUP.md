# 🔧 Configuration Strava OAuth - Guide Complet

## ❌ Erreur Actuelle

```
Strava OAuth not configured on server
```

Cette erreur signifie que les variables d'environnement Strava ne sont pas configurées sur Railway.

---

## ✅ Solution : Configurer Strava OAuth

### Étape 1 : Créer une Application Strava

1. **Allez sur https://www.strava.com/settings/api**

2. **Connectez-vous** à votre compte Strava (ou créez-en un)

3. **Cliquez sur "Create New App"** ou "My API Application"

4. **Remplissez le formulaire :**
   - **Application Name** : `Nexo Fitness` (ou le nom de votre choix)
   - **Category** : `Training`
   - **Club** : (optionnel)
   - **Website** : `https://apinest-production.up.railway.app` (votre URL backend)
   - **Application Description** : `Fitness app integration with Strava`
   - **Authorization Callback Domain** : `apinest-production.up.railway.app` ⚠️ **IMPORTANT**

5. **Cliquez sur "Create"**

6. **Copiez les informations suivantes :**
   - **Client ID** (ex: `12345`)
   - **Client Secret** (ex: `abcdef1234567890abcdef1234567890abcdef12`)

---

### Étape 2 : Configurer les Variables sur Railway

1. **Allez sur https://railway.com**

2. **Sélectionnez votre projet** (ex: `kind-liberation`)

3. **Cliquez sur votre service** `apinest`

4. **Allez dans l'onglet "Variables"** (ou "Environment")

5. **Ajoutez les deux variables suivantes :**

   #### Variable 1 : `STRAVA_CLIENT_ID`
   - **Nom :** `STRAVA_CLIENT_ID`
   - **Valeur :** Votre Client ID Strava (ex: `12345`)

   #### Variable 2 : `STRAVA_CLIENT_SECRET`
   - **Nom :** `STRAVA_CLIENT_SECRET`
   - **Valeur :** Votre Client Secret Strava (ex: `abcdef1234567890abcdef1234567890abcdef12`)

6. **Railway redéploiera automatiquement** votre application

---

### Étape 3 : Vérifier la Configuration

Après le redéploiement, vérifiez les logs Railway. Vous devriez voir :

```
✅ Strava service initialized
```

Si vous voyez toujours :
```
⚠️ STRAVA_CLIENT_ID or STRAVA_CLIENT_SECRET not configured
```

Vérifiez que :
- Les noms des variables sont **exactement** `STRAVA_CLIENT_ID` et `STRAVA_CLIENT_SECRET` (sensible à la casse)
- Les valeurs sont correctes (pas d'espaces avant/après)
- Railway a bien redéployé l'application

---

## 📋 Checklist de Configuration

- [ ] Compte Strava créé
- [ ] Application Strava créée sur https://www.strava.com/settings/api
- [ ] Client ID copié
- [ ] Client Secret copié
- [ ] Variable `STRAVA_CLIENT_ID` ajoutée sur Railway
- [ ] Variable `STRAVA_CLIENT_SECRET` ajoutée sur Railway
- [ ] Application redéployée sur Railway
- [ ] Logs vérifiés (message "✅ Strava service initialized")

---

## 🔗 URL de Callback Strava

Dans votre application Strava, configurez :

**Authorization Callback Domain :**
```
apinest-production.up.railway.app
```

**Authorization Callback URL :**
```
https://apinest-production.up.railway.app/strava/callback
```

---

## 🧪 Test de l'Intégration

### 1. Test du Callback (GET)

**URL de test :**
```
https://apinest-production.up.railway.app/strava/callback?code=TEST_CODE
```

**Résultat attendu :**
- Redirection 302 vers `nexofitness://strava/callback?code=TEST_CODE`

### 2. Test de l'Échange de Token (POST)

**Endpoint :**
```
POST https://apinest-production.up.railway.app/strava/oauth/callback
```

**Headers :**
```
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
```

**Body :**
```json
{
  "code": "REAL_AUTH_CODE_FROM_STRAVA"
}
```

**Résultat attendu (200) :**
```json
{
  "message": "Strava account connected successfully"
}
```

---

## ⚠️ Notes Importantes

1. **Client Secret** : Ne partagez JAMAIS votre Client Secret publiquement
2. **Callback Domain** : Doit correspondre exactement au domaine de votre backend
3. **Variables d'environnement** : Ne les ajoutez JAMAIS dans le code source, utilisez toujours Railway Variables
4. **Redéploiement** : Railway redéploie automatiquement après l'ajout de variables

---

## 🐛 Dépannage

### Erreur : "Strava OAuth not configured on server"

**Cause :** Variables d'environnement manquantes ou incorrectes

**Solution :**
1. Vérifiez que les variables existent sur Railway
2. Vérifiez l'orthographe exacte des noms
3. Vérifiez que les valeurs sont correctes
4. Attendez le redéploiement complet

---

### Erreur : "Invalid response from Strava"

**Cause :** Code d'autorisation invalide ou expiré

**Solution :**
1. Vérifiez que le code n'a pas expiré (les codes Strava expirent rapidement)
2. Vérifiez que le code provient bien de Strava
3. Réessayez avec un nouveau code

---

### Erreur : "Failed to exchange Strava authorization code"

**Cause :** Problème de communication avec l'API Strava

**Solution :**
1. Vérifiez que votre Client ID et Client Secret sont corrects
2. Vérifiez que votre application Strava est active
3. Vérifiez les logs Railway pour plus de détails

---

## 📚 Ressources

- **Documentation Strava OAuth :** https://developers.strava.com/docs/authentication/
- **Strava API Settings :** https://www.strava.com/settings/api
- **Railway Variables :** https://docs.railway.app/develop/variables

---

*Guide de configuration Strava OAuth - Tous les endpoints sont prêts, il ne reste plus qu'à configurer les credentials !*


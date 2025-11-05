# Guide de test - Forgot Password dans Postman

## 📋 Prérequis

Avant de tester, assurez-vous que :
1. ✅ Les variables d'environnement Gmail sont configurées sur Railway
2. ✅ Un utilisateur existe dans la base de données (via `/auth/register`)
3. ✅ Votre application est déployée et accessible

---

## 🧪 Test 1 : Forgot Password (Demander la réinitialisation)

### Étape 1 : Créer la requête

1. **Ouvrez Postman**
2. **Créez une nouvelle requête** (ou cliquez sur "New" → "HTTP Request")
3. **Sélectionnez la méthode** : `POST`
4. **Entrez l'URL** :
   ```
   https://votre-domaine.up.railway.app/auth/forgot-password
   ```
   Remplacez `votre-domaine.up.railway.app` par votre vraie URL Railway

### Étape 2 : Configurer les Headers

1. Allez dans l'onglet **"Headers"**
2. Ajoutez :
   - **Key** : `Content-Type`
   - **Value** : `application/json`
   - Cliquez sur **"Add"** ou **"Save"**

### Étape 3 : Configurer le Body

1. Allez dans l'onglet **"Body"**
2. Sélectionnez **"raw"**
3. Dans le menu déroulant à droite, sélectionnez **"JSON"**
4. Entrez le JSON suivant :
   ```json
   {
     "email": "votre-email@example.com"
   }
   ```
   ⚠️ **Important** : Utilisez un email qui existe dans votre base de données !

### Étape 4 : Envoyer la requête

1. Cliquez sur le bouton **"Send"** (bleu)
2. Attendez la réponse

### Réponse attendue (succès)

**Status :** `200 OK`

**Body (JSON) :**
```json
{
  "message": "If the email exists, a password reset link has been sent."
}
```

### Vérifier l'email

1. **Ouvrez votre boîte mail** (celle utilisée dans `GMAIL_USER`)
2. **Vérifiez les spams** si nécessaire
3. Vous devriez recevoir un email avec :
   - **Sujet** : "Réinitialisation de mot de passe"
   - **Contenu** : Un lien comme `https://votre-domaine.up.railway.app/auth/reset-password?token=abc123...`

### Récupérer le token

1. **Ouvrez l'email**
2. **Copiez le token** depuis l'URL du lien
   - Le token est la partie après `?token=`
   - Exemple : Si le lien est `https://.../auth/reset-password?token=abc123def456`, le token est `abc123def456`

---

## 🧪 Test 2 : Reset Password (Réinitialiser le mot de passe)

### Étape 1 : Créer la requête

1. **Créez une nouvelle requête** dans Postman
2. **Sélectionnez la méthode** : `POST`
3. **Entrez l'URL** :
   ```
   https://votre-domaine.up.railway.app/auth/reset-password
   ```

### Étape 2 : Configurer les Headers

1. Allez dans l'onglet **"Headers"**
2. Ajoutez :
   - **Key** : `Content-Type`
   - **Value** : `application/json`

### Étape 3 : Configurer le Body

1. Allez dans l'onglet **"Body"**
2. Sélectionnez **"raw"**
3. Sélectionnez **"JSON"**
4. Entrez le JSON suivant :
   ```json
   {
     "token": "COLEZ-LE-TOKEN-ICI",
     "password": "nouveau-mot-de-passe-123"
   }
   ```
   ⚠️ **Important** :
   - Remplacez `COLEZ-LE-TOKEN-ICI` par le token reçu dans l'email
   - Le mot de passe doit faire au moins 6 caractères

### Étape 4 : Envoyer la requête

1. Cliquez sur **"Send"**
2. Attendez la réponse

### Réponse attendue (succès)

**Status :** `200 OK`

**Body (JSON) :**
```json
{
  "message": "Password has been reset successfully"
}
```

### Vérifier que ça fonctionne

1. **Testez le login** avec le nouveau mot de passe :
   - `POST /auth/login`
   - Email : votre email
   - Password : le nouveau mot de passe que vous venez de définir

---

## 📸 Exemple complet dans Postman

### Requête 1 : Forgot Password

```
POST https://apinest-production.up.railway.app/auth/forgot-password
Headers:
  Content-Type: application/json

Body (raw JSON):
{
  "email": "test@example.com"
}
```

### Requête 2 : Reset Password

```
POST https://apinest-production.up.railway.app/auth/reset-password
Headers:
  Content-Type: application/json

Body (raw JSON):
{
  "token": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6",
  "password": "nouveau-mot-de-passe-123"
}
```

---

## ⚠️ Erreurs courantes

### Erreur 1 : "Failed to send reset email"

**Cause :** Configuration Gmail incorrecte

**Solution :**
- Vérifiez que `GMAIL_USER` et `GMAIL_APP_PASSWORD` sont corrects sur Railway
- Vérifiez les logs Railway pour voir l'erreur exacte

### Erreur 2 : "Invalid or expired reset token"

**Cause :**
- Token expiré (valide 1 heure)
- Token déjà utilisé
- Token invalide

**Solution :**
- Demandez une nouvelle réinitialisation
- Utilisez le token dans les 60 minutes

### Erreur 3 : Email non reçu

**Cause :**
- Email dans les spams
- Configuration SMTP incorrecte
- Rate limiting Gmail

**Solution :**
- Vérifiez les spams
- Vérifiez les logs Railway
- Attendez quelques minutes

### Erreur 4 : "Validation failed"

**Cause :** Format de données incorrect

**Solution :**
- Vérifiez que le JSON est valide
- Vérifiez que l'email est au bon format
- Vérifiez que le mot de passe fait au moins 6 caractères

---

## 🎯 Checklist de test

- [ ] Configuration Gmail sur Railway (GMAIL_USER, GMAIL_APP_PASSWORD)
- [ ] URL de base correcte dans Postman
- [ ] Un utilisateur existe dans la base de données
- [ ] Requête Forgot Password envoyée avec succès (200 OK)
- [ ] Email reçu dans la boîte mail
- [ ] Token copié depuis l'email
- [ ] Requête Reset Password envoyée avec succès (200 OK)
- [ ] Login fonctionne avec le nouveau mot de passe

---

## 💡 Astuce : Utiliser des variables Postman

Pour éviter de répéter l'URL :

1. **Créez un Environment** dans Postman :
   - Cliquez sur "Environments" (en haut à gauche)
   - Cliquez sur "+" pour créer un nouvel environnement
   - Nommez-le "Fitness API Production"

2. **Ajoutez des variables** :
   - `base_url` = `https://votre-domaine.up.railway.app`
   - `user_email` = `test@example.com`

3. **Utilisez les variables** :
   - URL : `{{base_url}}/auth/forgot-password`
   - Body : `{"email": "{{user_email}}"}`

---

## 📝 Résumé rapide

### Forgot Password
1. POST → `/auth/forgot-password`
2. Body : `{"email": "votre-email"}`
3. Vérifier l'email reçu
4. Copier le token

### Reset Password
1. POST → `/auth/reset-password`
2. Body : `{"token": "token-email", "password": "nouveau-password"}`
3. Tester le login avec le nouveau mot de passe

---

**C'est tout !** 🚀

Si vous avez des problèmes, vérifiez les logs Railway ou consultez le guide `GMAIL_SMTP_SETUP.md`.


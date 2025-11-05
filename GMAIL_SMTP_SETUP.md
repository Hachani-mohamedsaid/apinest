# Configuration Gmail SMTP pour la réinitialisation de mot de passe

## 📧 Configuration Gmail

### 1. Créer un App Password Gmail

Gmail nécessite un **App Password** (mot de passe d'application) pour l'authentification SMTP. Voici comment l'obtenir :

#### Étapes :

1. **Activer la vérification en deux étapes**
   - Allez sur https://myaccount.google.com/security
   - Dans la section "Connexion à Google", activez la **"Vérification en deux étapes"**
   - Suivez les instructions pour configurer la vérification en deux étapes

2. **Générer un App Password**
   - Toujours sur https://myaccount.google.com/security
   - Dans la section "Connexion à Google", cherchez **"Mots de passe des applications"**
   - Cliquez sur **"Mots de passe des applications"**
   - Sélectionnez **"Autre (nom personnalisé)"** et donnez un nom (ex: "Fitness API")
   - Cliquez sur **"Générer"**
   - **Copiez le mot de passe généré** (16 caractères) - vous ne pourrez plus le voir après !

### 2. Configurer les variables d'environnement

Ajoutez ces variables dans votre fichier `.env` (local) et sur Railway :

#### Variables nécessaires :

```env
# Gmail SMTP Configuration
GMAIL_USER=votre-email@gmail.com
GMAIL_APP_PASSWORD=votre-app-password-16-caracteres

# URL de l'application (pour les liens dans les emails)
APP_URL=https://votre-domaine.up.railway.app
```

**Exemple :**
```env
GMAIL_USER=monapp@gmail.com
GMAIL_APP_PASSWORD=abcd efgh ijkl mnop
APP_URL=https://apinest-production.up.railway.app
```

⚠️ **Important :**
- `GMAIL_USER` : Votre adresse Gmail complète
- `GMAIL_APP_PASSWORD` : Le mot de passe d'application généré (16 caractères, avec ou sans espaces)
- `APP_URL` : L'URL publique de votre application sur Railway

### 3. Configuration sur Railway

1. Allez sur Railway → Votre projet → Service "apinest"
2. Onglet **"Variables"**
3. Ajoutez les variables :
   - `GMAIL_USER` : votre email Gmail
   - `GMAIL_APP_PASSWORD` : votre App Password
   - `APP_URL` : votre URL Railway

---

## 🧪 Tester la fonctionnalité

### 1. Forgot Password (Demander la réinitialisation)

**Endpoint :** `POST /auth/forgot-password`

**Body (JSON) :**
```json
{
  "email": "user@example.com"
}
```

**Réponse attendue :**
```json
{
  "message": "If the email exists, a password reset link has been sent."
}
```

**Ce qui se passe :**
- Un email est envoyé à l'adresse avec un lien de réinitialisation
- Le lien contient un token unique valide pendant 1 heure

### 2. Reset Password (Réinitialiser le mot de passe)

**Endpoint :** `POST /auth/reset-password`

**Body (JSON) :**
```json
{
  "token": "token-du-email",
  "password": "nouveau-mot-de-passe-123"
}
```

**Réponse attendue :**
```json
{
  "message": "Password has been reset successfully"
}
```

---

## 📧 Format de l'email envoyé

L'email de réinitialisation contiendra :

**Sujet :** Réinitialisation de mot de passe

**Contenu :**
```
Cliquez sur ce lien pour réinitialiser votre mot de passe:
https://votre-domaine.up.railway.app/auth/reset-password?token=abc123...
```

---

## 🔍 Vérifier que ça fonctionne

### 1. Vérifier les logs Railway

Après avoir envoyé une demande de réinitialisation, vérifiez les logs :
- Vous devriez voir : `Email sent successfully to user@example.com: ...`

### 2. Vérifier l'email

- Vérifiez votre boîte de réception (et les spams)
- Vous devriez recevoir l'email avec le lien de réinitialisation

### 3. Tester le lien

- Cliquez sur le lien dans l'email
- Ou utilisez le token dans une requête POST à `/auth/reset-password`

---

## ⚠️ Problèmes courants

### "Failed to send email"

**Cause :** 
- App Password incorrect
- Gmail User incorrect
- Vérification en deux étapes non activée

**Solution :**
1. Vérifiez que la vérification en deux étapes est activée
2. Régénérez un App Password
3. Vérifiez que les variables d'environnement sont correctes

### "Invalid or expired reset token"

**Cause :**
- Token expiré (valable 1 heure)
- Token déjà utilisé
- Token invalide

**Solution :**
- Demandez une nouvelle réinitialisation

### Email non reçu

**Cause :**
- Email dans les spams
- Configuration SMTP incorrecte
- Rate limiting Gmail

**Solution :**
1. Vérifiez les spams
2. Vérifiez les logs Railway pour voir les erreurs
3. Attendez quelques minutes (Gmail peut avoir des délais)

---

## 🔐 Sécurité

### Bonnes pratiques implémentées :

✅ **Pas d'énumération d'emails** : Le message de réponse est identique même si l'email n'existe pas  
✅ **Token sécurisé** : Token aléatoire de 32 bytes (64 caractères hex)  
✅ **Expiration** : Token valide seulement 1 heure  
✅ **Suppression du token** : Token supprimé après utilisation  
✅ **Mot de passe hashé** : Le nouveau mot de passe est hashé avec bcrypt  

---

## 📝 Exemple complet dans Postman

### Étape 1 : Forgot Password

```
POST https://votre-domaine.up.railway.app/auth/forgot-password
Content-Type: application/json

{
  "email": "test@example.com"
}
```

### Étape 2 : Vérifier l'email

Ouvrez votre boîte mail et récupérez le token depuis le lien.

### Étape 3 : Reset Password

```
POST https://votre-domaine.up.railway.app/auth/reset-password
Content-Type: application/json

{
  "token": "abc123def456...",
  "password": "nouveau-mot-de-passe-123"
}
```

---

## 🎯 Résumé

1. ✅ Activer la vérification en deux étapes Gmail
2. ✅ Générer un App Password
3. ✅ Configurer `GMAIL_USER` et `GMAIL_APP_PASSWORD` sur Railway
4. ✅ Configurer `APP_URL` sur Railway
5. ✅ Tester avec Postman

La fonctionnalité est maintenant complètement opérationnelle ! 🚀


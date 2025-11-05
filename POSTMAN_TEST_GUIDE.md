# Guide de test API dans Postman

## 🔧 Configuration de base

### URL de base
Utilisez l'URL publique de votre application Railway, pas l'URL de registry.

**Format correct :**
```
https://votre-domaine.up.railway.app
```

**Exemple :**
```
https://apinest-production.up.railway.app
```

**⚠️ Ne PAS utiliser :**
- ❌ `production-asia-southeast1-eqsg3a.railway-registry.com` (c'est une URL interne)
- ❌ `http://localhost:8080` (en local uniquement)

---

## 📋 Endpoints disponibles

### 1. Health Check (Vérifier que l'API fonctionne)

**Méthode :** `GET`  
**URL :** `https://votre-domaine.up.railway.app/health`  
**Headers :** Aucun nécessaire  
**Body :** Aucun

**Réponse attendue :**
```json
{
  "status": "ok",
  "message": "Fitness API is running"
}
```

---

### 2. Register (Inscription d'un nouvel utilisateur)

**Méthode :** `POST`  
**URL :** `https://votre-domaine.up.railway.app/auth/register`  
**Headers :**
```
Content-Type: application/json
```
**Body (raw JSON) :**
```json
{
  "email": "john.doe@example.com",
  "password": "password123",
  "name": "John Doe",
  "location": "Paris, France"
}
```

**Réponse attendue (succès) :**
```json
{
  "email": "john.doe@example.com",
  "name": "John Doe",
  "location": "Paris, France",
  "_id": "..."
}
```

**Erreurs possibles :**
- `400 Bad Request` : Email déjà utilisé ou données invalides
- `409 Conflict` : Email déjà existant

---

### 3. Login (Connexion)

**Méthode :** `POST`  
**URL :** `https://votre-domaine.up.railway.app/auth/login`  
**Headers :**
```
Content-Type: application/json
```
**Body (raw JSON) :**
```json
{
  "email": "john.doe@example.com",
  "password": "password123"
}
```

**Réponse attendue (succès) :**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "email": "john.doe@example.com",
    "name": "John Doe",
    "location": "Paris, France",
    "_id": "..."
  }
}
```

**⚠️ Important :** Copiez le `access_token` pour l'utiliser dans les requêtes suivantes !

---

### 4. Get Profile (Profil de l'utilisateur connecté)

**Méthode :** `GET`  
**URL :** `https://votre-domaine.up.railway.app/users/profile`  
**Headers :**
```
Authorization: Bearer VOTRE_ACCESS_TOKEN
```

**⚠️ Important :** Remplacez `VOTRE_ACCESS_TOKEN` par le token obtenu lors du login.

**Réponse attendue :**
```json
{
  "email": "john.doe@example.com",
  "name": "John Doe",
  "location": "Paris, France",
  "_id": "..."
}
```

---

### 5. Get All Users (Liste de tous les utilisateurs)

**Méthode :** `GET`  
**URL :** `https://votre-domaine.up.railway.app/users`  
**Headers :**
```
Authorization: Bearer VOTRE_ACCESS_TOKEN
```

**Réponse attendue :**
```json
[
  {
    "email": "john.doe@example.com",
    "name": "John Doe",
    "location": "Paris, France",
    "_id": "..."
  },
  ...
]
```

---

### 6. Get User by ID (Obtenir un utilisateur par ID)

**Méthode :** `GET`  
**URL :** `https://votre-domaine.up.railway.app/users/:id`  
**Exemple :** `https://votre-domaine.up.railway.app/users/507f1f77bcf86cd799439011`  
**Headers :**
```
Authorization: Bearer VOTRE_ACCESS_TOKEN
```

**Réponse attendue :**
```json
{
  "email": "john.doe@example.com",
  "name": "John Doe",
  "location": "Paris, France",
  "_id": "..."
}
```

---

### 7. Update User (Mettre à jour un utilisateur)

**Méthode :** `PATCH`  
**URL :** `https://votre-domaine.up.railway.app/users/:id`  
**Exemple :** `https://votre-domaine.up.railway.app/users/507f1f77bcf86cd799439011`  
**Headers :**
```
Authorization: Bearer VOTRE_ACCESS_TOKEN
Content-Type: application/json
```
**Body (raw JSON) :**
```json
{
  "name": "John Updated",
  "location": "Lyon, France"
}
```

---

### 8. Delete User (Supprimer un utilisateur)

**Méthode :** `DELETE`  
**URL :** `https://votre-domaine.up.railway.app/users/:id`  
**Exemple :** `https://votre-domaine.up.railway.app/users/507f1f77bcf86cd799439011`  
**Headers :**
```
Authorization: Bearer VOTRE_ACCESS_TOKEN
```

---

### 9. Forgot Password (Demander la réinitialisation de mot de passe)

**Méthode :** `POST`  
**URL :** `https://votre-domaine.up.railway.app/auth/forgot-password`  
**Headers :**
```
Content-Type: application/json
```
**Body (raw JSON) :**
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

**⚠️ Important :** Un email sera envoyé à l'adresse avec un lien de réinitialisation. Le token est valide pendant 1 heure.

---

### 10. Reset Password (Réinitialiser le mot de passe)

**Méthode :** `POST`  
**URL :** `https://votre-domaine.up.railway.app/auth/reset-password`  
**Headers :**
```
Content-Type: application/json
```
**Body (raw JSON) :**
```json
{
  "token": "token-du-email-recu",
  "password": "nouveau-mot-de-passe-123"
}
```

**Réponse attendue :**
```json
{
  "message": "Password has been reset successfully"
}
```

**⚠️ Important :** Le token doit être obtenu depuis l'email de réinitialisation. Il expire après 1 heure et ne peut être utilisé qu'une seule fois.

---

## 🚀 Guide pas à pas dans Postman

### Étape 1 : Tester le Health Check

1. Ouvrez Postman
2. Créez une nouvelle requête
3. Sélectionnez **GET**
4. Entrez l'URL : `https://votre-domaine.up.railway.app/health`
5. Cliquez sur **Send**
6. Vous devriez voir : `{"status":"ok","message":"Fitness API is running"}`

### Étape 2 : S'inscrire (Register)

1. Créez une nouvelle requête
2. Sélectionnez **POST**
3. Entrez l'URL : `https://votre-domaine.up.railway.app/auth/register`
4. Allez dans l'onglet **Body**
5. Sélectionnez **raw** et **JSON**
6. Collez le JSON :
   ```json
   {
     "email": "test@example.com",
     "password": "password123",
     "name": "Test User",
     "location": "Paris, France"
   }
   ```
7. Cliquez sur **Send**
8. Vous devriez recevoir les informations de l'utilisateur créé

### Étape 3 : Se connecter (Login)

1. Créez une nouvelle requête
2. Sélectionnez **POST**
3. Entrez l'URL : `https://votre-domaine.up.railway.app/auth/login`
4. Allez dans l'onglet **Body**
5. Sélectionnez **raw** et **JSON**
6. Collez le JSON :
   ```json
   {
     "email": "test@example.com",
     "password": "password123"
   }
   ```
7. Cliquez sur **Send**
8. **Copiez le `access_token`** de la réponse

### Étape 4 : Tester une route protégée (Get Profile)

1. Créez une nouvelle requête
2. Sélectionnez **GET**
3. Entrez l'URL : `https://votre-domaine.up.railway.app/users/profile`
4. Allez dans l'onglet **Authorization**
5. Sélectionnez **Bearer Token** dans le type
6. Collez votre `access_token` dans le champ "Token"
7. Cliquez sur **Send**
8. Vous devriez voir votre profil utilisateur

---

## 🔐 Configuration de l'authentification dans Postman

### Méthode 1 : Via l'onglet Authorization

1. Onglet **Authorization**
2. Type : **Bearer Token**
3. Token : Collez votre `access_token`

### Méthode 2 : Via les Headers

1. Onglet **Headers**
2. Ajoutez :
   - Key : `Authorization`
   - Value : `Bearer VOTRE_ACCESS_TOKEN`

---

## ⚠️ Erreurs courantes

### 401 Unauthorized
- **Cause :** Token manquant ou invalide
- **Solution :** Vérifiez que vous avez bien ajouté le header `Authorization: Bearer TOKEN`

### 400 Bad Request
- **Cause :** Données invalides (email mal formaté, mot de passe trop court, etc.)
- **Solution :** Vérifiez le format du JSON et les validations

### 404 Not Found
- **Cause :** URL incorrecte ou endpoint n'existe pas
- **Solution :** Vérifiez que vous utilisez la bonne URL publique Railway

### 409 Conflict
- **Cause :** Email déjà utilisé (lors de l'inscription)
- **Solution :** Utilisez un autre email ou connectez-vous avec cet email

---

## 📝 Collection Postman (Export)

Pour créer une collection Postman :

1. Dans Postman, cliquez sur **New** → **Collection**
2. Nommez-la "Fitness API"
3. Ajoutez toutes les requêtes ci-dessus
4. Exportez la collection : **Collection** → **...** → **Export**

---

## 🎯 Ordre recommandé pour tester

1. ✅ Health Check (vérifier que l'API fonctionne)
2. ✅ Register (créer un compte)
3. ✅ Login (obtenir le token)
4. ✅ Get Profile (tester l'authentification)
5. ✅ Get All Users (voir tous les utilisateurs)
6. ✅ Get User by ID (voir un utilisateur spécifique)
7. ✅ Update User (modifier un utilisateur)
8. ✅ Delete User (supprimer un utilisateur)

---

## 💡 Astuce : Utiliser des variables Postman

Pour éviter de répéter l'URL :

1. Créez un **Environment** dans Postman
2. Ajoutez une variable :
   - Variable : `base_url`
   - Valeur : `https://votre-domaine.up.railway.app`
3. Dans vos requêtes, utilisez : `{{base_url}}/auth/register`

Pour le token :
1. Créez une variable : `access_token`
2. Après le login, copiez le token dans cette variable
3. Utilisez `{{access_token}}` dans les headers

---

## 🔍 Trouver votre URL Railway

1. Allez sur Railway → Votre projet → Service "apinest"
2. Onglet **Settings** → Section **Networking**
3. Cherchez **"Public Domain"** ou **"Custom Domain"**
4. Copiez l'URL (ex: `apinest-production-xxxxx.up.railway.app`)

Si vous n'avez pas de domaine public :
1. Cliquez sur **"Generate Domain"**
2. Railway créera automatiquement un domaine


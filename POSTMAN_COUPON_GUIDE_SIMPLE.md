# 📮 Guide Postman Simple - Créer et Valider un Coupon

## 🎯 Objectif

Créer un coupon de test pour votre utilisateur, puis le valider.

---

## 📋 Étape 1 : Obtenir votre Token JWT

### POST `/auth/login`

**Configuration Postman :**

1. **Méthode :** `POST`
2. **URL :** `https://apinest-production.up.railway.app/auth/login`
3. **Headers :**
   - `Content-Type: application/json`
4. **Body (raw JSON) :**
   ```json
   {
     "email": "mohamedsaidhachani93274190@gmail.com",
     "password": "VOTRE_MOT_DE_PASSE"
   }
   ```

**Réponse :**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { ... }
}
```

**⚠️ IMPORTANT :** Copiez le `access_token` !

---

## 🎫 Étape 2 : Créer un Coupon de Test

### POST `/activities/create-test-coupon`

**Configuration Postman :**

1. **Méthode :** `POST`
2. **URL :** `https://apinest-production.up.railway.app/activities/create-test-coupon`
3. **Headers :**
   - `Authorization: Bearer VOTRE_ACCESS_TOKEN`
   - `Content-Type: application/json`
4. **Body (raw JSON) :**
   ```json
   {}
   ```
   *(Body vide ou `{}`)*

**Réponse Succès (201) :**
```json
{
  "success": true,
  "message": "Coupon LEADERBOARD créé avec succès pour Mohamed",
  "coupon": {
    "id": "693a1b2c3d4e5f6g7h8i9j0k",
    "userId": "6913492bd65af9844d243495",
    "couponCode": "LEADERBOARD",
    "weekStart": "2025-12-09T00:00:00.000Z",
    "couponUsed": false
  }
}
```

**Réponse Erreur (si coupon existe déjà) :**
```json
{
  "success": false,
  "message": "Un coupon existe déjà pour cette semaine. Supprimez-le d'abord ou attendez la semaine prochaine.",
  "coupon": { ... }
}
```

---

## ✅ Étape 3 : Valider le Coupon

### POST `/activities/validate-coupon`

**Configuration Postman :**

1. **Méthode :** `POST`
2. **URL :** `https://apinest-production.up.railway.app/activities/validate-coupon`
3. **Headers :**
   - `Authorization: Bearer VOTRE_ACCESS_TOKEN`
   - `Content-Type: application/json`
4. **Body (raw JSON) :**
   ```json
   {
     "couponCode": "LEADERBOARD",
     "activityPrice": 350
   }
   ```

**Réponse Succès (200) :**
```json
{
  "valid": true,
  "discount": 70,
  "newPrice": 280
}
```

**Réponse Erreur (si coupon invalide) :**
```json
{
  "valid": false,
  "discount": 0,
  "newPrice": 350,
  "message": "Vous n'avez pas reçu ce coupon"
}
```

---

## 📸 Capture d'Écran Postman - Créer Coupon

```
┌─────────────────────────────────────────────────────────────┐
│ POST  https://apinest-production.up.railway.app/activities/ │
│       create-test-coupon                                    │
├─────────────────────────────────────────────────────────────┤
│ Params | Authorization | Headers | Body | Pre-req | Tests  │
├─────────────────────────────────────────────────────────────┤
│ Headers (2)                                                  │
│                                                              │
│ Key              Value                                       │
│ ─────────────────────────────────────────────────────────── │
│ Authorization    Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9│
│ Content-Type     application/json                            │
├─────────────────────────────────────────────────────────────┤
│ Body                                                          │
│ ○ none  ○ form-data  ○ x-www-form-urlencoded                │
│ ● raw   ○ binary     ○ GraphQL                               │
│                                                              │
│ JSON ▼                                                        │
│                                                              │
│ {}                                                           │
│                                                              │
│                                    [Send]                    │
└─────────────────────────────────────────────────────────────┘
```

---

## 📸 Capture d'Écran Postman - Valider Coupon

```
┌─────────────────────────────────────────────────────────────┐
│ POST  https://apinest-production.up.railway.app/activities/  │
│       validate-coupon                                       │
├─────────────────────────────────────────────────────────────┤
│ Params | Authorization | Headers | Body | Pre-req | Tests  │
├─────────────────────────────────────────────────────────────┤
│ Headers (2)                                                  │
│                                                              │
│ Key              Value                                       │
│ ─────────────────────────────────────────────────────────── │
│ Authorization    Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9│
│ Content-Type     application/json                            │
├─────────────────────────────────────────────────────────────┤
│ Body                                                          │
│ ○ none  ○ form-data  ○ x-www-form-urlencoded                │
│ ● raw   ○ binary     ○ GraphQL                               │
│                                                              │
│ JSON ▼                                                        │
│                                                              │
│ {                                                            │
│   "couponCode": "LEADERBOARD",                               │
│   "activityPrice": 350                                        │
│ }                                                            │
│                                                              │
│                                    [Send]                    │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 Workflow Complet dans Postman

### 1️⃣ Créer le Coupon

**Request :**
```
POST /activities/create-test-coupon
Authorization: Bearer VOTRE_TOKEN
Body: {}
```

**Expected Response :**
```json
{
  "success": true,
  "message": "Coupon LEADERBOARD créé avec succès"
}
```

### 2️⃣ Valider le Coupon (Première fois)

**Request :**
```
POST /activities/validate-coupon
Authorization: Bearer VOTRE_TOKEN
Body: {
  "couponCode": "LEADERBOARD",
  "activityPrice": 350
}
```

**Expected Response :**
```json
{
  "valid": true,
  "discount": 70,
  "newPrice": 280
}
```

### 3️⃣ Valider le Coupon (Deuxième fois - Doit échouer)

**Request :** (Même que l'étape 2)

**Expected Response :**
```json
{
  "valid": false,
  "discount": 0,
  "newPrice": 350,
  "message": "Ce coupon a déjà été utilisé"
}
```

---

## 🎯 Exemples de Prix avec Réduction

### Exemple 1 : Prix 350€

**Request :**
```json
{
  "couponCode": "LEADERBOARD",
  "activityPrice": 350
}
```

**Response :**
```json
{
  "valid": true,
  "discount": 70,
  "newPrice": 280
}
```
**Calcul :** 350€ - 20% (70€) = 280€

---

### Exemple 2 : Prix 100€

**Request :**
```json
{
  "couponCode": "LEADERBOARD",
  "activityPrice": 100
}
```

**Response :**
```json
{
  "valid": true,
  "discount": 20,
  "newPrice": 80
}
```
**Calcul :** 100€ - 20% (20€) = 80€

---

### Exemple 3 : Prix 50€

**Request :**
```json
{
  "couponCode": "LEADERBOARD",
  "activityPrice": 50
}
```

**Response :**
```json
{
  "valid": true,
  "discount": 10,
  "newPrice": 40
}
```
**Calcul :** 50€ - 20% (10€) = 40€

---

## ⚠️ Erreurs Courantes

### Erreur 401 : Unauthorized

**Cause :** Token JWT invalide ou expiré

**Solution :**
1. Reconnectez-vous via `/auth/login`
2. Copiez le nouveau `access_token`
3. Remplacez-le dans les Headers

---

### Erreur 400 : "Vous n'avez pas reçu ce coupon"

**Cause :** Aucun coupon n'existe pour cet utilisateur

**Solution :**
1. Créez d'abord un coupon via `/activities/create-test-coupon`
2. Puis validez-le

---

### Erreur 400 : "Ce coupon a déjà été utilisé"

**Cause :** Le coupon a déjà été utilisé une fois

**Solution :**
1. Créez un nouveau coupon pour la semaine suivante
2. Ou attendez le dimanche pour recevoir un nouveau coupon automatiquement

---

## 📝 Collection Postman Complète

### Importer cette collection :

```json
{
  "info": {
    "name": "Coupon Leaderboard - Tests",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "1. Login",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"email\": \"mohamedsaidhachani93274190@gmail.com\",\n  \"password\": \"VOTRE_MOT_DE_PASSE\"\n}"
        },
        "url": {
          "raw": "{{base_url}}/auth/login",
          "host": ["{{base_url}}"],
          "path": ["auth", "login"]
        }
      }
    },
    {
      "name": "2. Create Test Coupon",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{jwt_token}}",
            "type": "text"
          },
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{}"
        },
        "url": {
          "raw": "{{base_url}}/activities/create-test-coupon",
          "host": ["{{base_url}}"],
          "path": ["activities", "create-test-coupon"]
        }
      }
    },
    {
      "name": "3. Validate Coupon - 350€",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{jwt_token}}",
            "type": "text"
          },
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"couponCode\": \"LEADERBOARD\",\n  \"activityPrice\": 350\n}"
        },
        "url": {
          "raw": "{{base_url}}/activities/validate-coupon",
          "host": ["{{base_url}}"],
          "path": ["activities", "validate-coupon"]
        }
      }
    },
    {
      "name": "4. Validate Coupon - 100€",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{jwt_token}}",
            "type": "text"
          },
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"couponCode\": \"LEADERBOARD\",\n  \"activityPrice\": 100\n}"
        },
        "url": {
          "raw": "{{base_url}}/activities/validate-coupon",
          "host": ["{{base_url}}"],
          "path": ["activities", "validate-coupon"]
        }
      }
    }
  ],
  "variable": [
    {
      "key": "base_url",
      "value": "https://apinest-production.up.railway.app"
    },
    {
      "key": "jwt_token",
      "value": "COLLER_VOTRE_TOKEN_ICI"
    }
  ]
}
```

**Pour importer :**
1. Ouvrez Postman
2. Cliquez sur **"Import"** (en haut à gauche)
3. Collez le JSON ci-dessus
4. Cliquez sur **"Import"**
5. Modifiez la variable `jwt_token` avec votre token

---

## ✅ Checklist Rapide

- [ ] Se connecter via `/auth/login` et copier le token
- [ ] Créer un coupon via `/activities/create-test-coupon`
- [ ] Vérifier que la réponse contient `"success": true`
- [ ] Valider le coupon via `/activities/validate-coupon`
- [ ] Vérifier que `"valid": true` et que le prix est réduit de 20%
- [ ] Tester à nouveau (doit échouer avec "déjà utilisé")

---

## 🎯 Résumé des Endpoints

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/auth/login` | POST | Obtenir le token JWT |
| `/activities/create-test-coupon` | POST | Créer un coupon de test |
| `/activities/validate-coupon` | POST | Valider et appliquer un coupon |

---

## 💡 Astuce : Variables Postman

Pour éviter de copier-coller le token à chaque fois :

1. **Créer une variable d'environnement :**
   - Cliquez sur l'icône ⚙️ (en haut à droite)
   - Créez un nouvel environnement "Production"
   - Ajoutez une variable `jwt_token`
   - Ajoutez une variable `base_url` = `https://apinest-production.up.railway.app`

2. **Utiliser dans les requêtes :**
   - Headers : `Bearer {{jwt_token}}`
   - URL : `{{base_url}}/activities/create-test-coupon`

---

*Guide simple pour tester les coupons dans Postman*


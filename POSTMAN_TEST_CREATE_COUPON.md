# 📮 Guide Postman - Créer un Coupon de Test

## 🎯 Endpoint : Créer un Coupon de Test

### **POST** `/activities/create-test-coupon`

---

## 📋 Configuration dans Postman

### 1. **Méthode et URL**

- **Méthode :** `POST`
- **URL :** `https://apinest-production.up.railway.app/activities/create-test-coupon`

---

### 2. **Headers (En-têtes)**

Cliquez sur l'onglet **"Headers"** et ajoutez :

| Key | Value |
|-----|-------|
| `Authorization` | `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImFzQGdtYWlsLmNvbSIsInN1YiI6IjY5MmUyYzNkZTA5ZTMxZTJmM2I1NGQ5MiIsImlhdCI6MTc2NTcyOTIyMiwiZXhwIjoxNzY4MzIxMjIyfQ.u1hnIQ30EvGRQhSCd0LZdOvCA8dqORgdYni5XgAdnTA` |
| `Content-Type` | `application/json` |

**⚠️ Important :** Remplacez le token JWT par votre token actuel si nécessaire.

---

### 3. **Body (Corps de la requête)**

- **Type :** `raw`
- **Format :** `JSON`

**Aucun body nécessaire !** Cet endpoint utilise l'utilisateur du JWT token automatiquement.

Laissez le body **vide** ou avec `{}` :

```json
{}
```

---

## ✅ Réponse Attendue (Succès - 201)

```json
{
  "success": true,
  "message": "Coupon LEADERBOARD créé avec succès pour as@gmail.com",
  "coupon": {
    "id": "693a1b2c3d4e5f6g7h8i9j0k",
    "userId": "692e2c3de05e31e2f3b54d92",
    "couponCode": "LEADERBOARD",
    "weekStart": "2025-12-09T00:00:00.000Z",
    "couponUsed": false
  }
}
```

---

## ❌ Réponse Attendue (Erreur - 400)

### Si un coupon existe déjà pour cette semaine :

```json
{
  "success": false,
  "message": "Un coupon existe déjà pour cette semaine. Supprimez-le d'abord ou attendez la semaine prochaine.",
  "coupon": {
    "_id": "693a1b2c3d4e5f6g7h8i9j0k",
    "userId": "692e2c3de05e31e2f3b54d92",
    "couponCode": "LEADERBOARD",
    "couponUsed": false,
    "weekStart": "2025-12-09T00:00:00.000Z"
  }
}
```

---

## 🔄 Étapes Complètes dans Postman

### Étape 1 : Créer une nouvelle requête

1. Cliquez sur **"New"** → **"HTTP Request"**
2. Nommez-la : `Create Test Coupon`

### Étape 2 : Configurer la requête

1. **Méthode :** Sélectionnez `POST`
2. **URL :** `https://apinest-production.up.railway.app/activities/create-test-coupon`

### Étape 3 : Ajouter les Headers

1. Cliquez sur l'onglet **"Headers"**
2. Ajoutez :
   - **Key :** `Authorization`
   - **Value :** `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImFzQGdtYWlsLmNvbSIsInN1YiI6IjY5MmUyYzNkZTA5ZTMxZTJmM2I1NGQ5MiIsImlhdCI6MTc2NTcyOTIyMiwiZXhwIjoxNzY4MzIxMjIyfQ.u1hnIQ30EvGRQhSCd0LZdOvCA8dqORgdYni5XgAdnTA`

### Étape 4 : Configurer le Body

1. Cliquez sur l'onglet **"Body"**
2. Sélectionnez **"raw"**
3. Sélectionnez **"JSON"** dans le dropdown
4. Laissez vide ou mettez `{}`

### Étape 5 : Envoyer la requête

1. Cliquez sur **"Send"**
2. Vérifiez la réponse dans le panneau inférieur

---

## 🧪 Test Complet : Créer puis Valider

### 1. Créer le Coupon

**POST** `/activities/create-test-coupon`

**Response :**
```json
{
  "success": true,
  "message": "Coupon LEADERBOARD créé avec succès",
  "coupon": { ... }
}
```

### 2. Valider le Coupon

**POST** `/activities/validate-coupon`

**Body :**
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

---

## 📝 Collection Postman Complète

### Importer cette collection :

```json
{
  "info": {
    "name": "Coupon Leaderboard API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Create Test Coupon",
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
            "value": "application/json",
            "type": "text"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{}",
          "options": {
            "raw": {
              "language": "json"
            }
          }
        },
        "url": {
          "raw": "{{base_url}}/activities/create-test-coupon",
          "host": ["{{base_url}}"],
          "path": ["activities", "create-test-coupon"]
        }
      }
    },
    {
      "name": "Validate Coupon",
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
            "value": "application/json",
            "type": "text"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"couponCode\": \"LEADERBOARD\",\n  \"activityPrice\": 350\n}",
          "options": {
            "raw": {
              "language": "json"
            }
          }
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
      "value": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImFzQGdtYWlsLmNvbSIsInN1YiI6IjY5MmUyYzNkZTA5ZTMxZTJmM2I1NGQ5MiIsImlhdCI6MTc2NTcyOTIyMiwiZXhwIjoxNzY4MzIxMjIyfQ.u1hnIQ30EvGRQhSCd0LZdOvCA8dqORgdYni5XgAdnTA"
    }
  ]
}
```

**Pour importer :**
1. Ouvrez Postman
2. Cliquez sur **"Import"**
3. Collez le JSON ci-dessus
4. Cliquez sur **"Import"**

---

## 🐛 Dépannage

### Erreur 401 : Unauthorized

**Cause :** Token JWT invalide ou expiré

**Solution :**
1. Connectez-vous à nouveau via `/auth/login`
2. Copiez le nouveau `access_token`
3. Remplacez le token dans les Headers

### Erreur 400 : Coupon existe déjà

**Cause :** Un coupon existe déjà pour cette semaine

**Solution :**
1. Utilisez le coupon existant pour valider
2. Ou supprimez-le dans MongoDB et recréez-en un

### Erreur 500 : Internal Server Error

**Cause :** Problème serveur

**Solution :**
1. Vérifiez les logs du serveur Railway
2. Vérifiez que MongoDB est accessible
3. Vérifiez que le module est bien déployé

---

## ✅ Checklist de Test

- [ ] Token JWT valide dans les Headers
- [ ] Méthode POST sélectionnée
- [ ] URL correcte : `/activities/create-test-coupon`
- [ ] Header `Authorization` avec `Bearer TOKEN`
- [ ] Body vide ou `{}`
- [ ] Réponse 201 avec `success: true`
- [ ] Test de validation du coupon fonctionne

---

## 📸 Capture d'écran Postman (Référence)

```
┌─────────────────────────────────────────────────────────┐
│ POST  https://apinest-production.up.railway.app/...     │
├─────────────────────────────────────────────────────────┤
│ Params | Authorization | Headers | Body | Pre-req | Tests│
├─────────────────────────────────────────────────────────┤
│ Headers (2)                                              │
│                                                          │
│ Key              Value                                   │
│ ─────────────────────────────────────────────────────── │
│ Authorization    Bearer eyJhbGciOiJIUzI1NiIsInR5cCI... │
│ Content-Type     application/json                        │
├─────────────────────────────────────────────────────────┤
│ Body                                                      │
│ ○ none  ○ form-data  ○ x-www-form-urlencoded            │
│ ● raw   ○ binary     ○ GraphQL                           │
│                                                          │
│ JSON ▼                                                   │
│                                                          │
│ {}                                                       │
│                                                          │
│                                                          │
│                                    [Send]                │
└─────────────────────────────────────────────────────────┘
```

---

*Guide Postman pour créer un coupon de test*


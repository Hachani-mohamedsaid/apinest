# 🧪 Guide de Test - Système Coupon Leaderboard

## 📋 Prérequis

1. **Utilisateur connecté** avec un token JWT valide
2. **Un utilisateur qui a reçu le coupon** (premier du leaderboard hebdomadaire)
3. **Postman ou cURL** pour tester les endpoints

---

## 🔐 Étape 1 : Obtenir un Token JWT

### POST `/auth/login`

**Request :**
```bash
POST http://localhost:3000/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response :**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

**⚠️ Important :** Copiez le `access_token` pour les requêtes suivantes !

---

## 🎫 Étape 2 : Tester la Validation du Coupon

### POST `/activities/validate-coupon`

#### ✅ Test 1 : Coupon Valide (Premier du Leaderboard)

**Request :**
```bash
POST http://localhost:3000/activities/validate-coupon
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "couponCode": "LEADERBOARD",
  "activityPrice": 100
}
```

**Response (Succès) :**
```json
{
  "valid": true,
  "discount": 20,
  "newPrice": 80
}
```

**Explication :**
- Prix original : 100€
- Réduction : 20% (20€)
- Prix final : 80€

---

#### ❌ Test 2 : Coupon Invalide (Code Incorrect)

**Request :**
```bash
POST http://localhost:3000/activities/validate-coupon
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "couponCode": "PROMO2024",
  "activityPrice": 100
}
```

**Response (Erreur) :**
```json
{
  "valid": false,
  "discount": 0,
  "newPrice": 100,
  "message": "Code coupon invalide"
}
```

---

#### ❌ Test 3 : Coupon Non Reçu par l'Utilisateur

**Request :**
```bash
POST http://localhost:3000/activities/validate-coupon
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "couponCode": "LEADERBOARD",
  "activityPrice": 100
}
```

**Response (Erreur) :**
```json
{
  "valid": false,
  "discount": 0,
  "newPrice": 100,
  "message": "Vous n'avez pas reçu ce coupon"
}
```

---

#### ❌ Test 4 : Coupon Déjà Utilisé

**Request :**
```bash
POST http://localhost:3000/activities/validate-coupon
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "couponCode": "LEADERBOARD",
  "activityPrice": 100
}
```

**Response (Erreur) :**
```json
{
  "valid": false,
  "discount": 0,
  "newPrice": 100,
  "message": "Ce coupon a déjà été utilisé"
}
```

---

## 📧 Étape 3 : Simuler l'Envoi du Coupon (Pour Test)

### Option A : Créer manuellement un coupon dans MongoDB

**Via MongoDB Compass ou mongo shell :**

```javascript
// Se connecter à MongoDB
use fitness-db

// Créer un coupon pour un utilisateur (remplacer USER_ID et EMAIL)
db.leaderboardcouponemails.insertOne({
  userId: "507f1f77bcf86cd799439011",  // ID de l'utilisateur
  userEmail: "user@example.com",
  couponCode: "LEADERBOARD",
  sentAt: new Date(),
  weekStart: new Date(),  // Début de la semaine actuelle
  couponUsed: false
})
```

---

### Option B : Appeler directement le service (Développement)

**Créer un script de test :** `test-coupon.ts`

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { LeaderboardEmailService } from './src/modules/achievements/services/leaderboard-email.service';

async function testCoupon() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const emailService = app.get(LeaderboardEmailService);

  // Simuler l'envoi d'un coupon
  await emailService.sendLeaderboardCouponEmail(
    '507f1f77bcf86cd799439011',  // userId
    'John Doe',                  // userName
    'user@example.com',          // userEmail
    1500                         // xp
  );

  console.log('✅ Coupon envoyé !');
  await app.close();
}

testCoupon();
```

**Exécuter :**
```bash
npx ts-node test-coupon.ts
```

---

## 🧪 Exemples de Test avec cURL

### Test 1 : Validation Coupon Valide

```bash
curl -X POST http://localhost:3000/activities/validate-coupon \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "couponCode": "LEADERBOARD",
    "activityPrice": 100
  }'
```

### Test 2 : Validation Coupon Invalide

```bash
curl -X POST http://localhost:3000/activities/validate-coupon \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "couponCode": "INVALID",
    "activityPrice": 100
  }'
```

### Test 3 : Sans Token (Erreur 401)

```bash
curl -X POST http://localhost:3000/activities/validate-coupon \
  -H "Content-Type: application/json" \
  -d '{
    "couponCode": "LEADERBOARD",
    "activityPrice": 100
  }'
```

**Response :**
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

---

## 📊 Exemples de Prix avec Réduction

### Exemple 1 : Session à 50€

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

**Calcul :** 50€ × 20% = 10€ de réduction → 40€ final

---

### Exemple 2 : Session à 75€

**Request :**
```json
{
  "couponCode": "LEADERBOARD",
  "activityPrice": 75
}
```

**Response :**
```json
{
  "valid": true,
  "discount": 15,
  "newPrice": 60
}
```

**Calcul :** 75€ × 20% = 15€ de réduction → 60€ final

---

### Exemple 3 : Session à 120€

**Request :**
```json
{
  "couponCode": "LEADERBOARD",
  "activityPrice": 120
}
```

**Response :**
```json
{
  "valid": true,
  "discount": 24,
  "newPrice": 96
}
```

**Calcul :** 120€ × 20% = 24€ de réduction → 96€ final

---

## 🔍 Vérifier l'État d'un Coupon dans MongoDB

### Voir tous les coupons envoyés

```javascript
db.leaderboardcouponemails.find().pretty()
```

### Voir les coupons d'un utilisateur spécifique

```javascript
db.leaderboardcouponemails.find({
  userId: "507f1f77bcf86cd799439011"
}).pretty()
```

### Voir les coupons non utilisés

```javascript
db.leaderboardcouponemails.find({
  couponUsed: false
}).pretty()
```

### Voir les coupons utilisés

```javascript
db.leaderboardcouponemails.find({
  couponUsed: true
}).pretty()
```

---

## 🧪 Scénario de Test Complet

### 1. Créer un coupon de test

```javascript
// MongoDB
db.leaderboardcouponemails.insertOne({
  userId: "507f1f77bcf86cd799439011",
  userEmail: "test@example.com",
  couponCode: "LEADERBOARD",
  sentAt: new Date(),
  weekStart: new Date(),
  couponUsed: false
})
```

### 2. Tester la validation (Première fois)

```bash
POST /activities/validate-coupon
{
  "couponCode": "LEADERBOARD",
  "activityPrice": 100
}

# Response: { "valid": true, "discount": 20, "newPrice": 80 }
```

### 3. Vérifier dans MongoDB que le coupon est marqué comme utilisé

```javascript
db.leaderboardcouponemails.findOne({
  userId: "507f1f77bcf86cd799439011"
})

// Résultat attendu:
// {
//   couponUsed: true,
//   usedAt: ISODate("2024-01-15T10:30:00Z")
// }
```

### 4. Tester à nouveau (Doit échouer)

```bash
POST /activities/validate-coupon
{
  "couponCode": "LEADERBOARD",
  "activityPrice": 100
}

# Response: { 
#   "valid": false, 
#   "discount": 0, 
#   "newPrice": 100,
#   "message": "Ce coupon a déjà été utilisé"
# }
```

---

## 📝 Collection Postman

### Importer cette collection dans Postman :

```json
{
  "info": {
    "name": "Coupon Leaderboard Tests",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Validate Coupon - Valid",
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
          "raw": "{\n  \"couponCode\": \"LEADERBOARD\",\n  \"activityPrice\": 100\n}"
        },
        "url": {
          "raw": "{{base_url}}/activities/validate-coupon",
          "host": ["{{base_url}}"],
          "path": ["activities", "validate-coupon"]
        }
      }
    },
    {
      "name": "Validate Coupon - Invalid Code",
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
          "raw": "{\n  \"couponCode\": \"INVALID\",\n  \"activityPrice\": 100\n}"
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
      "value": "http://localhost:3000"
    },
    {
      "key": "jwt_token",
      "value": "YOUR_TOKEN_HERE"
    }
  ]
}
```

---

## ✅ Checklist de Test

- [ ] Obtenir un token JWT valide
- [ ] Créer un coupon de test dans MongoDB
- [ ] Tester validation avec coupon valide
- [ ] Vérifier que le coupon est marqué comme utilisé
- [ ] Tester validation avec coupon déjà utilisé (doit échouer)
- [ ] Tester avec code invalide (doit échouer)
- [ ] Tester sans token (doit retourner 401)
- [ ] Vérifier les calculs de réduction (20%)

---

## 🐛 Debugging

### Vérifier les logs du serveur

```bash
# Les logs doivent afficher :
✅ Coupon LEADERBOARD applied by user 507f1f77bcf86cd799439011. Discount: 20, New price: 80
```

### Vérifier les erreurs MongoDB

```javascript
// Vérifier les index
db.leaderboardcouponemails.getIndexes()

// Devrait afficher l'index unique sur userId + weekStart
```

---

## 📞 Support

Si vous rencontrez des problèmes :

1. **Vérifier que le coupon existe dans MongoDB**
2. **Vérifier que l'userId correspond au token JWT**
3. **Vérifier les logs du serveur NestJS**
4. **Vérifier que le module est bien importé dans `activities.module.ts`**

---

*Guide de test créé pour le système de coupon leaderboard*


# 🔧 Créer un Coupon de Test dans MongoDB

## ❓ Pourquoi vous ne recevez pas le mail ?

Le système envoie automatiquement les coupons **uniquement le dimanche à 23h59** via un cron job. Si vous testez en dehors de ce moment, aucun coupon n'a été créé.

**Solution :** Créer manuellement un coupon dans MongoDB pour tester.

---

## 🔍 Étape 1 : Obtenir votre User ID

### Option A : Depuis le JWT Token (dans les logs Android)

Dans vos logs, vous avez :
```
"sub":"692e2c3de05e31e2f3b54d92"
```

**Votre User ID est :** `692e2c3de05e31e2f3b54d92`

### Option B : Depuis l'API

**GET** `/users/profile`
```
Authorization: Bearer VOTRE_TOKEN
```

La réponse contient `_id` ou `id` qui est votre User ID.

---

## 📝 Étape 2 : Créer le Coupon dans MongoDB

### Via MongoDB Compass

1. **Connectez-vous à MongoDB Compass**
2. **Sélectionnez votre base de données** (probablement `fitness-db`)
3. **Trouvez la collection** `leaderboardcouponemails`
4. **Cliquez sur "Insert Document"**
5. **Collez ce JSON** (remplacez `VOTRE_USER_ID` par votre ID) :

```json
{
  "userId": "692e2c3de05e31e2f3b54d92",
  "userEmail": "as@gmail.com",
  "couponCode": "LEADERBOARD",
  "sentAt": ISODate("2025-12-14T16:30:00.000Z"),
  "weekStart": ISODate("2025-12-09T00:00:00.000Z"),
  "couponUsed": false
}
```

6. **Cliquez sur "Insert"**

---

### Via MongoDB Shell (mongo CLI)

```javascript
// Se connecter à MongoDB
use fitness-db

// Créer le coupon (remplacez l'ID et l'email)
db.leaderboardcouponemails.insertOne({
  userId: "692e2c3de05e31e2f3b54d92",
  userEmail: "as@gmail.com",
  couponCode: "LEADERBOARD",
  sentAt: new Date(),
  weekStart: new Date(),  // Début de la semaine actuelle
  couponUsed: false
})
```

---

### Via Script Node.js (pour Railway/Production)

Créez un fichier `create-test-coupon.js` :

```javascript
const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/fitness-db';
const client = new MongoClient(uri);

async function createTestCoupon() {
  try {
    await client.connect();
    const db = client.db('fitness-db');
    const collection = db.collection('leaderboardcouponemails');

    const coupon = {
      userId: '692e2c3de05e31e2f3b54d92',  // Votre User ID
      userEmail: 'as@gmail.com',              // Votre email
      couponCode: 'LEADERBOARD',
      sentAt: new Date(),
      weekStart: new Date(),
      couponUsed: false
    };

    const result = await collection.insertOne(coupon);
    console.log('✅ Coupon créé avec succès:', result.insertedId);
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await client.close();
  }
}

createTestCoupon();
```

**Exécuter :**
```bash
node create-test-coupon.js
```

---

## ✅ Étape 3 : Vérifier que le Coupon est Créé

### Via MongoDB Compass

1. **Ouvrez la collection** `leaderboardcouponemails`
2. **Filtrez par** `userId: "692e2c3de05e31e2f3b54d92"`
3. **Vous devriez voir** le document créé

### Via MongoDB Shell

```javascript
db.leaderboardcouponemails.findOne({
  userId: "692e2c3de05e31e2f3b54d92"
})
```

---

## 🧪 Étape 4 : Tester le Coupon

Maintenant, testez à nouveau avec votre application Android :

**Request :**
```json
{
  "couponCode": "LEADERBOARD",
  "activityPrice": 350
}
```

**Response attendue :**
```json
{
  "valid": true,
  "discount": 70,
  "newPrice": 280
}
```

**Calcul :** 350€ × 20% = 70€ de réduction → 280€ final

---

## 🔄 Étape 5 : Tester l'Usage Unique

Après avoir utilisé le coupon une fois, testez à nouveau :

**Response attendue :**
```json
{
  "valid": false,
  "discount": 0,
  "newPrice": 350,
  "message": "Ce coupon a déjà été utilisé"
}
```

---

## 📊 Vérifier l'État du Coupon

### Voir tous vos coupons

```javascript
db.leaderboardcouponemails.find({
  userId: "692e2c3de05e31e2f3b54d92"
}).pretty()
```

### Voir si le coupon a été utilisé

```javascript
db.leaderboardcouponemails.findOne({
  userId: "692e2c3de05e31e2f3b54d92",
  couponCode: "LEADERBOARD"
})
```

**Résultat attendu après utilisation :**
```json
{
  "couponUsed": true,
  "usedAt": ISODate("2025-12-14T16:30:00.000Z")
}
```

---

## 🚀 Méthode la Plus Simple : Endpoint API

### POST `/activities/create-test-coupon`

**✅ NOUVEAU :** Endpoint pour créer un coupon de test automatiquement !

**Request :**
```bash
POST https://apinest-production.up.railway.app/activities/create-test-coupon
Authorization: Bearer VOTRE_TOKEN_JWT
```

**Response (Succès) :**
```json
{
  "success": true,
  "message": "Coupon LEADERBOARD créé avec succès pour Test User",
  "coupon": {
    "id": "693...",
    "userId": "692e2c3de05e31e2f3b54d92",
    "couponCode": "LEADERBOARD",
    "weekStart": "2025-12-09T00:00:00.000Z",
    "couponUsed": false
  }
}
```

**Response (Erreur - Coupon existe déjà) :**
```json
{
  "success": false,
  "message": "Un coupon existe déjà pour cette semaine. Supprimez-le d'abord ou attendez la semaine prochaine.",
  "coupon": { ... }
}
```

**⚠️ Note :** Cet endpoint crée automatiquement un coupon pour l'utilisateur connecté (celui du JWT token).

---

## 📝 Notes Importantes

1. **weekStart** : Doit être le début de la semaine actuelle (Lundi 00h00)
2. **userId** : Doit correspondre exactement à l'ID dans le JWT
3. **couponUsed** : Doit être `false` pour que le coupon soit utilisable
4. **Index unique** : Un utilisateur ne peut avoir qu'un seul coupon par semaine

---

## 🐛 Dépannage

### Erreur : "Vous n'avez pas reçu ce coupon"

**Vérifications :**
1. ✅ Le `userId` correspond-il exactement à celui du JWT ?
2. ✅ Le document existe-t-il dans MongoDB ?
3. ✅ Le `couponCode` est-il exactement `"LEADERBOARD"` (en majuscules) ?

### Erreur : "Ce coupon a déjà été utilisé"

**Solution :** Créer un nouveau coupon avec `couponUsed: false`

### Erreur : Index unique violé

**Solution :** Supprimer l'ancien coupon de la semaine avant d'en créer un nouveau :

```javascript
db.leaderboardcouponemails.deleteOne({
  userId: "692e2c3de05e31e2f3b54d92",
  weekStart: ISODate("2025-12-09T00:00:00.000Z")
})
```

---

*Guide pour créer un coupon de test dans MongoDB*


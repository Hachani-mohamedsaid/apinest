# 🧪 Guide de Test - Badges de Création d'Activité

## 📋 Prérequis

1. ✅ Backend NestJS démarré et fonctionnel
2. ✅ MongoDB accessible
3. ✅ Badges créés dans MongoDB (voir section suivante)
4. ✅ Utilisateur de test créé

---

## 🏆 Étape 1 : Créer les Badges dans MongoDB

### Option A : Utiliser le Script JavaScript

```bash
# Se connecter à MongoDB
mongosh "mongodb://localhost:27017/fitness-db"

# Ou si vous utilisez MongoDB Atlas
mongosh "mongodb+srv://username:password@cluster.mongodb.net/fitness-db"

# Exécuter le script
load("scripts/create-activity-creation-badges.js")
```

### Option B : Utiliser le Fichier JSON

```bash
# Importer depuis un fichier JSON
mongoimport --uri="mongodb://localhost:27017/fitness-db" \
  --collection=badgedefinitions \
  --file=scripts/create-activity-creation-badges.json \
  --jsonArray
```

### Option C : Création Manuelle via MongoDB Compass ou CLI

```javascript
// Dans MongoDB Shell ou Compass
use fitness-db

db.badgedefinitions.insertMany([
  {
    name: "Premier Hôte",
    description: "Créer votre première activité",
    iconUrl: "🎨",
    rarity: "common",
    category: "creation",
    isActive: true,
    unlockCriteria: {
      type: "activity_creation_count",
      count: 1
    },
    xpReward: 100,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: "Hôte Populaire",
    description: "Créer 5 activités",
    iconUrl: "👑",
    rarity: "rare",
    category: "creation",
    isActive: true,
    unlockCriteria: {
      type: "activity_creation_count",
      count: 5
    },
    xpReward: 250,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: "Organisateur Pro",
    description: "Créer 10 activités",
    iconUrl: "🏆",
    rarity: "epic",
    category: "creation",
    isActive: true,
    unlockCriteria: {
      type: "activity_creation_count",
      count: 10
    },
    xpReward: 500,
    createdAt: new Date(),
    updatedAt: new Date()
  }
])
```

### Vérification

```javascript
// Vérifier que les badges ont été créés
db.badgedefinitions.find({
  "unlockCriteria.type": "activity_creation_count"
}).pretty()
```

**Résultat attendu :** 3-4 badges avec le type `activity_creation_count`

---

## 🧪 Étape 2 : Test de Création d'Activité

### Test 1 : Créer une Première Activité (Badge "Premier Hôte")

#### 2.1 Se Connecter

```bash
# POST /auth/login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

**Réponse :**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": "7d",
  "user": { ... }
}
```

#### 2.2 Vérifier les Badges Avant Création

```bash
# GET /achievements/badges
curl -X GET http://localhost:3000/achievements/badges \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Résultat attendu :** `earnedBadges` ne contient pas encore "Premier Hôte"

#### 2.3 Créer une Activité

```bash
# POST /activities
curl -X POST http://localhost:3000/activities \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sportType": "Running",
    "title": "Course matinale",
    "description": "Course dans le parc",
    "location": "Parc Central",
    "date": "2025-01-21",
    "time": "08:00",
    "participants": 5,
    "level": "Beginner",
    "visibility": "public"
  }'
```

**Réponse :**
```json
{
  "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
  "sportType": "Running",
  "title": "Course matinale",
  "creator": "65a1b2c3d4e5f6g7h8i9j0k0",
  ...
}
```

#### 2.4 Vérifier les Badges Après Création

```bash
# GET /achievements/badges
curl -X GET http://localhost:3000/achievements/badges \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Résultat attendu :**
```json
{
  "earnedBadges": [
    {
      "_id": "...",
      "name": "Premier Hôte",
      "description": "Créer votre première activité",
      "iconUrl": "🎨",
      "rarity": "common",
      "category": "creation",
      "earnedAt": "2025-01-21T08:00:00.000Z"
    }
  ],
  "inProgress": [ ... ]
}
```

#### 2.5 Vérifier le Résumé (XP)

```bash
# GET /achievements/summary
curl -X GET http://localhost:3000/achievements/summary \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Résultat attendu :**
```json
{
  "level": {
    "currentLevel": 1,
    "totalXp": 200,  // 100 XP (création) + 100 XP (badge)
    ...
  },
  "stats": {
    "totalBadges": 1,
    ...
  }
}
```

---

### Test 2 : Créer 5 Activités (Badge "Hôte Populaire")

#### 2.1 Créer 4 Activités Supplémentaires

```bash
# Répéter la commande POST /activities 4 fois
# (Ou utiliser un script)
```

#### 2.2 Vérifier les Badges

```bash
# GET /achievements/badges
curl -X GET http://localhost:3000/achievements/badges \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Résultat attendu :**
```json
{
  "earnedBadges": [
    {
      "name": "Premier Hôte",
      ...
    },
    {
      "name": "Hôte Populaire",
      "description": "Créer 5 activités",
      "iconUrl": "👑",
      "rarity": "rare",
      ...
    }
  ]
}
```

---

### Test 3 : Vérifier les Logs Backend

Vérifier les logs du serveur NestJS pour voir :

```
[ActivitiesService] Activity created: 65a1b2c3d4e5f6g7h8i9j0k1
[BadgeService] Checking badges for user 65a1b2c3d4e5f6g7h8i9j0k0 with trigger: activity_created
[BadgeService] Badge criteria met: Premier Hôte
[BadgeService] Badge awarded: Premier Hôte to user 65a1b2c3d4e5f6g7h8i9j0k0
[XpService] Added 100 XP to user xxx from badge_reward. Total: 200
```

---

## 🔍 Étape 3 : Vérification dans MongoDB

### Vérifier les Badges de l'Utilisateur

```javascript
// Dans MongoDB Shell
db.userbadges.find({
  userId: ObjectId("VOTRE_USER_ID")
}).pretty()
```

**Résultat attendu :** Documents avec les badges débloqués

### Vérifier les Activités Créées

```javascript
// Compter les activités créées par l'utilisateur
db.activities.countDocuments({
  creator: ObjectId("VOTRE_USER_ID")
})
```

### Vérifier les Activity Logs (si activités complétées)

```javascript
// Compter les activités complétées où l'utilisateur était hôte
db.activitylogs.countDocuments({
  userId: ObjectId("VOTRE_USER_ID"),
  isHost: true
})
```

---

## ✅ Checklist de Test

### Test 1 : Premier Badge
- [ ] Badge "Premier Hôte" créé dans MongoDB
- [ ] Activité créée avec succès
- [ ] Badge "Premier Hôte" apparaît dans `GET /achievements/badges`
- [ ] XP total augmente de 200 (100 création + 100 badge)
- [ ] Logs backend montrent le déblocage du badge

### Test 2 : Badge "Hôte Populaire"
- [ ] 5 activités créées
- [ ] Badge "Hôte Populaire" apparaît dans les badges
- [ ] XP total augmente correctement

### Test 3 : Badge "Organisateur Pro"
- [ ] 10 activités créées
- [ ] Badge "Organisateur Pro" apparaît dans les badges
- [ ] XP total augmente correctement

---

## 🐛 Dépannage

### Problème : Les badges ne sont pas débloqués

**Vérifier :**
1. Les badges existent-ils dans MongoDB avec `isActive: true` ?
2. Le type de critère est-il `activity_creation_count` ?
3. Les logs backend montrent-ils l'appel à `checkAndAwardBadges` ?
4. Y a-t-il des erreurs dans les logs ?

**Solution :**
```javascript
// Vérifier les badges actifs
db.badgedefinitions.find({
  isActive: true,
  "unlockCriteria.type": "activity_creation_count"
}).pretty()
```

### Problème : Le badge est débloqué mais l'XP n'augmente pas

**Vérifier :**
1. Le champ `xpReward` existe-t-il dans le badge ?
2. Les logs montrent-ils l'ajout d'XP ?

**Solution :**
```javascript
// Vérifier le badge
db.badgedefinitions.findOne({
  name: "Premier Hôte"
})
```

### Problème : Le badge est débloqué plusieurs fois

**Vérifier :**
1. La méthode `userHasBadge()` fonctionne-t-elle correctement ?
2. Y a-t-il des doublons dans `userbadges` ?

**Solution :**
```javascript
// Vérifier les doublons
db.userbadges.aggregate([
  {
    $group: {
      _id: { userId: "$userId", badgeId: "$badgeId" },
      count: { $sum: 1 }
    }
  },
  { $match: { count: { $gt: 1 } } }
])
```

---

## 📊 Script de Test Automatisé

```bash
#!/bin/bash
# test-activity-creation-badges.sh

BASE_URL="http://localhost:3000"
EMAIL="test@example.com"
PASSWORD="password123"

echo "🔐 Connexion..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.access_token')
echo "✅ Connecté"

echo "📊 Vérification des badges avant création..."
BEFORE_BADGES=$(curl -s -X GET "$BASE_URL/achievements/badges" \
  -H "Authorization: Bearer $TOKEN")
BADGE_COUNT_BEFORE=$(echo $BEFORE_BADGES | jq '.earnedBadges | length')
echo "Badges avant: $BADGE_COUNT_BEFORE"

echo "🏃 Création d'une activité..."
ACTIVITY_RESPONSE=$(curl -s -X POST "$BASE_URL/activities" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sportType": "Running",
    "title": "Test Activity",
    "description": "Test",
    "location": "Test Location",
    "date": "2025-01-21",
    "time": "08:00",
    "participants": 5,
    "level": "Beginner",
    "visibility": "public"
  }')
echo "✅ Activité créée"

sleep 2

echo "📊 Vérification des badges après création..."
AFTER_BADGES=$(curl -s -X GET "$BASE_URL/achievements/badges" \
  -H "Authorization: Bearer $TOKEN")
BADGE_COUNT_AFTER=$(echo $AFTER_BADGES | jq '.earnedBadges | length')
echo "Badges après: $BADGE_COUNT_AFTER"

if [ "$BADGE_COUNT_AFTER" -gt "$BADGE_COUNT_BEFORE" ]; then
  echo "✅ SUCCESS: Badge débloqué !"
  echo $AFTER_BADGES | jq '.earnedBadges[] | select(.name == "Premier Hôte")'
else
  echo "❌ FAIL: Aucun badge débloqué"
fi
```

---

**Date de création :** 2025-01-20

**Bon test ! 🚀**


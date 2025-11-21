# 🔧 Modifications Backend - Badges lors de la Création d'Activité

## ✅ Modifications Appliquées

### 1. **BadgeService - Support des Badges de Création d'Activité**

**Fichier modifié :** `src/modules/achievements/services/badge.service.ts`

**Changements :**
- ✅ Ajout du modèle `Activity` pour compter les activités créées (même non complétées)
- ✅ Nouvelle méthode `checkActivityCreationCount()` qui compte :
  - Les activités complétées où l'utilisateur était hôte (via `ActivityLog`)
  - Les activités créées mais non encore complétées (via `Activity`)
- ✅ Support du type de critère `activity_creation_count` pour les badges de création

**Code ajouté :**
```typescript
private async checkActivityCreationCount(
  userId: string,
  criteria: Record<string, any>,
  context?: Record<string, any>,
): Promise<boolean> {
  // Compte les activités complétées + activités en attente
  // Si c'est une création, inclut la nouvelle activité
}
```

### 2. **ActivitiesService - Appel lors de la Création**

**Fichier modifié :** `src/modules/activities/activities.service.ts`

**Changement :**
- ✅ Appel à `badgeService.checkAndAwardBadges()` lors de la création d'activité (ligne 61)
- ✅ Utilise le trigger `'activity_created'` avec le contexte approprié

**Code ajouté :**
```typescript
// Vérifier et débloquer les badges de création d'activité
try {
  await this.badgeService.checkAndAwardBadges(userId, 'activity_created', {
    action: 'create_activity',
    activity: {
      sportType: savedActivity.sportType,
      isHost: true,
    },
  });
} catch (error) {
  // Ne pas bloquer la création si la vérification de badge échoue
  this.logger.error(`Error checking badges for activity creation: ${error.message}`);
}
```

### 3. **AchievementsService - Méthode onActivityCreated**

**Fichier modifié :** `src/modules/achievements/achievements.service.ts`

**Changement :**
- ✅ Ajout de la méthode `onActivityCreated()` pour référence future

### 4. **AchievementsModule - Ajout du Modèle Activity**

**Fichier modifié :** `src/modules/achievements/achievements.module.ts`

**Changement :**
- ✅ Ajout du modèle `Activity` dans `MongooseModule.forFeature()` pour permettre à `BadgeService` de compter les activités créées

---

## 🎯 Badges de Création d'Activité

### Badges Disponibles

Pour que ces badges fonctionnent, ils doivent être définis dans MongoDB avec les critères suivants :

#### 1. Badge "Premier Hôte"
```json
{
  "name": "Premier Hôte",
  "description": "Créer votre première activité",
  "iconUrl": "🎨",
  "rarity": "common",
  "category": "creation",
  "isActive": true,
  "unlockCriteria": {
    "type": "activity_creation_count",
    "count": 1
  },
  "xpReward": 100
}
```

#### 2. Badge "Hôte Populaire"
```json
{
  "name": "Hôte Populaire",
  "description": "Créer 5 activités",
  "iconUrl": "👑",
  "rarity": "rare",
  "category": "creation",
  "isActive": true,
  "unlockCriteria": {
    "type": "activity_creation_count",
    "count": 5
  },
  "xpReward": 250
}
```

#### 3. Badge "Organisateur Pro"
```json
{
  "name": "Organisateur Pro",
  "description": "Créer 10 activités",
  "iconUrl": "🏆",
  "rarity": "epic",
  "category": "creation",
  "isActive": true,
  "unlockCriteria": {
    "type": "activity_creation_count",
    "count": 10
  },
  "xpReward": 500
}
```

---

## 🔄 Flux Complet

### Création d'Activité
```
User crée une activité
  ↓
ActivitiesService.create()
  ↓
1. Création de l'activité dans MongoDB
2. Ajout XP pour création (100 XP)
3. BadgeService.checkAndAwardBadges() avec trigger 'activity_created'
  ↓
BadgeService vérifie tous les badges avec type 'activity_creation_count'
  ↓
Si critères remplis → Badge débloqué + XP bonus
```

### Complétion d'Activité
```
User complète une activité
  ↓
ActivitiesService.completeActivity()
  ↓
1. Calcul XP détaillé
2. Ajout XP
3. Mise à jour série
4. BadgeService.checkAndAwardBadges() avec trigger 'activity_complete'
  ↓
BadgeService vérifie tous les badges avec type 'activity_count'
  ↓
Si critères remplis → Badge débloqué + XP bonus
```

---

## ✅ Checklist de Vérification

### Backend
- [x] `Activity` modèle ajouté dans `AchievementsModule`
- [x] `BadgeService.checkActivityCreationCount()` implémenté
- [x] `ActivitiesService.create()` appelle `checkAndAwardBadges()` avec `'activity_created'`
- [x] Support du type de critère `activity_creation_count`
- [x] Logger ajouté dans `ActivitiesService`

### MongoDB
- [ ] Badges de création définis avec `unlockCriteria.type = "activity_creation_count"`
- [ ] Badges marqués comme `isActive: true`

---

## 🧪 Test

### Test 1 : Créer une Activité et Vérifier le Badge "Premier Hôte"

**Action :**
1. Créer un nouvel utilisateur
2. Créer une activité via `POST /activities`
3. Vérifier les badges via `GET /achievements/badges`

**Résultat attendu :**
```json
{
  "earnedBadges": [
    {
      "name": "Premier Hôte",
      "description": "Créer votre première activité",
      "rarity": "common",
      "category": "creation",
      ...
    }
  ]
}
```

### Test 2 : Créer 5 Activités

**Action :**
1. Créer 5 activités (ou compléter 5 activités créées)
2. Vérifier les badges

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
      "rarity": "rare",
      ...
    }
  ]
}
```

---

## 📝 Notes Importantes

1. **Compter les Activités** : Le système compte maintenant :
   - Activités complétées où `isHost = true` (via `ActivityLog`)
   - Activités créées mais non complétées (via `Activity` où `creator = userId` et `isCompleted = false`)

2. **Déblocage Immédiat** : Les badges de création sont débloqués **immédiatement** lors de la création, pas seulement lors de la complétion.

3. **XP Bonus** : Chaque badge débloqué donne de l'XP bonus selon sa rareté.

---

**Date des modifications :** 2025-01-20

**Tous les fichiers compilent sans erreurs ✅**


# 🧪 Guide de Test Rapide - Système d'Achievements

## ✅ Vérifications Rapides

### Test 1 : Nouvel Utilisateur A-t-il des Challenges ?

**Action :**
1. Créer un nouvel utilisateur via `/auth/register`
2. Se connecter avec cet utilisateur
3. Appeler `GET /achievements/challenges`

**Résultat attendu :**
```json
{
  "activeChallenges": [
    {
      "_id": "...",
      "name": "Défi Hebdomadaire",
      "description": "Compléter 5 activités cette semaine",
      "challengeType": "weekly",
      ...
    }
  ]
}
```

**Si vide :** Vérifier les logs pour voir si `initializeUserAchievements` a été appelé.

---

### Test 2 : Compléter une Activité Débloque-t-elle des Badges ?

**Action :**
1. Se connecter avec un utilisateur
2. Créer une activité via `POST /activities`
3. Rejoindre l'activité (optionnel)
4. Marquer l'activité comme complétée via `POST /activities/:id/complete`
5. Appeler `GET /achievements/badges`

**Résultat attendu après 1ère activité :**
```json
{
  "earnedBadges": [
    {
      "_id": "...",
      "name": "Premier Pas",
      "description": "Compléter votre première activité",
      "rarity": "common",
      ...
    }
  ]
}
```

**Si vide :** Vérifier les logs pour voir si `checkAndAwardBadges` a été appelé.

---

### Test 3 : Les Challenges Progressent-ils ?

**Action :**
1. Se connecter avec un utilisateur
2. Vérifier les challenges actifs : `GET /achievements/challenges`
3. Compléter 1 activité
4. Vérifier à nouveau les challenges : `GET /achievements/challenges`

**Résultat attendu :**
```json
{
  "activeChallenges": [
    {
      "name": "Défi Hebdomadaire",
      "currentProgress": 1,  // ← Devrait être 1 après 1 activité
      "target": 5,
      ...
    }
  ]
}
```

---

### Test 4 : Le Résumé des Achievements Fonctionne-t-il ?

**Action :**
1. Se connecter avec un utilisateur
2. Appeler `GET /achievements/summary`

**Résultat attendu :**
```json
{
  "level": {
    "currentLevel": 1,
    "totalXp": 42,  // XP gagné après activité
    "xpForNextLevel": 150,
    "currentLevelXp": 42,
    "progressPercentage": 28.0
  },
  "stats": {
    "totalBadges": 1,  // Si badge débloqué
    "currentStreak": 1,
    "bestStreak": 1
  }
}
```

---

## 🔍 Vérification des Logs

### Logs Attendus lors de l'Inscription :

```
[AchievementsService] Initializing achievements for user 507f1f77bcf86cd799439011
[ChallengeService] Activated challenge "Défi Hebdomadaire" for user 507f1f77bcf86cd799439011
[ChallengeService] Activated challenge "Marathon Mensuel" for user 507f1f77bcf86cd799439011
```

### Logs Attendus lors de la Complétion d'Activité :

```
[XpService] Calculated XP for Running: Base(10) + Duration(15.0) + Distance(10) = 35.0 × 1.2 = 42
[XpService] Added 42 XP to user xxx from complete_activity. Total: 42, Level: 1
[StreakService] User xxx streak: 1 days, awarded 5 XP bonus
[BadgeService] Badge "Premier Pas" awarded to user xxx with 75 XP
[ChallengeService] Challenge progress updated for user xxx
```

### Logs Attendus à Minuit (Cron Jobs) :

```
[ChallengeService] Creating daily challenges for all users...
[ChallengeService] Daily challenges activated for 10 users
```

---

## 🐛 Diagnostic des Problèmes

### Problème : Les challenges ne sont pas créés pour les nouveaux utilisateurs

**Vérifier :**
1. Les logs montrent-ils `initializeUserAchievements` ?
2. `AchievementsModule` est-il importé dans `AuthModule` ?
3. Y a-t-il des erreurs dans les logs lors de l'inscription ?

**Solution :**
```typescript
// Vérifier dans auth.module.ts
imports: [
  forwardRef(() => AchievementsModule), // ← Doit être présent
  ...
]
```

---

### Problème : Les badges ne sont pas débloqués

**Vérifier :**
1. Les logs montrent-ils `checkAndAwardBadges` ?
2. Y a-t-il des erreurs dans `BadgeService` ?
3. Les critères de badges sont-ils corrects dans MongoDB ?

**Solution :**
Vérifier que dans `activities.service.ts` ligne 359, l'appel existe :
```typescript
await this.badgeService.checkAndAwardBadges(participantIdStr, 'activity_complete', {...});
```

---

### Problème : Les cron jobs ne s'exécutent pas

**Vérifier :**
1. `ScheduleModule.forRoot()` est-il dans `AchievementsModule` ?
2. L'application tourne-t-elle à minuit ?
3. Les logs montrent-ils l'exécution des cron jobs ?

**Solution :**
```typescript
// Dans achievements.module.ts
imports: [
  ScheduleModule.forRoot(), // ← Doit être présent
  ...
]
```

---

## 📝 Commandes MongoDB pour Vérifier

### Vérifier les Challenges d'un Utilisateur :
```javascript
db.userchallenges.find({ userId: ObjectId("VOTRE_USER_ID") })
```

### Vérifier les Badges d'un Utilisateur :
```javascript
db.userbadges.find({ userId: ObjectId("VOTRE_USER_ID") })
```

### Vérifier les Activity Logs :
```javascript
db.activitylogs.find({ userId: ObjectId("VOTRE_USER_ID") })
```

### Vérifier les Streaks :
```javascript
db.userstreaks.find({ userId: ObjectId("VOTRE_USER_ID") })
```

### Vérifier les Challenge Definitions :
```javascript
db.challengedefinitions.find({ isActive: true })
```

### Vérifier les Badge Definitions :
```javascript
db.badgedefinitions.find({ isActive: true })
```

---

## ✅ Checklist de Test

- [ ] Nouvel utilisateur a des challenges après inscription
- [ ] Badge "Premier Pas" débloqué après 1ère activité
- [ ] XP calculé correctement selon la formule
- [ ] Challenges progressent lors de complétion d'activité
- [ ] Résumé des achievements retourne des données correctes
- [ ] Leaderboard fonctionne
- [ ] Les logs montrent les bonnes opérations

---

**Bon test ! 🚀**


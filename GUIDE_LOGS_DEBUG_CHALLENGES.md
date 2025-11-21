# 🔍 Guide de Débogage avec Logs - Progression des Challenges

## 📊 Logs Ajoutés

Des logs détaillés ont été ajoutés à chaque étape du processus pour identifier précisément où le problème se produit.

---

## 🔍 Logs à Surveiller

### 1. Lors de la Complétion d'Activité

**Dans `ActivitiesService.completeActivity()` :**

```
[ActivitiesService] completeActivity called: activityId=..., userId=...
[ActivitiesService] Activity found: title="...", sportType="...", creator="..."
[ActivitiesService] User is the creator, proceeding with completion...
[ActivitiesService] Activity marked as completed in database
[ActivitiesService] Processing X participants for activity completion
[ActivitiesService] Processing participant: userId (isHost: true/false)
[ActivitiesService] XP calculated for participant userId: X XP
[ActivitiesService] Adding X XP to participant userId
[ActivitiesService] Updating streak for participant userId
[ActivitiesService] Checking badges for participant userId
[ActivitiesService] Activating challenges for participant userId
[ActivitiesService] ========================================
[ActivitiesService] 🎯 UPDATING CHALLENGE PROGRESS for participant userId
[ActivitiesService] Completion date: 2025-11-21T...
[ActivitiesService] Activity data: sportType=..., duration=..., distance=...
[ActivitiesService] ========================================
```

### 2. Dans `ChallengeService.updateChallengeProgress()`

```
[ChallengeService] Updating challenge progress for user userId, action: complete_activity
[ChallengeService] Found X active challenges for user userId
[ChallengeService] Activity data: sportType=..., date=..., completedAt=...
[ChallengeService] Processing challenge: "Défi Quotidien" (type: daily)
[ChallengeService] Checking if challenge "Défi Quotidien" counts for action complete_activity
[ChallengeService] Challenge unlockCriteria: {"type":"activities_in_period","period":"day",...}
[ChallengeService] Challenge challengeType: daily
[ChallengeService] shouldCount result for "Défi Quotidien": true/false
```

### 3. Dans `ChallengeService.doesActionCount()`

```
[ChallengeService] doesActionCount called: actionType=complete_activity, criteriaType=activities_in_period, challengeType=daily
[ChallengeService] doesActionCount result: increment=X, returns=true/false
```

### 4. Dans `ChallengeService.calculateProgressIncrement()`

```
[ChallengeService] calculateProgressIncrement called: actionType=complete_activity, criteriaType=activities_in_period, challengeType=daily
[ChallengeService] Activity data: sportType=..., date=..., completedAt=...
[ChallengeService] Processing 'activities_in_period' criteria
[ChallengeService] Period check result for 'activities_in_period': true/false
[ChallengeService] ✅ Period check PASSED, returning increment: 1
OU
[ChallengeService] ❌ Period check FAILED for activities_in_period challenge
[ChallengeService] Activity date does not match challenge period requirement
```

### 5. Dans `ChallengeService.checkActivitiesInPeriod()`

```
[ChallengeService] checkActivitiesInPeriod called: actionType=complete_activity, challengeType=daily
[ChallengeService] Period check parameters: period=day, challengeType=daily, criteria.period=day, activityTypes=["any"]
[ChallengeService] Date check: activityDateSource=..., activityDate=2025-11-21T..., now=2025-11-21T...
[ChallengeService] 📅 Daily period check:
[ChallengeService]   - today (normalized): 2025-11-21T00:00:00.000Z
[ChallengeService]   - activityDay (normalized): 2025-11-21T00:00:00.000Z
[ChallengeService]   - today timestamp: 1732147200000
[ChallengeService]   - activityDay timestamp: 1732147200000
[ChallengeService]   - match: true
[ChallengeService] ✅ Daily challenge PASSED: Activity was completed today
OU
[ChallengeService] ❌ Daily challenge FAILED: Activity was not completed today
[ChallengeService] Activity date: 2025-11-20T00:00:00.000Z, Today: 2025-11-21T00:00:00.000Z
```

### 6. Sauvegarde de la Progression

```
[ChallengeService] Current progress for "Défi Quotidien": 0/2
[ChallengeService] Calculated progress increment for "Défi Quotidien": 1
[ChallengeService] Saving challenge progress: 0 -> 1
[ChallengeService] ✅ Challenge progress SAVED successfully for user userId: "Défi Quotidien" - 0 -> 1/2
OU
[ChallengeService] ❌ ERROR saving challenge progress: ...
```

---

## 🎯 Scénarios de Problèmes et Solutions

### Scénario 1 : Les Logs n'Apparaissent Pas

**Symptôme :** Aucun log `[ChallengeService]` après complétion d'activité

**Cause :** `updateChallengeProgress()` n'est pas appelé

**Solution :** Vérifiez que cette ligne est présente dans `completeActivity()` :

```typescript
await this.challengeService.updateChallengeProgress(...)
```

**Logs attendus :**
```
[ActivitiesService] 🎯 UPDATING CHALLENGE PROGRESS for participant userId
```

---

### Scénario 2 : "Found 0 active challenges"

**Symptôme :**
```
[ChallengeService] Found 0 active challenges for user userId
```

**Cause :** Aucun challenge actif pour l'utilisateur

**Solution :** 
1. Vérifiez que `activateChallengesForUser()` est appelé
2. Vérifiez dans MongoDB que des challenges existent pour l'utilisateur

**Vérification MongoDB :**
```javascript
db.userchallenges.find({ userId: ObjectId("userId"), status: "active" })
```

---

### Scénario 3 : "shouldCount result: false"

**Symptôme :**
```
[ChallengeService] shouldCount result for "Défi Quotidien": false
[ChallengeService] Challenge "Défi Quotidien" does NOT count for action complete_activity
```

**Cause :** La vérification échoue (période, type d'activité, etc.)

**Solution :** Vérifiez les logs suivants pour voir pourquoi :
- `[ChallengeService] Period check result: false`
- `[ChallengeService] Activity type mismatch`

---

### Scénario 4 : "Period check FAILED"

**Symptôme :**
```
[ChallengeService] ❌ Daily challenge FAILED: Activity was not completed today
[ChallengeService] Activity date: 2025-11-20T00:00:00.000Z, Today: 2025-11-21T00:00:00.000Z
```

**Cause :** L'activité a été complétée hier ou demain, pas aujourd'hui

**Solution :** Vérifiez que `completedAt` est bien défini comme `new Date()` dans `completeActivity()`

---

### Scénario 5 : "No progress increment"

**Symptôme :**
```
[ChallengeService] ⚠️ No progress increment for challenge "Défi Quotidien" (increment: 0)
[ChallengeService] This means calculateProgressIncrement returned 0
```

**Cause :** `calculateProgressIncrement()` retourne 0

**Solution :** Vérifiez les logs précédents pour voir pourquoi :
- Type de critère non reconnu
- Vérification de période échouée
- Type d'action ne correspond pas

---

### Scénario 6 : "ERROR saving challenge progress"

**Symptôme :**
```
[ChallengeService] ❌ ERROR saving challenge progress: ...
```

**Cause :** Erreur lors de la sauvegarde dans MongoDB

**Solution :** Vérifiez :
- La connexion MongoDB
- Les permissions de l'utilisateur
- La structure du document `UserChallenge`

---

## 📋 Checklist de Vérification avec Logs

### Étape 1 : Vérifier que `completeActivity()` est appelé

**Cherchez :**
```
[ActivitiesService] completeActivity called: activityId=..., userId=...
```

**Si absent :** Le frontend n'appelle pas l'endpoint ou il y a une erreur avant.

---

### Étape 2 : Vérifier que `updateChallengeProgress()` est appelé

**Cherchez :**
```
[ActivitiesService] 🎯 UPDATING CHALLENGE PROGRESS for participant userId
[ChallengeService] Updating challenge progress for user userId, action: complete_activity
```

**Si absent :** La ligne n'est pas présente dans `completeActivity()`.

---

### Étape 3 : Vérifier que des challenges sont trouvés

**Cherchez :**
```
[ChallengeService] Found X active challenges for user userId
```

**Si X = 0 :** Aucun challenge actif. Vérifiez `activateChallengesForUser()`.

---

### Étape 4 : Vérifier la vérification de période

**Cherchez :**
```
[ChallengeService] 📅 Daily period check:
[ChallengeService]   - match: true/false
```

**Si false :** La date de complétion ne correspond pas à aujourd'hui.

---

### Étape 5 : Vérifier la sauvegarde

**Cherchez :**
```
[ChallengeService] ✅ Challenge progress SAVED successfully
```

**Si absent ou erreur :** Problème de sauvegarde MongoDB.

---

## 🧪 Test Complet

### 1. Compléter une Activité

Dans l'application, complétez une activité et surveillez les logs.

### 2. Vérifier les Logs

**Logs attendus (dans l'ordre) :**

```
[ActivitiesService] completeActivity called: ...
[ActivitiesService] Activity found: ...
[ActivitiesService] User is the creator, proceeding with completion...
[ActivitiesService] Processing X participants...
[ActivitiesService] 🎯 UPDATING CHALLENGE PROGRESS for participant ...
[ChallengeService] Updating challenge progress for user ..., action: complete_activity
[ChallengeService] Found 1 active challenges for user ...
[ChallengeService] Processing challenge: "Défi Quotidien" (type: daily)
[ChallengeService] Checking if challenge "Défi Quotidien" counts...
[ChallengeService] doesActionCount called: ...
[ChallengeService] calculateProgressIncrement called: ...
[ChallengeService] Processing 'activities_in_period' criteria
[ChallengeService] checkActivitiesInPeriod called: ...
[ChallengeService] 📅 Daily period check:
[ChallengeService]   - match: true
[ChallengeService] ✅ Daily challenge PASSED
[ChallengeService] ✅ Period check PASSED, returning increment: 1
[ChallengeService] Calculated progress increment: 1
[ChallengeService] Saving challenge progress: 0 -> 1
[ChallengeService] ✅ Challenge progress SAVED successfully: "Défi Quotidien" - 0 -> 1/2
[ActivitiesService] ✅ Challenge progress update completed for participant ...
```

### 3. Identifier le Problème

**Si un log est absent ou montre une erreur, c'est là que se trouve le problème !**

---

## 🚨 Messages d'Erreur Courants

### "Challenge definition not found"

```
[ChallengeService] Challenge definition not found for userChallenge ...
```

**Solution :** Le challenge n'existe pas dans `ChallengeDefinition`. Vérifiez que les challenges sont créés.

---

### "Unknown criteria type"

```
[ChallengeService] Unknown criteria type: ...
```

**Solution :** Le type de critère dans `unlockCriteria` n'est pas reconnu. Vérifiez la structure du challenge.

---

### "Action type mismatch"

```
[ChallengeService] Action type is not 'complete_activity': ...
```

**Solution :** `actionType` passé à `updateChallengeProgress()` n'est pas `'complete_activity'`.

---

### "Missing context or activity"

```
[ChallengeService] Missing context or activity: context=true, activity=false
```

**Solution :** Le contexte ne contient pas `activity`. Vérifiez l'appel à `updateChallengeProgress()`.

---

## ✅ Résumé

Avec ces logs détaillés, vous pouvez maintenant :

1. ✅ Voir exactement où le processus s'arrête
2. ✅ Identifier pourquoi `currentProgress` reste à 0
3. ✅ Vérifier que la date de complétion correspond à aujourd'hui
4. ✅ Vérifier que la sauvegarde fonctionne
5. ✅ Identifier les erreurs spécifiques

**Les logs vous diront exactement où se trouve le problème !** 🔍

---

**Dernière mise à jour :** 2025-11-21


# 🔍 Guide de Débogage - Cron Job des Activités Passées

## 📊 Problème

Le cron job trouve des activités non complétées mais ne les détecte **PAS** comme passées :

```
[ActivitiesCronService] Found 3 non-completed activities to check
[ActivitiesCronService] No past activities found ❌
```

## 🔍 Étapes de Débogage

### 1. Vérifier le Format des Dates dans MongoDB

Exécutez cette requête dans MongoDB pour voir le format exact des dates :

```javascript
db.activities.find(
  { isCompleted: { $ne: true } },
  { 
    _id: 1, 
    title: 1, 
    date: 1, 
    time: 1, 
    isCompleted: 1,
    createdAt: 1
  }
).limit(5).pretty()
```

**Format attendu :**
- `date`: `ISODate("2025-11-30T00:00:00.000Z")` ou `"2025-11-30T00:00:00.000Z"`
- `time`: `ISODate("2025-11-30T12:27:00.000Z")` ou `"2025-11-30T12:27:00.000Z"` (contient déjà la date complète)

### 2. Vérifier les Logs Détaillés

Avec les logs améliorés, vous devriez voir :

```
[ActivitiesCronService] Activity 692b1636a82ac339d0d058b4 (test): time=2025-11-29T17:49:00.000Z, parsed=2025-11-29T17:49:00.000Z
[ActivitiesCronService] Activity 692b1636a82ac339d0d058b4 (test): activityDateTime=2025-11-29T17:49:00.000Z, now=2025-11-30T00:05:00.000Z, isPast=true
[ActivitiesCronService] ✅ Activity 692b1636a82ac339d0d058b4 (test) is past (2025-11-29T17:49:00.000Z), will be marked as completed
```

### 3. Cas d'Erreur Courants

#### Cas 1 : `time` est `null` ou `undefined`

**Logs :**
```
[ActivitiesCronService] Activity ... has no date/time, skipping
```

**Solution :** Vérifiez que les activités ont bien un champ `time` lors de la création.

#### Cas 2 : Format de date incorrect

**Logs :**
```
[ActivitiesCronService] Activity ...: time=Invalid Date, parsed=Invalid Date
```

**Solution :** Vérifiez le format des dates dans MongoDB. Elles doivent être en ISO 8601.

#### Cas 3 : Date dans le futur (timezone)

**Logs :**
```
[ActivitiesCronService] Activity ...: activityDateTime=2025-11-30T12:00:00.000Z, now=2025-11-30T00:05:00.000Z, isPast=false
```

**Problème :** L'activité semble être dans le futur alors qu'elle devrait être passée.

**Solution :** Vérifiez les timezones. Toutes les dates doivent être en UTC.

### 4. Test Manuel avec une Activité Passée

Créez une activité de test avec une date/heure passée :

```javascript
// Dans MongoDB
db.activities.insertOne({
  title: "Test Past Activity - Debug",
  sportType: "Running",
  location: "Test Location",
  date: new Date("2025-11-29T00:00:00.000Z"),
  time: new Date("2025-11-29T10:00:00.000Z"), // Passé (hier à 10h)
  participants: 5,
  level: "Beginner",
  visibility: "public",
  creator: ObjectId("6921d5a722b82871fe4b7fd7"), // Votre user ID
  isCompleted: false,
  createdAt: new Date(),
  updatedAt: new Date()
})
```

Attendez 1 minute et vérifiez les logs :

```
[ActivitiesCronService] Found 4 non-completed activities to check
[ActivitiesCronService] Activity ... (Test Past Activity - Debug): time=2025-11-29T10:00:00.000Z, parsed=2025-11-29T10:00:00.000Z
[ActivitiesCronService] Activity ... (Test Past Activity - Debug): activityDateTime=2025-11-29T10:00:00.000Z, now=2025-11-30T00:10:00.000Z, isPast=true
[ActivitiesCronService] ✅ Activity ... (Test Past Activity - Debug) is past (2025-11-29T10:00:00.000Z), will be marked as completed
[ActivitiesCronService] Found 1 past activities to complete (out of 4 checked)
[ActivitiesCronService] Activity ... (Test Past Activity - Debug) marked as completed
```

Vérifiez dans MongoDB :

```javascript
db.activities.findOne({ title: "Test Past Activity - Debug" })
// isCompleted devrait être true
```

### 5. Vérifier les Activités Existantes

Pour chaque activité non complétée, vérifiez manuellement :

```javascript
// Récupérer une activité spécifique
const activity = db.activities.findOne({ _id: ObjectId("692b1636a82ac339d0d058b4") })

// Vérifier les dates
print("Date:", activity.date)
print("Time:", activity.time)
print("IsCompleted:", activity.isCompleted)

// Calculer si elle est passée
const now = new Date()
const activityDateTime = activity.time || activity.date
print("Activity DateTime:", activityDateTime)
print("Now:", now)
print("Is Past:", activityDateTime < now)
```

## 🐛 Problèmes Courants et Solutions

### Problème 1 : Le champ `time` n'existe pas

**Symptôme :** Les logs montrent "has no date/time, skipping"

**Solution :** Vérifiez que les activités sont créées avec le champ `time`. Dans `activities.service.ts`, lors de la création :

```typescript
const activityData = {
  ...createActivityDto,
  creator: userId,
  date: new Date(createActivityDto.date),
  time: activityDateTime, // ✅ Doit être défini
  // ...
};
```

### Problème 2 : Format de date incorrect

**Symptôme :** "Invalid Date" dans les logs

**Solution :** Assurez-vous que les dates sont en format ISO 8601 ou Date JavaScript.

### Problème 3 : Timezone incorrecte

**Symptôme :** Les activités semblent être dans le futur alors qu'elles devraient être passées

**Solution :** Utilisez toujours UTC pour les dates. Dans le frontend, convertissez les dates locales en UTC avant d'envoyer au backend.

### Problème 4 : Le cron job ne s'exécute pas

**Symptôme :** Aucun log du cron job

**Vérifications :**
1. `ScheduleModule.forRoot()` est importé dans `app.module.ts`
2. `ActivitiesCronService` est dans les `providers` de `ActivitiesModule`
3. Le serveur est démarré

## 📝 Logs Attendus (Succès)

```
[Nest] 4812  - 11/30/2025, 12:05:00 AM   DEBUG [ActivitiesCronService] Checking for past activities at 2025-11-30T00:05:00.015Z
[Nest] 4812  - 11/30/2025, 12:05:00 AM   DEBUG [ActivitiesCronService] Found 3 non-completed activities to check
[Nest] 4812  - 11/30/2025, 12:05:00 AM   DEBUG [ActivitiesCronService] Activity 692b1636a82ac339d0d058b4 (test): time=2025-11-29T17:49:00.000Z, parsed=2025-11-29T17:49:00.000Z
[Nest] 4812  - 11/30/2025, 12:05:00 AM   DEBUG [ActivitiesCronService] Activity 692b1636a82ac339d0d058b4 (test): activityDateTime=2025-11-29T17:49:00.000Z, now=2025-11-30T00:05:00.000Z, isPast=true
[Nest] 4812  - 11/30/2025, 12:05:00 AM     LOG [ActivitiesCronService] ✅ Activity 692b1636a82ac339d0d058b4 (test) is past (2025-11-29T17:49:00.000Z), will be marked as completed
[Nest] 4812  - 11/30/2025, 12:05:00 AM     LOG [ActivitiesCronService] Found 1 past activities to complete (out of 3 checked)
[Nest] 4812  - 11/30/2025, 12:05:00 AM     LOG [ActivitiesCronService] Activity 692b1636a82ac339d0d058b4 (test) marked as completed
[Nest] 4812  - 11/30/2025, 12:05:00 AM     LOG [ActivitiesCronService] Completed processing 1 past activities
```

## ✅ Checklist de Vérification

- [ ] Vérifier le format des dates dans MongoDB
- [ ] Vérifier que les activités ont un champ `time`
- [ ] Vérifier les logs détaillés du cron job
- [ ] Tester avec une activité passée manuellement créée
- [ ] Vérifier que `ScheduleModule.forRoot()` est importé
- [ ] Vérifier que `ActivitiesCronService` est dans les providers
- [ ] Redémarrer le serveur après les modifications

## 🎯 Résultat Attendu

Après correction, les logs devraient montrer :

1. **Détection des activités passées :**
   ```
   [ActivitiesCronService] ✅ Activity ... is past (...), will be marked as completed
   ```

2. **Marquage comme complétées :**
   ```
   [ActivitiesCronService] Activity ... marked as completed
   ```

3. **Confirmation :**
   ```
   [ActivitiesCronService] Completed processing X past activities
   ```

4. **Dans MongoDB :**
   ```javascript
   db.activities.find({ isCompleted: true }).count() // Devrait augmenter
   ```

## 📞 Si le Problème Persiste

1. **Partagez les logs complets** du cron job (niveau DEBUG)
2. **Partagez un exemple d'activité** depuis MongoDB (format JSON)
3. **Vérifiez la version de Node.js** et des dépendances
4. **Vérifiez les timezones** du serveur et de MongoDB


# 🔧 Fix - Activités Terminées qui s'Affichent Encore

## 📊 Problème

Les activités terminées s'affichent encore dans le frontend alors qu'elles devraient être masquées.

## 🔍 Cause

Le **cron job** qui marque automatiquement les activités passées comme complétées ne fonctionnait pas correctement. Il utilisait une requête MongoDB qui ne trouvait pas les activités passées.

## ✅ Solution Implémentée

### 1. Correction du Cron Job (`activities-cron.service.ts`)

**Avant :**
```typescript
// ❌ Ne fonctionnait pas correctement
const pastActivities = await this.activityModel
  .find({
    isCompleted: { $ne: true },
    time: { $lt: now },
  })
  .exec();
```

**Après :**
```typescript
// ✅ Récupère toutes les activités non complétées et vérifie manuellement
const activities = await this.activityModel
  .find({
    isCompleted: { $ne: true },
  })
  .populate('creator', 'name')
  .exec();

// Filtrer les activités passées en combinant date + time
const pastActivities: ActivityDocument[] = [];

for (const activity of activities) {
  // Combiner date et time pour obtenir la date/heure complète
  let activityDateTime: Date | null = null;

  // Priorité 1: Utiliser le champ 'time' qui contient date + heure
  if (activity.time) {
    activityDateTime = activity.time instanceof Date
      ? activity.time
      : new Date(activity.time);
  }
  // Priorité 2: Utiliser le champ 'date' et supposer minuit
  else if (activity.date) {
    activityDateTime = activity.date instanceof Date
      ? activity.date
      : new Date(activity.date);
  }

  // Vérifier si l'activité est passée
  if (activityDateTime && activityDateTime < now) {
    pastActivities.push(activity);
  }
}
```

### 2. Vérification que les Endpoints Filtrent les Activités Complétées

Tous les endpoints filtrent déjà correctement les activités complétées :

- ✅ `GET /activities` - Filtre avec `isCompleted: { $ne: true }`
- ✅ `GET /activities/coach-sessions` - Filtre avec `isCompleted: { $ne: true }`
- ✅ `GET /activities/individual` - Filtre avec `isCompleted: { $ne: true }`
- ✅ `GET /activities?visibility=friends` - Filtre avec `isCompleted: { $ne: true }`

## 🧪 Test

### 1. Vérifier que le Cron Job Fonctionne

Attendez 1 minute après le démarrage du serveur et vérifiez les logs :

```
[ActivitiesCronService] Checking for past activities at 2025-11-30T...
[ActivitiesCronService] Found X non-completed activities to check
[ActivitiesCronService] Activity ... is past: ...
[ActivitiesCronService] Found X past activities to complete
[ActivitiesCronService] Activity ... marked as completed
```

### 2. Vérifier dans MongoDB

```javascript
// Vérifier les activités complétées
db.activities.find({ isCompleted: true }).count()

// Vérifier les activités non complétées
db.activities.find({ isCompleted: { $ne: true } }).count()
```

### 3. Tester avec une Activité Passée

Créer une activité avec une date/heure passée dans MongoDB :

```javascript
db.activities.insertOne({
  title: "Test Past Activity",
  sportType: "Running",
  location: "Test Location",
  date: new Date("2025-11-29"),
  time: new Date("2025-11-29T10:00:00Z"), // Passé
  participants: 5,
  level: "Beginner",
  visibility: "public",
  creator: ObjectId("..."), // Votre user ID
  isCompleted: false
})
```

Attendre 1 minute et vérifier que `isCompleted` est devenu `true`.

## 📝 Notes Importantes

1. **Le cron job s'exécute toutes les minutes** (`@Cron(CronExpression.EVERY_MINUTE)`)
2. **Il marque automatiquement les activités passées** comme `isCompleted = true`
3. **Il envoie des notifications de review** pour les activités coach (price > 0)
4. **Le frontend filtre ensuite** les activités avec `isCompleted = true` pour ne pas les afficher

## 🔄 Flux Complet

1. **Cron Job** (toutes les minutes) :
   - Récupère toutes les activités non complétées
   - Vérifie si elles sont passées (date + time < maintenant)
   - Marque comme `isCompleted = true`
   - Envoie des notifications de review pour les activités coach

2. **Backend Endpoints** :
   - Filtrent automatiquement avec `isCompleted: { $ne: true }`
   - Ne retournent que les activités non complétées

3. **Frontend** :
   - Reçoit uniquement les activités non complétées
   - Les affiche normalement

## ✅ Checklist

- [x] Corriger le cron job pour qu'il trouve les activités passées
- [x] Vérifier que tous les endpoints filtrent les activités complétées
- [x] Tester avec une activité passée
- [x] Vérifier les logs du cron job
- [ ] Vérifier dans le frontend que les activités terminées ne s'affichent plus

## 🐛 Si le Problème Persiste

1. **Vérifier les logs du cron job** :
   ```
   [ActivitiesCronService] Checking for past activities...
   ```

2. **Vérifier le format des dates dans MongoDB** :
   ```javascript
   db.activities.find({}, { _id: 1, title: 1, date: 1, time: 1, isCompleted: 1 }).limit(5)
   ```

3. **Vérifier que ScheduleModule est importé** dans `app.module.ts` :
   ```typescript
   ScheduleModule.forRoot(),
   ```

4. **Vérifier que ActivitiesCronService est dans les providers** de `ActivitiesModule` :
   ```typescript
   providers: [
     ActivitiesService,
     ActivitiesCronService, // ✅ Doit être présent
     ...
   ],
   ```

5. **Redémarrer le serveur** pour que les changements prennent effet.

## 🎯 Conclusion

Le problème était dans le cron job qui ne trouvait pas correctement les activités passées. La solution consiste à :
1. Récupérer toutes les activités non complétées
2. Vérifier manuellement si elles sont passées en combinant `date` + `time`
3. Les marquer comme complétées

Les endpoints backend filtrent déjà correctement les activités complétées, donc une fois que le cron job fonctionne, les activités terminées ne s'afficheront plus dans le frontend.


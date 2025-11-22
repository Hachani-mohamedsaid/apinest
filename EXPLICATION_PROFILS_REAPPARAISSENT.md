# 🔍 Explication - Pourquoi les Profils Réapparaissent Après Like/Pass

## ❌ Problèmes Identifiés

1. **Tous les profils s'affichent** : Le filtre montrait tous les utilisateurs
2. **Profils likés réapparaissent** : Après avoir liké, le profil revient dans la liste
3. **Profils passés réapparaissent immédiatement** : Après avoir passé, le profil revient tout de suite

## ✅ Corrections Appliquées

### 1. Exclusion Stricte des Profils Likés

**Avant :** Les profils likés pouvaient réapparaître dans le filtre assoupli.

**Après :** Les profils likés sont **TOUJOURS** exclus, même dans le filtre assoupli, avec double vérification.

**Code ajouté :**
```typescript
// Double vérification pour s'assurer qu'aucun profil exclu n'est inclus
const finalAdditionalUsers = uniqueAdditionalUsers.filter((user) => {
  const userIdStr = user._id.toString();
  return !excludedUserIds.has(userIdStr) && userIdStr !== userId;
});

// Vérification finale
const hasExcludedProfiles = compatibleProfiles.some((profile) => {
  const profileIdStr = profile._id.toString();
  return excludedUserIds.has(profileIdStr) || profileIdStr === userId;
});

if (hasExcludedProfiles) {
  // Filtrer les profils exclus
  compatibleProfiles = compatibleProfiles.filter((profile) => {
    const profileIdStr = profile._id.toString();
    return !excludedUserIds.has(profileIdStr) && profileIdStr !== userId;
  });
}
```

### 2. Exclusion des Profils Passés Récents

**Avant :** Les profils passés n'étaient pas exclus, donc ils réapparaissaient immédiatement.

**Après :** Exclusion des profils passés dans les **7 derniers jours** pour éviter qu'ils réapparaissent immédiatement. Les profils passés il y a plus de 7 jours peuvent réapparaître (comme dans Tinder).

**Code ajouté :**
```typescript
const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

const recentPasses = await this.passModel
  .find({
    fromUser: new Types.ObjectId(userId),
    createdAt: { $gte: sevenDaysAgo }, // Seulement les passes récents (7 derniers jours)
  })
  .exec();

// Exclure les profils passés récemment
recentPasses.forEach((pass) => excludedUserIds.add(pass.toUser.toString()));
```

### 3. Filtre Assoupli Corrigé

**Avant :** Le filtre assoupli incluait tous les utilisateurs sans vérifier les exclusions.

**Après :** Le filtre assoupli **TOUJOURS** vérifie les exclusions avant d'inclure un profil.

**Code :**
```typescript
const additionalQuery: any = {
  _id: { $nin: excludedIds }, // Exclut TOUJOURS userId, likés, matchés, et passes récents
  sportsInterests: { $exists: true, $ne: [], $not: { $size: 0 } },
};
```

## 📊 Comportement Attendu Après Correction

### Après Avoir Liké un Profil

✅ **Le profil liké disparaît immédiatement**
✅ **Le profil liké ne réapparaît jamais** (sauf en cas de match)
✅ **Le profil liké est exclu de toutes les requêtes futures**

**Logs attendus :**
```
[QuickMatch] Excluded profiles - Liked: 1, Matched: 0, Recent Passes: 0, Total excluded: 1
[QuickMatch] Compatible profiles after sports filter: 14  // ✅ Le profil liké n'est pas dans les 14
```

### Après Avoir Passé un Profil

✅ **Le profil passé disparaît immédiatement**
✅ **Le profil passé ne réapparaît pas dans les 7 jours suivants**
⚠️ **Le profil passé peut réapparaître après 7 jours** (comportement normal, comme Tinder)

**Logs attendus :**
```
[QuickMatch] Excluded profiles - Liked: 0, Matched: 0, Recent Passes: 1, Total excluded: 1
[QuickMatch] Compatible profiles after sports filter: 14  // ✅ Le profil passé n'est pas dans les 14
```

### Cas Spécial : Profil Liké puis Passé

❌ **Impossible** : Si un profil est déjà liké, on ne peut pas le passer.

**Code de vérification :**
```typescript
if (existingLike) {
  throw new ConflictException('Cannot pass a profile that was liked');
}
```

## 🔍 Comment Vérifier

### Test 1 : Liker un Profil

1. Ouvrir QuickMatch
2. Liker un profil (swipe droite)
3. Rafraîchir la liste (pull to refresh)
4. **Résultat attendu :** Le profil liké ne doit **pas** être dans la liste ✅

### Test 2 : Passer un Profil

1. Ouvrir QuickMatch
2. Passer un profil (swipe gauche)
3. Rafraîchir la liste (pull to refresh)
4. **Résultat attendu :** Le profil passé ne doit **pas** être dans la liste pour les 7 prochains jours ✅
5. Après 7 jours : Le profil peut réapparaître (comportement normal)

### Test 3 : Vérifier les Logs Backend

Après avoir liké/passé un profil, vérifiez les logs :

```
// Après avoir liké un profil
[QuickMatch] Excluded profiles - Liked: 1, Matched: 0, Recent Passes: 0, Total excluded: 1

// Après avoir passé un profil
[QuickMatch] Excluded profiles - Liked: 0, Matched: 0, Recent Passes: 1, Total excluded: 1

// Après avoir liké ET passé des profils
[QuickMatch] Excluded profiles - Liked: 3, Matched: 1, Recent Passes: 5, Total excluded: 9
```

### Test 4 : Vérifier MongoDB

```javascript
// Vérifier les profils likés
db.likes.find({ fromUser: ObjectId("votre_user_id") })

// Vérifier les profils passés récents (7 derniers jours)
const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
db.passes.find({
  fromUser: ObjectId("votre_user_id"),
  createdAt: { $gte: sevenDaysAgo }
})

// Vérifier les profils matchés
db.matches.find({
  $or: [
    { user1: ObjectId("votre_user_id") },
    { user2: ObjectId("votre_user_id") }
  ]
})
```

## ⚙️ Configuration de l'Exclusion des Passes

### Exclusion des Passes Récents (Actuel)

**Comportement :** Exclusion des profils passés dans les **7 derniers jours**.

**Avantages :**
- ✅ Les profils passés ne réapparaissent pas immédiatement
- ✅ Après 7 jours, on peut revoir les profils (seconde chance)
- ✅ Comportement similaire à Tinder

**Code :**
```typescript
const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
const recentPasses = await this.passModel.find({
  fromUser: new Types.ObjectId(userId),
  createdAt: { $gte: sevenDaysAgo }
}).exec();
```

### Option Alternative : Exclusion Définitive

Si vous voulez **jamais** revoir les profils passés :

**Code :**
```typescript
// Exclure TOUS les profils passés (pas seulement récents)
const allPasses = await this.passModel.find({
  fromUser: new Types.ObjectId(userId)
}).exec();
allPasses.forEach((pass) => excludedUserIds.add(pass.toUser.toString()));
```

**Avantages :**
- ✅ Les profils passés ne réapparaissent jamais
- ❌ L'utilisateur peut manquer de profils à voir

### Option Alternative : Exclusion Plus Longue (30 jours)

Si vous voulez une exclusion plus longue :

**Code :**
```typescript
const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
const recentPasses = await this.passModel.find({
  fromUser: new Types.ObjectId(userId),
  createdAt: { $gte: thirtyDaysAgo }
}).exec();
```

## ✅ Résumé

| Action | Comportement Avant | Comportement Après |
|--------|-------------------|-------------------|
| **Liker un profil** | ❌ Peut réapparaître | ✅ **Jamais** réapparaît |
| **Passer un profil** | ❌ Réapparaît immédiatement | ✅ **Ne réapparaît pas** dans les 7 jours |
| **Profil passé (7+ jours)** | ❌ Réapparaît | ✅ Peut réapparaître (seconde chance) |

## 🎯 Résultat Final

✅ **Profils likés** : Jamais réapparaissent
✅ **Profils passés récents** : Ne réapparaissent pas dans les 7 jours
✅ **Profils passés anciens** : Peuvent réapparaître après 7 jours (comportement normal)
✅ **Double vérification** : S'assure qu'aucun profil exclu n'est inclus

Les profils likés et passés récents ne devraient plus réapparaître ! 🎉


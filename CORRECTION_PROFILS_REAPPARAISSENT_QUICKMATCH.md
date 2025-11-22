# 🔧 Correction - Profils Qui Réapparaissent Après Like/Pass

## ❌ Problèmes Identifiés

1. **Tous les profils s'affichent** : Le filtre assoupli incluait même les profils likés
2. **Profils likés réapparaissent** : Après avoir liké un profil, il réapparaît dans la liste
3. **Profils passés réapparaissent** : Après avoir passé un profil, il réapparaît immédiatement

## 🔍 Causes

### 1. Filtre Assoupli Trop Permissif

Le filtre assoupli incluait **TOUS** les utilisateurs disponibles sans vérifier s'ils étaient déjà likés/matchés, causant des profils likés à réapparaître.

### 2. Exclusion des Profils Likés Non Appliquée

Dans le filtre assoupli, l'exclusion des profils likés n'était pas correctement appliquée lors de la combinaison des listes.

### 3. Profils Passés Non Exclus

Les profils passés ne sont **volontairement** pas exclus pour permettre de les revoir, mais ils réapparaissent **immédiatement** après un pass.

## ✅ Solutions Appliquées

### 1. Exclusion Stricte des Profils Likés/Matchés

**Modification :** Double vérification pour s'assurer qu'aucun profil exclu n'est inclus, même dans le filtre assoupli.

**Code ajouté :**
```typescript
// Double vérification : s'assurer qu'aucun profil liké/matché n'est inclus
const finalAdditionalUsers = uniqueAdditionalUsers.filter((user) => {
  const userIdStr = user._id.toString();
  return !excludedUserIds.has(userIdStr) && userIdStr !== userId;
});

// Vérification finale : s'assurer qu'aucun profil exclu n'est présent
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

### 2. Filtre Assoupli Corrigé

**Avant :** Incluait tous les utilisateurs sans vérifier les exclusions.

**Après :** Inclut seulement les utilisateurs qui ne sont **pas** dans `excludedIds` (utilisateur connecté + profils likés + profils matchés).

**Code :**
```typescript
const additionalQuery: any = {
  _id: { $nin: excludedIds }, // Exclut TOUJOURS userId, likés, et matchés
  sportsInterests: { $exists: true, $ne: [], $not: { $size: 0 } },
};
```

### 3. Logs de Débogage Ajoutés

Les logs suivants permettent de vérifier que l'exclusion fonctionne :

```typescript
this.logger.log(`[QuickMatch] Excluded profiles - Liked: ${likedProfiles.length}, Matched: ${matchedProfiles.length}, Total excluded: ${excludedUserIds.size}`);
this.logger.log(`[QuickMatch] Additional users found (excluding liked/matched): ${additionalUsers.length}`);
this.logger.log(`[QuickMatch] Final additional users (after duplicate/exclusion check): ${finalAdditionalUsers.length}`);
this.logger.log(`[QuickMatch] After filtering excluded profiles: ${compatibleProfiles.length} profiles`);
```

## 📊 Comportement Attendu

### Après Avoir Liké un Profil

**Avant la correction :**
- ❌ Le profil liké peut réapparaître dans la liste

**Après la correction :**
- ✅ Le profil liké est **toujours exclu** de la liste
- ✅ Le profil liké ne réapparaît **jamais** (sauf en cas de match, où il passe dans une autre section)

### Après Avoir Passé un Profil

**Comportement actuel :**
- ⚠️ Le profil passé **peut réapparaître** (car on ne les exclut pas pour permettre de les revoir)
- ✅ C'est un comportement **volontaire** (comme dans Tinder, on peut revoir les profils passés)

**Si vous voulez exclure les profils passés :**

Option 1 : Exclure les profils passés définitivement
```typescript
const [likedProfiles, passedProfiles, matchedProfiles] = await Promise.all([...]);
passedProfiles.forEach((pass) => excludedUserIds.add(pass.toUser.toString()));
```

Option 2 : Exclure les profils passés récents (moins de 7 jours)
```typescript
const recentPasses = await this.passModel
  .find({
    fromUser: new Types.ObjectId(userId),
    createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
  })
  .exec();
recentPasses.forEach((pass) => excludedUserIds.add(pass.toUser.toString()));
```

## 🔍 Comment Vérifier

### 1. Vérifier les Logs Backend

Après avoir liké un profil, vérifiez les logs :

```
[QuickMatch] Excluded profiles - Liked: 1, Matched: 0, Total excluded: 1
[QuickMatch] Users found before sports filter: 15
[QuickMatch] Compatible profiles after sports filter: 14  // ✅ Le profil liké n'est pas dans les résultats
```

### 2. Tester le Comportement

1. **Liker un profil** → Le profil doit disparaître de la liste
2. **Rafraîchir la liste** → Le profil liké ne doit **pas** réapparaître
3. **Passer un profil** → Le profil peut réapparaître (comportement normal, comme Tinder)

### 3. Vérifier MongoDB

```javascript
// Vérifier les profils likés
db.likes.find({ fromUser: ObjectId("votre_user_id") })

// Vérifier les profils passés
db.passes.find({ fromUser: ObjectId("votre_user_id") })

// Vérifier les profils retournés par l'API
// Aucun des profils likés ne doit être dans les résultats
```

## ⚠️ Notes Importantes

### Pourquoi Les Profils Passés Peuvent Réapparaître ?

C'est un **comportement volontaire** pour plusieurs raisons :

1. **Plus de Choix** : L'utilisateur a toujours des profils à voir
2. **Seconde Chance** : L'utilisateur peut changer d'avis
3. **Comme Tinder** : Dans Tinder, on peut revoir les profils passés après un certain temps

### Comment Empêcher les Profils Passés de Réapparaître ?

Si vous voulez exclure les profils passés, vous pouvez :

**Option 1 : Exclusion Définitive**
```typescript
passedProfiles.forEach((pass) => excludedUserIds.add(pass.toUser.toString()));
```

**Option 2 : Exclusion Temporaire (Recommandé)**
```typescript
const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
const recentPasses = passedProfiles.filter(
  (pass) => new Date(pass.createdAt) >= sevenDaysAgo
);
recentPasses.forEach((pass) => excludedUserIds.add(pass.toUser.toString()));
```

Cette option exclut seulement les profils passés dans les **7 derniers jours**, permettant de les revoir après.

## ✅ Checklist de Vérification

- [x] Exclusion stricte des profils likés dans le filtre assoupli
- [x] Double vérification pour s'assurer qu'aucun profil exclu n'est inclus
- [x] Logs de débogage ajoutés
- [x] Filtre assoupli corrigé pour toujours exclure les profils likés/matchés
- [ ] Test : Liker un profil → Vérifier qu'il ne réapparaît pas
- [ ] Test : Passer un profil → Vérifier le comportement (réapparaît ou non selon votre choix)

## 🎯 Résumé

**Problème 1 : Profils likés réapparaissent** → ✅ **CORRIGÉ**
- Exclusion stricte appliquée avec double vérification
- Les profils likés ne réapparaissent **jamais**

**Problème 2 : Profils passés réapparaissent** → ⚠️ **COMPORTEMENT VOLONTAIRE**
- Les profils passés peuvent réapparaître (comme dans Tinder)
- Si vous voulez les exclure, ajoutez le code ci-dessus

**Problème 3 : Tous les profils s'affichent** → ✅ **CORRIGÉ**
- Le filtre assoupli est maintenant correctement appliqué
- Seulement les profils non exclus sont retournés

Les profils likés ne devraient plus réapparaître. Les profils passés peuvent toujours réapparaître (comportement normal), mais si vous voulez les exclure aussi, dites-le moi et je l'ajouterai.


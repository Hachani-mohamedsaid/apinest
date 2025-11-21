# ✅ Correction Backend - Un Seul Profil dans QuickMatch

## 🔧 Problème Identifié

Le backend retournait seulement **1 profil** au lieu de plusieurs, car il excluait **trop de profils** :
- ✅ Profils déjà likés (normal)
- ❌ **Profils déjà passés** (problème - excluait définitivement)
- ✅ Profils avec matchs (normal)

**Résultat :** Si l'utilisateur avait déjà passé plusieurs profils, il ne restait qu'un seul profil disponible.

## ✅ Solution Appliquée

### Modification dans `quick-match.service.ts`

**Fichier :** `src/modules/quick-match/quick-match.service.ts`

**Méthode :** `getCompatibleProfiles()`

**Changement :** Ne plus exclure les profils passés pour permettre de les revoir.

### Code Avant (Problème)

```typescript
// 6. Récupérer les IDs des profils déjà likés, passés ou matchés
const [likedProfiles, passedProfiles, matchedProfiles] = await Promise.all([
  this.likeModel.find({ fromUser: new Types.ObjectId(userId) }).select('toUser').exec(),
  this.passModel.find({ fromUser: new Types.ObjectId(userId) }).select('toUser').exec(), // ❌
  this.matchModel.find({ ... }).select('user1 user2').exec(),
]);

const excludedUserIds = new Set<string>();
likedProfiles.forEach((like) => excludedUserIds.add(like.toUser.toString()));
passedProfiles.forEach((pass) => excludedUserIds.add(pass.toUser.toString())); // ❌ Excluait les passés
matchedProfiles.forEach((match) => { ... });
```

### Code Après (Solution)

```typescript
// 6. Récupérer les IDs des profils déjà likés ou matchés
// NOTE: On n'exclut PAS les profils passés pour permettre de les revoir
const [likedProfiles, matchedProfiles] = await Promise.all([
  this.likeModel.find({ fromUser: new Types.ObjectId(userId) }).select('toUser').exec(),
  // ✅ Supprimé : passedProfiles
  this.matchModel.find({ ... }).select('user1 user2').exec(),
]);

const excludedUserIds = new Set<string>();
// Exclure seulement les profils déjà likés
likedProfiles.forEach((like) => excludedUserIds.add(like.toUser.toString()));
// Exclure les profils avec lesquels on a déjà matché
matchedProfiles.forEach((match) => { ... });
// ✅ NOTE: On n'exclut PAS les profils passés pour permettre de les revoir
```

## 🎯 Résultat Attendu

### Avant la Correction

```json
{
  "profiles": [{"_id":"690e23ebf083f749b2562383","name":"Neji Hachani"}],
  "pagination": {
    "total": 1,        // ❌ Seulement 1 profil
    "page": 1,
    "totalPages": 1,
    "limit": 50
  }
}
```

### Après la Correction

```json
{
  "profiles": [
    {"_id":"690e23ebf083f749b2562383","name":"Neji Hachani"},
    {"_id":"690e23ebf083f749b2562384","name":"User 2"},
    {"_id":"690e23ebf083f749b2562385","name":"User 3"},
    // ... plus de profils
  ],
  "pagination": {
    "total": 15,      // ✅ Plus de profils disponibles
    "page": 1,
    "totalPages": 1,
    "limit": 50
  }
}
```

## 📊 Logique de Filtrage Mise à Jour

### Profils Exclus (Ne Sont Plus Affichés)

1. ✅ **Profils déjà likés** : On ne peut pas liker deux fois
2. ✅ **Profils avec matchs** : On ne peut pas revoir les profils avec lesquels on a matché

### Profils Inclus (Sont Affichés)

1. ✅ **Profils compatibles** : Avec au moins un sport en commun
2. ✅ **Profils passés** : Peuvent être revus (nouveau comportement)
3. ✅ **Nouveaux profils** : Qui n'ont jamais été likés/passés

## 🔄 Comportement Utilisateur

### Avant

- Utilisateur passe 10 profils → Il ne reste qu'1 profil disponible
- Utilisateur doit attendre de nouveaux utilisateurs pour voir plus de profils

### Après

- Utilisateur passe 10 profils → Les profils passés peuvent être revus
- Utilisateur peut continuer à swiper et voir plus de profils
- Les profils passés réapparaissent dans la liste (comme dans Tinder)

## ⚠️ Notes Importantes

### Pourquoi Ne Pas Exclure les Passés ?

1. **Plus de Profils Disponibles** : L'utilisateur a toujours des profils à voir
2. **Expérience Utilisateur** : Comme dans Tinder, on peut revoir les profils passés
3. **Pas de Blocage** : L'utilisateur n'est pas bloqué s'il a passé tous les profils

### Alternative : Expiration des Passes (Optionnel)

Si vous voulez garder une exclusion partielle, vous pouvez ajouter une expiration :

```typescript
// Exclure seulement les passes récents (moins de 7 jours)
const recentPasses = await this.passModel
  .find({
    fromUser: new Types.ObjectId(userId),
    createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // 7 jours
  })
  .select('toUser')
  .exec();

recentPasses.forEach((pass) => excludedUserIds.add(pass.toUser.toString()));
```

**Avantage :** Équilibre entre ne pas montrer les mêmes profils tout le temps et avoir assez de profils disponibles.

## 📋 Checklist de Vérification

- [x] Code modifié dans `getCompatibleProfiles()`
- [x] Exclusion des profils passés supprimée
- [x] Exclusion des profils likés conservée
- [x] Exclusion des profils matchés conservée
- [x] Logs ajoutés pour le débogage
- [x] Pas d'erreurs de compilation
- [ ] Test avec plusieurs utilisateurs
- [ ] Vérification que plus de profils sont retournés

## 🧪 Test

### Test 1 : Vérifier le Nombre de Profils

1. Créer plusieurs utilisateurs avec des sports en commun
2. Passer quelques profils
3. Vérifier que le backend retourne toujours plusieurs profils

### Test 2 : Vérifier les Logs Backend

Après la correction, les logs devraient montrer :

```
[QuickMatch] Users with common sports: 15
[QuickMatch] Excluded (liked): 2
[QuickMatch] Excluded (matched): 1
[QuickMatch] Total excluded: 3
[QuickMatch] Compatible profiles found: 12
```

### Test 3 : Vérifier les Logs Frontend

Les logs Android devraient montrer :

```
D/QuickMatchDataSource: Profiles loaded: 12
D/QuickMatchDataSource: Pagination: total=12, page=1, totalPages=1
```

## 🎉 Résumé

**Problème :** Backend retournait seulement 1 profil car il excluait les profils passés.

**Solution :** Ne plus exclure les profils passés pour permettre de les revoir.

**Résultat :** Le backend retournera maintenant tous les profils compatibles (sauf ceux déjà likés ou matchés), permettant à l'utilisateur de voir plus de profils et de continuer à utiliser QuickMatch.

**Frontend :** Aucun changement nécessaire - le frontend affichera automatiquement tous les profils retournés par le backend.


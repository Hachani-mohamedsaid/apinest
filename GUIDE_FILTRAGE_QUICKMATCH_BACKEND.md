# 🔍 Guide Backend NestJS - Filtrage QuickMatch

## 📋 Vue d'ensemble

Ce guide explique en détail comment le backend NestJS filtre les profils pour QuickMatch. Le système filtre automatiquement les utilisateurs qui ont au moins un sport/intérêt commun avec l'utilisateur connecté, et exclut les profils déjà likés, passés ou matchés.

**Approche actuelle** : Le filtrage par sports communs est effectué **entièrement en JavaScript** après récupération des utilisateurs, pour permettre un matching flexible (case-insensitive, partiel, etc.).

---

## 🎯 Objectifs du Filtrage

1. **Filtrer par sports communs** : Afficher uniquement les utilisateurs avec au moins un sport/intérêt commun (matching flexible)
2. **Exclure les profils déjà vus** : Ne pas afficher les profils déjà likés, passés (7 jours) ou matchés
3. **Calculer la distance** : Afficher la distance entre les utilisateurs
4. **Trier par pertinence** : Classer les profils par score de pertinence
5. **Pagination** : Gérer la pagination pour les grandes listes

---

## 🏗️ Architecture

### Fichiers Principaux

```
quick-match/
├── quick-match.service.ts      # Logique de filtrage
├── quick-match.controller.ts   # Endpoint GET /quick-match/profiles
└── schemas/
    ├── like.schema.ts
    ├── match.schema.ts
    └── pass.schema.ts
```

---

## 1️⃣ Endpoint Principal

### GET /quick-match/profiles

**Fichier** : `src/modules/quick-match/quick-match.controller.ts`

```typescript
@Get('profiles')
async getProfiles(
  @Request() req,
  @Query('page') page?: number,
  @Query('limit') limit?: number,
) {
  const userId = req.user._id.toString();
  const result = await this.quickMatchService.getCompatibleProfiles(
    userId,
    page || 1,
    limit || 20,
  );

  return {
    profiles: result.profiles.map((profile) => ({
      _id: profile._id.toString(),
      id: profile._id.toString(),
      name: profile.name,
      // ... autres champs
    })),
    pagination: {
      total: result.total,
      page: result.page,
      totalPages: result.totalPages,
      limit: limit || 20,
    },
  };
}
```

---

## 2️⃣ Logique de Filtrage - Méthode Principale

### getCompatibleProfiles()

**Fichier** : `src/modules/quick-match/quick-match.service.ts`

#### 🔄 APPROCHE ACTUELLE (Correction Appliquée)

**Changement majeur** : Le filtrage par sports communs est effectué **entièrement en JavaScript** après récupération des utilisateurs, sans filtre MongoDB sur `sportsInterests`.

**Pourquoi ?**
- La requête MongoDB `$in` avec variations de casse était trop restrictive
- Ne trouvait qu'un seul profil sur 11 disponibles
- Le filtrage JavaScript permet un matching flexible (case-insensitive, partiel, etc.)

#### 📝 Code Complet

```typescript
async getCompatibleProfiles(
  userId: string,
  page: number = 1,
  limit: number = 20,
): Promise<{ profiles: any[]; total: number; page: number; totalPages: number }> {
  
  // ============================================
  // ÉTAPE 1 : Récupérer l'utilisateur connecté
  // ============================================
  const currentUser = await this.userModel.findById(userId).exec();
  if (!currentUser) {
    throw new NotFoundException('User not found');
  }

  // ============================================
  // ÉTAPE 2 : Récupérer les sportsInterests de l'utilisateur
  // ============================================
  const userSportsInterests = currentUser.sportsInterests || [];

  // ============================================
  // ÉTAPE 3 : Récupérer les activités créées par l'utilisateur
  // ============================================
  const userActivities = await this.activityModel
    .find({ creator: new Types.ObjectId(userId) })
    .exec();

  // ============================================
  // ÉTAPE 4 : Extraire les sports des activités
  // ============================================
  const activitySports = userActivities
    .map((activity) => activity.sportType)
    .filter(Boolean);

  // ============================================
  // ÉTAPE 5 : Combiner sportsInterests + sports des activités
  // ============================================
  const allUserSports = [
    ...new Set([...userSportsInterests, ...activitySports]),
  ].filter(Boolean);

  // Si l'utilisateur n'a aucun sport, retourner une liste vide
  if (allUserSports.length === 0) {
    return { profiles: [], total: 0, page, totalPages: 0 };
  }

  // ============================================
  // ÉTAPE 6 : Récupérer les IDs des profils à exclure
  // ============================================
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const [likedProfiles, matchedProfiles, recentPassedProfiles] = await Promise.all([
    // Profils déjà likés (exclusion permanente)
    this.likeModel
      .find({ fromUser: new Types.ObjectId(userId) })
      .select('toUser')
      .exec(),
    
    // Profils déjà matchés (exclusion permanente)
    this.matchModel
      .find({
        $or: [
          { user1: new Types.ObjectId(userId) },
          { user2: new Types.ObjectId(userId) },
        ],
      })
      .select('user1 user2')
      .exec(),
    
    // Profils passés récemment (exclusion temporaire de 7 jours)
    this.passModel
      .find({
        fromUser: new Types.ObjectId(userId),
        createdAt: { $gt: sevenDaysAgo }, // Seulement les passes récents
      })
      .select('toUser')
      .exec(),
  ]);

  // ============================================
  // ÉTAPE 7 : Construire la liste des IDs à exclure
  // ============================================
  const excludedUserIds = new Set<string>();
  
  likedProfiles.forEach((like) => excludedUserIds.add(like.toUser.toString()));
  recentPassedProfiles.forEach((pass) => excludedUserIds.add(pass.toUser.toString()));
  matchedProfiles.forEach((match) => {
    excludedUserIds.add(
      match.user1.toString() === userId
        ? match.user2.toString()
        : match.user1.toString(),
    );
  });

  const excludedIds = [
    new Types.ObjectId(userId), // Exclure l'utilisateur connecté
    ...Array.from(excludedUserIds).map((id) => new Types.ObjectId(id)),
  ];

  // ============================================
  // ÉTAPE 8 : Requête MongoDB - SANS FILTRE SPORTS
  // ============================================
  // IMPORTANT : On NE filtre PAS par sportsInterests dans MongoDB
  // On récupère TOUS les utilisateurs disponibles et on filtre en JavaScript
  
  const query: any = {
    _id: { $nin: excludedIds }, // Seulement exclure liked/matched/passed
    // AUCUN filtre sur sportsInterests ici
  };

  // ============================================
  // ÉTAPE 9 : Récupérer TOUS les utilisateurs disponibles
  // ============================================
  const skip = (page - 1) * limit;
  
  // Récupérer 3x plus pour compenser le filtrage JavaScript
  const limitForQuery = limit * 3;
  
  let allUsers = await this.userModel
    .find(query)
    .skip(skip)
    .limit(limitForQuery)
    .exec();

  // ============================================
  // ÉTAPE 10 : Filtrage JavaScript par sports communs
  // ============================================
  // Filtre ASSOUPLI : afficher si UN SEUL sport est en commun
  // Matching flexible : case-insensitive, partiel, préfixe, etc.
  
  let compatibleProfiles = allUsers.filter((user) => {
    const userSports = user.sportsInterests || [];

    if (userSports.length === 0) {
      return false; // Exclure les utilisateurs sans sports
    }

    // Fonction pour normaliser un sport
    const normalizeSport = (sport: string): string => {
      return sport
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]/g, ''); // Enlever caractères non alphanumériques
    };

    // Vérifier s'il y a au moins UN sport en commun (matching très flexible)
    const hasCommonSport = allUserSports.some((sport) => {
      const normalizedSport = normalizeSport(sport);
      return userSports.some((userSport) => {
        const normalizedUserSport = normalizeSport(userSport);
        
        // Correspondance flexible :
        // 1. Correspondance exacte après normalisation
        // 2. Correspondance partielle (contient)
        // 3. Correspondance partielle inverse (est contenu)
        // 4. Correspondance de début de mot (préfixe)
        return (
          normalizedUserSport === normalizedSport ||
          normalizedUserSport.includes(normalizedSport) ||
          normalizedSport.includes(normalizedUserSport) ||
          normalizedUserSport.startsWith(normalizedSport) ||
          normalizedSport.startsWith(normalizedUserSport)
        );
      });
    });

    return hasCommonSport;
  });

  // ============================================
  // ÉTAPE 11 : Enrichir avec les données supplémentaires
  // ============================================
  const enrichedProfiles = await Promise.all(
    compatibleProfiles.map(async (user) => {
      const activitiesCount = await this.activityModel.countDocuments({
        creator: user._id,
      }).exec();

      const distance = this.calculateDistance(currentUser, user);

      return {
        ...user.toObject(),
        activitiesCount,
        distance: distance !== null ? `${distance.toFixed(1)} km` : null,
      };
    }),
  );

  // ============================================
  // ÉTAPE 12 : Trier par pertinence
  // ============================================
  const sortedProfiles = this.sortByRelevance(enrichedProfiles, allUserSports);

  // ============================================
  // ÉTAPE 13 : Paginer les résultats filtrés
  // ============================================
  const paginatedProfiles = sortedProfiles.slice(0, limit);
  
  const total = compatibleProfiles.length;
  const totalPages = total > 0 ? Math.ceil(total / limit) : 0;

  return {
    profiles: paginatedProfiles,
    total,
    page,
    totalPages,
  };
}
```

---

## 3️⃣ Fonction de Normalisation des Sports

### normalizeSport()

**Logique de normalisation** :

```typescript
const normalizeSport = (sport: string): string => {
  return sport
    .toLowerCase()        // "Running" → "running"
    .trim()              // " Running " → "running"
    .replace(/[^a-z0-9]/g, ''); // "Running!" → "running" (enlever caractères spéciaux)
};
```

**Exemples de matching flexible** :

- `"Running"` ↔ `"running"` ✅ (case-insensitive)
- `"Running"` ↔ `"Running!"` ✅ (après normalisation)
- `"Running"` ↔ `"Run"` ✅ (préfixe)
- `"Swimming"` ↔ `"Swim"` ✅ (contient)
- `"Basketball"` ↔ `"Basket"` ✅ (contient)

---

## 4️⃣ Calcul de Distance

### calculateDistance()

Utilise la formule de Haversine pour calculer la distance entre deux utilisateurs.

```typescript
private calculateDistance(
  user1: UserDocument,
  user2: UserDocument,
): number | null {
  if (!user1.latitude || !user1.longitude || 
      !user2.latitude || !user2.longitude) {
    return null;
  }

  const R = 6371; // Rayon de la Terre en km
  
  const dLat = this.toRadians(user2.latitude - user1.latitude);
  const dLon = this.toRadians(user2.longitude - user1.longitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(this.toRadians(user1.latitude)) *
      Math.cos(this.toRadians(user2.latitude)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance;
}
```

---

## 5️⃣ Tri par Pertinence

### sortByRelevance()

Tri les profils par score de pertinence basé sur :
- Nombre de sports en commun (10 points par sport)
- Nombre d'activités créées (1 point par activité)
- Distance (bonus de 0-5 points, plus proche = meilleur)

---

## 6️⃣ Logs de Debug

### Logs Importants

Le service enregistre des logs détaillés pour le debug :

```
[QuickMatch] User sportsInterests: ["Running", "Basketball", ...]
[QuickMatch] User activities count: 5, activitySports: ["Swimming"]
[QuickMatch] User allUserSports: ["Running", "Basketball", "Swimming"]
[QuickMatch] Excluded profiles - Liked: 1, Matched: 1, Recent Passes: 0
[QuickMatch] MongoDB query: NO sports filter (will filter in JavaScript)
[QuickMatch] Users retrieved from DB (no sports filter): 11
[QuickMatch] Compatible profiles after JavaScript filter: 3
[QuickMatch] Returning 3 profiles (paginated from 3 compatible profiles)
```

---

## 7️⃣ Différences avec l'Ancienne Approche

### ❌ Ancienne Approche (Avant Correction)

```typescript
// Filtre MongoDB avec $in et variations de casse
query.sportsInterests = {
  $in: uniqueSports, // ["Running", "running", "RUNNING", ...]
};

// Résultat : Ne trouvait qu'1 profil sur 11 disponibles
```

**Problèmes** :
- Trop restrictif même avec variations de casse
- Ne gère pas les caractères spéciaux
- Ne gère pas les correspondances partielles

### ✅ Nouvelle Approche (Après Correction)

```typescript
// Pas de filtre MongoDB sur sportsInterests
const query: any = {
  _id: { $nin: excludedIds },
  // AUCUN filtre sur sportsInterests
};

// Filtrage JavaScript avec matching flexible
let compatibleProfiles = allUsers.filter((user) => {
  // Matching flexible : case-insensitive, partiel, préfixe, etc.
});

// Résultat : Trouve 3+ profils sur 11 disponibles
```

**Avantages** :
- Matching très flexible
- Gère les variations de casse automatiquement
- Gère les correspondances partielles
- Gère les caractères spéciaux (après normalisation)

---

## 8️⃣ Performance et Optimisations

### Limite de Récupération

Pour compenser le filtrage JavaScript, on récupère `limit * 3` utilisateurs :

```typescript
const limitForQuery = limit * 3; // Si limit=20, on récupère 60 utilisateurs
```

**Pourquoi ?**
- Le filtrage JavaScript élimine des utilisateurs
- On veut s'assurer d'avoir assez de résultats après filtrage
- 3x est un bon compromis entre performance et résultats

### Limitation Actuelle

**Pagination approximative** : Le `total` est calculé sur les profils de la page actuelle, pas sur TOUS les utilisateurs disponibles.

Pour une pagination exacte, il faudrait :
1. Récupérer TOUS les utilisateurs disponibles
2. Filtrer en JavaScript
3. Calculer le vrai total
4. Paginer

**Note** : Cela peut être lent pour de grandes bases de données.

---

## 9️⃣ Cas d'Usage et Exemples

### Exemple 1 : Utilisateur avec sportsInterests

**Utilisateur connecté** :
- `sportsInterests: ["Running", "Basketball"]`
- Aucune activité créée

**Résultat** :
- `allUserSports = ["Running", "Basketball"]`
- Filtre les utilisateurs qui ont "Running" OU "Basketball" (matching flexible)

### Exemple 2 : Exclusion Temporaire des Passes

**Utilisateur connecté** :
- A passé User A il y a 5 jours (toujours exclu)
- A passé User B il y a 10 jours (reapparaît car > 7 jours)

**Résultat** :
- User A : ❌ Exclu (passe récent)
- User B : ✅ Inclus (passe ancien)

---

## 🔟 Checklist de Vérification

### Logs Attendus

Après correction, vous devriez voir :

```
[QuickMatch] MongoDB query: NO sports filter (will filter in JavaScript)
[QuickMatch] Users retrieved from DB (no sports filter): 11
[QuickMatch] Compatible profiles after JavaScript filter: 3+
```

### Vérifications

- [x] Pas de filtre MongoDB sur `sportsInterests`
- [x] Filtrage JavaScript avec matching flexible
- [x] Exclusion permanente pour liked/matched
- [x] Exclusion temporaire (7 jours) pour passes
- [x] Normalisation des sports (case-insensitive, caractères spéciaux)
- [x] Matching partiel et préfixe
- [x] Pagination après filtrage

---

## ⚠️ Notes Importantes

1. **Filtrage JavaScript** : Le filtrage est effectué en JavaScript après récupération, pas dans MongoDB
2. **Performance** : Récupère 3x plus d'utilisateurs pour compenser le filtrage
3. **Pagination** : Approximative (basée sur la page actuelle)
4. **Matching Flexible** : Case-insensitive, partiel, préfixe, etc.
5. **Exclusion Temporaire** : Les passes expirent après 7 jours

---

## 📚 Ressources

- [MongoDB Query Operators](https://docs.mongodb.com/manual/reference/operator/query/)
- [Haversine Formula](https://en.wikipedia.org/wiki/Haversine_formula)
- [NestJS Documentation](https://docs.nestjs.com/)
- [Mongoose Documentation](https://mongoosejs.com/docs/)


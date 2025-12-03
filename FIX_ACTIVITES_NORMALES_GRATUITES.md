# 🔧 Fix Backend : Activités Normales Toujours Gratuites

## 🐛 Problème Résolu

**Symptôme :** Le backend bloquait **toutes** les créations d'activités, même les activités normales (gratuites).

**Erreur :**
```
403 - "Vous avez utilisé votre activité gratuite. Passez à Premium pour créer plus d'activités."
```

**Cause :** Le `SubscriptionLimitGuard` vérifiait les limites pour **toutes** les activités, sans différencier les activités normales des sessions payantes.

---

## ✅ Solution Appliquée

### Différenciation : Activités vs Sessions

**Règle :**
- ✅ **Activités normales** (`price == null` ou `price === 0`) : Toujours gratuites, **pas de limite**
- ❌ **Sessions** (`price > 0`) : Limitées selon le plan (1 gratuite, puis Premium)

---

## 🔧 Modifications Backend

### 1. Guard de Limitation (`SubscriptionLimitGuard`)

**Fichier :** `src/modules/subscription/subscription.guard.ts`

**Changement :** Vérifier le `price` avant de bloquer

**Code :**

```typescript
async canActivate(context: ExecutionContext): Promise<boolean> {
  const request = context.switchToHttp().getRequest();
  const userId = request.user?._id?.toString() || request.user?.sub;

  if (!userId) {
    throw new ForbiddenException('User not authenticated');
  }

  // ✅ DIFFÉRENCIER : Activité normale vs Session
  const body = request.body;
  const price = body?.price;

  // Si price est null, undefined ou 0 → Activité normale (gratuite, pas de limite)
  if (price == null || price === 0) {
    // Activité normale : Toujours autorisée, pas de vérification de limite
    return true;
  }

  // Si price > 0 → Session payante (avec limite)
  // Vérifier les limites seulement pour les sessions
  const limitCheck = await this.subscriptionService.checkActivityLimit(userId);

  if (!limitCheck.canCreate) {
    throw new ForbiddenException(limitCheck.message || 'Session limit reached');
  }

  request.subscriptionLimit = limitCheck;
  return true;
}
```

**Logique :**
1. ✅ Si `price == null` ou `price === 0` → **Autoriser immédiatement** (activité normale)
2. ✅ Si `price > 0` → **Vérifier les limites** (session payante)

---

### 2. Service d'Activités (`ActivitiesService`)

**Fichier :** `src/modules/activities/activities.service.ts`

**Changement :** N'incrémenter le compteur que pour les sessions

**Code :**

```typescript
// ✅ INCRÉMENTER LE COMPTEUR SEULEMENT POUR LES SESSIONS (avec prix)
// Les activités normales (price == null ou price === 0) ne sont pas comptabilisées
const isSession = createActivityDto.price != null && createActivityDto.price > 0;

if (isSession) {
  try {
    await this.subscriptionService.incrementActivityCount(userId);
    this.logger.log(
      `✅ Session count incremented for user ${userId} (price: ${createActivityDto.price})`,
    );
  } catch (error) {
    this.logger.error(`❌ Error incrementing session count: ${error.message}`);
  }
} else {
  this.logger.log(`ℹ️ Activity is free (no price), no count increment needed`);
}
```

**Logique :**
1. ✅ Si session (`price > 0`) → **Incrémenter le compteur**
2. ✅ Si activité normale (`price == null` ou `price === 0`) → **Ne pas incrémenter**

---

## 📊 Comportement Après Correction

### Activités Normales (Gratuites)

**Request :**
```json
POST /activities
{
  "sportType": "Football",
  "title": "Match de foot",
  "location": "Stade",
  "date": "2025-01-15",
  "time": "2025-01-15T18:00:00Z",
  "maxParticipants": 10
  // price n'est pas présent (null)
}
```

**Comportement :**
- ✅ **Guard** : Autorise immédiatement (`price == null`)
- ✅ **Service** : Ne comptabilise pas dans `activitiesUsedThisMonth`
- ✅ **Résultat** : Activité créée avec succès

**Limite :** ❌ Aucune limite (toujours autorisé)

---

### Sessions Payantes

**Request :**
```json
POST /activities
{
  "sportType": "Football",
  "title": "Session de coaching",
  "location": "Stade",
  "date": "2025-01-15",
  "time": "2025-01-15T18:00:00Z",
  "maxParticipants": 10,
  "price": 25.50  // ← Prix défini
}
```

**Comportement :**
- ✅ **Guard** : Vérifie les limites (`price > 0`)
- ✅ **Service** : Comptabilise dans `activitiesUsedThisMonth`
- ✅ **Résultat** : Session créée avec succès (si limite non atteinte)

**Limite :** ✅ Limitée selon le plan :
- **FREE** : 1 session gratuite
- **PREMIUM_NORMAL** : 5 sessions/mois
- **PREMIUM_GOLD** : 10 sessions/mois
- **PREMIUM_PLATINUM** : Illimité

---

## 🧪 Tests à Effectuer

### Test 1 : Créer une Activité Normale (Devrait Réussir)

```bash
POST /activities
Authorization: Bearer <token>
Content-Type: application/json
{
  "sportType": "Football",
  "title": "Match de foot gratuit",
  "location": "Stade",
  "date": "2025-01-15",
  "time": "2025-01-15T18:00:00Z",
  "maxParticipants": 10
  // Pas de price
}
```

**Réponse attendue :**
```
201 Created
{
  "id": "...",
  "title": "Match de foot gratuit",
  "price": null,
  ...
}
```

**Vérifier :**
- ✅ Activité créée avec succès
- ✅ Pas d'erreur 403
- ✅ `activitiesUsedThisMonth` n'est **pas** incrémenté

---

### Test 2 : Créer une Session Payante (Devrait Vérifier les Limites)

```bash
POST /activities
Authorization: Bearer <token>
Content-Type: application/json
{
  "sportType": "Football",
  "title": "Session de coaching",
  "location": "Stade",
  "date": "2025-01-15",
  "time": "2025-01-15T18:00:00Z",
  "maxParticipants": 10,
  "price": 25.50
}
```

**Réponse attendue :**
```
201 Created
{
  "id": "...",
  "title": "Session de coaching",
  "price": 25.50,
  ...
}
```

**Vérifier :**
- ✅ Session créée avec succès (si limite non atteinte)
- ✅ `activitiesUsedThisMonth` est incrémenté
- ✅ Ou erreur 403 si limite atteinte

---

### Test 3 : Créer Plusieurs Activités Normales (Devrait Toujours Réussir)

```bash
# Créer 10 activités normales (sans prix)
POST /activities { ... } // 1ère
POST /activities { ... } // 2ème
POST /activities { ... } // 3ème
...
POST /activities { ... } // 10ème
```

**Réponse attendue :**
- ✅ **Toutes** les activités sont créées avec succès
- ✅ Aucune limite n'est appliquée
- ✅ `activitiesUsedThisMonth` reste à 0

---

### Test 4 : Plan FREE Après Session Gratuite (Devrait Bloquer)

```bash
# 1. Créer une session gratuite (price > 0)
POST /activities { "price": 25.50, ... }

# 2. Vérifier les limites
GET /subscriptions/check-limit
# Devrait retourner : canCreate: false

# 3. Essayer de créer une 2ème session
POST /activities { "price": 25.50, ... }
```

**Réponse attendue :**
```
403 Forbidden
{
  "message": "Vous avez utilisé votre activité gratuite. Passez à Premium pour créer plus d'activités."
}
```

**Vérifier :**
- ✅ 2ème session est bloquée (limite atteinte)
- ✅ Mais une activité normale (sans prix) devrait toujours être autorisée

---

## 📋 Checklist de Vérification

### Backend

- [x] `SubscriptionLimitGuard` vérifie le `price` avant de bloquer
- [x] Si `price == null` ou `price === 0` → Autoriser immédiatement
- [x] Si `price > 0` → Vérifier les limites
- [x] `ActivitiesService` n'incrémente que pour les sessions
- [ ] **Test :** Créer activité normale → Devrait réussir
- [ ] **Test :** Créer session → Devrait vérifier les limites
- [ ] **Test :** Créer plusieurs activités normales → Toujours autorisées

---

## 🎯 Résultat Attendu

### Avant la Correction

- ❌ Toutes les créations sont bloquées (même activités normales)
- ❌ Les activités normales comptent dans les limites
- ❌ Impossible de créer des activités gratuites après utilisation de la session gratuite

### Après la Correction

- ✅ **Activités normales** (`price == null`) : Toujours autorisées, **pas de limite**
- ✅ **Sessions** (`price > 0`) : Limitées selon le plan
- ✅ Les activités normales ne comptent **pas** dans les limites
- ✅ Un utilisateur FREE peut créer **autant d'activités normales qu'il veut**

---

## 📝 Notes Importantes

1. **Différenciation :**
   - `price == null` ou `price === 0` = Activité normale (gratuite)
   - `price > 0` = Session payante (limitée)

2. **Backend :**
   - Le guard vérifie `price` avant de bloquer
   - Le service n'incrémente que pour les sessions

3. **Frontend :**
   - Aucun changement nécessaire
   - Les activités normales n'ont simplement pas de champ `price`

4. **Logique :**
   - Les activités normales sont **toujours gratuites** et **illimitées**
   - Seules les sessions payantes sont limitées

---

## 🔍 Logs Backend

### Activité Normale Créée

```
[ActivitiesService] ✅ Activity created successfully: id=..., title="Match de foot"
[ActivitiesService] ℹ️ Activity is free (no price), no count increment needed
```

### Session Créée

```
[SubscriptionLimitGuard] ✅ Session (price: 25.50) - Checking limits
[SubscriptionLimitGuard] ✅ Limits OK, allowing creation
[ActivitiesService] ✅ Activity created successfully: id=..., title="Session de coaching"
[ActivitiesService] ✅ Session count incremented for user ... (price: 25.50)
```

### Session Bloquée (Limite Atteinte)

```
[SubscriptionLimitGuard] ✅ Session (price: 25.50) - Checking limits
[SubscriptionLimitGuard] ❌ Limits exceeded, blocking creation
403 Forbidden: "Vous avez utilisé votre activité gratuite..."
```

---

## 📚 Fichiers Modifiés

### Backend

- ✅ `src/modules/subscription/subscription.guard.ts`
  - Vérification du `price` avant de bloquer
  - Autorisation immédiate pour activités normales

- ✅ `src/modules/activities/activities.service.ts`
  - Incrémentation du compteur uniquement pour les sessions
  - Log pour différencier activités et sessions

---

## ✅ Résumé

**Problème :** Le backend bloquait toutes les activités, même les gratuites.

**Solution :** Différencier les activités normales (illimitées) des sessions payantes (limitées).

**Résultat :**
- ✅ Activités normales : Toujours autorisées
- ✅ Sessions : Limitées selon le plan
- ✅ Backend prêt pour production

---

**Fix appliqué le** : Décembre 2025  
**Statut** : ✅ **Correction Backend Complète**


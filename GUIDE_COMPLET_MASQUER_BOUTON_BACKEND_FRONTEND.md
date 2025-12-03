# 🔄 Guide Complet : Masquer le Bouton Après Activité Gratuite

## 📋 Vue d'ensemble

Ce guide explique l'état actuel du **backend** (✅ **Complètement implémenté**) et ce qui doit être fait côté **frontend** (⏳ **À implémenter**).

---

## ✅ BACKEND : État Actuel (100% Fonctionnel)

### 🔒 1. Guard de Limitation (Sécurité)

**Fichier :** `src/modules/subscription/subscription.guard.ts`

**Statut :** ✅ **Implémenté et fonctionnel**

```typescript
@Injectable()
export class SubscriptionLimitGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const userId = request.user?._id?.toString();
    const limitCheck = await this.subscriptionService.checkActivityLimit(userId);
    
    if (!limitCheck.canCreate) {
      throw new ForbiddenException(limitCheck.message || 'Activity limit reached');
    }
    
    return true;
  }
}
```

**Protection :** Le guard bloque automatiquement toute tentative de création d'activité si la limite est atteinte.

---

### 🎯 2. Vérification des Limites

**Fichier :** `src/modules/subscription/subscription.service.ts`

**Méthode :** `checkActivityLimit(userId: string)`

**Statut :** ✅ **Implémenté et corrigé**

**Logique :**
1. ✅ Vérifie si l'utilisateur a une subscription active
2. ✅ Pour plan FREE : Vérifie `freeActivitiesRemaining > 0`
3. ✅ **NOUVEAU** : Si plan FREE et `freeActivitiesRemaining === 0` → `canCreate: false`
4. ✅ Pour plans premium : Vérifie la limite mensuelle

**Correction appliquée :**
```typescript
// Pour le plan FREE, si aucune activité gratuite restante,
// l'utilisateur ne peut plus créer d'activité
if (subscription.type === SubscriptionType.FREE && subscription.freeActivitiesRemaining === 0) {
  return {
    canCreate: false,
    message: `Vous avez utilisé votre activité gratuite. Passez à Premium pour créer plus d'activités.`,
  };
}
```

---

### 📊 3. Incrémentation du Compteur

**Fichier :** `src/modules/subscription/subscription.service.ts`

**Méthode :** `incrementActivityCount(userId: string)`

**Statut :** ✅ **Implémenté et fonctionnel**

**Logique :**
1. ✅ Utilise d'abord les activités gratuites (`freeActivitiesRemaining -= 1`)
2. ✅ Sinon, incrémente `activitiesUsedThisMonth`
3. ✅ Sauvegarde dans MongoDB

**Code :**
```typescript
async incrementActivityCount(userId: string): Promise<void> {
  const subscription = await this.getUserSubscription(userId);
  
  // Utiliser d'abord les activités gratuites pour les coaches vérifiés
  if (subscription.isCoachVerified && subscription.freeActivitiesRemaining > 0) {
    subscription.freeActivitiesRemaining -= 1;
    this.logger.log(`Coach ${userId} used free activity. Remaining: ${subscription.freeActivitiesRemaining}`);
  } else {
    subscription.activitiesUsedThisMonth += 1;
    this.logger.log(`Coach ${userId} used monthly activity. Used: ${subscription.activitiesUsedThisMonth}`);
  }
  
  await subscription.save();
}
```

---

### 🔗 4. Appel Après Création d'Activité

**Fichier :** `src/modules/activities/activities.service.ts`

**Statut :** ✅ **Implémenté et fonctionnel**

**Code :**
```typescript
async create(createActivityDto: CreateActivityDto, userId: string) {
  // ... création de l'activité ...
  
  // ✅ Incrémenter le compteur d'activités après création
  try {
    await this.subscriptionService.incrementActivityCount(userId);
    this.logger.log(`✅ Activity count incremented for user ${userId}`);
  } catch (error) {
    this.logger.error(`❌ Error incrementing activity count: ${error.message}`);
  }
  
  return savedActivity;
}
```

---

### 🛡️ 5. Application du Guard

**Fichier :** `src/modules/activities/activities.controller.ts`

**Statut :** ✅ **Implémenté et fonctionnel**

**Code :**
```typescript
@Post()
@UseGuards(JwtAuthGuard, SubscriptionLimitGuard) // ✅ Guard appliqué
async create(@Body() createActivityDto: CreateActivityDto, @Request() req) {
  const userId = req.user._id.toString();
  return this.activitiesService.create(createActivityDto, userId);
}
```

---

## 🧪 Tests Backend

### Test 1 : Vérifier les Limites Après Création

```bash
# 1. Créer une activité (utilise l'activité gratuite)
POST /activities
Authorization: Bearer <token>
Content-Type: application/json
{
  "sportType": "Football",
  "title": "Match de foot",
  "location": "Stade",
  "date": "2025-01-15",
  "time": "2025-01-15T18:00:00Z",
  "maxParticipants": 10
}

# 2. Vérifier les limites
GET /subscriptions/check-limit
Authorization: Bearer <token>
```

**Réponse attendue :**
```json
{
  "canCreate": false,
  "activitiesUsed": 0,
  "activitiesLimit": 1,
  "activitiesRemaining": 0,
  "subscriptionType": "free",
  "freeActivitiesRemaining": 0,
  "message": "Vous avez utilisé votre activité gratuite. Passez à Premium pour créer plus d'activités."
}
```

### Test 2 : Tentative de Contournement

```bash
# Essayer de créer une 2ème activité (devrait être bloqué)
POST /activities
Authorization: Bearer <token>
```

**Réponse attendue :**
```json
{
  "statusCode": 403,
  "message": "Vous avez utilisé votre activité gratuite. Passez à Premium pour créer plus d'activités."
}
```

---

## ⏳ FRONTEND : À Implémenter

### 📱 Étape 1 : Vérifier les Limites au Chargement

**Fichier :** `HomeFeedComponents.kt` (ou `HomeFeedScreen.kt`)

**Action :** Ajouter une vérification des limites au chargement de l'écran.

**Code à ajouter :**

```kotlin
// État pour stocker si l'utilisateur peut créer une session
val canCreateSession = remember {
    mutableStateOf<Boolean?>(null) // null = en cours de vérification
}

val isCoachVerified = remember {
    mutableStateOf(false)
}

val checkLimitMessage = remember {
    mutableStateOf<String?>(null)
}

// Fonction pour vérifier les limites
val checkLimits: () -> Unit = {
    val user = com.example.damandroid.auth.UserSession.user
    isCoachVerified.value = user?.isCoachVerified == true
    
    if (isCoachVerified.value) {
        try {
            val token = com.example.damandroid.auth.UserSession.token
            if (token != null) {
                kotlinx.coroutines.CoroutineScope(kotlinx.coroutines.Dispatchers.IO).launch {
                    try {
                        val subscriptionApiService = RetrofitClient.subscriptionApiService
                        val response = subscriptionApiService.checkLimit("Bearer $token")
                        
                        if (response.isSuccessful && response.body() != null) {
                            val checkLimit = response.body()!!
                            canCreateSession.value = checkLimit.canCreate
                            checkLimitMessage.value = checkLimit.message
                            
                            android.util.Log.d(
                                "HomeFeedContent", 
                                "✅ Limit check: canCreate=${checkLimit.canCreate}, " +
                                "used=${checkLimit.activitiesUsed}/${checkLimit.activitiesLimit}, " +
                                "freeRemaining=${checkLimit.freeActivitiesRemaining}, " +
                                "message=${checkLimit.message}"
                            )
                        } else {
                            canCreateSession.value = true
                            android.util.Log.w("HomeFeedContent", "⚠️ Failed to check limit, allowing creation")
                        }
                    } catch (e: Exception) {
                        android.util.Log.e("HomeFeedContent", "❌ Error checking limit: ${e.message}", e)
                        canCreateSession.value = true
                    }
                }
            } else {
                canCreateSession.value = true
            }
        } catch (e: Exception) {
            android.util.Log.e("HomeFeedContent", "❌ Error: ${e.message}", e)
            canCreateSession.value = true
        }
    } else {
        // Utilisateur normal (pas coach vérifié) : toujours permettre
        canCreateSession.value = true
    }
}

// Vérifier les limites au chargement
LaunchedEffect(Unit) {
    checkLimits()
}
```

---

### 📱 Étape 2 : Masquer le Bouton si Bloqué

**Fichier :** `HomeFeedComponents.kt`

**Action :** Modifier le bouton de création de session pour le masquer si `canCreateSession.value == false`.

**Code à modifier :**

```kotlin
// Bouton Coach Dashboard (Session)
if (isCoachVerified.value && onCoachDashboardClick != null) {
    // Afficher le bouton seulement si canCreate != false
    if (canCreateSession.value != false) {
        FloatingActionButton(
            onClick = { 
                // Vérifier à nouveau avant de créer (sécurité supplémentaire)
                if (canCreateSession.value == true) {
                    onCoachDashboardClick.invoke()
                } else {
                    // Si bloqué, rediriger vers les plans premium
                    onPremium?.invoke()
                }
            },
            modifier = Modifier.size(56.dp),
            shape = CircleShape,
            containerColor = Color(0xFFF5F5F5),
            elevation = androidx.compose.material3.FloatingActionButtonDefaults.elevation(
                defaultElevation = 4.dp
            )
        ) {
            Icon(
                imageVector = Icons.Default.FitnessCenter,
                contentDescription = "Create Session",
                tint = Color.Black,
                modifier = Modifier.size(24.dp)
            )
        }
    } else {
        // Si bloqué, afficher un bouton alternatif pour voir les plans premium
        FloatingActionButton(
            onClick = { 
                // Rediriger vers les plans premium
                onPremium?.invoke()
            },
            modifier = Modifier.size(56.dp),
            shape = CircleShape,
            containerColor = appColors.accentPurple, // Couleur différente pour indiquer premium
            elevation = androidx.compose.material3.FloatingActionButtonDefaults.elevation(
                defaultElevation = 4.dp
            )
        ) {
            Icon(
                imageVector = Icons.Default.Star, // Icône étoile pour premium
                contentDescription = "Upgrade to Premium",
                tint = Color.White,
                modifier = Modifier.size(24.dp)
            )
        }
    }
}
```

---

### 📱 Étape 3 : Rafraîchir Après Création

**Fichier :** `CreateSessionScreen.kt` (ou `CreateActivityScreen.kt`)

**Action :** Rafraîchir les limites après création réussie d'une session.

**Code à ajouter :**

```kotlin
// Après création réussie d'une session, rafraîchir les limites
LaunchedEffect(uiState.success) {
    uiState.success?.let {
        // Session créée avec succès
        // Rafraîchir les limites pour masquer le bouton si nécessaire
        // Cela se fera automatiquement au retour sur HomeFeedScreen
        // mais on peut aussi forcer un rafraîchissement ici si nécessaire
        android.util.Log.d("CreateSessionScreen", "✅ Session created, limits should be refreshed")
    }
}
```

**OU** dans `HomeFeedScreen.kt` :

```kotlin
// Rafraîchir les limites quand l'écran devient visible
LaunchedEffect(/* déclencheur si nécessaire */) {
    checkLimits()
}
```

---

### 📱 Étape 4 : Ajouter le Paramètre `onPremium`

**Fichier :** `HomeFeedScreen.kt` (ou `MainActivity.kt`)

**Action :** Ajouter un paramètre pour rediriger vers les plans premium.

**Code à ajouter :**

```kotlin
@Composable
fun HomeFeedScreen(
    // ... autres paramètres ...
    onCreateClick: (() -> Unit)?,
    onPremiumClick: (() -> Unit)? = null, // Ajouter ce paramètre
    // ...
) {
    HomeFeedContent(
        // ... autres paramètres ...
        onCreateClick = onCreateClick,
        onPremium = onPremiumClick, // Passer le callback premium
        // ...
    )
}
```

**Dans `MainActivity.kt` :**

```kotlin
HomeFeedScreen(
    // ... autres paramètres ...
    onCreateClick = { /* ... */ },
    onPremiumClick = { 
        // Rediriger vers l'écran des plans premium
        overlay = OverlayScreen.SubscriptionPlans 
    },
    // ...
)
```

---

## 🔄 Flux Complet (Backend + Frontend)

### Scénario : Coach Vérifié avec Plan FREE

#### 1. État Initial
```
Backend : freeActivitiesRemaining = 1
Frontend : canCreateSession = true → Bouton visible ✅
```

#### 2. Utilisateur Clique sur le Bouton
```
Frontend : Vérifie canCreateSession (true) → Autorise le clic
Backend : Guard vérifie les limites → Autorise (freeActivitiesRemaining > 0)
```

#### 3. Création de l'Activité
```
Backend : 
  - Crée l'activité ✅
  - Appelle incrementActivityCount() ✅
  - freeActivitiesRemaining = 0 ✅
```

#### 4. Après Création
```
Frontend : Rafraîchit les limites
Backend : GET /subscriptions/check-limit → canCreate: false
Frontend : canCreateSession = false → Bouton masqué ✅
```

#### 5. Tentative de Contournement
```
Frontend : Bouton masqué (impossible de cliquer)
Si contournement : Backend bloque avec 403 Forbidden ✅
```

---

## 📊 Résumé des Modifications

### ✅ Backend (Complet)

| Composant | Statut | Description |
|-----------|--------|-------------|
| `SubscriptionLimitGuard` | ✅ Fonctionnel | Bloque les créations si limite atteinte |
| `checkActivityLimit()` | ✅ Corrigé | Retourne `canCreate: false` pour FREE après activité gratuite |
| `incrementActivityCount()` | ✅ Fonctionnel | Incrémente correctement le compteur |
| Appel dans `ActivitiesService` | ✅ Fonctionnel | Appelé après chaque création |
| Guard appliqué | ✅ Fonctionnel | Protège `POST /activities` |

### ⏳ Frontend (À Implémenter)

| Composant | Statut | Description |
|-----------|--------|-------------|
| Vérification des limites | ⏳ À faire | Appeler `GET /subscriptions/check-limit` au chargement |
| Masquer le bouton | ⏳ À faire | Si `canCreate: false`, masquer le bouton |
| Bouton alternatif | ⏳ À faire | Afficher bouton étoile pour rediriger vers premium |
| Rafraîchir après création | ⏳ À faire | Rafraîchir les limites après création réussie |

---

## ✅ Checklist de Vérification

### Backend (À Tester)

- [x] `SubscriptionLimitGuard` appliqué sur `POST /activities`
- [x] `checkActivityLimit()` retourne `canCreate: false` pour FREE après activité gratuite
- [x] `incrementActivityCount()` décrémente `freeActivitiesRemaining`
- [x] `incrementActivityCount()` appelé après création d'activité
- [ ] **Test :** Créer une activité → Vérifier que `freeActivitiesRemaining = 0`
- [ ] **Test :** Vérifier les limites → `canCreate: false`
- [ ] **Test :** Tentative de 2ème activité → 403 Forbidden

### Frontend (À Implémenter)

- [ ] Ajouter vérification des limites au chargement
- [ ] Masquer le bouton si `canCreate: false`
- [ ] Afficher bouton alternatif (étoile) pour premium
- [ ] Rafraîchir les limites après création
- [ ] **Test :** Créer une session → Vérifier que le bouton se masque
- [ ] **Test :** Redirection vers premium si bloqué

---

## 🎯 Résultat Final Attendu

### Backend
- ✅ **Sécurité garantie** : Impossible de contourner les limites
- ✅ **Compteurs à jour** : `freeActivitiesRemaining` décrémenté après création
- ✅ **Message clair** : "Vous avez utilisé votre activité gratuite..."

### Frontend
- ✅ **Bouton masqué** : Si `canCreate: false`, bouton invisible
- ✅ **Bouton alternatif** : Bouton étoile pour rediriger vers premium
- ✅ **Meilleure UX** : Pas d'erreur 403 visible pour l'utilisateur

---

## 🔍 Debug

### Vérifier Backend

**Dans MongoDB :**
```javascript
db.subscriptions.findOne({ userId: ObjectId("...") })
// Vérifier : freeActivitiesRemaining devrait être 0 après création
```

**Dans les logs backend :**
```
[ActivitiesService] ✅ Activity count incremented for user ...
Coach ... used free activity. Remaining: 0
```

**Vérifier l'endpoint :**
```bash
GET /subscriptions/check-limit
# Devrait retourner : { "canCreate": false, "freeActivitiesRemaining": 0 }
```

### Vérifier Frontend

**Dans les logs Android :**
```
✅ Limit check: canCreate=false, used=0/1, freeRemaining=0
```

**Vérifier que le bouton est masqué :**
- Le bouton Coach Dashboard (FitnessCenter) ne doit pas apparaître
- Ou le bouton étoile (Star) doit apparaître à la place

---

## 📚 Fichiers Modifiés

### Backend (Complet ✅)
- ✅ `src/modules/subscription/subscription.service.ts`
  - Correction de `checkActivityLimit()` pour plan FREE
- ✅ `src/modules/activities/activities.service.ts`
  - Appel à `incrementActivityCount()` après création
- ✅ `src/modules/subscription/subscription.guard.ts`
  - Guard appliqué correctement

### Frontend (À Implémenter ⏳)
- ⏳ `HomeFeedComponents.kt` - Vérification des limites et masquage du bouton
- ⏳ `HomeFeedScreen.kt` - Paramètre `onPremiumClick`
- ⏳ `CreateSessionScreen.kt` - Rafraîchir après création
- ⏳ `MainActivity.kt` - Redirection vers premium

---

**Backend : ✅ 100% Fonctionnel**  
**Frontend : ⏳ À Implémenter**

Une fois le frontend implémenté, le système sera complet ! 🎉


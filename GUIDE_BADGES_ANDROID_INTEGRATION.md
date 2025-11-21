# 📱 Guide Android Jetpack Compose - Intégration Badges avec Activités

## 🎯 Vue d'Ensemble

Ce guide explique comment intégrer le système de badges avec les activités dans votre application Android Jetpack Compose, incluant le rafraîchissement automatique après création d'activité et la détection des nouveaux badges débloqués.

---

## 🔄 Intégration avec les Activités

### 1. Rafraîchir les Badges Après Création d'Activité

**Dans votre `ActivitiesViewModel` ou après création d'activité réussie :**

```kotlin
package com.fitnessapp.presentation.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

class ActivitiesViewModel @Inject constructor(
    private val activitiesService: ActivitiesService,
    private val badgesViewModel: BadgesViewModel // Injecter BadgesViewModel
) : ViewModel() {

    fun createActivity(createActivityDto: CreateActivityDto) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)

            activitiesService.createActivity(createActivityDto)
                .onSuccess { activity ->
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        createdActivity = activity,
                        error = null
                    )

                    // ✅ Rafraîchir les badges après création d'activité
                    // Attendre 1.5-2 secondes pour que le backend mette à jour
                    delay(1500)
                    badgesViewModel.refreshBadges()
                }
                .onFailure { error ->
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        error = error.message ?: "Erreur lors de la création"
                    )
                }
        }
    }
}
```

---

### 2. Détecter les Nouveaux Badges Débloqués

**Dans votre écran de création d'activité ou écran principal :**

```kotlin
package com.fitnessapp.presentation.ui.activities

import androidx.compose.runtime.*
import androidx.compose.ui.platform.LocalContext
import com.fitnessapp.presentation.viewmodel.BadgesViewModel

@Composable
fun CreateActivityScreen(
    activitiesViewModel: ActivitiesViewModel = hiltViewModel(),
    badgesViewModel: BadgesViewModel = hiltViewModel()
) {
    val uiState by activitiesViewModel.uiState.collectAsState()
    val newBadges by badgesViewModel.newBadgesUnlocked.collectAsState()

    // Afficher le dialog pour chaque nouveau badge
    newBadges.forEach { badge ->
        BadgeUnlockedDialog(
            badge = badge,
            onDismiss = {
                badgesViewModel.clearNewBadges()
            }
        )
    }

    // ... reste de l'UI de création d'activité ...
}
```

---

## 🏗️ Architecture Complète

### Structure Recommandée

```
app/
├── data/
│   ├── model/
│   │   ├── Badge.kt
│   │   └── BadgeProgress.kt
│   └── remote/
│       └── AchievementsApi.kt
├── domain/
│   └── usecase/
│       └── GetBadgesUseCase.kt
└── presentation/
    ├── viewmodel/
    │   ├── BadgesViewModel.kt
    │   └── ActivitiesViewModel.kt
    └── ui/
        ├── activities/
        │   ├── CreateActivityScreen.kt
        │   └── ActivitiesListScreen.kt
        └── badges/
            ├── BadgesScreen.kt
            ├── BadgeCard.kt
            └── BadgeUnlockedDialog.kt
```

---

## 📦 Modèles de Données

### Badge.kt (Complet)

```kotlin
package com.fitnessapp.data.model

import com.google.gson.annotations.SerializedName

data class Badge(
    @SerializedName("_id")
    val id: String,
    val name: String,
    val description: String,
    @SerializedName("iconUrl")
    val iconUrl: String?,
    val rarity: BadgeRarity,
    val category: BadgeCategory,
    @SerializedName("earnedAt")
    val earnedAt: String?
)

enum class BadgeRarity {
    @SerializedName("common")
    COMMON,
    @SerializedName("uncommon")
    UNCOMMON,
    @SerializedName("rare")
    RARE,
    @SerializedName("epic")
    EPIC,
    @SerializedName("legendary")
    LEGENDARY
}

enum class BadgeCategory {
    @SerializedName("activity")
    ACTIVITY,
    @SerializedName("social")
    SOCIAL,
    @SerializedName("streak")
    STREAK,
    @SerializedName("milestone")
    MILESTONE
}

data class BadgeProgress(
    val badge: Badge,
    @SerializedName("currentProgress")
    val currentProgress: Int,
    val target: Int,
    val percentage: Int
)

data class BadgesResponse(
    @SerializedName("earnedBadges")
    val earnedBadges: List<Badge>,
    @SerializedName("inProgress")
    val inProgress: List<BadgeProgress>
)
```

---

## 🎨 ViewModels

### BadgesViewModel.kt (Complet avec Détection)

```kotlin
package com.fitnessapp.presentation.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.fitnessapp.data.model.Badge
import com.fitnessapp.data.model.BadgeProgress
import com.fitnessapp.data.remote.AchievementsService
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

class BadgesViewModel @Inject constructor(
    private val achievementsService: AchievementsService
) : ViewModel() {

    private val _uiState = MutableStateFlow(BadgesUiState())
    val uiState: StateFlow<BadgesUiState> = _uiState.asStateFlow()

    private val _newBadgesUnlocked = MutableStateFlow<List<Badge>>(emptyList())
    val newBadgesUnlocked: StateFlow<List<Badge>> = _newBadgesUnlocked.asStateFlow()

    // Garder une trace des badges précédents pour détecter les nouveaux
    private var previousEarnedBadgeIds: Set<String> = emptySet()

    init {
        loadBadges()
    }

    fun loadBadges() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)

            achievementsService.getBadges()
                .onSuccess { response ->
                    val earnedBadges = response.earnedBadges
                    val inProgress = response.inProgress

                    // Détecter les nouveaux badges débloqués
                    detectNewBadges(earnedBadges)

                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        earnedBadges = earnedBadges,
                        inProgress = inProgress,
                        error = null
                    )
                }
                .onFailure { error ->
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        error = error.message ?: "Erreur lors du chargement des badges"
                    )
                }
        }
    }

    fun refreshBadges() {
        loadBadges()
    }

    /**
     * Détecte les nouveaux badges débloqués en comparant les IDs
     */
    private fun detectNewBadges(currentBadges: List<Badge>) {
        val currentBadgeIds = currentBadges.map { it.id }.toSet()
        val newBadgeIds = currentBadgeIds - previousEarnedBadgeIds

        if (newBadgeIds.isNotEmpty()) {
            val newBadges = currentBadges.filter { it.id in newBadgeIds }
            _newBadgesUnlocked.value = newBadges
        }

        // Mettre à jour les IDs précédents
        previousEarnedBadgeIds = currentBadgeIds
    }

    fun clearNewBadges() {
        _newBadgesUnlocked.value = emptyList()
    }
}

data class BadgesUiState(
    val isLoading: Boolean = false,
    val earnedBadges: List<Badge> = emptyList(),
    val inProgress: List<BadgeProgress> = emptyList(),
    val error: String? = null
)
```

---

## 🎨 Composables UI

### Intégration dans CreateActivityScreen.kt

```kotlin
package com.fitnessapp.presentation.ui.activities

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.fitnessapp.presentation.ui.badges.BadgeUnlockedDialog
import com.fitnessapp.presentation.viewmodel.ActivitiesViewModel
import com.fitnessapp.presentation.viewmodel.BadgesViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CreateActivityScreen(
    activitiesViewModel: ActivitiesViewModel = hiltViewModel(),
    badgesViewModel: BadgesViewModel = hiltViewModel(),
    onActivityCreated: () -> Unit = {}
) {
    val uiState by activitiesViewModel.uiState.collectAsState()
    val newBadges by badgesViewModel.newBadgesUnlocked.collectAsState()

    // Afficher le dialog pour chaque nouveau badge débloqué
    newBadges.forEach { badge ->
        BadgeUnlockedDialog(
            badge = badge,
            onDismiss = {
                badgesViewModel.clearNewBadges()
            }
        )
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Créer une Activité") }
            )
        }
    ) { paddingValues ->
        // ... formulaire de création d'activité ...

        // Lors de la création réussie
        LaunchedEffect(uiState.createdActivity) {
            uiState.createdActivity?.let {
                // Rafraîchir les badges après 1.5 secondes
                kotlinx.coroutines.delay(1500)
                badgesViewModel.refreshBadges()
                onActivityCreated()
            }
        }
    }
}
```

---

### Intégration dans HomeFeedScreen.kt

```kotlin
package com.fitnessapp.presentation.ui.home

import androidx.compose.runtime.*
import androidx.hilt.navigation.compose.hiltViewModel
import com.fitnessapp.presentation.ui.badges.BadgeUnlockedDialog
import com.fitnessapp.presentation.viewmodel.BadgesViewModel

@Composable
fun HomeFeedScreen(
    badgesViewModel: BadgesViewModel = hiltViewModel()
) {
    val newBadges by badgesViewModel.newBadgesUnlocked.collectAsState()

    // Afficher le dialog pour chaque nouveau badge
    newBadges.forEach { badge ->
        BadgeUnlockedDialog(
            badge = badge,
            onDismiss = {
                badgesViewModel.clearNewBadges()
            }
        )
    }

    // ... reste de l'UI ...
}
```

---

### BadgeUnlockedDialog.kt (Amélioré)

```kotlin
package com.fitnessapp.presentation.ui.badges

import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import coil.compose.AsyncImage
import com.fitnessapp.data.model.Badge
import com.fitnessapp.data.model.getRarityColor

@Composable
fun BadgeUnlockedDialog(
    badge: Badge,
    onDismiss: () -> Unit
) {
    // Animation de confettis
    val infiniteTransition = rememberInfiniteTransition(label = "confetti")
    val scale by infiniteTransition.animateFloat(
        initialValue = 1f,
        targetValue = 1.2f,
        animationSpec = infiniteRepeatable(
            animation = tween(1000, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "scale"
    )

    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(
            dismissOnBackPress = true,
            dismissOnClickOutside = false
        )
    ) {
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            shape = RoundedCornerShape(24.dp),
            colors = CardDefaults.cardColors(
                containerColor = MaterialTheme.colorScheme.surface
            ),
            elevation = CardDefaults.cardElevation(defaultElevation = 8.dp)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                // Animation de confettis
                Text(
                    text = "🎉",
                    style = MaterialTheme.typography.displayLarge,
                    modifier = Modifier.scale(scale)
                )

                Spacer(modifier = Modifier.height(16.dp))

                // Titre
                Text(
                    text = "Nouveau Badge !",
                    style = MaterialTheme.typography.headlineMedium,
                    textAlign = TextAlign.Center
                )

                Spacer(modifier = Modifier.height(24.dp))

                // Icône du badge avec animation
                Box(
                    modifier = Modifier
                        .size(120.dp)
                        .clip(CircleShape)
                        .background(
                            getRarityColor(badge.rarity).copy(alpha = 0.2f)
                        )
                        .scale(scale),
                    contentAlignment = Alignment.Center
                ) {
                    if (badge.iconUrl != null && badge.iconUrl.startsWith("http")) {
                        AsyncImage(
                            model = badge.iconUrl,
                            contentDescription = badge.name,
                            modifier = Modifier.size(100.dp),
                            contentScale = ContentScale.Crop
                        )
                    } else {
                        // Afficher l'emoji si c'est un emoji
                        Text(
                            text = badge.iconUrl ?: "🏆",
                            style = MaterialTheme.typography.displayMedium
                        )
                    }
                }

                Spacer(modifier = Modifier.height(24.dp))

                // Nom du badge
                Text(
                    text = badge.name,
                    style = MaterialTheme.typography.titleLarge,
                    textAlign = TextAlign.Center
                )

                Spacer(modifier = Modifier.height(8.dp))

                // Description
                Text(
                    text = badge.description,
                    style = MaterialTheme.typography.bodyMedium,
                    textAlign = TextAlign.Center,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )

                Spacer(modifier = Modifier.height(24.dp))

                // Badge de rareté
                BadgeRarityChip(rarity = badge.rarity)

                Spacer(modifier = Modifier.height(24.dp))

                // Bouton OK
                Button(
                    onClick = onDismiss,
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = getRarityColor(badge.rarity)
                    )
                ) {
                    Text("Continuer")
                }
            }
        }
    }
}

@Composable
fun getRarityColor(rarity: BadgeRarity): Color {
    return when (rarity) {
        BadgeRarity.COMMON -> Color(0xFF4CAF50) // Vert
        BadgeRarity.UNCOMMON -> Color(0xFF2196F3) // Bleu
        BadgeRarity.RARE -> Color(0xFF9C27B0) // Violet
        BadgeRarity.EPIC -> Color(0xFFFF9800) // Orange
        BadgeRarity.LEGENDARY -> Color(0xFFFFD700) // Or
    }
}

@Composable
fun BadgeRarityChip(rarity: BadgeRarity) {
    Surface(
        shape = RoundedCornerShape(12.dp),
        color = getRarityColor(rarity).copy(alpha = 0.2f)
    ) {
        Text(
            text = rarity.name.lowercase().replaceFirstChar { it.uppercase() },
            style = MaterialTheme.typography.labelSmall,
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
            color = getRarityColor(rarity)
        )
    }
}
```

---

## 🔗 Intégration Complète

### 1. Dans MainActivity.kt ou Navigation

```kotlin
@Composable
fun AppNavigation(
    badgesViewModel: BadgesViewModel = hiltViewModel()
) {
    val navController = rememberNavController()
    val newBadges by badgesViewModel.newBadgesUnlocked.collectAsState()

    // Afficher les nouveaux badges globalement
    newBadges.forEach { badge ->
        BadgeUnlockedDialog(
            badge = badge,
            onDismiss = {
                badgesViewModel.clearNewBadges()
            }
        )
    }

    NavHost(
        navController = navController,
        startDestination = "home"
    ) {
        composable("home") {
            HomeFeedScreen(badgesViewModel = badgesViewModel)
        }
        composable("create-activity") {
            CreateActivityScreen(badgesViewModel = badgesViewModel)
        }
        composable("badges") {
            BadgesScreen()
        }
    }
}
```

---

### 2. Rafraîchissement Automatique

**Dans votre `ActivitiesViewModel` :**

```kotlin
class ActivitiesViewModel @Inject constructor(
    private val activitiesService: ActivitiesService,
    private val badgesViewModel: BadgesViewModel
) : ViewModel() {

    fun createActivity(createActivityDto: CreateActivityDto) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true)

            activitiesService.createActivity(createActivityDto)
                .onSuccess { activity ->
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        createdActivity = activity
                    )

                    // Rafraîchir les badges après création
                    delay(1500) // Attendre que le backend mette à jour
                    badgesViewModel.refreshBadges()
                }
                .onFailure { error ->
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        error = error.message
                    )
                }
        }
    }
}
```

---

## 🎯 Flux Complet

### Scénario : Création d'Activité → Badge Débloqué

1. **Utilisateur crée une activité**
   - `CreateActivityScreen` → `ActivitiesViewModel.createActivity()`

2. **Backend traite la création**
   - Crée l'activité
   - Ajoute 100 XP
   - Vérifie les badges
   - Débloque "Premier Hôte" si c'est la première activité

3. **Frontend rafraîchit les badges**
   - `ActivitiesViewModel` attend 1.5 secondes
   - Appelle `badgesViewModel.refreshBadges()`

4. **BadgesViewModel détecte le nouveau badge**
   - Compare les IDs avant/après
   - Détecte le nouveau badge "Premier Hôte"
   - Met à jour `newBadgesUnlocked`

5. **Dialog s'affiche automatiquement**
   - `BadgeUnlockedDialog` apparaît
   - Affiche le badge débloqué
   - L'utilisateur clique sur "Continuer"

6. **Badge apparaît dans la collection**
   - Le badge est visible dans `BadgesScreen`
   - Dans la section "Badges Gagnés"

---

## ✅ Checklist d'Intégration

- [ ] `BadgesViewModel` créé avec détection de nouveaux badges
- [ ] `ActivitiesViewModel` injecte `BadgesViewModel`
- [ ] `ActivitiesViewModel` rafraîchit les badges après création (avec delay)
- [ ] `CreateActivityScreen` affiche `BadgeUnlockedDialog`
- [ ] `HomeFeedScreen` affiche `BadgeUnlockedDialog`
- [ ] `BadgeUnlockedDialog` avec animations
- [ ] Navigation intégrée avec `BadgesViewModel`
- [ ] Test de création d'activité → badge débloqué
- [ ] Test de rafraîchissement automatique
- [ ] Test de détection des nouveaux badges

---

## 🧪 Tests

### Test 1 : Création d'Activité → Badge Débloqué

1. Créez une nouvelle activité
2. Attendez 2 secondes
3. Vérifiez que le dialog de badge apparaît
4. Vérifiez que le badge apparaît dans "Badges Gagnés"

### Test 2 : Rafraîchissement Automatique

1. Allez dans l'écran "Badges"
2. Créez une nouvelle activité
3. Retournez à l'écran "Badges"
4. Vérifiez que le nouveau badge est affiché

### Test 3 : Détection Multiple

1. Créez plusieurs activités rapidement
2. Vérifiez que chaque nouveau badge déclenche un dialog
3. Vérifiez qu'il n'y a pas de doublons

---

## 🚨 Points Importants

1. **Delay de 1.5-2 secondes** : Attendre que le backend mette à jour les badges

2. **Détection par ID** : Comparer les IDs des badges avant/après pour détecter les nouveaux

3. **Clear après affichage** : Appeler `clearNewBadges()` après fermeture du dialog

4. **Gestion des doublons** : Le ViewModel évite les doublons automatiquement

5. **Performance** : Utiliser `LazyVerticalGrid` pour de meilleures performances

---

## 📝 Résumé

Ce guide fournit une intégration complète pour :

1. ✅ Rafraîchissement automatique des badges après création d'activité
2. ✅ Détection automatique des nouveaux badges débloqués
3. ✅ Affichage du dialog de notification
4. ✅ Intégration dans tous les écrans pertinents
5. ✅ Gestion des animations et de l'UX

**Le code est prêt à être intégré dans votre application Android !** 🎉

---

**Dernière mise à jour :** 2025-11-21


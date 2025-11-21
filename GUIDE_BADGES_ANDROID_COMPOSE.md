# 📱 Guide Android Jetpack Compose - Système de Badges

## 🎯 Vue d'Ensemble

Ce guide explique comment intégrer le système de badges dans votre application Android avec Jetpack Compose, incluant l'affichage des badges gagnés, la progression des badges en cours, et la détection des nouveaux badges débloqués.

---

## 🔌 Endpoints API

### 1. Récupérer les Badges

**GET** `/achievements/badges`

**Headers :**
```
Authorization: Bearer YOUR_ACCESS_TOKEN
```

**Réponse (200 OK) :**
```json
{
  "earnedBadges": [
    {
      "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
      "name": "Premier Hôte",
      "description": "Créer votre première activité",
      "iconUrl": "https://example.com/badges/first-host.png",
      "rarity": "common",
      "category": "creation",
      "earnedAt": "2025-11-21T10:30:00.000Z"
    },
    {
      "_id": "65a1b2c3d4e5f6g7h8i9j0k2",
      "name": "Premier Pas",
      "description": "Compléter votre première activité",
      "iconUrl": "https://example.com/badges/first-step.png",
      "rarity": "common",
      "category": "completion",
      "earnedAt": "2025-11-21T11:00:00.000Z"
    }
  ],
  "inProgress": [
    {
      "badge": {
        "_id": "65a1b2c3d4e5f6g7h8i9j0k3",
        "name": "Hôte Populaire",
        "description": "Créer 5 activités",
        "iconUrl": "https://example.com/badges/popular-host.png",
        "rarity": "uncommon",
        "category": "creation"
      },
      "currentProgress": 2,
      "target": 5,
      "percentage": 40
    },
    {
      "badge": {
        "_id": "65a1b2c3d4e5f6g7h8i9j0k4",
        "name": "Marathonien",
        "description": "Parcourir 50 km au total",
        "iconUrl": "https://example.com/badges/marathon.png",
        "rarity": "rare",
        "category": "distance"
      },
      "currentProgress": 35,
      "target": 50,
      "percentage": 70
    }
  ]
}
```

**Types de rareté :**
- `common` : Commun (vert)
- `uncommon` : Peu commun (bleu)
- `rare` : Rare (violet)
- `epic` : Épique (orange)
- `legendary` : Légendaire (or)

**Catégories :**
- `creation` : Création d'activité
- `completion` : Complétion d'activité
- `distance` : Distance parcourue
- `duration` : Durée accumulée
- `streak` : Série de jours
- `sport` : Sport spécifique

---

## 🏗️ Architecture Android

### Structure Recommandée

```
app/
├── data/
│   ├── model/
│   │   ├── Badge.kt
│   │   └── BadgeProgress.kt
│   ├── remote/
│   │   ├── AchievementsApi.kt
│   │   └── AchievementsService.kt
│   └── repository/
│       └── AchievementsRepository.kt
├── domain/
│   └── usecase/
│       └── GetBadgesUseCase.kt
├── presentation/
│   ├── viewmodel/
│   │   └── BadgesViewModel.kt
│   └── ui/
│       ├── badges/
│       │   ├── BadgesScreen.kt
│       │   ├── BadgeCard.kt
│       │   ├── BadgeProgressCard.kt
│       │   └── BadgeUnlockedDialog.kt
│       └── theme/
│           └── BadgeTheme.kt
```

---

## 📦 Modèles de Données

### Badge.kt

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
    @SerializedName("creation")
    CREATION,
    @SerializedName("completion")
    COMPLETION,
    @SerializedName("distance")
    DISTANCE,
    @SerializedName("duration")
    DURATION,
    @SerializedName("streak")
    STREAK,
    @SerializedName("sport")
    SPORT
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

## 🌐 Services API

### AchievementsApi.kt

```kotlin
package com.fitnessapp.data.remote

import com.fitnessapp.data.model.BadgesResponse
import retrofit2.http.GET
import retrofit2.http.Header

interface AchievementsApi {
    @GET("achievements/badges")
    suspend fun getBadges(
        @Header("Authorization") token: String
    ): BadgesResponse
}
```

### AchievementsService.kt

```kotlin
package com.fitnessapp.data.remote

import com.fitnessapp.data.model.BadgesResponse
import javax.inject.Inject

class AchievementsService @Inject constructor(
    private val api: AchievementsApi,
    private val authManager: AuthManager
) {
    suspend fun getBadges(): Result<BadgesResponse> {
        return try {
            val token = authManager.getToken()
            val response = api.getBadges("Bearer $token")
            Result.success(response)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
```

---

## 🎨 ViewModels

### BadgesViewModel.kt

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
import java.util.Date

class BadgesViewModel @Inject constructor(
    private val achievementsService: AchievementsService
) : ViewModel() {

    private val _uiState = MutableStateFlow(BadgesUiState())
    val uiState: StateFlow<BadgesUiState> = _uiState.asStateFlow()

    private val _newBadgesUnlocked = MutableStateFlow<List<Badge>>(emptyList())
    val newBadgesUnlocked: StateFlow<List<Badge>> = _newBadgesUnlocked.asStateFlow()

    private var previousEarnedBadges: Set<String> = emptySet()

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

    private fun detectNewBadges(currentBadges: List<Badge>) {
        val currentBadgeIds = currentBadges.map { it.id }.toSet()
        val newBadgeIds = currentBadgeIds - previousEarnedBadges

        if (newBadgeIds.isNotEmpty()) {
            val newBadges = currentBadges.filter { it.id in newBadgeIds }
            _newBadgesUnlocked.value = newBadges
        }

        previousEarnedBadges = currentBadgeIds
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

### BadgesScreen.kt

```kotlin
package com.fitnessapp.presentation.ui.badges

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.fitnessapp.presentation.viewmodel.BadgesViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BadgesScreen(
    viewModel: BadgesViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val newBadges by viewModel.newBadgesUnlocked.collectAsState()

    // Afficher le dialog pour les nouveaux badges
    newBadges.forEach { badge ->
        BadgeUnlockedDialog(
            badge = badge,
            onDismiss = {
                viewModel.clearNewBadges()
            }
        )
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Badges") }
            )
        }
    ) { paddingValues ->
        when {
            uiState.isLoading -> {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(paddingValues),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator()
                }
            }

            uiState.error != null -> {
                ErrorView(
                    error = uiState.error,
                    onRetry = { viewModel.refreshBadges() },
                    modifier = Modifier.padding(paddingValues)
                )
            }

            else -> {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(paddingValues)
                ) {
                    // Section Badges Gagnés
                    if (uiState.earnedBadges.isNotEmpty()) {
                        Text(
                            text = "Badges Gagnés",
                            style = MaterialTheme.typography.headlineSmall,
                            modifier = Modifier.padding(16.dp)
                        )

                        LazyVerticalGrid(
                            columns = GridCells.Fixed(2),
                            contentPadding = PaddingValues(16.dp),
                            horizontalArrangement = Arrangement.spacedBy(16.dp),
                            verticalArrangement = Arrangement.spacedBy(16.dp)
                        ) {
                            items(uiState.earnedBadges) { badge ->
                                BadgeCard(badge = badge, isEarned = true)
                            }
                        }
                    }

                    // Section En Cours
                    if (uiState.inProgress.isNotEmpty()) {
                        Text(
                            text = "En Cours",
                            style = MaterialTheme.typography.headlineSmall,
                            modifier = Modifier.padding(16.dp)
                        )

                        LazyVerticalGrid(
                            columns = GridCells.Fixed(2),
                            contentPadding = PaddingValues(16.dp),
                            horizontalArrangement = Arrangement.spacedBy(16.dp),
                            verticalArrangement = Arrangement.spacedBy(16.dp)
                        ) {
                            items(uiState.inProgress) { progress ->
                                BadgeProgressCard(progress = progress)
                            }
                        }
                    }

                    // État vide
                    if (uiState.earnedBadges.isEmpty() && uiState.inProgress.isEmpty()) {
                        EmptyBadgesView(
                            modifier = Modifier.fillMaxSize()
                        )
                    }
                }
            }
        }
    }
}
```

---

### BadgeCard.kt

```kotlin
package com.fitnessapp.presentation.ui.badges

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import com.fitnessapp.data.model.Badge
import com.fitnessapp.data.model.BadgeRarity

@Composable
fun BadgeCard(
    badge: Badge,
    isEarned: Boolean,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier
            .fillMaxWidth()
            .height(200.dp),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(
            containerColor = getRarityColor(badge.rarity).copy(alpha = 0.1f)
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            // Icône du badge
            AsyncImage(
                model = badge.iconUrl ?: "",
                contentDescription = badge.name,
                modifier = Modifier
                    .size(80.dp)
                    .clip(RoundedCornerShape(12.dp)),
                contentScale = ContentScale.Crop
            )

            Spacer(modifier = Modifier.height(12.dp))

            // Nom du badge
            Text(
                text = badge.name,
                style = MaterialTheme.typography.titleMedium,
                textAlign = TextAlign.Center,
                maxLines = 2
            )

            Spacer(modifier = Modifier.height(4.dp))

            // Description
            Text(
                text = badge.description,
                style = MaterialTheme.typography.bodySmall,
                textAlign = TextAlign.Center,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 2
            )

            // Indicateur de rareté
            if (isEarned) {
                Spacer(modifier = Modifier.height(8.dp))
                BadgeRarityChip(rarity = badge.rarity)
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

### BadgeProgressCard.kt

```kotlin
package com.fitnessapp.presentation.ui.badges

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import com.fitnessapp.data.model.BadgeProgress
import com.fitnessapp.data.model.getRarityColor

@Composable
fun BadgeProgressCard(
    progress: BadgeProgress,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier
            .fillMaxWidth()
            .height(240.dp),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            // Icône du badge (grisée)
            AsyncImage(
                model = progress.badge.iconUrl ?: "",
                contentDescription = progress.badge.name,
                modifier = Modifier
                    .size(80.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .alpha(0.5f),
                contentScale = ContentScale.Crop
            )

            Spacer(modifier = Modifier.height(12.dp))

            // Nom du badge
            Text(
                text = progress.badge.name,
                style = MaterialTheme.typography.titleMedium,
                textAlign = TextAlign.Center,
                maxLines = 2
            )

            Spacer(modifier = Modifier.height(4.dp))

            // Description
            Text(
                text = progress.badge.description,
                style = MaterialTheme.typography.bodySmall,
                textAlign = TextAlign.Center,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 2
            )

            Spacer(modifier = Modifier.height(12.dp))

            // Barre de progression
            Column(
                modifier = Modifier.fillMaxWidth(),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                LinearProgressIndicator(
                    progress = { progress.percentage / 100f },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(8.dp)
                        .clip(RoundedCornerShape(4.dp)),
                    color = getRarityColor(progress.badge.rarity),
                    trackColor = MaterialTheme.colorScheme.surfaceVariant
                )

                Spacer(modifier = Modifier.height(8.dp))

                // Texte de progression
                Text(
                    text = "${progress.currentProgress} / ${progress.target}",
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )

                Text(
                    text = "${progress.percentage}%",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.primary
                )
            }
        }
    }
}
```

---

### BadgeUnlockedDialog.kt

```kotlin
package com.fitnessapp.presentation.ui.badges

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import coil.compose.AsyncImage
import com.fitnessapp.data.model.Badge
import com.fitnessapp.data.model.getRarityColor

@Composable
fun BadgeUnlockedDialog(
    badge: Badge,
    onDismiss: () -> Unit
) {
    Dialog(onDismissRequest = onDismiss) {
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
                // Animation de confettis (optionnel)
                Text(
                    text = "🎉",
                    style = MaterialTheme.typography.displayLarge
                )

                Spacer(modifier = Modifier.height(16.dp))

                // Titre
                Text(
                    text = "Nouveau Badge !",
                    style = MaterialTheme.typography.headlineMedium,
                    textAlign = TextAlign.Center
                )

                Spacer(modifier = Modifier.height(24.dp))

                // Icône du badge
                Box(
                    modifier = Modifier
                        .size(120.dp)
                        .clip(RoundedCornerShape(20.dp))
                        .background(
                            getRarityColor(badge.rarity).copy(alpha = 0.2f)
                        ),
                    contentAlignment = Alignment.Center
                ) {
                    AsyncImage(
                        model = badge.iconUrl ?: "",
                        contentDescription = badge.name,
                        modifier = Modifier.size(100.dp),
                        contentScale = ContentScale.Crop
                    )
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
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("Continuer")
                }
            }
        }
    }
}
```

---

## 🔗 Intégration avec les Activités

### Rafraîchir les Badges Après Création d'Activité

Dans votre `ActivitiesViewModel` ou après la création d'activité :

```kotlin
// Après création d'activité réussie
viewModelScope.launch {
    // Attendre un peu pour que le backend mette à jour
    delay(1500)
    
    // Rafraîchir les badges
    badgesViewModel.refreshBadges()
}
```

---

## ✅ Checklist d'Intégration

- [ ] Créer les modèles de données (`Badge`, `BadgeProgress`, `BadgesResponse`)
- [ ] Créer l'interface API (`AchievementsApi`)
- [ ] Créer le service (`AchievementsService`)
- [ ] Créer le ViewModel (`BadgesViewModel`)
- [ ] Créer les composables UI (`BadgesScreen`, `BadgeCard`, `BadgeProgressCard`)
- [ ] Créer le dialog de badge débloqué (`BadgeUnlockedDialog`)
- [ ] Intégrer avec `AuthManager` pour l'authentification
- [ ] Rafraîchir les badges après création/complétion d'activité
- [ ] Tester l'affichage des badges gagnés
- [ ] Tester l'affichage des badges en cours
- [ ] Tester la détection des nouveaux badges

---

## 🎨 Thème et Couleurs

### BadgeTheme.kt

```kotlin
package com.fitnessapp.presentation.ui.theme

import androidx.compose.ui.graphics.Color

object BadgeTheme {
    val CommonColor = Color(0xFF4CAF50) // Vert
    val UncommonColor = Color(0xFF2196F3) // Bleu
    val RareColor = Color(0xFF9C27B0) // Violet
    val EpicColor = Color(0xFFFF9800) // Orange
    val LegendaryColor = Color(0xFFFFD700) // Or
}
```

---

## 📱 Utilisation dans l'App

### Navigation

```kotlin
// Dans votre NavGraph
composable("badges") {
    BadgesScreen()
}
```

### Intégration avec Achievements

```kotlin
// Dans AchievementsScreen.kt
Tab(
    selected = selectedTab == 0,
    onClick = { selectedTab = 0 }
) {
    Text("Badges")
}

// Afficher BadgesScreen quand l'onglet est sélectionné
if (selectedTab == 0) {
    BadgesScreen()
}
```

---

## 🧪 Tests

### Test 1 : Affichage des Badges

1. Connectez-vous à l'application
2. Allez dans l'écran "Badges"
3. Vérifiez que les badges gagnés s'affichent
4. Vérifiez que les badges en cours s'affichent avec progression

### Test 2 : Détection des Nouveaux Badges

1. Créez une nouvelle activité
2. Attendez 2 secondes
3. Vérifiez que le dialog de badge débloqué apparaît
4. Vérifiez que le badge apparaît dans "Badges Gagnés"

### Test 3 : Rafraîchissement

1. Allez dans l'écran "Badges"
2. Faites un pull-to-refresh
3. Vérifiez que les badges sont rafraîchis

---

## 🚨 Points Importants

1. **Authentification** : Tous les endpoints nécessitent un token JWT

2. **Rafraîchissement** : Rafraîchissez les badges après création/complétion d'activité (attendre 1.5-2 secondes)

3. **Détection des Nouveaux Badges** : Comparez les IDs des badges avant et après rafraîchissement

4. **Gestion d'Erreurs** : Toujours gérer les erreurs réseau et afficher des messages appropriés

5. **Performance** : Utilisez `LazyVerticalGrid` pour de meilleures performances avec beaucoup de badges

---

## 📝 Résumé

Ce guide fournit une implémentation complète pour Android Jetpack Compose pour :

1. ✅ Afficher les badges gagnés
2. ✅ Afficher les badges en cours avec progression
3. ✅ Détecter et afficher les nouveaux badges débloqués
4. ✅ Intégration avec le système d'activités
5. ✅ Design moderne avec Material 3

**Le code est prêt à être intégré dans votre application Android !** 🎉

---

**Dernière mise à jour :** 2025-11-21


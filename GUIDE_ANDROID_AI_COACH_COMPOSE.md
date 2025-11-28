# 📱 Guide Android Jetpack Compose - AI Coach (Gemini)

## 🎯 Vue d'Ensemble

Ce guide explique comment implémenter l'AI Coach dans une application Android avec Jetpack Compose. L'AI Coach utilise **Google Gemini AI** pour générer des suggestions d'activités personnalisées et des conseils personnalisés basés sur les données Strava de l'utilisateur.

### Fonctionnalités

- ✅ Suggestions d'activités personnalisées (3 activités)
- ✅ Conseils personnalisés (Nasy7) basés sur les statistiques
- ✅ Analyse des données Strava (workouts, calories, minutes, streak)
- ✅ Analyse du profil utilisateur et historique d'activités
- ✅ Score de correspondance pour chaque activité suggérée
- ✅ Mode fallback si Gemini n'est pas configuré

---

## 🏗️ Architecture

### Structure des Couches

```
📁 data/
  ├── 📁 remote/
  │   ├── AICoachApiService.kt           # Interface Retrofit
  │   └── AICoachRemoteDataSource.kt     # Data source remote
  ├── 📁 repository/
  │   └── AICoachRepositoryImpl.kt       # Implémentation du repository
  └── 📁 dto/
      ├── AICoachSuggestionsRequestDto.kt # DTO pour la requête
      └── AICoachSuggestionsResponseDto.kt # DTO pour la réponse

📁 domain/
  ├── 📁 model/
  │   ├── AICoachRequest.kt              # Modèle de requête
  │   ├── SuggestedActivity.kt           # Modèle d'activité suggérée
  │   └── PersonalizedTip.kt             # Modèle de conseil personnalisé
  ├── 📁 repository/
  │   └── AICoachRepository.kt           # Interface repository
  └── 📁 usecase/
      └── GetAICoachSuggestionsUseCase.kt

📁 presentation/
  ├── 📁 aicoach/
  │   ├── AICoachViewModel.kt            # ViewModel
  │   ├── AICoachScreen.kt               # Screen principal
  │   ├── SuggestionsList.kt             # Liste des suggestions
  │   ├── ActivitySuggestionCard.kt       # Card d'activité suggérée
  │   └── PersonalizedTipsSection.kt      # Section des conseils
```

---

## 📦 Data Layer

### 1. DTOs (Data Transfer Objects)

#### AICoachSuggestionsRequestDto.kt

```kotlin
package com.yourapp.data.dto

import com.google.gson.annotations.SerializedName

data class AICoachSuggestionsRequestDto(
    @SerializedName("workouts")
    val workouts: Int,
    
    @SerializedName("calories")
    val calories: Int,
    
    @SerializedName("minutes")
    val minutes: Int,
    
    @SerializedName("streak")
    val streak: Int,
    
    @SerializedName("sportPreferences")
    val sportPreferences: String? = null
)
```

#### SuggestedActivityDto.kt

```kotlin
package com.yourapp.data.dto

import com.google.gson.annotations.SerializedName

data class SuggestedActivityDto(
    @SerializedName("id")
    val id: String,
    
    @SerializedName("title")
    val title: String,
    
    @SerializedName("sportType")
    val sportType: String,
    
    @SerializedName("location")
    val location: String,
    
    @SerializedName("date")
    val date: String,
    
    @SerializedName("time")
    val time: String,
    
    @SerializedName("participants")
    val participants: Int,
    
    @SerializedName("maxParticipants")
    val maxParticipants: Int,
    
    @SerializedName("level")
    val level: String,
    
    @SerializedName("matchScore")
    val matchScore: Int // 0-100
)
```

#### PersonalizedTipDto.kt

```kotlin
package com.yourapp.data.dto

import com.google.gson.annotations.SerializedName

data class PersonalizedTipDto(
    @SerializedName("id")
    val id: String,
    
    @SerializedName("title")
    val title: String,
    
    @SerializedName("description")
    val description: String,
    
    @SerializedName("icon")
    val icon: String, // Emoji
    
    @SerializedName("category")
    val category: String, // "training", "nutrition", "recovery", "motivation", "health"
    
    @SerializedName("priority")
    val priority: String? = null // "high", "medium", "low"
)
```

#### AICoachSuggestionsResponseDto.kt

```kotlin
package com.yourapp.data.dto

import com.google.gson.annotations.SerializedName

data class AICoachSuggestionsResponseDto(
    @SerializedName("suggestions")
    val suggestions: List<SuggestedActivityDto>,
    
    @SerializedName("personalizedTips")
    val personalizedTips: List<PersonalizedTipDto>? = null
)
```

### 2. API Service (Retrofit)

#### AICoachApiService.kt

```kotlin
package com.yourapp.data.remote

import com.yourapp.data.dto.AICoachSuggestionsRequestDto
import com.yourapp.data.dto.AICoachSuggestionsResponseDto
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.Header
import retrofit2.http.POST

interface AICoachApiService {
    
    @POST("ai-coach/suggestions")
    suspend fun getSuggestions(
        @Header("Authorization") token: String,
        @Body request: AICoachSuggestionsRequestDto
    ): Response<AICoachSuggestionsResponseDto>
}
```

### 3. Remote Data Source

#### AICoachRemoteDataSource.kt

```kotlin
package com.yourapp.data.remote

import com.yourapp.data.dto.AICoachSuggestionsRequestDto
import com.yourapp.data.dto.AICoachSuggestionsResponseDto
import javax.inject.Inject

class AICoachRemoteDataSource @Inject constructor(
    private val apiService: AICoachApiService
) {
    suspend fun getSuggestions(
        token: String,
        request: AICoachSuggestionsRequestDto
    ): Result<AICoachSuggestionsResponseDto> {
        return try {
            val response = apiService.getSuggestions(
                token = "Bearer $token",
                request = request
            )
            
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(
                    Exception("Error: ${response.code()} - ${response.message()}")
                )
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
```

### 4. Repository Implementation

#### AICoachRepositoryImpl.kt

```kotlin
package com.yourapp.data.repository

import com.yourapp.data.dto.AICoachSuggestionsRequestDto
import com.yourapp.data.dto.AICoachSuggestionsResponseDto
import com.yourapp.data.remote.AICoachRemoteDataSource
import com.yourapp.domain.model.AICoachRequest
import com.yourapp.domain.model.AICoachSuggestionsResult
import com.yourapp.domain.repository.AICoachRepository
import javax.inject.Inject

class AICoachRepositoryImpl @Inject constructor(
    private val remoteDataSource: AICoachRemoteDataSource
) : AICoachRepository {
    
    override suspend fun getSuggestions(
        token: String,
        request: AICoachRequest
    ): Result<AICoachSuggestionsResult> {
        val requestDto = AICoachSuggestionsRequestDto(
            workouts = request.workouts,
            calories = request.calories,
            minutes = request.minutes,
            streak = request.streak,
            sportPreferences = request.sportPreferences
        )
        
        return remoteDataSource.getSuggestions(token, requestDto)
            .map { response ->
                AICoachSuggestionsResult(
                    suggestions = response.suggestions.map { dto ->
                        SuggestedActivity(
                            id = dto.id,
                            title = dto.title,
                            sportType = dto.sportType,
                            location = dto.location,
                            date = dto.date,
                            time = dto.time,
                            participants = dto.participants,
                            maxParticipants = dto.maxParticipants,
                            level = dto.level,
                            matchScore = dto.matchScore
                        )
                    },
                    personalizedTips = response.personalizedTips?.map { dto ->
                        PersonalizedTip(
                            id = dto.id,
                            title = dto.title,
                            description = dto.description,
                            icon = dto.icon,
                            category = dto.category,
                            priority = dto.priority ?: "medium"
                        )
                    } ?: emptyList()
                )
            }
    }
}
```

---

## 🎯 Domain Layer

### 1. Models

#### AICoachRequest.kt

```kotlin
package com.yourapp.domain.model

data class AICoachRequest(
    val workouts: Int,
    val calories: Int,
    val minutes: Int,
    val streak: Int,
    val sportPreferences: String? = null
)
```

#### SuggestedActivity.kt

```kotlin
package com.yourapp.domain.model

data class SuggestedActivity(
    val id: String,
    val title: String,
    val sportType: String,
    val location: String,
    val date: String,
    val time: String,
    val participants: Int,
    val maxParticipants: Int,
    val level: String,
    val matchScore: Int // 0-100
)
```

#### PersonalizedTip.kt

```kotlin
package com.yourapp.domain.model

data class PersonalizedTip(
    val id: String,
    val title: String,
    val description: String,
    val icon: String, // Emoji
    val category: String, // "training", "nutrition", "recovery", "motivation", "health"
    val priority: String // "high", "medium", "low"
)
```

#### AICoachSuggestionsResult.kt

```kotlin
package com.yourapp.domain.model

data class AICoachSuggestionsResult(
    val suggestions: List<SuggestedActivity>,
    val personalizedTips: List<PersonalizedTip>
)
```

### 2. Repository Interface

#### AICoachRepository.kt

```kotlin
package com.yourapp.domain.repository

import com.yourapp.domain.model.AICoachRequest
import com.yourapp.domain.model.AICoachSuggestionsResult

interface AICoachRepository {
    suspend fun getSuggestions(
        token: String,
        request: AICoachRequest
    ): Result<AICoachSuggestionsResult>
}
```

### 3. Use Case

#### GetAICoachSuggestionsUseCase.kt

```kotlin
package com.yourapp.domain.usecase

import com.yourapp.domain.model.AICoachRequest
import com.yourapp.domain.model.AICoachSuggestionsResult
import com.yourapp.domain.repository.AICoachRepository
import javax.inject.Inject

class GetAICoachSuggestionsUseCase @Inject constructor(
    private val repository: AICoachRepository
) {
    suspend operator fun invoke(
        token: String,
        request: AICoachRequest
    ): Result<AICoachSuggestionsResult> {
        return repository.getSuggestions(token, request)
    }
}
```

---

## 🎨 Presentation Layer

### 1. ViewModel

#### AICoachViewModel.kt

```kotlin
package com.yourapp.presentation.aicoach

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.yourapp.domain.model.AICoachRequest
import com.yourapp.domain.model.AICoachSuggestionsResult
import com.yourapp.domain.usecase.GetAICoachSuggestionsUseCase
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class AICoachViewModel @Inject constructor(
    private val getAICoachSuggestionsUseCase: GetAICoachSuggestionsUseCase
) : ViewModel() {
    
    private val _uiState = MutableStateFlow<AICoachUiState>(
        AICoachUiState.Idle
    )
    val uiState: StateFlow<AICoachUiState> = _uiState.asStateFlow()
    
    fun getSuggestions(
        token: String,
        workouts: Int,
        calories: Int,
        minutes: Int,
        streak: Int,
        sportPreferences: String? = null
    ) {
        viewModelScope.launch {
            _uiState.value = AICoachUiState.Loading
            
            val request = AICoachRequest(
                workouts = workouts,
                calories = calories,
                minutes = minutes,
                streak = streak,
                sportPreferences = sportPreferences
            )
            
            getAICoachSuggestionsUseCase(token, request)
                .onSuccess { result ->
                    _uiState.value = AICoachUiState.Success(result)
                }
                .onFailure { error ->
                    _uiState.value = AICoachUiState.Error(
                        error.message ?: "Une erreur est survenue"
                    )
                }
        }
    }
    
    fun refreshSuggestions(
        token: String,
        workouts: Int,
        calories: Int,
        minutes: Int,
        streak: Int,
        sportPreferences: String? = null
    ) {
        getSuggestions(token, workouts, calories, minutes, streak, sportPreferences)
    }
}

sealed class AICoachUiState {
    object Idle : AICoachUiState()
    object Loading : AICoachUiState()
    data class Success(val result: AICoachSuggestionsResult) : AICoachUiState()
    data class Error(val message: String) : AICoachUiState()
}
```

### 2. Screen Principal

#### AICoachScreen.kt

```kotlin
package com.yourapp.presentation.aicoach

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AICoachScreen(
    token: String,
    stravaData: StravaData, // Données Strava de la semaine
    viewModel: AICoachViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    
    // Charger les suggestions au démarrage
    LaunchedEffect(Unit) {
        viewModel.getSuggestions(
            token = token,
            workouts = stravaData.workouts,
            calories = stravaData.calories,
            minutes = stravaData.minutes,
            streak = stravaData.streak,
            sportPreferences = stravaData.sportPreferences
        )
    }
    
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("🤖 AI Coach") },
                actions = {
                    IconButton(
                        onClick = {
                            viewModel.refreshSuggestions(
                                token = token,
                                workouts = stravaData.workouts,
                                calories = stravaData.calories,
                                minutes = stravaData.minutes,
                                streak = stravaData.streak,
                                sportPreferences = stravaData.sportPreferences
                            )
                        },
                        enabled = uiState !is AICoachUiState.Loading
                    ) {
                        Icon(
                            imageVector = Icons.Default.Refresh,
                            contentDescription = "Actualiser"
                        )
                    }
                }
            )
        }
    ) { paddingValues ->
        when (uiState) {
            is AICoachUiState.Idle -> {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(paddingValues),
                    contentAlignment = Alignment.Center
                ) {
                    Text("Appuyez sur actualiser pour charger les suggestions")
                }
            }
            
            is AICoachUiState.Loading -> {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(paddingValues),
                    contentAlignment = Alignment.Center
                ) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        CircularProgressIndicator()
                        Text("Analyse en cours par l'AI Coach...")
                    }
                }
            }
            
            is AICoachUiState.Success -> {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(paddingValues)
                        .verticalScroll(rememberScrollState())
                        .padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(24.dp)
                ) {
                    // Section des conseils personnalisés
                    if (uiState.result.personalizedTips.isNotEmpty()) {
                        PersonalizedTipsSection(
                            tips = uiState.result.personalizedTips
                        )
                    }
                    
                    // Section des suggestions d'activités
                    Text(
                        text = "Activités suggérées",
                        style = MaterialTheme.typography.headlineSmall
                    )
                    
                    SuggestionsList(
                        suggestions = uiState.result.suggestions,
                        onActivityClick = { activity ->
                            // Naviguer vers les détails de l'activité
                        }
                    )
                }
            }
            
            is AICoachUiState.Error -> {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(paddingValues),
                    contentAlignment = Alignment.Center
                ) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        Text(
                            text = "Erreur",
                            style = MaterialTheme.typography.headlineSmall,
                            color = MaterialTheme.colorScheme.error
                        )
                        Text(uiState.message)
                        Button(
                            onClick = {
                                viewModel.refreshSuggestions(
                                    token = token,
                                    workouts = stravaData.workouts,
                                    calories = stravaData.calories,
                                    minutes = stravaData.minutes,
                                    streak = stravaData.streak,
                                    sportPreferences = stravaData.sportPreferences
                                )
                            }
                        ) {
                            Text("Réessayer")
                        }
                    }
                }
            }
        }
    }
}

// Data class pour les données Strava
data class StravaData(
    val workouts: Int,
    val calories: Int,
    val minutes: Int,
    val streak: Int,
    val sportPreferences: String? = null
)
```

### 3. Liste des Suggestions

#### SuggestionsList.kt

```kotlin
package com.yourapp.presentation.aicoach

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.yourapp.domain.model.SuggestedActivity

@Composable
fun SuggestionsList(
    suggestions: List<SuggestedActivity>,
    onActivityClick: (SuggestedActivity) -> Unit
) {
    LazyColumn(
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        items(suggestions) { activity ->
            ActivitySuggestionCard(
                activity = activity,
                onClick = { onActivityClick(activity) }
            )
        }
    }
}
```

### 4. Card d'Activité Suggérée

#### ActivitySuggestionCard.kt

```kotlin
package com.yourapp.presentation.aicoach

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.yourapp.domain.model.SuggestedActivity

@Composable
fun ActivitySuggestionCard(
    activity: SuggestedActivity,
    onClick: () -> Unit
) {
    Card(
        onClick = onClick,
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = activity.title,
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold
                )
                
                // Score de correspondance
                Surface(
                    shape = MaterialTheme.shapes.small,
                    color = when {
                        activity.matchScore >= 80 -> MaterialTheme.colorScheme.primaryContainer
                        activity.matchScore >= 60 -> MaterialTheme.colorScheme.secondaryContainer
                        else -> MaterialTheme.colorScheme.tertiaryContainer
                    }
                ) {
                    Text(
                        text = "${activity.matchScore}%",
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                        style = MaterialTheme.typography.labelMedium
                    )
                }
            }
            
            Row(
                horizontalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                LabeledText(
                    label = "Sport",
                    text = activity.sportType
                )
                LabeledText(
                    label = "Niveau",
                    text = activity.level
                )
            }
            
            Row(
                horizontalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                LabeledText(
                    label = "Lieu",
                    text = activity.location
                )
                LabeledText(
                    label = "Date",
                    text = activity.date
                )
            }
            
            Row(
                horizontalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                LabeledText(
                    label = "Heure",
                    text = activity.time
                )
                LabeledText(
                    label = "Participants",
                    text = "${activity.participants}/${activity.maxParticipants}"
                )
            }
        }
    }
}

@Composable
fun LabeledText(
    label: String,
    text: String
) {
    Column {
        Text(
            text = label,
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Text(
            text = text,
            style = MaterialTheme.typography.bodyMedium
        )
    }
}
```

### 5. Section des Conseils Personnalisés

#### PersonalizedTipsSection.kt

```kotlin
package com.yourapp.presentation.aicoach

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.yourapp.domain.model.PersonalizedTip

@Composable
fun PersonalizedTipsSection(
    tips: List<PersonalizedTip>
) {
    Column(
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Text(
            text = "💡 Conseils personnalisés (Nasy7)",
            style = MaterialTheme.typography.headlineSmall
        )
        
        LazyRow(
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            items(tips) { tip ->
                PersonalizedTipCard(tip = tip)
            }
        }
    }
}

@Composable
fun PersonalizedTipCard(
    tip: PersonalizedTip
) {
    Card(
        modifier = Modifier.width(280.dp),
        colors = CardDefaults.cardColors(
            containerColor = when (tip.priority) {
                "high" -> MaterialTheme.colorScheme.errorContainer
                "medium" -> MaterialTheme.colorScheme.primaryContainer
                else -> MaterialTheme.colorScheme.secondaryContainer
            }
        )
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Text(
                    text = tip.icon,
                    style = MaterialTheme.typography.headlineMedium
                )
                Text(
                    text = tip.title,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
            }
            
            Text(
                text = tip.description,
                style = MaterialTheme.typography.bodyMedium
            )
            
            Surface(
                shape = MaterialTheme.shapes.small,
                color = MaterialTheme.colorScheme.surfaceVariant
            ) {
                Text(
                    text = tip.category,
                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                    style = MaterialTheme.typography.labelSmall
                )
            }
        }
    }
}
```

---

## 🔧 Configuration Retrofit

### NetworkModule.kt (Hilt)

```kotlin
package com.yourapp.di

import com.yourapp.data.remote.AICoachApiService
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {
    
    private const val BASE_URL = "https://apinest-production.up.railway.app/"
    
    @Provides
    @Singleton
    fun provideOkHttpClient(): OkHttpClient {
        val loggingInterceptor = HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BODY
        }
        
        return OkHttpClient.Builder()
            .addInterceptor(loggingInterceptor)
            .build()
    }
    
    @Provides
    @Singleton
    fun provideRetrofit(okHttpClient: OkHttpClient): Retrofit {
        return Retrofit.Builder()
            .baseUrl(BASE_URL)
            .client(okHttpClient)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
    }
    
    @Provides
    @Singleton
    fun provideAICoachApiService(
        retrofit: Retrofit
    ): AICoachApiService {
        return retrofit.create(AICoachApiService::class.java)
    }
}
```

### RepositoryModule.kt (Hilt)

```kotlin
package com.yourapp.di

import com.yourapp.data.repository.AICoachRepositoryImpl
import com.yourapp.domain.repository.AICoachRepository
import dagger.Binds
import dagger.Module
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
abstract class RepositoryModule {
    
    @Binds
    @Singleton
    abstract fun bindAICoachRepository(
        aiCoachRepositoryImpl: AICoachRepositoryImpl
    ): AICoachRepository
}
```

---

## 📝 Utilisation

### Dans votre Navigation

```kotlin
@Composable
fun AppNavigation(
    token: String,
    stravaData: StravaData
) {
    NavHost(
        navController = navController,
        startDestination = "home"
    ) {
        composable("ai-coach") {
            AICoachScreen(
                token = token,
                stravaData = stravaData
            )
        }
    }
}
```

### Récupération des données Strava

Vous devez récupérer les données Strava de la semaine depuis votre intégration Strava :

```kotlin
// Exemple de récupération des données Strava
data class StravaWeeklyData(
    val workouts: Int,      // Nombre d'entraînements cette semaine
    val calories: Int,      // Calories brûlées
    val minutes: Int,        // Minutes d'activité
    val streak: Int,        // Série (jours consécutifs)
    val sportPreferences: String? = null // Sports préférés
)

// Utilisation
val stravaData = StravaWeeklyData(
    workouts = 5,
    calories = 2500,
    minutes = 300,
    streak = 7,
    sportPreferences = "Running, Cycling"
)
```

---

## 🔐 Authentification

**Important :** L'endpoint nécessite un token JWT. Assurez-vous de :

1. Récupérer le token après le login
2. Le stocker de manière sécurisée
3. L'inclure dans chaque requête avec le header `Authorization: Bearer <token>`

---

## 🎨 Améliorations Possibles

### 1. Pull-to-Refresh

Ajoutez un pull-to-refresh pour actualiser les suggestions :

```kotlin
val pullRefreshState = rememberPullRefreshState(
    refreshing = uiState is AICoachUiState.Loading,
    onRefresh = {
        viewModel.refreshSuggestions(...)
    }
)

Box(modifier = Modifier.pullRefresh(pullRefreshState)) {
    // Contenu
    PullRefreshIndicator(
        refreshing = uiState is AICoachUiState.Loading,
        state = pullRefreshState,
        modifier = Modifier.align(Alignment.TopCenter)
    )
}
```

### 2. Cache des Suggestions

Implémentez un cache pour éviter de recharger les suggestions à chaque fois :

```kotlin
class AICoachViewModel @Inject constructor(
    private val getAICoachSuggestionsUseCase: GetAICoachSuggestionsUseCase
) : ViewModel() {
    private var cachedResult: AICoachSuggestionsResult? = null
    
    fun getSuggestions(...) {
        if (cachedResult != null) {
            _uiState.value = AICoachUiState.Success(cachedResult!!)
            return
        }
        // ... charger depuis l'API
    }
}
```

### 3. Filtrage par Catégorie

Ajoutez des filtres pour les conseils par catégorie :

```kotlin
var selectedCategory by remember { mutableStateOf<String?>(null) }

val filteredTips = tips.filter {
    selectedCategory == null || it.category == selectedCategory
}
```

---

## 🐛 Gestion des Erreurs

Le service gère automatiquement les erreurs et retourne un mode fallback si Gemini n'est pas configuré. Dans votre ViewModel, vous pouvez gérer différents types d'erreurs :

```kotlin
.onFailure { error ->
    val errorMessage = when {
        error.message?.contains("401") == true -> "Non autorisé. Veuillez vous reconnecter."
        error.message?.contains("400") == true -> "Données invalides. Vérifiez vos informations."
        error.message?.contains("500") == true -> "Erreur serveur. Réessayez plus tard."
        else -> error.message ?: "Une erreur est survenue"
    }
    _uiState.value = AICoachUiState.Error(errorMessage)
}
```

---

## ✅ Test

Pour tester l'endpoint :

1. **Connectez-vous** et récupérez le token JWT
2. **Récupérez les données Strava** de la semaine
3. **Appelez l'endpoint** avec les données
4. **Vérifiez les suggestions** d'activités et les conseils personnalisés

### Test avec Postman

```json
POST https://apinest-production.up.railway.app/ai-coach/suggestions
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "workouts": 5,
  "calories": 2500,
  "minutes": 300,
  "streak": 7,
  "sportPreferences": "Running, Cycling"
}
```

---

## 📚 Ressources

- [Retrofit Documentation](https://square.github.io/retrofit/)
- [Jetpack Compose Documentation](https://developer.android.com/jetpack/compose)
- [Hilt Dependency Injection](https://developer.android.com/training/dependency-injection/hilt-android)
- [Material 3 Components](https://m3.material.io/)
- [Google Gemini AI](https://ai.google.dev/)

---

## 🎉 Résumé

Vous avez maintenant une implémentation complète de l'AI Coach dans votre application Android avec Jetpack Compose ! 

L'AI Coach utilise **Google Gemini AI** pour :
- ✅ Analyser les données Strava de l'utilisateur
- ✅ Générer des suggestions d'activités personnalisées
- ✅ Fournir des conseils personnalisés (Nasy7) basés sur les statistiques
- ✅ Calculer un score de correspondance pour chaque activité

Le mode fallback garantit que l'application fonctionne même si Gemini n'est pas configuré ! 🚀



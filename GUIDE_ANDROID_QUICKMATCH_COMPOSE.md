# 📱 Guide Android Jetpack Compose - QuickMatch

## 🎯 Vue d'Ensemble

Ce guide explique comment implémenter l'écran QuickMatch dans une application Android avec Jetpack Compose. QuickMatch permet aux utilisateurs de découvrir et matcher avec d'autres utilisateurs basé sur leurs sports/intérêts communs, avec une interface de type "swipe" (comme Tinder).

### Fonctionnalités

- ✅ Affichage des profils compatibles (sports communs)
- ✅ Like un profil (swipe droite)
- ✅ Pass un profil (swipe gauche)
- ✅ Match automatique (si l'autre utilisateur vous a liké)
- ✅ Exclusion des profils likés/matchés/passés récents (7 jours)
- ✅ Filtre strict par sports communs (un seul sport suffit)

---

## 🏗️ Architecture

### Structure des Couches

```
📁 data/
  ├── 📁 remote/
  │   ├── QuickMatchApiService.kt      # Interface Retrofit
  │   └── QuickMatchRemoteDataSource.kt # Data source remote
  ├── 📁 repository/
  │   └── QuickMatchRepositoryImpl.kt   # Implémentation du repository
  └── 📁 dto/
      ├── ProfileDto.kt                 # DTO pour les profils
      ├── LikeRequestDto.kt             # DTO pour les likes
      └── PaginationDto.kt              # DTO pour la pagination

📁 domain/
  ├── 📁 model/
  │   ├── MatchUserProfile.kt           # Modèle de profil
  │   └── Match.kt                      # Modèle de match
  ├── 📁 repository/
  │   └── QuickMatchRepository.kt       # Interface repository
  └── 📁 usecase/
      ├── GetProfilesUseCase.kt
      ├── LikeProfileUseCase.kt
      └── PassProfileUseCase.kt

📁 presentation/
  ├── 📁 quickmatch/
  │   ├── QuickMatchViewModel.kt        # ViewModel
  │   ├── QuickMatchScreen.kt           # Screen principal
  │   ├── ProfileCard.kt                # Card de profil
  │   ├── ProfileStack.kt               # Stack de cartes (swipe)
  │   └── MatchDialog.kt                # Dialog de match
```

---

## 📦 Data Layer

### 1. DTOs (Data Transfer Objects)

#### ProfileDto.kt

```kotlin
package com.yourapp.data.dto

import com.google.gson.annotations.SerializedName

data class ProfileDto(
    @SerializedName("_id")
    val id: String,
    
    @SerializedName("name")
    val name: String,
    
    @SerializedName("email")
    val email: String?,
    
    @SerializedName("location")
    val location: String?,
    
    @SerializedName("latitude")
    val latitude: Double?,
    
    @SerializedName("longitude")
    val longitude: Double?,
    
    @SerializedName("sportsInterests")
    val sportsInterests: List<String>?,
    
    @SerializedName("profileImageUrl")
    val profileImageUrl: String?,
    
    @SerializedName("profileImageThumbnailUrl")
    val profileImageThumbnailUrl: String?,
    
    @SerializedName("about")
    val about: String?,
    
    @SerializedName("activitiesCount")
    val activitiesCount: Int?,
    
    @SerializedName("distance")
    val distance: String?
)

data class ProfilesResponseDto(
    @SerializedName("profiles")
    val profiles: List<ProfileDto>,
    
    @SerializedName("pagination")
    val pagination: PaginationDto
)

data class PaginationDto(
    @SerializedName("total")
    val total: Int,
    
    @SerializedName("page")
    val page: Int,
    
    @SerializedName("totalPages")
    val totalPages: Int,
    
    @SerializedName("limit")
    val limit: Int
)

data class LikeResponseDto(
    @SerializedName("isMatch")
    val isMatch: Boolean
)

data class LikeRequestDto(
    @SerializedName("profileId")
    val profileId: String
)

data class PassRequestDto(
    @SerializedName("profileId")
    val profileId: String
)
```

### 2. API Service (Retrofit)

#### QuickMatchApiService.kt

```kotlin
package com.yourapp.data.remote

import com.yourapp.data.dto.*
import retrofit2.Response
import retrofit2.http.*

interface QuickMatchApiService {
    
    /**
     * Récupère les profils compatibles (sports communs)
     * Exclut automatiquement : utilisateur connecté, profils likés, matchés, et passés récents (7 jours)
     */
    @GET("quick-match/profiles")
    suspend fun getProfiles(
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20
    ): Response<ProfilesResponseDto>
    
    /**
     * Like un profil
     * Retourne true si c'est un match (l'autre utilisateur vous a déjà liké)
     */
    @POST("quick-match/like")
    suspend fun likeProfile(
        @Body request: LikeRequestDto
    ): Response<LikeResponseDto>
    
    /**
     * Pass un profil (ne pas afficher pendant 7 jours)
     */
    @POST("quick-match/pass")
    suspend fun passProfile(
        @Body request: PassRequestDto
    ): Response<Unit>
    
    /**
     * Vérifie si deux utilisateurs ont matché
     */
    @GET("quick-match/check-match/{profileId}")
    suspend fun checkMatch(
        @Path("profileId") profileId: String
    ): Response<Boolean>
}
```

### 3. Remote Data Source

#### QuickMatchRemoteDataSource.kt

```kotlin
package com.yourapp.data.remote

import com.yourapp.data.dto.*
import javax.inject.Inject

class QuickMatchRemoteDataSource @Inject constructor(
    private val apiService: QuickMatchApiService
) {
    
    suspend fun getProfiles(page: Int = 1, limit: Int = 20): Result<ProfilesResponseDto> {
        return try {
            val response = apiService.getProfiles(page, limit)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("Failed to load profiles: ${response.message()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    suspend fun likeProfile(profileId: String): Result<LikeResponseDto> {
        return try {
            val response = apiService.likeProfile(LikeRequestDto(profileId))
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("Failed to like profile: ${response.message()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    suspend fun passProfile(profileId: String): Result<Unit> {
        return try {
            val response = apiService.passProfile(PassRequestDto(profileId))
            if (response.isSuccessful) {
                Result.success(Unit)
            } else {
                Result.failure(Exception("Failed to pass profile: ${response.message()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    suspend fun checkMatch(profileId: String): Result<Boolean> {
        return try {
            val response = apiService.checkMatch(profileId)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("Failed to check match: ${response.message()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
```

---

## 🎯 Domain Layer

### 1. Domain Models

#### MatchUserProfile.kt

```kotlin
package com.yourapp.domain.model

data class MatchUserProfile(
    val id: String,
    val name: String,
    val email: String?,
    val location: String?,
    val latitude: Double?,
    val longitude: Double?,
    val sportsInterests: List<String>,
    val profileImageUrl: String?,
    val profileImageThumbnailUrl: String?,
    val about: String?,
    val activitiesCount: Int,
    val distance: String?
)

data class ProfilesResponse(
    val profiles: List<MatchUserProfile>,
    val pagination: Pagination
)

data class Pagination(
    val total: Int,
    val page: Int,
    val totalPages: Int,
    val limit: Int
)

data class LikeResult(
    val isMatch: Boolean
)
```

### 2. Mapper (DTO → Domain)

#### ProfileMapper.kt

```kotlin
package com.yourapp.data.mapper

import com.yourapp.data.dto.*
import com.yourapp.domain.model.*

object ProfileMapper {
    
    fun ProfileDto.toDomain(): MatchUserProfile {
        return MatchUserProfile(
            id = this.id,
            name = this.name,
            email = this.email,
            location = this.location,
            latitude = this.latitude,
            longitude = this.longitude,
            sportsInterests = this.sportsInterests ?: emptyList(),
            profileImageUrl = this.profileImageUrl,
            profileImageThumbnailUrl = this.profileImageThumbnailUrl,
            about = this.about,
            activitiesCount = this.activitiesCount ?: 0,
            distance = this.distance
        )
    }
    
    fun ProfilesResponseDto.toDomain(): ProfilesResponse {
        return ProfilesResponse(
            profiles = this.profiles.map { it.toDomain() },
            pagination = this.pagination.toDomain()
        )
    }
    
    fun PaginationDto.toDomain(): Pagination {
        return Pagination(
            total = this.total,
            page = this.page,
            totalPages = this.totalPages,
            limit = this.limit
        )
    }
    
    fun LikeResponseDto.toDomain(): LikeResult {
        return LikeResult(
            isMatch = this.isMatch
        )
    }
}
```

### 3. Repository Interface

#### QuickMatchRepository.kt

```kotlin
package com.yourapp.domain.repository

import com.yourapp.domain.model.ProfilesResponse
import com.yourapp.domain.model.LikeResult

interface QuickMatchRepository {
    
    suspend fun getProfiles(page: Int = 1, limit: Int = 20): Result<ProfilesResponse>
    
    suspend fun likeProfile(profileId: String): Result<LikeResult>
    
    suspend fun passProfile(profileId: String): Result<Unit>
    
    suspend fun checkMatch(profileId: String): Result<Boolean>
}
```

### 4. Repository Implementation

#### QuickMatchRepositoryImpl.kt

```kotlin
package com.yourapp.data.repository

import com.yourapp.data.mapper.ProfileMapper
import com.yourapp.data.remote.QuickMatchRemoteDataSource
import com.yourapp.domain.model.LikeResult
import com.yourapp.domain.model.ProfilesResponse
import com.yourapp.domain.repository.QuickMatchRepository
import javax.inject.Inject

class QuickMatchRepositoryImpl @Inject constructor(
    private val remoteDataSource: QuickMatchRemoteDataSource
) : QuickMatchRepository {
    
    override suspend fun getProfiles(page: Int, limit: Int): Result<ProfilesResponse> {
        return remoteDataSource.getProfiles(page, limit)
            .map { it.toDomain() }
    }
    
    override suspend fun likeProfile(profileId: String): Result<LikeResult> {
        return remoteDataSource.likeProfile(profileId)
            .map { it.toDomain() }
    }
    
    override suspend fun passProfile(profileId: String): Result<Unit> {
        return remoteDataSource.passProfile(profileId)
    }
    
    override suspend fun checkMatch(profileId: String): Result<Boolean> {
        return remoteDataSource.checkMatch(profileId)
    }
}
```

---

## 🎨 Presentation Layer

### 1. ViewModel

#### QuickMatchViewModel.kt

```kotlin
package com.yourapp.presentation.quickmatch

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.yourapp.domain.model.LikeResult
import com.yourapp.domain.model.MatchUserProfile
import com.yourapp.domain.model.ProfilesResponse
import com.yourapp.domain.repository.QuickMatchRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class QuickMatchUiState(
    val profiles: List<MatchUserProfile> = emptyList(),
    val isLoading: Boolean = false,
    val error: String? = null,
    val currentMatch: MatchUserProfile? = null, // Pour afficher le dialog de match
    val hasMoreProfiles: Boolean = true,
    val currentPage: Int = 1
)

@HiltViewModel
class QuickMatchViewModel @Inject constructor(
    private val repository: QuickMatchRepository
) : ViewModel() {
    
    private val _uiState = MutableStateFlow(QuickMatchUiState())
    val uiState: StateFlow<QuickMatchUiState> = _uiState.asStateFlow()
    
    init {
        loadProfiles()
    }
    
    fun loadProfiles(append: Boolean = false) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(
                isLoading = true,
                error = null
            )
            
            val page = if (append) _uiState.value.currentPage + 1 else 1
            
            repository.getProfiles(page = page, limit = 20)
                .onSuccess { response ->
                    val currentProfiles = if (append) _uiState.value.profiles else emptyList()
                    val newProfiles = response.profiles
                    
                    // Filtrer les doublons
                    val uniqueProfiles = (currentProfiles + newProfiles)
                        .distinctBy { it.id }
                    
                    _uiState.value = _uiState.value.copy(
                        profiles = uniqueProfiles,
                        isLoading = false,
                        currentPage = page,
                        hasMoreProfiles = page < response.pagination.totalPages,
                        error = null
                    )
                }
                .onFailure { error ->
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        error = error.message ?: "Failed to load profiles"
                    )
                }
        }
    }
    
    fun likeProfile(profileId: String, profile: MatchUserProfile) {
        viewModelScope.launch {
            repository.likeProfile(profileId)
                .onSuccess { result ->
                    // Retirer le profil de la liste
                    val updatedProfiles = _uiState.value.profiles.filter { it.id != profileId }
                    
                    // Si c'est un match, afficher le dialog
                    if (result.isMatch) {
                        _uiState.value = _uiState.value.copy(
                            profiles = updatedProfiles,
                            currentMatch = profile
                        )
                    } else {
                        _uiState.value = _uiState.value.copy(
                            profiles = updatedProfiles
                        )
                    }
                    
                    // Charger plus de profils si nécessaire
                    if (updatedProfiles.size < 5 && _uiState.value.hasMoreProfiles) {
                        loadProfiles(append = true)
                    }
                }
                .onFailure { error ->
                    _uiState.value = _uiState.value.copy(
                        error = error.message ?: "Failed to like profile"
                    )
                }
        }
    }
    
    fun passProfile(profileId: String) {
        viewModelScope.launch {
            repository.passProfile(profileId)
                .onSuccess {
                    // Retirer le profil de la liste
                    val updatedProfiles = _uiState.value.profiles.filter { it.id != profileId }
                    
                    _uiState.value = _uiState.value.copy(
                        profiles = updatedProfiles
                    )
                    
                    // Charger plus de profils si nécessaire
                    if (updatedProfiles.size < 5 && _uiState.value.hasMoreProfiles) {
                        loadProfiles(append = true)
                    }
                }
                .onFailure { error ->
                    _uiState.value = _uiState.value.copy(
                        error = error.message ?: "Failed to pass profile"
                    )
                }
        }
    }
    
    fun dismissMatchDialog() {
        _uiState.value = _uiState.value.copy(currentMatch = null)
    }
    
    fun refresh() {
        loadProfiles(append = false)
    }
}
```

### 2. UI Composables

#### QuickMatchScreen.kt

```kotlin
package com.yourapp.presentation.quickmatch

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun QuickMatchScreen(
    viewModel: QuickMatchViewModel = hiltViewModel(),
    onNavigateToMatch: (String) -> Unit = {}
) {
    val uiState by viewModel.uiState.collectAsState()
    
    // Afficher le dialog de match si nécessaire
    uiState.currentMatch?.let { match ->
        MatchDialog(
            profile = match,
            onDismiss = { viewModel.dismissMatchDialog() },
            onViewMatch = {
                viewModel.dismissMatchDialog()
                onNavigateToMatch(match.id)
            }
        )
    }
    
    Column(
        modifier = Modifier.fillMaxSize()
    ) {
        // Header
        TopAppBar(
            title = { Text("QuickMatch") },
            actions = {
                IconButton(onClick = { viewModel.refresh() }) {
                    Icon(
                        imageVector = Icons.Default.Refresh,
                        contentDescription = "Refresh"
                    )
                }
            }
        )
        
        // Contenu
        when {
            uiState.isLoading && uiState.profiles.isEmpty() -> {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator()
                }
            }
            
            uiState.error != null -> {
                ErrorMessage(
                    message = uiState.error,
                    onRetry = { viewModel.refresh() }
                )
            }
            
            uiState.profiles.isEmpty() -> {
                EmptyState(onRefresh = { viewModel.refresh() })
            }
            
            else -> {
                ProfileStack(
                    profiles = uiState.profiles,
                    onLike = { profile ->
                        viewModel.likeProfile(profile.id, profile)
                    },
                    onPass = { profile ->
                        viewModel.passProfile(profile.id)
                    },
                    onLoadMore = {
                        if (uiState.hasMoreProfiles && !uiState.isLoading) {
                            viewModel.loadProfiles(append = true)
                        }
                    }
                )
                
                if (uiState.isLoading) {
                    LinearProgressIndicator(
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            }
        }
    }
}
```

#### ProfileStack.kt (Swipe Cards)

```kotlin
package com.yourapp.presentation.quickmatch

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.tween
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.layout.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.unit.dp
import com.yourapp.domain.model.MatchUserProfile
import kotlinx.coroutines.launch

@Composable
fun ProfileStack(
    profiles: List<MatchUserProfile>,
    onLike: (MatchUserProfile) -> Unit,
    onPass: (MatchUserProfile) -> Unit,
    onLoadMore: () -> Unit = {}
) {
    var currentIndex by remember { mutableStateOf(0) }
    
    // Charger plus de profils quand il reste 3 profils
    LaunchedEffect(currentIndex, profiles.size) {
        if (profiles.size - currentIndex <= 3) {
            onLoadMore()
        }
    }
    
    Box(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        // Afficher les 3 premiers profils (stack)
        profiles.take(3).forEachIndexed { stackIndex, profile ->
            val actualIndex = currentIndex + stackIndex
            
            if (actualIndex < profiles.size) {
                SwipeableProfileCard(
                    profile = profiles[actualIndex],
                    onSwipeLeft = {
                        if (actualIndex == currentIndex) {
                            onPass(profile)
                            currentIndex++
                        }
                    },
                    onSwipeRight = {
                        if (actualIndex == currentIndex) {
                            onLike(profile)
                            currentIndex++
                        }
                    },
                    zIndex = (3 - stackIndex).toFloat(),
                    scale = 1f - (stackIndex * 0.05f),
                    offsetY = (stackIndex * 8).dp
                )
            }
        }
        
        // Boutons d'action
        Row(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(32.dp),
            horizontalArrangement = Arrangement.spacedBy(24.dp)
        ) {
            // Pass Button
            FloatingActionButton(
                onClick = {
                    if (currentIndex < profiles.size) {
                        onPass(profiles[currentIndex])
                        currentIndex++
                    }
                },
                containerColor = MaterialTheme.colorScheme.error
            ) {
                Icon(
                    imageVector = Icons.Default.Close,
                    contentDescription = "Pass"
                )
            }
            
            // Like Button
            FloatingActionButton(
                onClick = {
                    if (currentIndex < profiles.size) {
                        onLike(profiles[currentIndex])
                        currentIndex++
                    }
                },
                containerColor = MaterialTheme.colorScheme.primary
            ) {
                Icon(
                    imageVector = Icons.Default.Favorite,
                    contentDescription = "Like"
                )
            }
        }
    }
}

@Composable
fun SwipeableProfileCard(
    profile: MatchUserProfile,
    onSwipeLeft: () -> Unit,
    onSwipeRight: () -> Unit,
    zIndex: Float = 1f,
    scale: Float = 1f,
    offsetY: Dp = 0.dp
) {
    val offsetX = remember { Animatable(0f) }
    val rotation = remember { Animatable(0f) }
    val scope = rememberCoroutineScope()
    
    Box(
        modifier = Modifier
            .fillMaxSize()
            .graphicsLayer {
                this.zIndex = zIndex
                scaleX = scale
                scaleY = scale
                translationY = offsetY.toPx()
                translationX = offsetX.value
                rotationZ = rotation.value
            }
            .pointerInput(Unit) {
                detectDragGestures(
                    onDragEnd = {
                        val threshold = size.width * 0.3f
                        when {
                            offsetX.value > threshold -> {
                                // Swipe droite - Like
                                scope.launch {
                                    offsetX.animateTo(size.width.toFloat())
                                    onSwipeRight()
                                }
                            }
                            offsetX.value < -threshold -> {
                                // Swipe gauche - Pass
                                scope.launch {
                                    offsetX.animateTo(-size.width.toFloat())
                                    onSwipeLeft()
                                }
                            }
                            else -> {
                                // Retour à la position initiale
                                scope.launch {
                                    offsetX.animateTo(0f)
                                    rotation.animateTo(0f)
                                }
                            }
                        }
                    }
                ) { change, dragAmount ->
                    change.consume()
                    
                    scope.launch {
                        offsetX.snapTo(offsetX.value + dragAmount.x)
                        rotation.snapTo(offsetX.value * 0.05f) // Rotation basée sur la position
                    }
                }
            }
    ) {
        ProfileCard(profile = profile)
    }
}
```

#### ProfileCard.kt

```kotlin
package com.yourapp.presentation.quickmatch

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import com.yourapp.domain.model.MatchUserProfile

@Composable
fun ProfileCard(profile: MatchUserProfile) {
    Card(
        modifier = Modifier.fillMaxSize(),
        shape = RoundedCornerShape(16.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 8.dp)
    ) {
        Column(
            modifier = Modifier.fillMaxSize()
        ) {
            // Image de profil
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(400.dp)
            ) {
                AsyncImage(
                    model = profile.profileImageUrl ?: profile.profileImageThumbnailUrl,
                    contentDescription = profile.name,
                    modifier = Modifier.fillMaxSize(),
                    contentScale = ContentScale.Crop
                )
                
                // Gradient overlay
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(
                            Brush.verticalGradient(
                                colors = listOf(
                                    Color.Transparent,
                                    Color.Black.copy(alpha = 0.7f)
                                )
                            )
                        )
                )
            }
            
            // Informations
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp)
            ) {
                Text(
                    text = profile.name,
                    style = MaterialTheme.typography.headlineMedium,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurface
                )
                
                Spacer(modifier = Modifier.height(8.dp))
                
                // Location
                if (profile.location != null) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = Icons.Default.LocationOn,
                            contentDescription = null,
                            modifier = Modifier.size(16.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = profile.location,
                            style = MaterialTheme.typography.bodyMedium
                        )
                        if (profile.distance != null) {
                            Text(
                                text = " • ${profile.distance}",
                                style = MaterialTheme.typography.bodyMedium
                            )
                        }
                    }
                    Spacer(modifier = Modifier.height(8.dp))
                }
                
                // Sports communs
                if (profile.sportsInterests.isNotEmpty()) {
                    Text(
                        text = "Sports: ${profile.sportsInterests.joinToString(", ")}",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.primary
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                }
                
                // About
                if (!profile.about.isNullOrBlank()) {
                    Text(
                        text = profile.about,
                        style = MaterialTheme.typography.bodyMedium,
                        maxLines = 3,
                        overflow = TextOverflow.Ellipsis
                    )
                }
                
                // Activités
                if (profile.activitiesCount > 0) {
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = "${profile.activitiesCount} activités créées",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.secondary
                    )
                }
            }
        }
    }
}
```

#### MatchDialog.kt

```kotlin
package com.yourapp.presentation.quickmatch

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import com.yourapp.domain.model.MatchUserProfile

@Composable
fun MatchDialog(
    profile: MatchUserProfile,
    onDismiss: () -> Unit,
    onViewMatch: () -> Unit
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Text(
                text = "🎉 C'est un Match !",
                style = MaterialTheme.typography.headlineSmall
            )
        },
        text = {
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier.fillMaxWidth()
            ) {
                AsyncImage(
                    model = profile.profileImageUrl ?: profile.profileImageThumbnailUrl,
                    contentDescription = profile.name,
                    modifier = Modifier
                        .size(120.dp)
                        .clip(CircleShape)
                )
                
                Spacer(modifier = Modifier.height(16.dp))
                
                Text(
                    text = "Vous et ${profile.name} avez liké vos profils !",
                    style = MaterialTheme.typography.bodyLarge
                )
            }
        },
        confirmButton = {
            Button(onClick = onViewMatch) {
                Text("Voir le Match")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Continuer")
            }
        }
    )
}
```

---

## 🔧 Configuration Hilt (Dependency Injection)

### QuickMatchModule.kt

```kotlin
package com.yourapp.di

import com.yourapp.data.remote.QuickMatchApiService
import com.yourapp.data.remote.QuickMatchRemoteDataSource
import com.yourapp.data.repository.QuickMatchRepositoryImpl
import com.yourapp.domain.repository.QuickMatchRepository
import dagger.Binds
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import retrofit2.Retrofit
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object QuickMatchNetworkModule {
    
    @Provides
    @Singleton
    fun provideQuickMatchApiService(retrofit: Retrofit): QuickMatchApiService {
        return retrofit.create(QuickMatchApiService::class.java)
    }
    
    @Provides
    @Singleton
    fun provideQuickMatchRemoteDataSource(
        apiService: QuickMatchApiService
    ): QuickMatchRemoteDataSource {
        return QuickMatchRemoteDataSource(apiService)
    }
}

@Module
@InstallIn(SingletonComponent::class)
abstract class QuickMatchRepositoryModule {
    
    @Binds
    @Singleton
    abstract fun bindQuickMatchRepository(
        repository: QuickMatchRepositoryImpl
    ): QuickMatchRepository
}
```

---

## 📋 Checklist d'Intégration

- [ ] Créer les DTOs dans `data/dto/`
- [ ] Créer l'API Service Retrofit
- [ ] Créer le Remote Data Source
- [ ] Créer les mappers (DTO → Domain)
- [ ] Créer les domain models
- [ ] Implémenter le repository
- [ ] Configurer Hilt (dependency injection)
- [ ] Créer le ViewModel
- [ ] Créer les composables UI
- [ ] Ajouter la route de navigation
- [ ] Tester avec le backend

---

## 🎯 Points Importants

1. **Exclusion Automatique** : Le backend exclut automatiquement :
   - Utilisateur connecté
   - Profils déjà likés
   - Profils avec matchs
   - Profils passés récents (7 jours)

2. **Sports Communs** : Le backend retourne uniquement les profils avec au moins un sport en commun

3. **Pagination** : Utiliser `page` et `limit` pour charger plus de profils

4. **Gestion des Matchs** : Afficher un dialog quand `isMatch = true` après un like

5. **Refresh** : Retirer les profils likés/passés de la liste immédiatement

---

## 🚀 Utilisation

```kotlin
// Dans votre navigation
composable("quickmatch") {
    QuickMatchScreen(
        onNavigateToMatch = { matchId ->
            // Naviguer vers l'écran de match
        }
    )
}
```

Le guide est prêt ! Vous pouvez l'utiliser pour implémenter QuickMatch dans votre application Android. 🎉


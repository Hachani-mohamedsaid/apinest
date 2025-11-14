# Guide d'intégration Android - AI Matchmaker API

## 📱 Intégration dans votre application Android (Jetpack Compose + Kotlin)

Ce guide explique comment intégrer le nouveau endpoint AI Matchmaker dans votre application Android.

## 🔗 Endpoint

```
POST /ai-matchmaker/chat
```

**Authentification** : Requis (Bearer Token JWT)

## 📦 1. Modèles de données (Data Classes)

### ChatMessageDto.kt

```kotlin
data class ChatMessageDto(
    val role: String, // "user" ou "assistant"
    val content: String
)
```

### ChatRequestDto.kt

```kotlin
data class ChatRequestDto(
    val message: String,
    val conversationHistory: List<ChatMessageDto>? = null
)
```

### SuggestedActivityDto.kt

```kotlin
data class SuggestedActivityDto(
    val id: String,
    val title: String,
    val sportType: String,
    val location: String,
    val date: String,
    val time: String,
    val participants: Int,
    val maxParticipants: Int,
    val level: String,
    val matchScore: Double? = null
)
```

### SuggestedUserDto.kt

```kotlin
data class SuggestedUserDto(
    val id: String,
    val name: String,
    val profileImageUrl: String? = null,
    val sport: String,
    val distance: String? = null,
    val matchScore: Double? = null,
    val bio: String? = null,
    val availability: String? = null
)
```

### ChatResponseDto.kt

```kotlin
data class ChatResponseDto(
    val message: String,
    val suggestedActivities: List<SuggestedActivityDto>? = null,
    val suggestedUsers: List<SuggestedUserDto>? = null,
    val options: List<String>? = null
)
```

## 🌐 2. Service API (Retrofit)

### AIMatchmakerApiService.kt

```kotlin
import retrofit2.http.*

interface AIMatchmakerApiService {
    @POST("ai-matchmaker/chat")
    suspend fun chat(
        @Header("Authorization") token: String,
        @Body request: ChatRequestDto
    ): Response<ChatResponseDto>
}
```

### Configuration Retrofit

```kotlin
object ApiClient {
    private const val BASE_URL = "https://apinest-production.up.railway.app/"
    
    private val retrofit = Retrofit.Builder()
        .baseUrl(BASE_URL)
        .addConverterFactory(GsonConverterFactory.create())
        .build()
    
    val aiMatchmakerService: AIMatchmakerApiService = 
        retrofit.create(AIMatchmakerApiService::class.java)
}
```

## 🏗️ 3. Repository

### AIMatchmakerRepository.kt

```kotlin
class AIMatchmakerRepository(
    private val apiService: AIMatchmakerApiService,
    private val tokenManager: TokenManager // Votre gestionnaire de token
) {
    suspend fun sendMessage(
        message: String,
        conversationHistory: List<ChatMessageDto>? = null
    ): Result<ChatResponseDto> {
        return try {
            val token = tokenManager.getToken()
            if (token == null) {
                Result.failure(Exception("Token non disponible"))
            } else {
                val request = ChatRequestDto(
                    message = message,
                    conversationHistory = conversationHistory
                )
                val response = apiService.chat("Bearer $token", request)
                
                if (response.isSuccessful && response.body() != null) {
                    Result.success(response.body()!!)
                } else {
                    val errorBody = response.errorBody()?.string()
                    Result.failure(Exception("Erreur: ${response.code()} - $errorBody"))
                }
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
```

## 🎨 4. ViewModel (State Management)

### AIMatchmakerViewModel.kt

```kotlin
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class AIMatchmakerViewModel(
    private val repository: AIMatchmakerRepository
) : ViewModel() {
    
    private val _uiState = MutableStateFlow(AIMatchmakerUiState())
    val uiState: StateFlow<AIMatchmakerUiState> = _uiState.asStateFlow()
    
    private val conversationHistory = mutableListOf<ChatMessageDto>()
    
    fun sendMessage(message: String) {
        if (message.isBlank()) return
        
        // Ajouter le message utilisateur à l'historique
        conversationHistory.add(ChatMessageDto("user", message))
        
        // Mettre à jour l'UI
        _uiState.value = _uiState.value.copy(
            isLoading = true,
            error = null,
            messages = _uiState.value.messages + ChatMessageDto("user", message)
        )
        
        viewModelScope.launch {
            repository.sendMessage(message, conversationHistory.toList())
                .onSuccess { response ->
                    // Ajouter la réponse de l'IA à l'historique
                    conversationHistory.add(ChatMessageDto("assistant", response.message))
                    
                    // Mettre à jour l'UI avec la réponse
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        messages = _uiState.value.messages + ChatMessageDto("assistant", response.message),
                        suggestedActivities = response.suggestedActivities,
                        suggestedUsers = response.suggestedUsers,
                        options = response.options
                    )
                }
                .onFailure { error ->
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        error = error.message ?: "Une erreur est survenue"
                    )
                }
        }
    }
    
    fun clearError() {
        _uiState.value = _uiState.value.copy(error = null)
    }
}

data class AIMatchmakerUiState(
    val messages: List<ChatMessageDto> = emptyList(),
    val isLoading: Boolean = false,
    val error: String? = null,
    val suggestedActivities: List<SuggestedActivityDto>? = null,
    val suggestedUsers: List<SuggestedUserDto>? = null,
    val options: List<String>? = null
)
```

## 🎨 5. UI avec Jetpack Compose

### AIMatchmakerScreen.kt

```kotlin
@Composable
fun AIMatchmakerScreen(
    viewModel: AIMatchmakerViewModel = hiltViewModel(),
    onActivityClick: (String) -> Unit = {},
    onUserClick: (String) -> Unit = {}
) {
    val uiState by viewModel.uiState.collectAsState()
    var messageText by remember { mutableStateOf("") }
    
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        // Liste des messages
        LazyColumn(
            modifier = Modifier
                .weight(1f)
                .fillMaxWidth(),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            items(uiState.messages) { message ->
                ChatMessageItem(message = message)
            }
            
            if (uiState.isLoading) {
                item {
                    CircularProgressIndicator(
                        modifier = Modifier.align(Alignment.CenterHorizontally)
                    )
                }
            }
        }
        
        // Suggestions d'activités
        uiState.suggestedActivities?.let { activities ->
            SuggestedActivitiesSection(
                activities = activities,
                onActivityClick = onActivityClick
            )
        }
        
        // Suggestions d'utilisateurs
        uiState.suggestedUsers?.let { users ->
            SuggestedUsersSection(
                users = users,
                onUserClick = onUserClick
            )
        }
        
        // Options
        uiState.options?.let { options ->
            OptionsSection(options = options)
        }
        
        // Gestion des erreurs
        uiState.error?.let { error ->
            ErrorMessage(
                message = error,
                onDismiss = { viewModel.clearError() }
            )
        }
        
        // Champ de saisie
        MessageInputField(
            message = messageText,
            onMessageChange = { messageText = it },
            onSendClick = {
                viewModel.sendMessage(messageText)
                messageText = ""
            },
            enabled = !uiState.isLoading
        )
    }
}

@Composable
fun ChatMessageItem(message: ChatMessageDto) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(8.dp),
        horizontalArrangement = if (message.role == "user") 
            Arrangement.End else Arrangement.Start
    ) {
        Card(
            modifier = Modifier.widthIn(max = 280.dp),
            colors = CardDefaults.cardColors(
                containerColor = if (message.role == "user") 
                    MaterialTheme.colorScheme.primary 
                else 
                    MaterialTheme.colorScheme.surfaceVariant
            )
        ) {
            Text(
                text = message.content,
                modifier = Modifier.padding(12.dp),
                color = if (message.role == "user") 
                    MaterialTheme.colorScheme.onPrimary 
                else 
                    MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

@Composable
fun SuggestedActivitiesSection(
    activities: List<SuggestedActivityDto>,
    onActivityClick: (String) -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 8.dp)
    ) {
        Text(
            text = "Activités suggérées",
            style = MaterialTheme.typography.titleMedium,
            modifier = Modifier.padding(bottom = 8.dp)
        )
        
        LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            items(activities) { activity ->
                ActivityCard(
                    activity = activity,
                    onClick = { onActivityClick(activity.id) }
                )
            }
        }
    }
}

@Composable
fun SuggestedUsersSection(
    users: List<SuggestedUserDto>,
    onUserClick: (String) -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 8.dp)
    ) {
        Text(
            text = "Partenaires suggérés",
            style = MaterialTheme.typography.titleMedium,
            modifier = Modifier.padding(bottom = 8.dp)
        )
        
        LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            items(users) { user ->
                UserCard(
                    user = user,
                    onClick = { onUserClick(user.id) }
                )
            }
        }
    }
}

@Composable
fun MessageInputField(
    message: String,
    onMessageChange: (String) -> Unit,
    onSendClick: () -> Unit,
    enabled: Boolean
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        OutlinedTextField(
            value = message,
            onValueChange = onMessageChange,
            modifier = Modifier.weight(1f),
            placeholder = { Text("Tapez votre message...") },
            enabled = enabled,
            singleLine = false,
            maxLines = 4
        )
        
        Spacer(modifier = Modifier.width(8.dp))
        
        IconButton(
            onClick = onSendClick,
            enabled = enabled && message.isNotBlank()
        ) {
            Icon(
                imageVector = Icons.Default.Send,
                contentDescription = "Envoyer"
            )
        }
    }
}
```

## 🔧 6. Gestion des erreurs

### Gestion spécifique de l'erreur 429

```kotlin
fun sendMessage(message: String, conversationHistory: List<ChatMessageDto>? = null) {
    // ... code existant ...
    
    viewModelScope.launch {
        repository.sendMessage(message, conversationHistory)
            .onSuccess { response ->
                // ... traitement du succès ...
            }
            .onFailure { error ->
                when {
                    error.message?.contains("429") == true -> {
                        _uiState.value = _uiState.value.copy(
                            isLoading = false,
                            error = "Quota API dépassé. Le service utilise un mode de secours."
                        )
                        // Le backend retourne quand même des suggestions via le fallback
                    }
                    error.message?.contains("401") == true -> {
                        _uiState.value = _uiState.value.copy(
                            isLoading = false,
                            error = "Session expirée. Veuillez vous reconnecter."
                        )
                        // Naviguer vers l'écran de connexion
                    }
                    else -> {
                        _uiState.value = _uiState.value.copy(
                            isLoading = false,
                            error = error.message ?: "Une erreur est survenue"
                        )
                    }
                }
            }
    }
}
```

## 📝 7. Exemple d'utilisation complète

```kotlin
@Composable
fun AIMatchmakerScreenExample() {
    val viewModel: AIMatchmakerViewModel = hiltViewModel()
    val navController = rememberNavController()
    
    AIMatchmakerScreen(
        viewModel = viewModel,
        onActivityClick = { activityId ->
            // Naviguer vers les détails de l'activité
            navController.navigate("activity/$activityId")
        },
        onUserClick = { userId ->
            // Naviguer vers le profil de l'utilisateur
            navController.navigate("user/$userId")
        }
    )
}
```

## 🎯 8. Points importants

1. **Authentification** : N'oubliez pas d'inclure le token JWT dans le header `Authorization`
2. **Historique de conversation** : Maintenez l'historique pour un contexte continu
3. **Gestion d'erreurs** : Le backend retourne toujours des suggestions même en cas d'erreur 429 (fallback)
4. **UI/UX** : Affichez clairement les suggestions d'activités et d'utilisateurs
5. **Performance** : Utilisez `LazyColumn` et `LazyRow` pour de grandes listes

## 🔗 9. Dépendances nécessaires

Dans votre `build.gradle.kts` :

```kotlin
dependencies {
    // Retrofit
    implementation("com.squareup.retrofit2:retrofit:2.9.0")
    implementation("com.squareup.retrofit2:converter-gson:2.9.0")
    
    // Coroutines
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3")
    
    // ViewModel
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.6.2")
    
    // Hilt (si vous l'utilisez)
    implementation("com.google.dagger:hilt-android:2.48")
    kapt("com.google.dagger:hilt-compiler:2.48")
}
```

## ✅ Checklist d'intégration

- [ ] Créer les data classes (DTOs)
- [ ] Créer le service API Retrofit
- [ ] Créer le Repository
- [ ] Créer le ViewModel avec StateFlow
- [ ] Créer l'UI avec Jetpack Compose
- [ ] Gérer l'authentification (token JWT)
- [ ] Gérer les erreurs (429, 401, etc.)
- [ ] Implémenter la navigation vers les activités/utilisateurs suggérés
- [ ] Tester avec différents scénarios

## 🚀 Prêt à utiliser !

Votre application Android peut maintenant utiliser l'AI Matchmaker pour aider les utilisateurs à trouver des partenaires et des activités de sport !


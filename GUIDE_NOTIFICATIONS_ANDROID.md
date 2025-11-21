# 📱 Guide Android - Système de Notifications

## 🎯 Vue d'Ensemble

Lorsqu'un badge est débloqué ou de l'XP est ajouté, une notification est automatiquement créée dans la base de données et peut être affichée dans la page de notifications.

---

## 🔌 Endpoints API

### 1. Récupérer les Notifications

**GET** `/achievements/notifications`

**Query Parameters :**
- `page` (optionnel) : Numéro de page (défaut: 1)
- `limit` (optionnel) : Nombre de notifications par page (défaut: 20)
- `unreadOnly` (optionnel) : Si `true`, retourne uniquement les notifications non lues (défaut: false)

**Headers :**
```
Authorization: Bearer YOUR_ACCESS_TOKEN
```

**Réponse (200 OK) :**
```json
{
  "notifications": [
    {
      "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
      "userId": "65a1b2c3d4e5f6g7h8i9j0k0",
      "type": "badge_unlocked",
      "title": "🏆 Nouveau Badge Débloqué !",
      "message": "Félicitations ! Vous avez débloqué le badge \"Premier Hôte\" et gagné 100 XP !",
      "isRead": false,
      "metadata": {
        "badgeId": "65a1b2c3d4e5f6g7h8i9j0k2",
        "badgeName": "Premier Hôte",
        "xpReward": 100
      },
      "createdAt": "2025-01-21T10:30:00.000Z",
      "updatedAt": "2025-01-21T10:30:00.000Z"
    },
    {
      "_id": "65a1b2c3d4e5f6g7h8i9j0k3",
      "userId": "65a1b2c3d4e5f6g7h8i9j0k0",
      "type": "level_up",
      "title": "⬆️ Niveau Supérieur !",
      "message": "Félicitations ! Vous êtes maintenant niveau 5 avec 1250 XP total !",
      "isRead": false,
      "metadata": {
        "oldLevel": 4,
        "newLevel": 5,
        "totalXp": 1250
      },
      "createdAt": "2025-01-21T11:00:00.000Z",
      "updatedAt": "2025-01-21T11:00:00.000Z"
    },
    {
      "_id": "65a1b2c3d4e5f6g7h8i9j0k4",
      "userId": "65a1b2c3d4e5f6g7h8i9j0k0",
      "type": "xp_earned",
      "title": "+150 XP !",
      "message": "Vous avez gagné 150 XP en Activité complétée. Total : 1250 XP",
      "isRead": true,
      "metadata": {
        "xpAmount": 150,
        "source": "complete_activity",
        "totalXp": 1250
      },
      "createdAt": "2025-01-21T09:15:00.000Z",
      "readAt": "2025-01-21T09:20:00.000Z",
      "updatedAt": "2025-01-21T09:20:00.000Z"
    }
  ],
  "total": 25,
  "unreadCount": 3,
  "page": 1,
  "totalPages": 2
}
```

**Types de notifications :**
- `badge_unlocked` : Badge débloqué
- `level_up` : Montée de niveau
- `xp_earned` : XP gagné (pour les gains significatifs >= 50 XP)
- `challenge_completed` : Défi complété
- `streak_updated` : Série mise à jour

---

### 2. Marquer une Notification comme Lue

**POST** `/achievements/notifications/:id/read`

**Headers :**
```
Authorization: Bearer YOUR_ACCESS_TOKEN
```

**Réponse (200 OK) :**
```json
{
  "success": true
}
```

---

### 3. Marquer Toutes les Notifications comme Lues

**POST** `/achievements/notifications/read-all`

**Headers :**
```
Authorization: Bearer YOUR_ACCESS_TOKEN
```

**Réponse (200 OK) :**
```json
{
  "success": true
}
```

---

## 💻 Implémentation Android

### 1. Modèles de Données

```kotlin
// data/models/Notification.kt
data class Notification(
    @SerializedName("_id")
    val id: String,
    @SerializedName("userId")
    val userId: String,
    @SerializedName("type")
    val type: NotificationType,
    @SerializedName("title")
    val title: String,
    @SerializedName("message")
    val message: String,
    @SerializedName("isRead")
    val isRead: Boolean,
    @SerializedName("metadata")
    val metadata: Map<String, Any>? = null,
    @SerializedName("createdAt")
    val createdAt: String,
    @SerializedName("readAt")
    val readAt: String? = null
)

enum class NotificationType {
    @SerializedName("badge_unlocked")
    BADGE_UNLOCKED,
    @SerializedName("level_up")
    LEVEL_UP,
    @SerializedName("xp_earned")
    XP_EARNED,
    @SerializedName("challenge_completed")
    CHALLENGE_COMPLETED,
    @SerializedName("streak_updated")
    STREAK_UPDATED
}

data class NotificationsResponse(
    @SerializedName("notifications")
    val notifications: List<Notification>,
    @SerializedName("total")
    val total: Int,
    @SerializedName("unreadCount")
    val unreadCount: Int,
    @SerializedName("page")
    val page: Int,
    @SerializedName("totalPages")
    val totalPages: Int
)
```

---

### 2. API Interface

```kotlin
// api/AchievementsApi.kt
interface AchievementsApi {
    @GET("achievements/notifications")
    suspend fun getNotifications(
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20,
        @Query("unreadOnly") unreadOnly: Boolean = false
    ): Response<NotificationsResponse>

    @POST("achievements/notifications/{id}/read")
    suspend fun markNotificationAsRead(
        @Path("id") notificationId: String
    ): Response<SuccessResponse>

    @POST("achievements/notifications/read-all")
    suspend fun markAllNotificationsAsRead(): Response<SuccessResponse>
}
```

---

### 3. Repository

```kotlin
// achievements/AchievementsRepository.kt
class AchievementsRepository @Inject constructor(
    private val achievementsApi: AchievementsApi
) {
    suspend fun getNotifications(
        page: Int = 1,
        limit: Int = 20,
        unreadOnly: Boolean = false
    ): Result<NotificationsResponse> {
        return try {
            val response = achievementsApi.getNotifications(page, limit, unreadOnly)
            if (response.isSuccessful) {
                response.body()?.let { Result.success(it) }
                    ?: Result.failure(Exception("Réponse vide"))
            } else {
                Result.failure(Exception("Erreur: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun markNotificationAsRead(notificationId: String): Result<Boolean> {
        return try {
            val response = achievementsApi.markNotificationAsRead(notificationId)
            if (response.isSuccessful) {
                Result.success(true)
            } else {
                Result.failure(Exception("Erreur: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun markAllNotificationsAsRead(): Result<Boolean> {
        return try {
            val response = achievementsApi.markAllNotificationsAsRead()
            if (response.isSuccessful) {
                Result.success(true)
            } else {
                Result.failure(Exception("Erreur: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
```

---

### 4. ViewModel

```kotlin
// achievements/AchievementsViewModel.kt
@HiltViewModel
class AchievementsViewModel @Inject constructor(
    private val repository: AchievementsRepository
) : ViewModel() {
    
    private val _notificationsState = MutableStateFlow<UiState<NotificationsResponse>>(UiState.Idle)
    val notificationsState: StateFlow<UiState<NotificationsResponse>> = _notificationsState.asStateFlow()

    fun fetchNotifications(page: Int = 1, limit: Int = 20, unreadOnly: Boolean = false) {
        viewModelScope.launch {
            _notificationsState.value = UiState.Loading
            repository.getNotifications(page, limit, unreadOnly)
                .onSuccess { response ->
                    _notificationsState.value = UiState.Success(response)
                }
                .onFailure { error ->
                    _notificationsState.value = UiState.Error(error.message ?: "Erreur inconnue")
                }
        }
    }

    fun markNotificationAsRead(notificationId: String) {
        viewModelScope.launch {
            repository.markNotificationAsRead(notificationId)
                .onSuccess {
                    // Rafraîchir les notifications
                    val currentState = _notificationsState.value
                    if (currentState is UiState.Success) {
                        val updatedNotifications = currentState.data.notifications.map { notification ->
                            if (notification.id == notificationId) {
                                notification.copy(isRead = true, readAt = System.currentTimeMillis().toString())
                            } else {
                                notification
                            }
                        }
                        val updatedResponse = currentState.data.copy(
                            notifications = updatedNotifications,
                            unreadCount = (currentState.data.unreadCount - 1).coerceAtLeast(0)
                        )
                        _notificationsState.value = UiState.Success(updatedResponse)
                    }
                }
        }
    }

    fun markAllNotificationsAsRead() {
        viewModelScope.launch {
            repository.markAllNotificationsAsRead()
                .onSuccess {
                    // Rafraîchir les notifications
                    fetchNotifications()
                }
        }
    }
}
```

---

### 5. Écran de Notifications

```kotlin
// ui/screens/NotificationsScreen.kt
@Composable
fun NotificationsScreen(
    viewModel: AchievementsViewModel = hiltViewModel()
) {
    val notificationsState by viewModel.notificationsState.collectAsState()

    LaunchedEffect(Unit) {
        viewModel.fetchNotifications()
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Notifications") },
                actions = {
                    IconButton(
                        onClick = { viewModel.markAllNotificationsAsRead() }
                    ) {
                        Icon(Icons.Default.DoneAll, "Marquer tout comme lu")
                    }
                }
            )
        }
    ) { padding ->
        when (notificationsState) {
            is UiState.Loading -> {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator()
                }
            }
            is UiState.Success -> {
                val response = notificationsState.data
                
                if (response.notifications.isEmpty()) {
                    EmptyNotificationsView()
                } else {
                    LazyColumn(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(padding)
                    ) {
                        items(
                            items = response.notifications,
                            key = { it.id }
                        ) { notification ->
                            NotificationItem(
                                notification = notification,
                                onRead = {
                                    if (!notification.isRead) {
                                        viewModel.markNotificationAsRead(notification.id)
                                    }
                                }
                            )
                            Divider()
                        }
                        
                        // Pagination
                        if (response.page < response.totalPages) {
                            item {
                                Button(
                                    onClick = { 
                                        viewModel.fetchNotifications(
                                            page = response.page + 1,
                                            limit = 20
                                        )
                                    },
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    Text("Charger plus")
                                }
                            }
                        }
                    }
                }
            }
            is UiState.Error -> {
                ErrorView(
                    message = notificationsState.message,
                    onRetry = { viewModel.fetchNotifications() }
                )
            }
            is UiState.Idle -> {}
        }
    }
}

@Composable
fun NotificationItem(
    notification: Notification,
    onRead: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 8.dp)
            .clickable {
                if (!notification.isRead) {
                    onRead()
                }
            },
        colors = CardDefaults.cardColors(
            containerColor = if (notification.isRead) {
                MaterialTheme.colorScheme.surface
            } else {
                MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.3f)
            }
        )
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Icône selon le type
            Icon(
                imageVector = when (notification.type) {
                    NotificationType.BADGE_UNLOCKED -> Icons.Default.EmojiEvents
                    NotificationType.LEVEL_UP -> Icons.Default.TrendingUp
                    NotificationType.XP_EARNED -> Icons.Default.Star
                    NotificationType.CHALLENGE_COMPLETED -> Icons.Default.CheckCircle
                    NotificationType.STREAK_UPDATED -> Icons.Default.LocalFireDepartment
                },
                contentDescription = null,
                modifier = Modifier.size(32.dp),
                tint = when (notification.type) {
                    NotificationType.BADGE_UNLOCKED -> Color(0xFFFF9800)
                    NotificationType.LEVEL_UP -> MaterialTheme.colorScheme.primary
                    NotificationType.XP_EARNED -> Color(0xFF4CAF50)
                    NotificationType.CHALLENGE_COMPLETED -> Color(0xFF2196F3)
                    NotificationType.STREAK_UPDATED -> Color(0xFFFF5722)
                }
            )
            
            Spacer(modifier = Modifier.width(16.dp))
            
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = notification.title,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = if (notification.isRead) FontWeight.Normal else FontWeight.Bold
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = notification.message,
                    style = MaterialTheme.typography.bodyMedium
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = formatDate(notification.createdAt),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.secondary
                )
            }
            
            // Indicateur non lu
            if (!notification.isRead) {
                Icon(
                    imageVector = Icons.Default.Circle,
                    contentDescription = "Non lu",
                    modifier = Modifier.size(8.dp),
                    tint = MaterialTheme.colorScheme.primary
                )
            }
        }
    }
}

@Composable
fun EmptyNotificationsView() {
    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Icon(
                imageVector = Icons.Default.NotificationsOff,
                contentDescription = null,
                modifier = Modifier.size(64.dp),
                tint = MaterialTheme.colorScheme.secondary
            )
            Text(
                text = "Aucune notification",
                style = MaterialTheme.typography.titleLarge,
                color = MaterialTheme.colorScheme.secondary
            )
            Text(
                text = "Vous serez notifié lorsque vous débloquerez des badges ou gagnerez de l'XP !",
                style = MaterialTheme.typography.bodyMedium,
                textAlign = TextAlign.Center,
                color = MaterialTheme.colorScheme.secondary
            )
        }
    }
}

fun formatDate(dateString: String): String {
    // Implémentez votre formatage de date
    // Exemple avec SimpleDateFormat ou DateTimeFormatter
    return dateString
}
```

---

## ✅ Résumé

### Backend ✅
- ✅ Schéma `Notification` créé
- ✅ `NotificationService` créé
- ✅ Notifications créées lors du déblocage de badges
- ✅ Notifications créées lors de montée de niveau
- ✅ Notifications créées pour les gains d'XP significatifs
- ✅ Endpoints API créés

### Android 📱
- ✅ Modèles de données à créer
- ✅ API interface à créer
- ✅ Repository à créer
- ✅ ViewModel à créer
- ✅ Écran de notifications à créer

---

**Date :** 2025-01-20

**Les notifications sont automatiquement créées dans la base de données lors du déblocage de badges et de l'ajout d'XP !** 🎉


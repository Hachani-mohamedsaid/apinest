# Guide Android - Activity Room WebSocket (Optionnel)

## 📋 Vue d'ensemble

Ce guide explique comment intégrer le WebSocket pour les messages en temps réel dans l'Activity Room de votre application Android (Jetpack Compose + Kotlin).

**Note** : Le WebSocket est **optionnel**. L'API REST avec polling fonctionne toujours. Le WebSocket offre une meilleure expérience utilisateur avec des messages instantanés.

## 🔄 Comparaison : REST (Polling) vs WebSocket

| Critère | REST (Polling) | WebSocket |
|---------|---------------|-----------|
| **Simplicité** | ✅ Très simple | ⚠️ Plus complexe |
| **Temps réel** | ⚠️ Délai (3-5s) | ✅ Instantané |
| **Charge serveur** | ⚠️ Requêtes constantes | ✅ Connexion persistante |
| **Batterie** | ⚠️ Consomme plus | ✅ Plus efficace |
| **Déjà implémenté** | ✅ Oui (voir ANDROID_ACTIVITY_API_GUIDE.md) | ⚠️ À implémenter |

## 📦 1. Ajouter la dépendance Socket.IO

Dans `app/build.gradle.kts` :

```kotlin
dependencies {
    // ... autres dépendances
    implementation("io.socket:socket.io-client:2.1.0")
}
```

Synchronisez le projet après l'ajout.

## 🔧 2. Créer le Service WebSocket

Créer `app/src/main/java/com/example/damandroid/api/ActivityRoomWebSocketService.kt` :

```kotlin
package com.example.damandroid.api

import android.util.Log
import com.example.damandroid.data.UserSession
import io.socket.client.IO
import io.socket.client.Socket
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import org.json.JSONObject

data class ActivityMessageDto(
    val _id: String,
    val id: String? = null,
    val activity: String,
    val sender: ActivityMessageSender?,
    val content: String,
    val createdAt: String
)

data class ActivityMessageSender(
    val _id: String,
    val id: String? = null,
    val name: String,
    val profileImageUrl: String?
)

class ActivityRoomWebSocketService {
    private var socket: Socket? = null
    private val _messages = MutableSharedFlow<ActivityMessageDto>(replay = 0, extraBufferCapacity = 64)
    val messages: SharedFlow<ActivityMessageDto> = _messages
    
    private val _connectionState = MutableSharedFlow<Boolean>(replay = 1, extraBufferCapacity = 1)
    val connectionState: SharedFlow<Boolean> = _connectionState

    private val _typingUsers = MutableSharedFlow<Map<String, Boolean>>(replay = 1, extraBufferCapacity = 64)
    val typingUsers: SharedFlow<Map<String, Boolean>> = _typingUsers

    private var currentActivityId: String? = null

    fun connect(activityId: String) {
        if (socket?.connected() == true && currentActivityId == activityId) {
            return
        }

        disconnect() // Déconnecter si on change d'activité

        try {
            val token = UserSession.getToken()
            if (token.isNullOrEmpty()) {
                Log.e("WebSocket", "No token available")
                _connectionState.tryEmit(false)
                return
            }

            val options = IO.Options().apply {
                auth = mapOf("token" to token)
                reconnection = true
                reconnectionAttempts = 5
                reconnectionDelay = 1000
                transports = arrayOf("websocket")
            }

            // URL de production
            val wsUrl = "https://apinest-production.up.railway.app/activity-room"
            socket = IO.socket(wsUrl, options)

            socket?.on(Socket.EVENT_CONNECT) {
                Log.d("WebSocket", "Connected to activity room")
                _connectionState.tryEmit(true)
                currentActivityId = activityId
                joinActivity(activityId)
            }

            socket?.on(Socket.EVENT_DISCONNECT) {
                Log.d("WebSocket", "Disconnected")
                _connectionState.tryEmit(false)
            }

            socket?.on(Socket.EVENT_CONNECT_ERROR) { args ->
                Log.e("WebSocket", "Connection error: ${args.getOrNull(0)}")
                _connectionState.tryEmit(false)
            }

            socket?.on("new-message") { args ->
                try {
                    val messageJson = args[0] as? JSONObject
                    if (messageJson != null) {
                        val message = parseMessage(messageJson)
                        _messages.tryEmit(message)
                    }
                } catch (e: Exception) {
                    Log.e("WebSocket", "Error parsing message: ${e.message}", e)
                }
            }

            socket?.on("user-typing") { args ->
                try {
                    val data = args[0] as? JSONObject
                    val userId = data?.optString("userId")
                    val isTyping = data?.optBoolean("isTyping") ?: false
                    if (userId != null) {
                        val current = _typingUsers.replayCache.firstOrNull()?.toMutableMap() ?: mutableMapOf()
                        if (isTyping) {
                            current[userId] = true
                        } else {
                            current.remove(userId)
                        }
                        _typingUsers.tryEmit(current)
                    }
                } catch (e: Exception) {
                    Log.e("WebSocket", "Error parsing typing event: ${e.message}", e)
                }
            }

            socket?.on("user-joined") { args ->
                Log.d("WebSocket", "User joined: ${args.getOrNull(0)}")
                // Optionnel : mettre à jour la liste des participants
            }

            socket?.on("user-left") { args ->
                Log.d("WebSocket", "User left: ${args.getOrNull(0)}")
                // Optionnel : mettre à jour la liste des participants
            }

            socket?.connect()
        } catch (e: Exception) {
            Log.e("WebSocket", "Failed to connect: ${e.message}", e)
            _connectionState.tryEmit(false)
        }
    }

    fun disconnect() {
        currentActivityId?.let { leaveActivity(it) }
        socket?.disconnect()
        socket = null
        currentActivityId = null
        _connectionState.tryEmit(false)
    }

    private fun joinActivity(activityId: String) {
        socket?.emit("join-activity", JSONObject().apply {
            put("activityId", activityId)
        })
    }

    private fun leaveActivity(activityId: String) {
        socket?.emit("leave-activity", JSONObject().apply {
            put("activityId", activityId)
        })
    }

    fun sendMessage(activityId: String, content: String) {
        if (socket?.connected() == true) {
            socket?.emit("send-message", JSONObject().apply {
                put("activityId", activityId)
                put("content", content)
            })
        } else {
            Log.w("WebSocket", "Cannot send message: not connected")
        }
    }

    fun setTyping(activityId: String, isTyping: Boolean) {
        if (socket?.connected() == true) {
            socket?.emit("typing", JSONObject().apply {
                put("activityId", activityId)
                put("isTyping", isTyping)
            })
        }
    }

    private fun parseMessage(json: JSONObject): ActivityMessageDto {
        val senderJson = json.optJSONObject("sender")
        val sender = if (senderJson != null) {
            ActivityMessageSender(
                _id = senderJson.optString("_id"),
                id = senderJson.optString("id"),
                name = senderJson.optString("name"),
                profileImageUrl = senderJson.optString("profileImageUrl").takeIf { it.isNotEmpty() }
            )
        } else null

        return ActivityMessageDto(
            _id = json.optString("_id"),
            id = json.optString("id"),
            activity = json.optString("activity"),
            sender = sender,
            content = json.optString("content"),
            createdAt = json.optString("createdAt")
        )
    }
}
```

## 🎯 3. Intégrer dans le ViewModel

Dans votre `ActivityRoomViewModel.kt`, ajouter :

```kotlin
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch

class ActivityRoomViewModel(
    private val activityId: String,
    private val activityRepository: ActivityRepository
) : ViewModel() {

    private val webSocketService = ActivityRoomWebSocketService()
    
    private val _uiState = MutableStateFlow(ActivityRoomUiState())
    val uiState: StateFlow<ActivityRoomUiState> = _uiState.asStateFlow()

    init {
        loadInitialData()
        connectWebSocket()
    }

    private fun loadInitialData() {
        viewModelScope.launch {
            try {
                // Charger les messages initiaux via REST API
                val messagesResponse = activityRepository.getMessages(activityId)
                _uiState.update { it.copy(messages = messagesResponse.messages) }
                
                // Charger les participants
                val participantsResponse = activityRepository.getParticipants(activityId)
                _uiState.update { it.copy(participants = participantsResponse.participants) }
            } catch (e: Exception) {
                _uiState.update { it.copy(error = e.message) }
            }
        }
    }

    private fun connectWebSocket() {
        viewModelScope.launch {
            // Écouter l'état de connexion
            webSocketService.connectionState.collect { isConnected ->
                _uiState.update { it.copy(isWebSocketConnected = isConnected) }
            }
        }

        viewModelScope.launch {
            // Écouter les nouveaux messages
            webSocketService.messages.collect { message ->
                val chatMessage = convertToChatMessage(message)
                _uiState.update { state ->
                    // Éviter les doublons
                    val messageExists = state.messages.any { it.id == chatMessage.id }
                    if (!messageExists) {
                        state.copy(messages = state.messages + chatMessage)
                    } else {
                        state
                    }
                }
            }
        }

        viewModelScope.launch {
            // Écouter les indicateurs de frappe
            webSocketService.typingUsers.collect { typingMap ->
                _uiState.update { it.copy(typingUsers = typingMap) }
            }
        }

        // Connecter au WebSocket
        webSocketService.connect(activityId)
    }

    fun sendMessage(content: String) {
        if (content.isBlank()) return
        
        // Envoyer via WebSocket (le message sera reçu via le flux)
        webSocketService.sendMessage(activityId, content)
        
        // Optionnel : ajouter le message localement immédiatement pour un feedback instantané
        // (il sera remplacé par le message réel du serveur)
    }

    fun setTyping(isTyping: Boolean) {
        webSocketService.setTyping(activityId, isTyping)
    }

    private fun convertToChatMessage(dto: ActivityMessageDto): ChatMessage {
        return ChatMessage(
            id = dto._id,
            content = dto.content,
            senderName = dto.sender?.name ?: "Unknown",
            senderImageUrl = dto.sender?.profileImageUrl,
            timestamp = dto.createdAt,
            isOwnMessage = dto.sender?._id == UserSession.getCurrentUserId()
        )
    }

    override fun onCleared() {
        super.onCleared()
        webSocketService.disconnect()
    }
}

data class ActivityRoomUiState(
    val messages: List<ChatMessage> = emptyList(),
    val participants: List<Participant> = emptyList(),
    val isWebSocketConnected: Boolean = false,
    val typingUsers: Map<String, Boolean> = emptyMap(),
    val error: String? = null
)

data class ChatMessage(
    val id: String,
    val content: String,
    val senderName: String,
    val senderImageUrl: String?,
    val timestamp: String,
    val isOwnMessage: Boolean
)

data class Participant(
    val id: String,
    val name: String,
    val profileImageUrl: String?,
    val isHost: Boolean
)
```

## 🎨 4. Mettre à jour l'UI (Composable)

Dans votre `ActivityRoomScreen.kt` :

```kotlin
@Composable
fun ActivityRoomScreen(
    activityId: String,
    viewModel: ActivityRoomViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    var messageText by remember { mutableStateOf("") }
    var isTyping by remember { mutableStateOf(false) }

    LaunchedEffect(messageText) {
        // Détecter quand l'utilisateur tape
        if (messageText.isNotEmpty() && !isTyping) {
            isTyping = true
            viewModel.setTyping(true)
        }
        
        // Arrêter l'indicateur après 2 secondes d'inactivité
        delay(2000)
        if (isTyping) {
            isTyping = false
            viewModel.setTyping(false)
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        // Indicateur de connexion WebSocket
        if (!uiState.isWebSocketConnected) {
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.errorContainer
                )
            ) {
                Text(
                    text = "Connexion en cours...",
                    modifier = Modifier.padding(8.dp),
                    style = MaterialTheme.typography.bodySmall
                )
            }
            Spacer(modifier = Modifier.height(8.dp))
        }

        // Liste des messages
        LazyColumn(
            modifier = Modifier.weight(1f),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            items(uiState.messages) { message ->
                MessageItem(message = message)
            }
            
            // Afficher les utilisateurs qui tapent
            if (uiState.typingUsers.isNotEmpty()) {
                item {
                    Text(
                        text = "${uiState.typingUsers.size} utilisateur(s) en train de taper...",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }

        // Champ de saisie
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            OutlinedTextField(
                value = messageText,
                onValueChange = { messageText = it },
                modifier = Modifier.weight(1f),
                placeholder = { Text("Tapez un message...") },
                singleLine = true
            )
            Spacer(modifier = Modifier.width(8.dp))
            IconButton(
                onClick = {
                    viewModel.sendMessage(messageText)
                    messageText = ""
                },
                enabled = messageText.isNotBlank() && uiState.isWebSocketConnected
            ) {
                Icon(Icons.Default.Send, contentDescription = "Envoyer")
            }
        }
    }
}

@Composable
fun MessageItem(message: ChatMessage) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = if (message.isOwnMessage) Arrangement.End else Arrangement.Start
    ) {
        if (!message.isOwnMessage) {
            AsyncImage(
                model = message.senderImageUrl,
                contentDescription = null,
                modifier = Modifier.size(40.dp).clip(CircleShape),
                contentScale = ContentScale.Crop
            )
            Spacer(modifier = Modifier.width(8.dp))
        }
        
        Column {
            if (!message.isOwnMessage) {
                Text(
                    text = message.senderName,
                    style = MaterialTheme.typography.labelSmall
                )
            }
            Card(
                colors = CardDefaults.cardColors(
                    containerColor = if (message.isOwnMessage) 
                        MaterialTheme.colorScheme.primaryContainer 
                    else 
                        MaterialTheme.colorScheme.surfaceVariant
                )
            ) {
                Text(
                    text = message.content,
                    modifier = Modifier.padding(12.dp),
                    style = MaterialTheme.typography.bodyMedium
                )
            }
            Text(
                text = formatTimestamp(message.timestamp),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}
```

## 🔄 5. Fallback vers REST API

Si le WebSocket échoue, vous pouvez utiliser le polling REST comme fallback :

```kotlin
class ActivityRoomViewModel(...) {
    private var pollingJob: Job? = null

    private fun startPolling() {
        pollingJob?.cancel()
        pollingJob = viewModelScope.launch {
            while (true) {
                try {
                    val messagesResponse = activityRepository.getMessages(activityId)
                    _uiState.update { it.copy(messages = messagesResponse.messages) }
                } catch (e: Exception) {
                    Log.e("ActivityRoom", "Polling error: ${e.message}")
                }
                delay(3000) // Poll toutes les 3 secondes
            }
        }
    }

    private fun stopPolling() {
        pollingJob?.cancel()
        pollingJob = null
    }

    private fun connectWebSocket() {
        viewModelScope.launch {
            webSocketService.connectionState.collect { isConnected ->
                _uiState.update { it.copy(isWebSocketConnected = isConnected) }
                
                if (isConnected) {
                    stopPolling() // Arrêter le polling si WebSocket connecté
                } else {
                    startPolling() // Démarrer le polling si WebSocket déconnecté
                }
            }
        }
        // ... reste du code
    }
}
```

## ✅ Checklist d'implémentation

- [ ] Ajouter la dépendance `io.socket:socket.io-client:2.1.0`
- [ ] Créer `ActivityRoomWebSocketService.kt`
- [ ] Intégrer le service dans le ViewModel
- [ ] Mettre à jour l'UI pour afficher l'état de connexion
- [ ] Implémenter l'envoi de messages via WebSocket
- [ ] Implémenter la réception de messages en temps réel
- [ ] Ajouter l'indicateur de frappe (optionnel)
- [ ] Implémenter le fallback vers REST API (optionnel)

## 🎉 Résultat

Une fois implémenté, vous aurez :
- ✅ Messages en temps réel (instantanés)
- ✅ Indicateur de frappe
- ✅ Meilleure expérience utilisateur
- ✅ Moins de consommation de batterie
- ✅ Fallback automatique vers REST si WebSocket échoue

## 📝 Notes importantes

1. **Authentification** : Le token JWT est envoyé dans `auth.token` lors de la connexion
2. **Reconnexion** : Socket.IO gère automatiquement la reconnexion
3. **URL** : Utilisez `https://apinest-production.up.railway.app/activity-room` en production
4. **Namespace** : Le namespace `/activity-room` est configuré côté serveur

## 🆘 Dépannage

### Le WebSocket ne se connecte pas

- Vérifiez que le token JWT est valide
- Vérifiez l'URL du serveur
- Vérifiez les logs Android : `adb logcat | grep WebSocket`

### Les messages ne sont pas reçus

- Vérifiez que `join-activity` a été appelé
- Vérifiez que l'utilisateur est bien participant de l'activité
- Vérifiez les logs du serveur

### L'indicateur de frappe ne fonctionne pas

- Vérifiez que `setTyping()` est appelé
- Vérifiez que l'événement `user-typing` est bien écouté


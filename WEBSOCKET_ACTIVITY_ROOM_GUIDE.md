# Backend NestJS - WebSocket pour Activity Room (Optionnel)

## Vue d'ensemble

Ce document décrit comment implémenter un système WebSocket pour les messages en temps réel dans les Activity Rooms. WebSocket est plus efficace que le polling car il permet une communication bidirectionnelle en temps réel sans requêtes HTTP répétées.

## Avantages de WebSocket vs Polling

- **Efficacité** : Pas de requêtes HTTP répétées, connexion persistante
- **Temps réel** : Messages instantanés sans délai
- **Moins de charge serveur** : Pas de polling constant
- **Bidirectionnel** : Le serveur peut pousser des notifications

## ✅ Installation

Les dépendances WebSocket sont installées et le Gateway est activé.

### Dépendances installées

- `@nestjs/websockets@^10.0.0` (compatible avec NestJS 10)
- `@nestjs/platform-socket.io@^10.0.0`
- `socket.io@^4.8.1`
- `@types/socket.io` (dev dependency)

Le Gateway WebSocket est maintenant actif et prêt à être utilisé !

## Implémentation NestJS

### 1. Gateway WebSocket

Le Gateway est déjà créé dans `src/modules/activities/activity-room.gateway.ts` avec :

- **Authentification JWT** : Vérifie le token lors de la connexion
- **Gestion des rooms** : Chaque activité a sa propre room Socket.IO
- **Événements** :
  - `join-activity` : Rejoindre une activité
  - `leave-activity` : Quitter une activité
  - `send-message` : Envoyer un message (sauvegarde en DB + broadcast)
  - `typing` : Indicateur de frappe

### 2. Module mis à jour

Le module `ActivitiesModule` a été mis à jour pour inclure :
- `ActivityRoomGateway` dans les providers
- `JwtModule` pour l'authentification WebSocket

### 3. Configuration CORS

Le CORS est déjà configuré dans `main.ts` avec `app.enableCors()`.

## Utilisation

### URL WebSocket

```
ws://localhost:3000/activity-room
```

En production (Railway) :
```
wss://apinest-production.up.railway.app/activity-room
```

### Événements côté client

#### Connexion

```javascript
const socket = io('https://apinest-production.up.railway.app/activity-room', {
  auth: {
    token: 'your-jwt-token'
  }
});
```

#### Rejoindre une activité

```javascript
socket.emit('join-activity', { activityId: 'activity-id' });
```

#### Écouter les nouveaux messages

```javascript
socket.on('new-message', (message) => {
  console.log('New message:', message);
  // {
  //   _id: "...",
  //   activity: "...",
  //   sender: { _id: "...", name: "...", profileImageUrl: "..." },
  //   content: "...",
  //   createdAt: "..."
  // }
});
```

#### Envoyer un message

```javascript
socket.emit('send-message', {
  activityId: 'activity-id',
  content: 'Hello everyone!'
});
```

#### Indicateur de frappe

```javascript
// Démarrer la frappe
socket.emit('typing', { activityId: 'activity-id', isTyping: true });

// Arrêter la frappe
socket.emit('typing', { activityId: 'activity-id', isTyping: false });

// Écouter les autres utilisateurs qui tapent
socket.on('user-typing', (data) => {
  console.log(`User ${data.userId} is typing: ${data.isTyping}`);
});
```

#### Quitter une activité

```javascript
socket.emit('leave-activity', { activityId: 'activity-id' });
```

## Client Android - Implémentation WebSocket

### 1. Ajouter la dépendance Socket.IO

Dans `app/build.gradle.kts` :

```kotlin
dependencies {
    // ... autres dépendances
    implementation("io.socket:socket.io-client:2.1.0")
}
```

### 2. Service WebSocket

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

class ActivityRoomWebSocketService {
    private var socket: Socket? = null
    private val _messages = MutableSharedFlow<ActivityMessageDto>()
    val messages: SharedFlow<ActivityMessageDto> = _messages
    
    private val _connectionState = MutableSharedFlow<Boolean>()
    val connectionState: SharedFlow<Boolean> = _connectionState

    fun connect(activityId: String) {
        if (socket?.connected() == true) {
            return
        }

        try {
            val token = UserSession.getToken()
            val options = IO.Options().apply {
                auth = mapOf("token" to token)
                reconnection = true
                reconnectionAttempts = 5
                reconnectionDelay = 1000
            }

            socket = IO.socket("https://apinest-production.up.railway.app/activity-room", options)

            socket?.on(Socket.EVENT_CONNECT) {
                Log.d("WebSocket", "Connected")
                _connectionState.tryEmit(true)
                joinActivity(activityId)
            }

            socket?.on(Socket.EVENT_DISCONNECT) {
                Log.d("WebSocket", "Disconnected")
                _connectionState.tryEmit(false)
            }

            socket?.on(Socket.EVENT_CONNECT_ERROR) { args ->
                Log.e("WebSocket", "Connection error: ${args[0]}")
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
                // Gérer l'indicateur de frappe
                val data = args[0] as? JSONObject
                // Émettre un événement si nécessaire
            }

            socket?.connect()
        } catch (e: Exception) {
            Log.e("WebSocket", "Failed to connect: ${e.message}", e)
            _connectionState.tryEmit(false)
        }
    }

    fun disconnect() {
        socket?.disconnect()
        socket = null
    }

    fun joinActivity(activityId: String) {
        socket?.emit("join-activity", JSONObject().apply {
            put("activityId", activityId)
        })
    }

    fun leaveActivity(activityId: String) {
        socket?.emit("leave-activity", JSONObject().apply {
            put("activityId", activityId)
        })
    }

    fun sendMessage(activityId: String, content: String) {
        socket?.emit("send-message", JSONObject().apply {
            put("activityId", activityId)
            put("content", content)
        })
    }

    fun setTyping(activityId: String, isTyping: Boolean) {
        socket?.emit("typing", JSONObject().apply {
            put("activityId", activityId)
            put("isTyping", isTyping)
        })
    }

    private fun parseMessage(json: JSONObject): ActivityMessageDto {
        val senderJson = json.optJSONObject("sender")
        val sender = if (senderJson != null) {
            ActivityMessageSender(
                _id = senderJson.optString("_id"),
                id = senderJson.optString("id"),
                name = senderJson.optString("name"),
                profileImageUrl = senderJson.optString("profileImageUrl")
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

### 3. Intégrer dans le ViewModel

Dans `ActivityRoomViewModel.kt`, ajouter :

```kotlin
private val webSocketService = ActivityRoomWebSocketService()

init {
    loadData()
    // Utiliser WebSocket au lieu de polling
    connectWebSocket()
}

private fun connectWebSocket() {
    viewModelScope.launch {
        webSocketService.connect(activityId)
        
        // Écouter les nouveaux messages
        webSocketService.messages.collect { message ->
            val chatMessage = convertToChatMessage(message)
            _uiState.update { state ->
                val messageExists = state.messages.any { it.id == chatMessage.id }
                if (!messageExists) {
                    state.copy(messages = state.messages + chatMessage)
                } else {
                    state
                }
            }
        }
    }
}

override fun onCleared() {
    super.onCleared()
    webSocketService.disconnect()
}

fun sendMessage(content: String) {
    // Envoyer via WebSocket
    webSocketService.sendMessage(activityId, content)
    // Le message sera reçu via le flux WebSocket
}
```

## Comparaison Polling vs WebSocket

| Critère | Polling | WebSocket |
|---------|---------|-----------|
| **Simplicité** | ✅ Très simple | ⚠️ Plus complexe |
| **Temps réel** | ⚠️ Délai (3-5s) | ✅ Instantané |
| **Charge serveur** | ⚠️ Requêtes constantes | ✅ Connexion persistante |
| **Batterie** | ⚠️ Consomme plus | ✅ Plus efficace |
| **Backend requis** | ✅ Aucun changement | ⚠️ Nécessite WebSocket |
| **Maintenance** | ✅ Facile | ⚠️ Plus complexe |

## Recommandation

- **Pour commencer** : Utiliser le polling (déjà implémenté via REST API)
- **Pour la production** : Migrer vers WebSocket pour une meilleure expérience utilisateur

## Installation et démarrage

### 1. Installer les dépendances

```bash
npm install @nestjs/websockets @nestjs/platform-socket.io socket.io
npm install --save-dev @types/socket.io
```

### 2. Redémarrer l'application

```bash
npm run start:dev
```

### 3. Vérifier que WebSocket fonctionne

Le Gateway est automatiquement initialisé. Vous pouvez tester avec un client WebSocket.

## Notes importantes

1. **Authentification** : Le token JWT est vérifié lors de la connexion WebSocket
2. **Rooms** : Chaque activité a sa propre room (`activity:${activityId}`)
3. **Messages** : Les messages sont sauvegardés en DB ET diffusés en temps réel
4. **Reconnexion** : Socket.IO gère automatiquement la reconnexion
5. **CORS** : Configuré pour accepter toutes les origines (à restreindre en production)

## Dépannage

### Problème : Connexion WebSocket échoue

**Solution** : Vérifiez que :
- Les dépendances sont installées
- Le token JWT est valide
- Le CORS est configuré correctement
- Le port WebSocket est accessible

### Problème : Messages non reçus

**Solution** : Vérifiez que :
- Le client a bien rejoint la room (`join-activity`)
- L'utilisateur est bien participant de l'activité
- Le serveur WebSocket est bien démarré

## 🎉 Prêt à utiliser !

Le Gateway WebSocket est implémenté et prêt à être utilisé. Il suffit d'installer les dépendances et de redémarrer l'application !


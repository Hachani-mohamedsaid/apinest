# Guide API Chat pour Android Jetpack Compose

## 🔐 Authentification

**Tous les endpoints nécessitent une authentification JWT.**

Ajoutez le header suivant à toutes les requêtes :
```
Authorization: Bearer <access_token>
```

## 📡 Base URL
```
https://apinest-production.up.railway.app/
```

---

## 📋 Endpoints Chat

### 1. **Récupérer la liste des chats** 
`GET /chats`

**Query Parameters (optionnel):**
- `search` (string): Filtrer les chats par nom de participant ou dernier message

**Réponse (200 OK):**
```json
[
  {
    "id": "chat_id_string",
    "participantNames": "John Doe",  // Pour 1-1: nom de l'autre participant | Pour groupe: groupName
    "participantAvatars": ["https://..."],  // Array d'URLs d'avatars
    "lastMessage": "Hey! Are we still on?",  // Texte du dernier message
    "lastMessageTime": "2h",  // Format: "Just now", "5m", "3h", "Yesterday", "2d", ou "Jan 15"
    "unreadCount": 3,  // Nombre de messages non lus
    "isGroup": false  // true pour groupe, false pour 1-1
  }
]
```

**Exemple Kotlin:**
```kotlin
data class ChatListItem(
    val id: String,
    val participantNames: String,
    val participantAvatars: List<String>,
    val lastMessage: String,
    val lastMessageTime: String,
    val unreadCount: Int,
    val isGroup: Boolean
)
```

---

### 2. **Créer un nouveau chat**
`POST /chats`

**Body:**
```json
{
  "participantIds": ["user_id_1", "user_id_2"],  // IDs des participants (vous serez ajouté automatiquement)
  "groupName": "Basketball Squad",  // Optionnel, requis si > 2 participants
  "groupAvatar": "https://..."  // Optionnel, URL de l'avatar du groupe
}
```

**Réponse (201 Created):**
Retourne l'objet Chat complet (MongoDB document)

**Exemple Kotlin:**
```kotlin
data class CreateChatRequest(
    val participantIds: List<String>,
    val groupName: String? = null,
    val groupAvatar: String? = null
)
```

**Note:** Pour un chat 1-1, si un chat existe déjà entre ces 2 utilisateurs, l'API retourne le chat existant au lieu d'en créer un nouveau.

---

### 3. **Récupérer un chat spécifique**
`GET /chats/:id`

**Réponse (200 OK):**
Retourne l'objet Chat complet avec participants populés

---

### 4. **Récupérer les messages d'un chat**
`GET /chats/:id/messages`

**Réponse (200 OK):**
```json
[
  {
    "id": "message_id",
    "text": "Hey! Are we still on for swimming tomorrow?",
    "sender": "me",  // "me" ou "other"
    "time": "2:30 PM",  // Format horaire formaté
    "senderName": "John Doe",  // null si sender = "me"
    "avatar": "https://...",  // null si sender = "me"
    "createdAt": "2025-01-15T14:30:00.000Z"  // ISO 8601 date
  }
]
```

**Exemple Kotlin:**
```kotlin
data class ChatMessage(
    val id: String,
    val text: String,
    val sender: String,  // "me" ou "other"
    val time: String,
    val senderName: String?,
    val avatar: String?,
    val createdAt: String
)
```

---

### 5. **Envoyer un message**
`POST /chats/:id/messages`

**Body:**
```json
{
  "text": "Hey! Are we still on for swimming tomorrow?"
}
```

**Contraintes:**
- `text`: 1-5000 caractères

**Réponse (201 Created):**
Retourne le message créé avec sender populé

**Exemple Kotlin:**
```kotlin
data class SendMessageRequest(
    val text: String
)
```

---

### 6. **Marquer un chat comme lu**
`PATCH /chats/:id/read`

**Réponse (200 OK):**
Retourne le chat mis à jour (unreadCount remis à 0 pour l'utilisateur)

**Quand appeler:** Quand l'utilisateur ouvre un chat ou revient à la liste des chats

---

### 7. **Supprimer un chat**
`DELETE /chats/:id`

**Réponse (200 OK):**
```json
{
  "message": "Chat deleted successfully"
}
```

---

### 8. **Supprimer un message**
`DELETE /chats/messages/:messageId`

**Réponse (200 OK):**
```json
{
  "message": "Message deleted successfully"
}
```

**Note:** Seul l'expéditeur peut supprimer son message (soft delete)

---

## 👥 Endpoint Recherche Utilisateurs

### **Rechercher des utilisateurs**
`GET /users/search?search=query`

**Query Parameters:**
- `search` (string, requis): Terme de recherche (minimum 2 caractères)

**Réponse (200 OK):**
```json
[
  {
    "id": "user_id",
    "_id": "user_id",  // Alias pour compatibilité
    "name": "John Doe",
    "email": "john@example.com",
    "profileImageUrl": "https://...",
    "avatar": "https://...",  // Alias pour compatibilité
    "profileImageThumbnailUrl": "https..."
  }
]
```

**Exemple Kotlin:**
```kotlin
data class UserSearchResult(
    val id: String,
    val _id: String? = null,  // Alias
    val name: String,
    val email: String? = null,
    val profileImageUrl: String? = null,
    val avatar: String? = null,  // Alias
    val profileImageThumbnailUrl: String? = null
)
```

**Utilisation:** Pour afficher les résultats de recherche dans la barre de recherche et permettre de créer un chat 1-1 en tapant sur un utilisateur.

---

## 🔄 Gestion des Erreurs

### Codes de statut HTTP:

- **200 OK**: Succès
- **201 Created**: Ressource créée
- **400 Bad Request**: Données invalides
- **401 Unauthorized**: Token manquant ou invalide
- **403 Forbidden**: Accès refusé (pas participant, pas le propriétaire du message, etc.)
- **404 Not Found**: Chat ou message introuvable

### Format d'erreur:
```json
{
  "statusCode": 400,
  "message": "Message text is required",
  "error": "Bad Request"
}
```

---

## 💡 Exemples d'utilisation avec Retrofit

### Interface Retrofit:
```kotlin
interface ChatApiService {
    @GET("chats")
    suspend fun getChats(
        @Query("search") search: String? = null,
        @Header("Authorization") token: String
    ): Response<List<ChatListItem>>
    
    @POST("chats")
    suspend fun createChat(
        @Body request: CreateChatRequest,
        @Header("Authorization") token: String
    ): Response<Chat>
    
    @GET("chats/{id}/messages")
    suspend fun getMessages(
        @Path("id") chatId: String,
        @Header("Authorization") token: String
    ): Response<List<ChatMessage>>
    
    @POST("chats/{id}/messages")
    suspend fun sendMessage(
        @Path("id") chatId: String,
        @Body request: SendMessageRequest,
        @Header("Authorization") token: String
    ): Response<ChatMessage>
    
    @PATCH("chats/{id}/read")
    suspend fun markChatAsRead(
        @Path("id") chatId: String,
        @Header("Authorization") token: String
    ): Response<Chat>
    
    @DELETE("chats/{id}")
    suspend fun deleteChat(
        @Path("id") chatId: String,
        @Header("Authorization") token: String
    ): Response<MessageResponse>
    
    @DELETE("chats/messages/{messageId}")
    suspend fun deleteMessage(
        @Path("messageId") messageId: String,
        @Header("Authorization") token: String
    ): Response<MessageResponse>
    
    @GET("users/search")
    suspend fun searchUsers(
        @Query("search") query: String,
        @Header("Authorization") token: String
    ): Response<List<UserSearchResult>>
}

data class MessageResponse(
    val message: String
)
```

---

## 🎯 Points importants pour Jetpack Compose

1. **Format du temps:** Le backend formate déjà le temps (`lastMessageTime`, `time`), mais vous pouvez aussi utiliser `createdAt` pour un formatage personnalisé côté Android.

2. **Gestion des avatars:** 
   - Pour les chats 1-1: utiliser le premier élément de `participantAvatars`
   - Pour les groupes: utiliser `groupAvatar` si disponible
   - Pour les messages: utiliser `avatar` du sender

3. **État "me" vs "other":** 
   - `sender: "me"` = message envoyé par l'utilisateur actuel
   - `sender: "other"` = message reçu d'un autre utilisateur
   - Utiliser cela pour aligner les messages à gauche/droite dans l'UI

4. **Unread Count:** 
   - Mettre à jour quand l'utilisateur ouvre un chat (appeler `PATCH /chats/:id/read`)
   - Afficher un badge avec le nombre si `unreadCount > 0`

5. **Création de chat 1-1:**
   - Quand l'utilisateur tape sur un résultat de recherche, créer un chat avec `participantIds: [userIdTrouvé]`
   - L'API vérifie automatiquement si un chat existe déjà et le retourne

6. **Polling ou WebSocket:**
   - Pour l'instant, pas de WebSocket. Utiliser un polling périodique ou un refresh manuel
   - Suggestion: Rafraîchir la liste des chats toutes les 5-10 secondes quand l'écran est visible

---

## 📝 Checklist d'implémentation

- [ ] Configuration Retrofit avec base URL et intercepteur pour le token
- [ ] Data classes pour tous les DTOs
- [ ] Repository pour gérer les appels API
- [ ] ViewModel avec StateFlow/State pour la liste des chats
- [ ] ViewModel avec StateFlow/State pour les messages d'un chat
- [ ] UI ChatListScreen avec LazyColumn
- [ ] UI ChatScreen avec LazyColumn pour les messages
- [ ] UI SearchBar avec résultats de recherche utilisateurs
- [ ] Gestion des erreurs avec try-catch et affichage de messages d'erreur
- [ ] Loading states pendant les requêtes
- [ ] Pull-to-refresh pour la liste des chats
- [ ] Appel `markChatAsRead` quand l'utilisateur ouvre un chat
- [ ] Formatage des dates/heures si nécessaire
- [ ] Gestion des images d'avatar avec Coil ou Glide

---

## 🔗 Documentation Swagger

Pour tester les endpoints et voir les schémas complets:
```
https://apinest-production.up.railway.app/docs
```


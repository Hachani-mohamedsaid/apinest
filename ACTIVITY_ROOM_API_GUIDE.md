# Guide API Activity Room - Backend NestJS

## 📋 Endpoints pour la page Activity Room

Tous les endpoints nécessitent une authentification JWT (Bearer Token).

### 1. Rejoindre une activité

**POST** `/activities/:id/join`

**Authentification** : Requis (Bearer Token JWT)

**Réponse (200 OK)** :
```json
{
  "message": "Successfully joined activity",
  "activity": {
    "_id": "...",
    "title": "...",
    "sportType": "...",
    "location": "...",
    "participantIds": ["..."],
    "creator": { ... },
    ...
  }
}
```

**Erreurs** :
- `400` : Déjà participant ou activité pleine ou activité complétée
- `404` : Activité non trouvée
- `401` : Non autorisé

### 2. Récupérer les messages de chat

**GET** `/activities/:id/messages`

**Authentification** : Requis (Bearer Token JWT)

**Réponse (200 OK)** :
```json
{
  "messages": [
    {
      "_id": "...",
      "activity": "...",
      "sender": {
        "_id": "...",
        "name": "...",
        "profileImageUrl": "..."
      },
      "content": "...",
      "createdAt": "2025-11-14T10:30:00.000Z"
    }
  ]
}
```

**Erreurs** :
- `404` : Activité non trouvée
- `401` : Non autorisé

### 3. Envoyer un message

**POST** `/activities/:id/messages`

**Authentification** : Requis (Bearer Token JWT)

**Body** :
```json
{
  "content": "Message text"
}
```

**Réponse (201 Created)** :
```json
{
  "_id": "...",
  "activity": "...",
  "sender": {
    "_id": "...",
    "name": "...",
    "profileImageUrl": "..."
  },
  "content": "...",
  "createdAt": "2025-11-14T10:30:00.000Z"
}
```

**Erreurs** :
- `403` : Doit rejoindre l'activité pour envoyer des messages
- `404` : Activité non trouvée
- `401` : Non autorisé

### 4. Récupérer les participants

**GET** `/activities/:id/participants`

**Authentification** : Requis (Bearer Token JWT)

**Réponse (200 OK)** :
```json
{
  "participants": [
    {
      "_id": "...",
      "name": "...",
      "profileImageUrl": "...",
      "isHost": true
    }
  ]
}
```

**Erreurs** :
- `404` : Activité non trouvée
- `401` : Non autorisé

### 5. Quitter une activité

**POST** `/activities/:id/leave`

**Authentification** : Requis (Bearer Token JWT)

**Réponse (200 OK)** :
```json
{
  "message": "Successfully left activity"
}
```

**Erreurs** :
- `400` : L'hôte ne peut pas quitter ou n'est pas participant
- `404` : Activité non trouvée
- `401` : Non autorisé

### 6. Marquer comme complété

**POST** `/activities/:id/complete`

**Authentification** : Requis (Bearer Token JWT) - Seulement le créateur

**Réponse (200 OK)** :
```json
{
  "message": "Activity marked as complete"
}
```

**Erreurs** :
- `403` : Seul l'hôte peut marquer comme complété
- `404` : Activité non trouvée
- `401` : Non autorisé

## 🔧 Implémentation technique

### Schema Activity (modifié)

Le schema `Activity` a été mis à jour avec :
- `participantIds` : Tableau d'IDs d'utilisateurs qui ont rejoint
- `isCompleted` : Boolean pour indiquer si l'activité est complétée

### Schema ActivityMessage (nouveau)

Nouveau schema pour les messages de chat dans les activités :
- `activity` : Référence à l'activité
- `sender` : Référence à l'utilisateur qui a envoyé le message
- `content` : Contenu du message
- `createdAt` : Date de création (automatique)

### Services

- **ActivitiesService** : Méthodes `joinActivity`, `leaveActivity`, `getParticipants`, `completeActivity`
- **ActivityMessagesService** : Méthodes `getMessages`, `sendMessage`

## 📝 Notes importantes

1. **Créateur automatiquement participant** : Quand une activité est créée, le créateur est automatiquement ajouté aux participants.

2. **Limite de participants** : Vérifie que le nombre de participants ne dépasse pas `participants` (maximum).

3. **Hôte ne peut pas quitter** : Le créateur (hôte) ne peut pas quitter l'activité.

4. **Messages** : Seuls les participants (ou le créateur) peuvent envoyer des messages.

5. **Activité complétée** : Une fois complétée, on ne peut plus rejoindre l'activité.

## 🚀 Utilisation

### Exemple : Rejoindre une activité et envoyer un message

```bash
# 1. Rejoindre l'activité
POST /activities/123456/join
Authorization: Bearer <token>

# 2. Récupérer les participants
GET /activities/123456/participants
Authorization: Bearer <token>

# 3. Envoyer un message
POST /activities/123456/messages
Authorization: Bearer <token>
Body: { "content": "Hello everyone!" }

# 4. Récupérer les messages
GET /activities/123456/messages
Authorization: Bearer <token>
```

## ✅ Checklist d'implémentation

- [x] Schema Activity mis à jour avec `participantIds` et `isCompleted`
- [x] Schema ActivityMessage créé
- [x] Service ActivityMessagesService créé
- [x] Méthodes ajoutées au ActivitiesService
- [x] Endpoints ajoutés au controller
- [x] Module mis à jour
- [x] DTO SendMessageDto créé
- [x] Validation et gestion d'erreurs complètes

## 🎉 Prêt à utiliser !

L'API Activity Room est maintenant complètement implémentée et prête à être utilisée dans votre application Android !


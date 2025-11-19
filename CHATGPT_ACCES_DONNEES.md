# 🤖 Guide : ChatGPT avec Accès aux Données

## 📋 Vue d'ensemble

Ce guide explique comment votre application utilise **ChatGPT (OpenAI API)** avec accès aux données de votre base de données MongoDB pour fournir des suggestions personnalisées d'activités et de partenaires sportifs.

---

## 🔄 Architecture du Système

### Flux de données

```
1. Utilisateur envoie un message
   ↓
2. Backend récupère les données MongoDB (utilisateurs, activités)
   ↓
3. Backend construit un contexte avec ces données
   ↓
4. Backend envoie le contexte + message à ChatGPT
   ↓
5. ChatGPT génère une réponse intelligente
   ↓
6. Backend parse la réponse et extrait les suggestions
   ↓
7. Réponse renvoyée à l'utilisateur avec suggestions
```

---

## 📊 Comment les Données sont Récupérées

### 1. Récupération des données depuis MongoDB

Dans `ai-matchmaker.service.ts`, la méthode `chat()` récupère trois types de données :

```typescript
// 1. Récupérer l'utilisateur actuel
const user = await this.userModel.findById(userId).exec();

// 2. Récupérer les activités publiques disponibles
const activities = await this.activityModel
  .find({ visibility: 'public' })
  .limit(20)
  .populate('creator', 'name email profileImageUrl')
  .exec();

// 3. Récupérer les autres utilisateurs
const users = await this.userModel
  .find({ _id: { $ne: userId } })
  .limit(20)
  .select('name email location sportsInterests profileImageUrl about')
  .exec();
```

**Données récupérées :**
- **Utilisateur actuel** : nom, localisation, sports préférés
- **Activités** : titre, type de sport, lieu, date, heure, niveau, participants
- **Autres utilisateurs** : nom, localisation, sports d'intérêt, photo de profil, bio

---

## 🏗️ Construction du Contexte pour ChatGPT

### 2. Méthode `buildContext()`

Cette méthode transforme les données MongoDB en un texte lisible pour ChatGPT :

```typescript
private buildContext(user: any, activities: any[], users: any[]): string {
  let context = `Tu es un assistant AI matchmaker pour une application de sport. `;
  context += `Tu aides les utilisateurs à trouver des partenaires de sport et des activités. `;
  context += `L'utilisateur actuel est: ${user?.name || 'Utilisateur'} (${user?.location || 'Localisation inconnue'}). `;
  
  // Ajouter les sports préférés de l'utilisateur
  if (user?.sportsInterests && user.sportsInterests.length > 0) {
    context += `Ses sports préférés sont: ${user.sportsInterests.join(', ')}. `;
  }

  // Ajouter toutes les activités disponibles
  context += `\n\nVoici les activités disponibles dans l'application:\n`;
  activities.forEach((activity, index) => {
    context += `${index + 1}. ID: ${activity._id} - ${activity.title} (${activity.sportType}) - ${activity.location} - ...\n`;
  });

  // Ajouter tous les utilisateurs disponibles
  context += `\n\nVoici les utilisateurs disponibles:\n`;
  users.forEach((u, index) => {
    context += `${index + 1}. ID: ${u._id} - ${u.name} - ${u.location} - Sports: ${u.sportsInterests?.join(', ')}\n`;
  });

  // Instructions pour ChatGPT
  context += `\n\nIMPORTANT - Instructions pour les réponses:\n`;
  context += `1. Réponds en français de manière amicale et utile.\n`;
  context += `2. Quand tu suggères des activités, mentionne explicitement le titre ET son ID.\n`;
  context += `3. Quand tu suggères des utilisateurs, mentionne explicitement le nom ET son ID.\n`;
  // ... autres instructions

  return context;
}
```

**Exemple de contexte généré :**

```
Tu es un assistant AI matchmaker pour une application de sport. 
Tu aides les utilisateurs à trouver des partenaires de sport et des activités. 
L'utilisateur actuel est: Jean Dupont (Paris). 
Ses sports préférés sont: Course à pied, Tennis, Natation. 

Voici les activités disponibles dans l'application:
1. ID: 507f1f77bcf86cd799439011 - Course matinale (Course à pied) - Parc des Buttes-Chaumont - 15/01/2024 07:00 - Niveau: Intermédiaire - Participants: 3/10
2. ID: 507f1f77bcf86cd799439012 - Match de tennis (Tennis) - Court central - 16/01/2024 18:00 - Niveau: Avancé - Participants: 2/4
...

Voici les utilisateurs disponibles:
1. ID: 507f1f77bcf86cd799439021 - Marie Martin - Paris - Sports: Course à pied, Natation
2. ID: 507f1f77bcf86cd799439022 - Pierre Durand - Lyon - Sports: Tennis, Football
...
```

---

## 💬 Préparation des Messages pour ChatGPT

### 3. Méthode `prepareMessages()`

Cette méthode structure les messages selon le format de l'API OpenAI :

```typescript
private prepareMessages(chatRequest: ChatRequestDto, context: string): any[] {
  const messages: any[] = [
    {
      role: 'system',  // Message système = contexte avec les données
      content: context,
    },
  ];

  // Ajouter l'historique de conversation (si disponible)
  if (chatRequest.conversationHistory && chatRequest.conversationHistory.length > 0) {
    chatRequest.conversationHistory.forEach(msg => {
      messages.push({
        role: msg.role,  // 'user' ou 'assistant'
        content: msg.content,
      });
    });
  }

  // Ajouter le message actuel de l'utilisateur
  messages.push({
    role: 'user',
    content: chatRequest.message,
  });

  return messages;
}
```

**Structure des messages :**
- **Message système** : Contient toutes les données MongoDB formatées
- **Historique** : Messages précédents de la conversation
- **Message utilisateur** : La question actuelle

---

## 🚀 Appel à l'API ChatGPT

### 4. Méthode `callOpenAIWithRetry()`

Cette méthode envoie les messages à l'API OpenAI :

```typescript
private async callOpenAIWithRetry(messages: any[], maxRetries = 2): Promise<string> {
  const response = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    {
      model: this.openaiModel,  // 'gpt-3.5-turbo' par défaut
      messages: messages,       // Messages avec contexte
      temperature: 0.7,          // Créativité (0-1)
      max_tokens: 1000,          // Longueur max de la réponse
    },
    {
      headers: {
        'Authorization': `Bearer ${this.openaiApiKey}`,
        'Content-Type': 'application/json',
      },
    }
  );

  return response.data.choices[0].message.content;
}
```

**Paramètres importants :**
- **model** : Modèle ChatGPT utilisé (`gpt-3.5-turbo`, `gpt-4o`, etc.)
- **messages** : Tableau contenant le contexte + historique + message actuel
- **temperature** : 0.7 = équilibre entre créativité et précision
- **max_tokens** : Limite la longueur de la réponse (coût)

---

## 🔍 Parsing de la Réponse ChatGPT

### 5. Méthode `parseAIResponse()`

Cette méthode extrait les suggestions de la réponse de ChatGPT :

```typescript
private parseAIResponse(
  aiResponse: string,
  activities: any[],
  users: any[],
): ChatResponseDto {
  const suggestedActivities: SuggestedActivityDto[] = [];
  const suggestedUsers: SuggestedUserDto[] = [];

  // Chercher des références aux activités dans la réponse
  activities.forEach(activity => {
    const activityId = activity._id.toString();
    const titleLower = activity.title.toLowerCase();
    
    // Si ChatGPT mentionne l'ID ou le titre dans sa réponse
    if (aiResponse.includes(activityId) || 
        aiResponse.toLowerCase().includes(titleLower)) {
      suggestedActivities.push({
        id: activityId,
        title: activity.title,
        sportType: activity.sportType,
        location: activity.location,
        // ... autres propriétés
      });
    }
  });

  // Même chose pour les utilisateurs
  users.forEach(user => {
    const userId = user._id.toString();
    if (aiResponse.includes(userId) || 
        aiResponse.toLowerCase().includes(user.name.toLowerCase())) {
      suggestedUsers.push({
        id: userId,
        name: user.name,
        // ... autres propriétés
      });
    }
  });

  return {
    message: aiResponse,  // Réponse textuelle de ChatGPT
    suggestedActivities,
    suggestedUsers,
  };
}
```

**Comment ça fonctionne :**
1. ChatGPT génère une réponse textuelle mentionnant des activités/utilisateurs
2. Le code parse la réponse pour trouver les IDs mentionnés
3. Les objets complets sont récupérés depuis les données MongoDB
4. Une réponse structurée est renvoyée au client

---

## ⚙️ Configuration

### Variables d'environnement requises

Créez un fichier `.env` ou configurez sur Railway :

```env
# Clé API OpenAI (OBLIGATOIRE)
OPENAI_API_KEY=sk-proj-votre-cle-api-ici

# Modèle OpenAI (optionnel, défaut: gpt-3.5-turbo)
OPENAI_MODEL=gpt-3.5-turbo

# URI MongoDB (OBLIGATOIRE)
MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/fitness-db
```

### Obtenir une clé API OpenAI

1. **Créer un compte** : https://platform.openai.com/
2. **Aller dans API Keys** : https://platform.openai.com/api-keys
3. **Créer une nouvelle clé** : Cliquez sur "Create new secret key"
4. **Copier la clé** : Format `sk-proj-...` (ne la partagez jamais !)

### Modèles disponibles

- **`gpt-3.5-turbo`** : ✅ Recommandé - Rapide, économique, suffisant
- **`gpt-4o`** : Plus puissant mais plus cher
- **`gpt-4-turbo`** : Version optimisée de GPT-4
- **`gpt-4o-mini`** : Version mini de GPT-4o

---

## 📝 Exemple Complet

### Scénario : Utilisateur demande "Trouve-moi un partenaire de course"

**1. Données récupérées depuis MongoDB :**
```javascript
user = {
  name: "Jean Dupont",
  location: "Paris",
  sportsInterests: ["Course à pied", "Tennis"]
}

users = [
  { _id: "user1", name: "Marie Martin", location: "Paris", sportsInterests: ["Course à pied"] },
  { _id: "user2", name: "Pierre Durand", location: "Lyon", sportsInterests: ["Tennis"] }
]
```

**2. Contexte construit :**
```
Tu es un assistant AI matchmaker...
L'utilisateur actuel est: Jean Dupont (Paris).
Ses sports préférés sont: Course à pied, Tennis.

Voici les utilisateurs disponibles:
1. ID: user1 - Marie Martin - Paris - Sports: Course à pied
2. ID: user2 - Pierre Durand - Lyon - Sports: Tennis
```

**3. Message envoyé à ChatGPT :**
```json
{
  "model": "gpt-3.5-turbo",
  "messages": [
    {
      "role": "system",
      "content": "Tu es un assistant AI matchmaker... [contexte complet]"
    },
    {
      "role": "user",
      "content": "Trouve-moi un partenaire de course"
    }
  ]
}
```

**4. Réponse de ChatGPT :**
```
Je vous recommande Marie Martin (ID: user1) qui habite également à Paris 
et partage votre passion pour la course à pied. Elle serait un excellent 
partenaire d'entraînement !
```

**5. Parsing et réponse finale :**
```json
{
  "message": "Je vous recommande Marie Martin...",
  "suggestedUsers": [
    {
      "id": "user1",
      "name": "Marie Martin",
      "location": "Paris",
      "sport": "Course à pied",
      "matchScore": 90
    }
  ]
}
```

---

## 🔧 Améliorations Possibles

### 1. Optimiser le contexte

Actuellement, toutes les activités/utilisateurs sont envoyés. Vous pourriez :
- Filtrer par localisation proche
- Filtrer par sports d'intérêt
- Limiter à 10-15 résultats les plus pertinents

### 2. Ajouter un cache

Mettre en cache les réponses pour les requêtes similaires :
```typescript
private cache = new Map<string, ChatResponseDto>();

// Utiliser un hash du message + userId comme clé
const cacheKey = `${userId}-${hashMessage(chatRequest.message)}`;
if (this.cache.has(cacheKey)) {
  return this.cache.get(cacheKey);
}
```

### 3. Utiliser des embeddings pour la recherche sémantique

Au lieu d'envoyer toutes les données, utiliser des embeddings pour trouver les plus pertinentes.

### 4. Ajouter des fonctionnalités (Function Calling)

Utiliser les "Function Calling" d'OpenAI pour que ChatGPT puisse appeler directement vos fonctions :
```typescript
{
  "functions": [
    {
      "name": "search_activities",
      "description": "Recherche des activités par critères",
      "parameters": { ... }
    }
  ]
}
```

---

## 🛡️ Gestion des Erreurs

### Système de retry automatique

Le code implémente un retry en cas d'erreur 429 (quota dépassé) :
```typescript
private async callOpenAIWithRetry(messages: any[], maxRetries = 2) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Appel API
    } catch (error) {
      if (error.response?.status === 429 && attempt < maxRetries) {
        // Attendre avant de réessayer (backoff exponentiel)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        continue;
      }
      throw error;
    }
  }
}
```

### Fallback intelligent

Si l'API OpenAI est indisponible, le système génère des suggestions basées sur les données disponibles sans utiliser ChatGPT.

---

## 📚 Ressources

- **Documentation OpenAI API** : https://platform.openai.com/docs
- **Guide des modèles** : https://platform.openai.com/docs/models
- **Prix** : https://openai.com/api/pricing/
- **Limites** : https://platform.openai.com/docs/guides/rate-limits

---

## ✅ Résumé

**Comment ChatGPT accède aux données :**

1. ✅ **Récupération** : Les données sont récupérées depuis MongoDB (User, Activity)
2. ✅ **Formatage** : Les données sont formatées en texte lisible dans un "contexte"
3. ✅ **Envoi** : Le contexte est envoyé à ChatGPT via l'API OpenAI dans un message système
4. ✅ **Réponse** : ChatGPT génère une réponse intelligente basée sur ces données
5. ✅ **Parsing** : La réponse est parsée pour extraire les suggestions (IDs mentionnés)
6. ✅ **Retour** : Les suggestions complètes sont renvoyées au client

**Points clés :**
- ChatGPT ne se connecte **pas directement** à MongoDB
- Les données sont **envoyées dans le contexte** à chaque requête
- Le contexte contient **toutes les informations nécessaires** pour que ChatGPT puisse répondre
- Le système fonctionne même si ChatGPT est indisponible (fallback)






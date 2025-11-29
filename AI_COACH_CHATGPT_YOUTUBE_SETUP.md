# 🤖 Configuration AI Coach - ChatGPT et YouTube

## 📋 Prérequis

1. Clé API OpenAI (pour ChatGPT)
2. Clé API YouTube Data v3 (pour les vidéos)

## 🔧 Configuration

### Variables d'Environnement

Ajoutez dans votre `.env` ou dans les variables d'environnement Railway :

```env
# ✅ REQUIS pour ChatGPT
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# ✅ REQUIS pour YouTube
YOUTUBE_API_KEY=AIzaSyxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

⚠️ **IMPORTANT - SÉCURITÉ :**
- ⚠️ **NE JAMAIS** partager votre clé API publiquement
- ⚠️ **NE JAMAIS** commiter la clé dans Git
- ⚠️ **NE JAMAIS** la mettre dans le code source
- ✅ **TOUJOURS** utiliser les variables d'environnement
- ✅ Si votre clé a été exposée, **RÉGÉNÉREZ-LA** immédiatement dans Google Cloud Console

### Obtenir les Clés API

#### 1. Clé OpenAI (ChatGPT)

1. Allez sur https://platform.openai.com/api-keys
2. Créez un compte ou connectez-vous
3. Cliquez sur "Create new secret key"
4. Copiez la clé (commence par `sk-...`)
5. ⚠️ **Important** : La clé ne sera affichée qu'une seule fois, sauvegardez-la !

#### 2. Clé YouTube Data API v3

1. Allez sur https://console.cloud.google.com/
2. Créez un projet ou sélectionnez un projet existant
3. Activez l'API "YouTube Data API v3"
4. Allez dans "Identifiants" > "Créer des identifiants" > "Clé API"
5. **Configuration de la clé API :**
   
   **Nom :** Donnez un nom descriptif (ex: "YouTube API - Fitness App")
   
   **Restrictions d'application :**
   - ✅ Choisissez **"Aucun"** (pour un backend serveur)
   - OU **"Adresses IP"** si vous connaissez l'IP de votre serveur Railway
   
   **Restrictions d'API :**
   - ✅ **IMPORTANT** : Choisissez **"Restreindre la clé"**
   - Sélectionnez **"YouTube Data API v3"** uniquement
   - ⚠️ **Ne laissez PAS "Ne pas restreindre la clé"** pour la sécurité
   
6. Cliquez sur **"Créer"**
7. Copiez la clé (commence par `AIzaSy...`)
8. ⚠️ **Important** : La clé ne sera affichée qu'une seule fois, sauvegardez-la !

## 📡 Endpoints Disponibles

### 1. POST `/ai-coach/personalized-tips`

Génère des conseils personnalisés avec ChatGPT.

**Headers :**
```
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
```

**Body :**
```json
{
  "workouts": 3,
  "calories": 1200,
  "minutes": 180,
  "streak": 7,
  "sportPreferences": ["Running", "Cycling"],
  "recentActivities": ["Morning Run", "Evening Bike"],
  "stravaData": "Strava: 3 workouts, 1200 calories, 180 minutes, 7 day streak"
}
```

**Réponse (200 OK) :**
```json
{
  "tips": [
    {
      "id": "ai-tip-1234567890-0",
      "title": "Maintenez votre série",
      "description": "Vous avez une série de 7 jours ! Continuez à vous entraîner régulièrement pour maintenir cette habitude.",
      "icon": "🔥",
      "category": "motivation",
      "priority": "high"
    }
  ]
}
```

### 2. GET `/ai-coach/youtube-videos`

Récupère des vidéos YouTube pertinentes.

**Headers :**
```
Authorization: Bearer YOUR_JWT_TOKEN
```

**Query Parameters :**
- `sportPreferences` (optional): Array de sports préférés
- `maxResults` (optional): Nombre maximum de vidéos (1-50, défaut: 10)

**Exemple :**
```
GET /ai-coach/youtube-videos?sportPreferences=Running&sportPreferences=Cycling&maxResults=10
```

**Réponse (200 OK) :**
```json
{
  "videos": [
    {
      "id": "dQw4w9WgXcQ",
      "title": "Running Workout Tutorial",
      "description": "Learn proper running form...",
      "thumbnailUrl": "https://i.ytimg.com/vi/...",
      "channelTitle": "Fitness Channel",
      "publishedAt": "2024-01-01T00:00:00Z",
      "duration": "PT10M30S",
      "viewCount": "123456"
    }
  ]
}
```

## 🧪 Tests

### Test avec cURL

#### 1. Conseils personnalisés

```bash
curl -X POST https://apinest-production.up.railway.app/ai-coach/personalized-tips \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "workouts": 3,
    "calories": 1200,
    "minutes": 180,
    "streak": 7,
    "sportPreferences": ["Running", "Cycling"]
  }'
```

#### 2. Vidéos YouTube

```bash
curl -X GET "https://apinest-production.up.railway.app/ai-coach/youtube-videos?sportPreferences=Running&maxResults=5" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 💰 Coûts

### OpenAI (ChatGPT)

- **Modèle** : `gpt-3.5-turbo`
- **Coût** : ~$0.001-0.003 par génération de conseils
- **Limite** : Selon votre plan OpenAI

### YouTube Data API v3

- **Quota gratuit** : 10,000 unités/jour
- **Recherche** : 100 unités par requête
- **Détails vidéo** : 1 unité par vidéo
- **Total** : ~100 recherches/jour gratuites

## 🔒 Sécurité

- ✅ Les clés API sont stockées côté serveur uniquement
- ✅ Authentification JWT requise pour tous les endpoints
- ✅ Validation des entrées avec class-validator
- ✅ Gestion des erreurs avec fallback vers conseils par défaut

## ⚠️ Notes Importantes

1. **Fallback automatique** : Si OpenAI n'est pas configuré, le système retourne des conseils par défaut
2. **Fallback YouTube** : Si YouTube API n'est pas configuré, retourne un tableau vide
3. **Gestion des erreurs** : Toutes les erreurs sont loggées et ne bloquent pas l'application

## 🚀 Déploiement

1. Ajoutez `OPENAI_API_KEY` dans Railway
2. Ajoutez `YOUTUBE_API_KEY` dans Railway
3. Redéployez l'application
4. Testez les endpoints

## 📚 Ressources

- [OpenAI API Documentation](https://platform.openai.com/docs)
- [YouTube Data API v3](https://developers.google.com/youtube/v3)
- [OpenAI Pricing](https://openai.com/pricing)


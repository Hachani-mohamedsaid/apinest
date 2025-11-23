# 🤖 Configuration AI Coach avec Google Gemini

## ✅ Implémentation Complète

Le module AI Coach a été créé avec succès et intégré dans l'application NestJS.

## 📋 Fichiers Créés

- ✅ `src/modules/ai-coach/dto/suggestions-request.dto.ts`
- ✅ `src/modules/ai-coach/dto/suggestions-response.dto.ts`
- ✅ `src/modules/ai-coach/ai-coach.service.ts`
- ✅ `src/modules/ai-coach/ai-coach.controller.ts`
- ✅ `src/modules/ai-coach/ai-coach.module.ts`
- ✅ Module ajouté à `src/app.module.ts`
- ✅ Dépendance `@google/generative-ai` installée

## 🔑 Configuration de la Clé API Gemini

### 1. Ajouter la clé API dans votre fichier `.env`

Ajoutez la ligne suivante dans votre fichier `.env` :

```env
GEMINI_API_KEY=AIzaSyBQ_5y5hHcp_HYtOTuQoeyrCydz-6wVD_0
```

### 2. Pour Railway (Production)

Si vous déployez sur Railway, ajoutez la variable d'environnement dans le dashboard Railway :

1. Allez dans votre projet Railway
2. Cliquez sur "Variables"
3. Ajoutez :
   - **Name**: `GEMINI_API_KEY`
   - **Value**: `AIzaSyBQ_5y5hHcp_HYtOTuQoeyrCydz-6wVD_0`

### 3. Vérification

Après avoir ajouté la clé, redémarrez l'application. Vous devriez voir dans les logs :

```
✅ Google Gemini AI initialized successfully
```

Si la clé n'est pas configurée, vous verrez :

```
⚠️ GEMINI_API_KEY not configured. AI Coach suggestions will use fallback mode.
```

## 🚀 Endpoint Disponible

### POST `/ai-coach/suggestions`

**Authentification** : Requis (Bearer Token JWT)

**Body:**
```json
{
  "workouts": 5,
  "calories": 2500,
  "minutes": 180,
  "streak": 7,
  "sportPreferences": "running, cycling"
}
```

**Response:**
```json
{
  "suggestions": [
    {
      "id": "activity_id",
      "title": "Morning Run Club",
      "sportType": "Running",
      "location": "City Park",
      "date": "25/11/2024",
      "time": "07:00",
      "participants": 12,
      "maxParticipants": 20,
      "level": "intermediate",
      "matchScore": 92
    }
  ]
}
```

## 🔄 Mode Fallback

Si Gemini n'est pas configuré ou en cas d'erreur, le système utilise automatiquement un mode fallback qui retourne les 3 premières activités disponibles avec des scores de correspondance basés sur des règles simples.

## 📝 Notes Importantes

1. **Gemini API** : Gratuit jusqu'à 60 requêtes par minute (rate limit)
2. **Séparation** : 
   - AI Matchmaker (`/ai-matchmaker/chat`) → Utilise **ChatGPT** (OpenAI)
   - AI Coach (`/ai-coach/suggestions`) → Utilise **Gemini** (Google)
3. **Modèle utilisé** : `gemini-pro` (peut être changé dans le service si nécessaire)

## ✅ Checklist

- [x] Dépendance `@google/generative-ai` installée
- [x] Module AI Coach créé
- [x] Service avec intégration Gemini implémenté
- [x] Controller avec endpoint `/ai-coach/suggestions` créé
- [x] Module ajouté à `app.module.ts`
- [ ] Clé API Gemini ajoutée dans `.env` ou Railway
- [ ] Application redémarrée
- [ ] Test de l'endpoint effectué

## 🧪 Test

Pour tester l'endpoint, utilisez :

```bash
curl -X POST https://apinest-production.up.railway.app/ai-coach/suggestions \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "workouts": 5,
    "calories": 2500,
    "minutes": 180,
    "streak": 7,
    "sportPreferences": "running, cycling"
  }'
```

---

**Le module est prêt à être utilisé !** 🎉


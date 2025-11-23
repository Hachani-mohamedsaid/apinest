# 🔧 Dépannage - Modèles Gemini Non Disponibles

## ❌ Problème

Les logs montrent que ni `gemini-pro` ni `gemini-1.5-flash` ne sont disponibles dans l'API v1beta :

```
Error: [GoogleGenerativeAI Error]: Error fetching from .../models/gemini-1.5-flash:generateContent: 
[404 Not Found] models/gemini-1.5-flash is not found for API version v1beta
```

---

## 🔍 Causes Possibles

1. **Version du SDK** : Le package `@google/generative-ai@0.24.1` utilise peut-être une version d'API qui n'a pas ces modèles
2. **Région/Clé API** : Certains modèles peuvent ne pas être disponibles selon la région ou le type de clé API
3. **Nom du modèle** : Le nom du modèle peut être différent selon la version de l'API

---

## ✅ Solutions

### Solution 1 : Mettre à Jour le Package (Recommandé)

```bash
npm install @google/generative-ai@latest
```

Puis redéployer sur Railway.

### Solution 2 : Utiliser le Modèle Par Défaut

Si aucun modèle spécifique ne fonctionne, le SDK peut avoir un modèle par défaut. Modifier le code pour ne pas spécifier de modèle :

```typescript
// Essayer sans spécifier de modèle (utilise le modèle par défaut)
const model = this.genAI.getGenerativeModel();
```

### Solution 3 : Utiliser l'API REST Directement

Si le SDK ne fonctionne pas, utiliser l'API REST directement avec axios :

```typescript
import axios from 'axios';

const response = await axios.post(
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${this.geminiApiKey}`,
  {
    contents: [{
      parts: [{
        text: prompt
      }]
    }]
  }
);
```

### Solution 4 : Vérifier les Modèles Disponibles

Créer un endpoint de test pour lister les modèles disponibles :

```typescript
async listAvailableModels() {
  try {
    const response = await axios.get(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${this.geminiApiKey}`
    );
    this.logger.log('Available models:', response.data);
    return response.data;
  } catch (error) {
    this.logger.error('Error listing models:', error);
  }
}
```

---

## 🚀 Solution Immédiate : Utiliser le Fallback

**Le code actuel utilise déjà le fallback automatiquement en cas d'erreur.**

Cela signifie que même si Gemini ne fonctionne pas, l'endpoint retournera toujours des suggestions et des conseils (génériques mais pertinents).

**Avantage** : L'application fonctionne même si Gemini a des problèmes.

**Inconvénient** : Les conseils ne sont pas vraiment personnalisés par l'IA.

---

## 📋 Actions Recommandées

1. **Court terme** : Le fallback fonctionne déjà ✅
   - L'endpoint retourne des conseils même si Gemini échoue
   - L'application continue de fonctionner

2. **Moyen terme** : Mettre à jour le package
   ```bash
   npm install @google/generative-ai@latest
   ```

3. **Long terme** : Vérifier la documentation Google Gemini
   - Consulter https://ai.google.dev/docs
   - Vérifier les modèles disponibles pour votre clé API
   - Vérifier si la clé API a les bonnes permissions

---

## 🔍 Diagnostic

Pour diagnostiquer le problème, ajouter ce code temporaire :

```typescript
// Dans getPersonalizedSuggestions, avant l'appel Gemini
try {
  const modelsResponse = await axios.get(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${this.geminiApiKey}`
  );
  this.logger.log('Available models:', JSON.stringify(modelsResponse.data, null, 2));
} catch (error) {
  this.logger.error('Error fetching available models:', error);
}
```

Cela listera tous les modèles disponibles pour votre clé API.

---

## ✅ Statut Actuel

- ✅ **Code** : Utilise `gemini-pro` (modèle standard)
- ✅ **Fallback** : Fonctionne automatiquement en cas d'erreur
- ✅ **Application** : Continue de fonctionner même si Gemini échoue
- ⏳ **À faire** : Mettre à jour le package ou vérifier les modèles disponibles

**L'application fonctionne avec le fallback. Pour activer Gemini, il faut résoudre le problème de modèle disponible.** 🚀


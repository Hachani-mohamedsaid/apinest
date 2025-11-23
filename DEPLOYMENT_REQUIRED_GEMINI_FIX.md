# ⚠️ DÉPLOIEMENT REQUIS - Correction Gemini

## 🔍 Problème Identifié

Les logs Railway montrent que le backend utilise **encore** `gemini-pro` (obsolète) :

```
Error: [GoogleGenerativeAI Error]: Error fetching from 
https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent: 
[404 Not Found] models/gemini-pro is not found
```

## ✅ Code Local Corrigé

**Le code local a été corrigé** et utilise maintenant `gemini-1.5-flash` :

**Fichier** : `src/modules/ai-coach/ai-coach.service.ts`  
**Ligne 69** :
```typescript
const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
```

## 🚀 Action Requise : DÉPLOYER SUR RAILWAY

Le code local est correct, mais **Railway utilise encore l'ancienne version**.

### Étapes de Déploiement

#### Option 1 : Déploiement Automatique (Git)

Si Railway est connecté à votre repo Git :

1. **Commit et Push les changements** :
   ```bash
   git add .
   git commit -m "fix: Update Gemini model to gemini-1.5-flash"
   git push origin main
   ```

2. **Railway déploiera automatiquement** (attendre 2-3 minutes)

3. **Vérifier les logs Railway** après déploiement

#### Option 2 : Déploiement Manuel (Railway CLI)

Si vous utilisez Railway CLI :

```bash
railway up
```

#### Option 3 : Redéploiement depuis Railway Dashboard

1. Allez sur **Railway Dashboard** → Votre projet
2. Cliquez sur le service "apinest"
3. Cliquez sur **"Deploy"** ou **"Redeploy"**
4. Attendez que le déploiement se termine

---

## ✅ Vérification Après Déploiement

### 1. Vérifier les Logs Railway

**Avant (erreur actuelle)** :
```
ERROR [AICoachService] Error: models/gemini-pro is not found
```

**Après (attendu)** :
```
✅ Google Gemini AI initialized successfully
🤖 Calling Gemini API for personalized suggestions and tips...
✅ Gemini API response received (X characters)
✅ Gemini generated X personalized tips
```

### 2. Tester l'Endpoint

```bash
curl -X POST https://apinest-production.up.railway.app/ai-coach/suggestions \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "workouts": 1,
    "calories": 0,
    "minutes": 0,
    "streak": 1
  }'
```

**Attendu** :
- ✅ Code 201 (succès)
- ✅ Pas d'erreur 404
- ✅ Conseils avec IDs `gemini-tip-...` (pas `default-tip-...`)

### 3. Vérifier les IDs dans la Réponse

**Avant (fallback)** :
```json
{
  "personalizedTips": [
    {"id": "default-tip-1", ...}
  ]
}
```

**Après (Gemini)** :
```json
{
  "personalizedTips": [
    {"id": "gemini-tip-1732392000000-1", ...}
  ]
}
```

---

## 📋 Checklist de Déploiement

- [x] Code local corrigé (`gemini-1.5-flash`)
- [x] Compilation réussie localement
- [ ] **Changements commités dans Git** ⏳
- [ ] **Push vers le repository** ⏳
- [ ] **Railway a déployé la nouvelle version** ⏳
- [ ] **Vérifier les logs Railway** ⏳
- [ ] **Tester l'endpoint** ⏳
- [ ] **Vérifier que les IDs commencent par `gemini-tip-`** ⏳

---

## 🔍 Pourquoi l'Erreur Persiste

L'erreur persiste parce que :

1. ✅ **Code local** : Corrigé et utilise `gemini-1.5-flash`
2. ❌ **Code sur Railway** : Utilise encore l'ancienne version avec `gemini-pro`

**Solution** : Déployer le code corrigé sur Railway.

---

## 📝 Résumé

- ✅ **Code local** : Corrigé et prêt
- ⏳ **Railway** : Nécessite un déploiement
- 🚀 **Action** : Déployer les changements sur Railway

**Une fois déployé, l'erreur 404 disparaîtra et Gemini fonctionnera correctement !** 🎉

---

## 🆘 Si l'Erreur Persiste Après Déploiement

1. **Vérifier que Railway a bien déployé** :
   - Regarder les logs de déploiement
   - Vérifier la date/heure du dernier déploiement

2. **Vérifier la variable d'environnement** :
   - `GEMINI_API_KEY` doit être configurée sur Railway

3. **Vérifier les logs après un appel** :
   - Chercher `🤖 Calling Gemini API...`
   - Vérifier qu'il n'y a plus d'erreur 404

4. **Redémarrer le service Railway** :
   - Parfois un redémarrage force le rechargement du code

---

**Le code est prêt, il ne reste plus qu'à déployer !** 🚀


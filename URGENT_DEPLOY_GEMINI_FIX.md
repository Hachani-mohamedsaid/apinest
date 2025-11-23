# 🚨 URGENT : Déploiement Requis - Correction Gemini

## ⚠️ Situation Actuelle

**Les logs Railway montrent encore l'erreur** :
```
Error: models/gemini-pro is not found for API version v1beta
```

**Cela signifie que Railway utilise encore l'ancienne version du code !**

---

## ✅ Code Local : CORRIGÉ

**Vérification** : Le code local utilise bien `gemini-1.5-flash` :

```typescript
// src/modules/ai-coach/ai-coach.service.ts (ligne 69)
const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
```

✅ **Code local** : Corrigé  
❌ **Code Railway** : Ancienne version (utilise encore `gemini-pro`)

---

## 🚀 DÉPLOIEMENT IMMÉDIAT REQUIS

### Étape 1 : Vérifier les Fichiers Modifiés

```bash
git status
```

Vous devriez voir :
- `src/modules/ai-coach/ai-coach.service.ts` (modifié)

### Étape 2 : Commit les Changements

```bash
git add src/modules/ai-coach/
git commit -m "fix: Update Gemini model from gemini-pro to gemini-1.5-flash"
```

### Étape 3 : Push vers le Repository

```bash
git push origin main
```

**OU** si votre branche s'appelle différemment :
```bash
git push origin master
```

### Étape 4 : Attendre le Déploiement Railway

- Railway détectera automatiquement le push
- Le déploiement prendra 2-3 minutes
- Surveillez les logs Railway

---

## ✅ Vérification Après Déploiement

### 1. Vérifier les Logs Railway

**Cherchez dans les logs** :
- ✅ `✅ Google Gemini AI initialized successfully`
- ✅ `🤖 Calling Gemini API for personalized suggestions and tips...`
- ❌ **NE DEVRAIT PLUS VOIR** : `Error: models/gemini-pro is not found`

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
- ✅ Réponse avec conseils

### 3. Vérifier les IDs

**Les IDs doivent commencer par** :
- ✅ `gemini-tip-...` (Gemini fonctionne)
- ❌ `default-tip-...` (Fallback - problème)

---

## 🔍 Pourquoi l'Erreur Persiste

| Composant | Statut | Version |
|-----------|--------|---------|
| **Code Local** | ✅ Corrigé | `gemini-1.5-flash` |
| **Code Railway** | ❌ Ancien | `gemini-pro` (obsolète) |

**Solution** : Déployer le code corrigé sur Railway.

---

## 📋 Checklist Rapide

- [x] Code local corrigé
- [x] Compilation réussie
- [ ] **Commit les changements** ⏳
- [ ] **Push vers Git** ⏳
- [ ] **Attendre déploiement Railway** ⏳
- [ ] **Vérifier les logs** ⏳
- [ ] **Tester l'endpoint** ⏳

---

## 🆘 Si Railway ne Déploie pas Automatiquement

### Option 1 : Redéploiement Manuel

1. Allez sur **Railway Dashboard**
2. Sélectionnez votre projet
3. Cliquez sur le service "apinest"
4. Cliquez sur **"Deploy"** ou **"Redeploy"**

### Option 2 : Vérifier la Configuration Git

1. Vérifiez que Railway est connecté à votre repo Git
2. Vérifiez que la branche est correcte (main/master)
3. Vérifiez les logs de déploiement dans Railway

---

## 📝 Résumé

**Le problème** : Railway utilise encore l'ancien code avec `gemini-pro`  
**La solution** : Déployer le code corrigé qui utilise `gemini-1.5-flash`  
**Action** : Commit + Push → Railway déploiera automatiquement

**Une fois déployé, l'erreur 404 disparaîtra !** 🚀

---

## ⏱️ Temps Estimé

- Commit + Push : 1 minute
- Déploiement Railway : 2-3 minutes
- **Total** : ~5 minutes

**Le code est prêt, il ne reste plus qu'à déployer !** ✅


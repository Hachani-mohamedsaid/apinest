# Gestion du Quota OpenAI API

## 🔴 Erreur 429 - Quota dépassé

Si vous recevez une erreur 429, cela signifie que votre quota OpenAI API a été dépassé.

## ✅ Solutions immédiates

### 1. Vérifier et gérer le budget

1. **Allez sur la page Limits** :
   - https://platform.openai.com/org/limits
   - Connectez-vous avec votre compte OpenAI

2. **Vérifiez votre budget d'organisation** :
   - Regardez la section **"Organization budget"**
   - Vous verrez : `$X.XX / $Y.YY` (montant utilisé / budget total)
   - La date de réinitialisation est affichée (ex: "Resets in 16 days")

3. **Configurez des alertes** :
   - Activez les alertes à 80% et 100% d'utilisation
   - Cliquez sur "Add alert" pour créer des alertes personnalisées
   - Vous recevrez des notifications par email quand vous approchez de vos limites

4. **Modifiez le budget si nécessaire** :
   - Cliquez sur "Edit budget" pour augmenter votre budget
   - Ajoutez un moyen de paiement si nécessaire
   - Les crédits sont généralement ajoutés immédiatement

### 2. Vérifier les limites d'utilisation (RPM, RPD, TPM)

#### Méthode 1 : Via le Dashboard OpenAI (Recommandé)

1. **Allez sur le dashboard OpenAI** :
   - https://platform.openai.com/
   - Connectez-vous avec votre compte

2. **Accédez à la page Limits** :
   - Dans la barre latérale gauche, cliquez sur **"Billing"**
   - Puis sélectionnez **"Limits"** (surligné dans le menu)
   - Ou accédez directement via : https://platform.openai.com/org/limits

3. **Sur la page Limits, vous verrez** :
   - **Organization budget** : Votre budget actuel et la date de réinitialisation
   - **Usage alerts** : Alertes configurées (80%, 100%)
   - **Rate limits table** : Tableau détaillé avec toutes les limites par modèle

4. **Dans le tableau des limites, vous trouverez** :
   - **TPM (Tokens Per Minute)** : Limite de tokens par minute pour chaque modèle
   - **RPM (Requests Per Minute)** : Limite de requêtes par minute
   - **TPD (Tokens Per Day)** : Limite de tokens par jour (pour Batch Queue)
   - **Note** : Les limites peuvent varier selon la version spécifique du modèle (cliquez pour développer le tableau)

#### Méthode 2 : Via l'API (programmatique)

Vous pouvez vérifier les limites en regardant les headers de réponse de l'API :

```typescript
// Exemple de vérification des limites
const response = await axios.post(openaiApiUrl, data, { headers });
const limits = {
  rpm: response.headers['x-ratelimit-limit-requests'],
  tpm: response.headers['x-ratelimit-limit-tokens'],
  remaining: response.headers['x-ratelimit-remaining-requests'],
  reset: response.headers['x-ratelimit-reset-requests']
};
```

#### Limites par défaut selon le modèle

**Note importante** : Les limites varient selon votre "Usage tier" (niveau d'utilisation). Vérifiez toujours votre page Limits pour voir vos limites exactes.

**Exemples de limites (Usage tier 1)** :

**Pour `gpt-4.1`** :
- **TPM** : 30,000 tokens par minute
- **RPM** : 500 requêtes par minute
- **TPD** : 900,000 tokens par jour (Batch Queue)

**Pour `gpt-5.1`** :
- **TPM** : 30,000 tokens par minute
- **RPM** : 500 requêtes par minute
- **TPD** : 900,000 tokens par jour (Batch Queue)

**Pour `gpt-5-mini`** :
- **TPM** : 500,000 tokens par minute
- **RPM** : 500 requêtes par minute
- **TPD** : 5,000,000 tokens par jour (Batch Queue)

**Pour `gpt-5-nano`** :
- **TPM** : 200,000 tokens par minute
- **RPM** : 500 requêtes par minute
- **TPD** : 2,000,000 tokens par jour (Batch Queue)

**Pour `gpt-3.5-turbo`** (modèles plus anciens) :
- **RPM** : Généralement 3,500 requêtes par minute
- **TPM** : Généralement 90,000 tokens par minute
- **RPD** : Variable selon votre plan

**Pour `gpt-4o`** :
- **RPM** : Généralement 5,000 requêtes par minute
- **TPM** : Généralement 20,000 tokens par minute
- **RPD** : Variable selon votre plan

#### Comment interpréter les limites

- **TPM (Tokens Per Minute)** : Limite de tokens que vous pouvez utiliser par minute. Si dépassé → erreur 429
- **RPM (Requests Per Minute)** : Limite de requêtes API que vous pouvez faire par minute. Si dépassé → erreur 429
- **TPD (Tokens Per Day)** : Limite de tokens par jour pour les Batch Queues. Si dépassé → erreur 429

**Important** :
- Les limites sont appliquées par minute (TPM, RPM) ou par jour (TPD)
- Si vous dépassez une limite, vous recevrez une erreur 429 (Too Many Requests)
- Les limites peuvent varier selon la version spécifique du modèle (vérifiez le tableau détaillé)
- Votre "Usage tier" détermine vos limites exactes

#### Vérifier votre utilisation actuelle

1. Allez sur https://platform.openai.com/usage
2. Consultez les graphiques pour voir :
   - Votre utilisation par jour
   - Le nombre de requêtes
   - Le nombre de tokens utilisés
   - Les coûts associés

## 🔧 Solutions techniques implémentées

### 1. Système de retry automatique

Le service AI Matchmaker implémente maintenant :
- **Retry automatique** : Jusqu'à 2 tentatives supplémentaires en cas d'erreur 429
- **Backoff exponentiel** : Délais d'attente de 1s, 2s, 4s entre les tentatives
- **Logs détaillés** : Pour suivre les tentatives et les erreurs

### 2. Fallback intelligent

Si l'API OpenAI est indisponible, le service :
- Génère automatiquement des suggestions basées sur les données disponibles
- Détecte l'intention de l'utilisateur (activités vs partenaires)
- Fournit toujours une réponse utile même sans IA

## 📊 Monitoring de l'utilisation

### Vérifier l'utilisation actuelle

1. Allez sur https://platform.openai.com/usage
2. Consultez :
   - **Usage par jour** : Nombre de requêtes et tokens utilisés
   - **Coûts** : Montant dépensé
   - **Graphiques** : Tendances d'utilisation

### Optimiser les coûts

1. **Utiliser `gpt-3.5-turbo`** (déjà configuré) :
   - Beaucoup moins cher que `gpt-4`
   - Suffisant pour la plupart des cas d'usage
   - Plus rapide

2. **Réduire `max_tokens`** :
   - Actuellement : 1000 tokens
   - Vous pouvez réduire à 500-750 pour économiser

3. **Implémenter un cache** :
   - Mettre en cache les réponses pour les requêtes similaires
   - Réduit les appels API répétés

## 🚀 Améliorations futures possibles

### 1. Système de cache

```typescript
// Exemple d'implémentation de cache
private cache = new Map<string, ChatResponseDto>();

// Utiliser un hash du message pour le cache
const cacheKey = hashMessage(chatRequest.message);
if (this.cache.has(cacheKey)) {
  return this.cache.get(cacheKey);
}
```

### 2. Rate limiting côté backend

- Limiter le nombre de requêtes par utilisateur
- Implémenter un système de queue pour les requêtes

### 3. Alternative gratuite

- **Google Gemini API** : Gratuit jusqu'à un certain quota
- **Hugging Face Inference API** : Modèles open-source gratuits
- **Anthropic Claude API** : Alternative à OpenAI

## 📝 Configuration actuelle

### Variables d'environnement

```env
# Modèle OpenAI (par défaut: gpt-3.5-turbo)
OPENAI_MODEL=gpt-3.5-turbo

# Clé API OpenAI
OPENAI_API_KEY=sk-proj-...
```

### Modèles disponibles

- `gpt-3.5-turbo` : **Recommandé** - Rapide, économique, accessible
- `gpt-4o` : Plus puissant mais plus cher
- `gpt-4-turbo` : Version optimisée de GPT-4
- `gpt-4o-mini` : Version mini de GPT-4o

## ⚠️ Important

1. **Ne jamais commiter la clé API** : Elle est dans les variables d'environnement
2. **Surveiller les coûts** : Vérifiez régulièrement votre utilisation
3. **Utiliser le fallback** : Le service fonctionne même si l'API est indisponible
4. **Optimiser les prompts** : Des prompts plus courts = moins de tokens = moins cher

## 🔗 Liens utiles

- **Facturation** : https://platform.openai.com/account/billing
- **Utilisation** : https://platform.openai.com/usage
- **Documentation API** : https://platform.openai.com/docs
- **Prix** : https://openai.com/api/pricing/
- **Limites** : https://platform.openai.com/docs/guides/rate-limits


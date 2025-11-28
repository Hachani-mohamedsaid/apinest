# 🔐 Configuration Stripe Payment

## 📋 Prérequis

1. Compte Stripe (https://stripe.com)
2. Clés API Stripe (publishable key et secret key)
3. Package `stripe` installé (déjà fait)

## 🔧 Configuration

### 1. Variables d'Environnement

**✅ OBLIGATOIRE :** Ajoutez au minimum cette variable dans votre `.env` ou Railway :

```env
# ✅ OBLIGATOIRE : Clé secrète Stripe (REQUIS pour que le backend fonctionne)
STRIPE_SECRET_KEY=sk_test_... # Clé secrète Stripe (test ou production)
```

**⚠️ OPTIONNEL :** Cette variable n'est PAS nécessaire pour le backend, mais vous pouvez l'ajouter si vous voulez :

```env
# ⚠️ OPTIONNEL : Clé publique Stripe (PAS nécessaire pour le backend)
# Le backend fonctionne SANS cette clé
# Ajoutez-la UNIQUEMENT si vous voulez la partager avec le frontend via une API
STRIPE_PUBLISHABLE_KEY=pk_test_... # Clé publique Stripe (pour le frontend uniquement)
```

**📝 Résumé :**
- **STRIPE_SECRET_KEY** : ✅ **OBLIGATOIRE** - Le backend ne fonctionnera PAS sans cette clé
- **STRIPE_PUBLISHABLE_KEY** : ⚠️ **OPTIONNEL** - Le backend fonctionne parfaitement SANS cette clé

**⚠️ Important :**
- **STRIPE_SECRET_KEY** : ✅ **OBLIGATOIRE** pour le backend. Utilisée pour créer des Payment Intents et confirmer les paiements. Cette clé ne doit JAMAIS être exposée côté client. **Le backend ne fonctionnera PAS sans cette clé.**
- **STRIPE_PUBLISHABLE_KEY** : ⚠️ **OPTIONNEL** pour le backend. Cette clé est utilisée uniquement par le frontend (iOS/Android) pour initialiser le SDK Stripe côté client. **Le backend fonctionne parfaitement SANS cette clé.**
- Utilisez les clés de **test** (`sk_test_...` et `pk_test_...`) pour le développement
- Utilisez les clés de **production** (`sk_live_...` et `pk_live_...`) en production

**💡 Pourquoi STRIPE_PUBLISHABLE_KEY est optionnel pour le backend ?**
- Le backend utilise **UNIQUEMENT** `STRIPE_SECRET_KEY` pour créer des Payment Intents et gérer les paiements
- La clé publique (`STRIPE_PUBLISHABLE_KEY`) est utilisée **UNIQUEMENT** par le frontend (iOS/Android) pour initialiser le SDK Stripe et afficher le formulaire de paiement
- **Le backend n'a PAS besoin de cette clé** - il fonctionne parfaitement sans elle
- Si vous voulez que le frontend récupère la clé publique depuis votre API, vous pouvez l'ajouter dans les variables d'environnement et créer un endpoint pour la retourner
- Sinon, vous pouvez simplement hardcoder la clé publique dans votre application mobile (elle est publique, donc pas de problème de sécurité)

**🎯 Configuration minimale requise :**
```env
# ✅ UNIQUEMENT cette ligne est OBLIGATOIRE
STRIPE_SECRET_KEY=sk_test_...
```

C'est tout ! Le backend fonctionnera avec uniquement cette variable.

### 2. Obtenir les Clés Stripe

1. Connectez-vous à votre compte Stripe : https://dashboard.stripe.com
2. Allez dans **Developers** > **API keys**
3. Copiez la **Secret key** (commence par `sk_test_` ou `sk_live_`) → **REQUIS pour le backend**
4. Copiez la **Publishable key** (commence par `pk_test_` ou `pk_live_`) → **Optionnel pour le backend, requis pour le frontend**

**Différence entre les deux clés :**
- **Secret Key** (`sk_...`) : Clé privée, utilisée uniquement côté serveur. Permet de créer des Payment Intents, confirmer des paiements, etc. ⚠️ **NE JAMAIS EXPOSER** côté client.
- **Publishable Key** (`pk_...`) : Clé publique, peut être utilisée côté client. Utilisée par le frontend pour initialiser le SDK Stripe. ✅ **Sécurisée à exposer** publiquement.

### 3. Configuration Railway

1. Allez dans votre projet Railway
2. Cliquez sur **Variables**
3. Ajoutez **UNIQUEMENT** :
   - `STRIPE_SECRET_KEY` = votre clé secrète (**OBLIGATOIRE**)

**⚠️ Note importante :**
- Le backend fonctionne **UNIQUEMENT** avec `STRIPE_SECRET_KEY`
- Vous n'avez **PAS besoin** d'ajouter `STRIPE_PUBLISHABLE_KEY` dans Railway pour que le backend fonctionne
- La clé publique est uniquement nécessaire pour le frontend (iOS/Android) qui l'utilise pour initialiser le SDK Stripe côté client
- Vous pouvez hardcoder la clé publique directement dans votre application mobile (elle est publique, donc pas de problème de sécurité)

## 📡 Endpoints API

### 1. Créer un Payment Intent

**POST** `/payments/create-intent`

**Headers :**
```
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
```

**Body :**
```json
{
  "activityId": "507f1f77bcf86cd799439011",
  "amount": 25.00,
  "currency": "eur"
}
```

**Réponse (201 Created) :**
```json
{
  "clientSecret": "pi_xxx_secret_xxx",
  "paymentIntentId": "pi_xxx"
}
```

**Erreurs possibles :**
- `400 Bad Request` : Activité gratuite, montant incorrect, déjà payé, activité pleine
- `404 Not Found` : Activité non trouvée
- `401 Unauthorized` : Token invalide

### 2. Confirmer un Paiement

**POST** `/payments/confirm`

**Headers :**
```
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
```

**Body :**
```json
{
  "paymentIntentId": "pi_xxx",
  "activityId": "507f1f77bcf86cd799439011"
}
```

**Réponse (200 OK) :**
```json
{
  "success": true,
  "message": "Payment confirmed and user added as participant",
  "activityId": "507f1f77bcf86cd799439011"
}
```

**Erreurs possibles :**
- `400 Bad Request` : Paiement non confirmé, activité pleine
- `404 Not Found` : Activité non trouvée
- `401 Unauthorized` : Token invalide

### 3. Vérifier le Statut de Paiement

**GET** `/payments/check-payment/:activityId`

**Headers :**
```
Authorization: Bearer YOUR_JWT_TOKEN
```

**Réponse (200 OK) :**
```json
{
  "hasPaid": true,
  "isParticipant": true,
  "activityPrice": 25.00
}
```

## 🧪 Tests

### Test avec cURL

#### 1. Créer un Payment Intent

```bash
curl -X POST https://apinest-production.up.railway.app/payments/create-intent \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "activityId": "activity_id",
    "amount": 25.00,
    "currency": "eur"
  }'
```

#### 2. Confirmer un Paiement

```bash
curl -X POST https://apinest-production.up.railway.app/payments/confirm \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "paymentIntentId": "pi_xxx",
    "activityId": "activity_id"
  }'
```

#### 3. Vérifier le Statut

```bash
curl -X GET https://apinest-production.up.railway.app/payments/check-payment/activity_id \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 🎯 Flux de Paiement

1. **Frontend** : L'utilisateur clique sur "Rejoindre" pour une activité payante
2. **Backend** : Créer un Payment Intent via `POST /payments/create-intent`
3. **Frontend** : Utiliser le `clientSecret` avec Stripe SDK pour afficher le formulaire de paiement
4. **Stripe** : L'utilisateur saisit ses informations de carte
5. **Stripe** : Confirme le paiement et retourne le statut
6. **Backend** : Confirmer le paiement via `POST /payments/confirm`
7. **Backend** : Ajouter l'utilisateur comme participant de l'activité

## 🔒 Sécurité

1. **Toujours vérifier l'authentification** : Tous les endpoints utilisent `@UseGuards(JwtAuthGuard)`
2. **Valider les montants** : Le montant doit correspondre au prix de l'activité
3. **Vérifier les doublons** : Empêcher les paiements multiples pour la même activité
4. **Vérifier la capacité** : S'assurer qu'il reste de la place dans l'activité

## 📝 Notes Importantes

1. **Webhooks Stripe (Recommandé)** : Pour une meilleure sécurité, implémentez des webhooks Stripe pour gérer les événements de paiement de manière asynchrone
2. **Transactions** : Les opérations de paiement et d'ajout de participant devraient être dans une transaction MongoDB pour garantir la cohérence
3. **Logs** : Tous les paiements sont loggés pour le débogage et l'audit

## 🚀 Déploiement

1. Utilisez les clés de **production** Stripe en production
2. Configurez les webhooks Stripe pour pointer vers votre endpoint (si implémenté)
3. Testez avec les cartes de test Stripe avant le déploiement :
   - Carte de test réussie : `4242 4242 4242 4242`
   - Carte de test échouée : `4000 0000 0000 0002`
   - Date d'expiration : n'importe quelle date future
   - CVC : n'importe quel code à 3 chiffres

## 📚 Ressources

- [Documentation Stripe](https://stripe.com/docs)
- [Stripe API Reference](https://stripe.com/docs/api)
- [Stripe Testing](https://stripe.com/docs/testing)


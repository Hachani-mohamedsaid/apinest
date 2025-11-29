# 🧪 Guide de Test Stripe

## 📋 Vue d'Ensemble

Ce guide explique comment tester l'intégration Stripe avec un compte de test. Tous les paiements effectués en mode test sont simulés et ne facturent pas de vrais fonds.

---

## 🔑 1. Configuration du Compte de Test

### Activer le Mode Test

1. Connectez-vous à Stripe Dashboard : https://dashboard.stripe.com
2. Basculez en mode **Test** (bouton en haut à droite)
3. Le mode test est indiqué par un badge "TEST MODE" en haut de la page

### Obtenir les Clés de Test

1. Allez dans **Developers** > **API keys**
2. Vous verrez deux clés :
   - **Publishable key** : Commence par `pk_test_...`
   - **Secret key** : Commence par `sk_test_...` (cliquez sur "Reveal test key")

### Configurer dans le Backend

Dans votre `.env` ou Railway :

```env
STRIPE_SECRET_KEY=sk_test_51AbCdEfGhIjKlMnOpQrStUvWxYz1234567890
```

---

## 💳 2. Cartes de Test Stripe

### ✅ Carte de Test Standard (Paiement Réussi)

```
Numéro de carte : 4242 4242 4242 4242
Date d'expiration : 12/25 (ou n'importe quelle date future)
CVC : 123 (ou n'importe quel code à 3 chiffres)
Code postal : 12345 (ou n'importe quel code postal)
```

**Utilisation :** Teste un paiement réussi standard.

### ❌ Carte Refusée (Paiement Échoué)

```
Numéro de carte : 4000 0000 0000 0002
Date d'expiration : 12/25
CVC : 123
```

**Utilisation :** Teste un paiement refusé par la banque.

### ⚠️ Carte Requiert 3D Secure

```
Numéro de carte : 4000 0025 0000 3155
Date d'expiration : 12/25
CVC : 123
```

**Utilisation :** Teste l'authentification 3D Secure (SCA).

### 💰 Carte avec Fond Insuffisant

```
Numéro de carte : 4000 0000 0000 9995
Date d'expiration : 12/25
CVC : 123
```

**Utilisation :** Teste un paiement avec fonds insuffisants.

### 📅 Carte Expirée

```
Numéro de carte : 4000 0000 0000 0069
Date d'expiration : 12/20 (date passée)
CVC : 123
```

**Utilisation :** Teste une carte expirée.

### 🔒 Carte Requiert un Code PIN

```
Numéro de carte : 4000 0000 0000 3220
Date d'expiration : 12/25
CVC : 123
```

**Utilisation :** Teste une carte nécessitant un code PIN.

---

## 🧪 3. Tests des Endpoints API

### Test 1 : Créer un Payment Intent

**Requête :**
```bash
curl -X POST https://apinest-production.up.railway.app/payments/create-intent \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "activityId": "507f1f77bcf86cd799439011",
    "amount": 25.00,
    "currency": "eur"
  }'
```

**Réponse attendue (201 Created) :**
```json
{
  "clientSecret": "pi_3ABC123_secret_xyz789",
  "paymentIntentId": "pi_3ABC123"
}
```

**Erreurs possibles :**
- `400 Bad Request` : Activité gratuite, montant incorrect, déjà payé, activité pleine
- `404 Not Found` : Activité non trouvée
- `401 Unauthorized` : Token invalide

### Test 2 : Confirmer un Paiement

**⚠️ Note :** En réalité, la confirmation se fait côté frontend avec le SDK Stripe. Cet endpoint est appelé après que le frontend a confirmé le paiement.

**Requête :**
```bash
curl -X POST https://apinest-production.up.railway.app/payments/confirm \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "paymentIntentId": "pi_3ABC123",
    "activityId": "507f1f77bcf86cd799439011"
  }'
```

**Réponse attendue (200 OK) :**
```json
{
  "success": true,
  "message": "Payment confirmed and user added as participant",
  "activityId": "507f1f77bcf86cd799439011"
}
```

### Test 3 : Vérifier le Statut de Paiement

**Requête :**
```bash
curl -X GET https://apinest-production.up.railway.app/payments/check-payment/507f1f77bcf86cd799439011 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Réponse attendue (200 OK) :**
```json
{
  "hasPaid": true,
  "isParticipant": true,
  "activityPrice": 25.00
}
```

---

## 📱 4. Tests avec le Frontend (iOS/Android)

### Flux Complet de Test

1. **Créer une activité payante** (via votre app ou API)
   ```json
   {
     "sportType": "Football",
     "title": "Session de test",
     "price": 25.00,
     ...
   }
   ```

2. **Créer un Payment Intent** (via votre app)
   - Appeler `POST /payments/create-intent`
   - Récupérer le `clientSecret`

3. **Afficher le formulaire de paiement Stripe**
   - Utiliser le SDK Stripe (iOS/Android)
   - Saisir la carte de test : `4242 4242 4242 4242`

4. **Confirmer le paiement**
   - Le SDK Stripe confirme le paiement
   - Appeler `POST /payments/confirm` depuis votre app

5. **Vérifier le résultat**
   - L'utilisateur devrait être ajouté comme participant
   - Vérifier via `GET /payments/check-payment/:activityId`

---

## 🔍 5. Vérifier dans Stripe Dashboard

### Voir les Paiements de Test

1. Allez dans **Payments** > **Test payments**
2. Vous verrez tous les paiements de test effectués
3. Cliquez sur un paiement pour voir les détails :
   - Statut (succeeded, failed, etc.)
   - Montant
   - Client
   - Métadonnées (activityId, userId)

### Voir les Payment Intents

1. Allez dans **Developers** > **Logs**
2. Vous verrez tous les événements API
3. Filtrez par "payment_intent" pour voir les Payment Intents créés

### Voir les Erreurs

1. Allez dans **Developers** > **Logs**
2. Filtrez par "error" pour voir les erreurs
3. Cliquez sur une erreur pour voir les détails

---

## 🎯 6. Scénarios de Test Complets

### Scénario 1 : Paiement Réussi ✅

**Objectif :** Tester un paiement réussi complet

**Étapes :**
1. Créer une activité avec `price: 25.00`
2. Créer un Payment Intent
3. Utiliser la carte `4242 4242 4242 4242`
4. Confirmer le paiement
5. Vérifier que l'utilisateur est participant

**Résultat attendu :** ✅ Paiement réussi, utilisateur ajouté comme participant

### Scénario 2 : Paiement Refusé ❌

**Objectif :** Tester un paiement refusé

**Étapes :**
1. Créer une activité avec `price: 25.00`
2. Créer un Payment Intent
3. Utiliser la carte `4000 0000 0000 0002`
4. Essayer de confirmer le paiement

**Résultat attendu :** ❌ Paiement refusé, utilisateur NON ajouté

### Scénario 3 : Activité Gratuite 🆓

**Objectif :** Tester qu'on ne peut pas payer une activité gratuite

**Étapes :**
1. Créer une activité SANS prix (`price: null` ou `price: 0`)
2. Essayer de créer un Payment Intent

**Résultat attendu :** ❌ Erreur "Activity is free, no payment required"

### Scénario 4 : Activité Pleine 🚫

**Objectif :** Tester qu'on ne peut pas payer si l'activité est pleine

**Étapes :**
1. Créer une activité avec `participants: 1`
2. Ajouter un participant (remplir l'activité)
3. Essayer de créer un Payment Intent pour un autre utilisateur

**Résultat attendu :** ❌ Erreur "Activity is full"

### Scénario 5 : Double Paiement 🔄

**Objectif :** Tester qu'on ne peut pas payer deux fois

**Étapes :**
1. Créer une activité avec `price: 25.00`
2. Payer une première fois (réussi)
3. Essayer de créer un Payment Intent à nouveau

**Résultat attendu :** ❌ Erreur "User has already paid for this activity"

### Scénario 6 : Montant Incorrect 💰

**Objectif :** Tester la validation du montant

**Étapes :**
1. Créer une activité avec `price: 25.00`
2. Créer un Payment Intent avec `amount: 30.00` (montant incorrect)

**Résultat attendu :** ❌ Erreur "Amount must match activity price: 25"

---

## 🛠️ 7. Outils de Test Stripe

### Stripe CLI (Optionnel)

**Installation :**
```bash
# Windows : Télécharger depuis https://github.com/stripe/stripe-cli/releases
# Mac : brew install stripe/stripe-cli/stripe
# Linux : Voir documentation Stripe
```

**Utilisation :**
```bash
# Se connecter
stripe login

# Écouter les événements en temps réel
stripe listen --forward-to localhost:3000/payments/webhook

# Déclencher un événement de test
stripe trigger payment_intent.succeeded
```

### Stripe Dashboard

- **Payments** : Voir tous les paiements
- **Logs** : Voir tous les événements API
- **Events** : Voir les webhooks (si configurés)

---

## 📊 8. Vérifier les Logs Backend

Dans votre console NestJS, vous devriez voir :

```
✅ Stripe configured successfully
[PaymentsService] Payment intent created: pi_xxx for activity xxx by user xxx
[PaymentsService] Payment confirmed and user xxx added as participant to activity xxx
```

Si vous voyez des erreurs, vérifiez :
- La clé `STRIPE_SECRET_KEY` est bien configurée
- L'activité existe et a un prix
- L'utilisateur est authentifié

---

## ⚠️ 9. Erreurs Communes

### Erreur : "Stripe is not configured"

**Cause :** `STRIPE_SECRET_KEY` n'est pas défini

**Solution :** Ajoutez `STRIPE_SECRET_KEY` dans votre `.env` ou Railway

### Erreur : "Activity is free, no payment required"

**Cause :** L'activité n'a pas de prix ou le prix est 0

**Solution :** Vérifiez que l'activité a un `price > 0`

### Erreur : "User has already paid for this activity"

**Cause :** L'utilisateur est déjà participant de l'activité

**Solution :** C'est normal, l'utilisateur ne peut pas payer deux fois

### Erreur : "Activity is full"

**Cause :** L'activité a atteint le nombre maximum de participants

**Solution :** Vérifiez le nombre de participants de l'activité

---

## 🎉 10. Checklist de Test

- [ ] Mode test activé dans Stripe Dashboard
- [ ] Clé `STRIPE_SECRET_KEY` configurée (commence par `sk_test_`)
- [ ] Testé avec la carte `4242 4242 4242 4242` (paiement réussi)
- [ ] Testé avec la carte `4000 0000 0000 0002` (paiement refusé)
- [ ] Testé une activité gratuite (doit retourner une erreur)
- [ ] Testé une activité pleine (doit retourner une erreur)
- [ ] Testé un double paiement (doit retourner une erreur)
- [ ] Vérifié dans Stripe Dashboard que les paiements apparaissent
- [ ] Vérifié que l'utilisateur est bien ajouté comme participant après paiement

---

## 📚 Ressources

- [Documentation Stripe Testing](https://stripe.com/docs/testing)
- [Cartes de Test Stripe](https://stripe.com/docs/testing#cards)
- [Stripe Dashboard](https://dashboard.stripe.com)
- [Stripe CLI](https://stripe.com/docs/stripe-cli)

---

**🎯 Résumé :** Utilisez toujours le mode test pendant le développement. Les paiements de test sont gratuits et ne facturent pas de vrais fonds. Testez tous les scénarios avant de passer en production !


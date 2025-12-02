# 🔧 Résolution Erreur 500 Backend - Guide Complet

## ✅ Ce Qui Est Déjà Fait

Le code pour récupérer le `paymentMethodId` depuis le `setupIntentId` est **déjà implémenté** dans votre backend.

J'ai ajouté des **logs détaillés** pour mieux déboguer.

---

## 🔍 ÉTAPE 1 : Voir les Logs Backend (PRIORITÉ #1)

### Sur Railway

1. **Allez sur** : https://railway.com
2. **Votre projet** → **Service "apinest"**
3. **Onglet "Logs"** (ou "Deployments" → Dernier déploiement → Logs)

### Ce Que Vous Cherchez

Dans les logs, cherchez les lignes qui contiennent :

```
[SubscriptionController] Error creating subscription
[SubscriptionService] Error retrieving payment method
[StripeService] Error creating subscription
ERROR
```

**Copiez TOUTES les lignes d'erreur** et partagez-les.

---

## 🔍 ÉTAPE 2 : Vérifier le Status du SetupIntent

Le problème le plus probable est que le **SetupIntent n'a pas encore le payment_method attaché**.

### Comment Vérifier

1. **Allez sur Stripe Dashboard** → **Payments** → **Setup Intents**
2. **Cherchez votre SetupIntent** : `seti_1SZqX156MHhsen2TSR9Q3GL4`
3. **Vérifiez** :
   - **Status** : Doit être `succeeded` ✅
   - **Payment method** : Doit être présent ✅

### Si le Status n'est pas "succeeded"

**Cela signifie que le PaymentSheet n'a pas été complété correctement.**

**Solution** :
- Vérifiez que l'utilisateur a bien validé le paiement dans le PaymentSheet
- Vérifiez que le callback `PaymentSheetResult.Completed` est bien appelé

---

## 🔧 ÉTAPE 3 : Améliorations Apportées au Code

J'ai ajouté des **logs détaillés** qui vont apparaître dans Railway → Logs :

### Logs Ajoutés

1. **Dans SubscriptionController** :
   ```
   [SubscriptionController] Creating subscription for user...
   [SubscriptionController] Subscription created successfully
   [SubscriptionController] Error creating subscription...
   ```

2. **Dans SubscriptionService** :
   ```
   [SubscriptionService] Retrieving SetupIntent: seti_...
   [SubscriptionService] SetupIntent status: succeeded
   [SubscriptionService] Payment method ID retrieved: pm_...
   ```

3. **Dans StripeService** :
   ```
   [StripeService] SetupIntent retrieved: seti_..., status: succeeded
   [StripeService] Creating subscription...
   ```

**Ces logs vous diront exactement où ça bloque !**

---

## 🐛 Erreurs Possibles et Solutions

### Erreur 1 : "Payment method not found in SetupIntent"

**Cause** : Le SetupIntent n'a pas encore de payment_method.

**Solution** :
- Vérifiez que le PaymentSheet a été complété avec succès
- Vérifiez que le SetupIntent a le status "succeeded"
- Attendez quelques secondes après le PaymentSheet avant de créer l'abonnement

### Erreur 2 : "SetupIntent not completed. Status: requires_payment_method"

**Cause** : Le PaymentSheet n'a pas été complété.

**Solution** :
- Vérifiez que l'utilisateur a bien validé le paiement
- Vérifiez que le callback `PaymentSheetResult.Completed` est appelé
- Vérifiez que le frontend envoie bien le setupIntentId après succès

### Erreur 3 : "Type de subscription invalide: premium_gold"

**Cause** : Les Price IDs ne sont pas configurés.

**Solution** :
- Vérifiez que les variables sont dans Railway
- Vérifiez que Railway a redémarré
- Vérifiez les noms exacts des variables

### Erreur 4 : "No such price: price_xxxxx"

**Cause** : Le Price ID n'existe pas dans Stripe.

**Solution** :
- Vérifiez dans Stripe Dashboard que le Price ID existe
- Vérifiez que vous êtes en mode "Test"
- Vérifiez que le Price ID dans Railway correspond à Stripe

---

## 📋 Checklist de Vérification

### Backend

- [x] Code pour récupérer paymentMethodId implémenté ✅
- [x] Logs détaillés ajoutés ✅
- [ ] Logs Railway vérifiés
- [ ] Erreur exacte identifiée

### Stripe

- [ ] SetupIntent existe dans Stripe Dashboard
- [ ] SetupIntent status = "succeeded"
- [ ] SetupIntent a un payment_method attaché
- [ ] Price IDs existent dans Stripe

### Railway

- [ ] Variables d'environnement configurées
- [ ] Railway redémarré
- [ ] Logs accessibles

---

## 🚀 Action Immédiate

**1. Voir les logs Railway** (PRIORITÉ #1) :

- Railway → Logs
- Cherchez les erreurs récentes
- Copiez les messages d'erreur complets

**2. Vérifier le SetupIntent dans Stripe** :

- Stripe Dashboard → Setup Intents
- Cherchez votre SetupIntent
- Vérifiez le status et le payment_method

**3. Partager les informations** :

- Les logs Railway
- Le status du SetupIntent
- L'erreur exacte

---

## 📝 Exemple de Logs à Chercher

Vous devriez voir dans les logs quelque chose comme :

```
[SubscriptionController] Creating subscription for user 123, type: premium_gold, setupIntentId: seti_...
[SubscriptionService] Retrieving SetupIntent: seti_...
[StripeService] SetupIntent retrieved: seti_..., status: succeeded, payment_method: pm_...
[SubscriptionService] Payment method ID retrieved from SetupIntent: pm_...
[StripeService] Creating subscription for user 123...
[SubscriptionController] Subscription created successfully for user 123
```

**Si vous voyez une erreur, elle sera clairement indiquée !**

---

## 🎯 Prochaines Étapes

1. ✅ **Voir les logs Railway** → Identifier l'erreur exacte
2. ✅ **Vérifier le SetupIntent** dans Stripe Dashboard
3. ✅ **Partager les informations** pour qu'on puisse corriger précisément

---

**Les logs vous diront exactement où ça bloque ! Consultez Railway → Logs maintenant !** 🔍


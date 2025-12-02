# 🔍 Guide de Débogage : Erreur 500 Backend

## 🎯 Problème Actuel

Le frontend fonctionne parfaitement, mais le backend retourne une **erreur 500** lors de la création de l'abonnement.

---

## 📋 ÉTAPE 1 : Voir les Logs Backend

### Sur Railway

1. **Allez sur** : https://railway.com
2. **Sélectionnez votre projet**
3. **Cliquez sur votre service** (ex: "apinest")
4. **Cliquez sur l'onglet "Logs"** (ou "Deployments" → Cliquez sur le dernier déploiement → Logs)

### Ce Que Vous Cherchez

Dans les logs, cherchez des lignes qui contiennent :

- `ERROR`
- `Error creating subscription`
- `Type de subscription invalide`
- `Payment method not found`
- `SetupIntent`
- `500`

**Copiez les lignes d'erreur** et partagez-les pour qu'on puisse identifier le problème exact.

---

## 🔍 Erreurs Possibles et Solutions

### Erreur 1 : "Payment method not found in SetupIntent"

**Cause** : Le SetupIntent n'a pas encore de payment_method attaché.

**Solution** : Le SetupIntent doit être complété (status = "succeeded") avant de créer l'abonnement.

**Vérification** :
- Le PaymentSheet a-t-il été complété avec succès ?
- Le SetupIntent a-t-il le status "succeeded" ?

### Erreur 2 : "Type de subscription invalide: premium_gold"

**Cause** : Les Price IDs ne sont pas configurés ou mal configurés.

**Solution** :
1. Vérifiez que les variables sont bien dans Railway
2. Vérifiez que Railway a redémarré après avoir ajouté les variables
3. Vérifiez les noms exacts des variables

### Erreur 3 : "No such price: price_xxxxx"

**Cause** : Le Price ID n'existe pas dans Stripe ou est incorrect.

**Solution** :
1. Vérifiez dans Stripe Dashboard que le Price ID existe
2. Vérifiez que vous êtes en mode "Test" dans Stripe
3. Vérifiez que le Price ID dans Railway correspond au Price ID dans Stripe

### Erreur 4 : "Stripe is not configured"

**Cause** : `STRIPE_SECRET_KEY` n'est pas configuré.

**Solution** : Ajoutez `STRIPE_SECRET_KEY` dans Railway → Variables

---

## 🔧 Améliorations Apportées au Code

J'ai ajouté des **logs détaillés** dans le code pour mieux déboguer :

```typescript
// Le code log maintenant :
- Quand le SetupIntent est récupéré
- Le status du SetupIntent
- Le payment_method trouvé
- Les erreurs détaillées
```

**Ces logs apparaîtront dans Railway → Logs** pour vous aider à identifier le problème.

---

## 📋 Checklist de Vérification

### 1. Variables d'Environnement

Vérifiez dans Railway que vous avez :

- [ ] `STRIPE_SECRET_KEY` configuré
- [ ] `STRIPE_PRICE_PREMIUM_NORMAL` configuré avec un vrai Price ID
- [ ] `STRIPE_PRICE_PREMIUM_GOLD` configuré avec un vrai Price ID
- [ ] `STRIPE_PRICE_PREMIUM_PLATINUM` configuré avec un vrai Price ID

### 2. Stripe Dashboard

Vérifiez dans Stripe :

- [ ] Vous êtes en mode **"Test"** (pas "Live")
- [ ] Les 3 produits existent
- [ ] Les Price IDs correspondent à ceux dans Railway

### 3. Logs Backend

- [ ] Railway a redémarré après les modifications
- [ ] Les logs montrent des erreurs claires
- [ ] Les logs montrent le status du SetupIntent

---

## 🚀 Action Immédiate

**1. Voir les logs Railway** :
- Allez dans Railway → Logs
- Cherchez les erreurs récentes
- Copiez les messages d'erreur

**2. Partager les logs** :
- Les logs vous diront exactement où ça bloque
- Partagez-les pour qu'on puisse identifier le problème précis

---

## 📝 Exemple de Logs à Chercher

Vous devriez voir dans les logs quelque chose comme :

```
[SubscriptionService] Retrieving SetupIntent: seti_1SZqX156MHhsen2TSR9Q3GL4
[SubscriptionService] SetupIntent status: succeeded, payment_method: pm_xxxxx
[SubscriptionService] Payment method ID retrieved from SetupIntent: pm_xxxxx
[StripeService] Creating subscription for user...
```

**Si vous voyez une erreur, elle sera clairement indiquée dans les logs.**

---

**La première étape est de voir les logs Railway pour identifier l'erreur exacte !** 🔍


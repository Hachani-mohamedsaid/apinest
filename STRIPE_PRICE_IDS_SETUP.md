# 🔧 Configuration des Price IDs Stripe

## ⚠️ Erreur Actuelle

```
Type de subscription invalide: premium_normal
Price ID Stripe not configured for subscription type "premium_normal"
```

Cette erreur signifie que les **Price IDs Stripe** ne sont pas configurés dans les variables d'environnement.

---

## 🎯 Solution : Configurer les Price IDs Stripe

### Étape 1 : Créer les Produits et Prices dans Stripe Dashboard

1. **Allez sur https://dashboard.stripe.com**
2. **Allez dans "Products"** (menu de gauche)
3. **Créez 3 produits** pour les plans premium :

#### Produit 1 : Premium Normal
- **Nom** : Premium Normal
- **Description** : 5 activités par mois
- **Type** : Recurring (Recurring billing)
- **Prix** : 9.99€ par mois
- **Cliquez sur "Add pricing"** puis **"Save product"**
- **Copiez le Price ID** (commence par `price_...`)

#### Produit 2 : Premium Gold
- **Nom** : Premium Gold
- **Description** : Activités illimitées
- **Type** : Recurring (Recurring billing)
- **Prix** : 19.99€ par mois
- **Cliquez sur "Add pricing"** puis **"Save product"**
- **Copiez le Price ID** (commence par `price_...`)

#### Produit 3 : Premium Platinum
- **Nom** : Premium Platinum
- **Description** : Activités illimitées + tous avantages
- **Type** : Recurring (Recurring billing)
- **Prix** : 29.99€ par mois
- **Cliquez sur "Add pricing"** puis **"Save product"**
- **Copiez le Price ID** (commence par `price_...`)

---

### Étape 2 : Ajouter les Variables d'Environnement

#### Sur Railway (Production)

1. **Allez sur https://railway.com**
2. **Sélectionnez votre projet**
3. **Cliquez sur votre service "apinest"**
4. **Allez dans l'onglet "Variables"**
5. **Ajoutez ces 3 variables** :

```
STRIPE_PRICE_PREMIUM_NORMAL=price_xxxxxxxxxxxxx
STRIPE_PRICE_PREMIUM_GOLD=price_yyyyyyyyyyyyy
STRIPE_PRICE_PREMIUM_PLATINUM=price_zzzzzzzzzzzzz
```

⚠️ **Important** : Remplacez `price_xxxxxxxxxxxxx` par vos vrais Price IDs depuis Stripe Dashboard.

#### En Local (.env)

Si vous testez en local, ajoutez dans votre fichier `.env` :

```env
STRIPE_PRICE_PREMIUM_NORMAL=price_xxxxxxxxxxxxx
STRIPE_PRICE_PREMIUM_GOLD=price_yyyyyyyyyyyyy
STRIPE_PRICE_PREMIUM_PLATINUM=price_zzzzzzzzzzzzz
```

---

### Étape 3 : Redémarrer le Service

1. **Sur Railway** : Le service redémarre automatiquement après avoir ajouté les variables
2. **En local** : Redémarrez votre serveur NestJS (`npm run start:dev`)

---

## ✅ Vérification

Après avoir configuré les variables, testez l'endpoint :

```bash
POST /subscriptions
Body: {
  "type": "premium_normal",
  "paymentMethodId": "pm_..."
}
```

L'erreur devrait disparaître !

---

## 📝 Exemple de Price ID

Les Price IDs Stripe ressemblent à :
```
price_1OaBcDeFgHiJkLmNoPqRsTu
```

Ils commencent toujours par `price_` suivi de lettres et chiffres.

---

## 🐛 Problèmes Courants

### Erreur : "Price ID not found"
- **Cause** : Le Price ID est incorrect ou n'existe pas dans Stripe
- **Solution** : Vérifiez le Price ID dans Stripe Dashboard > Products > [Votre Produit] > Pricing

### Erreur : "Invalid API key"
- **Cause** : `STRIPE_SECRET_KEY` n'est pas configuré
- **Solution** : Ajoutez `STRIPE_SECRET_KEY` dans les variables d'environnement

### Les Price IDs ne s'appliquent pas
- **Cause** : Le service n'a pas redémarré
- **Solution** : Redémarrez manuellement le service sur Railway

---

## 📚 Documentation Stripe

- [Créer un produit récurrent](https://stripe.com/docs/billing/subscriptions/products-prices)
- [Price IDs](https://stripe.com/docs/api/prices)

---

Une fois les Price IDs configurés, les abonnements premium fonctionneront correctement ! 🎉


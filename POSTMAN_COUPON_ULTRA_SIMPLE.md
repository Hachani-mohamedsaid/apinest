# 🚀 Guide Postman Ultra-Simple - Créer un Coupon

## ⚡ 3 Étapes Rapides

---

## 📝 Étape 1 : Se Connecter (Obtenir le Token)

### Configuration Postman :

1. **Méthode :** `POST`
2. **URL :** `https://apinest-production.up.railway.app/auth/login`
3. **Onglet Headers :**
   ```
   Content-Type: application/json
   ```
4. **Onglet Body :**
   - Sélectionnez `raw` → `JSON`
   - Collez :
   ```json
   {
     "email": "mohamedsaidhachani93274190@gmail.com",
     "password": "VOTRE_MOT_DE_PASSE"
   }
   ```
5. **Cliquez sur "Send"**
6. **Copiez le `access_token` de la réponse**

---

## 🎫 Étape 2 : Créer le Coupon

### Configuration Postman :

1. **Méthode :** `POST`
2. **URL :** `https://apinest-production.up.railway.app/activities/create-test-coupon`
3. **Onglet Headers :**
   ```
   Authorization: Bearer COLLER_VOTRE_TOKEN_ICI
   Content-Type: application/json
   ```
4. **Onglet Body :**
   - Sélectionnez `raw` → `JSON`
   - Collez :
   ```json
   {}
   ```
5. **Cliquez sur "Send"**

### ✅ Réponse Attendue :

```json
{
  "success": true,
  "message": "Coupon LEADERBOARD créé avec succès pour Mohamed",
  "coupon": {
    "id": "...",
    "userId": "6913492bd65af9844d243495",
    "couponCode": "LEADERBOARD",
    "couponUsed": false
  }
}
```

---

## ✅ Étape 3 : Valider le Coupon

### Configuration Postman :

1. **Méthode :** `POST`
2. **URL :** `https://apinest-production.up.railway.app/activities/validate-coupon`
3. **Onglet Headers :**
   ```
   Authorization: Bearer COLLER_VOTRE_TOKEN_ICI
   Content-Type: application/json
   ```
4. **Onglet Body :**
   - Sélectionnez `raw` → `JSON`
   - Collez :
   ```json
   {
     "couponCode": "LEADERBOARD",
     "activityPrice": 350
   }
   ```
5. **Cliquez sur "Send"**

### ✅ Réponse Attendue :

```json
{
  "valid": true,
  "discount": 70,
  "newPrice": 280
}
```

**Explication :** 350€ - 20% (70€) = 280€

---

## 📸 Visualisation Postman

### Requête 1 : Créer Coupon

```
┌────────────────────────────────────────────────────┐
│ POST  /activities/create-test-coupon              │
├────────────────────────────────────────────────────┤
│ Headers                                            │
│ ────────────────────────────────────────────────── │
│ Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6│
│ Content-Type: application/json                     │
├────────────────────────────────────────────────────┤
│ Body (raw JSON)                                    │
│ ────────────────────────────────────────────────── │
│ {}                                                 │
│                                                    │
│                                    [Send]          │
└────────────────────────────────────────────────────┘
```

### Requête 2 : Valider Coupon

```
┌────────────────────────────────────────────────────┐
│ POST  /activities/validate-coupon                 │
├────────────────────────────────────────────────────┤
│ Headers                                            │
│ ────────────────────────────────────────────────── │
│ Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6│
│ Content-Type: application/json                     │
├────────────────────────────────────────────────────┤
│ Body (raw JSON)                                    │
│ ────────────────────────────────────────────────── │
│ {                                                  │
│   "couponCode": "LEADERBOARD",                     │
│   "activityPrice": 350                             │
│ }                                                  │
│                                                    │
│                                    [Send]          │
└────────────────────────────────────────────────────┘
```

---

## 🎯 Résumé Ultra-Rapide

| Action | URL | Body |
|--------|-----|------|
| **Créer coupon** | `POST /activities/create-test-coupon` | `{}` |
| **Valider coupon** | `POST /activities/validate-coupon` | `{"couponCode": "LEADERBOARD", "activityPrice": 350}` |

**Headers pour les deux :**
```
Authorization: Bearer VOTRE_TOKEN
Content-Type: application/json
```

---

## ✅ Test Complet en 30 Secondes

1. **Login** → Copier `access_token`
2. **Create Coupon** → Vérifier `"success": true`
3. **Validate Coupon** → Vérifier `"valid": true` et `"newPrice": 280`

---

## 🐛 Si ça ne marche pas

### Erreur 401
→ Token invalide, reconnectez-vous

### Erreur "Vous n'avez pas reçu ce coupon"
→ Créez d'abord le coupon (Étape 2)

### Erreur "Coupon déjà utilisé"
→ Créez un nouveau coupon

---

*Guide ultra-simple pour Postman*


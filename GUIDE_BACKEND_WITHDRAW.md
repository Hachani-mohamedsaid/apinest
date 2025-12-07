# 💰 Backend NestJS - Endpoint Withdraw (Retrait)

## 📋 Vue d'ensemble

Ce guide détaille l'implémentation complète de l'endpoint `/payments/coach/withdraw` pour permettre aux coaches de retirer leurs gains.

**Endpoint :** `POST /payments/coach/withdraw`

**Authentification :** Requise (JWT)

---

## 🎯 Objectif

Permettre aux coaches de demander un retrait de leurs gains accumulés depuis leurs activités payantes.

---

## 📁 Structure des fichiers

```
payments/
├── schemas/
│   ├── payment.schema.ts          (existant)
│   └── withdraw.schema.ts          (CRÉÉ)
├── dto/
│   └── withdraw.dto.ts             (CRÉÉ)
├── payments.controller.ts          (MODIFIÉ)
├── payments.service.ts              (MODIFIÉ)
└── payments.module.ts              (MODIFIÉ)
```

---

## ✅ Implémentation Complétée

### 1. Schéma Withdraw créé
**Fichier :** `src/modules/payments/schemas/withdraw.schema.ts`

✅ Schéma MongoDB avec tous les champs nécessaires
✅ Index pour optimiser les requêtes
✅ Support des timestamps automatiques

### 2. DTOs créés
**Fichier :** `src/modules/payments/dto/withdraw.dto.ts`

✅ `CreateWithdrawDto` avec validation
✅ `WithdrawResponseDto` pour les réponses
✅ Documentation Swagger intégrée

### 3. Module modifié
**Fichier :** `src/modules/payments/payments.module.ts`

✅ `WithdrawSchema` ajouté au module Mongoose

### 4. Service modifié
**Fichier :** `src/modules/payments/payments.service.ts`

✅ `getAvailableBalance()` - Calcule le solde disponible
✅ `createWithdraw()` - Crée une demande de retrait
✅ `getWithdrawHistory()` - Récupère l'historique
✅ `updateWithdrawStatus()` - Met à jour le statut (pour admin)

### 5. Controller modifié
**Fichier :** `src/modules/payments/payments.controller.ts`

✅ `POST /payments/coach/withdraw` - Créer un retrait
✅ `GET /payments/coach/withdraw/balance` - Récupérer le solde
✅ `GET /payments/coach/withdraw/history` - Historique des retraits

### 6. Dépendances installées
✅ `uuid` installé
✅ `@types/uuid` installé

---

## 🔌 Endpoints Disponibles

### 1. Créer un retrait
**POST** `/payments/coach/withdraw`

**URL complète:**
```
POST https://votre-api.up.railway.app/payments/coach/withdraw
```

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**Body:**
```json
{
  "amount": 350.00,
  "paymentMethod": "bank_transfer",
  "bankAccount": "FR76 1234 5678 9012 3456 7890 123",
  "currency": "usd"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Withdrawal request submitted successfully",
  "withdrawId": "WDR-A1B2C3D4",
  "amount": 350.00,
  "status": "pending",
  "data": {
    "id": "693098209febb8f0f79cb560",
    "createdAt": "2025-12-07T15:30:00.000Z"
  }
}
```

**Erreurs possibles:**
- `400` - Montant invalide, solde insuffisant, montant minimum non respecté
- `401` - Unauthorized

---

### 2. Récupérer le solde disponible
**GET** `/payments/coach/withdraw/balance`

**URL complète:**
```
GET https://votre-api.up.railway.app/payments/coach/withdraw/balance
```

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Response (200 OK):**
```json
{
  "availableBalance": 350.00,
  "currency": "usd"
}
```

---

### 3. Récupérer l'historique des retraits
**GET** `/payments/coach/withdraw/history`

**URL complète:**
```
GET https://votre-api.up.railway.app/payments/coach/withdraw/history?limit=10
```

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Query Parameters:**
- `limit` (optional): Nombre maximum de retraits à retourner (default: 50)

**Response (200 OK):**
```json
{
  "withdraws": [
    {
      "id": "693098209febb8f0f79cb560",
      "withdrawId": "WDR-A1B2C3D4",
      "amount": 350.00,
      "currency": "usd",
      "status": "pending",
      "paymentMethod": "bank_transfer",
      "createdAt": "2025-12-07T15:30:00.000Z",
      "processedAt": null,
      "completedAt": null,
      "failureReason": null
    }
  ],
  "total": 1
}
```

---

## 🧪 Tests avec Postman

### Test 1 : Créer un retrait

```bash
POST /payments/coach/withdraw
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "amount": 350.00,
  "paymentMethod": "bank_transfer",
  "bankAccount": "FR76 1234 5678 9012 3456 7890 123"
}
```

### Test 2 : Solde insuffisant

```bash
POST /payments/coach/withdraw
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "amount": 1000.00
}
```

**Réponse attendue (400 Bad Request):**
```json
{
  "statusCode": 400,
  "message": "Insufficient balance",
  "error": "The requested amount exceeds your available balance",
  "availableBalance": 350.00
}
```

### Test 3 : Montant minimum

```bash
POST /payments/coach/withdraw
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "amount": 5.00
}
```

**Réponse attendue (400 Bad Request):**
```json
{
  "statusCode": 400,
  "message": "Minimum withdrawal amount is $10",
  "error": "Bad Request",
  "minimumAmount": 10
}
```

---

## 🔍 Logique de Calcul du Solde

Le solde disponible est calculé comme suit :

1. **Total des gains** = Somme de tous les paiements réussis (`status: 'succeeded'`)
2. **Total des retraits** = Somme de tous les retraits complétés ou en cours (`status: 'completed'` ou `'processing'`)
3. **Solde disponible** = Total des gains - Total des retraits

**Note:** Les retraits en statut `pending` ne sont pas déduits du solde disponible.

---

## 📊 Statuts des Retraits

- **pending** : Demande créée, en attente de traitement
- **processing** : Retrait en cours de traitement
- **completed** : Retrait complété avec succès
- **failed** : Retrait échoué (avec `failureReason`)
- **cancelled** : Retrait annulé

---

## 🔐 Sécurité

1. ✅ Vérification de l'authentification JWT
2. ✅ Le `coachId` est extrait du token JWT (pas depuis le body)
3. ✅ Validation des montants (minimum, format)
4. ✅ Vérification du solde disponible avant création

---

## 📝 Notes Importantes

1. **Montant minimum** : 10.00 USD (configurable dans le service)
2. **Conversion** : Les montants dans Payment sont en cents, convertis en dollars pour les retraits
3. **ID unique** : Format `WDR-XXXXXXXX` généré avec UUID
4. **Transactions** : Pour les opérations critiques, considérer l'utilisation de transactions MongoDB
5. **Notifications** : À implémenter pour notifier le coach et l'admin

---

## 🚀 Prochaines Étapes

1. ✅ Implémentation backend complétée
2. ⏳ Tester avec Postman
3. ⏳ Créer le guide iOS Swift pour consommer l'API
4. ⏳ Implémenter les notifications
5. ⏳ Intégrer avec Stripe Connect (optionnel)

---

*Guide créé et implémentation complétée pour l'endpoint de retrait dans NestJS*


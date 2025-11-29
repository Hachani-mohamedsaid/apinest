# 📊 Coach Dashboard API

## 🎯 Vue d'Ensemble

Ce document décrit les endpoints backend pour le Coach Dashboard, permettant de récupérer les données dynamiques (earnings et reviews) depuis la base de données.

---

## 📡 Endpoints Disponibles

### 1. GET `/payments/coach/earnings`

Récupère les earnings (revenus) du coach pour une période donnée.

**Authentification :** Requis (Bearer Token JWT)

**Query Parameters :**
- `year` (optionnel) : Année (ex: 2025)
- `month` (optionnel) : Mois (1-12)

**Exemple de requête :**
```
GET /payments/coach/earnings?year=2025&month=11
```

**Réponse (200 OK) :**
```json
{
  "totalEarnings": 8450.00,
  "earnings": [
    {
      "date": "2025-11-01",
      "amount": 120.00,
      "activityId": "692a6f3ed41d7322de5344b5",
      "activityTitle": "Morning HIIT Training"
    },
    {
      "date": "2025-11-03",
      "amount": 200.00,
      "activityId": "692a6f3ed41d7322de5344b6",
      "activityTitle": "Swimming Technique Class"
    }
  ]
}
```

**Logique de calcul :**
- Les earnings sont calculés à partir des activités payantes créées par le coach
- Revenus = `prix de l'activité × nombre de participants`
- Seules les activités avec `price > 0` et au moins un participant sont comptabilisées
- Les dates sont basées sur la date de création de l'activité ou la date de l'activité

**Filtrage par date :**
- Si `year` et `month` sont fournis : filtre pour ce mois spécifique
- Si seulement `year` est fourni : filtre pour toute l'année
- Si aucun paramètre : retourne tous les earnings

---

### 2. GET `/reviews/coach`

Récupère les reviews reçus par le coach.

**Authentification :** Requis (Bearer Token JWT)

**Query Parameters :**
- `limit` (optionnel, défaut: 50) : Nombre maximum de reviews à retourner

**Exemple de requête :**
```
GET /reviews/coach?limit=50
```

**Réponse (200 OK) :**
```json
{
  "reviews": [
    {
      "_id": "692afa082c227f35ed1416c5",
      "id": "692afa082c227f35ed1416c5",
      "activityId": "692af9cd2c227f35ed141630",
      "activityTitle": "Morning HIIT Training",
      "userId": "6921d5a722b82871fe4b7fd7",
      "userName": "Sarah M.",
      "userAvatar": "https://...",
      "rating": 5,
      "comment": "Best HIIT session I've attended! Great motivation and clear instructions.",
      "createdAt": "2025-10-30T10:00:00.000Z"
    }
  ],
  "averageRating": 4.8,
  "totalReviews": 24
}
```

**Logique :**
- Récupère toutes les activités créées par le coach
- Récupère tous les reviews pour ces activités
- Enrichit avec les informations de l'activité (titre) et de l'utilisateur (nom, avatar)
- Calcule la moyenne des ratings
- Trie par date (plus récents en premier)

---

## 🧪 Tests

### Test avec cURL

#### 1. Récupérer les earnings du coach

```bash
# Earnings pour novembre 2025
curl -X GET "https://apinest-production.up.railway.app/payments/coach/earnings?year=2025&month=11" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Earnings pour toute l'année 2025
curl -X GET "https://apinest-production.up.railway.app/payments/coach/earnings?year=2025" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Tous les earnings
curl -X GET "https://apinest-production.up.railway.app/payments/coach/earnings" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### 2. Récupérer les reviews du coach

```bash
curl -X GET "https://apinest-production.up.railway.app/reviews/coach?limit=50" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 🔧 Implémentation Technique

### Services Modifiés

#### 1. ActivitiesService

**Méthode ajoutée :**
```typescript
async getActivitiesByCreator(creatorId: string): Promise<ActivityDocument[]>
```

Récupère toutes les activités créées par un utilisateur.

#### 2. ReviewsService

**Méthodes ajoutées :**
```typescript
async getReviewsByActivityIds(activityIds: string[], limit: number): Promise<ReviewDocument[]>
async getCoachReviews(coachId: string, limit: number): Promise<{...}>
```

- `getReviewsByActivityIds` : Récupère les reviews pour plusieurs activités
- `getCoachReviews` : Récupère et enrichit les reviews d'un coach

#### 3. PaymentsService

**Méthode ajoutée :**
```typescript
async getCoachEarnings(coachId: string, year?: number, month?: number): Promise<{...}>
```

Calcule les earnings du coach à partir des activités payantes avec participants.

---

## 📊 Format des Données

### Earnings

Les earnings sont calculés comme suit :
- **Revenus par activité** = `prix × nombre de participants`
- **Total** = Somme de tous les revenus
- **Groupement** : Les earnings sont groupés par date

### Reviews

Les reviews incluent :
- Informations du review (rating, comment, date)
- Informations de l'activité (titre)
- Informations de l'utilisateur (nom, avatar)
- Statistiques globales (moyenne, total)

---

## ⚠️ Notes Importantes

1. **Authentification** : Tous les endpoints nécessitent l'authentification JWT
2. **Filtrage** : Les earnings ne comptabilisent que les activités payantes avec participants
3. **Performance** : Pour de grandes quantités de données, considérer d'ajouter la pagination
4. **Index MongoDB** : Recommandé d'ajouter des index sur :
   - `creator` dans Activity
   - `activityId` dans Review
   - `createdAt` dans Activity et Review

---

## ✅ Checklist

- [x] Méthode `getActivitiesByCreator` ajoutée dans ActivitiesService
- [x] Méthode `getReviewsByActivityIds` ajoutée dans ReviewsService
- [x] Méthode `getCoachReviews` ajoutée dans ReviewsService
- [x] Méthode `getCoachEarnings` ajoutée dans PaymentsService
- [x] Endpoint `GET /payments/coach/earnings` créé
- [x] Endpoint `GET /reviews/coach` créé
- [x] Documentation Swagger ajoutée
- [x] Gestion des erreurs implémentée

---

## 🚀 Utilisation

Les endpoints sont maintenant disponibles pour le Coach Dashboard. Le frontend peut appeler ces endpoints pour afficher :
- Les revenus du coach (graphiques, totaux)
- Les reviews reçus (liste, moyenne, statistiques)


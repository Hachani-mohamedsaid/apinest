# 🔥 Explication du Système de Streak (Série)

## 🎯 Vue d'Ensemble

Le système de **streak** (série) encourage les utilisateurs à être actifs **chaque jour** en comptant le nombre de jours consécutifs où ils complètent une activité.

## 📊 Deux Types de Streak

### 1. **Current Streak** (Série Actuelle) - `currentStreak`

**Définition :** Nombre de jours consécutifs où l'utilisateur a complété une activité, en commençant par aujourd'hui ou hier.

**Caractéristiques :**
- ✅ **S'incrémente** chaque jour où l'utilisateur complète une activité
- ❌ **Se réinitialise à 0 ou 1** si l'utilisateur saute un jour
- 📅 **Mis à jour automatiquement** lors de la complétion d'activité
- 🔄 **Vérifié chaque nuit** par un cron job pour expirer les streaks cassés

**Exemple :**
- Jour 1 : Complète une activité → `currentStreak = 1`
- Jour 2 : Complète une activité → `currentStreak = 2`
- Jour 3 : Complète une activité → `currentStreak = 3`
- Jour 4 : **Ne complète pas** → `currentStreak = 0` (cassé)
- Jour 5 : Complète une activité → `currentStreak = 1` (nouvelle série)

### 2. **Best Streak** (Meilleure Série) - `bestStreak`

**Définition :** Le plus grand nombre de jours consécutifs que l'utilisateur a jamais atteint.

**Caractéristiques :**
- 🏆 **Record personnel** de l'utilisateur
- ⬆️ **S'incrémente** uniquement si `currentStreak` dépasse `bestStreak`
- 📈 **Ne diminue jamais** (record permanent)
- 💾 **Conservé** même si la série actuelle est cassée

**Exemple :**
- Semaine 1 : Atteint 5 jours → `bestStreak = 5`
- Semaine 2 : Atteint 3 jours → `bestStreak = 5` (reste à 5, car 3 < 5)
- Semaine 3 : Atteint 7 jours → `bestStreak = 7` (nouveau record !)
- Semaine 4 : Série cassée → `bestStreak = 7` (reste à 7, record conservé)

## 🎮 Comment ça Fonctionne ?

### Mise à Jour Automatique

Le streak est mis à jour automatiquement lors de la **complétion d'une activité** :

```typescript
// Lorsqu'un utilisateur complète une activité
await streakService.updateStreak(userId, activityDate);
```

### Logique de Calcul

1. **Première activité** : `currentStreak = 1`, `bestStreak = 1`
2. **Jour consécutif** : `currentStreak++`, si > `bestStreak` alors `bestStreak = currentStreak`
3. **Jour sauté** : `currentStreak = 0` ou `1` (selon le contexte)
4. **Même jour** : Pas de changement (une seule activité par jour compte)

### Vérification Nocturne (Cron Job)

Chaque nuit à minuit, un cron job vérifie tous les streaks actifs :

```typescript
@Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
async expireStreaks(): Promise<void> {
  // Vérifie si l'utilisateur n'a pas été actif depuis 2+ jours
  // Si oui, réinitialise currentStreak à 0
}
```

**Règles :**
- Si dernière activité = **hier** → Streak maintenu
- Si dernière activité = **avant-hier ou plus** → Streak cassé (`currentStreak = 0`)

## 🏆 Récompenses et Avantages

### 1. Bonus XP par Jour de Streak

Chaque jour de streak (à partir du jour 2) donne un bonus XP :

```typescript
// Bonus XP = 5 XP × nombre de jours de streak
// Jour 2 : 10 XP bonus
// Jour 3 : 15 XP bonus
// Jour 5 : 25 XP bonus
// etc.
```

**Exemple :**
- Jour 1 : 0 XP bonus (premier jour)
- Jour 2 : 10 XP bonus (5 × 2)
- Jour 3 : 15 XP bonus (5 × 3)
- Jour 7 : 35 XP bonus (5 × 7)

### 2. Badges de Streak

Des badges sont débloqués selon la série :

- 🔥 **"Début de Série"** : 3 jours consécutifs
- 🔥🔥 **"Série Régulière"** : 7 jours consécutifs
- (Et d'autres badges pour des séries plus longues)

### 3. Motivation et Engagement

- 📊 **Affichage dans le profil** : Montre la série actuelle et le record
- 🎯 **Objectif personnel** : Battre son record de `bestStreak`
- 💪 **Encouragement quotidien** : Motive à être actif chaque jour

## 📱 Utilisation dans l'Application

### Endpoint API : `/achievements/summary`

```json
{
  "level": { ... },
  "stats": {
    "totalBadges": 5,
    "currentStreak": 7,      // ✅ Série actuelle
    "bestStreak": 12        // ✅ Meilleur record
  }
}
```

### Affichage Frontend (Exemple)

```kotlin
// Android Jetpack Compose
Column {
    Text("🔥 Série actuelle : ${summary.stats.currentStreak} jours")
    Text("🏆 Meilleur record : ${summary.stats.bestStreak} jours")
    
    // Barre de progression pour atteindre le prochain badge
    if (summary.stats.currentStreak < 7) {
        Text("${7 - summary.stats.currentStreak} jours pour le badge 'Série Régulière'")
    }
}
```

## 🎯 Cas d'Usage

### Scénario 1 : Utilisateur Régulier

```
Jour 1 : Complète activité → currentStreak = 1, bestStreak = 1
Jour 2 : Complète activité → currentStreak = 2, bestStreak = 2 (+10 XP)
Jour 3 : Complète activité → currentStreak = 3, bestStreak = 3 (+15 XP, badge débloqué !)
Jour 4 : Complète activité → currentStreak = 4, bestStreak = 4 (+20 XP)
...
Jour 7 : Complète activité → currentStreak = 7, bestStreak = 7 (+35 XP, badge débloqué !)
```

### Scénario 2 : Utilisateur avec Interruption

```
Jour 1-5 : Série de 5 jours → currentStreak = 5, bestStreak = 5
Jour 6 : Oublié → currentStreak = 0 (cassé)
Jour 7 : Recommence → currentStreak = 1, bestStreak = 5 (record conservé)
Jour 8-14 : Nouvelle série de 7 jours → currentStreak = 7, bestStreak = 7 (nouveau record !)
```

### Scénario 3 : Utilisateur qui Améliore son Record

```
Semaine 1 : Atteint 5 jours → bestStreak = 5
Semaine 2 : Atteint 3 jours → bestStreak = 5 (pas de changement)
Semaine 3 : Atteint 10 jours → bestStreak = 10 (nouveau record !)
Semaine 4 : Série cassée → bestStreak = 10 (record conservé)
```

## 📋 Règles Importantes

### ✅ Ce qui Compte pour le Streak

- ✅ **Compléter une activité** (pas juste créer)
- ✅ **Une activité par jour** (plusieurs activités le même jour = 1 jour de streak)
- ✅ **Jours consécutifs** (hier → aujourd'hui)

### ❌ Ce qui Ne Compte Pas

- ❌ **Créer une activité** sans la compléter
- ❌ **Plusieurs activités le même jour** (ne compte qu'une fois)
- ❌ **Jours non consécutifs** (sauter un jour casse la série)

### ⚠️ Expiration Automatique

- Si l'utilisateur n'a pas été actif depuis **2+ jours**, le streak est automatiquement réinitialisé à minuit
- Le `bestStreak` n'est **jamais** réinitialisé (record permanent)

## 🎯 Résumé

| Élément | Description | Comportement |
|---------|-------------|--------------|
| **currentStreak** | Série actuelle | S'incrémente chaque jour consécutif, se réinitialise si cassé |
| **bestStreak** | Meilleur record | S'incrémente uniquement si record battu, jamais réinitialisé |
| **Bonus XP** | Récompense quotidienne | 5 XP × nombre de jours (à partir du jour 2) |
| **Badges** | Récompenses spéciales | Débloqués à 3 jours, 7 jours, etc. |
| **Cron Job** | Vérification automatique | Vérifie chaque nuit à minuit et expire les streaks cassés |

## 🚀 Conclusion

Le système de streak est un **mécanisme de gamification** qui :
- 🎯 **Encourage l'engagement quotidien**
- 🏆 **Récompense la régularité** avec des bonus XP et badges
- 📊 **Suit les progrès** avec `currentStreak` et `bestStreak`
- 💪 **Motive les utilisateurs** à battre leurs records personnels


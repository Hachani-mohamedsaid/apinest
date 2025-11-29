# 🔑 Guide de Configuration - Clé API YouTube

## 📋 Étapes pour Créer une Clé API YouTube Sécurisée

### 1. Accéder à Google Cloud Console

1. Allez sur https://console.cloud.google.com/
2. Connectez-vous avec votre compte Google
3. Créez un projet ou sélectionnez un projet existant

### 2. Activer YouTube Data API v3

1. Dans le menu de gauche, allez dans **"API et services"** > **"Bibliothèque"**
2. Recherchez **"YouTube Data API v3"**
3. Cliquez sur **"Activer"**

### 3. Créer la Clé API

1. Allez dans **"API et services"** > **"Identifiants"**
2. Cliquez sur **"+ Créer des identifiants"** > **"Clé API"**

### 4. Configuration de la Clé API

#### ✅ Nom de la Clé

- **Nom** : Donnez un nom descriptif
  - Exemple : `YouTube API - Fitness App Backend`
  - Cela vous aidera à identifier la clé plus tard

#### ✅ Restrictions d'Application

**Choisissez : "Aucun"** ✅

- Pour un backend serveur (comme NestJS), "Aucun" est approprié
- La clé sera utilisée depuis votre serveur Railway, pas depuis un navigateur ou une app mobile
- Si vous connaissez l'IP de votre serveur Railway, vous pouvez choisir **"Adresses IP"** et ajouter l'IP

#### ✅ Restrictions d'API (IMPORTANT !)

**Choisissez : "Restreindre la clé"** ✅

1. Cliquez sur **"Restreindre la clé"**
2. Dans la liste des APIs, recherchez **"YouTube Data API v3"**
3. Cochez **"YouTube Data API v3"** uniquement
4. ⚠️ **Ne cochez PAS les autres APIs** pour la sécurité

**Pourquoi restreindre ?**
- ✅ Empêche l'utilisation de votre clé pour d'autres APIs
- ✅ Réduit les risques si la clé est compromise
- ✅ Limite les coûts en cas d'abus

### 5. Créer et Copier la Clé

1. Cliquez sur **"Créer"**
2. ⚠️ **IMPORTANT** : La clé ne sera affichée qu'une seule fois !
3. Copiez immédiatement la clé (commence par `AIzaSy...`)
4. Sauvegardez-la dans un endroit sûr

### 6. Ajouter la Clé dans Railway

1. Allez dans votre projet Railway
2. Cliquez sur **"Variables"**
3. Ajoutez :
   - **Nom** : `YOUTUBE_API_KEY`
   - **Valeur** : Votre clé API (commence par `AIzaSy...`)
4. Cliquez sur **"Add"**

### 7. Vérifier la Configuration

Après avoir ajouté la clé, vous pouvez la voir dans la liste des identifiants :
- **Nom** : Le nom que vous avez donné
- **Restrictions** : "YouTube Data API v3" (si vous avez restreint)

## 🔒 Sécurité

### ✅ Bonnes Pratiques

1. **Restreindre l'API** : Limitez la clé à "YouTube Data API v3" uniquement
2. **Ne partagez JAMAIS** la clé publiquement
3. **Stockez la clé** dans les variables d'environnement (Railway)
4. **Surveillez l'utilisation** dans Google Cloud Console
5. **Régénérez la clé** si vous pensez qu'elle a été compromise

### ⚠️ À Éviter

- ❌ Ne pas restreindre la clé API
- ❌ Partager la clé dans le code source
- ❌ Utiliser la même clé pour plusieurs projets
- ❌ Laisser la clé dans les logs

## 📊 Quotas YouTube API

- **Quota gratuit** : 10,000 unités/jour
- **Recherche** : 100 unités par requête
- **Détails vidéo** : 1 unité par vidéo
- **Total** : ~100 recherches/jour gratuites

## 🧪 Test de la Clé

Une fois configurée, testez avec :

```bash
curl -X GET "https://www.googleapis.com/youtube/v3/search?key=VOTRE_CLE&part=snippet&q=fitness&type=video&maxResults=1"
```

Si vous recevez des résultats, la clé fonctionne ! ✅

## 📝 Résumé des Choix

| Option | Choix Recommandé | Pourquoi |
|--------|------------------|----------|
| **Nom** | Nom descriptif | Facilite l'identification |
| **Restrictions d'application** | "Aucun" | Backend serveur |
| **Restrictions d'API** | "Restreindre la clé" | Sécurité |
| **API à autoriser** | "YouTube Data API v3" uniquement | Limite les risques |

---

**✅ Configuration Recommandée :**
- Nom : `YouTube API - Fitness App Backend`
- Restrictions d'application : **Aucun**
- Restrictions d'API : **Restreindre la clé** → **YouTube Data API v3** uniquement


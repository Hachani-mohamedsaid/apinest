# 🚂 Configuration YouTube API Key dans Railway

## ⚠️ SÉCURITÉ IMPORTANTE

Si vous avez partagé votre clé API publiquement (dans un chat, email, etc.), **RÉGÉNÉREZ-LA** immédiatement :

1. Allez dans Google Cloud Console > Identifiants
2. Trouvez votre clé API
3. Cliquez sur **"Supprimer"** ou **"Régénérer"**
4. Créez une nouvelle clé avec les mêmes restrictions

## 📋 Étapes pour Ajouter la Clé dans Railway

### 1. Accéder à Railway

1. Allez sur https://railway.app/
2. Connectez-vous à votre compte
3. Sélectionnez votre projet **"fitness-api"**

### 2. Ajouter la Variable d'Environnement

1. Dans votre projet Railway, cliquez sur votre service (ex: "fitness-api")
2. Allez dans l'onglet **"Variables"** (ou cliquez sur **"Variables"** dans le menu)
3. Cliquez sur **"+ New Variable"** ou **"+ Add Variable"**

### 3. Configurer la Variable

**Nom de la variable :**
```
YOUTUBE_API_KEY
```

**Valeur :**
```
AIzaSyCoGa1V5MTRzwgqnRwJVqoSgbqN8LTIHb4
```
⚠️ **Remplacez par votre nouvelle clé si vous l'avez régénérée !**

### 4. Sauvegarder

1. Cliquez sur **"Add"** ou **"Save"**
2. Railway redéploiera automatiquement votre application
3. Attendez que le déploiement soit terminé

### 5. Vérifier

Une fois déployé, testez l'endpoint :

```bash
curl -X GET "https://apinest-production.up.railway.app/ai-coach/youtube-videos?sportPreferences=Running&maxResults=5" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Si vous recevez des vidéos, la configuration est correcte ! ✅

## 🔒 Bonnes Pratiques de Sécurité

### ✅ À FAIRE

1. ✅ **Stockez la clé dans Railway** (variables d'environnement)
2. ✅ **Restreignez la clé** à "YouTube Data API v3" uniquement
3. ✅ **Surveillez l'utilisation** dans Google Cloud Console
4. ✅ **Régénérez régulièrement** les clés (tous les 3-6 mois)
5. ✅ **Supprimez les clés inutiles**

### ❌ À ÉVITER

1. ❌ **NE JAMAIS** partager la clé publiquement
2. ❌ **NE JAMAIS** commiter la clé dans Git
3. ❌ **NE JAMAIS** la mettre dans le code source
4. ❌ **NE JAMAIS** la logger dans les logs
5. ❌ **NE JAMAIS** la partager dans des emails/chats non sécurisés

## 📊 Vérifier l'Utilisation de la Clé

Dans Google Cloud Console :
1. Allez dans **"API et services"** > **"Tableau de bord"**
2. Sélectionnez **"YouTube Data API v3"**
3. Vérifiez les statistiques d'utilisation
4. Surveillez les pics d'activité suspects

## 🔄 Régénérer une Clé (si nécessaire)

Si votre clé a été compromise :

1. Allez dans **"Identifiants"**
2. Trouvez votre clé API
3. Cliquez sur **"Supprimer"** (ou l'icône poubelle)
4. Créez une nouvelle clé avec les mêmes restrictions
5. Mettez à jour la variable dans Railway
6. Redéployez l'application

## ✅ Checklist

- [ ] Clé API créée dans Google Cloud Console
- [ ] Clé restreinte à "YouTube Data API v3" uniquement
- [ ] Clé ajoutée dans Railway comme `YOUTUBE_API_KEY`
- [ ] Application redéployée
- [ ] Endpoint testé et fonctionnel
- [ ] Clé non partagée publiquement (si partagée, régénérée)

---

**⚠️ RAPPEL :** Si vous avez partagé votre clé dans cette conversation, **régénérez-la immédiatement** pour la sécurité !


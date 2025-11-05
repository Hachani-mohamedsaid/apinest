# 🔧 Dépannage - Erreur d'envoi d'email

## 🚨 Erreur actuelle

```
400 Bad Request
{
  "message": "Failed to send reset email. Please try again later.",
  "error": "Bad Request",
  "statusCode": 400
}
```

Cette erreur signifie que l'envoi d'email via Gmail SMTP a échoué.

---

## ✅ Vérifications à faire

### 1. Vérifier les variables d'environnement sur Railway

1. **Allez sur Railway** → Votre projet → Service "apinest"
2. **Onglet "Variables"**
3. **Vérifiez que ces variables existent :**
   - `GMAIL_USER`
   - `GMAIL_APP_PASSWORD`
   - `APP_URL`

4. **Vérifiez que les valeurs sont correctes :**
   - `GMAIL_USER` : Doit être votre email Gmail complet (ex: `monemail@gmail.com`)
   - `GMAIL_APP_PASSWORD` : Doit être un App Password de 16 caractères (pas votre mot de passe Gmail normal)
   - `APP_URL` : Doit être votre URL Railway (ex: `https://apinest-production.up.railway.app`)

### 2. Vérifier les logs Railway

1. **Allez dans Railway** → Service "apinest"
2. **Onglet "Deploy Logs"** ou **"Logs"**
3. **Cherchez les erreurs** liées à l'email :
   - `Failed to send email to ...`
   - `Error: Invalid login`
   - `Error: Authentication failed`

### 3. Vérifier la configuration Gmail

#### A. Vérifier que la vérification en deux étapes est activée

1. Allez sur https://myaccount.google.com/security
2. Vérifiez que **"Vérification en deux étapes"** est activée
3. Si ce n'est pas le cas, activez-la d'abord

#### B. Vérifier/créer un App Password

1. Allez sur https://myaccount.google.com/security
2. Section **"Mots de passe des applications"**
3. Vérifiez qu'un App Password existe pour votre application
4. Si ce n'est pas le cas, créez-en un :
   - Cliquez sur **"Mots de passe des applications"**
   - Sélectionnez **"Autre (nom personnalisé)"**
   - Nommez-le (ex: "Fitness API")
   - Cliquez sur **"Générer"**
   - **Copiez le mot de passe** (16 caractères)

#### C. Vérifier le format de l'App Password

- L'App Password doit faire **16 caractères**
- Il peut être avec ou sans espaces (ex: `abcd efgh ijkl mnop` ou `abcdefghijklmnop`)
- Si vous avez des espaces, vous pouvez les enlever ou les garder

---

## 🔍 Solutions selon l'erreur

### Erreur : "Invalid login" ou "Authentication failed"

**Cause :** App Password incorrect ou vérification en deux étapes non activée

**Solution :**
1. Vérifiez que la vérification en deux étapes est activée
2. Régénérez un App Password
3. Mettez à jour `GMAIL_APP_PASSWORD` sur Railway avec le nouveau mot de passe
4. Redéployez l'application

### Erreur : "Connection timeout" ou "ECONNREFUSED"

**Cause :** Problème de connexion réseau ou firewall

**Solution :**
1. Vérifiez que Railway peut accéder à Internet
2. Vérifiez les logs Railway pour plus de détails
3. Essayez de redéployer l'application

### Erreur : "GMAIL_USER not found" ou variable manquante

**Cause :** Variables d'environnement non configurées

**Solution :**
1. Ajoutez toutes les variables nécessaires sur Railway
2. Vérifiez que les noms sont exacts (sensible à la casse) :
   - `GMAIL_USER` (pas `Gmail_User` ou `gmail_user`)
   - `GMAIL_APP_PASSWORD` (pas `GMAIL_APP_PASS` ou autre)

---

## 📝 Checklist de vérification

- [ ] `GMAIL_USER` existe sur Railway et contient votre email Gmail complet
- [ ] `GMAIL_APP_PASSWORD` existe sur Railway et contient un App Password valide
- [ ] `APP_URL` existe sur Railway et contient votre URL Railway
- [ ] Vérification en deux étapes activée sur Gmail
- [ ] App Password généré récemment (pas expiré)
- [ ] Pas d'espaces supplémentaires dans les variables
- [ ] Application redéployée après avoir ajouté/modifié les variables

---

## 🚀 Étapes de résolution

### Étape 1 : Vérifier/créer App Password

1. Allez sur https://myaccount.google.com/security
2. Activez la vérification en deux étapes si ce n'est pas fait
3. Générez un App Password :
   - "Mots de passe des applications" → "Générer"
   - Nommez-le "Fitness API Railway"
   - Copiez le mot de passe (16 caractères)

### Étape 2 : Configurer sur Railway

1. Railway → Projet → Service "apinest" → Variables
2. Ajoutez/modifiez :
   ```
   GMAIL_USER = votre-email@gmail.com
   GMAIL_APP_PASSWORD = votre-app-password-16-caracteres
   APP_URL = https://apinest-production.up.railway.app
   ```
3. **Important :** Vérifiez qu'il n'y a pas d'espaces avant/après les valeurs

### Étape 3 : Redéployer

1. Railway redéploiera automatiquement
2. Attendez 1-2 minutes
3. Vérifiez les logs pour confirmer

### Étape 4 : Tester à nouveau

1. Dans Postman, réessayez la requête `/auth/forgot-password`
2. Vérifiez les logs Railway pour voir si l'email est envoyé
3. Vérifiez votre boîte mail

---

## 🧪 Test de configuration

Pour tester si la configuration est correcte, vérifiez les logs Railway après avoir envoyé une requête :

### Logs réussis (ce que vous devriez voir) :
```
[MailService] Email sent successfully to user@example.com: <message-id>
```

### Logs d'erreur (ce que vous pourriez voir) :
```
[MailService] Failed to send email to user@example.com: Invalid login
[MailService] Failed to send email to user@example.com: Authentication failed
```

---

## 💡 Astuce : Tester en local d'abord

Pour tester la configuration Gmail en local :

1. Créez un fichier `.env` local :
   ```env
   GMAIL_USER=votre-email@gmail.com
   GMAIL_APP_PASSWORD=votre-app-password
   APP_URL=http://localhost:3000
   ```

2. Testez l'envoi d'email localement :
   ```bash
   npm run start:dev
   ```

3. Si ça fonctionne en local, le problème vient de la configuration Railway

---

## 🆘 Si ça ne fonctionne toujours pas

1. **Vérifiez les logs Railway** pour l'erreur exacte
2. **Vérifiez que Gmail n'a pas bloqué l'accès** :
   - Allez sur https://myaccount.google.com/security
   - Vérifiez "Activité récente" pour voir si Gmail a bloqué quelque chose
3. **Essayez de régénérer un App Password** :
   - Supprimez l'ancien App Password
   - Créez-en un nouveau
   - Mettez à jour sur Railway

---

## 📞 Support

Si le problème persiste, partagez :
- Les logs Railway (erreurs exactes)
- Les variables configurées (sans les valeurs sensibles)
- Le message d'erreur complet


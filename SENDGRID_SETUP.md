# Configuration SendGrid pour l'envoi d'emails

## 🎯 Pourquoi SendGrid ?

Gmail SMTP a des problèmes de timeout sur Railway. SendGrid est plus fiable et fonctionne mieux avec Railway car il utilise une API REST au lieu de SMTP.

---

## 📋 Étapes de configuration

### 1. Créer un compte SendGrid (Gratuit)

1. Allez sur https://sendgrid.com
2. Cliquez sur **"Start for free"**
3. Créez un compte (gratuit jusqu'à 100 emails/jour)

### 2. Vérifier votre email

1. Vérifiez votre boîte mail
2. Cliquez sur le lien de vérification

### 3. Créer une API Key

1. Une fois connecté, allez dans **Settings** → **API Keys**
2. Cliquez sur **"Create API Key"**
3. Nommez-la (ex: "Fitness API Railway")
4. Donnez les permissions **"Full Access"** ou au minimum **"Mail Send"**
5. Cliquez sur **"Create & View"**
6. **⚠️ IMPORTANT :** Copiez la clé API immédiatement (vous ne pourrez plus la voir après !)
   - Elle ressemble à : `SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### 4. Vérifier l'expéditeur (Sender)

1. Allez dans **Settings** → **Sender Authentication**
2. Cliquez sur **"Verify a Single Sender"**
3. Remplissez le formulaire :
   - **From Email Address** : `mohamedsaidhachani93274190@gmail.com` (ou votre email)
   - **From Name** : Votre nom (ex: "Fitness API")
   - **Reply To** : Même email
4. Cliquez sur **"Create"**
5. Vérifiez votre email et cliquez sur le lien de vérification

### 5. Configurer sur Railway

1. Allez sur Railway → Projet → Service "apinest" → **Variables**
2. Ajoutez/modifiez ces variables :
   ```
   SENDGRID_API_KEY = SG.votre-cle-api-sendgrid
   SENDGRID_FROM_EMAIL = mohamedsaidhachani93274190@gmail.com
   ```
3. **Optionnel :** Vous pouvez garder `GMAIL_USER` si vous voulez (il sera utilisé comme fallback)

### 6. Redéployer

Railway redéploiera automatiquement. Attendez 1-2 minutes.

---

## ✅ Variables d'environnement nécessaires

### Sur Railway :

```env
SENDGRID_API_KEY=SG.votre-cle-api-sendgrid-tres-longue
SENDGRID_FROM_EMAIL=mohamedsaidhachani93274190@gmail.com
APP_URL=https://apinest-production.up.railway.app
```

### Dans votre `.env` local (pour le développement) :

```env
SENDGRID_API_KEY=SG.votre-cle-api-sendgrid
SENDGRID_FROM_EMAIL=mohamedsaidhachani93274190@gmail.com
APP_URL=http://localhost:3000
```

---

## 🧪 Tester

1. **Testez la requête** `/auth/forgot-password` dans Postman
2. **Vérifiez les logs Railway** :
   - Vous devriez voir : `✅ Email sent successfully via SendGrid to ...`
3. **Vérifiez votre boîte mail** :
   - Vous devriez recevoir l'email de réinitialisation

---

## 📊 Comparaison : Gmail SMTP vs SendGrid

| Critère | Gmail SMTP | SendGrid |
|---------|-----------|----------|
| **Gratuit** | ✅ Oui | ✅ 100 emails/jour |
| **Fiable sur Railway** | ❌ Timeouts | ✅ Fonctionne bien |
| **Configuration** | ⚠️ App Password requis | ✅ API Key simple |
| **Limite** | 500 emails/jour | 100 emails/jour (gratuit) |
| **API** | ❌ SMTP (problèmes) | ✅ REST API |

---

## 🆘 Problèmes courants

### "Invalid API Key"

**Cause :** La clé API est incorrecte ou mal copiée

**Solution :**
- Vérifiez que la clé commence par `SG.`
- Vérifiez qu'il n'y a pas d'espaces avant/après
- Régénérez une nouvelle clé API si nécessaire

### "Sender not verified"

**Cause :** L'email expéditeur n'est pas vérifié dans SendGrid

**Solution :**
1. Allez dans SendGrid → Settings → Sender Authentication
2. Vérifiez que votre email est vérifié
3. Si ce n'est pas le cas, vérifiez-le en cliquant sur le lien dans l'email

### Email dans les spams

**Solution :**
- Vérifiez votre boîte spam
- Avec SendGrid, les emails sont généralement mieux délivrés qu'avec Gmail SMTP

---

## 💡 Avantages de SendGrid

✅ **Pas de timeout** : Utilise une API REST au lieu de SMTP  
✅ **Plus fiable** : Conçu pour les applications  
✅ **Statistiques** : Vous pouvez voir les emails envoyés  
✅ **Facile à configurer** : Juste une API Key  
✅ **Gratuit** : 100 emails par jour (suffisant pour la plupart des projets)

---

## 📝 Résumé

1. ✅ Créer un compte SendGrid (gratuit)
2. ✅ Créer une API Key
3. ✅ Vérifier l'email expéditeur
4. ✅ Ajouter `SENDGRID_API_KEY` et `SENDGRID_FROM_EMAIL` sur Railway
5. ✅ Tester !

**C'est tout !** SendGrid est beaucoup plus simple et fiable que Gmail SMTP sur Railway. 🚀


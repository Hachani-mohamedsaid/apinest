# 🔍 Débogage - Problème d'envoi d'email

## ✅ Variables configurées sur Railway

D'après votre capture d'écran, les variables sont bien configurées :
- ✅ `GMAIL_USER` = `mohamedsaidhachani93274190@gmail.com`
- ✅ `GMAIL_APP_PASSWORD` = `wmbp sbep vtlg cgkl`
- ✅ `APP_URL` = `https://apinest-production.up.railway.app`

## ❌ Erreur persistante

L'erreur `400 Bad Request: Failed to send reset email` persiste.

## 🔍 Étapes de débogage

### 1. Vérifier les logs Railway

**Action immédiate :**
1. Allez sur Railway → Service "apinest"
2. Onglet **"Deploy Logs"** ou **"Logs"**
3. Cherchez les messages d'erreur après avoir envoyé la requête `/auth/forgot-password`

**Ce que vous devriez voir :**
```
❌ Failed to send email to mohamedsaidhachani93274190@gmail.com
Error: Invalid login
Error code: EAUTH
```

ou

```
[MailService] Failed to send email to ...
Error: Authentication failed
```

### 2. Vérifier l'App Password Gmail

**Vérifications :**
1. Allez sur https://myaccount.google.com/security
2. Vérifiez que la **"Vérification en deux étapes"** est bien activée
3. Allez dans **"Mots de passe des applications"**
4. Vérifiez qu'un App Password existe pour "Railway" ou "Fitness API"
5. Si nécessaire, supprimez l'ancien et créez-en un nouveau

### 3. Vérifier que l'App Password est correct

**Test :**
- L'App Password doit être de 16 caractères
- Format : `wmbp sbep vtlg cgkl` (avec espaces) ou `wmbsbepvtlgcgkl` (sans espaces)
- Le code enlève automatiquement les espaces, donc les deux formats fonctionnent

### 4. Tester avec un App Password fraîchement généré

**Action :**
1. Générez un **nouvel** App Password Gmail
2. Mettez à jour `GMAIL_APP_PASSWORD` sur Railway avec le nouveau mot de passe
3. Redéployez (Railway le fera automatiquement)
4. Testez à nouveau

### 5. Vérifier que Gmail n'a pas bloqué l'accès

**Vérification :**
1. Allez sur https://myaccount.google.com/security
2. Section **"Activité récente"**
3. Vérifiez s'il y a des tentatives de connexion bloquées
4. Si oui, autorisez l'accès

---

## 🔧 Solutions possibles

### Solution 1 : Régénérer l'App Password

1. **Supprimez l'ancien App Password** sur Gmail
2. **Créez-en un nouveau** :
   - Allez sur https://myaccount.google.com/security
   - "Mots de passe des applications" → "Générer"
   - Nommez-le "Railway Production"
   - Copiez le nouveau mot de passe
3. **Mettez à jour sur Railway** :
   - Railway → Variables → `GMAIL_APP_PASSWORD`
   - Collez le nouveau mot de passe
4. **Attendez le redéploiement** (1-2 minutes)
5. **Testez à nouveau**

### Solution 2 : Vérifier le format de l'email

Assurez-vous que l'email dans `GMAIL_USER` est exactement :
- `mohamedsaidhachani93274190@gmail.com` (pas d'espaces, tout en minuscules)

### Solution 3 : Vérifier les logs pour l'erreur exacte

Les logs Railway devraient maintenant afficher l'erreur exacte grâce aux améliorations du code.

**Erreurs courantes :**
- `EAUTH` = Authentification échouée (App Password incorrect)
- `ECONNREFUSED` = Connexion refusée (problème réseau)
- `Invalid login` = Identifiants incorrects

---

## 📋 Checklist de vérification

- [ ] Logs Railway vérifiés pour voir l'erreur exacte
- [ ] Vérification en deux étapes Gmail activée
- [ ] App Password Gmail valide et récent
- [ ] Variables Railway correctement configurées (sans espaces autour du =)
- [ ] Application redéployée après modification des variables
- [ ] Test effectué après redéploiement

---

## 🎯 Action immédiate

**La première chose à faire :**

1. **Allez voir les logs Railway** :
   - Railway → Service "apinest" → "Deploy Logs"
   - Cherchez les messages qui commencent par `[MailService]` ou `❌`
   - Copiez l'erreur exacte

2. **Partagez l'erreur exacte** pour que je puisse vous aider plus précisément.

Les logs devraient maintenant afficher quelque chose comme :
```
❌ Failed to send email to mohamedsaidhachani93274190@gmail.com
Error: Invalid login: 535-5.7.8 Username and Password not accepted
Error code: EAUTH
```

Cela nous dira exactement quel est le problème !


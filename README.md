# Fitness API - NestJS

API REST pour une application de fitness développée avec NestJS.

## Prérequis

- Node.js (version 18 ou supérieure)
- npm ou yarn
- MongoDB (installé localement ou connexion à une instance distante)

## Installation

1. **Installer les dépendances**

```bash
npm install
```

ou

```bash
yarn install
```

2. **Configurer les variables d'environnement**

Copiez le fichier `.env.example` vers `.env` et modifiez les valeurs selon votre configuration :

```bash
copy .env.example .env
```

Sur Linux/Mac :
```bash
cp .env.example .env
```

Puis éditez le fichier `.env` avec vos configurations (MongoDB, JWT secret, etc.)

Ajoutez également la clé d'API imgbb pour l'upload des photos de profil :

```
IMGBB_API_KEY=1597a68393fa53d678379a5971555be3
```

Pour la vérification d'email, assurez-vous de définir :

```
APP_URL=http://localhost:3000        # URL publique de l'API utilisée dans les liens envoyés par email
APP_LOGIN_URL=http://localhost:3001  # (optionnel) URL de la page de connexion du front, affichée après vérification
SENDGRID_API_KEY=...                 # ou configurez un autre transport mail
SENDGRID_FROM_EMAIL=...              # adresse d'expédition
JWT_REMEMBER_ME_EXPIRES_IN=30d       # (optionnel) durée du token quand "remember me" est activé
```

## Vérification d'email

- Lorsqu'un utilisateur met à jour son adresse email dans la page de profil, un nouveau lien de vérification est automatiquement envoyé et `isEmailVerified` repasse à `false`.
- Le lien reçu pointe vers `GET /auth/verify-email?token=...` qui confirme l'adresse et remet `isEmailVerified` à `true`.
- Pour envoyer (ou renvoyer) manuellement un email de confirmation, utilisez `POST /auth/send-verification-email` avec `{ "email": "user@email.com" }`.
- La connexion (`POST /auth/login`) reste possible même si l'email n'est pas vérifié ; exploitez `isEmailVerified` côté front pour afficher les avertissements nécessaires.
- Pour permettre aux utilisateurs connectés de modifier leur mot de passe, utilisez `PATCH /users/:id/change-password` avec un corps JSON `{ "currentPassword": "...", "newPassword": "..." }`. Le mot de passe est vérifié, doit différer de l'actuel et respecter les règles de complexité (8 caractères, maj/min, chiffre, caractère spécial).
- Le login accepte un champ optionnel `rememberMe` (`POST /auth/login`). S'il est à `true`, le JWT est émis avec la durée configurée par `JWT_REMEMBER_ME_EXPIRES_IN` (défaut 30 jours) et la réponse inclut `expiresIn`.

## Exécution de l'application

### Mode développement

```bash
npm run start:dev
```

L'application sera accessible sur `http://localhost:3000` (ou le port configuré dans `.env`)

### Mode production

1. Compiler le projet :
```bash
npm run build
```

2. Démarrer l'application :
```bash
npm run start:prod
```

### Mode debug

```bash
npm run start:debug
```

## Scripts disponibles

- `npm run build` - Compile le projet TypeScript
- `npm run start` - Démarre l'application en mode production
- `npm run start:dev` - Démarre l'application en mode développement avec watch
- `npm run start:debug` - Démarre l'application en mode debug
- `npm run start:prod` - Démarre l'application compilée
- `npm run lint` - Exécute le linter ESLint
- `npm run format` - Formate le code avec Prettier
- `npm run test` - Exécute les tests unitaires
- `npm run test:watch` - Exécute les tests en mode watch
- `npm run test:cov` - Exécute les tests avec couverture de code
- `npm run test:e2e` - Exécute les tests end-to-end

## Structure du projet

```
fitness-api/
├── src/
│   ├── config/          # Configuration de l'application
│   ├── modules/         # Modules de l'application
│   │   ├── auth/        # Module d'authentification
│   │   ├── users/       # Module utilisateurs
│   │   └── mail/        # Module email
│   ├── main.ts          # Point d'entrée de l'application
│   └── app.module.ts    # Module racine
├── dist/                # Fichiers compilés
├── test/                # Tests
├── package.json
├── tsconfig.json
└── nest-cli.json
```

## Notes importantes

⚠️ **Attention** : Si vous avez extrait ce projet d'une archive macOS, vous devrez peut-être renommer les fichiers qui commencent par `._` pour supprimer ce préfixe. Les fichiers avec le préfixe `._` sont des fichiers de métadonnées macOS et ne sont pas nécessaires pour l'exécution du projet.

Pour nettoyer ces fichiers (Windows PowerShell) :
```powershell
Get-ChildItem -Recurse -Filter "._*" | Remove-Item -Force
```

## Documentation supplémentaire

- **Intégration Android - AI Matchmaker** : Voir [ANDROID_AI_MATCHMAKER_API_GUIDE.md](./ANDROID_AI_MATCHMAKER_API_GUIDE.md) pour intégrer l'AI Matchmaker dans votre app Android (Jetpack Compose + Kotlin)
- **Intégration Android - Chat** : Voir [ANDROID_CHAT_API_GUIDE.md](./ANDROID_CHAT_API_GUIDE.md) pour intégrer le système de chat
- **Intégration Android - Activités** : Voir [ANDROID_ACTIVITY_API_GUIDE.md](./ANDROID_ACTIVITY_API_GUIDE.md) pour intégrer les activités
- **Gestion du quota OpenAI** : Voir [OPENAI_QUOTA_MANAGEMENT.md](./OPENAI_QUOTA_MANAGEMENT.md) pour gérer les erreurs 429 et optimiser les coûts...
- **Configuration MongoDB** : Voir [CONFIG_MONGODB.md](./CONFIG_MONGODB.md)
- **Configuration Railway** : Voir [RAILWAY_MONGODB_SETUP.md](./RAILWAY_MONGODB_SETUP.md)
- **Configuration Email** : Voir [SENDGRID_SETUP.md](./SENDGRID_SETUP.md) ou [GMAIL_SMTP_SETUP.md](./GMAIL_SMTP_SETUP.md)

## Support

Pour toute question ou problème, veuillez consulter la documentation NestJS : https://docs.nestjs.com


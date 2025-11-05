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

## Support

Pour toute question ou problème, veuillez consulter la documentation NestJS : https://docs.nestjs.com


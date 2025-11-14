# Guide d'intégration Android - AI Matchmaker API

## 📱 Intégration dans votre application Android (Jetpack Compose + Kotlin)

Ce guide explique comment intégrer le nouveau endpoint AI Matchmaker dans votre application Android.

## 🔗 Endpoint

```
POST /ai-matchmaker/chat
```

**Authentification** : Requis (Bearer Token JWT)

## 📦 1. Modèles de données (Data Classes)

Les modèles de données sont déjà créés dans votre projet. Vérifiez les fichiers suivants :

- `app/src/main/java/com/example/damandroid/api/AIMatchmakerApiService.kt` - Contient tous les DTOs nécessaires
- `app/src/main/java/com/example/damandroid/api/AIMatchmakerRepository.kt` - Repository avec gestion d'erreurs

## 🌐 2. Service API (Retrofit)

Le service API est déjà configuré dans `AIMatchmakerApiService.kt` et intégré dans `RetrofitClient.kt`.

### Utilisation

```kotlin
val aiMatchmakerApiService = RetrofitClient.aiMatchmakerApiService
```

## 🏗️ 3. Repository

Le repository est déjà implémenté dans `AIMatchmakerRepository.kt` avec :

- Gestion d'erreurs complète (429, 401, 403, 404, 500)
- Messages d'erreur en français
- Support de l'historique de conversation

### Utilisation

```kotlin
val repository = AIMatchmakerRepository()

val result = repository.sendMessage(
    message = "Trouver un partenaire de course",
    conversationHistory = listOf(...)
)

when (result) {
    is AIMatchmakerChatResult.Success -> {
        // Traiter la réponse
        val response = result.response
    }
    is AIMatchmakerChatResult.Error -> {
        // Gérer l'erreur
        val errorMessage = result.message
    }
}
```

## 🎨 4. ViewModel (State Management)

Le ViewModel est déjà implémenté dans `AIMatchmakerViewModel.kt` avec :

- Gestion de l'état de l'UI
- Historique de conversation
- Conversion automatique des DTOs en modèles UI

### Utilisation

```kotlin
val viewModel: AIMatchmakerViewModel = remember {
    AIMatchmakerViewModel(
        getRecommendations = GetMatchmakerRecommendations(...),
        aiMatchmakerRepository = AIMatchmakerRepository()
    )
}

// Envoyer un message
viewModel.sendMessage("Trouver un partenaire de course")

// Observer l'état
val uiState by viewModel.uiState.collectAsState()
```

## 🎨 5. UI avec Jetpack Compose

L'écran principal est déjà implémenté dans `AIMatchmakerScreen.kt` avec :

- Interface de chat moderne
- Affichage des messages utilisateur/IA
- Suggestions d'activités et d'utilisateurs
- Options interactives
- Indicateur de chargement

### Utilisation

```kotlin
AIMatchmakerRoute(
    viewModel = matchmakerViewModel,
    onBack = { /* navigation */ },
    onJoinActivity = { profile -> /* rejoindre activité */ },
    onViewProfile = { profile -> /* voir profil */ }
)
```

## 🔧 6. Gestion des erreurs

### Erreurs gérées automatiquement

- **429 (Quota dépassé)** : Message clair pour l'utilisateur. Le backend utilise automatiquement le mode fallback.
- **401 (Non autorisé)** : Invite à se reconnecter
- **403 (Accès refusé)** : Message d'erreur approprié
- **404 (Service non trouvé)** : Message d'erreur
- **500 (Erreur serveur)** : Message invitant à réessayer plus tard

### Affichage des erreurs

Les erreurs sont automatiquement affichées dans l'UI via le `AIMatchmakerUiState.error`.

## 📝 7. Exemple d'utilisation complète

```kotlin
@Composable
fun AIMatchmakerScreenExample() {
    val aiMatchmakerRepository = remember { AIMatchmakerRepository() }
    val matchmakerViewModel = remember {
        AIMatchmakerViewModel(
            getRecommendations = GetMatchmakerRecommendations(...),
            aiMatchmakerRepository = aiMatchmakerRepository
        )
    }
    
    AIMatchmakerRoute(
        viewModel = matchmakerViewModel,
        onBack = { /* navigation */ },
        onJoinActivity = { profile ->
            // Naviguer vers les détails de l'activité
            navController.navigate("activity/${profile.id}")
        },
        onViewProfile = { profile ->
            // Naviguer vers le profil de l'utilisateur
            navController.navigate("user/${profile.id}")
        }
    )
}
```

## 🎯 8. Points importants

1. **Authentification** : Le token JWT est automatiquement ajouté via `AuthInterceptor` dans `RetrofitClient.kt`

2. **Historique de conversation** : L'historique est automatiquement géré par le ViewModel

3. **Gestion d'erreurs 429** : Le backend retourne toujours des suggestions même en cas d'erreur 429 grâce au système de fallback

4. **UI/UX** : L'interface affiche clairement les suggestions d'activités et d'utilisateurs avec des cartes visuelles

5. **Performance** : Utilisation de `LazyColumn` pour les listes de messages

## 🔗 9. Dépendances nécessaires

Toutes les dépendances sont déjà configurées dans votre `build.gradle.kts` :

```kotlin
dependencies {
    // Retrofit
    implementation("com.squareup.retrofit2:retrofit:2.9.0")
    implementation("com.squareup.retrofit2:converter-gson:2.9.0")
    
    // Coroutines
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3")
    
    // ViewModel
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.6.2")
}
```

## ✅ Checklist d'intégration

- [x] Créer les data classes (DTOs) - **Déjà fait**
- [x] Créer le service API Retrofit - **Déjà fait**
- [x] Créer le Repository - **Déjà fait**
- [x] Créer le ViewModel avec StateFlow - **Déjà fait**
- [x] Créer l'UI avec Jetpack Compose - **Déjà fait**
- [x] Gérer l'authentification (token JWT) - **Déjà fait via AuthInterceptor**
- [x] Gérer les erreurs (429, 401, etc.) - **Déjà fait**
- [ ] Implémenter la navigation vers les activités/utilisateurs suggérés - **À faire selon vos besoins**
- [ ] Tester avec différents scénarios - **À faire**

## 🚀 Fonctionnalités implémentées

### ✅ Système de chat complet
- Interface de chat moderne avec messages utilisateur/IA
- Historique de conversation automatique
- Indicateur de chargement pendant l'envoi

### ✅ Suggestions intelligentes
- Suggestions d'activités basées sur les préférences
- Suggestions d'utilisateurs/partenaires
- Options interactives pour guider l'utilisateur

### ✅ Gestion d'erreurs robuste
- Messages d'erreur clairs en français
- Gestion spécifique de l'erreur 429 (quota dépassé)
- Fallback automatique côté backend

### ✅ Design moderne
- Interface glassmorphism
- Animations fluides
- Support du mode sombre/clair

## 🔄 Mode Fallback

Quand le quota OpenAI est dépassé (erreur 429), le backend utilise automatiquement un système de fallback qui :

1. Analyse le message de l'utilisateur
2. Recherche dans les données de l'application (activités, utilisateurs)
3. Génère des suggestions pertinentes sans utiliser l'API OpenAI
4. Retourne une réponse cohérente à l'utilisateur

**L'utilisateur ne voit aucune différence** - l'application continue de fonctionner normalement !

## 📚 Documentation supplémentaire

- **Backend NestJS** : Voir `OPENAI_QUOTA_MANAGEMENT.md` pour la gestion du quota OpenAI
- **Architecture** : Voir les fichiers source dans `app/src/main/java/com/example/damandroid/`

## 🐛 Dépannage

### Problème : Erreur 429 (Quota dépassé)

**Solution** : Le backend utilise automatiquement le mode fallback. L'application continue de fonctionner.

### Problème : Erreur 401 (Non autorisé)

**Solution** : Vérifiez que l'utilisateur est bien connecté et que le token JWT est valide.

### Problème : Pas de suggestions affichées

**Solution** : Vérifiez que le backend retourne bien les suggestions dans la réponse. Le mode fallback devrait toujours retourner des suggestions.

## 🎉 Prêt à utiliser !

Votre application Android est déjà configurée et prête à utiliser l'AI Matchmaker ! Il vous suffit de :

1. Vérifier que le backend NestJS est déployé avec le module AI Matchmaker
2. Tester l'application avec différents messages
3. Implémenter la navigation vers les activités/utilisateurs suggérés selon vos besoins

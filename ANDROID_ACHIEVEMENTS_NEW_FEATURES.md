# Guide Android Jetpack Compose - Nouvelles Fonctionnalités Achievements

## 🆕 Nouveautés du Système

Ce guide couvre les nouvelles fonctionnalités du système d'achievements :

1. **Initialisation automatique** : Les nouveaux utilisateurs reçoivent automatiquement des challenges
2. **Badges automatiques lors de la création** : Les badges se débloquent automatiquement lors de la **création** d'activité (ex: "Premier Hôte")
3. **Badges automatiques lors de la complétion** : Les badges se débloquent automatiquement lors de la **complétion** d'activité (ex: "Premier Pas")
4. **Progression automatique** : Les challenges progressent automatiquement
5. **Notifications en temps réel** : Comment gérer les nouveaux badges et challenges complétés

---

## 🎯 0. Nouveauté : Badges Débloqués lors de la Création d'Activité

### Nouveau Comportement

Lors de la **création** d'une activité (pas seulement la complétion), le backend vérifie automatiquement et débloque des badges comme :
- ✅ **"Premier Hôte"** : Créer votre première activité (100 XP)
- ✅ **"Hôte Populaire"** : Créer 5 activités (250 XP)
- ✅ **"Organisateur Pro"** : Créer 10 activités (500 XP)
- ✅ **"Maître Organisateur"** : Créer 25 activités (1000 XP)

### ⚠️ Important : Configuration Backend

Avant d'utiliser cette fonctionnalité, assurez-vous que les badges sont créés dans MongoDB. Voir le guide `GUIDE_TEST_BADGES_CREATION.md` pour les instructions.

### Implémentation Android Complète

```kotlin
// activities/ActivitiesViewModel.kt
@HiltViewModel
class ActivitiesViewModel @Inject constructor(
    private val activitiesRepository: ActivitiesRepository,
    private val achievementsRepository: AchievementsRepository
) : ViewModel() {
    
    private val _activityCreated = MutableSharedFlow<String>()
    val activityCreated: SharedFlow<String> = _activityCreated.asSharedFlow()
    
    suspend fun createActivity(createActivityDto: CreateActivityDto) {
        val response = activitiesRepository.createActivity(createActivityDto)
        
        if (response.isSuccessful) {
            response.body()?.let { activity ->
                // Émettre l'événement de création
                _activityCreated.emit(activity._id.toString())
                
                // Rafraîchir les achievements pour voir les nouveaux badges
                delay(1000) // Attendre que le backend traite
                achievementsRepository.fetchBadges()
                achievementsRepository.fetchSummary()
            }
        }
    }
}
```

### Écouter les Badges Débloqués lors de la Création

```kotlin
// ui/screens/ActivitiesScreen.kt
@Composable
fun ActivitiesScreen(
    activitiesViewModel: ActivitiesViewModel = hiltViewModel(),
    achievementsViewModel: AchievementsViewModel = hiltViewModel()
) {
    val newBadges by achievementsViewModel.newBadgesUnlocked.collectAsState()
    
    // Écouter les activités créées
    LaunchedEffect(Unit) {
        activitiesViewModel.activityCreated.collect { activityId ->
            // Rafraîchir les badges pour voir les nouveaux débloqués
            achievementsViewModel.refreshBadges()
            achievementsViewModel.checkForNewBadges()
        }
    }
    
    // Afficher les notifications de badges
    newBadges.forEach { badge ->
        key(badge._id) {
            BadgeUnlockedDialog(badge = badge) {
                achievementsViewModel.clearNewBadge(badge._id)
            }
        }
    }
    
    // Contenu...
}
```

### Exemple d'Écran de Création d'Activité Complet

```kotlin
// ui/screens/CreateActivityScreen.kt
@Composable
fun CreateActivityScreen(
    activitiesViewModel: ActivitiesViewModel = hiltViewModel(),
    achievementsViewModel: AchievementsViewModel = hiltViewModel(),
    onActivityCreated: () -> Unit
) {
    var activityTitle by remember { mutableStateOf("") }
    var activityDescription by remember { mutableStateOf("") }
    var selectedSportType by remember { mutableStateOf("Running") }
    var activityLocation by remember { mutableStateOf("") }
    var activityDate by remember { mutableStateOf(LocalDate.now()) }
    var activityTime by remember { mutableStateOf(LocalTime.now()) }
    
    val newBadges by achievementsViewModel.newBadgesUnlocked.collectAsState()
    val createActivityState by activitiesViewModel.createActivityState.collectAsState()
    
    // Écouter les badges débloqués lors de la création
    LaunchedEffect(Unit) {
        activitiesViewModel.activityCreated.collect { activityId ->
            // Attendre que le backend traite la création et vérifie les badges
            delay(1500)
            
            // Rafraîchir les achievements
            achievementsViewModel.refreshBadges()
            achievementsViewModel.refreshSummary()
            
            // Vérifier les nouveaux badges
            achievementsViewModel.checkForNewBadges()
        }
    }
    
    // Afficher les notifications de badges
    newBadges.forEach { badge ->
        key(badge._id) {
            BadgeUnlockedDialog(badge = badge) {
                achievementsViewModel.clearNewBadge(badge._id)
            }
        }
    }
    
    // Afficher un indicateur de chargement pendant la création
    if (createActivityState is UiState.Loading) {
        Box(
            modifier = Modifier.fillMaxSize(),
            contentAlignment = Alignment.Center
        ) {
            CircularProgressIndicator()
            Text(
                text = "Création de l'activité...",
                modifier = Modifier.padding(top = 16.dp)
            )
        }
    } else {
        // Formulaire de création d'activité
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(16.dp)
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Text(
                text = "Créer une Activité",
                style = MaterialTheme.typography.headlineMedium,
                fontWeight = FontWeight.Bold
            )
            
            // Champ Titre
            OutlinedTextField(
                value = activityTitle,
                onValueChange = { activityTitle = it },
                label = { Text("Titre") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true
            )
            
            // Champ Description
            OutlinedTextField(
                value = activityDescription,
                onValueChange = { activityDescription = it },
                label = { Text("Description") },
                modifier = Modifier.fillMaxWidth(),
                minLines = 3,
                maxLines = 5
            )
            
            // Sélection Type de Sport
            var expandedSport by remember { mutableStateOf(false) }
            ExposedDropdownMenuBox(
                expanded = expandedSport,
                onExpandedChange = { expandedSport = !expandedSport }
            ) {
                OutlinedTextField(
                    value = selectedSportType,
                    onValueChange = {},
                    readOnly = true,
                    label = { Text("Type de Sport") },
                    trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expandedSport) },
                    modifier = Modifier
                        .fillMaxWidth()
                        .menuAnchor()
                )
                ExposedDropdownMenu(
                    expanded = expandedSport,
                    onDismissRequest = { expandedSport = false }
                ) {
                    listOf("Running", "Cycling", "Football", "Basketball").forEach { sport ->
                        DropdownMenuItem(
                            text = { Text(sport) },
                            onClick = {
                                selectedSportType = sport
                                expandedSport = false
                            }
                        )
                    }
                }
            }
            
            // Champ Lieu
            OutlinedTextField(
                value = activityLocation,
                onValueChange = { activityLocation = it },
                label = { Text("Lieu") },
                modifier = Modifier.fillMaxWidth()
            )
            
            // Date et Heure
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                // Date Picker (simplifié)
                OutlinedTextField(
                    value = activityDate.toString(),
                    onValueChange = {},
                    label = { Text("Date") },
                    modifier = Modifier.weight(1f),
                    readOnly = true,
                    trailingIcon = {
                        IconButton(onClick = { /* Ouvrir DatePicker */ }) {
                            Icon(Icons.Default.DateRange, "Date")
                        }
                    }
                )
                
                // Time Picker (simplifié)
                OutlinedTextField(
                    value = activityTime.toString(),
                    onValueChange = {},
                    label = { Text("Heure") },
                    modifier = Modifier.weight(1f),
                    readOnly = true,
                    trailingIcon = {
                        IconButton(onClick = { /* Ouvrir TimePicker */ }) {
                            Icon(Icons.Default.Schedule, "Heure")
                        }
                    }
                )
            }
            
            Spacer(modifier = Modifier.height(16.dp))
            
            // Bouton de Création
            Button(
                onClick = {
                    val createActivityDto = CreateActivityDto(
                        sportType = selectedSportType,
                        title = activityTitle,
                        description = activityDescription,
                        location = activityLocation,
                        date = activityDate.toString(),
                        time = activityTime.toString(),
                        participants = 5,
                        level = "Beginner",
                        visibility = "public"
                    )
                    
                    activitiesViewModel.createActivity(createActivityDto)
                },
                modifier = Modifier.fillMaxWidth(),
                enabled = activityTitle.isNotBlank() && activityLocation.isNotBlank()
            ) {
                Text("Créer l'Activité")
            }
            
            // Message d'information sur les badges
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.primaryContainer
                )
            ) {
                Column(
                    modifier = Modifier.padding(12.dp)
                ) {
                    Text(
                        text = "💡 Astuce",
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "Créer votre première activité débloquera le badge 'Premier Hôte' !",
                        style = MaterialTheme.typography.bodySmall
                    )
                }
            }
        }
    }
    
    // Gérer le succès de la création
    LaunchedEffect(createActivityState) {
        if (createActivityState is UiState.Success) {
            // Attendre un peu pour que les badges soient vérifiés
            delay(2000)
            onActivityCreated()
        }
    }
}
```

### Repository pour la Création d'Activité

```kotlin
// activities/ActivitiesRepository.kt
class ActivitiesRepository @Inject constructor(
    private val activitiesApi: ActivitiesApi
) {
    suspend fun createActivity(createActivityDto: CreateActivityDto): Response<ActivityResponse> {
        return activitiesApi.createActivity(createActivityDto)
    }
}
```

### API Interface

```kotlin
// api/ActivitiesApi.kt
interface ActivitiesApi {
    @POST("activities")
    suspend fun createActivity(
        @Body createActivityDto: CreateActivityDto
    ): Response<ActivityResponse>
}
```

---

## 🔐 1. Inscription et Initialisation Automatique

### Nouveau Comportement

Lors de l'inscription d'un nouvel utilisateur, le backend initialise automatiquement :
- ✅ Les challenges actifs du moment
- ✅ Le système d'XP (niveau 1, 0 XP)
- ✅ Les séries (0 jours)

### Implémentation Android

```kotlin
// auth/AuthRepository.kt
class AuthRepository(
    private val authApi: AuthApi,
    private val achievementsApi: AchievementsApi,
    private val tokenManager: TokenManager
) {
    suspend fun register(email: String, password: String, name: String): Result<AuthResponse> {
        return try {
            // 1. Inscription
            val response = authApi.register(RegisterRequest(email, password, name))
            
            if (response.isSuccessful) {
                response.body()?.let { authResponse ->
                    // 2. Sauvegarder le token
                    tokenManager.saveToken(authResponse.accessToken)
                    
                    // 3. Vérifier que les challenges sont bien initialisés
                    // (Optionnel : appel immédiat pour vérification)
                    val challengesCheck = achievementsApi.getChallenges()
                    if (challengesCheck.isSuccessful) {
                        val challenges = challengesCheck.body()
                        if (challenges?.activeChallenges?.isEmpty() == true) {
                            // Si aucun challenge, attendre un peu et réessayer
                            delay(2000)
                            achievementsApi.getChallenges()
                        }
                    }
                    
                    Result.success(authResponse)
                } ?: Result.failure(Exception("Réponse vide"))
            } else {
                Result.failure(Exception("Erreur: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
```

### Écran d'Inscription Amélioré

```kotlin
// ui/screens/RegisterScreen.kt
@Composable
fun RegisterScreen(
    viewModel: AuthViewModel = hiltViewModel(),
    onRegistrationSuccess: () -> Unit
) {
    val uiState by viewModel.registrationState.collectAsState()
    
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Formulaire d'inscription...
        
        when (uiState) {
            is UiState.Loading -> {
                CircularProgressIndicator()
                Text("Création de votre compte...")
            }
            is UiState.Success -> {
                // Afficher un message de bienvenue avec les challenges
                RegistrationSuccessDialog(
                    onDismiss = onRegistrationSuccess
                )
            }
            is UiState.Error -> {
                Text(
                    text = "Erreur: ${uiState.message}",
                    color = MaterialTheme.colorScheme.error
                )
            }
            is UiState.Idle -> {}
        }
    }
}

@Composable
fun RegistrationSuccessDialog(
    onDismiss: () -> Unit
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Text("Bienvenue ! 🎉")
        },
        text = {
            Column {
                Text("Votre compte a été créé avec succès !")
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = "✨ Des challenges vous attendent déjà !",
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.primary
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "Complétez votre première activité pour débloquer votre premier badge !",
                    style = MaterialTheme.typography.bodySmall
                )
            }
        },
        confirmButton = {
            Button(onClick = onDismiss) {
                Text("Commencer")
            }
        }
    )
}
```

---

## 🏆 2. Gestion des Badges Débloqués en Temps Réel

### Nouveau Comportement

Lors de la complétion d'une activité, le backend :
1. Vérifie automatiquement tous les badges disponibles
2. Débloque les badges si critères remplis
3. Ajoute l'XP bonus pour chaque badge débloqué

### Stratégie : Vérifier les Badges Après Complétion d'Activité

```kotlin
// achievements/AchievementsViewModel.kt
@HiltViewModel
class AchievementsViewModel @Inject constructor(
    private val repository: AchievementsRepository
) : ViewModel() {
    
    private val _newBadgesUnlocked = MutableStateFlow<List<EarnedBadge>>(emptyList())
    val newBadgesUnlocked: StateFlow<List<EarnedBadge>> = _newBadgesUnlocked.asStateFlow()
    
    private val _levelUpEvent = MutableStateFlow<LevelUpEvent?>(null)
    val levelUpEvent: StateFlow<LevelUpEvent?> = _levelUpEvent.asStateFlow()
    
    suspend fun checkForNewBadges() {
        val previousBadges = repository.getBadges().earnedBadges.map { it._id }.toSet()
        val currentBadges = repository.getBadges().earnedBadges
        
        // Trouver les nouveaux badges
        val newBadges = currentBadges.filter { it._id !in previousBadges }
        
        if (newBadges.isNotEmpty()) {
            _newBadgesUnlocked.value = newBadges
        }
    }
    
    suspend fun checkForLevelUp(): LevelUpEvent? {
        val summary = repository.getSummary()
        val currentLevel = summary.level.currentLevel
        
        // Vérifier si le niveau a augmenté
        // (Vous devrez stocker le niveau précédent)
        // Pour simplifier, vérifiez si progressPercentage == 100
        
        if (summary.level.progressPercentage >= 100) {
            val event = LevelUpEvent(
                oldLevel = currentLevel - 1,
                newLevel = currentLevel,
                totalXp = summary.level.totalXp
            )
            _levelUpEvent.value = event
            return event
        }
        
        return null
    }
}

// Modèles
data class LevelUpEvent(
    val oldLevel: Int,
    val newLevel: Int,
    val totalXp: Int
)
```

### Écran avec Notifications de Badges

```kotlin
// ui/screens/ActivitiesScreen.kt
@Composable
fun ActivitiesScreen(
    activitiesViewModel: ActivitiesViewModel = hiltViewModel(),
    achievementsViewModel: AchievementsViewModel = hiltViewModel()
) {
    val newBadges by achievementsViewModel.newBadgesUnlocked.collectAsState()
    val levelUp by achievementsViewModel.levelUpEvent.collectAsState()
    
    LaunchedEffect(Unit) {
        // Vérifier les badges après chaque complétion d'activité
        activitiesViewModel.activityCompleted.collect { activityId ->
            // Rafraîchir les achievements
            achievementsViewModel.checkForNewBadges()
            achievementsViewModel.checkForLevelUp()
            achievementsViewModel.refreshSummary()
            achievementsViewModel.refreshBadges()
        }
    }
    
    // Afficher les notifications
    newBadges.forEach { badge ->
        key(badge._id) {
            BadgeUnlockedSnackbar(badge = badge) {
                // Retirer le badge de la liste après affichage
                achievementsViewModel.clearNewBadge(badge._id)
            }
        }
    }
    
    // Afficher notification de montée de niveau
    levelUp?.let { event ->
        LevelUpDialog(event = event) {
            achievementsViewModel.clearLevelUpEvent()
        }
    }
    
    // Contenu de l'écran...
}
```

### Composant de Notification de Badge

```kotlin
// ui/components/BadgeUnlockedSnackbar.kt
@Composable
fun BadgeUnlockedSnackbar(
    badge: EarnedBadge,
    onDismiss: () -> Unit
) {
    var showDialog by remember { mutableStateOf(true) }
    
    if (showDialog) {
        BadgeUnlockedDialog(
            badge = badge,
            onDismiss = {
                showDialog = false
                onDismiss()
            }
        )
    }
}

@Composable
fun BadgeUnlockedDialog(
    badge: EarnedBadge,
    onDismiss: () -> Unit
) {
    val rarityColor = getRarityColor(badge.rarity)
    
    AlertDialog(
        onDismissRequest = onDismiss,
        icon = {
            AsyncImage(
                model = badge.iconUrl,
                contentDescription = badge.name,
                modifier = Modifier.size(80.dp),
                contentScale = ContentScale.Fit
            )
        },
        title = {
            Text(
                text = "🎉 Nouveau Badge Débloqué !",
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.Bold
            )
        },
        text = {
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier.fillMaxWidth()
            ) {
                Text(
                    text = badge.name,
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold,
                    color = rarityColor
                )
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = badge.description,
                    style = MaterialTheme.typography.bodyMedium,
                    textAlign = TextAlign.Center
                )
                Spacer(modifier = Modifier.height(8.dp))
                Surface(
                    color = rarityColor.copy(alpha = 0.2f),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Text(
                        text = badge.rarity.replaceFirstChar { it.uppercase() },
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                        color = rarityColor,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        },
        confirmButton = {
            Button(
                onClick = onDismiss,
                colors = ButtonDefaults.buttonColors(
                    containerColor = rarityColor
                )
            ) {
                Text("Génial !")
            }
        }
    )
}

@Composable
fun LevelUpDialog(
    event: LevelUpEvent,
    onDismiss: () -> Unit
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        icon = {
            Icon(
                imageVector = Icons.Default.TrendingUp,
                contentDescription = null,
                modifier = Modifier.size(64.dp),
                tint = MaterialTheme.colorScheme.primary
            )
        },
        title = {
            Text(
                text = "Niveau Supérieur ! ⬆️",
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.primary
            )
        },
        text = {
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier.fillMaxWidth()
            ) {
                Text(
                    text = "Niveau ${event.oldLevel} → Niveau ${event.newLevel}",
                    style = MaterialTheme.typography.headlineMedium,
                    fontWeight = FontWeight.Bold
                )
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = "Vous avez maintenant ${event.totalXp} XP !",
                    style = MaterialTheme.typography.bodyMedium
                )
            }
        },
        confirmButton = {
            Button(onClick = onDismiss) {
                Text("Continuer")
            }
        }
    )
}

fun getRarityColor(rarity: String): Color {
    return when (rarity.lowercase()) {
        "common" -> Color(0xFF808080)
        "uncommon" -> Color(0xFF4CAF50)
        "rare" -> Color(0xFF2196F3)
        "epic" -> Color(0xFF9C27B0)
        "legendary" -> Color(0xFFFF9800)
        else -> MaterialTheme.colorScheme.primary
    }
}
```

---

## 🎯 3. Gestion de la Progression des Challenges en Temps Réel

### Nouveau Comportement

Les challenges progressent automatiquement lors de la complétion d'activité selon leur type :
- **Nombre d'activités** : +1 par activité
- **Distance** : +distance en km
- **Durée** : +durée en minutes
- **Type spécifique** : +1 si l'activité correspond

### Vérification Après Complétion d'Activité

```kotlin
// activities/ActivitiesViewModel.kt
class ActivitiesViewModel @Inject constructor(
    private val activitiesRepository: ActivitiesRepository
) : ViewModel() {
    
    private val _activityCompleted = MutableSharedFlow<String>()
    val activityCompleted: SharedFlow<String> = _activityCompleted.asSharedFlow()
    
    suspend fun completeActivity(
        activityId: String,
        durationMinutes: Int? = null,
        distanceKm: Double? = null
    ) {
        val response = activitiesRepository.completeActivity(
            activityId = activityId,
            durationMinutes = durationMinutes,
            distanceKm = distanceKm
        )
        
        if (response.isSuccessful) {
            // Émettre l'événement de complétion
            _activityCompleted.emit(activityId)
        }
    }
}
```

### Mise à Jour Automatique des Challenges

```kotlin
// ui/screens/ChallengesScreen.kt
@Composable
fun ChallengesScreen(
    viewModel: AchievementsViewModel = hiltViewModel(),
    activitiesViewModel: ActivitiesViewModel = hiltViewModel()
) {
    val challengesState by viewModel.challengesState.collectAsState()
    
    // Écouter les activités complétées
    LaunchedEffect(Unit) {
        activitiesViewModel.activityCompleted.collect { activityId ->
            // Rafraîchir les challenges pour voir la progression mise à jour
            viewModel.refreshChallenges()
            
            // Vérifier si des challenges sont complétés
            viewModel.checkCompletedChallenges()
        }
    }
    
    // Afficher les challenges...
    when (challengesState) {
        is UiState.Success -> {
            val challenges = challengesState.data.activeChallenges
            
            LazyColumn {
                items(challenges) { challenge ->
                    ChallengeItem(
                        challenge = challenge,
                        onRefresh = { viewModel.refreshChallenges() }
                    )
                }
            }
        }
        // ...
    }
}

@Composable
fun ChallengeItem(
    challenge: ActiveChallenge,
    onRefresh: () -> Unit
) {
    val isCompleted = challenge.currentProgress >= challenge.target
    
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 8.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (isCompleted) {
                MaterialTheme.colorScheme.primaryContainer
            } else {
                MaterialTheme.colorScheme.surface
            }
        )
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            // Si complété, afficher une animation
            if (isCompleted) {
                LaunchedEffect(challenge._id) {
                    // Afficher une notification de complétion
                    // Animer la progression à 100%
                }
                
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.Center,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Default.CheckCircle,
                        contentDescription = "Complété",
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(32.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "Défi Complété ! 🎉",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.primary
                    )
                }
                Spacer(modifier = Modifier.height(8.dp))
            }
            
            Text(
                text = challenge.name,
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = challenge.description,
                style = MaterialTheme.typography.bodyMedium
            )
            Spacer(modifier = Modifier.height(16.dp))
            
            // Barre de progression animée
            LinearProgressIndicator(
                progress = { 
                    (challenge.currentProgress.toFloat() / challenge.target).coerceIn(0f, 1f)
                },
                modifier = Modifier.fillMaxWidth(),
                color = if (isCompleted) {
                    MaterialTheme.colorScheme.primary
                } else {
                    MaterialTheme.colorScheme.secondary
                }
            )
            
            Spacer(modifier = Modifier.height(8.dp))
            
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    text = "${challenge.currentProgress} / ${challenge.target}",
                    style = MaterialTheme.typography.bodyMedium
                )
                Row(
                    horizontalArrangement = Arrangement.spacedBy(4.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Default.Schedule,
                        contentDescription = null,
                        modifier = Modifier.size(16.dp),
                        tint = if (challenge.daysLeft <= 1) {
                            MaterialTheme.colorScheme.error
                        } else {
                            MaterialTheme.colorScheme.secondary
                        }
                    )
                    Text(
                        text = "${challenge.daysLeft} jour${if (challenge.daysLeft > 1) "s" else ""} restant${if (challenge.daysLeft > 1) "s" else ""}",
                        style = MaterialTheme.typography.bodySmall,
                        color = if (challenge.daysLeft <= 1) {
                            MaterialTheme.colorScheme.error
                        } else {
                            MaterialTheme.colorScheme.secondary
                        }
                    )
                }
            }
            
            // Récompense XP
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.End,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Surface(
                    color = MaterialTheme.colorScheme.primaryContainer,
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Text(
                        text = "+${challenge.xpReward} XP",
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                        style = MaterialTheme.typography.labelLarge,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onPrimaryContainer
                    )
                }
            }
        }
    }
}
```

---

## 🔄 4. Workflow Complet Après Complétion d'Activité

### Stratégie de Mise à Jour

```kotlin
// ui/screens/ActivityCompleteScreen.kt (ou dans votre écran principal)
@Composable
fun ActivityCompleteScreen(
    activityId: String,
    onComplete: () -> Unit
) {
    val activitiesViewModel: ActivitiesViewModel = hiltViewModel()
    val achievementsViewModel: AchievementsViewModel = hiltViewModel()
    
    val summaryState by achievementsViewModel.summaryState.collectAsState()
    val newBadges by achievementsViewModel.newBadgesUnlocked.collectAsState()
    val levelUp by achievementsViewModel.levelUpEvent.collectAsState()
    
    LaunchedEffect(activityId) {
        // 1. Compléter l'activité
        activitiesViewModel.completeActivity(
            activityId = activityId,
            durationMinutes = 30, // Récupérer depuis l'UI
            distanceKm = 5.0 // Récupérer depuis l'UI
        )
        
        // 2. Attendre un peu pour que le backend traite
        delay(1000)
        
        // 3. Rafraîchir tous les achievements
        achievementsViewModel.refreshSummary()
        achievementsViewModel.refreshBadges()
        achievementsViewModel.refreshChallenges()
        
        // 4. Vérifier les nouveaux badges
        val previousBadgeCount = summaryState.data?.stats?.totalBadges ?: 0
        achievementsViewModel.checkForNewBadges()
        
        // 5. Vérifier la montée de niveau
        achievementsViewModel.checkForLevelUp()
    }
    
    // Afficher les résultats
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Text(
            text = "Activité Complétée ! 🎉",
            style = MaterialTheme.typography.headlineMedium,
            fontWeight = FontWeight.Bold
        )
        
        // Afficher XP gagné
        summaryState.data?.let { summary ->
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.primaryContainer
                )
            ) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(
                        text = "+XP gagné",
                        style = MaterialTheme.typography.bodySmall
                    )
                    Text(
                        text = "${summary.level.totalXp} XP total",
                        style = MaterialTheme.typography.headlineSmall,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        }
        
        // Afficher les nouveaux badges
        if (newBadges.isNotEmpty()) {
            Text(
                text = "Badges Débloqués ! 🏆",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold
            )
            
            newBadges.forEach { badge ->
                BadgeCard(badge = badge)
            }
        }
        
        // Afficher montée de niveau
        levelUp?.let { event ->
            LevelUpCard(event = event)
        }
        
        Spacer(modifier = Modifier.weight(1f))
        
        Button(
            onClick = onComplete,
            modifier = Modifier.fillMaxWidth()
        ) {
            Text("Continuer")
        }
    }
}
```

---

## 🔔 5. Notifications Push (Optionnel)

### Utilisation de Firebase Cloud Messaging

```kotlin
// notifications/AchievementsNotificationHandler.kt
class AchievementsNotificationHandler(
    private val context: Context
) {
    fun showBadgeUnlockedNotification(badge: EarnedBadge) {
        val notificationManager = NotificationManagerCompat.from(context)
        
        val notification = NotificationCompat.Builder(context, "achievements_channel")
            .setSmallIcon(R.drawable.ic_badge)
            .setContentTitle("🏆 Nouveau Badge !")
            .setContentText("${badge.name} - ${badge.description}")
            .setStyle(
                NotificationCompat.BigTextStyle()
                    .bigText(badge.description)
            )
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .build()
        
        notificationManager.notify(badge._id.hashCode(), notification)
    }
    
    fun showLevelUpNotification(level: Int, xp: Int) {
        val notificationManager = NotificationManagerCompat.from(context)
        
        val notification = NotificationCompat.Builder(context, "achievements_channel")
            .setSmallIcon(R.drawable.ic_level_up)
            .setContentTitle("⬆️ Niveau Supérieur !")
            .setContentText("Vous êtes maintenant niveau $level ($xp XP)")
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .build()
        
        notificationManager.notify("level_up".hashCode(), notification)
    }
    
    fun showChallengeCompletedNotification(challenge: ActiveChallenge) {
        val notificationManager = NotificationManagerCompat.from(context)
        
        val notification = NotificationCompat.Builder(context, "achievements_channel")
            .setSmallIcon(R.drawable.ic_challenge)
            .setContentTitle("🎯 Défi Complété !")
            .setContentText("${challenge.name} - +${challenge.xpReward} XP")
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setAutoCancel(true)
            .build()
        
        notificationManager.notify(challenge._id.hashCode(), notification)
    }
}
```

---

## 📱 6. Exemple d'Intégration Complète

### Écran Principal avec Toutes les Fonctionnalités

```kotlin
// ui/screens/HomeScreen.kt
@Composable
fun HomeScreen(
    navController: NavController,
    achievementsViewModel: AchievementsViewModel = hiltViewModel(),
    activitiesViewModel: ActivitiesViewModel = hiltViewModel()
) {
    val summaryState by achievementsViewModel.summaryState.collectAsState()
    val newBadges by achievementsViewModel.newBadgesUnlocked.collectAsState()
    val levelUp by achievementsViewModel.levelUpEvent.collectAsState()
    
    // Écouter les activités complétées
    LaunchedEffect(Unit) {
        activitiesViewModel.activityCompleted.collect { activityId ->
            // Rafraîchir tous les achievements
            achievementsViewModel.refreshAll()
            
            // Vérifier les nouveaux badges et montées de niveau
            delay(1500) // Attendre que le backend traite
            achievementsViewModel.checkForNewBadges()
            achievementsViewModel.checkForLevelUp()
        }
    }
    
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Fitness App") },
                actions = {
                    IconButton(
                        onClick = { navController.navigate("achievements") }
                    ) {
                        Icon(Icons.Default.EmojiEvents, "Achievements")
                    }
                }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            // Afficher le résumé des achievements
            summaryState.data?.let { summary ->
                AchievementSummaryCard(summary = summary)
            }
            
            // Contenu principal...
            
            // Notifications en overlay
            newBadges.forEach { badge ->
                BadgeUnlockedDialog(badge = badge) {
                    achievementsViewModel.clearNewBadge(badge._id)
                }
            }
            
            levelUp?.let { event ->
                LevelUpDialog(event = event) {
                    achievementsViewModel.clearLevelUpEvent()
                }
            }
        }
    }
}
```

---

## 🎨 7. Animations et Feedback Visuel

### Animation de Progression

```kotlin
// ui/components/AnimatedProgressBar.kt
@Composable
fun AnimatedProgressBar(
    progress: Float,
    modifier: Modifier = Modifier,
    color: Color = MaterialTheme.colorScheme.primary
) {
    var animatedProgress by remember { mutableStateOf(0f) }
    
    LaunchedEffect(progress) {
        animateTo(
            targetValue = progress,
            animationSpec = tween(
                durationMillis = 1000,
                easing = FastOutSlowInEasing
            )
        ) { value ->
            animatedProgress = value
        }
    }
    
    LinearProgressIndicator(
        progress = { animatedProgress.coerceIn(0f, 1f) },
        modifier = modifier,
        color = color,
        trackColor = MaterialTheme.colorScheme.surfaceVariant
    )
}
```

### Animation de Badge Débloqué

```kotlin
// ui/components/BadgeUnlockedAnimation.kt
@Composable
fun BadgeUnlockedAnimation(
    badge: EarnedBadge,
    onAnimationComplete: () -> Unit
) {
    var scale by remember { mutableStateOf(0f) }
    var alpha by remember { mutableStateOf(0f) }
    
    LaunchedEffect(Unit) {
        // Animation d'entrée
        launch {
            animateTo(
                targetValue = 1f,
                animationSpec = spring(
                    dampingRatio = Spring.DampingRatioMediumBouncy,
                    stiffness = Spring.StiffnessLow
                )
            ) { value ->
                scale = value
            }
        }
        
        // Fade in
        animateTo(
            targetValue = 1f,
            animationSpec = tween(300)
        ) { value ->
            alpha = value
        }
        
        // Attendre avant de disparaître
        delay(3000)
        
        // Animation de sortie
        animateTo(
            targetValue = 0f,
            animationSpec = tween(300)
        ) { value ->
            alpha = value
            scale = value * 0.8f
        }
        
        onAnimationComplete()
    }
    
    Box(
        modifier = Modifier
            .fillMaxSize()
            .graphicsLayer {
                scaleX = scale
                scaleY = scale
                alpha = alpha
            },
        contentAlignment = Alignment.Center
    ) {
        AsyncImage(
            model = badge.iconUrl,
            contentDescription = badge.name,
            modifier = Modifier.size(120.dp),
            contentScale = ContentScale.Fit
        )
    }
}
```

---

## ✅ 8. Checklist d'Implémentation

### Fonctionnalités de Base
- [ ] Écouter les événements de complétion d'activité
- [ ] Rafraîchir les achievements après complétion
- [ ] Vérifier les nouveaux badges débloqués
- [ ] Afficher les notifications de badges
- [ ] Vérifier les montées de niveau
- [ ] Afficher les notifications de montée de niveau

### Améliorations UX
- [ ] Animations de progression
- [ ] Animations de badges débloqués
- [ ] Feedback visuel pour challenges complétés
- [ ] Notifications push (optionnel)
- [ ] Sons/haptics pour les événements (optionnel)

### Optimisations
- [ ] Cache des achievements pour éviter les requêtes inutiles
- [ ] Debounce pour les rafraîchissements multiples
- [ ] Gestion d'erreurs robuste
- [ ] Mode offline (cache local)

---

## 📚 Exemples de Code Complets

### ViewModel Complet

```kotlin
// achievements/AchievementsViewModel.kt
@HiltViewModel
class AchievementsViewModel @Inject constructor(
    private val repository: AchievementsRepository
) : ViewModel() {
    
    // États
    val summaryState = repository.summaryState
    val badgesState = repository.badgesState
    val challengesState = repository.challengesState
    val leaderboardState = repository.leaderboardState
    
    // Événements
    private val _newBadgesUnlocked = MutableStateFlow<List<EarnedBadge>>(emptyList())
    val newBadgesUnlocked: StateFlow<List<EarnedBadge>> = _newBadgesUnlocked.asStateFlow()
    
    private val _levelUpEvent = MutableStateFlow<LevelUpEvent?>(null)
    val levelUpEvent: StateFlow<LevelUpEvent?> = _levelUpEvent.asStateFlow()
    
    private var previousBadgeIds = setOf<String>()
    private var previousLevel = 1
    
    init {
        loadAllData()
    }
    
    fun loadAllData() {
        viewModelScope.launch {
            launch { repository.fetchSummary() }
            launch { repository.fetchBadges() }
            launch { repository.fetchChallenges() }
            launch { repository.fetchLeaderboard() }
            
            // Initialiser les états précédents
            summaryState.value.data?.let {
                previousLevel = it.level.currentLevel
            }
            badgesState.value.data?.let {
                previousBadgeIds = it.earnedBadges.map { b -> b._id }.toSet()
            }
        }
    }
    
    fun refreshAll() {
        viewModelScope.launch {
            launch { repository.fetchSummary() }
            launch { repository.fetchBadges() }
            launch { repository.fetchChallenges() }
        }
    }
    
    suspend fun checkForNewBadges() {
        val currentBadges = repository.getBadges()
        val currentBadgeIds = currentBadges.earnedBadges.map { it._id }.toSet()
        
        val newBadges = currentBadges.earnedBadges.filter { it._id !in previousBadgeIds }
        
        if (newBadges.isNotEmpty()) {
            _newBadgesUnlocked.value = newBadges
            previousBadgeIds = currentBadgeIds
        }
    }
    
    suspend fun checkForLevelUp() {
        val summary = repository.getSummary()
        val currentLevel = summary.level.currentLevel
        
        if (currentLevel > previousLevel) {
            _levelUpEvent.value = LevelUpEvent(
                oldLevel = previousLevel,
                newLevel = currentLevel,
                totalXp = summary.level.totalXp
            )
            previousLevel = currentLevel
        }
    }
    
    fun clearNewBadge(badgeId: String) {
        _newBadgesUnlocked.value = _newBadgesUnlocked.value.filter { it._id != badgeId }
    }
    
    fun clearLevelUpEvent() {
        _levelUpEvent.value = null
    }
    
    fun refreshSummary() {
        viewModelScope.launch { repository.fetchSummary() }
    }
    
    fun refreshBadges() {
        viewModelScope.launch { repository.fetchBadges() }
    }
    
    fun refreshChallenges() {
        viewModelScope.launch { repository.fetchChallenges() }
    }
}
```

---

## 🚀 Prochaines Étapes

1. **Implémenter l'écoute** des activités complétées
2. **Ajouter les notifications** pour les nouveaux badges
3. **Implémenter les animations** de progression
4. **Tester le workflow complet** : Inscription → Activité → Badges → Challenges

---

**Dernière mise à jour :** 2025-01-20

Ce guide couvre toutes les nouvelles fonctionnalités du système d'achievements et comment les intégrer dans votre application Android Jetpack Compose.


# Guide API Activities pour Android Jetpack Compose

## 🔐 Authentification

**L'endpoint de création nécessite une authentification JWT.**

Ajoutez le header suivant à la requête :
```
Authorization: Bearer <access_token>
```

## 📡 Base URL
```
https://apinest-production.up.railway.app/
```

---

## 📋 Endpoint Création d'Activité

### **Créer une nouvelle activité**
`POST /activities`

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "sportType": "Football",
  "title": "Weekend Football Match",
  "description": "Join us for a friendly football match this weekend!",
  "location": "Central Park, New York",
  "latitude": 40.785091,
  "longitude": -73.968285,
  "date": "2025-11-15",
  "time": "2025-11-15T14:30:00Z",
  "participants": 10,
  "level": "Intermediate",
  "visibility": "public"
}
```

---

## 📝 Structure de données

### **CreateActivityRequest (Kotlin)**

```kotlin
data class CreateActivityRequest(
    val sportType: String,           // REQUIRED
    val title: String,               // REQUIRED
    val description: String? = null, // OPTIONAL
    val location: String,            // REQUIRED
    val latitude: Double? = null,    // OPTIONAL
    val longitude: Double? = null,   // OPTIONAL
    val date: String,               // REQUIRED - Format: "YYYY-MM-DD"
    val time: String,               // REQUIRED - Format: ISO 8601 (e.g., "2025-11-15T14:30:00Z")
    val participants: Int,           // REQUIRED - Range: 1-100
    val level: String,               // REQUIRED
    val visibility: String           // REQUIRED
)
```

### **Enums Kotlin**

```kotlin
enum class SportType(val value: String) {
    FOOTBALL("Football"),
    BASKETBALL("Basketball"),
    RUNNING("Running"),
    CYCLING("Cycling")
}

enum class SkillLevel(val value: String) {
    BEGINNER("Beginner"),
    INTERMEDIATE("Intermediate"),
    ADVANCED("Advanced")
}

enum class Visibility(val value: String) {
    PUBLIC("public"),
    FRIENDS("friends")
}
```

---

## ✅ Validation et Contraintes

### **Champs Requis:**
- `sportType` - Doit être: "Football", "Basketball", "Running", ou "Cycling"
- `title` - Minimum 3 caractères
- `location` - Non vide
- `date` - Format ISO 8601: "YYYY-MM-DD" (ex: "2025-11-15")
- `time` - Format ISO 8601 complet (ex: "2025-11-15T14:30:00Z")
- `participants` - Nombre entre 1 et 100
- `level` - Doit être: "Beginner", "Intermediate", ou "Advanced"
- `visibility` - Doit être: "public" ou "friends"

### **Champs Optionnels:**
- `description` - Texte libre
- `latitude` - Coordonnée GPS (nombre décimal)
- `longitude` - Coordonnée GPS (nombre décimal)

---

## 📤 Réponse (201 Created)

```json
{
  "_id": "507f1f77bcf86cd799439011",
  "creator": {
    "_id": "507f1f77bcf86cd799439012",
    "name": "John Doe",
    "email": "john@example.com",
    "profileImageUrl": "https://..."
  },
  "sportType": "Football",
  "title": "Weekend Football Match",
  "description": "Join us for a friendly football match this weekend!",
  "location": "Central Park, New York",
  "latitude": 40.785091,
  "longitude": -73.968285,
  "date": "2025-11-15T00:00:00.000Z",
  "time": "2025-11-15T14:30:00.000Z",
  "participants": 10,
  "level": "Intermediate",
  "visibility": "public",
  "createdAt": "2025-11-13T16:09:34.000Z",
  "updatedAt": "2025-11-13T16:09:34.000Z"
}
```

### **ActivityResponse (Kotlin)**

```kotlin
data class ActivityResponse(
    val _id: String,
    val id: String? = null,  // Alias pour compatibilité
    val creator: ActivityCreator,
    val sportType: String,
    val title: String,
    val description: String?,
    val location: String,
    val latitude: Double?,
    val longitude: Double?,
    val date: String,  // ISO 8601
    val time: String,  // ISO 8601
    val participants: Int,
    val level: String,
    val visibility: String,
    val createdAt: String?,
    val updatedAt: String?
) {
    // Helper pour obtenir l'ID (support id/_id)
    fun getId(): String = id ?: _id
}

data class ActivityCreator(
    val _id: String,
    val id: String? = null,
    val name: String,
    val email: String?,
    val profileImageUrl: String?
) {
    fun getId(): String = id ?: _id
}
```

---

## 🔄 Gestion des Erreurs

### Codes de statut HTTP:

- **201 Created**: Activité créée avec succès
- **400 Bad Request**: Données invalides (validation échouée)
- **401 Unauthorized**: Token manquant ou invalide
- **500 Internal Server Error**: Erreur serveur

### Format d'erreur:
```json
{
  "statusCode": 400,
  "message": "Title must be at least 3 characters long",
  "error": "Bad Request"
}
```

### Exemples d'erreurs courantes:

1. **SportType invalide:**
```json
{
  "statusCode": 400,
  "message": "Sport type must be one of: Football, Basketball, Running, Cycling",
  "error": "Bad Request"
}
```

2. **Level invalide:**
```json
{
  "statusCode": 400,
  "message": "Level must be one of: Beginner, Intermediate, Advanced",
  "error": "Bad Request"
}
```

3. **Participants hors limites:**
```json
{
  "statusCode": 400,
  "message": "Participants must be at least 1",
  "error": "Bad Request"
}
```

---

## 💡 Exemple d'utilisation avec Retrofit

### Interface Retrofit:
```kotlin
interface ActivityApiService {
    @POST("activities")
    suspend fun createActivity(
        @Body request: CreateActivityRequest,
        @Header("Authorization") token: String
    ): Response<ActivityResponse>
}
```

### Exemple d'appel:
```kotlin
suspend fun createActivity(
    sportType: SportType,
    title: String,
    description: String?,
    location: String,
    latitude: Double?,
    longitude: Double?,
    date: LocalDate,
    time: LocalTime,
    participants: Int,
    level: SkillLevel,
    visibility: Visibility
): Result<ActivityResponse> {
    return try {
        val dateString = date.format(DateTimeFormatter.ISO_DATE) // "2025-11-15"
        val timeString = LocalDateTime.of(date, time)
            .atZone(ZoneId.systemDefault())
            .toInstant()
            .toString() // "2025-11-15T14:30:00Z"
        
        val request = CreateActivityRequest(
            sportType = sportType.value,
            title = title,
            description = description,
            location = location,
            latitude = latitude,
            longitude = longitude,
            date = dateString,
            time = timeString,
            participants = participants,
            level = level.value,
            visibility = visibility.value
        )
        
        val response = activityApiService.createActivity(
            request,
            "Bearer $accessToken"
        )
        
        if (response.isSuccessful && response.body() != null) {
            Result.success(response.body()!!)
        } else {
            val errorBody = response.errorBody()?.string()
            Result.failure(Exception("Failed to create activity: $errorBody"))
        }
    } catch (e: Exception) {
        Result.failure(e)
    }
}
```

---

## 📅 Formatage des Dates

### Date (date)
- **Format d'envoi:** `"YYYY-MM-DD"` (ex: `"2025-11-15"`)
- **Kotlin:**
```kotlin
val date = LocalDate.of(2025, 11, 15)
val dateString = date.format(DateTimeFormatter.ISO_DATE)
```

### Time (time)
- **Format d'envoi:** ISO 8601 complet avec timezone (ex: `"2025-11-15T14:30:00Z"`)
- **Kotlin:**
```kotlin
val dateTime = LocalDateTime.of(date, time)
val timeString = dateTime
    .atZone(ZoneId.systemDefault())
    .toInstant()
    .toString() // Produit: "2025-11-15T14:30:00Z"
```

**Note:** Le backend combine automatiquement `date` et `time` pour créer un datetime complet. Vous pouvez envoyer le `time` avec n'importe quelle date valide, le backend utilisera la date fournie dans le champ `date`.

---

## 🎯 Points importants pour Jetpack Compose

### 1. **UI Formulaire**

Créez un formulaire avec les champs suivants:

- **Sport Type:** Dropdown/Spinner avec les 4 options
- **Title:** TextField (min 3 caractères)
- **Description:** TextField multiline (optionnel)
- **Location:** TextField avec bouton pour sélectionner depuis la carte
- **Latitude/Longitude:** Automatiquement remplis si l'utilisateur sélectionne depuis la carte (optionnel)
- **Date:** DatePicker
- **Time:** TimePicker
- **Participants:** NumberPicker ou TextField avec validation (1-100)
- **Level:** Dropdown/Spinner (Beginner, Intermediate, Advanced)
- **Visibility:** RadioButtons ou Switch (Public/Friends)

### 2. **Validation côté client**

Validez avant d'envoyer:
```kotlin
fun validateActivity(
    title: String,
    location: String,
    participants: Int,
    date: LocalDate?,
    time: LocalTime?
): ValidationResult {
    val errors = mutableListOf<String>()
    
    if (title.length < 3) {
        errors.add("Le titre doit contenir au moins 3 caractères")
    }
    
    if (location.isBlank()) {
        errors.add("La localisation est requise")
    }
    
    if (participants < 1 || participants > 100) {
        errors.add("Le nombre de participants doit être entre 1 et 100")
    }
    
    if (date == null) {
        errors.add("La date est requise")
    }
    
    if (time == null) {
        errors.add("L'heure est requise")
    }
    
    return if (errors.isEmpty()) {
        ValidationResult.Success
    } else {
        ValidationResult.Error(errors)
    }
}
```

### 3. **Gestion des états**

Utilisez un ViewModel avec StateFlow:
```kotlin
data class CreateActivityUiState(
    val isLoading: Boolean = false,
    val isSuccess: Boolean = false,
    val error: String? = null,
    val createdActivity: ActivityResponse? = null
)

class CreateActivityViewModel : ViewModel() {
    private val _uiState = MutableStateFlow(CreateActivityUiState())
    val uiState: StateFlow<CreateActivityUiState> = _uiState.asStateFlow()
    
    fun createActivity(request: CreateActivityRequest) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            
            when (val result = activityRepository.createActivity(request)) {
                is Result.Success -> {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        isSuccess = true,
                        createdActivity = result.data
                    )
                }
                is Result.Failure -> {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        error = result.exception.message
                    )
                }
            }
        }
    }
}
```

### 4. **Navigation après création**

Après une création réussie, vous avez deux options:

**Option 1: Utiliser l'activité retournée directement**
```kotlin
LaunchedEffect(viewModel.uiState.value.isSuccess) {
    if (viewModel.uiState.value.isSuccess) {
        val activity = viewModel.uiState.value.createdActivity
        if (activity != null) {
            // Utiliser directement l'activité retournée (pas besoin de GET)
            navController.navigate("activity/${activity.getId()}") {
                popUpTo("createActivity") { inclusive = true }
            }
        }
    }
}
```

**Option 2: Récupérer l'activité avec GET (si besoin de données fraîches)**
```kotlin
LaunchedEffect(viewModel.uiState.value.isSuccess) {
    if (viewModel.uiState.value.isSuccess) {
        val activityId = viewModel.uiState.value.createdActivity?.getId()
        if (activityId != null) {
            // Récupérer l'activité depuis l'API
            viewModelScope.launch {
                val activity = activityRepository.getActivity(activityId)
                // Naviguer vers l'écran de détails
                navController.navigate("activity/$activityId") {
                    popUpTo("createActivity") { inclusive = true }
                }
            }
        }
    }
}
```

**Note:** L'endpoint `POST /activities` retourne déjà l'activité complète avec le créateur populé, donc vous pouvez utiliser directement cette réponse sans faire un appel GET supplémentaire.

---

## 📋 Checklist d'implémentation

- [ ] Configuration Retrofit avec base URL et intercepteur pour le token
- [ ] Data classes pour CreateActivityRequest et ActivityResponse
- [ ] Enums pour SportType, SkillLevel, Visibility
- [ ] Repository pour gérer l'appel API (create + get)
- [ ] ViewModel avec StateFlow pour gérer l'état
- [ ] UI Formulaire avec tous les champs requis
- [ ] Validation côté client avant envoi
- [ ] Gestion des erreurs avec affichage de messages
- [ ] Loading state pendant la requête
- [ ] Formatage correct des dates (ISO 8601)
- [ ] Navigation après création réussie vers l'écran de détails
- [ ] Écran de détails d'activité (utilise GET /activities/:id)
- [ ] Gestion des champs optionnels (description, latitude, longitude)
- [ ] Support de la sélection de localisation depuis une carte (optionnel)

---

## 🔗 Autres Endpoints Utiles

### **Récupérer une activité spécifique** ⭐ (Utilisé après création)
`GET /activities/:id`

**Pas d'authentification requise** (activité publique)

**Réponse (200 OK):**
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "creator": {
    "_id": "507f1f77bcf86cd799439012",
    "name": "John Doe",
    "email": "john@example.com",
    "profileImageUrl": "https://..."
  },
  "sportType": "Football",
  "title": "Weekend Football Match",
  "description": "Join us for a friendly football match this weekend!",
  "location": "Central Park, New York",
  "latitude": 40.785091,
  "longitude": -73.968285,
  "date": "2025-11-15T00:00:00.000Z",
  "time": "2025-11-15T14:30:00.000Z",
  "participants": 10,
  "level": "Intermediate",
  "visibility": "public",
  "createdAt": "2025-11-13T16:09:34.000Z",
  "updatedAt": "2025-11-13T16:09:34.000Z"
}
```

**Exemple Kotlin:**
```kotlin
@GET("activities/{id}")
suspend fun getActivity(
    @Path("id") activityId: String
): Response<ActivityResponse>
```

**Utilisation après création:**
```kotlin
// Après création réussie, récupérer l'ID de la réponse
val activityId = createdActivity.getId()

// Naviguer vers l'écran de détails
navController.navigate("activity/$activityId")

// Ou récupérer à nouveau depuis l'API si nécessaire
val activity = activityApiService.getActivity(activityId)
```

---

### Récupérer toutes les activités
`GET /activities?visibility=public`

**Query Parameters:**
- `visibility` (optionnel): "public" ou "friends"

**Pas d'authentification requise** pour `visibility=public`

---

### Récupérer mes activités
`GET /activities/my-activities` 

**Nécessite authentification** - Retourne toutes les activités créées par l'utilisateur connecté

---

### Mettre à jour une activité
`PATCH /activities/:id` 

**Nécessite authentification** - Seulement le créateur peut modifier

---

### Supprimer une activité
`DELETE /activities/:id` 

**Nécessite authentification** - Seulement le créateur peut supprimer

---

## 📚 Documentation Swagger

Pour tester les endpoints et voir les schémas complets:
```
https://apinest-production.up.railway.app/docs
```

---

## 💡 Exemple Complet Kotlin

```kotlin
// Repository
class ActivityRepository(private val api: ActivityApiService) {
    suspend fun createActivity(request: CreateActivityRequest): Result<ActivityResponse> {
        return try {
            val token = AuthStore.getAccessToken() // Votre système d'auth
            val response = api.createActivity(
                request,
                "Bearer $token"
            )
            
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                val error = response.errorBody()?.string() ?: "Unknown error"
                Result.failure(Exception(error))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}

// ViewModel
class CreateActivityViewModel(
    private val repository: ActivityRepository
) : ViewModel() {
    private val _uiState = MutableStateFlow(CreateActivityUiState())
    val uiState = _uiState.asStateFlow()
    
    fun createActivity(
        sportType: SportType,
        title: String,
        description: String?,
        location: String,
        latitude: Double?,
        longitude: Double?,
        date: LocalDate,
        time: LocalTime,
        participants: Int,
        level: SkillLevel,
        visibility: Visibility
    ) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            
            val dateString = date.format(DateTimeFormatter.ISO_DATE)
            val timeString = LocalDateTime.of(date, time)
                .atZone(ZoneId.systemDefault())
                .toInstant()
                .toString()
            
            val request = CreateActivityRequest(
                sportType = sportType.value,
                title = title,
                description = description,
                location = location,
                latitude = latitude,
                longitude = longitude,
                date = dateString,
                time = timeString,
                participants = participants,
                level = level.value,
                visibility = visibility.value
            )
            
            when (val result = repository.createActivity(request)) {
                is Result.Success -> {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        isSuccess = true,
                        createdActivity = result.data
                    )
                }
                is Result.Failure -> {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        error = result.exception.message
                    )
                }
            }
        }
    }
}
```


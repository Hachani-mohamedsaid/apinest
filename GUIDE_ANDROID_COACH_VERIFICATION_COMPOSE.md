# 📱 Guide Android Jetpack Compose - Vérification Coach avec AI (ChatGPT)

## 🎯 Vue d'Ensemble

Ce guide explique comment implémenter la vérification de coach avec ChatGPT dans une application Android avec Jetpack Compose. Cette fonctionnalité permet de vérifier si un utilisateur est un coach professionnel en analysant les données du formulaire et les documents/images fournis.

### Fonctionnalités

- ✅ Envoi des données du formulaire de vérification
- ✅ Upload de documents/images (certifications, ID, licences)
- ✅ Analyse par ChatGPT (OpenAI)
- ✅ Affichage du résultat avec score de confiance
- ✅ Affichage des raisons de vérification
- ✅ Gestion des erreurs et mode fallback

---

## 🏗️ Architecture

### Structure des Couches

```
📁 data/
  ├── 📁 remote/
  │   ├── CoachVerificationApiService.kt      # Interface Retrofit
  │   └── CoachVerificationRemoteDataSource.kt # Data source remote
  ├── 📁 repository/
  │   └── CoachVerificationRepositoryImpl.kt   # Implémentation du repository
  └── 📁 dto/
      ├── CoachVerificationRequestDto.kt      # DTO pour la requête
      └── CoachVerificationResponseDto.kt     # DTO pour la réponse

📁 domain/
  ├── 📁 model/
  │   ├── CoachVerificationRequest.kt         # Modèle de requête
  │   └── CoachVerificationResult.kt          # Modèle de résultat
  ├── 📁 repository/
  │   └── CoachVerificationRepository.kt      # Interface repository
  └── 📁 usecase/
      └── VerifyCoachWithAIUseCase.kt

📁 presentation/
  ├── 📁 coachverification/
  │   ├── CoachVerificationViewModel.kt       # ViewModel
  │   ├── CoachVerificationScreen.kt          # Screen principal
  │   ├── VerificationForm.kt                 # Formulaire de vérification
  │   ├── DocumentUploadSection.kt            # Section upload documents
  │   └── VerificationResultDialog.kt         # Dialog de résultat
```

---

## 📦 Data Layer

### 1. DTOs (Data Transfer Objects)

#### CoachVerificationRequestDto.kt

```kotlin
package com.yourapp.data.dto

import com.google.gson.annotations.SerializedName

data class CoachVerificationRequestDto(
    @SerializedName("userType")
    val userType: String,
    
    @SerializedName("fullName")
    val fullName: String,
    
    @SerializedName("email")
    val email: String,
    
    @SerializedName("about")
    val about: String,
    
    @SerializedName("specialization")
    val specialization: String,
    
    @SerializedName("yearsOfExperience")
    val yearsOfExperience: String,
    
    @SerializedName("certifications")
    val certifications: String,
    
    @SerializedName("location")
    val location: String,
    
    @SerializedName("documents")
    val documents: List<String>, // URLs des images/documents
    
    @SerializedName("note")
    val note: String? = null
)
```

#### DocumentAnalysisResultDto.kt

```kotlin
package com.yourapp.data.dto

import com.google.gson.annotations.SerializedName

data class DocumentAnalysisResultDto(
    @SerializedName("documentsVerified")
    val documentsVerified: Int,
    
    @SerializedName("totalDocuments")
    val totalDocuments: Int,
    
    @SerializedName("documentTypes")
    val documentTypes: List<String>,
    
    @SerializedName("isValid")
    val isValid: Boolean
)
```

#### CoachVerificationResponseDto.kt

```kotlin
package com.yourapp.data.dto

import com.google.gson.annotations.SerializedName

data class CoachVerificationResponseDto(
    @SerializedName("isCoach")
    val isCoach: Boolean,
    
    @SerializedName("confidenceScore")
    val confidenceScore: Double, // 0.0 à 1.0
    
    @SerializedName("verificationReasons")
    val verificationReasons: List<String>,
    
    @SerializedName("aiAnalysis")
    val aiAnalysis: String? = null,
    
    @SerializedName("documentAnalysis")
    val documentAnalysis: DocumentAnalysisResultDto? = null
)
```

### 2. API Service (Retrofit)

#### CoachVerificationApiService.kt

```kotlin
package com.yourapp.data.remote

import com.yourapp.data.dto.CoachVerificationRequestDto
import com.yourapp.data.dto.CoachVerificationResponseDto
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.Header
import retrofit2.http.POST

interface CoachVerificationApiService {
    
    @POST("coach-verification/verify-with-ai")
    suspend fun verifyCoachWithAI(
        @Header("Authorization") token: String,
        @Body request: CoachVerificationRequestDto
    ): Response<CoachVerificationResponseDto>
}
```

### 3. Remote Data Source

#### CoachVerificationRemoteDataSource.kt

```kotlin
package com.yourapp.data.remote

import com.yourapp.data.dto.CoachVerificationRequestDto
import com.yourapp.data.dto.CoachVerificationResponseDto
import javax.inject.Inject

class CoachVerificationRemoteDataSource @Inject constructor(
    private val apiService: CoachVerificationApiService
) {
    suspend fun verifyCoachWithAI(
        token: String,
        request: CoachVerificationRequestDto
    ): Result<CoachVerificationResponseDto> {
        return try {
            val response = apiService.verifyCoachWithAI(
                token = "Bearer $token",
                request = request
            )
            
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(
                    Exception("Error: ${response.code()} - ${response.message()}")
                )
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
```

### 4. Repository Implementation

#### CoachVerificationRepositoryImpl.kt

```kotlin
package com.yourapp.data.repository

import com.yourapp.data.dto.CoachVerificationRequestDto
import com.yourapp.data.dto.CoachVerificationResponseDto
import com.yourapp.data.remote.CoachVerificationRemoteDataSource
import com.yourapp.domain.model.CoachVerificationRequest
import com.yourapp.domain.model.CoachVerificationResult
import com.yourapp.domain.repository.CoachVerificationRepository
import javax.inject.Inject

class CoachVerificationRepositoryImpl @Inject constructor(
    private val remoteDataSource: CoachVerificationRemoteDataSource
) : CoachVerificationRepository {
    
    override suspend fun verifyCoachWithAI(
        token: String,
        request: CoachVerificationRequest
    ): Result<CoachVerificationResult> {
        val requestDto = CoachVerificationRequestDto(
            userType = request.userType,
            fullName = request.fullName,
            email = request.email,
            about = request.about,
            specialization = request.specialization,
            yearsOfExperience = request.yearsOfExperience,
            certifications = request.certifications,
            location = request.location,
            documents = request.documents,
            note = request.note
        )
        
        return remoteDataSource.verifyCoachWithAI(token, requestDto)
            .map { response ->
                CoachVerificationResult(
                    isCoach = response.isCoach,
                    confidenceScore = response.confidenceScore,
                    verificationReasons = response.verificationReasons,
                    aiAnalysis = response.aiAnalysis,
                    documentAnalysis = response.documentAnalysis?.let {
                        com.yourapp.domain.model.DocumentAnalysisResult(
                            documentsVerified = it.documentsVerified,
                            totalDocuments = it.totalDocuments,
                            documentTypes = it.documentTypes,
                            isValid = it.isValid
                        )
                    }
                )
            }
    }
}
```

---

## 🎯 Domain Layer

### 1. Models

#### CoachVerificationRequest.kt

```kotlin
package com.yourapp.domain.model

data class CoachVerificationRequest(
    val userType: String,
    val fullName: String,
    val email: String,
    val about: String,
    val specialization: String,
    val yearsOfExperience: String,
    val certifications: String,
    val location: String,
    val documents: List<String>, // URLs des images/documents
    val note: String? = null
)
```

#### CoachVerificationResult.kt

```kotlin
package com.yourapp.domain.model

data class CoachVerificationResult(
    val isCoach: Boolean,
    val confidenceScore: Double, // 0.0 à 1.0
    val verificationReasons: List<String>,
    val aiAnalysis: String? = null,
    val documentAnalysis: DocumentAnalysisResult? = null
)

data class DocumentAnalysisResult(
    val documentsVerified: Int,
    val totalDocuments: Int,
    val documentTypes: List<String>,
    val isValid: Boolean
)
```

### 2. Repository Interface

#### CoachVerificationRepository.kt

```kotlin
package com.yourapp.domain.repository

import com.yourapp.domain.model.CoachVerificationRequest
import com.yourapp.domain.model.CoachVerificationResult

interface CoachVerificationRepository {
    suspend fun verifyCoachWithAI(
        token: String,
        request: CoachVerificationRequest
    ): Result<CoachVerificationResult>
}
```

### 3. Use Case

#### VerifyCoachWithAIUseCase.kt

```kotlin
package com.yourapp.domain.usecase

import com.yourapp.domain.model.CoachVerificationRequest
import com.yourapp.domain.model.CoachVerificationResult
import com.yourapp.domain.repository.CoachVerificationRepository
import javax.inject.Inject

class VerifyCoachWithAIUseCase @Inject constructor(
    private val repository: CoachVerificationRepository
) {
    suspend operator fun invoke(
        token: String,
        request: CoachVerificationRequest
    ): Result<CoachVerificationResult> {
        return repository.verifyCoachWithAI(token, request)
    }
}
```

---

## 🎨 Presentation Layer

### 1. ViewModel

#### CoachVerificationViewModel.kt

```kotlin
package com.yourapp.presentation.coachverification

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.yourapp.domain.model.CoachVerificationRequest
import com.yourapp.domain.model.CoachVerificationResult
import com.yourapp.domain.usecase.VerifyCoachWithAIUseCase
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class CoachVerificationViewModel @Inject constructor(
    private val verifyCoachWithAIUseCase: VerifyCoachWithAIUseCase
) : ViewModel() {
    
    private val _uiState = MutableStateFlow<CoachVerificationUiState>(
        CoachVerificationUiState.Idle
    )
    val uiState: StateFlow<CoachVerificationUiState> = _uiState.asStateFlow()
    
    fun verifyCoach(
        token: String,
        userType: String,
        fullName: String,
        email: String,
        about: String,
        specialization: String,
        yearsOfExperience: String,
        certifications: String,
        location: String,
        documents: List<String>,
        note: String? = null
    ) {
        viewModelScope.launch {
            _uiState.value = CoachVerificationUiState.Loading
            
            val request = CoachVerificationRequest(
                userType = userType,
                fullName = fullName,
                email = email,
                about = about,
                specialization = specialization,
                yearsOfExperience = yearsOfExperience,
                certifications = certifications,
                location = location,
                documents = documents,
                note = note
            )
            
            verifyCoachWithAIUseCase(token, request)
                .onSuccess { result ->
                    _uiState.value = CoachVerificationUiState.Success(result)
                }
                .onFailure { error ->
                    _uiState.value = CoachVerificationUiState.Error(
                        error.message ?: "Une erreur est survenue"
                    )
                }
        }
    }
    
    fun resetState() {
        _uiState.value = CoachVerificationUiState.Idle
    }
}

sealed class CoachVerificationUiState {
    object Idle : CoachVerificationUiState()
    object Loading : CoachVerificationUiState()
    data class Success(val result: CoachVerificationResult) : CoachVerificationUiState()
    data class Error(val message: String) : CoachVerificationUiState()
}
```

### 2. Screen Principal

#### CoachVerificationScreen.kt

```kotlin
package com.yourapp.presentation.coachverification

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CoachVerificationScreen(
    token: String,
    viewModel: CoachVerificationViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    
    var userType by remember { mutableStateOf("") }
    var fullName by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var about by remember { mutableStateOf("") }
    var specialization by remember { mutableStateOf("") }
    var yearsOfExperience by remember { mutableStateOf("") }
    var certifications by remember { mutableStateOf("") }
    var location by remember { mutableStateOf("") }
    var note by remember { mutableStateOf("") }
    var documents by remember { mutableStateOf<List<String>>(emptyList()) }
    
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Vérification Coach") }
            )
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Formulaire
            OutlinedTextField(
                value = userType,
                onValueChange = { userType = it },
                label = { Text("Type d'utilisateur") },
                modifier = Modifier.fillMaxWidth(),
                placeholder = { Text("Coach / Trainer") }
            )
            
            OutlinedTextField(
                value = fullName,
                onValueChange = { fullName = it },
                label = { Text("Nom complet") },
                modifier = Modifier.fillMaxWidth()
            )
            
            OutlinedTextField(
                value = email,
                onValueChange = { email = it },
                label = { Text("Email") },
                modifier = Modifier.fillMaxWidth()
            )
            
            OutlinedTextField(
                value = about,
                onValueChange = { about = it },
                label = { Text("À propos") },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(120.dp),
                maxLines = 5
            )
            
            OutlinedTextField(
                value = specialization,
                onValueChange = { specialization = it },
                label = { Text("Spécialisation") },
                modifier = Modifier.fillMaxWidth()
            )
            
            OutlinedTextField(
                value = yearsOfExperience,
                onValueChange = { yearsOfExperience = it },
                label = { Text("Années d'expérience") },
                modifier = Modifier.fillMaxWidth()
            )
            
            OutlinedTextField(
                value = certifications,
                onValueChange = { certifications = it },
                label = { Text("Certifications") },
                modifier = Modifier.fillMaxWidth()
            )
            
            OutlinedTextField(
                value = location,
                onValueChange = { location = it },
                label = { Text("Localisation") },
                modifier = Modifier.fillMaxWidth()
            )
            
            OutlinedTextField(
                value = note,
                onValueChange = { note = it },
                label = { Text("Note additionnelle (optionnel)") },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(100.dp),
                maxLines = 3
            )
            
            // Section upload documents
            DocumentUploadSection(
                documents = documents,
                onDocumentsChanged = { documents = it }
            )
            
            // Bouton de vérification
            Button(
                onClick = {
                    viewModel.verifyCoach(
                        token = token,
                        userType = userType,
                        fullName = fullName,
                        email = email,
                        about = about,
                        specialization = specialization,
                        yearsOfExperience = yearsOfExperience,
                        certifications = certifications,
                        location = location,
                        documents = documents,
                        note = note.takeIf { it.isNotBlank() }
                    )
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp),
                enabled = uiState !is CoachVerificationUiState.Loading &&
                        userType.isNotBlank() &&
                        fullName.isNotBlank() &&
                        email.isNotBlank() &&
                        about.isNotBlank() &&
                        specialization.isNotBlank() &&
                        yearsOfExperience.isNotBlank() &&
                        certifications.isNotBlank() &&
                        location.isNotBlank()
            ) {
                when (uiState) {
                    is CoachVerificationUiState.Loading -> {
                        CircularProgressIndicator(
                            modifier = Modifier.size(24.dp),
                            color = MaterialTheme.colorScheme.onPrimary
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Vérification en cours...")
                    }
                    else -> Text("Vérifier avec AI")
                }
            }
            
            // Affichage des résultats
            when (uiState) {
                is CoachVerificationUiState.Success -> {
                    VerificationResultDialog(
                        result = uiState.result,
                        onDismiss = { viewModel.resetState() }
                    )
                }
                is CoachVerificationUiState.Error -> {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(
                            containerColor = MaterialTheme.colorScheme.errorContainer
                        )
                    ) {
                        Text(
                            text = "Erreur: ${uiState.message}",
                            modifier = Modifier.padding(16.dp),
                            color = MaterialTheme.colorScheme.onErrorContainer
                        )
                    }
                }
                else -> {}
            }
        }
    }
}
```

### 3. Section Upload Documents

#### DocumentUploadSection.kt

```kotlin
package com.yourapp.presentation.coachverification

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

@Composable
fun DocumentUploadSection(
    documents: List<String>,
    onDocumentsChanged: (List<String>) -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Text(
                text = "Documents (Certifications, ID, Licences)",
                style = MaterialTheme.typography.titleMedium
            )
            
            Text(
                text = "Ajoutez les URLs de vos documents",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            
            // Liste des documents
            if (documents.isNotEmpty()) {
                LazyRow(
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(documents) { docUrl ->
                        DocumentChip(
                            url = docUrl,
                            onRemove = {
                                onDocumentsChanged(documents - docUrl)
                            }
                        )
                    }
                }
            }
            
            // Bouton pour ajouter un document
            OutlinedButton(
                onClick = {
                    // TODO: Implémenter la sélection d'image/fichier
                    // Pour l'instant, on peut ajouter une URL manuellement
                    // Dans une vraie app, vous utiliseriez un file picker
                },
                modifier = Modifier.fillMaxWidth()
            ) {
                Text("Ajouter un document")
            }
        }
    }
}

@Composable
fun DocumentChip(
    url: String,
    onRemove: () -> Unit
) {
    Surface(
        shape = MaterialTheme.shapes.small,
        color = MaterialTheme.colorScheme.secondaryContainer
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Text(
                text = url.take(30) + if (url.length > 30) "..." else "",
                style = MaterialTheme.typography.bodySmall
            )
            IconButton(
                onClick = onRemove,
                modifier = Modifier.size(20.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.Close,
                    contentDescription = "Supprimer",
                    modifier = Modifier.size(16.dp)
                )
            }
        }
    }
}
```

### 4. Dialog de Résultat

#### VerificationResultDialog.kt

```kotlin
package com.yourapp.presentation.coachverification

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.yourapp.domain.model.CoachVerificationResult

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun VerificationResultDialog(
    result: CoachVerificationResult,
    onDismiss: () -> Unit
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Icon(
                    imageVector = if (result.isCoach) Icons.Default.CheckCircle else Icons.Default.Close,
                    contentDescription = null,
                    tint = if (result.isCoach) Color(0xFF4CAF50) else Color(0xFFF44336),
                    modifier = Modifier.size(32.dp)
                )
                Text(
                    text = if (result.isCoach) "Coach Vérifié" else "Vérification Échouée"
                )
            }
        },
        text = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                // Score de confiance
                Card(
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.primaryContainer
                    )
                ) {
                    Column(
                        modifier = Modifier.padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Text(
                            text = "Score de confiance",
                            style = MaterialTheme.typography.titleSmall
                        )
                        LinearProgressIndicator(
                            progress = { result.confidenceScore.toFloat() },
                            modifier = Modifier.fillMaxWidth(),
                            color = MaterialTheme.colorScheme.primary
                        )
                        Text(
                            text = "${(result.confidenceScore * 100).toInt()}%",
                            style = MaterialTheme.typography.bodyLarge
                        )
                    }
                }
                
                // Raisons de vérification
                if (result.verificationReasons.isNotEmpty()) {
                    Text(
                        text = "Raisons de vérification:",
                        style = MaterialTheme.typography.titleSmall
                    )
                    result.verificationReasons.forEach { reason ->
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Text("•", style = MaterialTheme.typography.bodyMedium)
                            Text(
                                text = reason,
                                style = MaterialTheme.typography.bodyMedium
                            )
                        }
                    }
                }
                
                // Analyse AI
                result.aiAnalysis?.let { analysis ->
                    Card(
                        colors = CardDefaults.cardColors(
                            containerColor = MaterialTheme.colorScheme.surfaceVariant
                        )
                    ) {
                        Column(
                            modifier = Modifier.padding(16.dp),
                            verticalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Text(
                                text = "Analyse AI:",
                                style = MaterialTheme.typography.titleSmall
                            )
                            Text(
                                text = analysis,
                                style = MaterialTheme.typography.bodyMedium
                            )
                        }
                    }
                }
                
                // Analyse des documents
                result.documentAnalysis?.let { docAnalysis ->
                    Card(
                        colors = CardDefaults.cardColors(
                            containerColor = MaterialTheme.colorScheme.secondaryContainer
                        )
                    ) {
                        Column(
                            modifier = Modifier.padding(16.dp),
                            verticalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Text(
                                text = "Analyse des documents:",
                                style = MaterialTheme.typography.titleSmall
                            )
                            Text(
                                text = "${docAnalysis.documentsVerified}/${docAnalysis.totalDocuments} document(s) vérifié(s)",
                                style = MaterialTheme.typography.bodyMedium
                            )
                            if (docAnalysis.documentTypes.isNotEmpty()) {
                                Text(
                                    text = "Types: ${docAnalysis.documentTypes.joinToString(", ")}",
                                    style = MaterialTheme.typography.bodySmall
                                )
                            }
                        }
                    }
                }
            }
        },
        confirmButton = {
            TextButton(onClick = onDismiss) {
                Text("Fermer")
            }
        }
    )
}
```

---

## 🔧 Configuration Retrofit

### NetworkModule.kt (Hilt)

```kotlin
package com.yourapp.di

import com.yourapp.data.remote.CoachVerificationApiService
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {
    
    private const val BASE_URL = "https://apinest-production.up.railway.app/"
    
    @Provides
    @Singleton
    fun provideOkHttpClient(): OkHttpClient {
        val loggingInterceptor = HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BODY
        }
        
        return OkHttpClient.Builder()
            .addInterceptor(loggingInterceptor)
            .build()
    }
    
    @Provides
    @Singleton
    fun provideRetrofit(okHttpClient: OkHttpClient): Retrofit {
        return Retrofit.Builder()
            .baseUrl(BASE_URL)
            .client(okHttpClient)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
    }
    
    @Provides
    @Singleton
    fun provideCoachVerificationApiService(
        retrofit: Retrofit
    ): CoachVerificationApiService {
        return retrofit.create(CoachVerificationApiService::class.java)
    }
}
```

### RepositoryModule.kt (Hilt)

```kotlin
package com.yourapp.di

import com.yourapp.data.repository.CoachVerificationRepositoryImpl
import com.yourapp.domain.repository.CoachVerificationRepository
import dagger.Binds
import dagger.Module
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
abstract class RepositoryModule {
    
    @Binds
    @Singleton
    abstract fun bindCoachVerificationRepository(
        coachVerificationRepositoryImpl: CoachVerificationRepositoryImpl
    ): CoachVerificationRepository
}
```

---

## 📝 Utilisation

### Dans votre Navigation

```kotlin
@Composable
fun AppNavigation(
    token: String
) {
    NavHost(
        navController = navController,
        startDestination = "home"
    ) {
        composable("coach-verification") {
            CoachVerificationScreen(token = token)
        }
    }
}
```

---

## 🔐 Authentification

**Important :** L'endpoint nécessite un token JWT. Assurez-vous de :

1. Récupérer le token après le login
2. Le stocker de manière sécurisée (SharedPreferences avec encryption, ou DataStore)
3. L'inclure dans chaque requête avec le header `Authorization: Bearer <token>`

### Exemple de gestion du token

```kotlin
// Dans votre AuthManager ou TokenManager
class TokenManager @Inject constructor(
    private val dataStore: DataStore<Preferences>
) {
    suspend fun getToken(): String? {
        return dataStore.data.first()[stringPreferencesKey("auth_token")]
    }
    
    suspend fun saveToken(token: String) {
        dataStore.edit { preferences ->
            preferences[stringPreferencesKey("auth_token")] = token
        }
    }
}
```

---

## 🎨 Améliorations Possibles

### 1. Upload de fichiers réels ✅

**L'endpoint d'upload est maintenant disponible !** 

Consultez le guide complet : **[GUIDE_UPLOAD_DOCUMENTS_VERIFICATION_AI.md](../GUIDE_UPLOAD_DOCUMENTS_VERIFICATION_AI.md)**

L'endpoint `POST /files/upload` permet d'uploader des images (JPG, PNG, GIF, WEBP) et des PDFs (max 10MB). Les fichiers sont stockés via imgbb et l'URL est retournée pour être utilisée dans la vérification.

**Exemple d'utilisation :**
```kotlin
// Voir le guide complet pour l'implémentation complète
val response = fileUploadApiService.uploadFile(token, file)
val documentUrl = response.body()?.url
```

### 2. Gestion d'images avec Coil

```kotlin
// Ajouter dans build.gradle.kts
implementation("io.coil-kt:coil-compose:2.5.0")

// Dans votre composable
AsyncImage(
    model = documentUrl,
    contentDescription = "Document",
    modifier = Modifier.size(100.dp)
)
```

### 3. Validation des champs

Ajoutez une validation côté client avant d'envoyer la requête :

```kotlin
fun validateForm(): ValidationResult {
    return when {
        email.isBlank() || !android.util.Patterns.EMAIL_ADDRESS.matcher(email).matches() -> {
            ValidationResult.Error("Email invalide")
        }
        fullName.isBlank() -> {
            ValidationResult.Error("Le nom est requis")
        }
        // ... autres validations
        else -> ValidationResult.Success
    }
}
```

---

## 🐛 Gestion des Erreurs

Le service gère automatiquement les erreurs et retourne un mode fallback si OpenAI n'est pas configuré. Dans votre ViewModel, vous pouvez gérer différents types d'erreurs :

```kotlin
.onFailure { error ->
    val errorMessage = when {
        error.message?.contains("401") == true -> "Non autorisé. Veuillez vous reconnecter."
        error.message?.contains("400") == true -> "Données invalides. Vérifiez vos informations."
        error.message?.contains("500") == true -> "Erreur serveur. Réessayez plus tard."
        else -> error.message ?: "Une erreur est survenue"
    }
    _uiState.value = CoachVerificationUiState.Error(errorMessage)
}
```

---

## ✅ Test

Pour tester l'endpoint :

1. **Connectez-vous** et récupérez le token JWT
2. **Remplissez le formulaire** avec des données de test
3. **Ajoutez des URLs de documents** (ou laissez vide pour tester)
4. **Cliquez sur "Vérifier avec AI"**
5. **Vérifiez le résultat** dans le dialog

---

## 📚 Ressources

- [Retrofit Documentation](https://square.github.io/retrofit/)
- [Jetpack Compose Documentation](https://developer.android.com/jetpack/compose)
- [Hilt Dependency Injection](https://developer.android.com/training/dependency-injection/hilt-android)
- [Material 3 Components](https://m3.material.io/)

---

## 🎉 Résumé

Vous avez maintenant une implémentation complète de la vérification de coach avec ChatGPT dans votre application Android avec Jetpack Compose ! 

L'endpoint utilise **ChatGPT (OpenAI)** pour analyser les données et déterminer si un utilisateur est un coach professionnel, avec un score de confiance et des raisons détaillées.


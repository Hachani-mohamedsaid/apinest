# 📤 Guide : Upload de Documents et Vérification AI

Ce guide explique comment fonctionne l'upload de documents et la vérification AI dans l'application.

---

## 🎯 Fonctionnalités Implémentées

### 1. Upload de Documents

Quand l'utilisateur clique sur la zone "Upload Verification Documents" :

1. **Sélection de fichier** : Un file picker s'ouvre pour sélectionner une image (JPG, PNG, GIF, WEBP) ou un PDF
2. **Upload automatique** : Le fichier est uploadé vers le backend via `POST /files/upload`
3. **Récupération de l'URL** : L'URL du fichier uploadé est récupérée
4. **Affichage** : L'URL est ajoutée à la liste des documents et affichée dans une chip

### 2. Vérification AI au Submit

Quand l'utilisateur clique sur "Submit Application" :

1. **Vérification AI** : Les données sont envoyées à ChatGPT pour analyse
2. **Analyse** : ChatGPT analyse :
   - Le type d'utilisateur
   - La description (about)
   - La spécialisation
   - Les certifications
   - L'expérience
   - Les documents uploadés
3. **Score de confiance** : Un score entre 0.0 et 1.0 est calculé
4. **Décision** :
   - Si score ≥ 0.5 → Coach vérifié ✅
   - Si score < 0.5 → Pas un coach ❌
5. **Soumission** : Si vérifié, la demande est soumise

---

## 📁 Fichiers Créés/Modifiés

### Fichiers Backend Créés

1. **`src/modules/files/files.service.ts`** - Service pour uploader des fichiers
2. **`src/modules/files/files.controller.ts`** - Controller pour l'endpoint d'upload
3. **`src/modules/files/files.module.ts`** - Module NestJS
4. **`src/modules/files/dto/upload-file-response.dto.ts`** - DTO de réponse

### Fichiers Frontend (Android) à Créer

1. **`FileUploadApiService.kt`** - Service API pour uploader des fichiers
2. **`UploadVerificationDocument.kt`** - Use case pour uploader un document
3. **`DocumentUploadSection.kt`** - Composable pour la section d'upload (mise à jour)

### Fichiers Frontend (Android) à Modifier

1. **`ApplyVerificationViewModel.kt`** - Ajout de la vérification AI
2. **`ApplyVerificationScreen.kt`** - Utilisation de `DocumentUploadSection`
3. **`RetrofitClient.kt`** - Ajout de `fileUploadApiService`

---

## 🔧 Backend - Endpoints Disponibles

### Endpoint 1 : Upload de Fichier

```
POST /files/upload
```

**Headers :**
- `Authorization: Bearer <token>`
- `Content-Type: multipart/form-data`

**Body (Form Data) :**
- `file`: Fichier (image ou PDF)

**Types de fichiers acceptés :**
- Images : JPG, JPEG, PNG, GIF, WEBP
- Documents : PDF
- Taille maximale : 10MB

**Réponse (200 OK) :**
```json
{
  "url": "https://i.ibb.co/example/document.pdf",
  "fileName": "document.pdf",
  "fileType": "application/pdf",
  "fileSize": 123456
}
```

**Erreurs possibles :**
- `400 Bad Request` : Fichier invalide ou trop volumineux
- `401 Unauthorized` : Token JWT manquant ou invalide
- `500 Internal Server Error` : Service d'upload non configuré

### Endpoint 2 : Vérification AI

```
POST /coach-verification/verify-with-ai
```

**Headers :**
- `Authorization: Bearer <token>`
- `Content-Type: application/json`

**Body :**
```json
{
  "userType": "Coach / Trainer",
  "fullName": "John Doe",
  "email": "john@example.com",
  "about": "Certified personal trainer with 5 years of experience",
  "specialization": "Running, Fitness",
  "yearsOfExperience": "5",
  "certifications": "NASM CPT, ACE",
  "location": "Paris, France",
  "documents": [
    "https://i.ibb.co/example/cert.pdf",
    "https://i.ibb.co/example/id.jpg"
  ],
  "note": "Optional note"
}
```

**Réponse (200 OK) :**
```json
{
  "isCoach": true,
  "confidenceScore": 0.85,
  "verificationReasons": [
    "Type d'utilisateur: Coach/Trainer",
    "Spécialisation fournie: Running, Fitness",
    "Certifications fournies",
    "2 document(s) de vérification fourni(s)"
  ],
  "aiAnalysis": "Analyse détaillée par ChatGPT...",
  "documentAnalysis": {
    "documentsVerified": 2,
    "totalDocuments": 2,
    "documentTypes": ["certification", "id"],
    "isValid": true
  }
}
```

**Erreurs possibles :**
- `400 Bad Request` : Données invalides
- `401 Unauthorized` : Token JWT manquant ou invalide
- `500 Internal Server Error` : Erreur OpenAI ou serveur

---

## 📱 Frontend Android - Implémentation

### 1. Service API pour Upload

#### FileUploadApiService.kt

```kotlin
package com.yourapp.data.remote

import com.yourapp.data.dto.UploadFileResponseDto
import okhttp3.MultipartBody
import retrofit2.Response
import retrofit2.http.Header
import retrofit2.http.Multipart
import retrofit2.http.POST
import retrofit2.http.Part

interface FileUploadApiService {
    
    @Multipart
    @POST("files/upload")
    suspend fun uploadFile(
        @Header("Authorization") token: String,
        @Part file: MultipartBody.Part
    ): Response<UploadFileResponseDto>
}
```

#### UploadFileResponseDto.kt

```kotlin
package com.yourapp.data.dto

import com.google.gson.annotations.SerializedName

data class UploadFileResponseDto(
    @SerializedName("url")
    val url: String,
    
    @SerializedName("fileName")
    val fileName: String,
    
    @SerializedName("fileType")
    val fileType: String,
    
    @SerializedName("fileSize")
    val fileSize: Long
)
```

### 2. Remote Data Source

#### FileUploadRemoteDataSource.kt

```kotlin
package com.yourapp.data.remote

import com.yourapp.data.dto.UploadFileResponseDto
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.asRequestBody
import java.io.File
import javax.inject.Inject

class FileUploadRemoteDataSource @Inject constructor(
    private val apiService: FileUploadApiService
) {
    suspend fun uploadFile(
        token: String,
        file: File
    ): Result<UploadFileResponseDto> {
        return try {
            val requestFile = file.asRequestBody(
                "multipart/form-data".toMediaTypeOrNull()
            )
            
            val multipartBody = MultipartBody.Part.createFormData(
                "file",
                file.name,
                requestFile
            )
            
            val response = apiService.uploadFile(
                token = "Bearer $token",
                file = multipartBody
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

### 3. Use Case

#### UploadVerificationDocument.kt

```kotlin
package com.yourapp.domain.usecase

import com.yourapp.data.dto.UploadFileResponseDto
import com.yourapp.data.remote.FileUploadRemoteDataSource
import java.io.File
import javax.inject.Inject

class UploadVerificationDocument @Inject constructor(
    private val remoteDataSource: FileUploadRemoteDataSource
) {
    suspend operator fun invoke(
        token: String,
        file: File
    ): Result<UploadFileResponseDto> {
        return remoteDataSource.uploadFile(token, file)
    }
}
```

### 4. Composable avec File Picker

#### DocumentUploadSection.kt (Mise à jour)

```kotlin
package com.yourapp.presentation.coachverification

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import com.yourapp.domain.usecase.UploadVerificationDocument
import java.io.File

@Composable
fun DocumentUploadSection(
    documents: List<String>,
    onDocumentsChanged: (List<String>) -> Unit,
    token: String,
    uploadUseCase: UploadVerificationDocument,
    onUploadError: (String) -> Unit
) {
    val context = LocalContext.current
    var isUploading by remember { mutableStateOf(false) }
    
    val filePickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri ->
        uri?.let {
            isUploading = true
            // Convertir URI en File (vous devrez peut-être utiliser un FileProvider)
            // Pour simplifier, on suppose que vous avez une fonction pour convertir URI -> File
            val file = getFileFromUri(context, it)
            
            if (file != null) {
                // Uploader le fichier
                kotlinx.coroutines.CoroutineScope(
                    kotlinx.coroutines.Dispatchers.IO
                ).launch {
                    uploadUseCase(token, file)
                        .onSuccess { response ->
                            onDocumentsChanged(documents + response.url)
                            isUploading = false
                        }
                        .onFailure { error ->
                            onUploadError(error.message ?: "Erreur lors de l'upload")
                            isUploading = false
                        }
                }
            } else {
                onUploadError("Impossible de lire le fichier")
                isUploading = false
            }
        }
    }
    
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
                text = "Ajoutez vos documents (images ou PDFs, max 10MB)",
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
                    filePickerLauncher.launch("*/*")
                },
                modifier = Modifier.fillMaxWidth(),
                enabled = !isUploading
            ) {
                if (isUploading) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(20.dp),
                        color = MaterialTheme.colorScheme.primary
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Upload en cours...")
                } else {
                    Text("Ajouter un document")
                }
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

// Fonction helper pour convertir URI en File
fun getFileFromUri(context: Context, uri: Uri): File? {
    // Implémentation dépend de votre configuration
    // Vous pouvez utiliser FileProvider ou copier le fichier
    return try {
        val inputStream = context.contentResolver.openInputStream(uri)
        val file = File(context.cacheDir, "temp_${System.currentTimeMillis()}")
        inputStream?.use { input ->
            file.outputStream().use { output ->
                input.copyTo(output)
            }
        }
        file
    } catch (e: Exception) {
        null
    }
}
```

### 5. ViewModel avec Vérification AI

#### ApplyVerificationViewModel.kt (Mise à jour)

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
class ApplyVerificationViewModel @Inject constructor(
    private val verifyCoachWithAIUseCase: VerifyCoachWithAIUseCase
) : ViewModel() {
    
    private val _uiState = MutableStateFlow<VerificationUiState>(
        VerificationUiState.Idle
    )
    val uiState: StateFlow<VerificationUiState> = _uiState.asStateFlow()
    
    fun verifyAndSubmit(
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
            _uiState.value = VerificationUiState.Verifying
            
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
                    if (result.isCoach && result.confidenceScore >= 0.5) {
                        // Coach vérifié, soumettre la demande
                        _uiState.value = VerificationUiState.Verified(result)
                    } else {
                        // Pas un coach
                        _uiState.value = VerificationUiState.NotVerified(
                            result,
                            "Score de confiance insuffisant: ${(result.confidenceScore * 100).toInt()}%"
                        )
                    }
                }
                .onFailure { error ->
                    _uiState.value = VerificationUiState.Error(
                        error.message ?: "Une erreur est survenue lors de la vérification"
                    )
                }
        }
    }
    
    fun resetState() {
        _uiState.value = VerificationUiState.Idle
    }
}

sealed class VerificationUiState {
    object Idle : VerificationUiState()
    object Verifying : VerificationUiState()
    data class Verified(val result: CoachVerificationResult) : VerificationUiState()
    data class NotVerified(
        val result: CoachVerificationResult,
        val message: String
    ) : VerificationUiState()
    data class Error(val message: String) : VerificationUiState()
}
```

---

## 🎨 Flow Complet

```
1. Utilisateur remplit le formulaire de vérification
   ↓
2. Utilisateur clique sur "Upload Verification Documents"
   ↓
3. File picker s'ouvre
   ↓
4. Utilisateur sélectionne image/PDF
   ↓
5. Fichier uploadé automatiquement vers POST /files/upload
   ↓
6. URL récupérée et ajoutée à la liste des documents
   ↓
7. Document affiché dans une chip
   ↓
8. Utilisateur peut ajouter plusieurs documents
   ↓
9. Utilisateur clique sur "Submit Application"
   ↓
10. Vérification AI avec ChatGPT via POST /coach-verification/verify-with-ai
   ↓
11. Analyse des données + documents
   ↓
12. Score de confiance calculé
   ↓
13. Si score ≥ 0.5 → Coach vérifié ✅
    Si score < 0.5 → Pas un coach ❌
   ↓
14. Affichage du résultat avec raisons et analyse
   ↓
15. Si vérifié → Soumission de la demande
```

---

## 🔐 Configuration Backend

### Variables d'Environnement

Ajoutez dans votre `.env` :

```env
# Pour l'upload de fichiers (imgbb)
IMGBB_API_KEY=your_imgbb_api_key_here

# Pour la vérification AI (OpenAI)
OPENAI_API_KEY=your_openai_api_key_here
```

**Pour obtenir une clé IMGBB :**
1. Allez sur https://api.imgbb.com/
2. Créez un compte gratuit
3. Obtenez votre clé API
4. Ajoutez-la dans votre `.env`

**Pour obtenir une clé OpenAI :**
1. Allez sur https://platform.openai.com/api-keys
2. Créez un compte ou connectez-vous
3. Créez une nouvelle clé API
4. Ajoutez-la dans votre `.env`

---

## ✅ Checklist

### Backend ✅
- [x] Créer l'endpoint `POST /files/upload` pour uploader les fichiers
- [x] Stocker les fichiers via imgbb (service externe)
- [x] Retourner l'URL du fichier uploadé
- [x] Créer l'endpoint `POST /coach-verification/verify-with-ai`
- [x] Intégrer ChatGPT (OpenAI) pour l'analyse
- [x] Analyser les documents uploadés
- [x] Retourner le résultat avec score et raisons

### Frontend Android 📱
- [ ] Créer `FileUploadApiService.kt`
- [ ] Créer `FileUploadRemoteDataSource.kt`
- [ ] Créer `UploadVerificationDocument.kt` (Use Case)
- [ ] Mettre à jour `DocumentUploadSection.kt` avec file picker
- [ ] Mettre à jour `ApplyVerificationViewModel.kt` avec vérification AI
- [ ] Ajouter `FileUploadApiService` dans `RetrofitClient.kt`
- [ ] Tester l'upload de fichiers
- [ ] Tester la vérification AI

---

## 🧪 Test avec Postman

### Test Upload de Fichier

1. **Obtenez un token JWT** (via login)
2. **Créez une requête POST** vers `https://apinest-production.up.railway.app/files/upload`
3. **Headers :**
   ```
   Authorization: Bearer YOUR_JWT_TOKEN
   ```
4. **Body :** Sélectionnez `form-data`
   - Clé : `file` (type: File)
   - Valeur : Sélectionnez un fichier (image ou PDF)
5. **Envoyez la requête**
6. **Vérifiez la réponse** : Vous devriez recevoir l'URL du fichier

### Test Vérification AI

1. **Créez une requête POST** vers `https://apinest-production.up.railway.app/coach-verification/verify-with-ai`
2. **Headers :**
   ```
   Authorization: Bearer YOUR_JWT_TOKEN
   Content-Type: application/json
   ```
3. **Body (JSON) :**
   ```json
   {
     "userType": "Coach / Trainer",
     "fullName": "John Doe",
     "email": "john@example.com",
     "about": "Certified personal trainer with 5 years of experience",
     "specialization": "Running, Fitness",
     "yearsOfExperience": "5",
     "certifications": "NASM CPT, ACE",
     "location": "Paris, France",
     "documents": ["https://i.ibb.co/example/cert.pdf"]
   }
   ```
4. **Envoyez la requête**
5. **Vérifiez la réponse** : Vous devriez recevoir le résultat de la vérification

---

## 🚀 Résumé

L'application permet maintenant :

1. ✅ **Upload de documents** (images/PDFs) avec file picker
2. ✅ **Vérification AI** automatique au submit
3. ✅ **Score de confiance** calculé par ChatGPT
4. ✅ **Décision automatique** si c'est un coach ou non
5. ✅ **Analyse des documents** uploadés
6. ✅ **Raisons détaillées** de vérification

**Backend :** ✅ Implémenté et prêt  
**Frontend Android :** 📱 À implémenter selon ce guide

Une fois le frontend implémenté, tout fonctionnera automatiquement ! 🎉


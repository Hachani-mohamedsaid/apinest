# 🎯 Guide Pratique : Méthode Cursor dans FlutterFlow

## 📋 Vue d'Ensemble

Ce guide vous montre **étape par étape** comment utiliser **Cursor AI** pour générer du code Flutter et l'intégrer directement dans **FlutterFlow**.

---

## 🚀 Méthode Étape par Étape

### **ÉTAPE 1 : Préparer Cursor**

1. **Ouvrez Cursor** (ou installez-le si nécessaire)
2. **Créez un nouveau dossier** pour votre projet Flutter
3. **Initialisez un projet Flutter** (optionnel, pour tester le code)

```bash
flutter create test_flutterflow
cd test_flutterflow
```

### **ÉTAPE 2 : Générer le Code avec Cursor**

#### Exemple : Service API pour Vérification Coach

**Dans Cursor, créez un nouveau fichier :** `lib/services/coach_verification_service.dart`

**Prompt à donner à Cursor :**

```
Crée un service Flutter pour appeler l'API POST /coach-verification/verify-with-ai
avec les spécifications suivantes :
- Base URL: https://apinest-production.up.railway.app
- Headers: Authorization Bearer token
- Body: JSON avec userType, fullName, email, about, specialization, yearsOfExperience, certifications, location, documents (List<String>), note (optionnel)
- Gestion des erreurs HTTP (401, 400, 500)
- Retourne CoachVerificationResponse avec isCoach, confidenceScore, verificationReasons, aiAnalysis, documentAnalysis
- Utilise le package http
- Code propre et bien documenté
```

**Cursor va générer quelque chose comme :**

```dart
import 'dart:convert';
import 'package:http/http.dart' as http;

class CoachVerificationService {
  final String baseUrl = 'https://apinest-production.up.railway.app';

  Future<CoachVerificationResponse> verifyCoach({
    required String token,
    required CoachVerificationRequest request,
  }) async {
    final url = Uri.parse('$baseUrl/coach-verification/verify-with-ai');
    
    try {
      final response = await http.post(
        url,
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
        body: jsonEncode(request.toJson()),
      );

      if (response.statusCode == 200) {
        return CoachVerificationResponse.fromJson(
          jsonDecode(response.body),
        );
      } else if (response.statusCode == 401) {
        throw Exception('Non autorisé. Veuillez vous reconnecter.');
      } else if (response.statusCode == 400) {
        throw Exception('Requête invalide: ${response.body}');
      } else {
        throw Exception('Erreur serveur: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Erreur réseau: $e');
    }
  }
}
```

### **ÉTAPE 3 : Générer les Modèles de Données**

**Dans Cursor, créez :** `lib/models/coach_verification_models.dart`

**Prompt pour Cursor :**

```
Crée les modèles de données Flutter pour la vérification coach :
1. CoachVerificationRequest avec tous les champs nécessaires et méthode toJson()
2. CoachVerificationResponse avec fromJson() et tous les champs
3. DocumentAnalysisResult avec fromJson()
Utilise des classes avec factory constructors pour le parsing JSON
```

**Code généré :**

```dart
class CoachVerificationRequest {
  final String userType;
  final String fullName;
  final String email;
  final String about;
  final String specialization;
  final String yearsOfExperience;
  final String certifications;
  final String location;
  final List<String> documents;
  final String? note;

  CoachVerificationRequest({
    required this.userType,
    required this.fullName,
    required this.email,
    required this.about,
    required this.specialization,
    required this.yearsOfExperience,
    required this.certifications,
    required this.location,
    required this.documents,
    this.note,
  });

  Map<String, dynamic> toJson() => {
    'userType': userType,
    'fullName': fullName,
    'email': email,
    'about': about,
    'specialization': specialization,
    'yearsOfExperience': yearsOfExperience,
    'certifications': certifications,
    'location': location,
    'documents': documents,
    if (note != null) 'note': note,
  };
}

class CoachVerificationResponse {
  final bool isCoach;
  final double confidenceScore;
  final List<String> verificationReasons;
  final String? aiAnalysis;
  final DocumentAnalysisResult? documentAnalysis;

  CoachVerificationResponse({
    required this.isCoach,
    required this.confidenceScore,
    required this.verificationReasons,
    this.aiAnalysis,
    this.documentAnalysis,
  });

  factory CoachVerificationResponse.fromJson(Map<String, dynamic> json) {
    return CoachVerificationResponse(
      isCoach: json['isCoach'] ?? false,
      confidenceScore: (json['confidenceScore'] ?? 0.0).toDouble(),
      verificationReasons: List<String>.from(json['verificationReasons'] ?? []),
      aiAnalysis: json['aiAnalysis'],
      documentAnalysis: json['documentAnalysis'] != null
          ? DocumentAnalysisResult.fromJson(json['documentAnalysis'])
          : null,
    );
  }
}

class DocumentAnalysisResult {
  final int documentsVerified;
  final int totalDocuments;
  final List<String> documentTypes;
  final bool isValid;

  DocumentAnalysisResult({
    required this.documentsVerified,
    required this.totalDocuments,
    required this.documentTypes,
    required this.isValid,
  });

  factory DocumentAnalysisResult.fromJson(Map<String, dynamic> json) {
    return DocumentAnalysisResult(
      documentsVerified: json['documentsVerified'] ?? 0,
      totalDocuments: json['totalDocuments'] ?? 0,
      documentTypes: List<String>.from(json['documentTypes'] ?? []),
      isValid: json['isValid'] ?? false,
    );
  }
}
```

### **ÉTAPE 4 : Intégrer dans FlutterFlow**

#### **4.1 : Ajouter les Modèles de Données**

1. **Dans FlutterFlow :**
   - Allez dans **Custom Code** → **Data Types**
   - Cliquez sur **+ Add Data Type**

2. **Créez `CoachVerificationRequest` :**
   - Nom : `CoachVerificationRequest`
   - Copiez-collez le code de la classe depuis Cursor
   - Cliquez sur **Save**

3. **Créez `CoachVerificationResponse` :**
   - Nom : `CoachVerificationResponse`
   - Copiez-collez le code depuis Cursor
   - Cliquez sur **Save**

4. **Créez `DocumentAnalysisResult` :**
   - Nom : `DocumentAnalysisResult`
   - Copiez-collez le code depuis Cursor
   - Cliquez sur **Save**

#### **4.2 : Créer une Custom Action**

1. **Dans FlutterFlow :**
   - Allez dans **Custom Code** → **Actions**
   - Cliquez sur **+ Add Action**

2. **Configurez l'Action :**
   - **Name** : `verifyCoachWithAI`
   - **Return Type** : `CoachVerificationResponse`
   - **Parameters** : Ajoutez tous les paramètres nécessaires

3. **Collez le Code du Service :**

```dart
// Custom Action dans FlutterFlow
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:your_app/models/coach_verification_models.dart';

Future<CoachVerificationResponse> verifyCoachWithAI({
  required String token,
  required String userType,
  required String fullName,
  required String email,
  required String about,
  required String specialization,
  required String yearsOfExperience,
  required String certifications,
  required String location,
  required List<String> documents,
  String? note,
}) async {
  final String baseUrl = 'https://apinest-production.up.railway.app';
  final url = Uri.parse('$baseUrl/coach-verification/verify-with-ai');
  
  // Créer la requête
  final request = CoachVerificationRequest(
    userType: userType,
    fullName: fullName,
    email: email,
    about: about,
    specialization: specialization,
    yearsOfExperience: yearsOfExperience,
    certifications: certifications,
    location: location,
    documents: documents,
    note: note,
  );
  
  try {
    final response = await http.post(
      url,
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
      body: jsonEncode(request.toJson()),
    );

    if (response.statusCode == 200) {
      return CoachVerificationResponse.fromJson(
        jsonDecode(response.body),
      );
    } else if (response.statusCode == 401) {
      throw Exception('Non autorisé. Veuillez vous reconnecter.');
    } else if (response.statusCode == 400) {
      throw Exception('Requête invalide: ${response.body}');
    } else {
      throw Exception('Erreur serveur: ${response.statusCode}');
    }
  } catch (e) {
    throw Exception('Erreur réseau: $e');
  }
}
```

4. **Cliquez sur Save**

#### **4.3 : Créer l'UI dans FlutterFlow**

1. **Créez une nouvelle page** : `CoachVerificationPage`

2. **Ajoutez les champs du formulaire :**
   - TextField pour `userType`
   - TextField pour `fullName`
   - TextField pour `email`
   - TextField pour `about` (multiline)
   - TextField pour `specialization`
   - TextField pour `yearsOfExperience`
   - TextField pour `certifications`
   - TextField pour `location`

3. **Ajoutez un bouton "Vérifier"**

4. **Configurez l'Action du Bouton :**
   - Sélectionnez le bouton
   - Dans **Actions**, cliquez sur **+ Add Action**
   - Choisissez **Backend Call** → **Custom Action**
   - Sélectionnez `verifyCoachWithAI`
   - Mappez les paramètres :
     - `token` → Variable d'état (token JWT)
     - `userType` → `userTypeController.text`
     - `fullName` → `fullNameController.text`
     - etc.

5. **Gérez la Réponse :**
   - Créez une variable d'état : `verificationResult` (type: `CoachVerificationResponse`)
   - Dans l'action, après l'appel, assignez le résultat :
     ```dart
     verificationResult = result
     ```

6. **Affichez le Résultat :**
   - Créez une condition : `if verificationResult != null`
   - Affichez les informations :
     - Score de confiance
     - Raisons de vérification
     - Statut (vérifié/non vérifié)

---

## 🔄 Workflow Complet

### **Méthode 1 : Workflow Linéaire (Recommandé)**

```
1. Cursor → Génère le code Flutter
   ↓
2. Teste le code localement (optionnel)
   ↓
3. Extrait les composants (Models, Services)
   ↓
4. FlutterFlow → Ajoute les Data Types
   ↓
5. FlutterFlow → Crée les Custom Actions
   ↓
6. FlutterFlow → Crée l'UI avec Builder
   ↓
7. FlutterFlow → Connecte les actions
   ↓
8. Teste dans FlutterFlow
```

### **Méthode 2 : Workflow Itératif**

```
1. Cursor → Génère un composant (ex: Service)
   ↓
2. FlutterFlow → Intègre le composant
   ↓
3. Teste dans FlutterFlow
   ↓
4. Si besoin → Retourne à Cursor pour ajuster
   ↓
5. Répète pour chaque composant
```

---

## 📝 Exemple Complet : Page de Vérification Coach

### **Étape 1 : Générer avec Cursor**

**Prompt complet pour Cursor :**

```
Crée une page Flutter complète pour la vérification de coach avec :
1. Un formulaire avec tous les champs nécessaires
2. Validation des champs
3. Appel API POST /coach-verification/verify-with-ai
4. Affichage du résultat avec score de confiance
5. Gestion des erreurs
6. Design Material Design 3
7. Utilise Provider pour le state management
8. Code modulaire et réutilisable
```

### **Étape 2 : Extraire les Composants**

Séparez le code généré en :
- `models/` - Modèles de données
- `services/` - Services API
- `providers/` - State management (optionnel pour FlutterFlow)

### **Étape 3 : Intégrer dans FlutterFlow**

1. **Data Types** : Ajoutez tous les modèles
2. **Custom Actions** : Ajoutez les services
3. **Pages** : Créez l'UI avec le builder
4. **Actions** : Connectez les appels API

---

## 🎯 Méthode Rapide (Shortcut)

### **Pour les Débutants :**

1. **Demandez à Cursor de générer :**
   ```
   Crée un service Flutter pour appeler POST /coach-verification/verify-with-ai
   avec gestion d'erreurs et token JWT. Code prêt pour FlutterFlow.
   ```

2. **Copiez le code dans FlutterFlow :**
   - Custom Code → Actions → Nouvelle Action
   - Collez le code
   - Ajustez les paramètres

3. **Créez l'UI simple :**
   - Formulaire basique
   - Bouton qui appelle l'action
   - Affichage du résultat

---

## ✅ Checklist Pratique

### **Avant de Commencer :**
- [ ] Cursor installé et configuré
- [ ] FlutterFlow projet créé
- [ ] API backend accessible
- [ ] Token JWT disponible

### **Génération avec Cursor :**
- [ ] Code généré et testé localement
- [ ] Modèles de données extraits
- [ ] Services API extraits
- [ ] Code documenté

### **Intégration FlutterFlow :**
- [ ] Data Types ajoutés
- [ ] Custom Actions créées
- [ ] UI créée avec Builder
- [ ] Actions connectées aux boutons
- [ ] Variables d'état créées
- [ ] Gestion des erreurs implémentée

### **Test Final :**
- [ ] Formulaire fonctionne
- [ ] Appel API réussi
- [ ] Résultat affiché correctement
- [ ] Erreurs gérées proprement

---

## 🚨 Erreurs Courantes et Solutions

### **Erreur 1 : Import manquant**

**Problème :** `import 'package:http/http.dart' as http;` manquant

**Solution :** Dans FlutterFlow, allez dans **Settings** → **Dependencies** → Ajoutez `http: ^1.1.0`

### **Erreur 2 : Type non reconnu**

**Problème :** FlutterFlow ne reconnaît pas `CoachVerificationResponse`

**Solution :** Vérifiez que le Data Type est bien créé dans Custom Code → Data Types

### **Erreur 3 : Token non disponible**

**Problème :** `token` est null dans l'action

**Solution :** Créez une variable d'état pour le token et initialisez-la au login

---

## 💡 Astuces Pro

### **1. Utilisez des Prompts Spécifiques**

❌ **Mauvais :** "Crée une page Flutter"
✅ **Bon :** "Crée un service Flutter pour appeler POST /coach-verification/verify-with-ai avec token JWT, gestion d'erreurs HTTP, et parsing JSON. Code prêt pour FlutterFlow Custom Action."

### **2. Testez Localement d'Abord**

Avant d'intégrer dans FlutterFlow, testez le code dans un projet Flutter local pour vérifier qu'il fonctionne.

### **3. Code Modulaire**

Générez des composants séparés (Models, Services) plutôt qu'une page complète. Plus facile à intégrer dans FlutterFlow.

### **4. Documentez le Code**

Ajoutez des commentaires dans le code généré pour faciliter l'intégration dans FlutterFlow.

---

## 📚 Ressources

- **Cursor AI** : https://cursor.sh
- **FlutterFlow Custom Code** : https://docs.flutterflow.io/custom-code
- **Flutter Documentation** : https://flutter.dev/docs
- **HTTP Package** : https://pub.dev/packages/http

---

## 🎉 Résumé

**La méthode Cursor dans FlutterFlow :**

1. ✅ **Génère** le code Flutter avec Cursor AI
2. ✅ **Extrait** les composants (Models, Services)
3. ✅ **Intègre** dans FlutterFlow (Data Types, Custom Actions)
4. ✅ **Crée** l'UI avec FlutterFlow Builder
5. ✅ **Connecte** les actions aux événements UI

**Avantages :**
- 🚀 Développement rapide
- 🎨 UI Builder de FlutterFlow
- 🔧 Code custom pour logique complexe
- 📱 Compatible iOS et Android

**Cette méthode fonctionne parfaitement !** 🎯


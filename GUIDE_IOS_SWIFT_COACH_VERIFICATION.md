# 📱 Guide iOS Swift - Vérification Coach avec AI (ChatGPT)

## 🎯 Vue d'Ensemble

Ce guide explique comment implémenter la vérification de coach avec ChatGPT dans votre application iOS Swift avec SwiftUI. Cette fonctionnalité permet de vérifier si un utilisateur est un coach professionnel en analysant les données du formulaire et les documents/images fournis.

### Fonctionnalités

- ✅ Envoi des données du formulaire de vérification
- ✅ Upload de documents/images (certifications, ID, licences)
- ✅ Analyse par ChatGPT (OpenAI)
- ✅ Affichage du résultat avec score de confiance
- ✅ Affichage des raisons de vérification
- ✅ Gestion des erreurs et mode fallback

---

## 🔌 Endpoints API

### 1. Upload de Fichier

**POST** `/files/upload`

**Headers :**
```
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: multipart/form-data
```

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

### 2. Vérification AI

**POST** `/coach-verification/verify-with-ai`

**Headers :**
```
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json
```

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

---

## 🏗️ Architecture

### Structure des Fichiers

```
📁 Models/
  ├── CoachVerificationRequest.swift
  ├── CoachVerificationResponse.swift
  ├── DocumentAnalysisResult.swift
  └── UploadFileResponse.swift

📁 Services/
  ├── CoachVerificationService.swift
  ├── FileUploadService.swift
  └── APIClient.swift

📁 ViewModels/
  └── CoachVerificationViewModel.swift

📁 Views/
  ├── CoachVerificationView.swift
  ├── VerificationFormView.swift
  ├── DocumentUploadView.swift
  └── VerificationResultView.swift
```

---

## 📦 Models

### CoachVerificationRequest.swift

```swift
import Foundation

struct CoachVerificationRequest: Codable {
    let userType: String
    let fullName: String
    let email: String
    let about: String
    let specialization: String
    let yearsOfExperience: String
    let certifications: String
    let location: String
    let documents: [String] // URLs des images/documents
    let note: String?
}
```

### DocumentAnalysisResult.swift

```swift
import Foundation

struct DocumentAnalysisResult: Codable {
    let documentsVerified: Int
    let totalDocuments: Int
    let documentTypes: [String]
    let isValid: Bool
}
```

### CoachVerificationResponse.swift

```swift
import Foundation

struct CoachVerificationResponse: Codable {
    let isCoach: Bool
    let confidenceScore: Double // 0.0 à 1.0
    let verificationReasons: [String]
    let aiAnalysis: String?
    let documentAnalysis: DocumentAnalysisResult?
}
```

### UploadFileResponse.swift

```swift
import Foundation

struct UploadFileResponse: Codable {
    let url: String
    let fileName: String
    let fileType: String
    let fileSize: Int
}
```

---

## 🔧 Services

### FileUploadService.swift

```swift
import Foundation
import UIKit

class FileUploadService {
    private let baseURL = "https://apinest-production.up.railway.app"
    
    func uploadFile(
        token: String,
        fileData: Data,
        fileName: String,
        mimeType: String
    ) async throws -> UploadFileResponse {
        let url = URL(string: "\(baseURL)/files/upload")!
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        
        // Créer le body multipart/form-data
        let boundary = UUID().uuidString
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
        
        var body = Data()
        
        // Ajouter le fichier
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"file\"; filename=\"\(fileName)\"\r\n".data(using: .utf8)!)
        body.append("Content-Type: \(mimeType)\r\n\r\n".data(using: .utf8)!)
        body.append(fileData)
        body.append("\r\n".data(using: .utf8)!)
        body.append("--\(boundary)--\r\n".data(using: .utf8)!)
        
        request.httpBody = body
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }
        
        guard (200...299).contains(httpResponse.statusCode) else {
            if httpResponse.statusCode == 401 {
                throw APIError.unauthorized
            } else if httpResponse.statusCode == 400 {
                throw APIError.badRequest
            } else {
                throw APIError.serverError(httpResponse.statusCode)
            }
        }
        
        let decoder = JSONDecoder()
        return try decoder.decode(UploadFileResponse.self, from: data)
    }
    
    func uploadImage(
        token: String,
        image: UIImage,
        fileName: String = "image.jpg"
    ) async throws -> UploadFileResponse {
        guard let imageData = image.jpegData(compressionQuality: 0.8) else {
            throw APIError.invalidData
        }
        
        return try await uploadFile(
            token: token,
            fileData: imageData,
            fileName: fileName,
            mimeType: "image/jpeg"
        )
    }
    
    func uploadPDF(
        token: String,
        pdfData: Data,
        fileName: String = "document.pdf"
    ) async throws -> UploadFileResponse {
        return try await uploadFile(
            token: token,
            fileData: pdfData,
            fileName: fileName,
            mimeType: "application/pdf"
        )
    }
}
```

### CoachVerificationService.swift

```swift
import Foundation

class CoachVerificationService {
    private let baseURL = "https://apinest-production.up.railway.app"
    
    func verifyCoach(
        token: String,
        request: CoachVerificationRequest
    ) async throws -> CoachVerificationResponse {
        let url = URL(string: "\(baseURL)/coach-verification/verify-with-ai")!
        
        var urlRequest = URLRequest(url: url)
        urlRequest.httpMethod = "POST"
        urlRequest.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        urlRequest.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let encoder = JSONEncoder()
        urlRequest.httpBody = try encoder.encode(request)
        
        let (data, response) = try await URLSession.shared.data(for: urlRequest)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }
        
        guard (200...299).contains(httpResponse.statusCode) else {
            if httpResponse.statusCode == 401 {
                throw APIError.unauthorized
            } else if httpResponse.statusCode == 400 {
                throw APIError.badRequest
            } else {
                throw APIError.serverError(httpResponse.statusCode)
            }
        }
        
        let decoder = JSONDecoder()
        return try decoder.decode(CoachVerificationResponse.self, from: data)
    }
}

enum APIError: Error, LocalizedError {
    case invalidResponse
    case unauthorized
    case badRequest
    case serverError(Int)
    case invalidData
    case decodingError(Error)
    
    var errorDescription: String? {
        switch self {
        case .invalidResponse:
            return "Réponse invalide du serveur"
        case .unauthorized:
            return "Non autorisé. Veuillez vous reconnecter."
        case .badRequest:
            return "Données invalides. Vérifiez vos informations."
        case .serverError(let code):
            return "Erreur serveur (\(code)). Réessayez plus tard."
        case .invalidData:
            return "Données invalides"
        case .decodingError(let error):
            return "Erreur de décodage: \(error.localizedDescription)"
        }
    }
}
```

---

## 🎯 ViewModels

### CoachVerificationViewModel.swift

```swift
import Foundation
import SwiftUI
import PhotosUI

@MainActor
class CoachVerificationViewModel: ObservableObject {
    @Published var userType: String = ""
    @Published var fullName: String = ""
    @Published var email: String = ""
    @Published var about: String = ""
    @Published var specialization: String = ""
    @Published var yearsOfExperience: String = ""
    @Published var certifications: String = ""
    @Published var location: String = ""
    @Published var note: String = ""
    @Published var documents: [String] = []
    
    @Published var isLoading = false
    @Published var isUploading = false
    @Published var verificationResult: CoachVerificationResponse?
    @Published var errorMessage: String?
    @Published var state: ViewState = .idle
    
    private let coachVerificationService = CoachVerificationService()
    private let fileUploadService = FileUploadService()
    
    enum ViewState {
        case idle
        case uploading
        case verifying
        case verified(CoachVerificationResponse)
        case error(String)
    }
    
    var isFormValid: Bool {
        !userType.isEmpty &&
        !fullName.isEmpty &&
        !email.isEmpty &&
        !about.isEmpty &&
        !specialization.isEmpty &&
        !yearsOfExperience.isEmpty &&
        !certifications.isEmpty &&
        !location.isEmpty &&
        isValidEmail(email)
    }
    
    private func isValidEmail(_ email: String) -> Bool {
        let emailRegex = "[A-Z0-9a-z._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,64}"
        let emailPredicate = NSPredicate(format: "SELF MATCHES %@", emailRegex)
        return emailPredicate.evaluate(with: email)
    }
    
    func uploadDocument(
        token: String,
        image: UIImage
    ) async {
        isUploading = true
        state = .uploading
        
        do {
            let response = try await fileUploadService.uploadImage(
                token: token,
                image: image
            )
            
            await MainActor.run {
                documents.append(response.url)
                isUploading = false
                state = .idle
            }
        } catch {
            await MainActor.run {
                isUploading = false
                errorMessage = error.localizedDescription
                state = .error(error.localizedDescription)
            }
        }
    }
    
    func uploadPDFDocument(
        token: String,
        pdfData: Data,
        fileName: String
    ) async {
        isUploading = true
        state = .uploading
        
        do {
            let response = try await fileUploadService.uploadPDF(
                token: token,
                pdfData: pdfData,
                fileName: fileName
            )
            
            await MainActor.run {
                documents.append(response.url)
                isUploading = false
                state = .idle
            }
        } catch {
            await MainActor.run {
                isUploading = false
                errorMessage = error.localizedDescription
                state = .error(error.localizedDescription)
            }
        }
    }
    
    func removeDocument(at index: Int) {
        documents.remove(at: index)
    }
    
    func verifyCoach(token: String) async {
        guard isFormValid else {
            errorMessage = "Veuillez remplir tous les champs requis"
            return
        }
        
        isLoading = true
        state = .verifying
        errorMessage = nil
        
        let request = CoachVerificationRequest(
            userType: userType,
            fullName: fullName,
            email: email,
            about: about,
            specialization: specialization,
            yearsOfExperience: yearsOfExperience,
            certifications: certifications,
            location: location,
            documents: documents,
            note: note.isEmpty ? nil : note
        )
        
        do {
            let result = try await coachVerificationService.verifyCoach(
                token: token,
                request: request
            )
            
            await MainActor.run {
                self.verificationResult = result
                self.isLoading = false
                self.state = .verified(result)
            }
        } catch {
            await MainActor.run {
                self.isLoading = false
                self.errorMessage = error.localizedDescription
                self.state = .error(error.localizedDescription)
            }
        }
    }
    
    func resetState() {
        state = .idle
        verificationResult = nil
        errorMessage = nil
    }
}
```

---

## 🎨 Views

### CoachVerificationView.swift

```swift
import SwiftUI
import PhotosUI

struct CoachVerificationView: View {
    @StateObject private var viewModel = CoachVerificationViewModel()
    @State private var selectedImage: UIImage?
    @State private var showImagePicker = false
    @State private var showDocumentPicker = false
    @State private var showResult = false
    
    let token: String
    
    var body: some View {
        NavigationView {
            Form {
                // Formulaire de vérification
                Section(header: Text("Informations personnelles")) {
                    TextField("Type d'utilisateur", text: $viewModel.userType)
                        .placeholder(when: viewModel.userType.isEmpty) {
                            Text("Coach / Trainer")
                        }
                    
                    TextField("Nom complet", text: $viewModel.fullName)
                    
                    TextField("Email", text: $viewModel.email)
                        .keyboardType(.emailAddress)
                        .autocapitalization(.none)
                    
                    TextField("Localisation", text: $viewModel.location)
                }
                
                Section(header: Text("Informations professionnelles")) {
                    TextEditor(text: $viewModel.about)
                        .frame(height: 100)
                        .overlay(
                            Group {
                                if viewModel.about.isEmpty {
                                    Text("À propos de vous")
                                        .foregroundColor(.gray)
                                        .padding(.leading, 4)
                                        .padding(.top, 8)
                                }
                            },
                            alignment: .topLeading
                        )
                    
                    TextField("Spécialisation", text: $viewModel.specialization)
                    
                    TextField("Années d'expérience", text: $viewModel.yearsOfExperience)
                        .keyboardType(.numberPad)
                    
                    TextField("Certifications", text: $viewModel.certifications)
                }
                
                Section(header: Text("Note additionnelle (optionnel)")) {
                    TextEditor(text: $viewModel.note)
                        .frame(height: 80)
                }
                
                // Section upload documents
                DocumentUploadSection(
                    documents: viewModel.documents,
                    isUploading: viewModel.isUploading,
                    onImageSelected: { image in
                        Task {
                            await viewModel.uploadDocument(token: token, image: image)
                        }
                    },
                    onPDFSelected: { pdfData, fileName in
                        Task {
                            await viewModel.uploadPDFDocument(
                                token: token,
                                pdfData: pdfData,
                                fileName: fileName
                            )
                        }
                    },
                    onRemoveDocument: { index in
                        viewModel.removeDocument(at: index)
                    }
                )
                
                // Bouton de vérification
                Section {
                    Button(action: {
                        Task {
                            await viewModel.verifyCoach(token: token)
                            if viewModel.verificationResult != nil {
                                showResult = true
                            }
                        }
                    }) {
                        HStack {
                            if viewModel.isLoading {
                                ProgressView()
                                    .progressViewStyle(CircularProgressViewStyle())
                            }
                            Text(viewModel.isLoading ? "Vérification en cours..." : "Vérifier avec AI")
                        }
                    }
                    .disabled(!viewModel.isFormValid || viewModel.isLoading)
                }
            }
            .navigationTitle("Vérification Coach")
            .navigationBarTitleDisplayMode(.large)
            .sheet(isPresented: $showResult) {
                if let result = viewModel.verificationResult {
                    VerificationResultView(result: result) {
                        viewModel.resetState()
                        showResult = false
                    }
                }
            }
            .alert("Erreur", isPresented: .constant(viewModel.errorMessage != nil)) {
                Button("OK") {
                    viewModel.errorMessage = nil
                }
            } message: {
                Text(viewModel.errorMessage ?? "")
            }
        }
    }
}

extension View {
    func placeholder<Content: View>(
        when shouldShow: Bool,
        alignment: Alignment = .leading,
        @ViewBuilder placeholder: () -> Content) -> some View {
        
        ZStack(alignment: alignment) {
            placeholder().opacity(shouldShow ? 1 : 0)
            self
        }
    }
}
```

### DocumentUploadSection.swift

```swift
import SwiftUI
import UniformTypeIdentifiers

struct DocumentUploadSection: View {
    let documents: [String]
    let isUploading: Bool
    let onImageSelected: (UIImage) -> Void
    let onPDFSelected: (Data, String) -> Void
    let onRemoveDocument: (Int) -> Void
    
    @State private var showImagePicker = false
    @State private var showDocumentPicker = false
    @State private var selectedImage: UIImage?
    
    var body: some View {
        Section(header: Text("Documents (Certifications, ID, Licences)")) {
            // Liste des documents uploadés
            if !documents.isEmpty {
                ForEach(Array(documents.enumerated()), id: \.offset) { index, url in
                    HStack {
                        Text(url)
                            .font(.caption)
                            .lineLimit(1)
                        
                        Spacer()
                        
                        Button(action: {
                            onRemoveDocument(index)
                        }) {
                            Image(systemName: "xmark.circle.fill")
                                .foregroundColor(.red)
                        }
                    }
                }
            }
            
            // Boutons d'upload
            HStack(spacing: 12) {
                Button(action: {
                    showImagePicker = true
                }) {
                    HStack {
                        if isUploading {
                            ProgressView()
                                .progressViewStyle(CircularProgressViewStyle(tint: .white))
                        } else {
                            Image(systemName: "photo")
                        }
                        Text("Ajouter une image")
                    }
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.blue)
                    .foregroundColor(.white)
                    .cornerRadius(8)
                }
                .disabled(isUploading)
                .sheet(isPresented: $showImagePicker) {
                    ImagePicker(image: $selectedImage) { image in
                        onImageSelected(image)
                    }
                }
                
                Button(action: {
                    showDocumentPicker = true
                }) {
                    HStack {
                        if isUploading {
                            ProgressView()
                                .progressViewStyle(CircularProgressViewStyle(tint: .white))
                        } else {
                            Image(systemName: "doc")
                        }
                        Text("Ajouter un PDF")
                    }
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.green)
                    .foregroundColor(.white)
                    .cornerRadius(8)
                }
                .disabled(isUploading)
                .fileImporter(
                    isPresented: $showDocumentPicker,
                    allowedContentTypes: [.pdf],
                    allowsMultipleSelection: false
                ) { result in
                    switch result {
                    case .success(let urls):
                        if let url = urls.first {
                            if let pdfData = try? Data(contentsOf: url) {
                                let fileName = url.lastPathComponent
                                onPDFSelected(pdfData, fileName)
                            }
                        }
                    case .failure(let error):
                        print("Error selecting file: \(error)")
                    }
                }
            }
        }
    }
}

// Image Picker
struct ImagePicker: UIViewControllerRepresentable {
    @Binding var image: UIImage?
    let onImageSelected: (UIImage) -> Void
    @Environment(\.presentationMode) var presentationMode
    
    func makeUIViewController(context: Context) -> UIImagePickerController {
        let picker = UIImagePickerController()
        picker.delegate = context.coordinator
        picker.sourceType = .photoLibrary
        return picker
    }
    
    func updateUIViewController(_ uiViewController: UIImagePickerController, context: Context) {}
    
    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }
    
    class Coordinator: NSObject, UIImagePickerControllerDelegate, UINavigationControllerDelegate {
        let parent: ImagePicker
        
        init(_ parent: ImagePicker) {
            self.parent = parent
        }
        
        func imagePickerController(
            _ picker: UIImagePickerController,
            didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey : Any]
        ) {
            if let image = info[.originalImage] as? UIImage {
                parent.image = image
                parent.onImageSelected(image)
            }
            parent.presentationMode.wrappedValue.dismiss()
        }
        
        func imagePickerControllerDidCancel(_ picker: UIImagePickerController) {
            parent.presentationMode.wrappedValue.dismiss()
        }
    }
}
```

### VerificationResultView.swift

```swift
import SwiftUI

struct VerificationResultView: View {
    let result: CoachVerificationResponse
    let onDismiss: () -> Void
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 20) {
                    // Header avec résultat
                    VStack(spacing: 12) {
                        Image(systemName: result.isCoach ? "checkmark.circle.fill" : "xmark.circle.fill")
                            .font(.system(size: 60))
                            .foregroundColor(result.isCoach ? .green : .red)
                        
                        Text(result.isCoach ? "Coach Vérifié" : "Vérification Échouée")
                            .font(.title)
                            .fontWeight(.bold)
                    }
                    .padding()
                    
                    // Score de confiance
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Score de confiance")
                            .font(.headline)
                        
                        ProgressView(value: result.confidenceScore, total: 1.0)
                            .progressViewStyle(LinearProgressViewStyle(tint: .blue))
                        
                        Text("\(Int(result.confidenceScore * 100))%")
                            .font(.title2)
                            .fontWeight(.semibold)
                    }
                    .padding()
                    .background(Color(.systemGray6))
                    .cornerRadius(12)
                    
                    // Raisons de vérification
                    if !result.verificationReasons.isEmpty {
                        VStack(alignment: .leading, spacing: 12) {
                            Text("Raisons de vérification")
                                .font(.headline)
                            
                            ForEach(result.verificationReasons, id: \.self) { reason in
                                HStack(alignment: .top) {
                                    Text("•")
                                    Text(reason)
                                        .font(.subheadline)
                                }
                            }
                        }
                        .padding()
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(Color(.systemGray6))
                        .cornerRadius(12)
                    }
                    
                    // Analyse AI
                    if let aiAnalysis = result.aiAnalysis {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Analyse AI")
                                .font(.headline)
                            
                            Text(aiAnalysis)
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                        }
                        .padding()
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(Color(.systemGray6))
                        .cornerRadius(12)
                    }
                    
                    // Analyse des documents
                    if let docAnalysis = result.documentAnalysis {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Analyse des documents")
                                .font(.headline)
                            
                            Text("\(docAnalysis.documentsVerified)/\(docAnalysis.totalDocuments) document(s) vérifié(s)")
                                .font(.subheadline)
                            
                            if !docAnalysis.documentTypes.isEmpty {
                                Text("Types: \(docAnalysis.documentTypes.joined(separator: ", "))")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                        }
                        .padding()
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(Color(.systemGray6))
                        .cornerRadius(12)
                    }
                }
                .padding()
            }
            .navigationTitle("Résultat")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Fermer") {
                        onDismiss()
                    }
                }
            }
        }
    }
}
```

---

## 📝 Utilisation

### Dans votre Navigation

```swift
import SwiftUI

struct ContentView: View {
    @State private var token: String = "" // Récupérer depuis Keychain
    
    var body: some View {
        TabView {
            CoachVerificationView(token: token)
                .tabItem {
                    Label("Vérification", systemImage: "checkmark.shield")
                }
        }
    }
}
```

---

## 🔐 Gestion du Token

### TokenManager.swift

```swift
import Foundation
import Security

class TokenManager {
    static let shared = TokenManager()
    
    private let tokenKey = "auth_token"
    
    private init() {}
    
    func saveToken(_ token: String) {
        let data = token.data(using: .utf8)!
        
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: tokenKey,
            kSecValueData as String: data
        ]
        
        SecItemDelete(query as CFDictionary)
        SecItemAdd(query as CFDictionary, nil)
    }
    
    func getToken() -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: tokenKey,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]
        
        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        
        guard status == errSecSuccess,
              let data = result as? Data,
              let token = String(data: data, encoding: .utf8) else {
            return nil
        }
        
        return token
    }
    
    func deleteToken() {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: tokenKey
        ]
        
        SecItemDelete(query as CFDictionary)
    }
}
```

### Utilisation dans la View

```swift
struct CoachVerificationView: View {
    @StateObject private var viewModel = CoachVerificationViewModel()
    @State private var token: String?
    
    var body: some View {
        // ... votre code
        .onAppear {
            token = TokenManager.shared.getToken()
        }
        .onChange(of: token) { newToken in
            if let token = newToken {
                // Utiliser le token
            }
        }
    }
}
```

---

## 🎨 Améliorations Possibles

### 1. Validation en temps réel

Ajoutez une validation en temps réel des champs :

```swift
@Published var emailError: String?

private func validateEmail() {
    if !email.isEmpty && !isValidEmail(email) {
        emailError = "Email invalide"
    } else {
        emailError = nil
    }
}
```

### 2. Prévisualisation des images

Ajoutez une prévisualisation des images uploadées :

```swift
if let image = selectedImage {
    Image(uiImage: image)
        .resizable()
        .scaledToFit()
        .frame(height: 200)
}
```

### 3. Progress Bar pour l'upload

Ajoutez une barre de progression pour l'upload :

```swift
if isUploading {
    ProgressView("Upload en cours...", value: uploadProgress, total: 1.0)
}
```

---

## 🐛 Gestion des Erreurs

Le service gère automatiquement les erreurs et retourne un mode fallback si OpenAI n'est pas configuré. Dans votre ViewModel, vous pouvez gérer différents types d'erreurs :

```swift
catch {
    let errorMessage: String
    if let apiError = error as? APIError {
        errorMessage = apiError.errorDescription ?? "Une erreur est survenue"
    } else {
        errorMessage = error.localizedDescription
    }
    
    await MainActor.run {
        self.errorMessage = errorMessage
        self.state = .error(errorMessage)
    }
}
```

---

## ✅ Test

Pour tester l'endpoint :

1. **Connectez-vous** et récupérez le token JWT
2. **Remplissez le formulaire** avec des données de test
3. **Uploadez des documents** (images ou PDFs)
4. **Cliquez sur "Vérifier avec AI"**
5. **Vérifiez le résultat** dans la sheet

### Test avec Postman

```json
POST https://apinest-production.up.railway.app/coach-verification/verify-with-ai
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "userType": "Coach / Trainer",
  "fullName": "John Doe",
  "email": "john@example.com",
  "about": "Certified personal trainer...",
  "specialization": "Running, Fitness",
  "yearsOfExperience": "5",
  "certifications": "NASM CPT",
  "location": "Paris, France",
  "documents": ["https://example.com/cert.pdf"]
}
```

---

## 📚 Ressources

- [SwiftUI Documentation](https://developer.apple.com/documentation/swiftui/)
- [URLSession Documentation](https://developer.apple.com/documentation/foundation/urlsession)
- [Codable Documentation](https://developer.apple.com/documentation/swift/codable)
- [PhotosUI Documentation](https://developer.apple.com/documentation/photospicker)
- [OpenAI API](https://platform.openai.com/docs)

---

## 🎉 Résumé

Vous avez maintenant une implémentation complète de la vérification de coach avec ChatGPT dans votre application iOS Swift avec SwiftUI ! 

L'endpoint utilise **ChatGPT (OpenAI)** pour :
- ✅ Analyser les données du formulaire
- ✅ Analyser les documents/images fournis
- ✅ Calculer un score de confiance
- ✅ Déterminer si c'est un coach
- ✅ Générer des raisons de vérification

Le mode fallback garantit que l'application fonctionne même si OpenAI n'est pas configuré ! 🚀



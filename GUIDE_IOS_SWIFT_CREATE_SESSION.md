# 📱 Guide iOS Swift - Création de Session/Activité

## 🎯 Vue d'Ensemble

Ce guide explique comment implémenter la création de session/activité dans votre application iOS Swift avec SwiftUI. Cette fonctionnalité permet aux utilisateurs de créer des activités sportives, avec la possibilité pour les coaches vérifiés de créer des sessions payantes.

### Fonctionnalités

- ✅ Création d'activité avec tous les champs requis
- ✅ Support du champ `price` pour les coaches vérifiés
- ✅ Validation des champs
- ✅ Gestion des erreurs
- ✅ Interface utilisateur moderne avec SwiftUI

---

## 🔌 Endpoint API

### `POST /activities`

**Headers :**
```
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json
```

**Body :**
```json
{
  "sportType": "Football",
  "title": "Evening strength session",
  "description": "A focused strength training session for football players",
  "location": "123 Main St, City",
  "latitude": 40.7128,
  "longitude": -74.0060,
  "date": "2025-12-15",
  "time": "2025-12-15T18:00:00Z",
  "participants": 10,
  "level": "Intermediate",
  "visibility": "public",
  "price": 25.50
}
```

**⚠️ Important :** Le champ `price` est optionnel. Seuls les coaches vérifiés peuvent créer des sessions avec un prix.

**Réponse (201 Created) :**
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "sportType": "Football",
  "title": "Evening strength session",
  "description": "A focused strength training session for football players",
  "location": "123 Main St, City",
  "latitude": 40.7128,
  "longitude": -74.0060,
  "date": "2025-12-15T00:00:00.000Z",
  "time": "2025-12-15T18:00:00.000Z",
  "participants": 10,
  "level": "Intermediate",
  "visibility": "public",
  "price": 25.50,
  "creator": "507f1f77bcf86cd799439012",
  "participantIds": ["507f1f77bcf86cd799439012"],
  "isCompleted": false,
  "createdAt": "2025-12-10T10:30:00.000Z",
  "updatedAt": "2025-12-10T10:30:00.000Z"
}
```

**Erreurs possibles :**
- `400 Bad Request` : Données invalides ou coach non vérifié essaie de créer une session payante
- `401 Unauthorized` : Token invalide ou expiré

---

## 🏗️ Architecture

### Structure des Fichiers

```
📁 Models/
  ├── CreateActivityRequest.swift
  └── ActivityResponse.swift

📁 Services/
  ├── ActivityService.swift
  └── APIClient.swift

📁 ViewModels/
  └── CreateActivityViewModel.swift

📁 Views/
  ├── CreateActivityView.swift
  └── ActivityFormView.swift
```

---

## 📦 Models

### CreateActivityRequest.swift

```swift
import Foundation

struct CreateActivityRequest: Codable {
    let sportType: String
    let title: String
    let description: String?
    let location: String
    let latitude: Double?
    let longitude: Double?
    let date: String // Format: "YYYY-MM-DD"
    let time: String // Format ISO 8601: "2025-12-15T18:00:00Z"
    let participants: Int
    let level: String
    let visibility: String
    let price: Double? // Optionnel, seulement pour coaches vérifiés
    
    enum CodingKeys: String, CodingKey {
        case sportType
        case title
        case description
        case location
        case latitude
        case longitude
        case date
        case time
        case participants
        case level
        case visibility
        case price
    }
}
```

### ActivityResponse.swift

```swift
import Foundation

struct ActivityResponse: Codable {
    let id: String
    let sportType: String
    let title: String
    let description: String?
    let location: String
    let latitude: Double?
    let longitude: Double?
    let date: String
    let time: String
    let participants: Int
    let level: String
    let visibility: String
    let price: Double?
    let creator: String
    let participantIds: [String]
    let isCompleted: Bool
    let createdAt: String
    let updatedAt: String
    
    enum CodingKeys: String, CodingKey {
        case id = "_id"
        case sportType
        case title
        case description
        case location
        case latitude
        case longitude
        case date
        case time
        case participants
        case level
        case visibility
        case price
        case creator
        case participantIds
        case isCompleted
        case createdAt
        case updatedAt
    }
}
```

---

## 🔧 Services

### ActivityService.swift

```swift
import Foundation

class ActivityService {
    private let baseURL = "https://apinest-production.up.railway.app"
    
    // MARK: - Créer une activité
    
    func createActivity(
        token: String,
        request: CreateActivityRequest
    ) async throws -> ActivityResponse {
        let url = URL(string: "\(baseURL)/activities")!
        
        var urlRequest = URLRequest(url: url)
        urlRequest.httpMethod = "POST"
        urlRequest.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        urlRequest.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        urlRequest.httpBody = try encoder.encode(request)
        
        let (data, response) = try await URLSession.shared.data(for: urlRequest)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }
        
        guard (200...299).contains(httpResponse.statusCode) else {
            if httpResponse.statusCode == 401 {
                throw APIError.unauthorized
            } else if httpResponse.statusCode == 400 {
                // Essayer de décoder le message d'erreur
                if let errorData = try? JSONDecoder().decode(ErrorResponse.self, from: data) {
                    throw APIError.badRequest(errorData.message ?? "Invalid request")
                }
                throw APIError.badRequest("Invalid request data")
            } else {
                throw APIError.serverError(httpResponse.statusCode)
            }
        }
        
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        return try decoder.decode(ActivityResponse.self, from: data)
    }
    
    // MARK: - Récupérer les activités
    
    func getActivities(
        token: String?,
        visibility: String? = nil
    ) async throws -> [ActivityResponse] {
        var urlString = "\(baseURL)/activities"
        
        if let visibility = visibility {
            urlString += "?visibility=\(visibility)"
        }
        
        let url = URL(string: urlString)!
        var urlRequest = URLRequest(url: url)
        urlRequest.httpMethod = "GET"
        
        if let token = token {
            urlRequest.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        
        let (data, response) = try await URLSession.shared.data(for: urlRequest)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }
        
        guard (200...299).contains(httpResponse.statusCode) else {
            if httpResponse.statusCode == 401 {
                throw APIError.unauthorized
            } else {
                throw APIError.serverError(httpResponse.statusCode)
            }
        }
        
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        return try decoder.decode([ActivityResponse].self, from: data)
    }
}

// MARK: - Error Response

struct ErrorResponse: Codable {
    let message: String?
    let error: String?
}
```

### APIError.swift

```swift
import Foundation

enum APIError: LocalizedError {
    case invalidResponse
    case unauthorized
    case badRequest(String)
    case serverError(Int)
    case invalidData
    case decodingError
    
    var errorDescription: String? {
        switch self {
        case .invalidResponse:
            return "Réponse invalide du serveur"
        case .unauthorized:
            return "Non autorisé. Veuillez vous reconnecter."
        case .badRequest(let message):
            return message
        case .serverError(let code):
            return "Erreur serveur (\(code))"
        case .invalidData:
            return "Données invalides"
        case .decodingError:
            return "Erreur de décodage"
        }
    }
}
```

---

## 🎨 ViewModels

### CreateActivityViewModel.swift

```swift
import Foundation
import SwiftUI

@MainActor
class CreateActivityViewModel: ObservableObject {
    @Published var state: CreateActivityState = .idle
    @Published var errorMessage: String?
    @Published var isCreating = false
    
    // Form fields
    @Published var sportType: String = "Football"
    @Published var title: String = ""
    @Published var description: String = ""
    @Published var location: String = ""
    @Published var latitude: Double?
    @Published var longitude: Double?
    @Published var date: Date = Date()
    @Published var time: Date = Date()
    @Published var participants: Int = 5
    @Published var level: String = "Beginner"
    @Published var visibility: String = "public"
    @Published var price: String = ""
    
    // User info
    @Published var isCoachVerified: Bool = false
    
    private let activityService = ActivityService()
    private let tokenManager = TokenManager.shared
    
    enum CreateActivityState {
        case idle
        case creating
        case success(ActivityResponse)
        case error(String)
    }
    
    // MARK: - Sport Types
    
    let sportTypes = ["Football", "Basketball", "Running", "Cycling"]
    
    // MARK: - Levels
    
    let levels = ["Beginner", "Intermediate", "Advanced"]
    
    // MARK: - Visibility Options
    
    let visibilityOptions = ["public", "friends"]
    
    // MARK: - Créer une activité
    
    func createActivity() async {
        guard let token = tokenManager.getToken() else {
            state = .error("Token non disponible")
            errorMessage = "Veuillez vous reconnecter"
            return
        }
        
        // Validation
        guard validateForm() else {
            return
        }
        
        isCreating = true
        state = .creating
        errorMessage = nil
        
        // Formater la date
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "yyyy-MM-dd"
        let dateString = dateFormatter.string(from: date)
        
        // Formater l'heure
        let timeFormatter = ISO8601DateFormatter()
        timeFormatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        let timeString = timeFormatter.string(from: time)
        
        // Créer la requête
        var request = CreateActivityRequest(
            sportType: sportType,
            title: title,
            description: description.isEmpty ? nil : description,
            location: location,
            latitude: latitude,
            longitude: longitude,
            date: dateString,
            time: timeString,
            participants: participants,
            level: level,
            visibility: visibility,
            price: nil
        )
        
        // Ajouter le prix si l'utilisateur est un coach vérifié et a fourni un prix
        if isCoachVerified, let priceValue = Double(price), priceValue >= 0 {
            request = CreateActivityRequest(
                sportType: sportType,
                title: title,
                description: description.isEmpty ? nil : description,
                location: location,
                latitude: latitude,
                longitude: longitude,
                date: dateString,
                time: timeString,
                participants: participants,
                level: level,
                visibility: visibility,
                price: priceValue
            )
        }
        
        do {
            let response = try await activityService.createActivity(
                token: token,
                request: request
            )
            
            isCreating = false
            state = .success(response)
            
            // Réinitialiser le formulaire
            resetForm()
            
        } catch {
            isCreating = false
            let errorMessage = (error as? APIError)?.errorDescription ?? error.localizedDescription
            self.errorMessage = errorMessage
            state = .error(errorMessage)
        }
    }
    
    // MARK: - Validation
    
    private func validateForm() -> Bool {
        if title.isEmpty || title.count < 3 {
            errorMessage = "Le titre doit contenir au moins 3 caractères"
            return false
        }
        
        if location.isEmpty {
            errorMessage = "La localisation est requise"
            return false
        }
        
        if participants < 1 || participants > 100 {
            errorMessage = "Le nombre de participants doit être entre 1 et 100"
            return false
        }
        
        // Validation du prix si fourni
        if !price.isEmpty {
            guard let priceValue = Double(price) else {
                errorMessage = "Le prix doit être un nombre valide"
                return false
            }
            
            if priceValue < 0 {
                errorMessage = "Le prix doit être supérieur ou égal à 0"
                return false
            }
            
            if !isCoachVerified {
                errorMessage = "Seuls les coaches vérifiés peuvent créer des sessions payantes"
                return false
            }
        }
        
        return true
    }
    
    // MARK: - Réinitialiser le formulaire
    
    func resetForm() {
        title = ""
        description = ""
        location = ""
        latitude = nil
        longitude = nil
        date = Date()
        time = Date()
        participants = 5
        level = "Beginner"
        visibility = "public"
        price = ""
        errorMessage = nil
    }
    
    // MARK: - Charger le statut de vérification
    
    func loadCoachVerificationStatus() async {
        guard let token = tokenManager.getToken() else {
            return
        }
        
        // Charger le profil utilisateur pour vérifier isCoachVerified
        // (Utilisez votre service UserService existant)
        // isCoachVerified = userProfile.isCoachVerified
    }
}
```

---

## 🎨 Views

### CreateActivityView.swift

```swift
import SwiftUI

struct CreateActivityView: View {
    @StateObject private var viewModel = CreateActivityViewModel()
    @Environment(\.dismiss) var dismiss
    
    var body: some View {
        NavigationView {
            Form {
                // Section: Informations de base
                Section(header: Text("Informations de base")) {
                    // Type de sport
                    Picker("Type de sport", selection: $viewModel.sportType) {
                        ForEach(viewModel.sportTypes, id: \.self) { sport in
                            Text(sport).tag(sport)
                        }
                    }
                    
                    // Titre
                    TextField("Titre", text: $viewModel.title)
                        .textInputAutocapitalization(.words)
                    
                    // Description
                    TextField("Description (optionnel)", text: $viewModel.description, axis: .vertical)
                        .lineLimit(3...6)
                        .textInputAutocapitalization(.sentences)
                }
                
                // Section: Localisation
                Section(header: Text("Localisation")) {
                    TextField("Lieu", text: $viewModel.location)
                        .textInputAutocapitalization(.words)
                    
                    // Coordonnées (optionnel)
                    HStack {
                        TextField("Latitude", value: $viewModel.latitude, format: .number)
                            .keyboardType(.decimalPad)
                        TextField("Longitude", value: $viewModel.longitude, format: .number)
                            .keyboardType(.decimalPad)
                    }
                }
                
                // Section: Date et heure
                Section(header: Text("Date et heure")) {
                    DatePicker("Date", selection: $viewModel.date, displayedComponents: .date)
                    DatePicker("Heure", selection: $viewModel.time, displayedComponents: .hourAndMinute)
                }
                
                // Section: Détails
                Section(header: Text("Détails")) {
                    // Nombre de participants
                    Stepper("Participants: \(viewModel.participants)", value: $viewModel.participants, in: 1...100)
                    
                    // Niveau
                    Picker("Niveau", selection: $viewModel.level) {
                        ForEach(viewModel.levels, id: \.self) { level in
                            Text(level).tag(level)
                        }
                    }
                    
                    // Visibilité
                    Picker("Visibilité", selection: $viewModel.visibility) {
                        Text("Public").tag("public")
                        Text("Amis uniquement").tag("friends")
                    }
                }
                
                // Section: Prix (seulement pour coaches vérifiés)
                if viewModel.isCoachVerified {
                    Section(header: Text("Prix (optionnel)")) {
                        TextField("Prix", text: $viewModel.price)
                            .keyboardType(.decimalPad)
                            .help("Prix de la session en euros")
                        
                        if !viewModel.price.isEmpty {
                            if let priceValue = Double(viewModel.price) {
                                Text("\(priceValue, specifier: "%.2f") €")
                                    .foregroundColor(.secondary)
                            }
                        }
                    }
                }
                
                // Section: Erreur
                if let errorMessage = viewModel.errorMessage {
                    Section {
                        Text(errorMessage)
                            .foregroundColor(.red)
                            .font(.caption)
                    }
                }
            }
            .navigationTitle("Créer une activité")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Annuler") {
                        dismiss()
                    }
                }
                
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Créer") {
                        Task {
                            await viewModel.createActivity()
                        }
                    }
                    .disabled(viewModel.isCreating || viewModel.title.isEmpty || viewModel.location.isEmpty)
                }
            }
            .overlay {
                if viewModel.isCreating {
                    ProgressView("Création en cours...")
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                        .background(Color.black.opacity(0.3))
                }
            }
            .alert("Activité créée", isPresented: .constant(viewModel.state == .success)) {
                Button("OK") {
                    dismiss()
                }
            } message: {
                Text("Votre activité a été créée avec succès!")
            }
            .task {
                await viewModel.loadCoachVerificationStatus()
            }
        }
    }
}
```

### ActivityFormView.swift (Version Alternative avec Design Moderne)

```swift
import SwiftUI

struct ActivityFormView: View {
    @StateObject private var viewModel = CreateActivityViewModel()
    @Environment(\.dismiss) var dismiss
    
    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                // Header
                VStack(alignment: .leading, spacing: 8) {
                    Text("Créer une activité")
                        .font(.largeTitle)
                        .fontWeight(.bold)
                    Text("Organisez une session sportive")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal)
                
                // Form
                VStack(spacing: 20) {
                    // Sport Type
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Type de sport")
                            .font(.headline)
                        Picker("", selection: $viewModel.sportType) {
                            ForEach(viewModel.sportTypes, id: \.self) { sport in
                                Text(sport).tag(sport)
                            }
                        }
                        .pickerStyle(.segmented)
                    }
                    .padding()
                    .background(Color.gray.opacity(0.1))
                    .cornerRadius(12)
                    
                    // Title
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Titre")
                            .font(.headline)
                        TextField("Ex: Evening strength session", text: $viewModel.title)
                            .textFieldStyle(.roundedBorder)
                    }
                    .padding()
                    .background(Color.gray.opacity(0.1))
                    .cornerRadius(12)
                    
                    // Location
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Lieu")
                            .font(.headline)
                        TextField("Ex: Central Park, New York", text: $viewModel.location)
                            .textFieldStyle(.roundedBorder)
                    }
                    .padding()
                    .background(Color.gray.opacity(0.1))
                    .cornerRadius(12)
                    
                    // Date & Time
                    HStack(spacing: 16) {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Date")
                                .font(.headline)
                            DatePicker("", selection: $viewModel.date, displayedComponents: .date)
                                .datePickerStyle(.compact)
                        }
                        
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Heure")
                                .font(.headline)
                            DatePicker("", selection: $viewModel.time, displayedComponents: .hourAndMinute)
                                .datePickerStyle(.compact)
                        }
                    }
                    .padding()
                    .background(Color.gray.opacity(0.1))
                    .cornerRadius(12)
                    
                    // Participants & Level
                    HStack(spacing: 16) {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Participants")
                                .font(.headline)
                            Stepper("\(viewModel.participants)", value: $viewModel.participants, in: 1...100)
                        }
                        
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Niveau")
                                .font(.headline)
                            Picker("", selection: $viewModel.level) {
                                ForEach(viewModel.levels, id: \.self) { level in
                                    Text(level).tag(level)
                                }
                            }
                            .pickerStyle(.menu)
                        }
                    }
                    .padding()
                    .background(Color.gray.opacity(0.1))
                    .cornerRadius(12)
                    
                    // Price (si coach vérifié)
                    if viewModel.isCoachVerified {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Prix (optionnel)")
                                .font(.headline)
                            HStack {
                                TextField("0.00", text: $viewModel.price)
                                    .keyboardType(.decimalPad)
                                    .textFieldStyle(.roundedBorder)
                                Text("€")
                                    .foregroundColor(.secondary)
                            }
                            if !viewModel.price.isEmpty, let priceValue = Double(viewModel.price) {
                                Text("\(priceValue, specifier: "%.2f") €")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                        }
                        .padding()
                        .background(Color.gray.opacity(0.1))
                        .cornerRadius(12)
                    }
                    
                    // Error message
                    if let errorMessage = viewModel.errorMessage {
                        Text(errorMessage)
                            .font(.caption)
                            .foregroundColor(.red)
                            .padding()
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .background(Color.red.opacity(0.1))
                            .cornerRadius(8)
                    }
                    
                    // Create button
                    Button(action: {
                        Task {
                            await viewModel.createActivity()
                        }
                    }) {
                        HStack {
                            if viewModel.isCreating {
                                ProgressView()
                                    .progressViewStyle(CircularProgressViewStyle(tint: .white))
                            } else {
                                Text("Créer l'activité")
                                    .fontWeight(.semibold)
                            }
                        }
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(
                            (viewModel.isCreating || viewModel.title.isEmpty || viewModel.location.isEmpty)
                            ? Color.gray
                            : Color.blue
                        )
                        .foregroundColor(.white)
                        .cornerRadius(12)
                    }
                    .disabled(viewModel.isCreating || viewModel.title.isEmpty || viewModel.location.isEmpty)
                }
                .padding(.horizontal)
            }
            .padding(.vertical)
        }
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .navigationBarLeading) {
                Button("Annuler") {
                    dismiss()
                }
            }
        }
        .alert("Activité créée", isPresented: .constant(viewModel.state == .success)) {
            Button("OK") {
                dismiss()
            }
        } message: {
            Text("Votre activité a été créée avec succès!")
        }
        .task {
            await viewModel.loadCoachVerificationStatus()
        }
    }
}
```

---

## 🔄 Utilisation

### Dans votre Navigation

```swift
import SwiftUI

struct ContentView: View {
    @State private var showCreateActivity = false
    
    var body: some View {
        NavigationView {
            VStack {
                // Votre contenu principal
                
                Button("Créer une activité") {
                    showCreateActivity = true
                }
            }
            .sheet(isPresented: $showCreateActivity) {
                CreateActivityView()
            }
        }
    }
}
```

---

## ✅ Checklist iOS

- [ ] Créer les modèles `CreateActivityRequest` et `ActivityResponse`
- [ ] Créer le service `ActivityService` avec la méthode `createActivity`
- [ ] Créer le ViewModel `CreateActivityViewModel` avec validation
- [ ] Créer la vue `CreateActivityView` avec formulaire
- [ ] Intégrer la vérification du statut coach pour afficher le champ prix
- [ ] Gérer les erreurs (coach non vérifié, prix invalide, etc.)
- [ ] Tester la création d'activité avec et sans prix
- [ ] Tester avec un coach vérifié et un utilisateur normal

---

## 🎉 Résumé

Vous avez maintenant une implémentation complète pour :

1. ✅ **Créer des activités** avec tous les champs requis
2. ✅ **Gérer le champ prix** pour les coaches vérifiés
3. ✅ **Valider les données** avant l'envoi
4. ✅ **Gérer les erreurs** de manière appropriée
5. ✅ **Interface utilisateur moderne** avec SwiftUI

L'application iOS peut maintenant créer des sessions/activités avec support du prix pour les coaches vérifiés ! 🚀


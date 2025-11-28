# 📱 Guide iOS Swift - AI Coach (Gemini)

## 🎯 Vue d'Ensemble

Ce guide explique comment implémenter l'AI Coach dans votre application iOS Swift avec SwiftUI. L'AI Coach utilise **Google Gemini AI** pour générer des suggestions d'activités personnalisées et des conseils personnalisés basés sur les données Strava de l'utilisateur.

### Fonctionnalités

- ✅ Suggestions d'activités personnalisées (3 activités)
- ✅ Conseils personnalisés (Nasy7) basés sur les statistiques
- ✅ Analyse des données Strava (workouts, calories, minutes, streak)
- ✅ Analyse du profil utilisateur et historique d'activités
- ✅ Score de correspondance pour chaque activité suggérée
- ✅ Mode fallback si Gemini n'est pas configuré

---

## 🔌 Endpoint API

### Obtenir des Suggestions Personnalisées

**POST** `/ai-coach/suggestions`

**Headers :**
```
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json
```

**Body :**
```json
{
  "workouts": 5,
  "calories": 2500,
  "minutes": 300,
  "streak": 7,
  "sportPreferences": "Running, Cycling"
}
```

**Réponse (200 OK) :**
```json
{
  "suggestions": [
    {
      "id": "65a1b2c3d4e5f6g7h8i9j0k1",
      "title": "Weekend Running Group",
      "sportType": "Running",
      "location": "Central Park, New York",
      "date": "15/11/2025",
      "time": "08:00",
      "participants": 5,
      "maxParticipants": 10,
      "level": "Intermediate",
      "matchScore": 85
    }
  ],
  "personalizedTips": [
    {
      "id": "tip-1",
      "title": "Maintenez votre série",
      "description": "Vous avez une série de 7 jours ! Continuez à vous entraîner régulièrement pour maintenir cette habitude.",
      "icon": "🔥",
      "category": "motivation",
      "priority": "high"
    }
  ]
}
```

---

## 🏗️ Architecture

### Structure des Fichiers

```
📁 Models/
  ├── AICoachRequest.swift
  ├── AICoachSuggestionsResponse.swift
  ├── SuggestedActivity.swift
  └── PersonalizedTip.swift

📁 Services/
  ├── AICoachService.swift
  └── APIClient.swift

📁 ViewModels/
  └── AICoachViewModel.swift

📁 Views/
  ├── AICoachView.swift
  ├── SuggestionsListView.swift
  ├── ActivitySuggestionCard.swift
  └── PersonalizedTipsView.swift
```

---

## 📦 Models

### AICoachRequest.swift

```swift
import Foundation

struct AICoachRequest: Codable {
    let workouts: Int
    let calories: Int
    let minutes: Int
    let streak: Int
    let sportPreferences: String?
    
    enum CodingKeys: String, CodingKey {
        case workouts
        case calories
        case minutes
        case streak
        case sportPreferences
    }
}
```

### SuggestedActivity.swift

```swift
import Foundation

struct SuggestedActivity: Codable, Identifiable {
    let id: String
    let title: String
    let sportType: String
    let location: String
    let date: String
    let time: String
    let participants: Int
    let maxParticipants: Int
    let level: String
    let matchScore: Int // 0-100
}
```

### PersonalizedTip.swift

```swift
import Foundation

struct PersonalizedTip: Codable, Identifiable {
    let id: String
    let title: String
    let description: String
    let icon: String // Emoji
    let category: String // "training", "nutrition", "recovery", "motivation", "health"
    let priority: String? // "high", "medium", "low"
    
    var priorityValue: TipPriority {
        switch priority {
        case "high": return .high
        case "medium": return .medium
        case "low": return .low
        default: return .medium
        }
    }
}

enum TipPriority: String {
    case high = "high"
    case medium = "medium"
    case low = "low"
}
```

### AICoachSuggestionsResponse.swift

```swift
import Foundation

struct AICoachSuggestionsResponse: Codable {
    let suggestions: [SuggestedActivity]
    let personalizedTips: [PersonalizedTip]?
}
```

---

## 🔧 Services

### AICoachService.swift

```swift
import Foundation
import Combine

class AICoachService {
    private let baseURL = "https://apinest-production.up.railway.app"
    private let apiClient: APIClient
    
    init(apiClient: APIClient = APIClient.shared) {
        self.apiClient = apiClient
    }
    
    func getSuggestions(
        token: String,
        request: AICoachRequest
    ) async throws -> AICoachSuggestionsResponse {
        let url = URL(string: "\(baseURL)/ai-coach/suggestions")!
        
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
        return try decoder.decode(AICoachSuggestionsResponse.self, from: data)
    }
}

enum APIError: Error, LocalizedError {
    case invalidResponse
    case unauthorized
    case badRequest
    case serverError(Int)
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
        case .decodingError(let error):
            return "Erreur de décodage: \(error.localizedDescription)"
        }
    }
}
```

### APIClient.swift (Helper)

```swift
import Foundation

class APIClient {
    static let shared = APIClient()
    
    private init() {}
    
    func performRequest<T: Decodable>(
        url: URL,
        method: String = "GET",
        headers: [String: String] = [:],
        body: Data? = nil
    ) async throws -> T {
        var request = URLRequest(url: url)
        request.httpMethod = method
        
        for (key, value) in headers {
            request.setValue(value, forHTTPHeaderField: key)
        }
        
        if let body = body {
            request.httpBody = body
        }
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
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
        return try decoder.decode(T.self, from: data)
    }
}
```

---

## 🎯 ViewModels

### AICoachViewModel.swift

```swift
import Foundation
import SwiftUI
import Combine

@MainActor
class AICoachViewModel: ObservableObject {
    @Published var suggestions: [SuggestedActivity] = []
    @Published var personalizedTips: [PersonalizedTip] = []
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var state: ViewState = .idle
    
    private let aiCoachService: AICoachService
    private var cancellables = Set<AnyCancellable>()
    
    enum ViewState {
        case idle
        case loading
        case loaded
        case error(String)
    }
    
    init(aiCoachService: AICoachService = AICoachService()) {
        self.aiCoachService = aiCoachService
    }
    
    func getSuggestions(
        token: String,
        workouts: Int,
        calories: Int,
        minutes: Int,
        streak: Int,
        sportPreferences: String? = nil
    ) {
        isLoading = true
        state = .loading
        errorMessage = nil
        
        let request = AICoachRequest(
            workouts: workouts,
            calories: calories,
            minutes: minutes,
            streak: streak,
            sportPreferences: sportPreferences
        )
        
        Task {
            do {
                let response = try await aiCoachService.getSuggestions(
                    token: token,
                    request: request
                )
                
                await MainActor.run {
                    self.suggestions = response.suggestions
                    self.personalizedTips = response.personalizedTips ?? []
                    self.isLoading = false
                    self.state = .loaded
                }
            } catch {
                await MainActor.run {
                    self.isLoading = false
                    self.errorMessage = error.localizedDescription
                    self.state = .error(error.localizedDescription)
                }
            }
        }
    }
    
    func refreshSuggestions(
        token: String,
        workouts: Int,
        calories: Int,
        minutes: Int,
        streak: Int,
        sportPreferences: String? = nil
    ) {
        getSuggestions(
            token: token,
            workouts: workouts,
            calories: calories,
            minutes: minutes,
            streak: streak,
            sportPreferences: sportPreferences
        )
    }
}
```

---

## 🎨 Views

### AICoachView.swift

```swift
import SwiftUI

struct AICoachView: View {
    @StateObject private var viewModel = AICoachViewModel()
    let token: String
    let stravaData: StravaData
    
    var body: some View {
        NavigationView {
            ZStack {
                switch viewModel.state {
                case .idle:
                    ContentUnavailableView(
                        "Appuyez sur actualiser",
                        systemImage: "arrow.clockwise",
                        description: Text("Pour charger les suggestions")
                    )
                    
                case .loading:
                    ProgressView("Analyse en cours par l'AI Coach...")
                    
                case .loaded:
                    ScrollView {
                        VStack(spacing: 24) {
                            // Section des conseils personnalisés
                            if !viewModel.personalizedTips.isEmpty {
                                PersonalizedTipsView(tips: viewModel.personalizedTips)
                            }
                            
                            // Section des suggestions d'activités
                            SuggestionsListView(
                                suggestions: viewModel.suggestions,
                                onActivityTap: { activity in
                                    // Naviguer vers les détails de l'activité
                                }
                            )
                        }
                        .padding()
                    }
                    
                case .error(let message):
                    ContentUnavailableView(
                        "Erreur",
                        systemImage: "exclamationmark.triangle",
                        description: Text(message)
                    ) {
                        Button("Réessayer") {
                            viewModel.refreshSuggestions(
                                token: token,
                                workouts: stravaData.workouts,
                                calories: stravaData.calories,
                                minutes: stravaData.minutes,
                                streak: stravaData.streak,
                                sportPreferences: stravaData.sportPreferences
                            )
                        }
                    }
                }
            }
            .navigationTitle("🤖 AI Coach")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: {
                        viewModel.refreshSuggestions(
                            token: token,
                            workouts: stravaData.workouts,
                            calories: stravaData.calories,
                            minutes: stravaData.minutes,
                            streak: stravaData.streak,
                            sportPreferences: stravaData.sportPreferences
                        )
                    }) {
                        Image(systemName: "arrow.clockwise")
                    }
                    .disabled(viewModel.isLoading)
                }
            }
            .onAppear {
                viewModel.getSuggestions(
                    token: token,
                    workouts: stravaData.workouts,
                    calories: stravaData.calories,
                    minutes: stravaData.minutes,
                    streak: stravaData.streak,
                    sportPreferences: stravaData.sportPreferences
                )
            }
        }
    }
}

// Data structure pour les données Strava
struct StravaData {
    let workouts: Int
    let calories: Int
    let minutes: Int
    let streak: Int
    let sportPreferences: String?
}
```

### SuggestionsListView.swift

```swift
import SwiftUI

struct SuggestionsListView: View {
    let suggestions: [SuggestedActivity]
    let onActivityTap: (SuggestedActivity) -> Void
    
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Activités suggérées")
                .font(.title2)
                .fontWeight(.bold)
            
            ForEach(suggestions) { activity in
                ActivitySuggestionCard(
                    activity: activity,
                    onTap: {
                        onActivityTap(activity)
                    }
                )
            }
        }
    }
}
```

### ActivitySuggestionCard.swift

```swift
import SwiftUI

struct ActivitySuggestionCard: View {
    let activity: SuggestedActivity
    let onTap: () -> Void
    
    var matchScoreColor: Color {
        switch activity.matchScore {
        case 80...100:
            return .green
        case 60..<80:
            return .orange
        default:
            return .red
        }
    }
    
    var body: some View {
        Button(action: onTap) {
            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    Text(activity.title)
                        .font(.headline)
                        .foregroundColor(.primary)
                    
                    Spacer()
                    
                    // Score de correspondance
                    Text("\(activity.matchScore)%")
                        .font(.caption)
                        .fontWeight(.semibold)
                        .foregroundColor(.white)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(matchScoreColor)
                        .cornerRadius(8)
                }
                
                HStack(spacing: 16) {
                    LabeledText(label: "Sport", text: activity.sportType)
                    LabeledText(label: "Niveau", text: activity.level)
                }
                
                HStack(spacing: 16) {
                    LabeledText(label: "Lieu", text: activity.location)
                    LabeledText(label: "Date", text: activity.date)
                }
                
                HStack(spacing: 16) {
                    LabeledText(label: "Heure", text: activity.time)
                    LabeledText(
                        label: "Participants",
                        text: "\(activity.participants)/\(activity.maxParticipants)"
                    )
                }
            }
            .padding()
            .background(Color(.systemBackground))
            .cornerRadius(12)
            .shadow(color: Color.black.opacity(0.1), radius: 5, x: 0, y: 2)
        }
        .buttonStyle(PlainButtonStyle())
    }
}

struct LabeledText: View {
    let label: String
    let text: String
    
    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label)
                .font(.caption)
                .foregroundColor(.secondary)
            Text(text)
                .font(.subheadline)
                .foregroundColor(.primary)
        }
    }
}
```

### PersonalizedTipsView.swift

```swift
import SwiftUI

struct PersonalizedTipsView: View {
    let tips: [PersonalizedTip]
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("💡 Conseils personnalisés (Nasy7)")
                .font(.title2)
                .fontWeight(.bold)
            
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 12) {
                    ForEach(tips) { tip in
                        PersonalizedTipCard(tip: tip)
                            .frame(width: 280)
                    }
                }
            }
        }
    }
}

struct PersonalizedTipCard: View {
    let tip: PersonalizedTip
    
    var backgroundColor: Color {
        switch tip.priorityValue {
        case .high:
            return Color.red.opacity(0.1)
        case .medium:
            return Color.blue.opacity(0.1)
        case .low:
            return Color.gray.opacity(0.1)
        }
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(alignment: .center, spacing: 8) {
                Text(tip.icon)
                    .font(.title)
                
                Text(tip.title)
                    .font(.headline)
                    .fontWeight(.bold)
            }
            
            Text(tip.description)
                .font(.subheadline)
                .foregroundColor(.secondary)
            
            Text(tip.category)
                .font(.caption)
                .foregroundColor(.secondary)
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .background(Color(.systemGray5))
                .cornerRadius(6)
        }
        .padding()
        .background(backgroundColor)
        .cornerRadius(12)
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
    @State private var stravaData = StravaData(
        workouts: 5,
        calories: 2500,
        minutes: 300,
        streak: 7,
        sportPreferences: "Running, Cycling"
    )
    
    var body: some View {
        TabView {
            AICoachView(
                token: token,
                stravaData: stravaData
            )
            .tabItem {
                Label("AI Coach", systemImage: "brain.head.profile")
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
struct AICoachView: View {
    @StateObject private var viewModel = AICoachViewModel()
    @State private var token: String?
    let stravaData: StravaData
    
    var body: some View {
        // ... votre code
        .onAppear {
            token = TokenManager.shared.getToken()
            if let token = token {
                viewModel.getSuggestions(
                    token: token,
                    workouts: stravaData.workouts,
                    calories: stravaData.calories,
                    minutes: stravaData.minutes,
                    streak: stravaData.streak,
                    sportPreferences: stravaData.sportPreferences
                )
            }
        }
    }
}
```

---

## 🎨 Améliorations Possibles

### 1. Pull-to-Refresh

Ajoutez un pull-to-refresh pour actualiser les suggestions :

```swift
struct AICoachView: View {
    @StateObject private var viewModel = AICoachViewModel()
    let token: String
    let stravaData: StravaData
    
    var body: some View {
        ScrollView {
            // Contenu
        }
        .refreshable {
            await viewModel.refreshSuggestions(
                token: token,
                workouts: stravaData.workouts,
                calories: stravaData.calories,
                minutes: stravaData.minutes,
                streak: stravaData.streak,
                sportPreferences: stravaData.sportPreferences
            )
        }
    }
}
```

### 2. Cache des Suggestions

Implémentez un cache pour éviter de recharger les suggestions :

```swift
class AICoachViewModel: ObservableObject {
    private var cachedResult: AICoachSuggestionsResponse?
    
    func getSuggestions(...) {
        if let cached = cachedResult {
            self.suggestions = cached.suggestions
            self.personalizedTips = cached.personalizedTips ?? []
            return
        }
        // ... charger depuis l'API
    }
}
```

### 3. Filtrage par Catégorie

Ajoutez des filtres pour les conseils par catégorie :

```swift
@State private var selectedCategory: String?

var filteredTips: [PersonalizedTip] {
    if let category = selectedCategory {
        return tips.filter { $0.category == category }
    }
    return tips
}
```

---

## 🐛 Gestion des Erreurs

Le service gère automatiquement les erreurs et retourne un mode fallback si Gemini n'est pas configuré. Dans votre ViewModel, vous pouvez gérer différents types d'erreurs :

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
2. **Récupérez les données Strava** de la semaine
3. **Appelez l'endpoint** avec les données
4. **Vérifiez les suggestions** d'activités et les conseils personnalisés

### Test avec Postman

```json
POST https://apinest-production.up.railway.app/ai-coach/suggestions
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "workouts": 5,
  "calories": 2500,
  "minutes": 300,
  "streak": 7,
  "sportPreferences": "Running, Cycling"
}
```

---

## 📚 Ressources

- [SwiftUI Documentation](https://developer.apple.com/documentation/swiftui/)
- [URLSession Documentation](https://developer.apple.com/documentation/foundation/urlsession)
- [Codable Documentation](https://developer.apple.com/documentation/swift/codable)
- [Google Gemini AI](https://ai.google.dev/)

---

## 🎉 Résumé

Vous avez maintenant une implémentation complète de l'AI Coach dans votre application iOS Swift avec SwiftUI ! 

L'AI Coach utilise **Google Gemini AI** pour :
- ✅ Analyser les données Strava de l'utilisateur
- ✅ Générer des suggestions d'activités personnalisées
- ✅ Fournir des conseils personnalisés (Nasy7) basés sur les statistiques
- ✅ Calculer un score de correspondance pour chaque activité

Le mode fallback garantit que l'application fonctionne même si Gemini n'est pas configuré ! 🚀



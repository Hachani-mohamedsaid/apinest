# 🤖 Guide Complet - AI Coach iOS Swift

## 🎯 Vue d'Ensemble

Ce guide détaille l'intégration complète de l'**AI Coach** dans une application iOS Swift. L'AI Coach utilise ChatGPT/Gemini pour fournir :
- 🎯 **Suggestions d'activités personnalisées** basées sur vos données Strava, historique, et préférences
- 💡 **Conseils personnalisés** (training, nutrition, recovery, motivation, health)
- 📹 **Vidéos YouTube** pertinentes pour vos sports préférés

---

## 📡 Endpoints Backend Disponibles

### Base URL
```
https://apinest-production.up.railway.app
```

### 1. **POST** `/ai-coach/suggestions`
Génère des suggestions d'activités personnalisées avec ChatGPT/Gemini.

**Body :**
```json
{
  "workouts": 3,
  "calories": 1200,
  "minutes": 180,
  "streak": 7,
  "sportPreferences": "Running, Cycling",
  "stravaData": {
    "recentActivities": [
      {
        "type": "Run",
        "distance": 5000,
        "duration": 1800,
        "averageSpeed": 2.78,
        "elevationGain": 50,
        "date": "2025-12-07T08:00:00.000Z"
      }
    ],
    "weeklyStats": {
      "totalDistance": 15000,
      "totalTime": 5400,
      "activitiesCount": 3
    },
    "favoriteSports": ["Running", "Cycling"],
    "performanceTrend": "improving"
  },
  "recentAppActivities": [],
  "joinedActivities": [],
  "createdActivities": [],
  "location": "Paris, France",
  "preferredTimeOfDay": "morning"
}
```

**Réponse :**
```json
{
  "suggestions": [
    {
      "id": "ai-suggestion-1234567890-0",
      "title": "Morning Running Group - 5K",
      "sportType": "Running",
      "location": "Bois de Boulogne, Paris",
      "date": "2025-12-08",
      "time": "08:00",
      "participants": 5,
      "maxParticipants": 10,
      "level": "Intermediate",
      "matchScore": 95
    }
  ],
  "personalizedTips": [
    {
      "id": "ai-tip-1234567890-0",
      "title": "Maintenez votre série",
      "description": "Vous avez une série de 7 jours ! Continuez à vous entraîner régulièrement pour maintenir votre motivation.",
      "icon": "🔥",
      "category": "motivation",
      "priority": "high"
    }
  ]
}
```

### 2. **POST** `/ai-coach/personalized-tips`
Génère des conseils personnalisés avec ChatGPT.

**Body :**
```json
{
  "workouts": 3,
  "calories": 1200,
  "minutes": 180,
  "streak": 7,
  "sportPreferences": ["Running", "Cycling"],
  "recentActivities": ["Morning Run", "Evening Bike"],
  "stravaData": "Strava: 3 workouts, 1200 calories, 180 minutes, 7 day streak"
}
```

**Réponse :**
```json
{
  "tips": [
    {
      "id": "ai-tip-1234567890-0",
      "title": "Maintenez votre série",
      "description": "Vous avez une série de 7 jours ! Continuez à vous entraîner régulièrement pour maintenir votre motivation.",
      "icon": "🔥",
      "category": "motivation",
      "priority": "high"
    },
    {
      "id": "ai-tip-1234567890-1",
      "title": "Récupération active",
      "description": "Après 3 entraînements cette semaine, pensez à inclure une séance de récupération active comme du yoga ou de la marche.",
      "icon": "🧘",
      "category": "recovery",
      "priority": "medium"
    }
  ]
}
```

### 3. **GET** `/ai-coach/youtube-videos`
Récupère des vidéos YouTube pertinentes.

**Query Parameters :**
- `sportPreferences` (optionnel) : Tableau de sports préférés (ex: `["Running", "Cycling"]`)
- `maxResults` (optionnel, défaut: 10) : Nombre maximum de vidéos (1-50)

**Exemple de requête :**
```
GET /ai-coach/youtube-videos?sportPreferences=Running&sportPreferences=Cycling&maxResults=10
```

**Réponse :**
```json
{
  "videos": [
    {
      "id": "dQw4w9WgXcQ",
      "title": "Running Workout Tutorial",
      "description": "Learn proper running form and technique...",
      "thumbnailUrl": "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
      "channelTitle": "Fitness Channel",
      "publishedAt": "2024-01-01T00:00:00Z",
      "duration": "PT10M30S",
      "viewCount": "123456"
    }
  ]
}
```

---

## 📦 Modèles Swift

### 1. Strava Data Models

```swift
import Foundation

struct StravaActivity: Codable {
    let type: String // "Run", "Ride", "Swim", etc.
    let distance: Double // en mètres
    let duration: Double // en secondes
    let averageSpeed: Double? // en m/s
    let elevationGain: Double? // en mètres
    let date: String // ISO date
}

struct StravaWeeklyStats: Codable {
    let totalDistance: Double
    let totalTime: Double
    let activitiesCount: Int
}

struct StravaData: Codable {
    let recentActivities: [StravaActivity]?
    let weeklyStats: StravaWeeklyStats?
    let favoriteSports: [String]?
    let performanceTrend: PerformanceTrend?
    
    enum PerformanceTrend: String, Codable {
        case improving
        case stable
        case declining
    }
}
```

### 2. Suggestions Request Model

```swift
import Foundation

struct AICoachSuggestionsRequest: Codable {
    let workouts: Int
    let calories: Int
    let minutes: Int
    let streak: Int
    let sportPreferences: String?
    let stravaData: StravaData?
    let recentAppActivities: [String]?
    let joinedActivities: [String]?
    let createdActivities: [String]?
    let location: String?
    let preferredTimeOfDay: PreferredTimeOfDay?
    
    enum PreferredTimeOfDay: String, Codable {
        case morning
        case afternoon
        case evening
        case any
    }
}
```

### 3. Suggestions Response Models

```swift
import Foundation

struct AICoachSuggestionsResponse: Codable {
    let suggestions: [SuggestedActivity]
    let personalizedTips: [PersonalizedTip]?
}

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
    
    var dateValue: Date? {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.date(from: date)
    }
    
    var formattedDate: String {
        guard let dateValue = dateValue else { return date }
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        return formatter.string(from: dateValue)
    }
}

struct PersonalizedTip: Codable, Identifiable {
    let id: String
    let title: String
    let description: String
    let icon: String
    let category: TipCategory
    let priority: TipPriority?
    
    enum TipCategory: String, Codable {
        case training
        case nutrition
        case recovery
        case motivation
        case health
        
        var color: String {
            switch self {
            case .training: return "blue"
            case .nutrition: return "green"
            case .recovery: return "purple"
            case .motivation: return "orange"
            case .health: return "red"
            }
        }
        
        var displayName: String {
            switch self {
            case .training: return "Training"
            case .nutrition: return "Nutrition"
            case .recovery: return "Recovery"
            case .motivation: return "Motivation"
            case .health: return "Health"
            }
        }
    }
    
    enum TipPriority: String, Codable {
        case high
        case medium
        case low
    }
}
```

### 4. Personalized Tips Models

```swift
import Foundation

struct PersonalizedTipsRequest: Codable {
    let workouts: Int
    let calories: Int
    let minutes: Int
    let streak: Int
    let sportPreferences: [String]?
    let recentActivities: [String]?
    let stravaData: String?
}

struct PersonalizedTipsResponse: Codable {
    let tips: [PersonalizedTip]
}
```

### 5. YouTube Videos Models

```swift
import Foundation

struct YouTubeVideosResponse: Codable {
    let videos: [YouTubeVideo]
}

struct YouTubeVideo: Codable, Identifiable {
    let id: String
    let title: String
    let description: String
    let thumbnailUrl: String
    let channelTitle: String
    let publishedAt: String
    let duration: String?
    let viewCount: String?
    
    var youtubeURL: URL? {
        URL(string: "https://www.youtube.com/watch?v=\(id)")
    }
    
    var embedURL: URL? {
        URL(string: "https://www.youtube.com/embed/\(id)")
    }
    
    var formattedDuration: String {
        guard let duration = duration else { return "N/A" }
        // Convertir PT10M30S en "10:30"
        let pattern = "PT(?:((\\d+)H)?(\\d+)M)?(\\d+)S"
        // Simplification pour l'exemple
        return duration.replacingOccurrences(of: "PT", with: "")
            .replacingOccurrences(of: "H", with: ":")
            .replacingOccurrences(of: "M", with: ":")
            .replacingOccurrences(of: "S", with: "")
    }
    
    var formattedViewCount: String {
        guard let viewCount = viewCount, let count = Int(viewCount) else {
            return "N/A views"
        }
        
        if count >= 1_000_000 {
            return String(format: "%.1fM views", Double(count) / 1_000_000)
        } else if count >= 1_000 {
            return String(format: "%.1fK views", Double(count) / 1_000)
        } else {
            return "\(count) views"
        }
    }
    
    var formattedDate: String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        guard let date = formatter.date(from: publishedAt) else {
            return publishedAt
        }
        
        let displayFormatter = DateFormatter()
        displayFormatter.dateStyle = .medium
        return displayFormatter.string(from: date)
    }
}
```

---

## 🌐 Service API

### AICoachAPIService

```swift
import Foundation
import Combine

class AICoachAPIService {
    static let shared = AICoachAPIService()
    
    private let baseURL = "https://apinest-production.up.railway.app"
    private var cancellables = Set<AnyCancellable>()
    
    private init() {}
    
    // MARK: - Suggestions
    
    func getSuggestions(request: AICoachSuggestionsRequest) -> AnyPublisher<AICoachSuggestionsResponse, Error> {
        guard let url = URL(string: "\(baseURL)/ai-coach/suggestions") else {
            return Fail(error: URLError(.badURL))
                .eraseToAnyPublisher()
        }
        
        var urlRequest = URLRequest(url: url)
        urlRequest.httpMethod = "POST"
        urlRequest.setValue("Bearer \(AuthManager.shared.token ?? "")", forHTTPHeaderField: "Authorization")
        urlRequest.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        do {
            urlRequest.httpBody = try JSONEncoder().encode(request)
        } catch {
            return Fail(error: error)
                .eraseToAnyPublisher()
        }
        
        return URLSession.shared.dataTaskPublisher(for: urlRequest)
            .map(\.data)
            .decode(type: AICoachSuggestionsResponse.self, decoder: JSONDecoder())
            .receive(on: DispatchQueue.main)
            .eraseToAnyPublisher()
    }
    
    // MARK: - Personalized Tips
    
    func getPersonalizedTips(request: PersonalizedTipsRequest) -> AnyPublisher<PersonalizedTipsResponse, Error> {
        guard let url = URL(string: "\(baseURL)/ai-coach/personalized-tips") else {
            return Fail(error: URLError(.badURL))
                .eraseToAnyPublisher()
        }
        
        var urlRequest = URLRequest(url: url)
        urlRequest.httpMethod = "POST"
        urlRequest.setValue("Bearer \(AuthManager.shared.token ?? "")", forHTTPHeaderField: "Authorization")
        urlRequest.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        do {
            urlRequest.httpBody = try JSONEncoder().encode(request)
        } catch {
            return Fail(error: error)
                .eraseToAnyPublisher()
        }
        
        return URLSession.shared.dataTaskPublisher(for: urlRequest)
            .map(\.data)
            .decode(type: PersonalizedTipsResponse.self, decoder: JSONDecoder())
            .receive(on: DispatchQueue.main)
            .eraseToAnyPublisher()
    }
    
    // MARK: - YouTube Videos
    
    func getYouTubeVideos(sportPreferences: [String]? = nil, maxResults: Int = 10) -> AnyPublisher<YouTubeVideosResponse, Error> {
        var urlString = "\(baseURL)/ai-coach/youtube-videos"
        var queryItems: [URLQueryItem] = []
        
        if let sports = sportPreferences {
            for sport in sports {
                queryItems.append(URLQueryItem(name: "sportPreferences", value: sport))
            }
        }
        
        queryItems.append(URLQueryItem(name: "maxResults", value: "\(maxResults)"))
        
        var components = URLComponents(string: urlString)
        components?.queryItems = queryItems
        urlString = components?.url?.absoluteString ?? urlString
        
        guard let url = URL(string: urlString) else {
            return Fail(error: URLError(.badURL))
                .eraseToAnyPublisher()
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("Bearer \(AuthManager.shared.token ?? "")", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        return URLSession.shared.dataTaskPublisher(for: request)
            .map(\.data)
            .decode(type: YouTubeVideosResponse.self, decoder: JSONDecoder())
            .receive(on: DispatchQueue.main)
            .eraseToAnyPublisher()
    }
}

// MARK: - Auth Manager (Exemple)

class AuthManager {
    static let shared = AuthManager()
    var token: String?
    private init() {}
}
```

---

## 🎨 ViewModels

### AICoachViewModel

```swift
import Foundation
import Combine
import SwiftUI

@MainActor
class AICoachViewModel: ObservableObject {
    @Published var suggestions: [SuggestedActivity] = []
    @Published var personalizedTips: [PersonalizedTip] = []
    @Published var youtubeVideos: [YouTubeVideo] = []
    
    @Published var isLoading = false
    @Published var isLoadingSuggestions = false
    @Published var isLoadingTips = false
    @Published var isLoadingVideos = false
    @Published var errorMessage: String?
    
    // User stats (peuvent venir de Strava ou de l'app)
    @Published var workouts: Int = 0
    @Published var calories: Int = 0
    @Published var minutes: Int = 0
    @Published var streak: Int = 0
    @Published var sportPreferences: String = ""
    @Published var location: String = ""
    @Published var preferredTimeOfDay: AICoachSuggestionsRequest.PreferredTimeOfDay = .any
    
    // Strava data (optionnel)
    @Published var stravaData: StravaData?
    
    private let apiService = AICoachAPIService.shared
    private var cancellables = Set<AnyCancellable>()
    
    init() {
        // Charger les données initiales si nécessaire
    }
    
    // MARK: - Load Suggestions
    
    func loadSuggestions() {
        isLoadingSuggestions = true
        errorMessage = nil
        
        let request = AICoachSuggestionsRequest(
            workouts: workouts,
            calories: calories,
            minutes: minutes,
            streak: streak,
            sportPreferences: sportPreferences.isEmpty ? nil : sportPreferences,
            stravaData: stravaData,
            recentAppActivities: nil, // À remplir avec les activités récentes de l'app
            joinedActivities: nil, // À remplir avec les activités rejointes
            createdActivities: nil, // À remplir avec les activités créées
            location: location.isEmpty ? nil : location,
            preferredTimeOfDay: preferredTimeOfDay
        )
        
        apiService.getSuggestions(request: request)
            .sink(
                receiveCompletion: { [weak self] completion in
                    self?.isLoadingSuggestions = false
                    if case .failure(let error) = completion {
                        self?.errorMessage = error.localizedDescription
                    }
                },
                receiveValue: { [weak self] response in
                    self?.suggestions = response.suggestions
                    if let tips = response.personalizedTips {
                        self?.personalizedTips = tips
                    }
                    self?.isLoadingSuggestions = false
                }
            )
            .store(in: &cancellables)
    }
    
    // MARK: - Load Personalized Tips
    
    func loadPersonalizedTips() {
        isLoadingTips = true
        errorMessage = nil
        
        let stravaDataString: String? = {
            guard let stravaData = stravaData else { return nil }
            return "Strava: \(stravaData.weeklyStats?.activitiesCount ?? 0) workouts, \(stravaData.weeklyStats?.totalDistance ?? 0) meters, \(stravaData.weeklyStats?.totalTime ?? 0) seconds, \(streak) day streak"
        }()
        
        let request = PersonalizedTipsRequest(
            workouts: workouts,
            calories: calories,
            minutes: minutes,
            streak: streak,
            sportPreferences: sportPreferences.isEmpty ? nil : sportPreferences.components(separatedBy: ", "),
            recentActivities: nil, // À remplir avec les activités récentes
            stravaData: stravaDataString
        )
        
        apiService.getPersonalizedTips(request: request)
            .sink(
                receiveCompletion: { [weak self] completion in
                    self?.isLoadingTips = false
                    if case .failure(let error) = completion {
                        self?.errorMessage = error.localizedDescription
                    }
                },
                receiveValue: { [weak self] response in
                    self?.personalizedTips = response.tips
                    self?.isLoadingTips = false
                }
            )
            .store(in: &cancellables)
    }
    
    // MARK: - Load YouTube Videos
    
    func loadYouTubeVideos(maxResults: Int = 10) {
        isLoadingVideos = true
        errorMessage = nil
        
        let sportPreferencesArray: [String]? = {
            guard !sportPreferences.isEmpty else { return nil }
            return sportPreferences.components(separatedBy: ", ").filter { !$0.isEmpty }
        }()
        
        apiService.getYouTubeVideos(sportPreferences: sportPreferencesArray, maxResults: maxResults)
            .sink(
                receiveCompletion: { [weak self] completion in
                    self?.isLoadingVideos = false
                    if case .failure(let error) = completion {
                        self?.errorMessage = error.localizedDescription
                    }
                },
                receiveValue: { [weak self] response in
                    self?.youtubeVideos = response.videos
                    self?.isLoadingVideos = false
                }
            )
            .store(in: &cancellables)
    }
    
    // MARK: - Update User Stats
    
    func updateUserStats(workouts: Int, calories: Int, minutes: Int, streak: Int) {
        self.workouts = workouts
        self.calories = calories
        self.minutes = minutes
        self.streak = streak
    }
    
    func updateStravaData(_ data: StravaData) {
        self.stravaData = data
    }
    
    func updatePreferences(sports: String, location: String, timeOfDay: AICoachSuggestionsRequest.PreferredTimeOfDay) {
        self.sportPreferences = sports
        self.location = location
        self.preferredTimeOfDay = timeOfDay
    }
}
```

---

## 🖼️ Vues UI

### AICoachView (Vue Principale)

```swift
import SwiftUI

struct AICoachView: View {
    @StateObject private var viewModel = AICoachViewModel()
    @State private var selectedTab: TabSelection = .suggestions
    
    enum TabSelection {
        case suggestions
        case tips
        case videos
    }
    
    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Header avec stats
                AICoachStatsHeader(viewModel: viewModel)
                
                // Tabs
                Picker("Section", selection: $selectedTab) {
                    Text("Suggestions").tag(TabSelection.suggestions)
                    Text("Tips").tag(TabSelection.tips)
                    Text("Videos").tag(TabSelection.videos)
                }
                .pickerStyle(.segmented)
                .padding()
                
                // Content
                TabView(selection: $selectedTab) {
                    SuggestionsView(viewModel: viewModel)
                        .tag(TabSelection.suggestions)
                    
                    TipsView(viewModel: viewModel)
                        .tag(TabSelection.tips)
                    
                    VideosView(viewModel: viewModel)
                        .tag(TabSelection.videos)
                }
                .tabViewStyle(.page(indexDisplayMode: .never))
            }
            .navigationTitle("AI Coach")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: {
                        switch selectedTab {
                        case .suggestions:
                            viewModel.loadSuggestions()
                        case .tips:
                            viewModel.loadPersonalizedTips()
                        case .videos:
                            viewModel.loadYouTubeVideos()
                        }
                    }) {
                        Image(systemName: "arrow.clockwise")
                    }
                }
            }
            .onAppear {
                viewModel.loadSuggestions()
            }
            .alert("Error", isPresented: .constant(viewModel.errorMessage != nil)) {
                Button("OK") {
                    viewModel.errorMessage = nil
                }
            } message: {
                Text(viewModel.errorMessage ?? "")
            }
        }
    }
}
```

### AICoachStatsHeader

```swift
import SwiftUI

struct AICoachStatsHeader: View {
    @ObservedObject var viewModel: AICoachViewModel
    
    var body: some View {
        VStack(spacing: 16) {
            HStack(spacing: 20) {
                StatItem(
                    title: "Workouts",
                    value: "\(viewModel.workouts)",
                    icon: "figure.run",
                    color: .blue
                )
                
                StatItem(
                    title: "Calories",
                    value: "\(viewModel.calories)",
                    icon: "flame.fill",
                    color: .orange
                )
                
                StatItem(
                    title: "Minutes",
                    value: "\(viewModel.minutes)",
                    icon: "clock.fill",
                    color: .green
                )
                
                StatItem(
                    title: "Streak",
                    value: "\(viewModel.streak)",
                    icon: "flame.fill",
                    color: .red
                )
            }
            
            if viewModel.streak > 0 {
                HStack {
                    Image(systemName: "flame.fill")
                        .foregroundColor(.orange)
                    Text("\(viewModel.streak) day streak! Keep it up! 🔥")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
            }
        }
        .padding()
        .background(Color(.systemGray6))
    }
}

struct StatItem: View {
    let title: String
    let value: String
    let icon: String
    let color: Color
    
    var body: some View {
        VStack(spacing: 4) {
            Image(systemName: icon)
                .font(.title3)
                .foregroundColor(color)
            
            Text(value)
                .font(.headline)
                .fontWeight(.bold)
            
            Text(title)
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity)
    }
}
```

### SuggestionsView

```swift
import SwiftUI

struct SuggestionsView: View {
    @ObservedObject var viewModel: AICoachViewModel
    
    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                if viewModel.isLoadingSuggestions {
                    ProgressView()
                        .padding()
                } else if viewModel.suggestions.isEmpty {
                    EmptyStateView(
                        icon: "sparkles",
                        title: "No suggestions yet",
                        message: "Load your Strava data or update your preferences to get personalized activity suggestions."
                    )
                } else {
                    ForEach(viewModel.suggestions) { suggestion in
                        SuggestedActivityCard(suggestion: suggestion)
                    }
                }
            }
            .padding()
        }
        .refreshable {
            viewModel.loadSuggestions()
        }
    }
}

struct SuggestedActivityCard: View {
    let suggestion: SuggestedActivity
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Header
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(suggestion.title)
                        .font(.headline)
                    
                    HStack(spacing: 8) {
                        Label(suggestion.sportType, systemImage: "sportscourt.fill")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                        
                        Label(suggestion.level, systemImage: "chart.bar.fill")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    }
                }
                
                Spacer()
                
                // Match Score
                VStack {
                    Text("\(suggestion.matchScore)%")
                        .font(.title3)
                        .fontWeight(.bold)
                        .foregroundColor(matchScoreColor)
                    
                    Text("Match")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                .padding(8)
                .background(matchScoreColor.opacity(0.1))
                .cornerRadius(8)
            }
            
            Divider()
            
            // Details
            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Image(systemName: "location.fill")
                    Text(suggestion.location)
                        .font(.subheadline)
                }
                
                HStack {
                    Image(systemName: "calendar")
                    Text(suggestion.formattedDate)
                        .font(.subheadline)
                    
                    Image(systemName: "clock")
                    Text(suggestion.time)
                        .font(.subheadline)
                }
                
                HStack {
                    Image(systemName: "person.2.fill")
                    Text("\(suggestion.participants)/\(suggestion.maxParticipants) participants")
                        .font(.subheadline)
                }
            }
            .foregroundColor(.secondary)
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.1), radius: 5, x: 0, y: 2)
    }
    
    private var matchScoreColor: Color {
        if suggestion.matchScore >= 80 {
            return .green
        } else if suggestion.matchScore >= 60 {
            return .orange
        } else {
            return .red
        }
    }
}

struct EmptyStateView: View {
    let icon: String
    let title: String
    let message: String
    
    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: icon)
                .font(.system(size: 60))
                .foregroundColor(.gray)
            
            Text(title)
                .font(.title2)
                .fontWeight(.semibold)
            
            Text(message)
                .font(.subheadline)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal)
        }
        .padding(.vertical, 40)
    }
}
```

### TipsView

```swift
import SwiftUI

struct TipsView: View {
    @ObservedObject var viewModel: AICoachViewModel
    
    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                if viewModel.isLoadingTips {
                    ProgressView()
                        .padding()
                } else if viewModel.personalizedTips.isEmpty {
                    EmptyStateView(
                        icon: "lightbulb.fill",
                        title: "No tips yet",
                        message: "Update your stats and preferences to get personalized tips from AI Coach."
                    )
                } else {
                    ForEach(viewModel.personalizedTips) { tip in
                        PersonalizedTipCard(tip: tip)
                    }
                }
            }
            .padding()
        }
        .refreshable {
            viewModel.loadPersonalizedTips()
        }
    }
}

struct PersonalizedTipCard: View {
    let tip: PersonalizedTip
    
    var body: some View {
        HStack(alignment: .top, spacing: 16) {
            // Icon
            Text(tip.icon)
                .font(.system(size: 40))
                .frame(width: 50, height: 50)
                .background(categoryColor.opacity(0.1))
                .cornerRadius(10)
            
            // Content
            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Text(tip.category.displayName.uppercased())
                        .font(.caption)
                        .fontWeight(.semibold)
                        .foregroundColor(categoryColor)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(categoryColor.opacity(0.1))
                        .cornerRadius(6)
                    
                    if let priority = tip.priority, priority == .high {
                        Spacer()
                        Image(systemName: "exclamationmark.circle.fill")
                            .foregroundColor(.orange)
                    }
                }
                
                Text(tip.title)
                    .font(.headline)
                
                Text(tip.description)
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.1), radius: 5, x: 0, y: 2)
    }
    
    private var categoryColor: Color {
        switch tip.category {
        case .training: return .blue
        case .nutrition: return .green
        case .recovery: return .purple
        case .motivation: return .orange
        case .health: return .red
        }
    }
}
```

### VideosView

```swift
import SwiftUI

struct VideosView: View {
    @ObservedObject var viewModel: AICoachViewModel
    
    var body: some View {
        ScrollView {
            LazyVStack(spacing: 16) {
                if viewModel.isLoadingVideos {
                    ProgressView()
                        .padding()
                } else if viewModel.youtubeVideos.isEmpty {
                    EmptyStateView(
                        icon: "play.rectangle.fill",
                        title: "No videos found",
                        message: "Update your sport preferences to get relevant fitness videos."
                    )
                } else {
                    ForEach(viewModel.youtubeVideos) { video in
                        YouTubeVideoCard(video: video)
                    }
                }
            }
            .padding()
        }
        .refreshable {
            viewModel.loadYouTubeVideos()
        }
    }
}

struct YouTubeVideoCard: View {
    let video: YouTubeVideo
    @State private var showVideoPlayer = false
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Thumbnail
            ZStack(alignment: .center) {
                AsyncImage(url: URL(string: video.thumbnailUrl)) { image in
                    image
                        .resizable()
                        .aspectRatio(16/9, contentMode: .fill)
                } placeholder: {
                    Rectangle()
                        .fill(Color.gray.opacity(0.3))
                        .overlay {
                            ProgressView()
                        }
                }
                .frame(height: 200)
                .clipped()
                .cornerRadius(12)
                
                // Play button
                Button(action: {
                    showVideoPlayer = true
                }) {
                    Image(systemName: "play.circle.fill")
                        .font(.system(size: 60))
                        .foregroundColor(.white)
                        .shadow(radius: 10)
                }
            }
            
            // Video info
            VStack(alignment: .leading, spacing: 8) {
                Text(video.title)
                    .font(.headline)
                    .lineLimit(2)
                
                Text(video.channelTitle)
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                
                HStack(spacing: 12) {
                    if let duration = video.duration {
                        Label(video.formattedDuration, systemImage: "clock")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    
                    if let viewCount = video.viewCount {
                        Text(video.formattedViewCount)
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    
                    Text(video.formattedDate)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            .padding(.horizontal, 4)
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.1), radius: 5, x: 0, y: 2)
        .sheet(isPresented: $showVideoPlayer) {
            YouTubeVideoPlayerView(video: video)
        }
    }
}

struct YouTubeVideoPlayerView: View {
    let video: YouTubeVideo
    @Environment(\.dismiss) var dismiss
    
    var body: some View {
        NavigationView {
            WebView(url: video.embedURL ?? video.youtubeURL)
                .navigationTitle(video.title)
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .navigationBarTrailing) {
                        Button("Done") {
                            dismiss()
                        }
                    }
                }
        }
    }
}

// MARK: - WebView pour YouTube Embed

import WebKit

struct WebView: UIViewRepresentable {
    let url: URL?
    
    func makeUIView(context: Context) -> WKWebView {
        let webView = WKWebView()
        webView.navigationDelegate = context.coordinator
        return webView
    }
    
    func updateUIView(_ webView: WKWebView, context: Context) {
        guard let url = url else { return }
        let request = URLRequest(url: url)
        webView.load(request)
    }
    
    func makeCoordinator() -> Coordinator {
        Coordinator()
    }
    
    class Coordinator: NSObject, WKNavigationDelegate {
        // Implémenter les méthodes du delegate si nécessaire
    }
}
```

---

## 🔄 Intégration avec Strava

### StravaDataManager

```swift
import Foundation

class StravaDataManager {
    static let shared = StravaDataManager()
    
    private init() {}
    
    func convertStravaActivities(_ activities: [StravaActivityResponse]) -> StravaData {
        let stravaActivities = activities.map { activity in
            StravaActivity(
                type: activity.type,
                distance: activity.distance,
                duration: activity.movingTime,
                averageSpeed: activity.averageSpeed,
                elevationGain: activity.totalElevationGain,
                date: activity.startDate
            )
        }
        
        // Calculer les stats hebdomadaires
        let weeklyStats = calculateWeeklyStats(from: stravaActivities)
        
        // Extraire les sports favoris
        let favoriteSports = extractFavoriteSports(from: stravaActivities)
        
        // Déterminer la tendance de performance
        let performanceTrend = determinePerformanceTrend(from: stravaActivities)
        
        return StravaData(
            recentActivities: stravaActivities,
            weeklyStats: weeklyStats,
            favoriteSports: favoriteSports,
            performanceTrend: performanceTrend
        )
    }
    
    private func calculateWeeklyStats(from activities: [StravaActivity]) -> StravaWeeklyStats {
        let totalDistance = activities.reduce(0) { $0 + $1.distance }
        let totalTime = activities.reduce(0) { $0 + $1.duration }
        let activitiesCount = activities.count
        
        return StravaWeeklyStats(
            totalDistance: totalDistance,
            totalTime: totalTime,
            activitiesCount: activitiesCount
        )
    }
    
    private func extractFavoriteSports(from activities: [StravaActivity]) -> [String] {
        let sportCounts = Dictionary(grouping: activities, by: { $0.type })
            .mapValues { $0.count }
            .sorted { $0.value > $1.value }
        
        return Array(sportCounts.prefix(3).map { $0.key })
    }
    
    private func determinePerformanceTrend(from activities: [StravaActivity]) -> StravaData.PerformanceTrend {
        guard activities.count >= 2 else { return .stable }
        
        // Comparer la distance moyenne des premières et dernières activités
        let firstHalf = Array(activities.prefix(activities.count / 2))
        let secondHalf = Array(activities.suffix(activities.count / 2))
        
        let firstAvgDistance = firstHalf.reduce(0.0) { $0 + $1.distance } / Double(firstHalf.count)
        let secondAvgDistance = secondHalf.reduce(0.0) { $0 + $1.distance } / Double(secondHalf.count)
        
        let difference = ((secondAvgDistance - firstAvgDistance) / firstAvgDistance) * 100
        
        if difference > 10 {
            return .improving
        } else if difference < -10 {
            return .declining
        } else {
            return .stable
        }
    }
}
```

---

## 📱 Intégration Complète

### App Integration

```swift
import SwiftUI

@main
struct FitnessApp: App {
    var body: some Scene {
        WindowGroup {
            TabView {
                HomeView()
                    .tabItem {
                        Label("Home", systemImage: "house.fill")
                    }
                
                AICoachView()
                    .tabItem {
                        Label("AI Coach", systemImage: "sparkles")
                    }
            }
        }
    }
}
```

---

## ✅ Checklist d'Implémentation

- [ ] Créer les modèles Swift (StravaData, Suggestions, Tips, Videos)
- [ ] Implémenter `AICoachAPIService`
- [ ] Créer `AICoachViewModel`
- [ ] Implémenter `AICoachView` avec tabs
- [ ] Créer les composants UI (SuggestionsView, TipsView, VideosView)
- [ ] Intégrer avec Strava (StravaDataManager)
- [ ] Ajouter la gestion des erreurs
- [ ] Tester tous les endpoints
- [ ] Ajouter le refresh pull-to-refresh
- [ ] Implémenter le WebView pour YouTube
- [ ] Ajouter les animations de chargement
- [ ] Tester sur différents appareils iOS

---

## 🚀 Utilisation

1. **Initialiser le ViewModel** dans votre vue :
```swift
@StateObject private var viewModel = AICoachViewModel()
```

2. **Mettre à jour les stats utilisateur** :
```swift
viewModel.updateUserStats(workouts: 3, calories: 1200, minutes: 180, streak: 7)
```

3. **Intégrer les données Strava** :
```swift
let stravaData = StravaDataManager.shared.convertStravaActivities(stravaActivities)
viewModel.updateStravaData(stravaData)
```

4. **Charger les suggestions** :
```swift
viewModel.loadSuggestions()
```

5. **Charger les tips** :
```swift
viewModel.loadPersonalizedTips()
```

6. **Charger les vidéos** :
```swift
viewModel.loadYouTubeVideos(maxResults: 10)
```

---

## 📝 Notes Importantes

1. **Authentification** : Tous les endpoints nécessitent un token JWT valide
2. **Strava Data** : Les données Strava sont optionnelles mais améliorent grandement la personnalisation
3. **AI Models** : Le backend utilise ChatGPT en priorité, puis Gemini en fallback
4. **YouTube API** : Nécessite une clé API YouTube configurée côté backend
5. **Error Handling** : Toujours gérer les erreurs réseau et de décodage
6. **Loading States** : Afficher des indicateurs de chargement pendant les requêtes
7. **Caching** : Considérer la mise en cache des suggestions pour améliorer l'expérience

---

## 🔗 URLs des Endpoints

- **Suggestions** : `POST /ai-coach/suggestions`
- **Personalized Tips** : `POST /ai-coach/personalized-tips`
- **YouTube Videos** : `GET /ai-coach/youtube-videos?sportPreferences=Running&maxResults=10`

---

## 🎨 Catégories de Tips

- **training** : Conseils sur l'entraînement
- **nutrition** : Conseils sur la nutrition
- **recovery** : Conseils sur la récupération
- **motivation** : Conseils de motivation
- **health** : Conseils de santé

---

## 📊 Structure des Données Strava

Les données Strava peuvent inclure :
- **Recent Activities** : Activités récentes avec type, distance, durée, vitesse, dénivelé
- **Weekly Stats** : Statistiques hebdomadaires (distance totale, temps total, nombre d'activités)
- **Favorite Sports** : Sports les plus pratiqués
- **Performance Trend** : Tendance de performance (improving, stable, declining)

---

Ce guide fournit une implémentation complète de l'AI Coach pour iOS Swift. Tous les endpoints, modèles, services et vues sont détaillés avec des exemples de code prêts à l'emploi.

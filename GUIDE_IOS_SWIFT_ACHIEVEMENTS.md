# 📱 Guide iOS Swift - Système d'Achievements

## 🎯 Vue d'Ensemble

Ce guide explique comment intégrer le système d'achievements dans votre application iOS Swift avec SwiftUI, incluant l'affichage des niveaux, badges, challenges, notifications et leaderboard.

---

## 🔌 Endpoints API

### Base URL
```
https://apinest-production.up.railway.app
```

### Endpoints Disponibles

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/achievements/summary` | GET | Résumé (niveau, XP, stats) |
| `/achievements/badges` | GET | Badges gagnés et en cours |
| `/achievements/challenges` | GET | Challenges actifs |
| `/achievements/leaderboard` | GET | Classement des utilisateurs |
| `/achievements/notifications` | GET | Notifications (badges, level up, etc.) |
| `/achievements/notifications/:id/read` | POST | Marquer une notification comme lue |
| `/achievements/notifications/read-all` | POST | Marquer toutes les notifications comme lues |

**Tous les endpoints nécessitent une authentification JWT.**

---

## 🏗️ Architecture iOS

### Structure Recommandée (MVVM)

```
NexoFitness/
├── Models/
│   ├── Achievements/
│   │   ├── AchievementSummary.swift
│   │   ├── Badge.swift
│   │   ├── BadgeProgress.swift
│   │   ├── Challenge.swift
│   │   ├── Notification.swift
│   │   └── LeaderboardEntry.swift
├── Services/
│   ├── AchievementsAPI.swift
│   └── AuthService.swift
├── ViewModels/
│   └── AchievementsViewModel.swift
└── Views/
    ├── Achievements/
    │   ├── AchievementsView.swift
    │   ├── BadgesView.swift
    │   ├── ChallengesView.swift
    │   ├── LeaderboardView.swift
    │   └── NotificationsView.swift
```

---

## 📦 Models

### 1. AchievementSummary.swift

```swift
import Foundation

struct AchievementSummary: Codable {
    let level: LevelInfo
    let stats: StatsInfo
    
    struct LevelInfo: Codable {
        let currentLevel: Int
        let totalXp: Int
        let xpForNextLevel: Int
        let currentLevelXp: Int
        let progressPercentage: Double
    }
    
    struct StatsInfo: Codable {
        let totalBadges: Int
        let currentStreak: Int
        let bestStreak: Int
    }
}
```

### 2. Badge.swift

```swift
import Foundation

struct Badge: Codable, Identifiable {
    let id: String
    let name: String
    let description: String
    let iconUrl: String?
    let rarity: BadgeRarity
    let category: BadgeCategory
    let earnedAt: Date?
    
    enum CodingKeys: String, CodingKey {
        case id = "_id"
        case name
        case description
        case iconUrl
        case rarity
        case category
        case earnedAt
    }
    
    enum BadgeRarity: String, Codable {
        case common = "common"
        case uncommon = "uncommon"
        case rare = "rare"
        case epic = "epic"
        case legendary = "legendary"
        
        var color: String {
            switch self {
            case .common: return "green"
            case .uncommon: return "blue"
            case .rare: return "purple"
            case .epic: return "orange"
            case .legendary: return "gold"
            }
        }
    }
    
    enum BadgeCategory: String, Codable {
        case creation = "creation"
        case completion = "completion"
        case distance = "distance"
        case duration = "duration"
        case streak = "streak"
        case sport = "sport"
    }
}

struct BadgeProgress: Codable, Identifiable {
    let id: String
    let badge: Badge
    let currentProgress: Int
    let target: Int
    let percentage: Double
    
    enum CodingKeys: String, CodingKey {
        case id = "_id"
        case badge
        case currentProgress
        case target
        case percentage
    }
}

struct BadgesResponse: Codable {
    let earnedBadges: [Badge]
    let inProgress: [BadgeProgress]
}
```

### 3. Challenge.swift

```swift
import Foundation

struct Challenge: Codable, Identifiable {
    let id: String
    let name: String
    let description: String
    let challengeType: ChallengeType
    let xpReward: Int
    let currentProgress: Int
    let target: Int
    let daysLeft: Int
    let expiresAt: Date
    
    enum CodingKeys: String, CodingKey {
        case id = "_id"
        case name
        case description
        case challengeType
        case xpReward
        case currentProgress
        case target
        case daysLeft
        case expiresAt
    }
    
    enum ChallengeType: String, Codable {
        case daily = "daily"
        case weekly = "weekly"
        case monthly = "monthly"
        case distance = "distance"
        case duration = "duration"
    }
    
    var isCompleted: Bool {
        currentProgress >= target
    }
    
    var progressPercentage: Double {
        guard target > 0 else { return 0 }
        return min(Double(currentProgress) / Double(target), 1.0) * 100
    }
}

struct ChallengesResponse: Codable {
    let activeChallenges: [Challenge]
}
```

### 4. Notification.swift

```swift
import Foundation

struct AchievementNotification: Codable, Identifiable {
    let id: String
    let type: NotificationType
    let title: String
    let message: String
    let metadata: [String: Any]?
    let isRead: Bool
    let createdAt: Date
    
    enum CodingKeys: String, CodingKey {
        case id = "_id"
        case type
        case title
        case message
        case metadata
        case isRead
        case createdAt
    }
    
    enum NotificationType: String, Codable {
        case badgeUnlocked = "badge_unlocked"
        case levelUp = "level_up"
        case challengeCompleted = "challenge_completed"
        case xpEarned = "xp_earned"
        case streakUpdated = "streak_updated"
        case likeReceived = "like_received"
        case matchMade = "match_made"
    }
    
    // Custom decoder pour gérer metadata comme Dictionary
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(String.self, forKey: .id)
        type = try container.decode(NotificationType.self, forKey: .type)
        title = try container.decode(String.self, forKey: .title)
        message = try container.decode(String.self, forKey: .message)
        isRead = try container.decode(Bool.self, forKey: .isRead)
        createdAt = try container.decode(Date.self, forKey: .createdAt)
        
        // Metadata peut être n'importe quel JSON object
        if let metadataData = try? container.decode([String: AnyCodable].self, forKey: .metadata) {
            metadata = metadataData.mapValues { $0.value }
        } else {
            metadata = nil
        }
    }
}

// Helper pour décoder Any dans JSON
struct AnyCodable: Codable {
    let value: Any
    
    init(_ value: Any) {
        self.value = value
    }
    
    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        
        if let bool = try? container.decode(Bool.self) {
            value = bool
        } else if let int = try? container.decode(Int.self) {
            value = int
        } else if let double = try? container.decode(Double.self) {
            value = double
        } else if let string = try? container.decode(String.self) {
            value = string
        } else if let array = try? container.decode([AnyCodable].self) {
            value = array.map { $0.value }
        } else if let dict = try? container.decode([String: AnyCodable].self) {
            value = dict.mapValues { $0.value }
        } else {
            throw DecodingError.dataCorruptedError(in: container, debugDescription: "Cannot decode AnyCodable")
        }
    }
    
    func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        
        switch value {
        case let bool as Bool:
            try container.encode(bool)
        case let int as Int:
            try container.encode(int)
        case let double as Double:
            try container.encode(double)
        case let string as String:
            try container.encode(string)
        case let array as [Any]:
            try container.encode(array.map { AnyCodable($0) })
        case let dict as [String: Any]:
            try container.encode(dict.mapValues { AnyCodable($0) })
        default:
            throw EncodingError.invalidValue(value, EncodingError.Context(codingPath: container.codingPath, debugDescription: "Cannot encode AnyCodable"))
        }
    }
}

struct NotificationsResponse: Codable {
    let notifications: [AchievementNotification]
    let pagination: PaginationInfo
    
    struct PaginationInfo: Codable {
        let total: Int
        let page: Int
        let totalPages: Int
        let limit: Int
    }
}
```

### 5. LeaderboardEntry.swift

```swift
import Foundation

struct LeaderboardEntry: Codable, Identifiable {
    let id: String
    let user: UserInfo
    let rank: Int
    let totalXp: Int
    let currentLevel: Int
    let totalBadges: Int
    
    enum CodingKeys: String, CodingKey {
        case id = "_id"
        case user
        case rank
        case totalXp
        case currentLevel
        case totalBadges
    }
    
    struct UserInfo: Codable {
        let id: String
        let name: String
        let email: String
        let profileImageUrl: String?
        
        enum CodingKeys: String, CodingKey {
            case id = "_id"
            case name
            case email
            case profileImageUrl
        }
    }
}

struct LeaderboardResponse: Codable {
    let leaderboard: [LeaderboardEntry]
    let userRank: Int?
    let pagination: PaginationInfo
    
    struct PaginationInfo: Codable {
        let total: Int
        let page: Int
        let totalPages: Int
        let limit: Int
    }
}
```

---

## 🔌 Services API

### AchievementsAPI.swift

```swift
import Foundation

class AchievementsAPI {
    private let baseURL = "https://apinest-production.up.railway.app"
    private let session: URLSession
    
    init() {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 30
        config.timeoutIntervalForResource = 60
        self.session = URLSession(configuration: config)
    }
    
    // MARK: - Helper Methods
    
    private func createRequest(endpoint: String, method: String = "GET", body: Data? = nil) throws -> URLRequest {
        guard let url = URL(string: "\(baseURL)\(endpoint)") else {
            throw APIError.invalidURL
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        // Ajouter le token JWT depuis AuthService
        if let token = AuthService.shared.accessToken {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        
        if let body = body {
            request.httpBody = body
        }
        
        return request
    }
    
    private func performRequest<T: Decodable>(_ request: URLRequest, responseType: T.Type) async throws -> T {
        let (data, response) = try await session.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }
        
        guard (200...299).contains(httpResponse.statusCode) else {
            if httpResponse.statusCode == 401 {
                throw APIError.unauthorized
            }
            throw APIError.httpError(httpResponse.statusCode)
        }
        
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        
        do {
            return try decoder.decode(T.self, from: data)
        } catch {
            print("Decoding error: \(error)")
            if let jsonString = String(data: data, encoding: .utf8) {
                print("Response JSON: \(jsonString)")
            }
            throw APIError.decodingError(error)
        }
    }
    
    // MARK: - API Methods
    
    /// Récupère le résumé des achievements (niveau, XP, stats)
    func getSummary() async throws -> AchievementSummary {
        let request = try createRequest(endpoint: "/achievements/summary")
        return try await performRequest(request, responseType: AchievementSummary.self)
    }
    
    /// Récupère les badges (gagnés et en cours)
    func getBadges() async throws -> BadgesResponse {
        let request = try createRequest(endpoint: "/achievements/badges")
        return try await performRequest(request, responseType: BadgesResponse.self)
    }
    
    /// Récupère les challenges actifs
    func getChallenges() async throws -> ChallengesResponse {
        let request = try createRequest(endpoint: "/achievements/challenges")
        return try await performRequest(request, responseType: ChallengesResponse.self)
    }
    
    /// Récupère le leaderboard
    func getLeaderboard(page: Int = 1, limit: Int = 20) async throws -> LeaderboardResponse {
        let endpoint = "/achievements/leaderboard?page=\(page)&limit=\(limit)"
        let request = try createRequest(endpoint: endpoint)
        return try await performRequest(request, responseType: LeaderboardResponse.self)
    }
    
    /// Récupère les notifications
    func getNotifications(page: Int = 1, limit: Int = 20, unreadOnly: Bool = false) async throws -> NotificationsResponse {
        let endpoint = "/achievements/notifications?page=\(page)&limit=\(limit)&unreadOnly=\(unreadOnly)"
        let request = try createRequest(endpoint: endpoint)
        return try await performRequest(request, responseType: NotificationsResponse.self)
    }
    
    /// Marque une notification comme lue
    func markNotificationAsRead(notificationId: String) async throws {
        let endpoint = "/achievements/notifications/\(notificationId)/read"
        let request = try createRequest(endpoint: endpoint, method: "POST")
        _ = try await performRequest(request, responseType: EmptyResponse.self)
    }
    
    /// Marque toutes les notifications comme lues
    func markAllNotificationsAsRead() async throws {
        let request = try createRequest(endpoint: "/achievements/notifications/read-all", method: "POST")
        _ = try await performRequest(request, responseType: EmptyResponse.self)
    }
}

// MARK: - Error Types

enum APIError: Error, LocalizedError {
    case invalidURL
    case invalidResponse
    case unauthorized
    case httpError(Int)
    case decodingError(Error)
    case networkError(Error)
    
    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "URL invalide"
        case .invalidResponse:
            return "Réponse invalide du serveur"
        case .unauthorized:
            return "Non autorisé. Veuillez vous reconnecter."
        case .httpError(let code):
            return "Erreur HTTP \(code)"
        case .decodingError(let error):
            return "Erreur de décodage: \(error.localizedDescription)"
        case .networkError(let error):
            return "Erreur réseau: \(error.localizedDescription)"
        }
    }
}

// MARK: - Empty Response

struct EmptyResponse: Codable {
    let success: Bool?
}
```

### AuthService.swift (Exemple)

```swift
import Foundation

class AuthService: ObservableObject {
    static let shared = AuthService()
    
    @Published var accessToken: String? {
        didSet {
            if let token = accessToken {
                UserDefaults.standard.set(token, forKey: "accessToken")
            } else {
                UserDefaults.standard.removeObject(forKey: "accessToken")
            }
        }
    }
    
    private init() {
        self.accessToken = UserDefaults.standard.string(forKey: "accessToken")
    }
    
    func logout() {
        accessToken = nil
    }
}
```

---

## 🎨 ViewModels

### AchievementsViewModel.swift

```swift
import Foundation
import SwiftUI
import Combine

@MainActor
class AchievementsViewModel: ObservableObject {
    private let api = AchievementsAPI()
    
    // MARK: - Published Properties
    
    @Published var summary: AchievementSummary?
    @Published var badges: BadgesResponse?
    @Published var challenges: [Challenge] = []
    @Published var leaderboard: [LeaderboardEntry] = []
    @Published var notifications: [AchievementNotification] = []
    
    @Published var isLoading = false
    @Published var errorMessage: String?
    
    // MARK: - New Badges/Level Up Events
    
    @Published var newBadgesUnlocked: [Badge] = []
    @Published var levelUpEvent: AchievementSummary.LevelInfo?
    
    // MARK: - Load Methods
    
    func loadSummary() async {
        isLoading = true
        errorMessage = nil
        
        do {
            let summary = try await api.getSummary()
            let oldLevel = self.summary?.level.currentLevel ?? 0
            
            self.summary = summary
            
            // Détecter level up
            if summary.level.currentLevel > oldLevel && oldLevel > 0 {
                levelUpEvent = summary.level
            }
        } catch {
            errorMessage = error.localizedDescription
            print("Error loading summary: \(error)")
        }
        
        isLoading = false
    }
    
    func loadBadges() async {
        isLoading = true
        errorMessage = nil
        
        do {
            let response = try await api.getBadges()
            let oldEarnedIds = Set(self.badges?.earnedBadges.map { $0.id } ?? [])
            let newEarnedIds = Set(response.earnedBadges.map { $0.id })
            
            // Détecter nouveaux badges
            let newBadges = response.earnedBadges.filter { !oldEarnedIds.contains($0.id) }
            if !newBadges.isEmpty {
                newBadgesUnlocked = newBadges
            }
            
            self.badges = response
        } catch {
            errorMessage = error.localizedDescription
            print("Error loading badges: \(error)")
        }
        
        isLoading = false
    }
    
    func loadChallenges() async {
        isLoading = true
        errorMessage = nil
        
        do {
            let response = try await api.getChallenges()
            self.challenges = response.activeChallenges
        } catch {
            errorMessage = error.localizedDescription
            print("Error loading challenges: \(error)")
        }
        
        isLoading = false
    }
    
    func loadLeaderboard(page: Int = 1) async {
        isLoading = true
        errorMessage = nil
        
        do {
            let response = try await api.getLeaderboard(page: page)
            self.leaderboard = response.leaderboard
        } catch {
            errorMessage = error.localizedDescription
            print("Error loading leaderboard: \(error)")
        }
        
        isLoading = false
    }
    
    func loadNotifications(page: Int = 1, unreadOnly: Bool = false) async {
        isLoading = true
        errorMessage = nil
        
        do {
            let response = try await api.getNotifications(page: page, unreadOnly: unreadOnly)
            self.notifications = response.notifications
        } catch {
            errorMessage = error.localizedDescription
            print("Error loading notifications: \(error)")
        }
        
        isLoading = false
    }
    
    func markNotificationAsRead(_ notificationId: String) async {
        do {
            try await api.markNotificationAsRead(notificationId: notificationId)
            // Mettre à jour localement
            if let index = notifications.firstIndex(where: { $0.id == notificationId }) {
                var updatedNotification = notifications[index]
                // Note: Vous devrez créer une méthode pour mettre à jour isRead
                // ou recharger les notifications
                await loadNotifications()
            }
        } catch {
            errorMessage = error.localizedDescription
        }
    }
    
    func markAllNotificationsAsRead() async {
        do {
            try await api.markAllNotificationsAsRead()
            await loadNotifications()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
    
    // MARK: - Refresh All
    
    func refreshAll() async {
        await withTaskGroup(of: Void.self) { group in
            group.addTask { await self.loadSummary() }
            group.addTask { await self.loadBadges() }
            group.addTask { await self.loadChallenges() }
        }
    }
}
```

---

## 🎨 Views SwiftUI

### AchievementsView.swift

```swift
import SwiftUI

struct AchievementsView: View {
    @StateObject private var viewModel = AchievementsViewModel()
    @State private var selectedTab = 0
    
    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Header avec résumé
                if let summary = viewModel.summary {
                    SummaryHeaderView(summary: summary)
                        .padding()
                        .background(Color.blue.opacity(0.1))
                }
                
                // Tabs
                Picker("Section", selection: $selectedTab) {
                    Text("Badges").tag(0)
                    Text("Challenges").tag(1)
                    Text("Leaderboard").tag(2)
                    Text("Notifications").tag(3)
                }
                .pickerStyle(.segmented)
                .padding()
                
                // Content
                TabView(selection: $selectedTab) {
                    BadgesView(viewModel: viewModel)
                        .tag(0)
                    
                    ChallengesView(viewModel: viewModel)
                        .tag(1)
                    
                    LeaderboardView(viewModel: viewModel)
                        .tag(2)
                    
                    NotificationsView(viewModel: viewModel)
                        .tag(3)
                }
                .tabViewStyle(.page(indexDisplayMode: .never))
            }
            .navigationTitle("Achievements")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: {
                        Task {
                            await viewModel.refreshAll()
                        }
                    }) {
                        Image(systemName: "arrow.clockwise")
                    }
                }
            }
            .task {
                await viewModel.refreshAll()
            }
            .alert("Erreur", isPresented: .constant(viewModel.errorMessage != nil)) {
                Button("OK") {
                    viewModel.errorMessage = nil
                }
            } message: {
                if let error = viewModel.errorMessage {
                    Text(error)
                }
            }
            // Afficher les nouveaux badges
            .sheet(item: Binding(
                get: { viewModel.newBadgesUnlocked.first },
                set: { _ in viewModel.newBadgesUnlocked.removeFirst() }
            )) { badge in
                BadgeUnlockedView(badge: badge)
            }
            // Afficher level up
            .sheet(item: Binding(
                get: { viewModel.levelUpEvent },
                set: { _ in viewModel.levelUpEvent = nil }
            )) { levelInfo in
                LevelUpView(levelInfo: levelInfo)
            }
        }
    }
}

// MARK: - Summary Header

struct SummaryHeaderView: View {
    let summary: AchievementSummary
    
    var body: some View {
        VStack(spacing: 12) {
            // Level
            HStack {
                VStack(alignment: .leading) {
                    Text("Niveau \(summary.level.currentLevel)")
                        .font(.title2)
                        .fontWeight(.bold)
                    
                    Text("\(summary.level.totalXp) XP total")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
                
                Spacer()
                
                // Progress Circle
                ZStack {
                    Circle()
                        .stroke(Color.gray.opacity(0.3), lineWidth: 8)
                        .frame(width: 60, height: 60)
                    
                    Circle()
                        .trim(from: 0, to: summary.level.progressPercentage / 100)
                        .stroke(Color.blue, style: StrokeStyle(lineWidth: 8, lineCap: .round))
                        .frame(width: 60, height: 60)
                        .rotationEffect(.degrees(-90))
                    
                    Text("\(Int(summary.level.progressPercentage))%")
                        .font(.caption)
                        .fontWeight(.semibold)
                }
            }
            
            // Progress Bar
            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Text("\(summary.level.currentLevelXp) / \(summary.level.xpForNextLevel) XP")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Spacer()
                }
                
                GeometryReader { geometry in
                    ZStack(alignment: .leading) {
                        Rectangle()
                            .fill(Color.gray.opacity(0.3))
                            .frame(height: 8)
                            .cornerRadius(4)
                        
                        Rectangle()
                            .fill(Color.blue)
                            .frame(width: geometry.size.width * CGFloat(summary.level.progressPercentage / 100), height: 8)
                            .cornerRadius(4)
                    }
                }
                .frame(height: 8)
            }
            
            // Stats
            HStack(spacing: 20) {
                StatView(title: "Badges", value: "\(summary.stats.totalBadges)")
                StatView(title: "Streak", value: "\(summary.stats.currentStreak) jours")
                StatView(title: "Meilleur", value: "\(summary.stats.bestStreak) jours")
            }
        }
    }
}

struct StatView: View {
    let title: String
    let value: String
    
    var body: some View {
        VStack(spacing: 4) {
            Text(value)
                .font(.headline)
                .fontWeight(.bold)
            Text(title)
                .font(.caption)
                .foregroundColor(.secondary)
        }
    }
}
```

### BadgesView.swift

```swift
import SwiftUI

struct BadgesView: View {
    @ObservedObject var viewModel: AchievementsViewModel
    
    var body: some View {
        ScrollView {
            LazyVStack(spacing: 20) {
                // Badges Gagnés
                if let badges = viewModel.badges, !badges.earnedBadges.isEmpty {
                    SectionView(title: "Badges Gagnés") {
                        LazyVGrid(columns: [
                            GridItem(.flexible()),
                            GridItem(.flexible()),
                            GridItem(.flexible())
                        ], spacing: 16) {
                            ForEach(badges.earnedBadges) { badge in
                                BadgeCard(badge: badge, isEarned: true)
                            }
                        }
                    }
                }
                
                // Badges en Cours
                if let badges = viewModel.badges, !badges.inProgress.isEmpty {
                    SectionView(title: "En Cours") {
                        LazyVGrid(columns: [
                            GridItem(.flexible()),
                            GridItem(.flexible()),
                            GridItem(.flexible())
                        ], spacing: 16) {
                            ForEach(badges.inProgress) { progress in
                                BadgeProgressCard(progress: progress)
                            }
                        }
                    }
                }
                
                if viewModel.badges == nil && viewModel.isLoading {
                    ProgressView()
                        .padding()
                }
            }
            .padding()
        }
        .refreshable {
            await viewModel.loadBadges()
        }
    }
}

struct BadgeCard: View {
    let badge: Badge
    let isEarned: Bool
    
    var body: some View {
        VStack(spacing: 8) {
            // Icon
            AsyncImage(url: URL(string: badge.iconUrl ?? "")) { image in
                image
                    .resizable()
                    .aspectRatio(contentMode: .fit)
            } placeholder: {
                Image(systemName: "trophy.fill")
                    .font(.system(size: 40))
                    .foregroundColor(.gray)
            }
            .frame(width: 60, height: 60)
            .opacity(isEarned ? 1.0 : 0.5)
            
            // Name
            Text(badge.name)
                .font(.caption)
                .fontWeight(.semibold)
                .multilineTextAlignment(.center)
                .lineLimit(2)
            
            // Rarity Badge
            Text(badge.rarity.rawValue.capitalized)
                .font(.caption2)
                .padding(.horizontal, 6)
                .padding(.vertical, 2)
                .background(rarityColor(badge.rarity).opacity(0.2))
                .foregroundColor(rarityColor(badge.rarity))
                .cornerRadius(4)
        }
        .padding()
        .frame(maxWidth: .infinity)
        .background(Color.gray.opacity(0.1))
        .cornerRadius(12)
    }
    
    private func rarityColor(_ rarity: Badge.BadgeRarity) -> Color {
        switch rarity {
        case .common: return .green
        case .uncommon: return .blue
        case .rare: return .purple
        case .epic: return .orange
        case .legendary: return .yellow
        }
    }
}

struct BadgeProgressCard: View {
    let progress: BadgeProgress
    
    var body: some View {
        VStack(spacing: 8) {
            // Icon (grisé)
            AsyncImage(url: URL(string: progress.badge.iconUrl ?? "")) { image in
                image
                    .resizable()
                    .aspectRatio(contentMode: .fit)
            } placeholder: {
                Image(systemName: "trophy.fill")
                    .font(.system(size: 40))
                    .foregroundColor(.gray)
            }
            .frame(width: 60, height: 60)
            .opacity(0.5)
            
            // Name
            Text(progress.badge.name)
                .font(.caption)
                .fontWeight(.semibold)
                .multilineTextAlignment(.center)
                .lineLimit(2)
            
            // Progress
            VStack(spacing: 4) {
                Text("\(progress.currentProgress) / \(progress.target)")
                    .font(.caption2)
                    .foregroundColor(.secondary)
                
                GeometryReader { geometry in
                    ZStack(alignment: .leading) {
                        Rectangle()
                            .fill(Color.gray.opacity(0.3))
                            .frame(height: 4)
                            .cornerRadius(2)
                        
                        Rectangle()
                            .fill(Color.blue)
                            .frame(width: geometry.size.width * CGFloat(progress.percentage / 100), height: 4)
                            .cornerRadius(2)
                    }
                }
                .frame(height: 4)
            }
        }
        .padding()
        .frame(maxWidth: .infinity)
        .background(Color.gray.opacity(0.1))
        .cornerRadius(12)
    }
}

struct SectionView<Content: View>: View {
    let title: String
    let content: Content
    
    init(title: String, @ViewBuilder content: () -> Content) {
        self.title = title
        self.content = content()
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(title)
                .font(.headline)
                .fontWeight(.bold)
                .padding(.horizontal)
            
            content
        }
    }
}
```

### ChallengesView.swift

```swift
import SwiftUI

struct ChallengesView: View {
    @ObservedObject var viewModel: AchievementsViewModel
    
    var body: some View {
        ScrollView {
            LazyVStack(spacing: 16) {
                if viewModel.challenges.isEmpty && !viewModel.isLoading {
                    EmptyStateView(
                        icon: "target",
                        title: "Aucun challenge actif",
                        message: "Les nouveaux challenges apparaîtront ici"
                    )
                } else {
                    ForEach(viewModel.challenges) { challenge in
                        ChallengeCard(challenge: challenge)
                    }
                }
                
                if viewModel.isLoading {
                    ProgressView()
                        .padding()
                }
            }
            .padding()
        }
        .refreshable {
            await viewModel.loadChallenges()
        }
    }
}

struct ChallengeCard: View {
    let challenge: Challenge
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(challenge.name)
                        .font(.headline)
                        .fontWeight(.bold)
                    
                    Text(challenge.description)
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
                
                Spacer()
                
                // Type Badge
                Text(challenge.challengeType.rawValue.capitalized)
                    .font(.caption)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(typeColor(challenge.challengeType).opacity(0.2))
                    .foregroundColor(typeColor(challenge.challengeType))
                    .cornerRadius(8)
            }
            
            // Progress
            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Text("\(challenge.currentProgress) / \(challenge.target)")
                        .font(.subheadline)
                        .fontWeight(.semibold)
                    
                    Spacer()
                    
                    if challenge.isCompleted {
                        Image(systemName: "checkmark.circle.fill")
                            .foregroundColor(.green)
                    } else {
                        Text("\(challenge.daysLeft) jours restants")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
                
                GeometryReader { geometry in
                    ZStack(alignment: .leading) {
                        Rectangle()
                            .fill(Color.gray.opacity(0.3))
                            .frame(height: 8)
                            .cornerRadius(4)
                        
                        Rectangle()
                            .fill(challenge.isCompleted ? Color.green : Color.blue)
                            .frame(width: geometry.size.width * CGFloat(challenge.progressPercentage / 100), height: 8)
                            .cornerRadius(4)
                    }
                }
                .frame(height: 8)
            }
            
            // Reward
            HStack {
                Image(systemName: "star.fill")
                    .foregroundColor(.yellow)
                Text("\(challenge.xpReward) XP")
                    .font(.caption)
                    .fontWeight(.semibold)
            }
        }
        .padding()
        .background(Color.gray.opacity(0.1))
        .cornerRadius(12)
    }
    
    private func typeColor(_ type: Challenge.ChallengeType) -> Color {
        switch type {
        case .daily: return .blue
        case .weekly: return .purple
        case .monthly: return .orange
        case .distance: return .green
        case .duration: return .red
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
                .font(.headline)
                .fontWeight(.bold)
            
            Text(message)
                .font(.subheadline)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
        }
        .padding()
        .frame(maxWidth: .infinity)
    }
}
```

### LeaderboardView.swift

```swift
import SwiftUI

struct LeaderboardView: View {
    @ObservedObject var viewModel: AchievementsViewModel
    
    var body: some View {
        ScrollView {
            LazyVStack(spacing: 12) {
                if viewModel.leaderboard.isEmpty && !viewModel.isLoading {
                    EmptyStateView(
                        icon: "trophy",
                        title: "Aucun classement",
                        message: "Soyez le premier à apparaître ici !"
                    )
                } else {
                    ForEach(Array(viewModel.leaderboard.enumerated()), id: \.element.id) { index, entry in
                        LeaderboardRow(entry: entry, rank: index + 1)
                    }
                }
                
                if viewModel.isLoading {
                    ProgressView()
                        .padding()
                }
            }
            .padding()
        }
        .refreshable {
            await viewModel.loadLeaderboard()
        }
    }
}

struct LeaderboardRow: View {
    let entry: LeaderboardEntry
    let rank: Int
    
    var body: some View {
        HStack(spacing: 12) {
            // Rank
            Text("#\(rank)")
                .font(.headline)
                .fontWeight(.bold)
                .frame(width: 40)
                .foregroundColor(rankColor(rank))
            
            // Avatar
            AsyncImage(url: URL(string: entry.user.profileImageUrl ?? "")) { image in
                image
                    .resizable()
                    .aspectRatio(contentMode: .fill)
            } placeholder: {
                Image(systemName: "person.circle.fill")
                    .font(.system(size: 40))
                    .foregroundColor(.gray)
            }
            .frame(width: 50, height: 50)
            .clipShape(Circle())
            
            // User Info
            VStack(alignment: .leading, spacing: 4) {
                Text(entry.user.name)
                    .font(.headline)
                    .fontWeight(.semibold)
                
                Text("Niveau \(entry.currentLevel)")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            Spacer()
            
            // Stats
            VStack(alignment: .trailing, spacing: 4) {
                Text("\(entry.totalXp) XP")
                    .font(.subheadline)
                    .fontWeight(.bold)
                
                Text("\(entry.totalBadges) badges")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
        .padding()
        .background(Color.gray.opacity(0.1))
        .cornerRadius(12)
    }
    
    private func rankColor(_ rank: Int) -> Color {
        switch rank {
        case 1: return .yellow
        case 2: return .gray
        case 3: return .brown
        default: return .primary
        }
    }
}
```

### NotificationsView.swift

```swift
import SwiftUI

struct NotificationsView: View {
    @ObservedObject var viewModel: AchievementsViewModel
    @State private var showUnreadOnly = false
    
    var body: some View {
        VStack(spacing: 0) {
            // Filter
            HStack {
                Toggle("Non lues seulement", isOn: $showUnreadOnly)
                    .onChange(of: showUnreadOnly) { _ in
                        Task {
                            await viewModel.loadNotifications(unreadOnly: showUnreadOnly)
                        }
                    }
                
                Spacer()
                
                if viewModel.notifications.contains(where: { !$0.isRead }) {
                    Button("Tout marquer comme lu") {
                        Task {
                            await viewModel.markAllNotificationsAsRead()
                        }
                    }
                    .font(.caption)
                }
            }
            .padding()
            
            // List
            ScrollView {
                LazyVStack(spacing: 12) {
                    if viewModel.notifications.isEmpty && !viewModel.isLoading {
                        EmptyStateView(
                            icon: "bell.slash",
                            title: "Aucune notification",
                            message: "Vous serez notifié des nouveaux achievements"
                        )
                    } else {
                        ForEach(viewModel.notifications) { notification in
                            NotificationRow(
                                notification: notification,
                                onTap: {
                                    Task {
                                        await viewModel.markNotificationAsRead(notification.id)
                                    }
                                }
                            )
                        }
                    }
                    
                    if viewModel.isLoading {
                        ProgressView()
                            .padding()
                    }
                }
                .padding()
            }
        }
        .refreshable {
            await viewModel.loadNotifications(unreadOnly: showUnreadOnly)
        }
    }
}

struct NotificationRow: View {
    let notification: AchievementNotification
    let onTap: () -> Void
    
    var body: some View {
        HStack(spacing: 12) {
            // Icon
            Image(systemName: iconForType(notification.type))
                .font(.title2)
                .foregroundColor(colorForType(notification.type))
                .frame(width: 40, height: 40)
                .background(colorForType(notification.type).opacity(0.2))
                .clipShape(Circle())
            
            // Content
            VStack(alignment: .leading, spacing: 4) {
                Text(notification.title)
                    .font(.headline)
                    .fontWeight(.semibold)
                
                Text(notification.message)
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .lineLimit(2)
                
                Text(notification.createdAt, style: .relative)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            Spacer()
            
            // Unread indicator
            if !notification.isRead {
                Circle()
                    .fill(Color.blue)
                    .frame(width: 8, height: 8)
            }
        }
        .padding()
        .background(notification.isRead ? Color.clear : Color.blue.opacity(0.1))
        .cornerRadius(12)
        .onTapGesture {
            onTap()
        }
    }
    
    private func iconForType(_ type: AchievementNotification.NotificationType) -> String {
        switch type {
        case .badgeUnlocked: return "trophy.fill"
        case .levelUp: return "arrow.up.circle.fill"
        case .challengeCompleted: return "checkmark.circle.fill"
        case .xpEarned: return "star.fill"
        case .streakUpdated: return "flame.fill"
        case .likeReceived: return "heart.fill"
        case .matchMade: return "person.2.fill"
        }
    }
    
    private func colorForType(_ type: AchievementNotification.NotificationType) -> Color {
        switch type {
        case .badgeUnlocked: return .yellow
        case .levelUp: return .blue
        case .challengeCompleted: return .green
        case .xpEarned: return .orange
        case .streakUpdated: return .red
        case .likeReceived: return .pink
        case .matchMade: return .purple
        }
    }
}
```

### BadgeUnlockedView.swift & LevelUpView.swift

```swift
import SwiftUI

struct BadgeUnlockedView: View {
    let badge: Badge
    @Environment(\.dismiss) var dismiss
    
    var body: some View {
        VStack(spacing: 24) {
            Spacer()
            
            // Badge Icon
            AsyncImage(url: URL(string: badge.iconUrl ?? "")) { image in
                image
                    .resizable()
                    .aspectRatio(contentMode: .fit)
            } placeholder: {
                Image(systemName: "trophy.fill")
                    .font(.system(size: 100))
                    .foregroundColor(.yellow)
            }
            .frame(width: 150, height: 150)
            .shadow(color: .yellow.opacity(0.5), radius: 20)
            
            // Title
            Text("🎉 Badge Débloqué !")
                .font(.title)
                .fontWeight(.bold)
            
            // Badge Name
            Text(badge.name)
                .font(.title2)
                .fontWeight(.semibold)
            
            // Description
            Text(badge.description)
                .font(.body)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal)
            
            Spacer()
            
            // Close Button
            Button(action: {
                dismiss()
            }) {
                Text("Continuer")
                    .font(.headline)
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.blue)
                    .cornerRadius(12)
            }
            .padding()
        }
        .padding()
    }
}

struct LevelUpView: View {
    let levelInfo: AchievementSummary.LevelInfo
    @Environment(\.dismiss) var dismiss
    
    var body: some View {
        VStack(spacing: 24) {
            Spacer()
            
            // Level Icon
            ZStack {
                Circle()
                    .fill(Color.blue.opacity(0.2))
                    .frame(width: 150, height: 150)
                
                Text("\(levelInfo.currentLevel)")
                    .font(.system(size: 60, weight: .bold))
                    .foregroundColor(.blue)
            }
            .shadow(color: .blue.opacity(0.5), radius: 20)
            
            // Title
            Text("🎉 Niveau Supérieur !")
                .font(.title)
                .fontWeight(.bold)
            
            // Message
            Text("Félicitations ! Vous êtes maintenant niveau \(levelInfo.currentLevel)")
                .font(.body)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal)
            
            // XP Info
            VStack(spacing: 8) {
                Text("\(levelInfo.totalXp) XP total")
                    .font(.headline)
                    .fontWeight(.semibold)
                
                Text("\(levelInfo.currentLevelXp) / \(levelInfo.xpForNextLevel) XP pour le prochain niveau")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            Spacer()
            
            // Close Button
            Button(action: {
                dismiss()
            }) {
                Text("Continuer")
                    .font(.headline)
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.blue)
                    .cornerRadius(12)
            }
            .padding()
        }
        .padding()
    }
}
```

---

## 🔗 Intégration avec les Activités

### Dans ActivityCreationView.swift

```swift
import SwiftUI

struct ActivityCreationView: View {
    @StateObject private var achievementsViewModel = AchievementsViewModel()
    @State private var showBadgeUnlocked = false
    
    var body: some View {
        // ... votre UI de création d'activité ...
        
        .onAppear {
            Task {
                await achievementsViewModel.loadBadges()
            }
        }
        .onChange(of: /* activité créée */) { _ in
            Task {
                // Recharger les badges après création d'activité
                await achievementsViewModel.loadBadges()
                await achievementsViewModel.loadSummary()
            }
        }
        .sheet(item: Binding(
            get: { achievementsViewModel.newBadgesUnlocked.first },
            set: { _ in achievementsViewModel.newBadgesUnlocked.removeFirst() }
        )) { badge in
            BadgeUnlockedView(badge: badge)
        }
    }
}
```

---

## ✅ Checklist d'Implémentation

- [ ] Créer les modèles (Models/)
- [ ] Créer AchievementsAPI.swift
- [ ] Créer AchievementsViewModel.swift
- [ ] Créer les vues SwiftUI
- [ ] Intégrer avec AuthService
- [ ] Tester les endpoints
- [ ] Ajouter les notifications de badges/level up
- [ ] Intégrer avec les activités

---

## 🚀 Utilisation

```swift
// Dans votre App.swift ou ContentView.swift
struct ContentView: View {
    var body: some View {
        TabView {
            // ... autres tabs ...
            
            AchievementsView()
                .tabItem {
                    Label("Achievements", systemImage: "trophy.fill")
                }
        }
    }
}
```

---

Le guide est prêt ! Vous pouvez l'utiliser pour implémenter le système d'achievements dans votre application iOS Swift. 🎉


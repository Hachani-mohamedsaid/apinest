# 📱 Guide iOS Swift - Système Follow/Unfollow

## 🎯 Vue d'Ensemble

Ce guide explique comment implémenter le système de follow/unfollow dans votre application iOS Swift avec SwiftUI. Cette fonctionnalité permet aux utilisateurs de suivre d'autres utilisateurs et de voir le nombre de followers en temps réel.

### Fonctionnalités

- ✅ Suivre un utilisateur (`POST /users/{id}/follow`)
- ✅ Ne plus suivre un utilisateur (`POST /users/{id}/unfollow`)
- ✅ Vérifier si on suit un utilisateur (`GET /users/{id}/is-following`)
- ✅ Afficher le nombre de followers/following
- ✅ Mise à jour en temps réel du statut de suivi
- ✅ Gestion des erreurs

---

## 🔌 Endpoints API

### 1. Suivre un Utilisateur

**POST** `/users/:id/follow`

**Headers :**
```
Authorization: Bearer YOUR_ACCESS_TOKEN
```

**Réponse (200 OK) :**
```json
{
  "message": "Successfully followed user"
}
```

**Erreurs possibles :**
- `404 Not Found` : Utilisateur non trouvé
- `400 Bad Request` : Déjà suivi ou tentative de se suivre soi-même
- `401 Unauthorized` : Token invalide

### 2. Ne plus suivre un Utilisateur

**POST** `/users/:id/unfollow`

**Headers :**
```
Authorization: Bearer YOUR_ACCESS_TOKEN
```

**Réponse (200 OK) :**
```json
{
  "message": "Successfully unfollowed user"
}
```

**Erreurs possibles :**
- `404 Not Found` : Utilisateur non trouvé
- `400 Bad Request` : Pas encore suivi
- `401 Unauthorized` : Token invalide

### 3. Vérifier le Statut de Suivi

**GET** `/users/:id/is-following`

**Headers :**
```
Authorization: Bearer YOUR_ACCESS_TOKEN
```

**Réponse (200 OK) :**
```json
{
  "isFollowing": true
}
```

### 4. Profil Utilisateur (avec Followers)

**GET** `/users/:id/profile`

**Headers :**
```
Authorization: Bearer YOUR_ACCESS_TOKEN
```

**Réponse (200 OK) :**
```json
{
  "id": "6929ac53a788275eb19568eb",
  "name": "John Doe",
  "email": "john@example.com",
  "followers": 5,
  "following": 3,
  "stats": {
    "followers": 5,
    "following": 3
  }
}
```

---

## 🏗️ Architecture

### Structure des Fichiers

```
📁 Models/
  ├── FollowResponse.swift
  └── IsFollowingResponse.swift

📁 Services/
  ├── FollowService.swift
  └── UserService.swift (mise à jour)

📁 ViewModels/
  └── UserProfileViewModel.swift

📁 Views/
  ├── UserProfileView.swift
  └── FollowButton.swift
```

---

## 📦 Models

### FollowResponse.swift

```swift
import Foundation

struct FollowResponse: Codable {
    let message: String
    
    enum CodingKeys: String, CodingKey {
        case message
    }
}
```

### IsFollowingResponse.swift

```swift
import Foundation

struct IsFollowingResponse: Codable {
    let isFollowing: Bool
    
    enum CodingKeys: String, CodingKey {
        case isFollowing
    }
}
```

### UserProfile.swift (Mise à jour)

```swift
import Foundation

struct UserProfile: Codable {
    let id: String
    let name: String
    let email: String
    let followers: Int?
    let following: Int?
    let stats: UserStats?
    
    enum CodingKeys: String, CodingKey {
        case id = "_id"
        case name
        case email
        case followers
        case following
        case stats
    }
}

struct UserStats: Codable {
    let followers: Int?
    let following: Int?
    let sessionsJoined: Int?
    let sessionsHosted: Int?
}
```

---

## 🔧 Services

### FollowService.swift

```swift
import Foundation

class FollowService {
    private let baseURL = "https://apinest-production.up.railway.app"
    
    // MARK: - Suivre un utilisateur
    
    func followUser(
        token: String,
        userId: String
    ) async throws -> FollowResponse {
        let url = URL(string: "\(baseURL)/users/\(userId)/follow")!
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }
        
        guard (200...299).contains(httpResponse.statusCode) else {
            if httpResponse.statusCode == 401 {
                throw APIError.unauthorized
            } else if httpResponse.statusCode == 404 {
                throw APIError.notFound
            } else if httpResponse.statusCode == 400 {
                if let errorData = try? JSONDecoder().decode(ErrorResponse.self, from: data) {
                    throw APIError.badRequest(errorData.message ?? "Bad request")
                }
                throw APIError.badRequest("Bad request")
            } else {
                throw APIError.serverError(httpResponse.statusCode)
            }
        }
        
        let decoder = JSONDecoder()
        return try decoder.decode(FollowResponse.self, from: data)
    }
    
    // MARK: - Ne plus suivre un utilisateur
    
    func unfollowUser(
        token: String,
        userId: String
    ) async throws -> FollowResponse {
        let url = URL(string: "\(baseURL)/users/\(userId)/unfollow")!
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }
        
        guard (200...299).contains(httpResponse.statusCode) else {
            if httpResponse.statusCode == 401 {
                throw APIError.unauthorized
            } else if httpResponse.statusCode == 404 {
                throw APIError.notFound
            } else if httpResponse.statusCode == 400 {
                if let errorData = try? JSONDecoder().decode(ErrorResponse.self, from: data) {
                    throw APIError.badRequest(errorData.message ?? "Bad request")
                }
                throw APIError.badRequest("Bad request")
            } else {
                throw APIError.serverError(httpResponse.statusCode)
            }
        }
        
        let decoder = JSONDecoder()
        return try decoder.decode(FollowResponse.self, from: data)
    }
    
    // MARK: - Vérifier le statut de suivi
    
    func isFollowing(
        token: String,
        userId: String
    ) async throws -> IsFollowingResponse {
        let url = URL(string: "\(baseURL)/users/\(userId)/is-following")!
        
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }
        
        guard (200...299).contains(httpResponse.statusCode) else {
            if httpResponse.statusCode == 401 {
                throw APIError.unauthorized
            } else if httpResponse.statusCode == 404 {
                throw APIError.notFound
            } else {
                throw APIError.serverError(httpResponse.statusCode)
            }
        }
        
        let decoder = JSONDecoder()
        return try decoder.decode(IsFollowingResponse.self, from: data)
    }
}
```

### UserService.swift (Mise à jour)

Ajoutez la méthode pour récupérer le profil avec followers :

```swift
import Foundation

class UserService {
    private let baseURL = "https://apinest-production.up.railway.app"
    
    // ... méthodes existantes ...
    
    // MARK: - Récupérer le profil utilisateur avec followers
    
    func getUserProfile(
        token: String,
        userId: String
    ) async throws -> UserProfile {
        let url = URL(string: "\(baseURL)/users/\(userId)/profile")!
        
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }
        
        guard (200...299).contains(httpResponse.statusCode) else {
            if httpResponse.statusCode == 401 {
                throw APIError.unauthorized
            } else if httpResponse.statusCode == 404 {
                throw APIError.notFound
            } else {
                throw APIError.serverError(httpResponse.statusCode)
            }
        }
        
        let decoder = JSONDecoder()
        return try decoder.decode(UserProfile.self, from: data)
    }
}
```

### APIError.swift (Mise à jour)

```swift
import Foundation

enum APIError: LocalizedError {
    case invalidResponse
    case unauthorized
    case notFound
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
        case .notFound:
            return "Utilisateur non trouvé"
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

struct ErrorResponse: Codable {
    let message: String?
    let error: String?
}
```

---

## 🎨 ViewModels

### UserProfileViewModel.swift

```swift
import Foundation
import SwiftUI

@MainActor
class UserProfileViewModel: ObservableObject {
    @Published var userProfile: UserProfile?
    @Published var isFollowing: Bool = false
    @Published var isLoading = false
    @Published var isFollowingLoading = false
    @Published var errorMessage: String?
    
    private let userService = UserService()
    private let followService = FollowService()
    private let tokenManager = TokenManager.shared
    
    // MARK: - Charger le profil utilisateur
    
    func loadUserProfile(userId: String) async {
        guard let token = tokenManager.getToken() else {
            errorMessage = "Token non disponible"
            return
        }
        
        isLoading = true
        errorMessage = nil
        
        do {
            let profile = try await userService.getUserProfile(
                token: token,
                userId: userId
            )
            
            userProfile = profile
            
            // Charger le statut de suivi
            await loadFollowingStatus(userId: userId)
            
        } catch {
            let errorMessage = (error as? APIError)?.errorDescription ?? error.localizedDescription
            self.errorMessage = errorMessage
        }
        
        isLoading = false
    }
    
    // MARK: - Charger le statut de suivi
    
    func loadFollowingStatus(userId: String) async {
        guard let token = tokenManager.getToken() else {
            return
        }
        
        do {
            let response = try await followService.isFollowing(
                token: token,
                userId: userId
            )
            
            isFollowing = response.isFollowing
            
        } catch {
            // En cas d'erreur, on garde la valeur actuelle
            print("Erreur lors du chargement du statut de suivi: \(error)")
        }
    }
    
    // MARK: - Suivre un utilisateur
    
    func followUser(userId: String) async {
        guard let token = tokenManager.getToken() else {
            errorMessage = "Token non disponible"
            return
        }
        
        isFollowingLoading = true
        errorMessage = nil
        
        do {
            _ = try await followService.followUser(
                token: token,
                userId: userId
            )
            
            // Mettre à jour le statut local
            isFollowing = true
            
            // Mettre à jour le nombre de followers
            if var profile = userProfile {
                let currentFollowers = profile.followers ?? 0
                profile = UserProfile(
                    id: profile.id,
                    name: profile.name,
                    email: profile.email,
                    followers: currentFollowers + 1,
                    following: profile.following,
                    stats: profile.stats
                )
                userProfile = profile
            }
            
        } catch {
            let errorMessage = (error as? APIError)?.errorDescription ?? error.localizedDescription
            self.errorMessage = errorMessage
        }
        
        isFollowingLoading = false
    }
    
    // MARK: - Ne plus suivre un utilisateur
    
    func unfollowUser(userId: String) async {
        guard let token = tokenManager.getToken() else {
            errorMessage = "Token non disponible"
            return
        }
        
        isFollowingLoading = true
        errorMessage = nil
        
        do {
            _ = try await followService.unfollowUser(
                token: token,
                userId: userId
            )
            
            // Mettre à jour le statut local
            isFollowing = false
            
            // Mettre à jour le nombre de followers
            if var profile = userProfile {
                let currentFollowers = profile.followers ?? 0
                profile = UserProfile(
                    id: profile.id,
                    name: profile.name,
                    email: profile.email,
                    followers: max(0, currentFollowers - 1),
                    following: profile.following,
                    stats: profile.stats
                )
                userProfile = profile
            }
            
        } catch {
            let errorMessage = (error as? APIError)?.errorDescription ?? error.localizedDescription
            self.errorMessage = errorMessage
        }
        
        isFollowingLoading = false
    }
    
    // MARK: - Toggle Follow/Unfollow
    
    func toggleFollow(userId: String) async {
        if isFollowing {
            await unfollowUser(userId: userId)
        } else {
            await followUser(userId: userId)
        }
    }
}
```

---

## 🎨 Views

### FollowButton.swift

```swift
import SwiftUI

struct FollowButton: View {
    let userId: String
    @ObservedObject var viewModel: UserProfileViewModel
    
    var body: some View {
        Button(action: {
            Task {
                await viewModel.toggleFollow(userId: userId)
            }
        }) {
            HStack {
                if viewModel.isFollowingLoading {
                    ProgressView()
                        .progressViewStyle(CircularProgressViewStyle(tint: .white))
                } else {
                    Text(viewModel.isFollowing ? "Ne plus suivre" : "Suivre")
                        .fontWeight(.semibold)
                }
            }
            .frame(maxWidth: .infinity)
            .padding()
            .background(
                viewModel.isFollowingLoading
                ? Color.gray
                : (viewModel.isFollowing ? Color.red : Color.blue)
            )
            .foregroundColor(.white)
            .cornerRadius(12)
        }
        .disabled(viewModel.isFollowingLoading)
    }
}
```

### UserProfileView.swift

```swift
import SwiftUI

struct UserProfileView: View {
    let userId: String
    @StateObject private var viewModel = UserProfileViewModel()
    
    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                if viewModel.isLoading {
                    ProgressView("Chargement...")
                        .frame(maxWidth: .infinity, minHeight: 200)
                } else if let profile = viewModel.userProfile {
                    // Header avec photo de profil
                    VStack(spacing: 16) {
                        // Photo de profil
                        AsyncImage(url: URL(string: profile.stats?.sessionsHosted ?? 0 > 0 ? "" : "")) { image in
                            image
                                .resizable()
                                .aspectRatio(contentMode: .fill)
                        } placeholder: {
                            Image(systemName: "person.circle.fill")
                                .resizable()
                                .aspectRatio(contentMode: .fill)
                                .foregroundColor(.gray)
                        }
                        .frame(width: 100, height: 100)
                        .clipShape(Circle())
                        
                        // Nom
                        Text(profile.name)
                            .font(.title)
                            .fontWeight(.bold)
                        
                        // Email
                        Text(profile.email)
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    }
                    .padding()
                    
                    // Statistiques
                    HStack(spacing: 40) {
                        VStack {
                            Text("\(profile.followers ?? 0)")
                                .font(.title2)
                                .fontWeight(.bold)
                            Text("Abonnés")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                        
                        VStack {
                            Text("\(profile.following ?? 0)")
                                .font(.title2)
                                .fontWeight(.bold)
                            Text("Abonnements")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                        
                        VStack {
                            Text("\(profile.stats?.sessionsHosted ?? 0)")
                                .font(.title2)
                                .fontWeight(.bold)
                            Text("Sessions")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }
                    .padding()
                    .frame(maxWidth: .infinity)
                    .background(Color.gray.opacity(0.1))
                    .cornerRadius(12)
                    
                    // Bouton Follow/Unfollow
                    FollowButton(userId: userId, viewModel: viewModel)
                        .padding(.horizontal)
                    
                    // Message d'erreur
                    if let errorMessage = viewModel.errorMessage {
                        Text(errorMessage)
                            .font(.caption)
                            .foregroundColor(.red)
                            .padding()
                    }
                    
                } else if let errorMessage = viewModel.errorMessage {
                    VStack(spacing: 16) {
                        Image(systemName: "exclamationmark.triangle")
                            .font(.system(size: 50))
                            .foregroundColor(.red)
                        
                        Text("Erreur")
                            .font(.title2)
                            .fontWeight(.bold)
                        
                        Text(errorMessage)
                            .font(.body)
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                        
                        Button("Réessayer") {
                            Task {
                                await viewModel.loadUserProfile(userId: userId)
                            }
                        }
                        .buttonStyle(.borderedProminent)
                    }
                    .padding()
                }
            }
            .padding()
        }
        .navigationTitle("Profil")
        .navigationBarTitleDisplayMode(.inline)
        .task {
            await viewModel.loadUserProfile(userId: userId)
        }
    }
}
```

### UserCardView.swift (Composant Réutilisable)

```swift
import SwiftUI

struct UserCardView: View {
    let user: UserProfile
    @StateObject private var viewModel = UserProfileViewModel()
    @State private var isFollowing: Bool = false
    
    var body: some View {
        HStack(spacing: 12) {
            // Photo de profil
            AsyncImage(url: URL(string: user.stats?.sessionsHosted ?? 0 > 0 ? "" : "")) { image in
                image
                    .resizable()
                    .aspectRatio(contentMode: .fill)
            } placeholder: {
                Image(systemName: "person.circle.fill")
                    .resizable()
                    .aspectRatio(contentMode: .fill)
                    .foregroundColor(.gray)
            }
            .frame(width: 50, height: 50)
            .clipShape(Circle())
            
            // Informations
            VStack(alignment: .leading, spacing: 4) {
                Text(user.name)
                    .font(.headline)
                
                Text("\(user.followers ?? 0) abonnés")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            Spacer()
            
            // Bouton Follow/Unfollow
            Button(action: {
                Task {
                    if isFollowing {
                        await viewModel.unfollowUser(userId: user.id)
                    } else {
                        await viewModel.followUser(userId: user.id)
                    }
                    isFollowing.toggle()
                }
            }) {
                Text(isFollowing ? "Ne plus suivre" : "Suivre")
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundColor(isFollowing ? .red : .white)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 8)
                    .background(isFollowing ? Color.clear : Color.blue)
                    .overlay(
                        RoundedRectangle(cornerRadius: 8)
                            .stroke(isFollowing ? Color.red : Color.clear, lineWidth: 1)
                    )
                    .cornerRadius(8)
            }
        }
        .padding()
        .background(Color.gray.opacity(0.1))
        .cornerRadius(12)
        .task {
            await viewModel.loadFollowingStatus(userId: user.id)
            isFollowing = viewModel.isFollowing
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
    var body: some View {
        NavigationView {
            List {
                // Liste d'utilisateurs
                ForEach(users) { user in
                    NavigationLink(destination: UserProfileView(userId: user.id)) {
                        UserCardView(user: user)
                    }
                }
            }
            .navigationTitle("Utilisateurs")
        }
    }
}
```

### Dans une Liste d'Utilisateurs

```swift
struct UsersListView: View {
    @State private var users: [UserProfile] = []
    @StateObject private var viewModel = UserProfileViewModel()
    
    var body: some View {
        List(users) { user in
            UserCardView(user: user)
        }
        .task {
            // Charger la liste des utilisateurs
            // ...
        }
    }
}
```

---

## 🎨 Design Avancé

### FollowButton avec Animation

```swift
import SwiftUI

struct AnimatedFollowButton: View {
    let userId: String
    @ObservedObject var viewModel: UserProfileViewModel
    @State private var isAnimating = false
    
    var body: some View {
        Button(action: {
            withAnimation(.spring(response: 0.3, dampingFraction: 0.6)) {
                isAnimating = true
            }
            
            Task {
                await viewModel.toggleFollow(userId: userId)
                isAnimating = false
            }
        }) {
            HStack(spacing: 8) {
                if viewModel.isFollowingLoading {
                    ProgressView()
                        .progressViewStyle(CircularProgressViewStyle(tint: .white))
                } else {
                    Image(systemName: viewModel.isFollowing ? "person.badge.minus" : "person.badge.plus")
                        .font(.system(size: 14))
                    
                    Text(viewModel.isFollowing ? "Ne plus suivre" : "Suivre")
                        .fontWeight(.semibold)
                }
            }
            .frame(maxWidth: .infinity)
            .padding()
            .background(
                viewModel.isFollowingLoading
                ? Color.gray
                : (viewModel.isFollowing ? Color.red : Color.blue)
            )
            .foregroundColor(.white)
            .cornerRadius(12)
            .scaleEffect(isAnimating ? 0.95 : 1.0)
        }
        .disabled(viewModel.isFollowingLoading)
    }
}
```

### UserProfileView avec Design Moderne

```swift
import SwiftUI

struct ModernUserProfileView: View {
    let userId: String
    @StateObject private var viewModel = UserProfileViewModel()
    
    var body: some View {
        ScrollView {
            VStack(spacing: 0) {
                // Header avec image de couverture
                ZStack(alignment: .bottom) {
                    // Image de couverture
                    Rectangle()
                        .fill(
                            LinearGradient(
                                colors: [Color.blue.opacity(0.6), Color.purple.opacity(0.6)],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                        .frame(height: 200)
                    
                    // Photo de profil
                    if let profile = viewModel.userProfile {
                        AsyncImage(url: URL(string: profile.stats?.sessionsHosted ?? 0 > 0 ? "" : "")) { image in
                            image
                                .resizable()
                                .aspectRatio(contentMode: .fill)
                        } placeholder: {
                            Image(systemName: "person.circle.fill")
                                .resizable()
                                .aspectRatio(contentMode: .fill)
                                .foregroundColor(.white)
                        }
                        .frame(width: 120, height: 120)
                        .clipShape(Circle())
                        .overlay(Circle().stroke(Color.white, lineWidth: 4))
                        .offset(y: 60)
                    }
                }
                
                // Contenu
                VStack(spacing: 20) {
                    // Espace pour la photo de profil
                    Spacer()
                        .frame(height: 60)
                    
                    if let profile = viewModel.userProfile {
                        // Nom et email
                        VStack(spacing: 8) {
                            Text(profile.name)
                                .font(.title)
                                .fontWeight(.bold)
                            
                            Text(profile.email)
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                        }
                        
                        // Statistiques
                        HStack(spacing: 30) {
                            StatView(count: profile.followers ?? 0, label: "Abonnés")
                            StatView(count: profile.following ?? 0, label: "Abonnements")
                            StatView(count: profile.stats?.sessionsHosted ?? 0, label: "Sessions")
                        }
                        .padding()
                        
                        // Bouton Follow/Unfollow
                        AnimatedFollowButton(userId: userId, viewModel: viewModel)
                            .padding(.horizontal)
                        
                        // Message d'erreur
                        if let errorMessage = viewModel.errorMessage {
                            Text(errorMessage)
                                .font(.caption)
                                .foregroundColor(.red)
                                .padding()
                        }
                    } else if viewModel.isLoading {
                        ProgressView("Chargement...")
                            .frame(maxWidth: .infinity, minHeight: 200)
                    }
                }
                .padding()
            }
        }
        .navigationTitle("Profil")
        .navigationBarTitleDisplayMode(.inline)
        .task {
            await viewModel.loadUserProfile(userId: userId)
        }
    }
}

struct StatView: View {
    let count: Int
    let label: String
    
    var body: some View {
        VStack(spacing: 4) {
            Text("\(count)")
                .font(.title2)
                .fontWeight(.bold)
            Text(label)
                .font(.caption)
                .foregroundColor(.secondary)
        }
    }
}
```

---

## ✅ Checklist iOS

- [ ] Créer les modèles `FollowResponse` et `IsFollowingResponse`
- [ ] Mettre à jour `UserProfile` pour inclure `followers` et `following`
- [ ] Créer le service `FollowService` avec les méthodes follow/unfollow/isFollowing
- [ ] Mettre à jour `UserService` pour récupérer le profil avec followers
- [ ] Créer le ViewModel `UserProfileViewModel` avec gestion du statut de suivi
- [ ] Créer le composant `FollowButton` réutilisable
- [ ] Créer la vue `UserProfileView` avec affichage des followers
- [ ] Gérer les erreurs (déjà suivi, utilisateur non trouvé, etc.)
- [ ] Tester le flux complet : suivre → vérifier → ne plus suivre
- [ ] Tester la mise à jour en temps réel du nombre de followers

---

## 🎉 Résumé

Vous avez maintenant une implémentation complète pour :

1. ✅ **Suivre/ne plus suivre** des utilisateurs
2. ✅ **Vérifier le statut** de suivi
3. ✅ **Afficher le nombre** de followers/following
4. ✅ **Mettre à jour en temps réel** le statut et les compteurs
5. ✅ **Gérer les erreurs** de manière appropriée
6. ✅ **Interface utilisateur moderne** avec SwiftUI

L'application iOS peut maintenant gérer le système de follow/unfollow avec mise à jour en temps réel ! 🚀


# 📱 Guide d'Intégration iOS - AI Coach

## 🎯 Vue d'ensemble

Ce guide vous permet d'intégrer complètement l'AI Coach dans votre application iOS Swift. Tous les endpoints backend sont maintenant configurés et prêts à être utilisés.

---

## 📋 Table des matières

1. [Configuration Strava OAuth](#1-configuration-strava-oauth)
2. [AI Coach Suggestions](#2-ai-coach-suggestions)
3. [AI Coach Personalized Tips](#3-ai-coach-personalized-tips)
4. [AI Coach YouTube Videos](#4-ai-coach-youtube-videos)
5. [Structures de données Swift](#5-structures-de-données-swift)
6. [Exemples complets](#6-exemples-complets)

---

## 1. Configuration Strava OAuth

### 1.1 Endpoint GET `/strava/callback`

**Description :** Redirige depuis Strava vers l'application iOS via deep link.

**URL :** `https://apinest-production.up.railway.app/strava/callback?code=AUTH_CODE`

**Réponse :** Redirection 302 vers `nexofitness://strava/callback?code=AUTH_CODE`

**Configuration iOS :**

Dans votre `Info.plist`, ajoutez le deep link :

```xml
<key>CFBundleURLTypes</key>
<array>
    <dict>
        <key>CFBundleURLSchemes</key>
        <array>
            <string>nexofitness</string>
        </array>
    </dict>
</array>
```

**Gestion dans AppDelegate/SceneDelegate :**

```swift
func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
    guard let url = URLContexts.first?.url else { return }
    
    if url.scheme == "nexofitness" && url.host == "strava" {
        // Extraire le code d'autorisation
        let components = URLComponents(url: url, resolvingAgainstBaseURL: false)
        if let code = components?.queryItems?.first(where: { $0.name == "code" })?.value {
            // Appeler l'endpoint POST /strava/oauth/callback
            connectStravaAccount(code: code)
        } else if let error = components?.queryItems?.first(where: { $0.name == "error" })?.value {
            // Gérer l'erreur
            handleStravaError(error: error)
        }
    }
}
```

---

### 1.2 Endpoint POST `/strava/oauth/callback`

**Description :** Échange le code d'autorisation avec Strava et stocke les tokens pour l'utilisateur.

**URL :** `https://apinest-production.up.railway.app/strava/oauth/callback`

**Headers :**
```
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
```

**Body :**
```json
{
  "code": "AUTH_CODE_FROM_STRAVA"
}
```

**Réponse Succès (200) :**
```json
{
  "message": "Strava account connected successfully"
}
```

**Réponse Erreur (400) :**
```json
{
  "statusCode": 400,
  "message": "Failed to exchange Strava authorization code",
  "error": "Bad Request"
}
```

**Implémentation Swift :**

```swift
func connectStravaAccount(code: String) {
    guard let url = URL(string: "https://apinest-production.up.railway.app/strava/oauth/callback") else {
        return
    }
    
    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.setValue("Bearer \(yourJWTToken)", forHTTPHeaderField: "Authorization")
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    
    let body: [String: Any] = ["code": code]
    request.httpBody = try? JSONSerialization.data(withJSONObject: body)
    
    URLSession.shared.dataTask(with: request) { data, response, error in
        if let error = error {
            print("Error: \(error.localizedDescription)")
            return
        }
        
        guard let data = data,
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            return
        }
        
        if let message = json["message"] as? String {
            print("✅ Strava connected: \(message)")
            // Mettre à jour l'UI
            DispatchQueue.main.async {
                // Afficher un message de succès
            }
        } else if let errorMessage = json["message"] as? String {
            print("❌ Error: \(errorMessage)")
        }
    }.resume()
}
```

---

## 2. AI Coach Suggestions

### 2.1 Endpoint POST `/ai-coach/suggestions`

**Description :** Génère des suggestions d'activités personnalisées et des conseils basés sur les données Strava et l'historique de l'utilisateur.

**URL :** `https://apinest-production.up.railway.app/ai-coach/suggestions`

**Headers :**
```
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
```

**Body :**
```json
{
  "workouts": 5,
  "calories": 2500,
  "minutes": 180,
  "streak": 7,
  "sportPreferences": "Running, Basketball, Cycling",
  "location": "Tunis, Tunisia",
  "preferredTimeOfDay": "evening",
  "stravaData": {
    "recentActivities": [
      {
        "type": "Run",
        "distance": 5000,
        "duration": 1800,
        "date": "2025-12-14T10:00:00Z"
      }
    ],
    "favoriteSports": ["Running", "Cycling"],
    "performanceTrend": "improving"
  },
  "recentAppActivities": ["activityId1", "activityId2"]
}
```

**Réponse (200) :**
```json
{
  "suggestions": [
    {
      "id": "activityIdFromYourDB",
      "title": "Morning Run in Central Park",
      "sportType": "Running",
      "location": "Central Park, New York",
      "date": "15/12/2025",
      "time": "07:00",
      "participants": 3,
      "maxParticipants": 10,
      "level": "Intermediate",
      "matchScore": 85,
      "reason": "Matches your running preference and morning schedule"
    }
  ],
  "personalizedTips": [
    {
      "id": "tip-1",
      "title": "Maintenez votre série",
      "description": "Vous avez une série de 7 jours ! Continuez à vous entraîner régulièrement.",
      "icon": "🔥",
      "category": "motivation",
      "priority": "high"
    }
  ]
}
```

**Structures Swift :**

```swift
struct AICoachSuggestionsRequest: Codable {
    let workouts: Int
    let calories: Int
    let minutes: Int
    let streak: Int
    let sportPreferences: String?
    let location: String?
    let preferredTimeOfDay: String?
    let stravaData: StravaData?
    let recentAppActivities: [String]?
}

struct StravaData: Codable {
    let recentActivities: [StravaActivity]?
    let favoriteSports: [String]?
    let performanceTrend: String?
}

struct StravaActivity: Codable {
    let type: String
    let distance: Int
    let duration: Int
    let date: String
}

struct AICoachSuggestionsResponse: Codable {
    let suggestions: [SuggestedActivity]
    let personalizedTips: [PersonalizedTip]
}

struct SuggestedActivity: Codable {
    let id: String
    let title: String
    let sportType: String
    let location: String
    let date: String
    let time: String
    let participants: Int
    let maxParticipants: Int
    let level: String
    let matchScore: Int
    let reason: String?
}

struct PersonalizedTip: Codable {
    let id: String
    let title: String
    let description: String
    let icon: String
    let category: String
    let priority: String?
}
```

**Implémentation Swift :**

```swift
func getAICoachSuggestions(
    workouts: Int,
    calories: Int,
    minutes: Int,
    streak: Int,
    sportPreferences: String?,
    location: String?,
    preferredTimeOfDay: String?,
    stravaData: StravaData?,
    completion: @escaping (Result<AICoachSuggestionsResponse, Error>) -> Void
) {
    guard let url = URL(string: "https://apinest-production.up.railway.app/ai-coach/suggestions") else {
        completion(.failure(NSError(domain: "Invalid URL", code: -1)))
        return
    }
    
    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.setValue("Bearer \(yourJWTToken)", forHTTPHeaderField: "Authorization")
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    
    let requestBody = AICoachSuggestionsRequest(
        workouts: workouts,
        calories: calories,
        minutes: minutes,
        streak: streak,
        sportPreferences: sportPreferences,
        location: location,
        preferredTimeOfDay: preferredTimeOfDay,
        stravaData: stravaData,
        recentAppActivities: nil
    )
    
    do {
        request.httpBody = try JSONEncoder().encode(requestBody)
    } catch {
        completion(.failure(error))
        return
    }
    
    URLSession.shared.dataTask(with: request) { data, response, error in
        if let error = error {
            completion(.failure(error))
            return
        }
        
        guard let data = data else {
            completion(.failure(NSError(domain: "No data", code: -1)))
            return
        }
        
        do {
            let response = try JSONDecoder().decode(AICoachSuggestionsResponse.self, from: data)
            completion(.success(response))
        } catch {
            completion(.failure(error))
        }
    }.resume()
}
```

---

## 3. AI Coach Personalized Tips

### 3.1 Endpoint POST `/ai-coach/personalized-tips`

**Description :** Génère des conseils personnalisés avec ChatGPT basés sur les statistiques de l'utilisateur.

**URL :** `https://apinest-production.up.railway.app/ai-coach/personalized-tips`

**Headers :**
```
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
```

**Body :**
```json
{
  "workouts": 5,
  "calories": 2500,
  "minutes": 180,
  "streak": 7,
  "sportPreferences": ["Running", "Basketball"],
  "recentActivities": ["activityId1", "activityId2"],
  "stravaData": "JSON string of Strava data"
}
```

**Réponse (200) :**
```json
{
  "tips": [
    {
      "id": "1",
      "title": "Maintenez votre série",
      "description": "Vous avez une série de 7 jours ! Continuez à vous entraîner régulièrement.",
      "icon": "🔥",
      "category": "motivation",
      "priority": "high"
    },
    {
      "id": "2",
      "title": "Augmentez progressivement",
      "description": "Cette semaine, vous avez fait 5 entraînements. Essayez d'en ajouter 1 ou 2 de plus.",
      "icon": "📈",
      "category": "training",
      "priority": "medium"
    }
  ]
}
```

**Structures Swift :**

```swift
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

**Implémentation Swift :**

```swift
func getPersonalizedTips(
    workouts: Int,
    calories: Int,
    minutes: Int,
    streak: Int,
    sportPreferences: [String]?,
    recentActivities: [String]?,
    stravaData: String?,
    completion: @escaping (Result<PersonalizedTipsResponse, Error>) -> Void
) {
    guard let url = URL(string: "https://apinest-production.up.railway.app/ai-coach/personalized-tips") else {
        completion(.failure(NSError(domain: "Invalid URL", code: -1)))
        return
    }
    
    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.setValue("Bearer \(yourJWTToken)", forHTTPHeaderField: "Authorization")
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    
    let requestBody = PersonalizedTipsRequest(
        workouts: workouts,
        calories: calories,
        minutes: minutes,
        streak: streak,
        sportPreferences: sportPreferences,
        recentActivities: recentActivities,
        stravaData: stravaData
    )
    
    do {
        request.httpBody = try JSONEncoder().encode(requestBody)
    } catch {
        completion(.failure(error))
        return
    }
    
    URLSession.shared.dataTask(with: request) { data, response, error in
        if let error = error {
            completion(.failure(error))
            return
        }
        
        guard let data = data else {
            completion(.failure(NSError(domain: "No data", code: -1)))
            return
        }
        
        do {
            let response = try JSONDecoder().decode(PersonalizedTipsResponse.self, from: data)
            completion(.success(response))
        } catch {
            completion(.failure(error))
        }
    }.resume()
}
```

---

## 4. AI Coach YouTube Videos

### 4.1 Endpoint GET `/ai-coach/youtube-videos`

**Description :** Récupère des vidéos YouTube pertinentes basées sur les préférences sportives.

**URL :** `https://apinest-production.up.railway.app/ai-coach/youtube-videos?sportPreferences=Running,Basketball&maxResults=10`

**Headers :**
```
Authorization: Bearer YOUR_JWT_TOKEN
```

**Query Parameters :**
- `sportPreferences` (optionnel) : String séparée par virgules (ex: `"Running, Basketball"`) OU array
- `maxResults` (optionnel) : Nombre maximum de vidéos (1-50, défaut: 10)

**Réponse (200) :**
```json
{
  "videos": [
    {
      "id": "YOUTUBE_ID",
      "title": "Running Workout Tutorial",
      "description": "Learn proper running form and technique...",
      "thumbnailUrl": "https://i.ytimg.com/vi/YOUTUBE_ID/hqdefault.jpg",
      "channelTitle": "Fitness Channel",
      "publishedAt": "2025-11-10T12:34:56Z",
      "duration": "PT12M34S",
      "viewCount": "123456"
    }
  ]
}
```

**Structures Swift :**

```swift
struct YouTubeVideosResponse: Codable {
    let videos: [YouTubeVideo]
}

struct YouTubeVideo: Codable {
    let id: String
    let title: String
    let description: String
    let thumbnailUrl: String
    let channelTitle: String
    let publishedAt: String
    let duration: String?
    let viewCount: String?
}
```

**Implémentation Swift :**

```swift
func getYouTubeVideos(
    sportPreferences: String?, // "Running, Basketball"
    maxResults: Int = 10,
    completion: @escaping (Result<YouTubeVideosResponse, Error>) -> Void
) {
    var components = URLComponents(string: "https://apinest-production.up.railway.app/ai-coach/youtube-videos")!
    
    var queryItems: [URLQueryItem] = []
    
    if let sportPreferences = sportPreferences {
        queryItems.append(URLQueryItem(name: "sportPreferences", value: sportPreferences))
    }
    
    queryItems.append(URLQueryItem(name: "maxResults", value: String(maxResults)))
    
    components.queryItems = queryItems
    
    guard let url = components.url else {
        completion(.failure(NSError(domain: "Invalid URL", code: -1)))
        return
    }
    
    var request = URLRequest(url: url)
    request.httpMethod = "GET"
    request.setValue("Bearer \(yourJWTToken)", forHTTPHeaderField: "Authorization")
    
    URLSession.shared.dataTask(with: request) { data, response, error in
        if let error = error {
            completion(.failure(error))
            return
        }
        
        guard let data = data else {
            completion(.failure(NSError(domain: "No data", code: -1)))
            return
        }
        
        do {
            let response = try JSONDecoder().decode(YouTubeVideosResponse.self, from: data)
            completion(.success(response))
        } catch {
            completion(.failure(error))
        }
    }.resume()
}
```

---

## 5. Structures de données Swift

### 5.1 Fichier complet `AICoachModels.swift`

```swift
import Foundation

// MARK: - Strava Models

struct StravaData: Codable {
    let recentActivities: [StravaActivity]?
    let favoriteSports: [String]?
    let performanceTrend: String?
}

struct StravaActivity: Codable {
    let type: String
    let distance: Int
    let duration: Int
    let date: String
}

// MARK: - Suggestions Models

struct AICoachSuggestionsRequest: Codable {
    let workouts: Int
    let calories: Int
    let minutes: Int
    let streak: Int
    let sportPreferences: String?
    let location: String?
    let preferredTimeOfDay: String?
    let stravaData: StravaData?
    let recentAppActivities: [String]?
}

struct AICoachSuggestionsResponse: Codable {
    let suggestions: [SuggestedActivity]
    let personalizedTips: [PersonalizedTip]
}

struct SuggestedActivity: Codable {
    let id: String
    let title: String
    let sportType: String
    let location: String
    let date: String
    let time: String
    let participants: Int
    let maxParticipants: Int
    let level: String
    let matchScore: Int
    let reason: String?
}

// MARK: - Tips Models

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

struct PersonalizedTip: Codable {
    let id: String
    let title: String
    let description: String
    let icon: String
    let category: String
    let priority: String?
}

// MARK: - YouTube Models

struct YouTubeVideosResponse: Codable {
    let videos: [YouTubeVideo]
}

struct YouTubeVideo: Codable {
    let id: String
    let title: String
    let description: String
    let thumbnailUrl: String
    let channelTitle: String
    let publishedAt: String
    let duration: String?
    let viewCount: String?
}
```

---

## 6. Exemples complets

### 6.1 Service complet `AICoachService.swift`

```swift
import Foundation

class AICoachService {
    private let baseURL = "https://apinest-production.up.railway.app"
    private var jwtToken: String
    
    init(jwtToken: String) {
        self.jwtToken = jwtToken
    }
    
    // MARK: - Strava OAuth
    
    func connectStravaAccount(code: String, completion: @escaping (Result<String, Error>) -> Void) {
        guard let url = URL(string: "\(baseURL)/strava/oauth/callback") else {
            completion(.failure(NSError(domain: "Invalid URL", code: -1)))
            return
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("Bearer \(jwtToken)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let body: [String: Any] = ["code": code]
        request.httpBody = try? JSONSerialization.data(withJSONObject: body)
        
        URLSession.shared.dataTask(with: request) { data, response, error in
            if let error = error {
                completion(.failure(error))
                return
            }
            
            guard let data = data,
                  let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                  let message = json["message"] as? String else {
                completion(.failure(NSError(domain: "Invalid response", code: -1)))
                return
            }
            
            completion(.success(message))
        }.resume()
    }
    
    // MARK: - AI Coach Suggestions
    
    func getSuggestions(
        workouts: Int,
        calories: Int,
        minutes: Int,
        streak: Int,
        sportPreferences: String?,
        location: String?,
        preferredTimeOfDay: String?,
        stravaData: StravaData?,
        completion: @escaping (Result<AICoachSuggestionsResponse, Error>) -> Void
    ) {
        guard let url = URL(string: "\(baseURL)/ai-coach/suggestions") else {
            completion(.failure(NSError(domain: "Invalid URL", code: -1)))
            return
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("Bearer \(jwtToken)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let requestBody = AICoachSuggestionsRequest(
            workouts: workouts,
            calories: calories,
            minutes: minutes,
            streak: streak,
            sportPreferences: sportPreferences,
            location: location,
            preferredTimeOfDay: preferredTimeOfDay,
            stravaData: stravaData,
            recentAppActivities: nil
        )
        
        do {
            request.httpBody = try JSONEncoder().encode(requestBody)
        } catch {
            completion(.failure(error))
            return
        }
        
        URLSession.shared.dataTask(with: request) { data, response, error in
            if let error = error {
                completion(.failure(error))
                return
            }
            
            guard let data = data else {
                completion(.failure(NSError(domain: "No data", code: -1)))
                return
            }
            
            do {
                let response = try JSONDecoder().decode(AICoachSuggestionsResponse.self, from: data)
                completion(.success(response))
            } catch {
                completion(.failure(error))
            }
        }.resume()
    }
    
    // MARK: - Personalized Tips
    
    func getPersonalizedTips(
        workouts: Int,
        calories: Int,
        minutes: Int,
        streak: Int,
        sportPreferences: [String]?,
        recentActivities: [String]?,
        stravaData: String?,
        completion: @escaping (Result<PersonalizedTipsResponse, Error>) -> Void
    ) {
        guard let url = URL(string: "\(baseURL)/ai-coach/personalized-tips") else {
            completion(.failure(NSError(domain: "Invalid URL", code: -1)))
            return
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("Bearer \(jwtToken)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let requestBody = PersonalizedTipsRequest(
            workouts: workouts,
            calories: calories,
            minutes: minutes,
            streak: streak,
            sportPreferences: sportPreferences,
            recentActivities: recentActivities,
            stravaData: stravaData
        )
        
        do {
            request.httpBody = try JSONEncoder().encode(requestBody)
        } catch {
            completion(.failure(error))
            return
        }
        
        URLSession.shared.dataTask(with: request) { data, response, error in
            if let error = error {
                completion(.failure(error))
                return
            }
            
            guard let data = data else {
                completion(.failure(NSError(domain: "No data", code: -1)))
                return
            }
            
            do {
                let response = try JSONDecoder().decode(PersonalizedTipsResponse.self, from: data)
                completion(.success(response))
            } catch {
                completion(.failure(error))
            }
        }.resume()
    }
    
    // MARK: - YouTube Videos
    
    func getYouTubeVideos(
        sportPreferences: String?,
        maxResults: Int = 10,
        completion: @escaping (Result<YouTubeVideosResponse, Error>) -> Void
    ) {
        var components = URLComponents(string: "\(baseURL)/ai-coach/youtube-videos")!
        
        var queryItems: [URLQueryItem] = []
        
        if let sportPreferences = sportPreferences {
            queryItems.append(URLQueryItem(name: "sportPreferences", value: sportPreferences))
        }
        
        queryItems.append(URLQueryItem(name: "maxResults", value: String(maxResults)))
        
        components.queryItems = queryItems
        
        guard let url = components.url else {
            completion(.failure(NSError(domain: "Invalid URL", code: -1)))
            return
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("Bearer \(jwtToken)", forHTTPHeaderField: "Authorization")
        
        URLSession.shared.dataTask(with: request) { data, response, error in
            if let error = error {
                completion(.failure(error))
                return
            }
            
            guard let data = data else {
                completion(.failure(NSError(domain: "No data", code: -1)))
                return
            }
            
            do {
                let response = try JSONDecoder().decode(YouTubeVideosResponse.self, from: data)
                completion(.success(response))
            } catch {
                completion(.failure(error))
            }
        }.resume()
    }
}
```

### 6.2 Exemple d'utilisation dans un ViewController

```swift
import UIKit

class AICoachViewController: UIViewController {
    private let aiCoachService: AICoachService
    
    init(jwtToken: String) {
        self.aiCoachService = AICoachService(jwtToken: jwtToken)
        super.init(nibName: nil, bundle: nil)
    }
    
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
    
    override func viewDidLoad() {
        super.viewDidLoad()
        loadSuggestions()
    }
    
    func loadSuggestions() {
        let stravaData = StravaData(
            recentActivities: nil,
            favoriteSports: ["Running", "Cycling"],
            performanceTrend: "improving"
        )
        
        aiCoachService.getSuggestions(
            workouts: 5,
            calories: 2500,
            minutes: 180,
            streak: 7,
            sportPreferences: "Running, Basketball",
            location: "Tunis, Tunisia",
            preferredTimeOfDay: "evening",
            stravaData: stravaData
        ) { result in
            switch result {
            case .success(let response):
                DispatchQueue.main.async {
                    // Afficher les suggestions
                    print("Suggestions: \(response.suggestions)")
                    print("Tips: \(response.personalizedTips)")
                }
            case .failure(let error):
                print("Error: \(error.localizedDescription)")
            }
        }
    }
    
    func loadYouTubeVideos() {
        aiCoachService.getYouTubeVideos(
            sportPreferences: "Running, Basketball",
            maxResults: 10
        ) { result in
            switch result {
            case .success(let response):
                DispatchQueue.main.async {
                    // Afficher les vidéos
                    print("Videos: \(response.videos)")
                }
            case .failure(let error):
                print("Error: \(error.localizedDescription)")
            }
        }
    }
}
```

---

## 7. Configuration des variables d'environnement

### Variables nécessaires sur le backend (Railway) :

1. **STRAVA_CLIENT_ID** : Votre Client ID Strava
2. **STRAVA_CLIENT_SECRET** : Votre Client Secret Strava
3. **OPENAI_API_KEY** (optionnel) : Pour ChatGPT
4. **GEMINI_API_KEY** (optionnel) : Pour Gemini (fallback)
5. **YOUTUBE_API_KEY** (optionnel) : Pour les vidéos YouTube

---

## 8. Résumé des endpoints

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/strava/callback` | GET | Redirige depuis Strava vers l'app |
| `/strava/oauth/callback` | POST | Échange le code OAuth et stocke les tokens |
| `/ai-coach/suggestions` | POST | Génère des suggestions d'activités |
| `/ai-coach/personalized-tips` | POST | Génère des conseils personnalisés |
| `/ai-coach/youtube-videos` | GET | Récupère des vidéos YouTube |

---

## ✅ Checklist d'intégration

- [ ] Ajouter le deep link `nexofitness://` dans Info.plist
- [ ] Implémenter la gestion du deep link dans AppDelegate/SceneDelegate
- [ ] Créer les structures de données Swift (AICoachModels.swift)
- [ ] Créer le service AICoachService
- [ ] Implémenter l'endpoint Strava OAuth callback
- [ ] Implémenter l'endpoint Suggestions
- [ ] Implémenter l'endpoint Personalized Tips
- [ ] Implémenter l'endpoint YouTube Videos
- [ ] Tester tous les endpoints avec des données réelles
- [ ] Gérer les erreurs et afficher des messages appropriés

---

*Guide complet d'intégration iOS pour AI Coach - Tous les endpoints sont maintenant fonctionnels !*


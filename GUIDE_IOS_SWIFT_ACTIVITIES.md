# 📱 Guide iOS Swift - Affichage et Création d'Activités

## 🎯 Vue d'Ensemble

Ce guide explique comment intégrer l'affichage et la création d'activités dans votre application iOS Swift avec SwiftUI, incluant l'intégration avec le système d'achievements.

---

## 🔌 Endpoints API

### 1. Créer une Activité

**POST** `/activities`

**Headers :**
```
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json
```

**Body :**
```json
{
  "sportType": "Football",
  "title": "Weekend Football Match",
  "description": "Join us for a friendly football match!",
  "location": "Central Park, New York",
  "latitude": 40.785091,
  "longitude": -73.968285,
  "date": "2025-11-15",
  "time": "2025-11-15T14:30:00Z",
  "participants": 10,
  "level": "Intermediate",
  "visibility": "public"
}
```

**Réponse (201 Created) :**
```json
{
  "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
  "sportType": "Football",
  "title": "Weekend Football Match",
  "description": "Join us for a friendly football match!",
  "location": "Central Park, New York",
  "latitude": 40.785091,
  "longitude": -73.968285,
  "date": "2025-11-15T00:00:00.000Z",
  "time": "2025-11-15T14:30:00.000Z",
  "participants": 10,
  "participantIds": ["65a1b2c3d4e5f6g7h8i9j0k0"],
  "level": "Intermediate",
  "visibility": "public",
  "isCompleted": false,
  "creator": {
    "_id": "65a1b2c3d4e5f6g7h8i9j0k0",
    "name": "John Doe",
    "email": "john@example.com",
    "profileImageUrl": "https://..."
  },
  "createdAt": "2025-11-14T10:30:00.000Z",
  "updatedAt": "2025-11-14T10:30:00.000Z"
}
```

---

### 2. Récupérer Toutes les Activités

**GET** `/activities`

**Query Parameters :**
- `visibility` (optionnel) : `public` ou `friends`

**Headers :**
```
Authorization: Bearer YOUR_ACCESS_TOKEN (optionnel pour public)
```

**Réponse (200 OK) :**
```json
[
  {
    "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
    "sportType": "Football",
    "title": "Weekend Football Match",
    "location": "Central Park, New York",
    "date": "2025-11-15T00:00:00.000Z",
    "time": "2025-11-15T14:30:00.000Z",
    "participants": 10,
    "participantIds": ["..."],
    "level": "Intermediate",
    "visibility": "public",
    "isCompleted": false,
    "creator": {
      "_id": "...",
      "name": "John Doe",
      "profileImageUrl": "..."
    }
  }
]
```

---

### 3. Récupérer une Activité par ID

**GET** `/activities/:id`

**Headers :**
```
Authorization: Bearer YOUR_ACCESS_TOKEN (optionnel)
```

---

### 4. Compléter une Activité

**POST** `/activities/:id/complete`

**Headers :**
```
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json
```

**Body (optionnel) :**
```json
{
  "durationMinutes": 30,
  "distanceKm": 5.5
}
```

**Réponse (200 OK) :**
```json
{
  "message": "Activity marked as complete"
}
```

---

### 5. Rejoindre une Activité

**POST** `/activities/:id/join`

**Headers :**
```
Authorization: Bearer YOUR_ACCESS_TOKEN
```

---

## 🏗️ Architecture iOS Swift

### Structure Recommandée

```
FitnessApp/
├── Models/
│   ├── Activity.swift
│   ├── User.swift
│   └── APIResponse.swift
├── Services/
│   ├── APIService.swift
│   ├── AuthService.swift
│   └── ActivitiesService.swift
├── ViewModels/
│   ├── ActivitiesViewModel.swift
│   └── CreateActivityViewModel.swift
└── Views/
    ├── ActivitiesListView.swift
    ├── ActivityDetailView.swift
    ├── CreateActivityView.swift
    └── ActivityCardView.swift
```

---

## 📦 Modèles de Données

### Activity.swift

```swift
import Foundation

// MARK: - Activity Model
struct Activity: Codable, Identifiable {
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
    let participantIds: [String]
    let level: String
    let visibility: String
    let isCompleted: Bool
    let creator: ActivityCreator
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
        case participantIds
        case level
        case visibility
        case isCompleted
        case creator
        case createdAt
        case updatedAt
    }
    
    // Computed properties for easier use
    var activityDate: Date? {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter.date(from: date) ?? ISO8601DateFormatter().date(from: date)
    }
    
    var activityTime: Date? {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter.date(from: time) ?? ISO8601DateFormatter().date(from: time)
    }
    
    var formattedDate: String {
        guard let date = activityDate else { return date }
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .none
        return formatter.string(from: date)
    }
    
    var formattedTime: String {
        guard let time = activityTime else { return time }
        let formatter = DateFormatter()
        formatter.dateStyle = .none
        formatter.timeStyle = .short
        return formatter.string(from: time)
    }
    
    var isFull: Bool {
        participantIds.count >= participants
    }
    
    var spotsRemaining: Int {
        max(0, participants - participantIds.count)
    }
}

// MARK: - Activity Creator
struct ActivityCreator: Codable {
    let id: String
    let name: String
    let email: String?
    let profileImageUrl: String?
    
    enum CodingKeys: String, CodingKey {
        case id = "_id"
        case name
        case email
        case profileImageUrl
    }
}

// MARK: - Create Activity Request
struct CreateActivityRequest: Codable {
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
}

// MARK: - Complete Activity Request
struct CompleteActivityRequest: Codable {
    let durationMinutes: Int?
    let distanceKm: Double?
}

// MARK: - API Response
struct ActivitiesResponse: Codable {
    let activities: [Activity]
    
    enum CodingKeys: String, CodingKey {
        case activities
    }
    
    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        activities = try container.decode([Activity].self)
    }
}
```

---

## 🌐 Services

### APIService.swift

```swift
import Foundation

class APIService {
    static let shared = APIService()
    
    private let baseURL = "https://votre-domaine.up.railway.app"
    private let session = URLSession.shared
    
    private init() {}
    
    // MARK: - Generic Request Method
    func request<T: Decodable>(
        endpoint: String,
        method: String = "GET",
        body: Data? = nil,
        token: String? = nil
    ) async throws -> T {
        guard let url = URL(string: "\(baseURL)\(endpoint)") else {
            throw APIError.invalidURL
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        if let token = token {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        
        if let body = body {
            request.httpBody = body
        }
        
        let (data, response) = try await session.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }
        
        guard (200...299).contains(httpResponse.statusCode) else {
            if let errorData = try? JSONDecoder().decode(APIErrorResponse.self, from: data) {
                throw APIError.serverError(errorData.message)
            }
            throw APIError.httpError(httpResponse.statusCode)
        }
        
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        return try decoder.decode(T.self, from: data)
    }
}

// MARK: - API Errors
enum APIError: Error, LocalizedError {
    case invalidURL
    case invalidResponse
    case httpError(Int)
    case serverError(String)
    case decodingError
    
    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Invalid URL"
        case .invalidResponse:
            return "Invalid response"
        case .httpError(let code):
            return "HTTP Error: \(code)"
        case .serverError(let message):
            return message
        case .decodingError:
            return "Failed to decode response"
        }
    }
}

struct APIErrorResponse: Codable {
    let message: String
    let statusCode: Int?
}
```

---

### ActivitiesService.swift

```swift
import Foundation

class ActivitiesService {
    static let shared = ActivitiesService()
    private let apiService = APIService.shared
    
    private init() {}
    
    // MARK: - Get All Activities
    func getAllActivities(visibility: String? = nil, token: String?) async throws -> [Activity] {
        var endpoint = "/activities"
        if let visibility = visibility {
            endpoint += "?visibility=\(visibility)"
        }
        
        return try await apiService.request(
            endpoint: endpoint,
            method: "GET",
            token: token
        )
    }
    
    // MARK: - Get Activity by ID
    func getActivity(id: String, token: String?) async throws -> Activity {
        return try await apiService.request(
            endpoint: "/activities/\(id)",
            method: "GET",
            token: token
        )
    }
    
    // MARK: - Create Activity
    func createActivity(_ request: CreateActivityRequest, token: String) async throws -> Activity {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        let body = try encoder.encode(request)
        
        return try await apiService.request(
            endpoint: "/activities",
            method: "POST",
            body: body,
            token: token
        )
    }
    
    // MARK: - Complete Activity
    func completeActivity(
        id: String,
        request: CompleteActivityRequest? = nil,
        token: String
    ) async throws -> ActivityCompleteResponse {
        var body: Data?
        if let request = request {
            let encoder = JSONEncoder()
            body = try encoder.encode(request)
        }
        
        return try await apiService.request(
            endpoint: "/activities/\(id)/complete",
            method: "POST",
            body: body,
            token: token
        )
    }
    
    // MARK: - Join Activity
    func joinActivity(id: String, token: String) async throws -> ActivityJoinResponse {
        return try await apiService.request(
            endpoint: "/activities/\(id)/join",
            method: "POST",
            token: token
        )
    }
    
    // MARK: - Leave Activity
    func leaveActivity(id: String, token: String) async throws -> ActivityLeaveResponse {
        return try await apiService.request(
            endpoint: "/activities/\(id)/leave",
            method: "POST",
            token: token
        )
    }
}

// MARK: - Response Models
struct ActivityCompleteResponse: Codable {
    let message: String
}

struct ActivityJoinResponse: Codable {
    let message: String
    let activity: Activity
}

struct ActivityLeaveResponse: Codable {
    let message: String
}
```

---

## 🎨 ViewModels

### ActivitiesViewModel.swift

```swift
import Foundation
import SwiftUI
import Combine

@MainActor
class ActivitiesViewModel: ObservableObject {
    @Published var activities: [Activity] = []
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var selectedActivity: Activity?
    
    private let activitiesService = ActivitiesService.shared
    private let authService = AuthService.shared
    private var cancellables = Set<AnyCancellable>()
    
    // MARK: - Load Activities
    func loadActivities(visibility: String? = nil) {
        isLoading = true
        errorMessage = nil
        
        Task {
            do {
                let token = try await authService.getToken()
                let fetchedActivities = try await activitiesService.getAllActivities(
                    visibility: visibility,
                    token: token
                )
                
                activities = fetchedActivities
                isLoading = false
            } catch {
                errorMessage = error.localizedDescription
                isLoading = false
            }
        }
    }
    
    // MARK: - Refresh Activities
    func refreshActivities() {
        loadActivities()
    }
    
    // MARK: - Join Activity
    func joinActivity(_ activity: Activity) {
        Task {
            do {
                let token = try await authService.getToken()
                _ = try await activitiesService.joinActivity(id: activity.id, token: token)
                
                // Refresh activities after joining
                await MainActor.run {
                    loadActivities()
                }
            } catch {
                await MainActor.run {
                    errorMessage = error.localizedDescription
                }
            }
        }
    }
    
    // MARK: - Complete Activity
    func completeActivity(
        _ activity: Activity,
        durationMinutes: Int? = nil,
        distanceKm: Double? = nil
    ) {
        Task {
            do {
                let token = try await authService.getToken()
                let request = CompleteActivityRequest(
                    durationMinutes: durationMinutes,
                    distanceKm: distanceKm
                )
                
                _ = try await activitiesService.completeActivity(
                    id: activity.id,
                    request: request,
                    token: token
                )
                
                // Refresh activities after completion
                await MainActor.run {
                    loadActivities()
                }
                
                // Refresh achievements (challenges, badges, etc.)
                await refreshAchievements()
            } catch {
                await MainActor.run {
                    errorMessage = error.localizedDescription
                }
            }
        }
    }
    
    // MARK: - Refresh Achievements
    private func refreshAchievements() async {
        // Attendre 2 secondes pour que le backend mette à jour
        try? await Task.sleep(nanoseconds: 2_000_000_000)
        
        // Notifier le système d'achievements pour rafraîchir
        NotificationCenter.default.post(
            name: NSNotification.Name("ActivityCompleted"),
            object: nil
        )
    }
}
```

---

### CreateActivityViewModel.swift

```swift
import Foundation
import SwiftUI
import Combine

@MainActor
class CreateActivityViewModel: ObservableObject {
    @Published var sportType: String = "Football"
    @Published var title: String = ""
    @Published var description: String = ""
    @Published var location: String = ""
    @Published var latitude: Double?
    @Published var longitude: Double?
    @Published var selectedDate: Date = Date()
    @Published var selectedTime: Date = Date()
    @Published var participants: Int = 5
    @Published var level: String = "Intermediate"
    @Published var visibility: String = "public"
    
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var isActivityCreated = false
    @Published var createdActivity: Activity?
    
    private let activitiesService = ActivitiesService.shared
    private let authService = AuthService.shared
    
    let sportTypes = ["Football", "Basketball", "Running", "Cycling"]
    let levels = ["Beginner", "Intermediate", "Advanced"]
    let visibilityOptions = ["public", "friends"]
    
    // MARK: - Validation
    var isFormValid: Bool {
        !title.isEmpty && title.count >= 3 && !location.isEmpty
    }
    
    // MARK: - Create Activity
    func createActivity() {
        guard isFormValid else {
            errorMessage = "Please fill all required fields"
            return
        }
        
        isLoading = true
        errorMessage = nil
        
        Task {
            do {
                let token = try await authService.getToken()
                
                // Format dates
                let dateFormatter = DateFormatter()
                dateFormatter.dateFormat = "yyyy-MM-dd"
                let dateString = dateFormatter.string(from: selectedDate)
                
                let timeFormatter = ISO8601DateFormatter()
                timeFormatter.formatOptions = [.withInternetDateTime]
                let timeString = timeFormatter.string(from: selectedTime)
                
                let request = CreateActivityRequest(
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
                    visibility: visibility
                )
                
                let activity = try await activitiesService.createActivity(request, token: token)
                
                await MainActor.run {
                    createdActivity = activity
                    isActivityCreated = true
                    isLoading = false
                    
                    // Notifier que l'activité a été créée (pour rafraîchir les achievements)
                    NotificationCenter.default.post(
                        name: NSNotification.Name("ActivityCreated"),
                        object: activity
                    )
                }
            } catch {
                await MainActor.run {
                    errorMessage = error.localizedDescription
                    isLoading = false
                }
            }
        }
    }
    
    // MARK: - Reset Form
    func resetForm() {
        sportType = "Football"
        title = ""
        description = ""
        location = ""
        latitude = nil
        longitude = nil
        selectedDate = Date()
        selectedTime = Date()
        participants = 5
        level = "Intermediate"
        visibility = "public"
        isActivityCreated = false
        createdActivity = nil
    }
}
```

---

## 🎨 Views SwiftUI

### ActivitiesListView.swift

```swift
import SwiftUI

struct ActivitiesListView: View {
    @StateObject private var viewModel = ActivitiesViewModel()
    @State private var showingCreateActivity = false
    
    var body: some View {
        NavigationView {
            ZStack {
                if viewModel.isLoading && viewModel.activities.isEmpty {
                    ProgressView("Loading activities...")
                } else if let error = viewModel.errorMessage {
                    ErrorView(error: error) {
                        viewModel.loadActivities()
                    }
                } else if viewModel.activities.isEmpty {
                    EmptyActivitiesView {
                        showingCreateActivity = true
                    }
                } else {
                    ScrollView {
                        LazyVStack(spacing: 16) {
                            ForEach(viewModel.activities) { activity in
                                NavigationLink(destination: ActivityDetailView(activity: activity)) {
                                    ActivityCardView(activity: activity)
                                }
                                .buttonStyle(PlainButtonStyle())
                            }
                        }
                        .padding()
                    }
                    .refreshable {
                        viewModel.refreshActivities()
                    }
                }
            }
            .navigationTitle("Activities")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: {
                        showingCreateActivity = true
                    }) {
                        Image(systemName: "plus.circle.fill")
                            .font(.title2)
                    }
                }
            }
            .sheet(isPresented: $showingCreateActivity) {
                CreateActivityView()
            }
            .onAppear {
                viewModel.loadActivities()
            }
        }
    }
}

// MARK: - Empty State View
struct EmptyActivitiesView: View {
    let onCreateActivity: () -> Void
    
    var body: some View {
        VStack(spacing: 20) {
            Image(systemName: "figure.run")
                .font(.system(size: 64))
                .foregroundColor(.gray)
            
            Text("No Activities Yet")
                .font(.title2)
                .fontWeight(.semibold)
            
            Text("Create your first activity and start connecting with others!")
                .font(.body)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal)
            
            Button(action: onCreateActivity) {
                Label("Create Activity", systemImage: "plus.circle.fill")
                    .font(.headline)
                    .foregroundColor(.white)
                    .padding()
                    .background(Color.blue)
                    .cornerRadius(10)
            }
        }
    }
}

// MARK: - Error View
struct ErrorView: View {
    let error: String
    let onRetry: () -> Void
    
    var body: some View {
        VStack(spacing: 20) {
            Image(systemName: "exclamationmark.triangle")
                .font(.system(size: 64))
                .foregroundColor(.red)
            
            Text("Error")
                .font(.title2)
                .fontWeight(.semibold)
            
            Text(error)
                .font(.body)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal)
            
            Button(action: onRetry) {
                Text("Retry")
                    .font(.headline)
                    .foregroundColor(.white)
                    .padding()
                    .background(Color.blue)
                    .cornerRadius(10)
            }
        }
    }
}
```

---

### ActivityCardView.swift

```swift
import SwiftUI

struct ActivityCardView: View {
    let activity: Activity
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Header
            HStack {
                // Sport Icon
                Image(systemName: sportIcon(for: activity.sportType))
                    .font(.title2)
                    .foregroundColor(sportColor(for: activity.sportType))
                
                VStack(alignment: .leading, spacing: 4) {
                    Text(activity.title)
                        .font(.headline)
                        .lineLimit(1)
                    
                    Text(activity.sportType)
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
                
                Spacer()
                
                // Level Badge
                LevelBadge(level: activity.level)
            }
            
            Divider()
            
            // Details
            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Image(systemName: "location.fill")
                        .foregroundColor(.blue)
                    Text(activity.location)
                        .font(.subheadline)
                }
                
                HStack {
                    Image(systemName: "calendar")
                        .foregroundColor(.green)
                    Text(activity.formattedDate)
                        .font(.subheadline)
                }
                
                HStack {
                    Image(systemName: "clock.fill")
                        .foregroundColor(.orange)
                    Text(activity.formattedTime)
                        .font(.subheadline)
                }
            }
            
            Divider()
            
            // Footer
            HStack {
                // Participants
                HStack(spacing: 4) {
                    Image(systemName: "person.2.fill")
                        .foregroundColor(.purple)
                    Text("\(activity.participantIds.count)/\(activity.participants)")
                        .font(.subheadline)
                }
                
                Spacer()
                
                // Status
                if activity.isCompleted {
                    Label("Completed", systemImage: "checkmark.circle.fill")
                        .font(.caption)
                        .foregroundColor(.green)
                } else if activity.isFull {
                    Label("Full", systemImage: "person.3.fill")
                        .font(.caption)
                        .foregroundColor(.red)
                } else {
                    Label("\(activity.spotsRemaining) spots", systemImage: "person.badge.plus")
                        .font(.caption)
                        .foregroundColor(.blue)
                }
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: Color.black.opacity(0.1), radius: 5, x: 0, y: 2)
    }
    
    // MARK: - Helper Methods
    private func sportIcon(for sportType: String) -> String {
        switch sportType {
        case "Football": return "soccerball"
        case "Basketball": return "basketball.fill"
        case "Running": return "figure.run"
        case "Cycling": return "bicycle"
        default: return "sportscourt"
        }
    }
    
    private func sportColor(for sportType: String) -> Color {
        switch sportType {
        case "Football": return .green
        case "Basketball": return .orange
        case "Running": return .blue
        case "Cycling": return .purple
        default: return .gray
        }
    }
}

// MARK: - Level Badge
struct LevelBadge: View {
    let level: String
    
    var body: some View {
        Text(level)
            .font(.caption)
            .fontWeight(.semibold)
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(levelColor)
            .foregroundColor(.white)
            .cornerRadius(8)
    }
    
    private var levelColor: Color {
        switch level {
        case "Beginner": return .green
        case "Intermediate": return .orange
        case "Advanced": return .red
        default: return .gray
        }
    }
}
```

---

### CreateActivityView.swift

```swift
import SwiftUI
import MapKit

struct CreateActivityView: View {
    @StateObject private var viewModel = CreateActivityViewModel()
    @Environment(\.dismiss) var dismiss
    @State private var showingLocationPicker = false
    
    var body: some View {
        NavigationView {
            Form {
                // Sport Type
                Section("Sport Type") {
                    Picker("Sport", selection: $viewModel.sportType) {
                        ForEach(viewModel.sportTypes, id: \.self) { sport in
                            Text(sport).tag(sport)
                        }
                    }
                }
                
                // Title
                Section("Title *") {
                    TextField("Activity title", text: $viewModel.title)
                }
                
                // Description
                Section("Description") {
                    TextEditor(text: $viewModel.description)
                        .frame(height: 100)
                }
                
                // Location
                Section("Location *") {
                    TextField("Location", text: $viewModel.location)
                    
                    Button(action: {
                        showingLocationPicker = true
                    }) {
                        HStack {
                            Image(systemName: "mappin.circle.fill")
                            Text("Pick Location on Map")
                        }
                    }
                }
                
                // Date & Time
                Section("Date & Time") {
                    DatePicker("Date", selection: $viewModel.selectedDate, displayedComponents: .date)
                    DatePicker("Time", selection: $viewModel.selectedTime, displayedComponents: .hourAndMinute)
                }
                
                // Participants
                Section("Participants") {
                    Stepper("Max Participants: \(viewModel.participants)", value: $viewModel.participants, in: 1...100)
                }
                
                // Level
                Section("Level") {
                    Picker("Level", selection: $viewModel.level) {
                        ForEach(viewModel.levels, id: \.self) { level in
                            Text(level).tag(level)
                        }
                    }
                }
                
                // Visibility
                Section("Visibility") {
                    Picker("Visibility", selection: $viewModel.visibility) {
                        ForEach(viewModel.visibilityOptions, id: \.self) { option in
                            Text(option.capitalized).tag(option)
                        }
                    }
                }
            }
            .navigationTitle("Create Activity")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
                
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Create") {
                        viewModel.createActivity()
                    }
                    .disabled(!viewModel.isFormValid || viewModel.isLoading)
                }
            }
            .sheet(isPresented: $showingLocationPicker) {
                LocationPickerView(
                    location: $viewModel.location,
                    latitude: $viewModel.latitude,
                    longitude: $viewModel.longitude
                )
            }
            .alert("Error", isPresented: .constant(viewModel.errorMessage != nil)) {
                Button("OK") {
                    viewModel.errorMessage = nil
                }
            } message: {
                if let error = viewModel.errorMessage {
                    Text(error)
                }
            }
            .alert("Success", isPresented: $viewModel.isActivityCreated) {
                Button("OK") {
                    dismiss()
                }
            } message: {
                Text("Activity created successfully!")
            }
            .overlay {
                if viewModel.isLoading {
                    ProgressView()
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                        .background(Color.black.opacity(0.3))
                }
            }
        }
    }
}

// MARK: - Location Picker View
struct LocationPickerView: View {
    @Binding var location: String
    @Binding var latitude: Double?
    @Binding var longitude: Double?
    @Environment(\.dismiss) var dismiss
    
    @State private var region = MKCoordinateRegion(
        center: CLLocationCoordinate2D(latitude: 40.785091, longitude: -73.968285),
        span: MKCoordinateSpan(latitudeDelta: 0.05, longitudeDelta: 0.05)
    )
    
    var body: some View {
        NavigationView {
            Map(coordinateRegion: $region, annotationItems: [MapPin(coordinate: region.center)]) { pin in
                MapMarker(coordinate: pin.coordinate)
            }
            .navigationTitle("Pick Location")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
                
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") {
                        latitude = region.center.latitude
                        longitude = region.center.longitude
                        // Optionally reverse geocode to get location name
                        dismiss()
                    }
                }
            }
        }
    }
}

struct MapPin: Identifiable {
    let id = UUID()
    let coordinate: CLLocationCoordinate2D
}
```

---

### ActivityDetailView.swift

```swift
import SwiftUI

struct ActivityDetailView: View {
    let activity: Activity
    @StateObject private var viewModel = ActivitiesViewModel()
    @State private var showingCompleteActivity = false
    @State private var durationMinutes: Int = 30
    @State private var distanceKm: Double = 0
    
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                // Header
                VStack(alignment: .leading, spacing: 12) {
                    HStack {
                        Image(systemName: sportIcon(for: activity.sportType))
                            .font(.system(size: 40))
                            .foregroundColor(sportColor(for: activity.sportType))
                        
                        VStack(alignment: .leading) {
                            Text(activity.title)
                                .font(.title)
                                .fontWeight(.bold)
                            
                            Text(activity.sportType)
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                        }
                        
                        Spacer()
                        
                        LevelBadge(level: activity.level)
                    }
                    
                    if let description = activity.description, !description.isEmpty {
                        Text(description)
                            .font(.body)
                            .foregroundColor(.secondary)
                    }
                }
                .padding()
                
                Divider()
                
                // Details
                VStack(alignment: .leading, spacing: 16) {
                    DetailRow(icon: "location.fill", text: activity.location, color: .blue)
                    DetailRow(icon: "calendar", text: activity.formattedDate, color: .green)
                    DetailRow(icon: "clock.fill", text: activity.formattedTime, color: .orange)
                    DetailRow(
                        icon: "person.2.fill",
                        text: "\(activity.participantIds.count)/\(activity.participants) participants",
                        color: .purple
                    )
                }
                .padding()
                
                Divider()
                
                // Creator
                HStack {
                    AsyncImage(url: URL(string: activity.creator.profileImageUrl ?? "")) { image in
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                    } placeholder: {
                        Image(systemName: "person.circle.fill")
                            .foregroundColor(.gray)
                    }
                    .frame(width: 50, height: 50)
                    .clipShape(Circle())
                    
                    VStack(alignment: .leading) {
                        Text("Created by")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        Text(activity.creator.name)
                            .font(.headline)
                    }
                    
                    Spacer()
                }
                .padding()
                
                // Actions
                if !activity.isCompleted {
                    VStack(spacing: 12) {
                        if !activity.isFull {
                            Button(action: {
                                viewModel.joinActivity(activity)
                            }) {
                                Label("Join Activity", systemImage: "person.badge.plus")
                                    .frame(maxWidth: .infinity)
                                    .padding()
                                    .background(Color.blue)
                                    .foregroundColor(.white)
                                    .cornerRadius(10)
                            }
                        }
                        
                        // Only creator can complete
                        if isCurrentUserCreator() {
                            Button(action: {
                                showingCompleteActivity = true
                            }) {
                                Label("Complete Activity", systemImage: "checkmark.circle.fill")
                                    .frame(maxWidth: .infinity)
                                    .padding()
                                    .background(Color.green)
                                    .foregroundColor(.white)
                                    .cornerRadius(10)
                            }
                        }
                    }
                    .padding()
                } else {
                    HStack {
                        Image(systemName: "checkmark.circle.fill")
                            .foregroundColor(.green)
                        Text("Activity Completed")
                            .font(.headline)
                            .foregroundColor(.green)
                    }
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.green.opacity(0.1))
                    .cornerRadius(10)
                    .padding()
                }
            }
        }
        .navigationTitle("Activity Details")
        .navigationBarTitleDisplayMode(.inline)
        .sheet(isPresented: $showingCompleteActivity) {
            CompleteActivitySheet(
                activity: activity,
                durationMinutes: $durationMinutes,
                distanceKm: $distanceKm,
                onComplete: {
                    viewModel.completeActivity(
                        activity,
                        durationMinutes: durationMinutes,
                        distanceKm: distanceKm > 0 ? distanceKm : nil
                    )
                    showingCompleteActivity = false
                }
            )
        }
    }
    
    private func isCurrentUserCreator() -> Bool {
        // TODO: Compare with current user ID from AuthService
        return true // Placeholder
    }
    
    private func sportIcon(for sportType: String) -> String {
        switch sportType {
        case "Football": return "soccerball"
        case "Basketball": return "basketball.fill"
        case "Running": return "figure.run"
        case "Cycling": return "bicycle"
        default: return "sportscourt"
        }
    }
    
    private func sportColor(for sportType: String) -> Color {
        switch sportType {
        case "Football": return .green
        case "Basketball": return .orange
        case "Running": return .blue
        case "Cycling": return .purple
        default: return .gray
        }
    }
}

// MARK: - Detail Row
struct DetailRow: View {
    let icon: String
    let text: String
    let color: Color
    
    var body: some View {
        HStack {
            Image(systemName: icon)
                .foregroundColor(color)
                .frame(width: 24)
            Text(text)
                .font(.body)
        }
    }
}

// MARK: - Complete Activity Sheet
struct CompleteActivitySheet: View {
    let activity: Activity
    @Binding var durationMinutes: Int
    @Binding var distanceKm: Double
    let onComplete: () -> Void
    @Environment(\.dismiss) var dismiss
    
    var body: some View {
        NavigationView {
            Form {
                Section("Duration") {
                    Stepper("\(durationMinutes) minutes", value: $durationMinutes, in: 1...600)
                }
                
                Section("Distance (Optional)") {
                    HStack {
                        TextField("Distance", value: $distanceKm, format: .number)
                            .keyboardType(.decimalPad)
                        Text("km")
                    }
                }
            }
            .navigationTitle("Complete Activity")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
                
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Complete") {
                        onComplete()
                    }
                }
            }
        }
    }
}
```

---

## 🔗 Intégration avec Achievements

### AchievementsViewModel.swift

```swift
import Foundation
import SwiftUI
import Combine

@MainActor
class AchievementsViewModel: ObservableObject {
    @Published var challenges: [Challenge] = []
    @Published var summary: AchievementsSummary?
    @Published var isLoading = false
    
    private let achievementsService = AchievementsService.shared
    private var cancellables = Set<AnyCancellable>()
    
    init() {
        // Écouter les notifications d'activité complétée
        NotificationCenter.default.publisher(for: NSNotification.Name("ActivityCompleted"))
            .sink { [weak self] _ in
                Task {
                    await self?.refreshAfterActivityCompletion()
                }
            }
            .store(in: &cancellables)
        
        // Écouter les notifications d'activité créée
        NotificationCenter.default.publisher(for: NSNotification.Name("ActivityCreated"))
            .sink { [weak self] _ in
                Task {
                    await self?.refreshAfterActivityCreation()
                }
            }
            .store(in: &cancellables)
    }
    
    // MARK: - Load Challenges
    func loadChallenges() {
        isLoading = true
        
        Task {
            do {
                let token = try await AuthService.shared.getToken()
                challenges = try await achievementsService.getChallenges(token: token)
                isLoading = false
            } catch {
                isLoading = false
                print("Error loading challenges: \(error)")
            }
        }
    }
    
    // MARK: - Refresh After Activity Completion
    func refreshAfterActivityCompletion() async {
        // Attendre 2 secondes pour que le backend mette à jour
        try? await Task.sleep(nanoseconds: 2_000_000_000)
        
        await MainActor.run {
            loadChallenges()
            loadSummary()
        }
        
        // Vérifier les challenges complétés
        await checkForCompletedChallenges()
    }
    
    // MARK: - Refresh After Activity Creation
    func refreshAfterActivityCreation() async {
        await MainActor.run {
            loadSummary()
        }
    }
    
    // MARK: - Load Summary
    func loadSummary() {
        Task {
            do {
                let token = try await AuthService.shared.getToken()
                summary = try await achievementsService.getSummary(token: token)
            } catch {
                print("Error loading summary: \(error)")
            }
        }
    }
    
    // MARK: - Check for Completed Challenges
    private func checkForCompletedChallenges() async {
        // Comparer la progression actuelle avec la précédente
        // Émettre une notification si un challenge est complété
        // (Implémentation similaire à Android)
    }
}
```

---

## 📱 Utilisation dans l'App

### ContentView.swift

```swift
import SwiftUI

struct ContentView: View {
    @StateObject private var activitiesViewModel = ActivitiesViewModel()
    @StateObject private var achievementsViewModel = AchievementsViewModel()
    @State private var selectedTab = 0
    
    var body: some View {
        TabView(selection: $selectedTab) {
            ActivitiesListView()
                .environmentObject(activitiesViewModel)
                .tabItem {
                    Label("Activities", systemImage: "sportscourt")
                }
                .tag(0)
            
            AchievementsView()
                .environmentObject(achievementsViewModel)
                .tabItem {
                    Label("Achievements", systemImage: "trophy")
                }
                .tag(1)
        }
        .onAppear {
            achievementsViewModel.loadChallenges()
            achievementsViewModel.loadSummary()
        }
    }
}
```

---

## ✅ Checklist d'Intégration

- [ ] Créer les modèles de données (`Activity`, `ActivityCreator`, etc.)
- [ ] Créer `APIService` pour les requêtes génériques
- [ ] Créer `ActivitiesService` pour les opérations d'activités
- [ ] Créer `ActivitiesViewModel` pour la logique métier
- [ ] Créer `CreateActivityViewModel` pour la création
- [ ] Créer les vues SwiftUI (`ActivitiesListView`, `ActivityCardView`, etc.)
- [ ] Intégrer avec `AuthService` pour l'authentification
- [ ] Intégrer avec `AchievementsViewModel` pour les achievements
- [ ] Tester la création d'activité
- [ ] Tester l'affichage des activités
- [ ] Tester la complétion d'activité
- [ ] Tester l'intégration avec les achievements

---

## 🧪 Tests

### Test 1 : Créer une Activité

1. Ouvrir l'écran de création d'activité
2. Remplir tous les champs requis
3. Cliquer sur "Create"
4. Vérifier que l'activité apparaît dans la liste

### Test 2 : Compléter une Activité

1. Ouvrir les détails d'une activité créée par l'utilisateur
2. Cliquer sur "Complete Activity"
3. Entrer la durée (et optionnellement la distance)
4. Cliquer sur "Complete"
5. Vérifier que l'activité est marquée comme complétée
6. Vérifier que les challenges se mettent à jour (après 2 secondes)

---

## 🚨 Points Importants

1. **Authentification** : Tous les endpoints nécessitent un token JWT (sauf GET `/activities` pour les activités publiques)

2. **Format de Date** : 
   - `date` : Format ISO 8601 date seulement (`YYYY-MM-DD`)
   - `time` : Format ISO 8601 datetime complet

3. **Gestion des Erreurs** : Toujours gérer les erreurs réseau et afficher des messages appropriés

4. **Rafraîchissement** : Rafraîchir les achievements après complétion d'activité (attendre 2 secondes)

5. **Permissions** : Seul le créateur peut compléter une activité

---

## 📝 Résumé

Ce guide fournit une implémentation complète pour iOS Swift avec SwiftUI pour :

1. ✅ Afficher la liste des activités
2. ✅ Créer une nouvelle activité
3. ✅ Afficher les détails d'une activité
4. ✅ Rejoindre une activité
5. ✅ Compléter une activité
6. ✅ Intégration avec le système d'achievements

**Le code est prêt à être intégré dans votre application iOS !** 🎉


# 📱 Guide Frontend - Système de Reviews

## Vue d'ensemble

Ce guide explique comment intégrer le système de reviews dans votre application frontend (iOS Swift ou Android). Les reviews permettent aux participants d'évaluer les sessions coach après leur completion.

---

## 🔌 Endpoints API disponibles

### 1. Créer un review
**POST** `/reviews`

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**Body:**
```json
{
  "activityId": "692b00a20629298af4b1727c",
  "rating": 5,
  "comment": "Great session! Very motivating."
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Review submitted successfully",
  "review": {
    "_id": "692b04520629298af4b173f8",
    "activityId": "692b00a20629298af4b1727c",
    "userId": "6921d5a722b82871fe4b7fd7",
    "rating": 5,
    "comment": "Great session! Very motivating.",
    "createdAt": "2025-11-29T14:33:54.368Z",
    "updatedAt": "2025-11-29T14:33:54.368Z"
  }
}
```

**Erreurs possibles:**
- `400` - Invalid request (rating must be 1-5)
- `404` - Activity not found
- `409` - Review already exists (un utilisateur ne peut laisser qu'un review par activité)
- `401` - Unauthorized

---

### 2. Récupérer les reviews d'une activité
**GET** `/reviews/activity/:activityId`

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Response (200):**
```json
{
  "reviews": [
    {
      "_id": "692b04520629298af4b173f8",
      "userId": {
        "_id": "6921d5a722b82871fe4b7fd7",
        "name": "John Doe",
        "profileImageUrl": "https://..."
      },
      "rating": 5,
      "comment": "Great session!",
      "createdAt": "2025-11-29T14:33:54.368Z"
    }
  ],
  "averageRating": 4.5,
  "totalReviews": 3
}
```

---

### 3. Récupérer les reviews d'un coach
**GET** `/reviews/coach?limit=50`

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Query Parameters:**
- `limit` (optionnel, défaut: 50) - Nombre maximum de reviews à retourner

**Response (200):**
```json
{
  "reviews": [
    {
      "_id": "692b04520629298af4b173f8",
      "id": "692b04520629298af4b173f8",
      "activityId": "692b00a20629298af4b1727c",
      "activityTitle": "Morning HIIT Training",
      "userId": "6921d5a722b82871fe4b7fd7",
      "userName": "John Doe",
      "userAvatar": "https://...",
      "rating": 5,
      "comment": "Great session!",
      "createdAt": "2025-11-29T14:33:54.368Z"
    }
  ],
  "averageRating": 4.5,
  "totalReviews": 3
}
```

---

### 4. Endpoint de debug (développement)
**GET** `/reviews/coach/debug`

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Response (200):**
```json
{
  "coachId": "692aff6d0629298af4b1719f",
  "coachActivitiesCount": 5,
  "coachActivityIds": ["692b00a20629298af4b1727c", ...],
  "allReviewsCount": 3,
  "reviewActivitiesInfo": [...]
}
```

---

## 📦 Modèles de données

### Review Model

```typescript
// TypeScript / Dart
interface Review {
  _id: string;
  activityId: string;
  userId: string;
  rating: number; // 1-5
  comment: string | null;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

interface ReviewWithUser extends Review {
  userName: string;
  userAvatar: string | null;
}

interface ActivityReviewsResponse {
  reviews: ReviewWithUser[];
  averageRating: number;
  totalReviews: number;
}

interface CoachReviewsResponse {
  reviews: Array<{
    _id: string;
    id: string;
    activityId: string;
    activityTitle: string;
    userId: string;
    userName: string;
    userAvatar: string | null;
    rating: number;
    comment: string | null;
    createdAt: string;
  }>;
  averageRating: number;
  totalReviews: number;
}
```

```swift
// Swift
struct Review: Codable {
    let id: String
    let activityId: String
    let userId: String
    let rating: Int // 1-5
    let comment: String?
    let createdAt: String
    let updatedAt: String
    
    enum CodingKeys: String, CodingKey {
        case id = "_id"
        case activityId
        case userId
        case rating
        case comment
        case createdAt
        case updatedAt
    }
}

struct ReviewWithUser: Codable {
    let id: String
    let activityId: String
    let userId: UserInfo
    let rating: Int
    let comment: String?
    let createdAt: String
    
    struct UserInfo: Codable {
        let id: String
        let name: String
        let profileImageUrl: String?
        
        enum CodingKeys: String, CodingKey {
            case id = "_id"
            case name
            case profileImageUrl
        }
    }
}

struct ActivityReviewsResponse: Codable {
    let reviews: [ReviewWithUser]
    let averageRating: Double
    let totalReviews: Int
}

struct CoachReview: Codable {
    let id: String
    let activityId: String
    let activityTitle: String
    let userId: String
    let userName: String
    let userAvatar: String?
    let rating: Int
    let comment: String?
    let createdAt: String
}

struct CoachReviewsResponse: Codable {
    let reviews: [CoachReview]
    let averageRating: Double
    let totalReviews: Int
}
```

```kotlin
// Kotlin (Android)
data class Review(
    @SerializedName("_id") val id: String,
    @SerializedName("activityId") val activityId: String,
    @SerializedName("userId") val userId: String,
    @SerializedName("rating") val rating: Int, // 1-5
    @SerializedName("comment") val comment: String?,
    @SerializedName("createdAt") val createdAt: String,
    @SerializedName("updatedAt") val updatedAt: String
)

data class UserInfo(
    @SerializedName("_id") val id: String,
    @SerializedName("name") val name: String,
    @SerializedName("profileImageUrl") val profileImageUrl: String?
)

data class ReviewWithUser(
    @SerializedName("_id") val id: String,
    @SerializedName("activityId") val activityId: String,
    @SerializedName("userId") val userId: UserInfo,
    @SerializedName("rating") val rating: Int,
    @SerializedName("comment") val comment: String?,
    @SerializedName("createdAt") val createdAt: String
)

data class ActivityReviewsResponse(
    @SerializedName("reviews") val reviews: List<ReviewWithUser>,
    @SerializedName("averageRating") val averageRating: Double,
    @SerializedName("totalReviews") val totalReviews: Int
)

data class CoachReview(
    @SerializedName("_id") val id: String,
    @SerializedName("id") val id2: String,
    @SerializedName("activityId") val activityId: String,
    @SerializedName("activityTitle") val activityTitle: String,
    @SerializedName("userId") val userId: String,
    @SerializedName("userName") val userName: String,
    @SerializedName("userAvatar") val userAvatar: String?,
    @SerializedName("rating") val rating: Int,
    @SerializedName("comment") val comment: String?,
    @SerializedName("createdAt") val createdAt: String
)

data class CoachReviewsResponse(
    @SerializedName("reviews") val reviews: List<CoachReview>,
    @SerializedName("averageRating") val averageRating: Double,
    @SerializedName("totalReviews") val totalReviews: Int
)
```

---

## 🎨 Implémentation UI

### 1. Écran de création de review

#### iOS Swift (SwiftUI)

```swift
import SwiftUI

struct ReviewDialogView: View {
    @Environment(\.dismiss) var dismiss
    @StateObject private var viewModel: ReviewViewModel
    
    let activityId: String
    let activityTitle: String
    
    @State private var rating: Int = 0
    @State private var comment: String = ""
    @State private var isSubmitting: Bool = false
    
    var body: some View {
        NavigationView {
            VStack(spacing: 20) {
                // Header
                VStack(spacing: 8) {
                    Text("Rate Your Session")
                        .font(.title2)
                        .fontWeight(.bold)
                    
                    Text(activityTitle)
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
                .padding(.top, 20)
                
                // Rating Stars
                HStack(spacing: 12) {
                    ForEach(1...5, id: \.self) { index in
                        Button(action: {
                            rating = index
                        }) {
                            Image(systemName: index <= rating ? "star.fill" : "star")
                                .font(.system(size: 40))
                                .foregroundColor(index <= rating ? .yellow : .gray)
                        }
                    }
                }
                .padding(.vertical, 20)
                
                // Comment TextField
                VStack(alignment: .leading, spacing: 8) {
                    Text("Your Review (Optional)")
                        .font(.headline)
                    
                    TextEditor(text: $comment)
                        .frame(height: 120)
                        .padding(8)
                        .overlay(
                            RoundedRectangle(cornerRadius: 8)
                                .stroke(Color.gray.opacity(0.3), lineWidth: 1)
                        )
                }
                .padding(.horizontal)
                
                Spacer()
                
                // Submit Button
                Button(action: {
                    submitReview()
                }) {
                    if isSubmitting {
                        ProgressView()
                            .progressViewStyle(CircularProgressViewStyle(tint: .white))
                    } else {
                        Text("Submit Review")
                            .fontWeight(.semibold)
                    }
                }
                .frame(maxWidth: .infinity)
                .frame(height: 50)
                .background(rating > 0 ? Color.blue : Color.gray)
                .foregroundColor(.white)
                .cornerRadius(12)
                .padding(.horizontal)
                .padding(.bottom, 20)
                .disabled(rating == 0 || isSubmitting)
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
            }
        }
    }
    
    private func submitReview() {
        guard rating > 0 else { return }
        
        isSubmitting = true
        
        Task {
            do {
                try await viewModel.submitReview(
                    activityId: activityId,
                    rating: rating,
                    comment: comment.isEmpty ? nil : comment
                )
                
                await MainActor.run {
                    dismiss()
                }
            } catch {
                await MainActor.run {
                    // Show error alert
                    print("Error submitting review: \(error)")
                }
            }
            
            await MainActor.run {
                isSubmitting = false
            }
        }
    }
}

// ViewModel
@MainActor
class ReviewViewModel: ObservableObject {
    private let apiService: ReviewAPIService
    
    init(apiService: ReviewAPIService) {
        self.apiService = apiService
    }
    
    func submitReview(activityId: String, rating: Int, comment: String?) async throws {
        try await apiService.createReview(
            activityId: activityId,
            rating: rating,
            comment: comment
        )
    }
}
```

#### Android (Jetpack Compose)

```kotlin
@Composable
fun ReviewDialog(
    activityId: String,
    activityTitle: String,
    onDismiss: () -> Unit,
    onReviewSubmitted: () -> Unit
) {
    var rating by remember { mutableStateOf(0) }
    var comment by remember { mutableStateOf("") }
    var isSubmitting by remember { mutableStateOf(false) }
    
    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier.fillMaxWidth()
            ) {
                Text(
                    text = "Rate Your Session",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold
                )
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = activityTitle,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        },
        text = {
            Column(
                modifier = Modifier.fillMaxWidth(),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                // Rating Stars
                Row(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    modifier = Modifier.padding(vertical = 16.dp)
                ) {
                    (1..5).forEach { index ->
                        IconButton(
                            onClick = { rating = index }
                        ) {
                            Icon(
                                imageVector = if (index <= rating) {
                                    Icons.Default.Star
                                } else {
                                    Icons.Default.StarBorder
                                },
                                contentDescription = "Rating $index",
                                tint = if (index <= rating) {
                                    Color(0xFFFFD700) // Gold
                                } else {
                                    Color.Gray
                                },
                                modifier = Modifier.size(48.dp)
                            )
                        }
                    }
                }
                
                // Comment TextField
                OutlinedTextField(
                    value = comment,
                    onValueChange = { comment = it },
                    label = { Text("Your Review (Optional)") },
                    placeholder = { Text("Share your experience...") },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(120.dp),
                    maxLines = 5
                )
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    isSubmitting = true
                    // Submit review
                    viewModel.submitReview(
                        activityId = activityId,
                        rating = rating,
                        comment = comment.ifEmpty { null }
                    ) { success ->
                        isSubmitting = false
                        if (success) {
                            onReviewSubmitted()
                            onDismiss()
                        }
                    }
                },
                enabled = rating > 0 && !isSubmitting
            ) {
                if (isSubmitting) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(20.dp),
                        color = MaterialTheme.colorScheme.onPrimary
                    )
                } else {
                    Text("Submit Review")
                }
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancel")
            }
        }
    )
}
```

---

### 2. Affichage des reviews d'une activité

#### iOS Swift (SwiftUI)

```swift
struct ActivityReviewsView: View {
    @StateObject private var viewModel: ActivityReviewsViewModel
    let activityId: String
    
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                // Average Rating Header
                if let reviewsData = viewModel.reviewsData {
                    HStack {
                        VStack(alignment: .leading) {
                            Text("\(reviewsData.averageRating, specifier: "%.1f")")
                                .font(.system(size: 48, weight: .bold))
                            
                            HStack(spacing: 4) {
                                ForEach(1...5, id: \.self) { index in
                                    Image(systemName: index <= Int(reviewsData.averageRating) ? "star.fill" : "star")
                                        .foregroundColor(.yellow)
                                        .font(.system(size: 16))
                                }
                            }
                            
                            Text("\(reviewsData.totalReviews) reviews")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                        
                        Spacer()
                    }
                    .padding()
                    .background(Color(.systemGray6))
                    .cornerRadius(12)
                    
                    // Reviews List
                    ForEach(reviewsData.reviews) { review in
                        ReviewRowView(review: review)
                    }
                } else if viewModel.isLoading {
                    ProgressView()
                        .frame(maxWidth: .infinity)
                        .padding()
                }
            }
            .padding()
        }
        .navigationTitle("Reviews")
        .onAppear {
            viewModel.loadReviews(activityId: activityId)
        }
    }
}

struct ReviewRowView: View {
    let review: ReviewWithUser
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                // User Avatar
                AsyncImage(url: URL(string: review.userId.profileImageUrl ?? "")) { image in
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                } placeholder: {
                    Circle()
                        .fill(Color.gray.opacity(0.3))
                        .overlay(
                            Text(String(review.userId.name.prefix(1)))
                                .font(.headline)
                        )
                }
                .frame(width: 40, height: 40)
                .clipShape(Circle())
                
                VStack(alignment: .leading, spacing: 4) {
                    Text(review.userId.name)
                        .font(.headline)
                    
                    HStack(spacing: 4) {
                        ForEach(1...5, id: \.self) { index in
                            Image(systemName: index <= review.rating ? "star.fill" : "star")
                                .foregroundColor(.yellow)
                                .font(.system(size: 12))
                        }
                    }
                }
                
                Spacer()
                
                Text(formatDate(review.createdAt))
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            if let comment = review.comment, !comment.isEmpty {
                Text(comment)
                    .font(.body)
                    .padding(.leading, 52)
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: Color.black.opacity(0.05), radius: 5, x: 0, y: 2)
    }
    
    private func formatDate(_ dateString: String) -> String {
        let formatter = ISO8601DateFormatter()
        guard let date = formatter.date(from: dateString) else {
            return dateString
        }
        
        let displayFormatter = DateFormatter()
        displayFormatter.dateStyle = .medium
        displayFormatter.timeStyle = .short
        return displayFormatter.string(from: date)
    }
}
```

#### Android (Jetpack Compose)

```kotlin
@Composable
fun ActivityReviewsScreen(
    activityId: String,
    viewModel: ActivityReviewsViewModel = hiltViewModel()
) {
    val reviewsData by viewModel.reviewsData.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    
    LaunchedEffect(activityId) {
        viewModel.loadReviews(activityId)
    }
    
    Scaffold(
        topBar = {
            TopAppBar(title = { Text("Reviews") })
        }
    ) { padding ->
        when {
            isLoading -> {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator()
                }
            }
            reviewsData != null -> {
                LazyColumn(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    // Average Rating Header
                    item {
                        Card(
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Column(
                                modifier = Modifier.padding(16.dp)
                            ) {
                                Text(
                                    text = String.format("%.1f", reviewsData!!.averageRating),
                                    style = MaterialTheme.typography.displayMedium,
                                    fontWeight = FontWeight.Bold
                                )
                                
                                Row {
                                    repeat(5) { index ->
                                        Icon(
                                            imageVector = if (index < reviewsData!!.averageRating.toInt()) {
                                                Icons.Default.Star
                                            } else {
                                                Icons.Default.StarBorder
                                            },
                                            contentDescription = null,
                                            tint = Color(0xFFFFD700),
                                            modifier = Modifier.size(20.dp)
                                        )
                                    }
                                }
                                
                                Text(
                                    text = "${reviewsData!!.totalReviews} reviews",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }
                    }
                    
                    // Reviews List
                    items(reviewsData!!.reviews) { review ->
                        ReviewCard(review = review)
                    }
                }
            }
        }
    }
}

@Composable
fun ReviewCard(review: ReviewWithUser) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                // User Avatar
                AsyncImage(
                    model = review.userId.profileImageUrl ?: "",
                    contentDescription = review.userId.name,
                    modifier = Modifier
                        .size(40.dp)
                        .clip(CircleShape),
                    placeholder = painterResource(id = R.drawable.placeholder_avatar),
                    error = painterResource(id = R.drawable.placeholder_avatar)
                )
                
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = review.userId.name,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                    
                    Row {
                        repeat(review.rating) {
                            Icon(
                                imageVector = Icons.Default.Star,
                                contentDescription = null,
                                tint = Color(0xFFFFD700),
                                modifier = Modifier.size(16.dp)
                            )
                        }
                    }
                }
                
                Text(
                    text = formatDate(review.createdAt),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            
            review.comment?.let { comment ->
                if (comment.isNotEmpty()) {
                    Text(
                        text = comment,
                        style = MaterialTheme.typography.bodyMedium
                    )
                }
            }
        }
    }
}
```

---

### 3. Affichage des reviews dans le Coach Dashboard

#### iOS Swift (SwiftUI)

```swift
struct CoachReviewsView: View {
    @StateObject private var viewModel: CoachReviewsViewModel
    
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                if let reviewsData = viewModel.reviewsData {
                    // Average Rating Card
                    HStack {
                        VStack(alignment: .leading) {
                            Text("\(reviewsData.averageRating, specifier: "%.1f")")
                                .font(.system(size: 48, weight: .bold))
                            
                            HStack(spacing: 4) {
                                ForEach(1...5, id: \.self) { index in
                                    Image(systemName: index <= Int(reviewsData.averageRating) ? "star.fill" : "star")
                                        .foregroundColor(.yellow)
                                }
                            }
                            
                            Text("\(reviewsData.totalReviews) total reviews")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                        
                        Spacer()
                    }
                    .padding()
                    .background(Color(.systemGray6))
                    .cornerRadius(12)
                    
                    // Reviews List
                    ForEach(reviewsData.reviews) { review in
                        CoachReviewRowView(review: review)
                    }
                }
            }
            .padding()
        }
        .navigationTitle("My Reviews")
        .onAppear {
            viewModel.loadReviews()
        }
    }
}

struct CoachReviewRowView: View {
    let review: CoachReview
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                // User Avatar
                AsyncImage(url: URL(string: review.userAvatar ?? "")) { image in
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                } placeholder: {
                    Circle()
                        .fill(Color.gray.opacity(0.3))
                }
                .frame(width: 40, height: 40)
                .clipShape(Circle())
                
                VStack(alignment: .leading, spacing: 4) {
                    Text(review.userName)
                        .font(.headline)
                    
                    Text(review.activityTitle)
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                    
                    HStack(spacing: 4) {
                        ForEach(1...5, id: \.self) { index in
                            Image(systemName: index <= review.rating ? "star.fill" : "star")
                                .foregroundColor(.yellow)
                                .font(.system(size: 12))
                        }
                    }
                }
                
                Spacer()
            }
            
            if let comment = review.comment, !comment.isEmpty {
                Text(comment)
                    .font(.body)
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: Color.black.opacity(0.05), radius: 5, x: 0, y: 2)
    }
}
```

---

## 🔔 Intégration avec les notifications

### Gérer la notification `activity_review_request`

```swift
// iOS Swift
func handleReviewNotification(notification: Notification) {
    guard let activityId = notification.metadata?["activityId"] as? String,
          let activityTitle = notification.metadata?["activityTitle"] as? String else {
        return
    }
    
    // Afficher le dialog de review
    showReviewDialog(activityId: activityId, activityTitle: activityTitle)
}
```

```kotlin
// Android
fun handleReviewNotification(notification: NotificationData) {
    val activityId = notification.metadata?.get("activityId") as? String
    val activityTitle = notification.metadata?.get("activityTitle") as? String
    
    if (activityId != null && activityTitle != null) {
        // Afficher le dialog de review
        showReviewDialog(activityId, activityTitle)
    }
}
```

---

## 📝 Service API

### iOS Swift

```swift
import Foundation

class ReviewAPIService {
    private let baseURL = "https://your-api-url.com"
    private let tokenManager: TokenManager
    
    init(tokenManager: TokenManager) {
        self.tokenManager = tokenManager
    }
    
    func createReview(activityId: String, rating: Int, comment: String?) async throws {
        guard let token = tokenManager.getToken() else {
            throw APIError.unauthorized
        }
        
        var request = URLRequest(url: URL(string: "\(baseURL)/reviews")!)
        request.httpMethod = "POST"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let body: [String: Any] = [
            "activityId": activityId,
            "rating": rating,
            "comment": comment as Any
        ]
        
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        
        let (_, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }
        
        if httpResponse.statusCode == 409 {
            throw APIError.reviewAlreadyExists
        }
        
        guard (200...299).contains(httpResponse.statusCode) else {
            throw APIError.serverError(httpResponse.statusCode)
        }
    }
    
    func getActivityReviews(activityId: String) async throws -> ActivityReviewsResponse {
        guard let token = tokenManager.getToken() else {
            throw APIError.unauthorized
        }
        
        var request = URLRequest(url: URL(string: "\(baseURL)/reviews/activity/\(activityId)")!)
        request.httpMethod = "GET"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            throw APIError.serverError((response as? HTTPURLResponse)?.statusCode ?? 500)
        }
        
        return try JSONDecoder().decode(ActivityReviewsResponse.self, from: data)
    }
    
    func getCoachReviews(limit: Int = 50) async throws -> CoachReviewsResponse {
        guard let token = tokenManager.getToken() else {
            throw APIError.unauthorized
        }
        
        var request = URLRequest(url: URL(string: "\(baseURL)/reviews/coach?limit=\(limit)")!)
        request.httpMethod = "GET"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            throw APIError.serverError((response as? HTTPURLResponse)?.statusCode ?? 500)
        }
        
        return try JSONDecoder().decode(CoachReviewsResponse.self, from: data)
    }
}
```

### Android (Kotlin)

```kotlin
interface ReviewAPIService {
    @POST("reviews")
    suspend fun createReview(
        @Body request: CreateReviewRequest
    ): Response<CreateReviewResponse>
    
    @GET("reviews/activity/{activityId}")
    suspend fun getActivityReviews(
        @Path("activityId") activityId: String
    ): Response<ActivityReviewsResponse>
    
    @GET("reviews/coach")
    suspend fun getCoachReviews(
        @Query("limit") limit: Int = 50
    ): Response<CoachReviewsResponse>
}

data class CreateReviewRequest(
    @SerializedName("activityId") val activityId: String,
    @SerializedName("rating") val rating: Int,
    @SerializedName("comment") val comment: String?
)

data class CreateReviewResponse(
    @SerializedName("success") val success: Boolean,
    @SerializedName("message") val message: String,
    @SerializedName("review") val review: Review
)
```

---

## ✅ Checklist d'implémentation

- [ ] Créer les modèles de données (Review, ReviewWithUser, etc.)
- [ ] Implémenter le service API pour les reviews
- [ ] Créer l'UI pour le dialog de création de review
- [ ] Créer l'UI pour afficher les reviews d'une activité
- [ ] Créer l'UI pour afficher les reviews dans le Coach Dashboard
- [ ] Intégrer avec les notifications `activity_review_request`
- [ ] Gérer les erreurs (review déjà existant, etc.)
- [ ] Ajouter la validation (rating 1-5, comment optionnel)
- [ ] Tester avec différents scénarios

---

## 🎯 Exemples d'utilisation

### Créer un review depuis une notification

```swift
// iOS Swift
NotificationCenter.default.addObserver(
    forName: .reviewRequested,
    object: nil,
    queue: .main
) { notification in
    if let activityId = notification.userInfo?["activityId"] as? String,
       let activityTitle = notification.userInfo?["activityTitle"] as? String {
        // Afficher le dialog
        showReviewDialog(activityId: activityId, activityTitle: activityTitle)
    }
}
```

### Afficher les reviews dans une activité

```swift
// iOS Swift
NavigationLink(destination: ActivityReviewsView(activityId: activity.id)) {
    HStack {
        Text("Reviews")
        Spacer()
        if let averageRating = activity.averageRating {
            HStack(spacing: 4) {
                Image(systemName: "star.fill")
                    .foregroundColor(.yellow)
                Text(String(format: "%.1f", averageRating))
            }
        }
    }
}
```

---

## 📚 Ressources supplémentaires

- [Documentation API Swagger](http://your-api-url.com/api-docs)
- [Guide Backend Reviews](../backend/reviews/README.md)
- [Guide Notifications](./GUIDE_FRONTEND_NOTIFICATIONS.md)

---

## 🐛 Debug

Si les reviews ne s'affichent pas :

1. Vérifier que l'utilisateur est bien connecté (JWT token valide)
2. Vérifier que l'activité existe et a été créée par le coach
3. Utiliser l'endpoint `/reviews/coach/debug` pour diagnostiquer
4. Vérifier les logs backend pour voir les requêtes
5. Vérifier que les reviews existent dans MongoDB

---

**Note:** Ce guide est générique et peut être adapté à votre stack frontend spécifique (React Native, Flutter, etc.).


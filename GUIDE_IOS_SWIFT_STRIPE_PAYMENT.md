# 📱 Guide iOS Swift - Intégration Stripe Payment

## Vue d'ensemble

Ce guide explique comment intégrer les paiements Stripe dans votre application iOS Swift pour permettre aux utilisateurs de payer pour participer aux activités coach.

---

## 🔌 Endpoints API disponibles

### 1. Créer un Payment Intent
**POST** `/payments/create-intent`

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**Body:**
```json
{
  "activityId": "692b00a20629298af4b1727c",
  "amount": 25.00,
  "currency": "eur"
}
```

**Response (201):**
```json
{
  "clientSecret": "pi_xxx_secret_xxx",
  "paymentIntentId": "pi_xxx"
}
```

**Erreurs possibles:**
- `400` - Activity is free or amount doesn't match
- `404` - Activity not found
- `401` - Unauthorized

---

### 2. Confirmer un paiement
**POST** `/payments/confirm`

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**Body:**
```json
{
  "paymentIntentId": "pi_xxx",
  "activityId": "692b00a20629298af4b1727c"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Payment confirmed and user added as participant",
  "activityId": "692b00a20629298af4b1727c"
}
```

**Erreurs possibles:**
- `400` - Payment not confirmed or activity is full
- `404` - Activity not found
- `401` - Unauthorized

---

### 3. Vérifier le statut de paiement
**GET** `/payments/check-payment/:activityId`

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Response (200):**
```json
{
  "hasPaid": true,
  "isParticipant": true,
  "activityPrice": 25.00
}
```

---

### 4. Récupérer les earnings du coach
**GET** `/payments/coach/earnings?year=2025&month=11`

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Response (200):**
```json
{
  "totalEarnings": 8450.00,
  "earnings": [
    {
      "date": "2025-11-01",
      "amount": 120.00,
      "activityId": "692a6f3ed41d7322de5344b5",
      "activityTitle": "Morning HIIT Training"
    }
  ]
}
```

---

## 📦 Installation Stripe SDK

### 1. Ajouter Stripe SDK via Swift Package Manager

Dans Xcode :
1. File → Add Packages...
2. Entrez l'URL : `https://github.com/stripe/stripe-ios`
3. Sélectionnez la version (recommandé : dernière version stable)
4. Ajoutez `Stripe` et `StripePaymentSheet` à votre target

### 2. Configuration Info.plist

Ajoutez dans `Info.plist` :
```xml
<key>NSAppTransportSecurity</key>
<dict>
    <key>NSAllowsArbitraryLoads</key>
    <false/>
</dict>
```

---

## 📦 Modèles de données Swift

```swift
import Foundation

// MARK: - Payment Intent Request
struct CreatePaymentIntentRequest: Codable {
    let activityId: String
    let amount: Double
    let currency: String
    
    enum CodingKeys: String, CodingKey {
        case activityId
        case amount
        case currency
    }
}

// MARK: - Payment Intent Response
struct PaymentIntentResponse: Codable {
    let clientSecret: String
    let paymentIntentId: String
    
    enum CodingKeys: String, CodingKey {
        case clientSecret
        case paymentIntentId
    }
}

// MARK: - Confirm Payment Request
struct ConfirmPaymentRequest: Codable {
    let paymentIntentId: String
    let activityId: String
    
    enum CodingKeys: String, CodingKey {
        case paymentIntentId
        case activityId
    }
}

// MARK: - Confirm Payment Response
struct ConfirmPaymentResponse: Codable {
    let success: Bool
    let message: String
    let activityId: String
}

// MARK: - Check Payment Response
struct CheckPaymentResponse: Codable {
    let hasPaid: Bool
    let isParticipant: Bool
    let activityPrice: Double
}

// MARK: - Coach Earnings Response
struct CoachEarningsResponse: Codable {
    let totalEarnings: Double
    let earnings: [EarningEntry]
}

struct EarningEntry: Codable {
    let date: String
    let amount: Double
    let activityId: String
    let activityTitle: String
}
```

---

## 🔧 Service API

```swift
import Foundation
import Combine

class PaymentAPIService {
    private let baseURL: String
    private let tokenManager: TokenManager
    
    init(baseURL: String, tokenManager: TokenManager) {
        self.baseURL = baseURL
        self.tokenManager = tokenManager
    }
    
    // MARK: - Create Payment Intent
    func createPaymentIntent(
        activityId: String,
        amount: Double,
        currency: String = "eur"
    ) async throws -> PaymentIntentResponse {
        guard let token = tokenManager.getToken() else {
            throw APIError.unauthorized
        }
        
        let url = URL(string: "\(baseURL)/payments/create-intent")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let body = CreatePaymentIntentRequest(
            activityId: activityId,
            amount: amount,
            currency: currency
        )
        
        request.httpBody = try JSONEncoder().encode(body)
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }
        
        guard (200...299).contains(httpResponse.statusCode) else {
            if httpResponse.statusCode == 400 {
                throw APIError.badRequest("Activity is free or amount doesn't match")
            } else if httpResponse.statusCode == 404 {
                throw APIError.notFound("Activity not found")
            } else {
                throw APIError.serverError(httpResponse.statusCode)
            }
        }
        
        return try JSONDecoder().decode(PaymentIntentResponse.self, from: data)
    }
    
    // MARK: - Confirm Payment
    func confirmPayment(
        paymentIntentId: String,
        activityId: String
    ) async throws -> ConfirmPaymentResponse {
        guard let token = tokenManager.getToken() else {
            throw APIError.unauthorized
        }
        
        let url = URL(string: "\(baseURL)/payments/confirm")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let body = ConfirmPaymentRequest(
            paymentIntentId: paymentIntentId,
            activityId: activityId
        )
        
        request.httpBody = try JSONEncoder().encode(body)
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }
        
        guard (200...299).contains(httpResponse.statusCode) else {
            if httpResponse.statusCode == 400 {
                throw APIError.badRequest("Payment not confirmed or activity is full")
            } else if httpResponse.statusCode == 404 {
                throw APIError.notFound("Activity not found")
            } else {
                throw APIError.serverError(httpResponse.statusCode)
            }
        }
        
        return try JSONDecoder().decode(ConfirmPaymentResponse.self, from: data)
    }
    
    // MARK: - Check Payment Status
    func checkPayment(activityId: String) async throws -> CheckPaymentResponse {
        guard let token = tokenManager.getToken() else {
            throw APIError.unauthorized
        }
        
        let url = URL(string: "\(baseURL)/payments/check-payment/\(activityId)")!
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            throw APIError.serverError((response as? HTTPURLResponse)?.statusCode ?? 500)
        }
        
        return try JSONDecoder().decode(CheckPaymentResponse.self, from: data)
    }
    
    // MARK: - Get Coach Earnings
    func getCoachEarnings(year: Int? = nil, month: Int? = nil) async throws -> CoachEarningsResponse {
        guard let token = tokenManager.getToken() else {
            throw APIError.unauthorized
        }
        
        var urlComponents = URLComponents(string: "\(baseURL)/payments/coach/earnings")!
        if let year = year {
            urlComponents.queryItems = [URLQueryItem(name: "year", value: "\(year)")]
            if let month = month {
                urlComponents.queryItems?.append(URLQueryItem(name: "month", value: "\(month)"))
            }
        }
        
        guard let url = urlComponents.url else {
            throw APIError.invalidURL
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            throw APIError.serverError((response as? HTTPURLResponse)?.statusCode ?? 500)
        }
        
        return try JSONDecoder().decode(CoachEarningsResponse.self, from: data)
    }
}

// MARK: - API Errors
enum APIError: Error, LocalizedError {
    case unauthorized
    case invalidResponse
    case invalidURL
    case badRequest(String)
    case notFound(String)
    case serverError(Int)
    
    var errorDescription: String? {
        switch self {
        case .unauthorized:
            return "You are not authorized. Please log in again."
        case .invalidResponse:
            return "Invalid response from server"
        case .invalidURL:
            return "Invalid URL"
        case .badRequest(let message):
            return message
        case .notFound(let message):
            return message
        case .serverError(let code):
            return "Server error: \(code)"
        }
    }
}
```

---

## 🎨 Implémentation UI - Payment Flow

### 1. Payment Sheet View (SwiftUI)

```swift
import SwiftUI
import StripePaymentSheet

struct PaymentSheetView: View {
    @Environment(\.dismiss) var dismiss
    @StateObject private var viewModel: PaymentViewModel
    
    let activityId: String
    let activityTitle: String
    let amount: Double
    let currency: String
    
    @State private var isProcessing: Bool = false
    @State private var errorMessage: String?
    @State private var showError: Bool = false
    
    var body: some View {
        NavigationView {
            VStack(spacing: 20) {
                // Activity Info
                VStack(spacing: 12) {
                    Text("Join Activity")
                        .font(.title2)
                        .fontWeight(.bold)
                    
                    Text(activityTitle)
                        .font(.headline)
                        .foregroundColor(.secondary)
                    
                    Text("\(String(format: "%.2f", amount)) \(currency.uppercased())")
                        .font(.system(size: 32, weight: .bold))
                        .foregroundColor(.blue)
                }
                .padding(.top, 30)
                
                Spacer()
                
                // Payment Button
                Button(action: {
                    processPayment()
                }) {
                    if isProcessing {
                        ProgressView()
                            .progressViewStyle(CircularProgressViewStyle(tint: .white))
                    } else {
                        Text("Pay \(String(format: "%.2f", amount)) \(currency.uppercased())")
                            .fontWeight(.semibold)
                    }
                }
                .frame(maxWidth: .infinity)
                .frame(height: 50)
                .background(isProcessing ? Color.gray : Color.blue)
                .foregroundColor(.white)
                .cornerRadius(12)
                .padding(.horizontal)
                .disabled(isProcessing)
                
                // Cancel Button
                Button(action: {
                    dismiss()
                }) {
                    Text("Cancel")
                        .foregroundColor(.secondary)
                }
                .padding(.bottom, 20)
            }
            .navigationBarTitleDisplayMode(.inline)
            .alert("Payment Error", isPresented: $showError) {
                Button("OK", role: .cancel) { }
            } message: {
                Text(errorMessage ?? "An error occurred")
            }
        }
        .onAppear {
            viewModel.preparePayment(activityId: activityId, amount: amount, currency: currency)
        }
    }
    
    private func processPayment() {
        isProcessing = true
        errorMessage = nil
        
        Task {
            do {
                let result = try await viewModel.processPayment()
                
                await MainActor.run {
                    isProcessing = false
                    if result {
                        dismiss()
                        // Optionnel: Afficher un message de succès
                    }
                }
            } catch {
                await MainActor.run {
                    isProcessing = false
                    errorMessage = error.localizedDescription
                    showError = true
                }
            }
        }
    }
}
```

---

### 2. Payment ViewModel

```swift
import Foundation
import StripePaymentSheet
import Combine

@MainActor
class PaymentViewModel: ObservableObject {
    private let apiService: PaymentAPIService
    private let publishableKey: String
    
    @Published var paymentSheet: PaymentSheet?
    @Published var isLoading: Bool = false
    @Published var errorMessage: String?
    
    private var currentPaymentIntentId: String?
    private var currentActivityId: String?
    
    init(apiService: PaymentAPIService, publishableKey: String) {
        self.apiService = apiService
        self.publishableKey = publishableKey
        
        // Configurer Stripe avec la clé publique
        StripeAPI.defaultPublishableKey = publishableKey
    }
    
    // MARK: - Prepare Payment
    func preparePayment(activityId: String, amount: Double, currency: String) {
        isLoading = true
        
        Task {
            do {
                // 1. Créer le Payment Intent côté backend
                let paymentIntent = try await apiService.createPaymentIntent(
                    activityId: activityId,
                    amount: amount,
                    currency: currency
                )
                
                currentPaymentIntentId = paymentIntent.paymentIntentId
                currentActivityId = activityId
                
                // 2. Configurer PaymentSheet avec le clientSecret
                var configuration = PaymentSheet.Configuration()
                configuration.merchantDisplayName = "Fitness App"
                configuration.applePay = .init(
                    merchantId: "merchant.com.yourapp.fitness", // Votre Merchant ID
                    merchantCountryCode: "FR"
                )
                
                let paymentSheet = PaymentSheet(
                    paymentIntentClientSecret: paymentIntent.clientSecret,
                    configuration: configuration
                )
                
                await MainActor.run {
                    self.paymentSheet = paymentSheet
                    self.isLoading = false
                }
            } catch {
                await MainActor.run {
                    self.errorMessage = error.localizedDescription
                    self.isLoading = false
                }
            }
        }
    }
    
    // MARK: - Process Payment
    func processPayment() async throws -> Bool {
        guard let paymentSheet = paymentSheet else {
            throw PaymentError.paymentSheetNotReady
        }
        
        guard let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
              let window = windowScene.windows.first,
              let rootViewController = window.rootViewController else {
            throw PaymentError.noViewController
        }
        
        // Afficher le PaymentSheet
        return try await withCheckedThrowingContinuation { continuation in
            paymentSheet.present(from: rootViewController) { [weak self] paymentResult in
                guard let self = self else {
                    continuation.resume(throwing: PaymentError.unknown)
                    return
                }
                
                switch paymentResult {
                case .completed:
                    // Confirmer le paiement côté backend
                    Task {
                        do {
                            guard let paymentIntentId = self.currentPaymentIntentId,
                                  let activityId = self.currentActivityId else {
                                continuation.resume(throwing: PaymentError.missingData)
                                return
                            }
                            
                            let result = try await self.apiService.confirmPayment(
                                paymentIntentId: paymentIntentId,
                                activityId: activityId
                            )
                            
                            if result.success {
                                continuation.resume(returning: true)
                            } else {
                                continuation.resume(throwing: PaymentError.confirmationFailed)
                            }
                        } catch {
                            continuation.resume(throwing: error)
                        }
                    }
                    
                case .canceled:
                    continuation.resume(returning: false)
                    
                case .failed(let error):
                    continuation.resume(throwing: error)
                }
            }
        }
    }
}

// MARK: - Payment Errors
enum PaymentError: Error, LocalizedError {
    case paymentSheetNotReady
    case noViewController
    case missingData
    case confirmationFailed
    case unknown
    
    var errorDescription: String? {
        switch self {
        case .paymentSheetNotReady:
            return "Payment sheet is not ready. Please try again."
        case .noViewController:
            return "Unable to present payment sheet."
        case .missingData:
            return "Missing payment data."
        case .confirmationFailed:
            return "Payment confirmation failed."
        case .unknown:
            return "An unknown error occurred."
        }
    }
}
```

---

### 3. Activity Detail View avec Payment

```swift
import SwiftUI

struct ActivityDetailView: View {
    @StateObject private var viewModel: ActivityDetailViewModel
    @State private var showPaymentSheet: Bool = false
    
    let activityId: String
    
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                // Activity Info
                // ... (votre UI existante)
                
                // Payment Section
                if let activity = viewModel.activity,
                   let price = activity.price,
                   price > 0 {
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Join this Activity")
                            .font(.headline)
                        
                        HStack {
                            VStack(alignment: .leading) {
                                Text("Price")
                                    .font(.subheadline)
                                    .foregroundColor(.secondary)
                                Text("\(String(format: "%.2f", price)) €")
                                    .font(.title2)
                                    .fontWeight(.bold)
                            }
                            
                            Spacer()
                            
                            Button(action: {
                                showPaymentSheet = true
                            }) {
                                Text("Pay Now")
                                    .fontWeight(.semibold)
                                    .foregroundColor(.white)
                                    .padding(.horizontal, 24)
                                    .padding(.vertical, 12)
                                    .background(Color.blue)
                                    .cornerRadius(8)
                            }
                            .disabled(viewModel.isParticipant || viewModel.isLoading)
                        }
                        .padding()
                        .background(Color(.systemGray6))
                        .cornerRadius(12)
                    }
                } else {
                    // Free activity - Join button
                    Button(action: {
                        viewModel.joinActivity()
                    }) {
                        Text("Join Activity")
                            .fontWeight(.semibold)
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .frame(height: 50)
                            .background(Color.blue)
                            .cornerRadius(12)
                    }
                    .disabled(viewModel.isParticipant || viewModel.isLoading)
                }
            }
            .padding()
        }
        .navigationTitle(viewModel.activity?.title ?? "Activity")
        .sheet(isPresented: $showPaymentSheet) {
            if let activity = viewModel.activity,
               let price = activity.price {
                PaymentSheetView(
                    viewModel: PaymentViewModel(
                        apiService: PaymentAPIService(
                            baseURL: "https://your-api-url.com",
                            tokenManager: TokenManager.shared
                        ),
                        publishableKey: "pk_test_51SYaif56MHhsen2TYcMDg9VElyxzT8UsB8kWKaPrgxKwprD0tJIFe05w8GAVwNjOVD1cQBA0jfuqKPBEtylYqTBn00EdT2Q2ta"
                    ),
                    activityId: activityId,
                    activityTitle: activity.title,
                    amount: price,
                    currency: "eur"
                )
            }
        }
        .onAppear {
            viewModel.loadActivity(activityId: activityId)
            viewModel.checkPaymentStatus(activityId: activityId)
        }
    }
}
```

---

### 4. Coach Earnings View

```swift
import SwiftUI

struct CoachEarningsView: View {
    @StateObject private var viewModel: CoachEarningsViewModel
    @State private var selectedYear: Int = Calendar.current.component(.year, from: Date())
    @State private var selectedMonth: Int? = Calendar.current.component(.month, from: Date())
    
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                // Total Earnings Card
                if let earnings = viewModel.earnings {
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Total Earnings")
                            .font(.headline)
                            .foregroundColor(.secondary)
                        
                        Text("\(String(format: "%.2f", earnings.totalEarnings)) €")
                            .font(.system(size: 48, weight: .bold))
                            .foregroundColor(.green)
                    }
                    .padding()
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color(.systemGray6))
                    .cornerRadius(12)
                    
                    // Filter Picker
                    HStack {
                        Picker("Year", selection: $selectedYear) {
                            ForEach(2020...2030, id: \.self) { year in
                                Text("\(year)").tag(year)
                            }
                        }
                        .pickerStyle(.menu)
                        
                        Picker("Month", selection: $selectedMonth) {
                            Text("All").tag(nil as Int?)
                            ForEach(1...12, id: \.self) { month in
                                Text(monthName(month)).tag(month as Int?)
                            }
                        }
                        .pickerStyle(.menu)
                    }
                    .onChange(of: selectedYear) { _ in
                        loadEarnings()
                    }
                    .onChange(of: selectedMonth) { _ in
                        loadEarnings()
                    }
                    
                    // Earnings List
                    if earnings.earnings.isEmpty {
                        Text("No earnings for this period")
                            .foregroundColor(.secondary)
                            .frame(maxWidth: .infinity, alignment: .center)
                            .padding()
                    } else {
                        ForEach(earnings.earnings, id: \.activityId) { earning in
                            EarningsRowView(earning: earning)
                        }
                    }
                } else if viewModel.isLoading {
                    ProgressView()
                        .frame(maxWidth: .infinity)
                        .padding()
                }
            }
            .padding()
        }
        .navigationTitle("My Earnings")
        .onAppear {
            loadEarnings()
        }
    }
    
    private func loadEarnings() {
        viewModel.loadEarnings(year: selectedYear, month: selectedMonth)
    }
    
    private func monthName(_ month: Int) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMMM"
        let date = Calendar.current.date(from: DateComponents(month: month))!
        return formatter.string(from: date)
    }
}

struct EarningsRowView: View {
    let earning: EarningEntry
    
    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text(earning.activityTitle)
                    .font(.headline)
                
                Text(formatDate(earning.date))
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            Spacer()
            
            Text("\(String(format: "%.2f", earning.amount)) €")
                .font(.headline)
                .foregroundColor(.green)
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
        return displayFormatter.string(from: date)
    }
}

// MARK: - ViewModel
@MainActor
class CoachEarningsViewModel: ObservableObject {
    @Published var earnings: CoachEarningsResponse?
    @Published var isLoading: Bool = false
    @Published var errorMessage: String?
    
    private let apiService: PaymentAPIService
    
    init(apiService: PaymentAPIService) {
        self.apiService = apiService
    }
    
    func loadEarnings(year: Int? = nil, month: Int? = nil) {
        isLoading = true
        errorMessage = nil
        
        Task {
            do {
                let earnings = try await apiService.getCoachEarnings(year: year, month: month)
                
                await MainActor.run {
                    self.earnings = earnings
                    self.isLoading = false
                }
            } catch {
                await MainActor.run {
                    self.errorMessage = error.localizedDescription
                    self.isLoading = false
                }
            }
        }
    }
}
```

---

## 🔐 Configuration

### 1. Variables d'environnement

Créez un fichier `Config.swift` :

```swift
import Foundation

struct AppConfig {
    static let stripePublishableKey = "pk_test_51SYaif56MHhsen2TYcMDg9VElyxzT8UsB8kWKaPrgxKwprD0tJIFe05w8GAVwNjOVD1cQBA0jfuqKPBEtylYqTBn00EdT2Q2ta"
    static let apiBaseURL = "https://your-api-url.com"
    
    // Pour la production, utilisez les clés de production
    // static let stripePublishableKey = "pk_live_..."
}
```

### 2. Token Manager

```swift
import Foundation

class TokenManager {
    static let shared = TokenManager()
    
    private let keychainKey = "jwt_token"
    
    private init() {}
    
    func getToken() -> String? {
        // Récupérer depuis Keychain
        // Implémentation Keychain ici
        return UserDefaults.standard.string(forKey: keychainKey)
    }
    
    func saveToken(_ token: String) {
        UserDefaults.standard.set(token, forKey: keychainKey)
        // Sauvegarder aussi dans Keychain pour plus de sécurité
    }
    
    func removeToken() {
        UserDefaults.standard.removeObject(forKey: keychainKey)
        // Supprimer aussi de Keychain
    }
}
```

---

## 🧪 Test avec les cartes Stripe

### Cartes de test

Utilisez ces cartes pour tester :

**Paiement réussi :**
- Numéro : `4242 4242 4242 4242`
- Date d'expiration : N'importe quelle date future (ex: 12/25)
- CVC : N'importe quel code à 3 chiffres (ex: 123)
- Code postal : N'importe quel code postal (ex: 12345)

**Paiement refusé :**
- Numéro : `4000 0000 0000 0002`

**3D Secure requis :**
- Numéro : `4000 0027 6000 3184`

---

## 📱 Flux complet

### 1. Utilisateur clique sur "Pay Now"

```swift
// Dans ActivityDetailView
Button("Pay Now") {
    showPaymentSheet = true
}
```

### 2. Créer Payment Intent

```swift
// Dans PaymentViewModel.preparePayment
let paymentIntent = try await apiService.createPaymentIntent(
    activityId: activityId,
    amount: amount,
    currency: currency
)
```

### 3. Afficher PaymentSheet

```swift
// Dans PaymentViewModel.processPayment
paymentSheet.present(from: rootViewController) { paymentResult in
    switch paymentResult {
    case .completed:
        // Confirmer le paiement
    case .canceled:
        // L'utilisateur a annulé
    case .failed(let error):
        // Erreur de paiement
    }
}
```

### 4. Confirmer le paiement côté backend

```swift
// Dans PaymentViewModel.processPayment
let result = try await apiService.confirmPayment(
    paymentIntentId: paymentIntentId,
    activityId: activityId
)
```

### 5. Mettre à jour l'UI

```swift
// Dans ActivityDetailView
.onChange(of: paymentCompleted) { completed in
    if completed {
        // Rafraîchir l'activité
        viewModel.loadActivity(activityId: activityId)
    }
}
```

---

## ✅ Checklist d'implémentation

- [ ] Installer Stripe SDK via Swift Package Manager
- [ ] Configurer la clé publique Stripe
- [ ] Créer les modèles de données (PaymentIntent, ConfirmPayment, etc.)
- [ ] Implémenter PaymentAPIService
- [ ] Créer PaymentViewModel
- [ ] Créer PaymentSheetView
- [ ] Intégrer dans ActivityDetailView
- [ ] Ajouter la gestion d'erreurs
- [ ] Tester avec les cartes de test Stripe
- [ ] Implémenter CoachEarningsView pour le dashboard
- [ ] Gérer les cas d'erreur (activité complète, paiement échoué, etc.)

---

## 🐛 Gestion des erreurs

### Erreurs courantes

1. **Payment Sheet Not Ready**
   - Vérifier que `preparePayment` a été appelé
   - Vérifier que le `clientSecret` est valide

2. **Payment Confirmation Failed**
   - Vérifier que le Payment Intent est bien `succeeded` dans Stripe
   - Vérifier la connexion réseau

3. **Activity Full**
   - Vérifier le nombre de participants avant d'afficher le PaymentSheet
   - Afficher un message d'erreur approprié

### Exemple de gestion d'erreur

```swift
enum PaymentError: Error, LocalizedError {
    case paymentSheetNotReady
    case paymentFailed(String)
    case activityFull
    case networkError
    
    var errorDescription: String? {
        switch self {
        case .paymentSheetNotReady:
            return "Payment is not ready. Please try again."
        case .paymentFailed(let message):
            return "Payment failed: \(message)"
        case .activityFull:
            return "This activity is full. Please choose another activity."
        case .networkError:
            return "Network error. Please check your connection."
        }
    }
}
```

---

## 📚 Ressources supplémentaires

- [Documentation Stripe iOS](https://stripe.com/docs/payments/accept-a-payment?platform=ios)
- [Stripe iOS SDK GitHub](https://github.com/stripe/stripe-ios)
- [Guide Backend Stripe](./STRIPE_SETUP.md)
- [Guide Testing Stripe](./STRIPE_TESTING_GUIDE.md)

---

## 🎯 Exemples d'utilisation

### Vérifier le statut de paiement avant d'afficher le bouton

```swift
struct ActivityDetailView: View {
    @StateObject private var viewModel: ActivityDetailViewModel
    
    var body: some View {
        // ...
        
        if let activity = viewModel.activity,
           let price = activity.price,
           price > 0 {
            if viewModel.hasPaid {
                Label("Paid", systemImage: "checkmark.circle.fill")
                    .foregroundColor(.green)
            } else if viewModel.isParticipant {
                Label("Joined", systemImage: "person.fill.checkmark")
            } else {
                Button("Pay Now") {
                    showPaymentSheet = true
                }
            }
        }
    }
}
```

### Afficher les earnings dans le Coach Dashboard

```swift
struct CoachDashboardView: View {
    var body: some View {
        TabView {
            // ... autres onglets
            
            NavigationView {
                CoachEarningsView(
                    viewModel: CoachEarningsViewModel(
                        apiService: PaymentAPIService(
                            baseURL: AppConfig.apiBaseURL,
                            tokenManager: TokenManager.shared
                        )
                    )
                )
            }
            .tabItem {
                Label("Earnings", systemImage: "dollarsign.circle")
            }
        }
    }
}
```

---

**Note:** Remplacez `"https://your-api-url.com"` par l'URL réelle de votre API backend et `"pk_test_..."` par votre clé publique Stripe.

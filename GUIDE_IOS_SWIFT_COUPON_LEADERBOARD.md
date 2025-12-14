# 📱 Guide iOS Swift - Système Coupon Leaderboard

## 🎯 Nouveautés

Deux nouveaux endpoints API pour gérer les coupons leaderboard :

1. **POST** `/activities/create-test-coupon` - Créer un coupon de test
2. **POST** `/activities/validate-coupon` - Valider et appliquer un coupon

---

## 📋 1. Modèles de Données Swift

### CouponValidationRequest.swift

```swift
import Foundation

struct CouponValidationRequest: Codable {
    let couponCode: String
    let activityPrice: Double
}

extension CouponValidationRequest {
    init(couponCode: String, activityPrice: Double) {
        self.couponCode = couponCode.uppercased().trimmingCharacters(in: .whitespaces)
        self.activityPrice = activityPrice
    }
}
```

### CouponValidationResponse.swift

```swift
import Foundation

struct CouponValidationResponse: Codable {
    let valid: Bool
    let discount: Double
    let newPrice: Double
    let message: String?
}

extension CouponValidationResponse {
    var isSuccess: Bool {
        return valid && discount > 0
    }
    
    var formattedDiscount: String {
        return String(format: "%.2f", discount)
    }
    
    var formattedNewPrice: String {
        return String(format: "%.2f", newPrice)
    }
}
```

### CreateTestCouponResponse.swift

```swift
import Foundation

struct CreateTestCouponResponse: Codable {
    let success: Bool
    let message: String
    let coupon: CouponInfo?
}

struct CouponInfo: Codable {
    let id: String
    let userId: String
    let couponCode: String
    let weekStart: String
    let couponUsed: Bool
}
```

---

## 🔧 2. Service API - CouponService.swift

```swift
import Foundation
import Combine

class CouponService {
    static let shared = CouponService()
    
    private let baseURL = "https://apinest-production.up.railway.app"
    private let session = URLSession.shared
    
    private init() {}
    
    // MARK: - Validate Coupon
    
    func validateCoupon(
        couponCode: String,
        activityPrice: Double,
        token: String
    ) async throws -> CouponValidationResponse {
        let url = URL(string: "\(baseURL)/activities/validate-coupon")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        
        let requestBody = CouponValidationRequest(
            couponCode: couponCode,
            activityPrice: activityPrice
        )
        
        request.httpBody = try JSONEncoder().encode(requestBody)
        
        let (data, response) = try await session.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw CouponError.invalidResponse
        }
        
        guard (200...299).contains(httpResponse.statusCode) else {
            if httpResponse.statusCode == 401 {
                throw CouponError.unauthorized
            } else if httpResponse.statusCode == 400 {
                let errorResponse = try? JSONDecoder().decode(CouponValidationResponse.self, from: data)
                throw CouponError.validationFailed(errorResponse?.message ?? "Code coupon invalide")
            }
            throw CouponError.serverError(httpResponse.statusCode)
        }
        
        let validationResponse = try JSONDecoder().decode(CouponValidationResponse.self, from: data)
        return validationResponse
    }
    
    // MARK: - Create Test Coupon
    
    func createTestCoupon(token: String) async throws -> CreateTestCouponResponse {
        let url = URL(string: "\(baseURL)/activities/create-test-coupon")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        
        // Body vide ou {}
        request.httpBody = try JSONEncoder().encode([String: String]())
        
        let (data, response) = try await session.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw CouponError.invalidResponse
        }
        
        guard (200...299).contains(httpResponse.statusCode) else {
            if httpResponse.statusCode == 401 {
                throw CouponError.unauthorized
            }
            throw CouponError.serverError(httpResponse.statusCode)
        }
        
        let createResponse = try JSONDecoder().decode(CreateTestCouponResponse.self, from: data)
        return createResponse
    }
}

// MARK: - Coupon Errors

enum CouponError: LocalizedError {
    case invalidResponse
    case unauthorized
    case validationFailed(String)
    case serverError(Int)
    case networkError(Error)
    
    var errorDescription: String? {
        switch self {
        case .invalidResponse:
            return "Réponse invalide du serveur"
        case .unauthorized:
            return "Non autorisé. Veuillez vous reconnecter."
        case .validationFailed(let message):
            return message
        case .serverError(let code):
            return "Erreur serveur (\(code))"
        case .networkError(let error):
            return "Erreur réseau: \(error.localizedDescription)"
        }
    }
}
```

---

## 🎨 3. ViewModel - CouponViewModel.swift

```swift
import Foundation
import Combine

@MainActor
class CouponViewModel: ObservableObject {
    @Published var couponCode: String = ""
    @Published var originalPrice: Double = 0.0
    @Published var validationResult: CouponValidationResponse?
    @Published var isLoading: Bool = false
    @Published var errorMessage: String?
    @Published var showSuccess: Bool = false
    
    private let couponService = CouponService.shared
    private var cancellables = Set<AnyCancellable>()
    
    // MARK: - Validate Coupon
    
    func validateCoupon(token: String) async {
        guard !couponCode.isEmpty else {
            errorMessage = "Veuillez entrer un code coupon"
            return
        }
        
        guard originalPrice > 0 else {
            errorMessage = "Le prix doit être supérieur à 0"
            return
        }
        
        isLoading = true
        errorMessage = nil
        
        do {
            let result = try await couponService.validateCoupon(
                couponCode: couponCode,
                activityPrice: originalPrice,
                token: token
            )
            
            validationResult = result
            
            if result.isSuccess {
                showSuccess = true
                errorMessage = nil
            } else {
                errorMessage = result.message ?? "Code coupon invalide"
                showSuccess = false
            }
        } catch let error as CouponError {
            errorMessage = error.errorDescription
            showSuccess = false
        } catch {
            errorMessage = "Une erreur est survenue: \(error.localizedDescription)"
            showSuccess = false
        }
        
        isLoading = false
    }
    
    // MARK: - Create Test Coupon
    
    func createTestCoupon(token: String) async {
        isLoading = true
        errorMessage = nil
        
        do {
            let result = try await couponService.createTestCoupon(token: token)
            
            if result.success {
                errorMessage = nil
                showSuccess = true
                // Optionnel: Afficher un message de succès
                print("✅ Coupon créé: \(result.message)")
            } else {
                errorMessage = result.message
                showSuccess = false
            }
        } catch let error as CouponError {
            errorMessage = error.errorDescription
            showSuccess = false
        } catch {
            errorMessage = "Une erreur est survenue: \(error.localizedDescription)"
            showSuccess = false
        }
        
        isLoading = false
    }
    
    // MARK: - Reset
    
    func reset() {
        couponCode = ""
        validationResult = nil
        errorMessage = nil
        showSuccess = false
    }
}
```

---

## 🖼️ 4. Vue SwiftUI - CouponView.swift

```swift
import SwiftUI

struct CouponView: View {
    @StateObject private var viewModel = CouponViewModel()
    @State private var token: String = "" // Récupérer depuis votre AuthManager
    let activityPrice: Double
    
    var body: some View {
        VStack(spacing: 20) {
            // Header
            VStack(alignment: .leading, spacing: 8) {
                Text("Code Coupon")
                    .font(.headline)
                    .foregroundColor(.primary)
                
                Text("Entrez votre code coupon pour bénéficier d'une réduction")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            
            // Input Field
            TextField("LEADERBOARD", text: $viewModel.couponCode)
                .textFieldStyle(RoundedBorderTextFieldStyle())
                .autocapitalization(.allCharacters)
                .disableAutocorrection(true)
            
            // Error Message
            if let errorMessage = viewModel.errorMessage {
                HStack {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .foregroundColor(.red)
                    Text(errorMessage)
                        .font(.caption)
                        .foregroundColor(.red)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
            
            // Success Message
            if viewModel.showSuccess, let result = viewModel.validationResult {
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Image(systemName: "checkmark.circle.fill")
                            .foregroundColor(.green)
                        Text("Coupon appliqué avec succès!")
                            .font(.subheadline)
                            .fontWeight(.semibold)
                            .foregroundColor(.green)
                    }
                    
                    VStack(alignment: .leading, spacing: 4) {
                        HStack {
                            Text("Prix original:")
                            Spacer()
                            Text("\(activityPrice, specifier: "%.2f") €")
                        }
                        
                        HStack {
                            Text("Réduction:")
                            Spacer()
                            Text("-\(result.formattedDiscount) €")
                                .foregroundColor(.green)
                        }
                        
                        Divider()
                        
                        HStack {
                            Text("Nouveau prix:")
                                .fontWeight(.semibold)
                            Spacer()
                            Text("\(result.formattedNewPrice) €")
                                .fontWeight(.bold)
                                .foregroundColor(.green)
                        }
                    }
                    .font(.subheadline)
                    .padding()
                    .background(Color.green.opacity(0.1))
                    .cornerRadius(8)
                }
            }
            
            // Validate Button
            Button(action: {
                Task {
                    await viewModel.validateCoupon(token: token)
                }
            }) {
                HStack {
                    if viewModel.isLoading {
                        ProgressView()
                            .progressViewStyle(CircularProgressViewStyle(tint: .white))
                    } else {
                        Text("Appliquer le Coupon")
                            .fontWeight(.semibold)
                    }
                }
                .frame(maxWidth: .infinity)
                .padding()
                .background(viewModel.isLoading ? Color.gray : Color.blue)
                .foregroundColor(.white)
                .cornerRadius(10)
            }
            .disabled(viewModel.isLoading || viewModel.couponCode.isEmpty)
            
            Spacer()
        }
        .padding()
        .navigationTitle("Code Coupon")
        .navigationBarTitleDisplayMode(.inline)
    }
}
```

---

## 🔗 5. Intégration dans Activity Payment View

### Exemple d'intégration dans une vue de paiement

```swift
import SwiftUI

struct ActivityPaymentView: View {
    @State private var showCouponView = false
    @State private var appliedCoupon: CouponValidationResponse?
    @State private var finalPrice: Double
    let originalPrice: Double
    let activityId: String
    let token: String
    
    init(originalPrice: Double, activityId: String, token: String) {
        self.originalPrice = originalPrice
        self.activityId = activityId
        self.token = token
        self._finalPrice = State(initialValue: originalPrice)
    }
    
    var body: some View {
        VStack(spacing: 20) {
            // Price Summary
            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    Text("Prix de la session")
                    Spacer()
                    Text("\(originalPrice, specifier: "%.2f") €")
                }
                
                if let coupon = appliedCoupon {
                    HStack {
                        Text("Réduction coupon")
                        Spacer()
                        Text("-\(coupon.formattedDiscount) €")
                            .foregroundColor(.green)
                    }
                    
                    Divider()
                    
                    HStack {
                        Text("Total à payer")
                            .fontWeight(.bold)
                        Spacer()
                        Text("\(coupon.formattedNewPrice) €")
                            .fontWeight(.bold)
                            .foregroundColor(.green)
                    }
                } else {
                    Divider()
                    
                    HStack {
                        Text("Total à payer")
                            .fontWeight(.bold)
                        Spacer()
                        Text("\(originalPrice, specifier: "%.2f") €")
                            .fontWeight(.bold)
                    }
                }
            }
            .padding()
            .background(Color(.systemGray6))
            .cornerRadius(10)
            
            // Coupon Section
            Button(action: {
                showCouponView = true
            }) {
                HStack {
                    Image(systemName: appliedCoupon != nil ? "checkmark.circle.fill" : "tag.fill")
                    Text(appliedCoupon != nil ? "Coupon appliqué" : "J'ai un code coupon")
                    Spacer()
                    Image(systemName: "chevron.right")
                }
                .padding()
                .background(Color.blue.opacity(0.1))
                .foregroundColor(.blue)
                .cornerRadius(10)
            }
            
            // Pay Button
            Button(action: {
                // Process payment with finalPrice
                processPayment()
            }) {
                Text("Payer \(appliedCoupon?.formattedNewPrice ?? String(format: "%.2f", originalPrice)) €")
                    .fontWeight(.bold)
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.green)
                    .foregroundColor(.white)
                    .cornerRadius(10)
            }
        }
        .padding()
        .sheet(isPresented: $showCouponView) {
            CouponSheetView(
                activityPrice: originalPrice,
                token: token,
                onCouponApplied: { result in
                    appliedCoupon = result
                    finalPrice = result.newPrice
                    showCouponView = false
                }
            )
        }
    }
    
    private func processPayment() {
        // Votre logique de paiement ici
        // Utilisez finalPrice au lieu de originalPrice
    }
}

// MARK: - Coupon Sheet View

struct CouponSheetView: View {
    @StateObject private var viewModel = CouponViewModel()
    @Environment(\.dismiss) var dismiss
    let activityPrice: Double
    let token: String
    let onCouponApplied: (CouponValidationResponse) -> Void
    
    var body: some View {
        NavigationView {
            CouponView(
                viewModel: viewModel,
                token: token,
                activityPrice: activityPrice
            )
            .onChange(of: viewModel.validationResult) { result in
                if let result = result, result.isSuccess {
                    DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
                        onCouponApplied(result)
                    }
                }
            }
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Fermer") {
                        dismiss()
                    }
                }
            }
        }
    }
}
```

---

## 🧪 6. Exemple d'Utilisation Complète

```swift
import SwiftUI

struct ExampleUsageView: View {
    @StateObject private var authManager = AuthManager.shared
    @State private var showCouponView = false
    @State private var appliedCoupon: CouponValidationResponse?
    
    let activity: Activity // Votre modèle Activity
    let activityPrice: Double = 350.0
    
    var body: some View {
        VStack {
            // Votre contenu existant
            
            if let token = authManager.token {
                Button("Appliquer un coupon") {
                    showCouponView = true
                }
                .sheet(isPresented: $showCouponView) {
                    CouponSheetView(
                        activityPrice: activityPrice,
                        token: token,
                        onCouponApplied: { result in
                            appliedCoupon = result
                            // Mettre à jour le prix affiché
                        }
                    )
                }
            }
        }
    }
}
```

---

## 🔐 7. Gestion du Token (AuthManager)

Assurez-vous d'avoir un AuthManager pour gérer le token :

```swift
import Foundation

class AuthManager: ObservableObject {
    static let shared = AuthManager()
    
    @Published var token: String? {
        didSet {
            UserDefaults.standard.set(token, forKey: "auth_token")
        }
    }
    
    private init() {
        self.token = UserDefaults.standard.string(forKey: "auth_token")
    }
    
    func setToken(_ token: String) {
        self.token = token
    }
    
    func clearToken() {
        self.token = nil
        UserDefaults.standard.removeObject(forKey: "auth_token")
    }
}
```

---

## 📝 8. Exemple de Test Unitaires

```swift
import XCTest
@testable import YourApp

class CouponServiceTests: XCTestCase {
    var couponService: CouponService!
    
    override func setUp() {
        super.setUp()
        couponService = CouponService.shared
    }
    
    func testValidateCouponSuccess() async throws {
        // Arrange
        let token = "your_test_token"
        let couponCode = "LEADERBOARD"
        let activityPrice = 350.0
        
        // Act
        let result = try await couponService.validateCoupon(
            couponCode: couponCode,
            activityPrice: activityPrice,
            token: token
        )
        
        // Assert
        XCTAssertTrue(result.valid)
        XCTAssertEqual(result.discount, 70.0, accuracy: 0.01)
        XCTAssertEqual(result.newPrice, 280.0, accuracy: 0.01)
    }
    
    func testValidateCouponInvalidCode() async {
        // Arrange
        let token = "your_test_token"
        let couponCode = "INVALID"
        let activityPrice = 350.0
        
        // Act & Assert
        do {
            let result = try await couponService.validateCoupon(
                couponCode: couponCode,
                activityPrice: activityPrice,
                token: token
            )
            XCTAssertFalse(result.valid)
        } catch {
            XCTAssertTrue(error is CouponError)
        }
    }
}
```

---

## 🎯 9. Points d'Intégration Recommandés

### Où ajouter le champ coupon ?

1. **Écran de réservation de session** - Avant le paiement
2. **Écran de paiement** - Section "Code promo"
3. **Écran de détails d'activité** - Si l'activité a un prix

### Flux recommandé :

```
1. Utilisateur sélectionne une activité avec prix
2. Clique sur "Réserver" ou "Payer"
3. Affiche l'écran de paiement avec option "J'ai un code coupon"
4. Utilisateur entre "LEADERBOARD"
5. Appelle /activities/validate-coupon
6. Affiche le nouveau prix avec réduction
7. Utilisateur confirme le paiement avec le prix réduit
```

---

## ✅ Checklist d'Implémentation

- [ ] Créer les modèles de données (`CouponValidationRequest`, `CouponValidationResponse`)
- [ ] Créer `CouponService` avec les méthodes `validateCoupon` et `createTestCoupon`
- [ ] Créer `CouponViewModel` pour gérer l'état
- [ ] Créer `CouponView` pour l'interface utilisateur
- [ ] Intégrer dans l'écran de paiement
- [ ] Gérer les erreurs (coupon invalide, déjà utilisé, etc.)
- [ ] Afficher les messages de succès/erreur
- [ ] Tester avec un coupon valide
- [ ] Tester avec un coupon invalide
- [ ] Tester avec un coupon déjà utilisé

---

## 🐛 Gestion des Erreurs

### Messages d'erreur possibles :

1. **"Code coupon invalide"** - Le code n'est pas "LEADERBOARD"
2. **"Vous n'avez pas reçu ce coupon"** - L'utilisateur n'a pas de coupon dans la base
3. **"Ce coupon a déjà été utilisé"** - Le coupon a déjà été utilisé une fois
4. **"Non autorisé"** - Token JWT invalide ou expiré

### Exemple de gestion :

```swift
switch error {
case .validationFailed(let message):
    // Afficher le message spécifique
    errorMessage = message
case .unauthorized:
    // Rediriger vers l'écran de connexion
    authManager.clearToken()
    // Navigate to login
case .networkError:
    // Afficher message d'erreur réseau
    errorMessage = "Vérifiez votre connexion internet"
default:
    errorMessage = "Une erreur est survenue"
}
```

---

## 📱 10. Exemple Complet - Activity Booking View

```swift
import SwiftUI

struct ActivityBookingView: View {
    @StateObject private var viewModel = BookingViewModel()
    @StateObject private var couponViewModel = CouponViewModel()
    @State private var showCouponInput = false
    @State private var finalPrice: Double
    
    let activity: Activity
    let token: String
    
    init(activity: Activity, token: String) {
        self.activity = activity
        self.token = token
        self._finalPrice = State(initialValue: activity.price ?? 0)
    }
    
    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                // Activity Info
                ActivityInfoCard(activity: activity)
                
                // Price Section
                VStack(alignment: .leading, spacing: 12) {
                    Text("Résumé du paiement")
                        .font(.headline)
                    
                    PriceBreakdownView(
                        originalPrice: activity.price ?? 0,
                        coupon: couponViewModel.validationResult
                    )
                }
                .padding()
                .background(Color(.systemGray6))
                .cornerRadius(12)
                
                // Coupon Button
                if couponViewModel.validationResult == nil {
                    Button(action: {
                        showCouponInput = true
                    }) {
                        HStack {
                            Image(systemName: "tag.fill")
                            Text("J'ai un code coupon")
                            Spacer()
                            Image(systemName: "chevron.right")
                        }
                        .padding()
                        .background(Color.blue.opacity(0.1))
                        .foregroundColor(.blue)
                        .cornerRadius(10)
                    }
                } else {
                    // Coupon Applied
                    HStack {
                        Image(systemName: "checkmark.circle.fill")
                            .foregroundColor(.green)
                        Text("Coupon LEADERBOARD appliqué")
                            .foregroundColor(.green)
                        Spacer()
                        Button("Changer") {
                            couponViewModel.reset()
                        }
                        .foregroundColor(.blue)
                    }
                    .padding()
                    .background(Color.green.opacity(0.1))
                    .cornerRadius(10)
                }
                
                // Book Button
                Button(action: {
                    bookActivity()
                }) {
                    Text("Réserver pour \(finalPrice, specifier: "%.2f") €")
                        .fontWeight(.bold)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.green)
                        .foregroundColor(.white)
                        .cornerRadius(10)
                }
            }
            .padding()
        }
        .navigationTitle("Réserver")
        .sheet(isPresented: $showCouponInput) {
            CouponInputSheet(
                viewModel: couponViewModel,
                activityPrice: activity.price ?? 0,
                token: token,
                onApplied: { result in
                    finalPrice = result.newPrice
                }
            )
        }
    }
    
    private func bookActivity() {
        // Utiliser finalPrice pour la réservation
        viewModel.bookActivity(
            activityId: activity.id,
            price: finalPrice,
            token: token
        )
    }
}
```

---

## 🚀 Déploiement

1. **Ajouter les fichiers** dans votre projet Xcode
2. **Importer** `CouponService` où nécessaire
3. **Intégrer** `CouponView` dans vos écrans de paiement
4. **Tester** avec l'endpoint `/activities/create-test-coupon` d'abord
5. **Valider** le flux complet de validation

---

*Guide complet pour intégrer le système de coupon leaderboard dans iOS Swift*


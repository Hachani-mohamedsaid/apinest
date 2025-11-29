# 💳 Guide iOS Swift - Intégration Stripe Payment

## 🎯 Vue d'Ensemble

Ce guide explique comment implémenter les paiements Stripe dans votre application iOS Swift avec SwiftUI. Cette fonctionnalité permet aux utilisateurs de payer pour rejoindre des activités payantes créées par des coaches vérifiés.

### Fonctionnalités

- ✅ Créer un Payment Intent via le backend
- ✅ Afficher le formulaire de paiement Stripe
- ✅ Confirmer un paiement
- ✅ Vérifier le statut de paiement
- ✅ Gestion des erreurs
- ✅ Interface utilisateur moderne avec SwiftUI

---

## 🔌 Endpoints API Backend

### 1. Créer un Payment Intent

**POST** `/payments/create-intent`

**Headers :**
```
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json
```

**Body :**
```json
{
  "activityId": "507f1f77bcf86cd799439011",
  "amount": 25.00,
  "currency": "eur"
}
```

**Réponse (201 Created) :**
```json
{
  "clientSecret": "pi_xxx_secret_xxx",
  "paymentIntentId": "pi_xxx"
}
```

### 2. Confirmer un Paiement

**POST** `/payments/confirm`

**Headers :**
```
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json
```

**Body :**
```json
{
  "paymentIntentId": "pi_xxx",
  "activityId": "507f1f77bcf86cd799439011"
}
```

**Réponse (200 OK) :**
```json
{
  "success": true,
  "message": "Payment confirmed and user added as participant",
  "activityId": "507f1f77bcf86cd799439011"
}
```

### 3. Vérifier le Statut de Paiement

**GET** `/payments/check-payment/:activityId`

**Headers :**
```
Authorization: Bearer YOUR_ACCESS_TOKEN
```

**Réponse (200 OK) :**
```json
{
  "hasPaid": true,
  "isParticipant": true,
  "activityPrice": 25.00
}
```

---

## 📦 Installation

### 1. Ajouter Stripe SDK via Swift Package Manager

1. Dans Xcode, allez dans **File** > **Add Packages...**
2. Entrez l'URL : `https://github.com/stripe/stripe-ios`
3. Sélectionnez la version (recommandé : la dernière version stable)
4. Ajoutez le package à votre projet

### 2. Configuration Info.plist

Ajoutez dans votre `Info.plist` :

```xml
<key>NSAppTransportSecurity</key>
<dict>
    <key>NSAllowsArbitraryLoads</key>
    <false/>
</dict>
```

---

## 🏗️ Architecture

### Structure des Fichiers

```
📁 Models/
  ├── PaymentIntentResponse.swift
  ├── ConfirmPaymentRequest.swift
  └── PaymentStatusResponse.swift

📁 Services/
  ├── PaymentService.swift
  └── TokenManager.swift

📁 ViewModels/
  └── PaymentViewModel.swift

📁 Views/
  ├── PaymentView.swift
  └── PaymentButton.swift
```

---

## 📦 Models

### PaymentIntentResponse.swift

```swift
import Foundation

struct PaymentIntentResponse: Codable {
    let clientSecret: String
    let paymentIntentId: String
    
    enum CodingKeys: String, CodingKey {
        case clientSecret
        case paymentIntentId
    }
}
```

### ConfirmPaymentRequest.swift

```swift
import Foundation

struct ConfirmPaymentRequest: Codable {
    let paymentIntentId: String
    let activityId: String
}
```

### PaymentStatusResponse.swift

```swift
import Foundation

struct PaymentStatusResponse: Codable {
    let hasPaid: Bool
    let isParticipant: Bool
    let activityPrice: Double
    
    enum CodingKeys: String, CodingKey {
        case hasPaid
        case isParticipant
        case activityPrice
    }
}
```

---

## 🔧 Services

### PaymentService.swift

```swift
import Foundation

class PaymentService {
    private let baseURL = "https://apinest-production.up.railway.app"
    
    // MARK: - Créer un Payment Intent
    
    func createPaymentIntent(
        token: String,
        activityId: String,
        amount: Double,
        currency: String = "eur"
    ) async throws -> PaymentIntentResponse {
        let url = URL(string: "\(baseURL)/payments/create-intent")!
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let body: [String: Any] = [
            "activityId": activityId,
            "amount": amount,
            "currency": currency
        ]
        
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        
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
        return try decoder.decode(PaymentIntentResponse.self, from: data)
    }
    
    // MARK: - Confirmer un Paiement
    
    func confirmPayment(
        token: String,
        paymentIntentId: String,
        activityId: String
    ) async throws -> ConfirmPaymentResponse {
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
        return try decoder.decode(ConfirmPaymentResponse.self, from: data)
    }
    
    // MARK: - Vérifier le Statut de Paiement
    
    func checkPaymentStatus(
        token: String,
        activityId: String
    ) async throws -> PaymentStatusResponse {
        let url = URL(string: "\(baseURL)/payments/check-payment/\(activityId)")!
        
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
        return try decoder.decode(PaymentStatusResponse.self, from: data)
    }
}

// MARK: - Response Models

struct ConfirmPaymentResponse: Codable {
    let success: Bool
    let message: String
    let activityId: String
}
```

### APIError.swift (si pas déjà créé)

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
            return "Ressource non trouvée"
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

### PaymentViewModel.swift

```swift
import Foundation
import SwiftUI
import StripePaymentSheet

@MainActor
class PaymentViewModel: ObservableObject {
    @Published var isLoading = false
    @Published var isProcessingPayment = false
    @Published var errorMessage: String?
    @Published var paymentSheet: PaymentSheet?
    @Published var paymentResult: PaymentSheetResult?
    
    private let paymentService = PaymentService()
    private let tokenManager = TokenManager.shared
    private var paymentIntentId: String?
    private var activityId: String?
    
    // MARK: - Initialiser le Paiement
    
    func initializePayment(activityId: String, amount: Double) async {
        guard let token = tokenManager.getToken() else {
            errorMessage = "Token non disponible"
            return
        }
        
        isLoading = true
        errorMessage = nil
        self.activityId = activityId
        
        do {
            // 1. Créer le Payment Intent via le backend
            let paymentIntent = try await paymentService.createPaymentIntent(
                token: token,
                activityId: activityId,
                amount: amount,
                currency: "eur"
            )
            
            self.paymentIntentId = paymentIntent.paymentIntentId
            
            // 2. Configurer Stripe Payment Sheet
            var configuration = PaymentSheet.Configuration()
            configuration.merchantDisplayName = "Fitness App"
            configuration.allowsDelayedPaymentMethods = false
            
            // 3. Créer le Payment Sheet
            let paymentSheet = PaymentSheet(
                paymentIntentClientSecret: paymentIntent.clientSecret,
                configuration: configuration
            )
            
            self.paymentSheet = paymentSheet
            
        } catch {
            let errorMessage = (error as? APIError)?.errorDescription ?? error.localizedDescription
            self.errorMessage = errorMessage
        }
        
        isLoading = false
    }
    
    // MARK: - Traiter le Paiement
    
    func processPayment() async {
        guard let paymentSheet = paymentSheet else {
            errorMessage = "Payment sheet non initialisé"
            return
        }
        
        guard let token = tokenManager.getToken() else {
            errorMessage = "Token non disponible"
            return
        }
        
        guard let paymentIntentId = paymentIntentId,
              let activityId = activityId else {
            errorMessage = "Informations de paiement manquantes"
            return
        }
        
        isProcessingPayment = true
        errorMessage = nil
        
        // Présenter le Payment Sheet
        // Note: Cette partie doit être gérée dans la vue avec paymentSheet.present()
        // Ici, on simule juste le traitement après confirmation
        
        // Après que l'utilisateur a confirmé le paiement dans le Payment Sheet,
        // on appelle confirmPayment
        do {
            let result = try await paymentService.confirmPayment(
                token: token,
                paymentIntentId: paymentIntentId,
                activityId: activityId
            )
            
            if result.success {
                paymentResult = .completed
            } else {
                errorMessage = "Le paiement n'a pas pu être confirmé"
            }
        } catch {
            let errorMessage = (error as? APIError)?.errorDescription ?? error.localizedDescription
            self.errorMessage = errorMessage
        }
        
        isProcessingPayment = false
    }
    
    // MARK: - Vérifier le Statut de Paiement
    
    func checkPaymentStatus(activityId: String) async -> PaymentStatusResponse? {
        guard let token = tokenManager.getToken() else {
            errorMessage = "Token non disponible"
            return nil
        }
        
        do {
            let status = try await paymentService.checkPaymentStatus(
                token: token,
                activityId: activityId
            )
            return status
        } catch {
            let errorMessage = (error as? APIError)?.errorDescription ?? error.localizedDescription
            self.errorMessage = errorMessage
            return nil
        }
    }
}

// MARK: - Payment Result

enum PaymentSheetResult {
    case completed
    case failed
    case canceled
}
```

---

## 🎨 Views

### PaymentView.swift

```swift
import SwiftUI
import StripePaymentSheet

struct PaymentView: View {
    let activityId: String
    let activityTitle: String
    let amount: Double
    let currency: String = "EUR"
    
    @StateObject private var viewModel = PaymentViewModel()
    @State private var showingPaymentSheet = false
    @Environment(\.dismiss) var dismiss
    
    var body: some View {
        VStack(spacing: 20) {
            // Header
            VStack(spacing: 8) {
                Text("Paiement")
                    .font(.title)
                    .fontWeight(.bold)
                
                Text(activityTitle)
                    .font(.headline)
                    .foregroundColor(.secondary)
            }
            .padding()
            
            // Montant
            VStack(spacing: 4) {
                Text("Montant")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                
                Text("\(amount, specifier: "%.2f") \(currency)")
                    .font(.title)
                    .fontWeight(.bold)
            }
            .padding()
            .frame(maxWidth: .infinity)
            .background(Color.gray.opacity(0.1))
            .cornerRadius(12)
            .padding(.horizontal)
            
            // Bouton de paiement
            if viewModel.isLoading {
                ProgressView("Initialisation du paiement...")
                    .frame(maxWidth: .infinity)
                    .padding()
            } else if let paymentSheet = viewModel.paymentSheet {
                Button(action: {
                    showingPaymentSheet = true
                }) {
                    HStack {
                        Image(systemName: "creditcard.fill")
                        Text("Payer \(amount, specifier: "%.2f") \(currency)")
                            .fontWeight(.semibold)
                    }
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.blue)
                    .foregroundColor(.white)
                    .cornerRadius(12)
                }
                .padding(.horizontal)
                .sheet(isPresented: $showingPaymentSheet) {
                    PaymentSheetView(
                        paymentSheet: paymentSheet,
                        onCompletion: { result in
                            handlePaymentResult(result)
                        }
                    )
                }
            } else {
                Button(action: {
                    Task {
                        await viewModel.initializePayment(
                            activityId: activityId,
                            amount: amount
                        )
                    }
                }) {
                    Text("Initialiser le Paiement")
                        .fontWeight(.semibold)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.gray)
                        .foregroundColor(.white)
                        .cornerRadius(12)
                }
                .padding(.horizontal)
            }
            
            // Message d'erreur
            if let errorMessage = viewModel.errorMessage {
                Text(errorMessage)
                    .font(.caption)
                    .foregroundColor(.red)
                    .padding()
            }
            
            Spacer()
        }
        .padding()
        .navigationTitle("Paiement")
        .navigationBarTitleDisplayMode(.inline)
    }
    
    private func handlePaymentResult(_ result: PaymentSheetResult) {
        switch result {
        case .completed:
            Task {
                await viewModel.processPayment()
                if viewModel.errorMessage == nil {
                    dismiss()
                }
            }
        case .failed:
            viewModel.errorMessage = "Le paiement a échoué"
        case .canceled:
            // L'utilisateur a annulé, ne rien faire
            break
        }
    }
}

// MARK: - Payment Sheet View

struct PaymentSheetView: UIViewControllerRepresentable {
    let paymentSheet: PaymentSheet
    let onCompletion: (PaymentSheetResult) -> Void
    
    func makeUIViewController(context: Context) -> UIViewController {
        let viewController = UIViewController()
        
        DispatchQueue.main.async {
            paymentSheet.present(from: viewController) { result in
                switch result {
                case .completed:
                    onCompletion(.completed)
                case .failed(let error):
                    print("Payment failed: \(error.localizedDescription)")
                    onCompletion(.failed)
                case .canceled:
                    onCompletion(.canceled)
                }
            }
        }
        
        return viewController
    }
    
    func updateUIViewController(_ uiViewController: UIViewController, context: Context) {
        // Pas besoin de mise à jour
    }
}
```

### ActivityDetailView.swift (Exemple d'utilisation)

```swift
import SwiftUI

struct ActivityDetailView: View {
    let activity: Activity
    @State private var showingPayment = false
    @State private var paymentStatus: PaymentStatusResponse?
    
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                // Informations de l'activité
                Text(activity.title)
                    .font(.title)
                    .fontWeight(.bold)
                
                if let price = activity.price, price > 0 {
                    Text("Prix: \(price, specifier: "%.2f") €")
                        .font(.headline)
                        .foregroundColor(.blue)
                }
                
                // Bouton Rejoindre
                if let price = activity.price, price > 0 {
                    // Activité payante
                    if paymentStatus?.hasPaid == true {
                        Label("Déjà payé", systemImage: "checkmark.circle.fill")
                            .foregroundColor(.green)
                    } else {
                        Button(action: {
                            showingPayment = true
                        }) {
                            HStack {
                                Image(systemName: "creditcard.fill")
                                Text("Rejoindre - \(price, specifier: "%.2f") €")
                                    .fontWeight(.semibold)
                            }
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(Color.blue)
                            .foregroundColor(.white)
                            .cornerRadius(12)
                        }
                    }
                } else {
                    // Activité gratuite
                    Button(action: {
                        // Rejoindre l'activité gratuite
                    }) {
                        Text("Rejoindre gratuitement")
                            .fontWeight(.semibold)
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(Color.green)
                            .foregroundColor(.white)
                            .cornerRadius(12)
                    }
                }
            }
            .padding()
        }
        .navigationTitle("Détails")
        .sheet(isPresented: $showingPayment) {
            if let price = activity.price {
                PaymentView(
                    activityId: activity.id,
                    activityTitle: activity.title,
                    amount: price
                )
            }
        }
        .task {
            // Vérifier le statut de paiement au chargement
            if let price = activity.price, price > 0 {
                await checkPaymentStatus()
            }
        }
    }
    
    private func checkPaymentStatus() async {
        let paymentService = PaymentService()
        let tokenManager = TokenManager.shared
        
        guard let token = tokenManager.getToken() else {
            return
        }
        
        do {
            let status = try await paymentService.checkPaymentStatus(
                token: token,
                activityId: activity.id
            )
            paymentStatus = status
        } catch {
            print("Erreur lors de la vérification du statut: \(error)")
        }
    }
}
```

---

## 🔧 Configuration Stripe

### AppDelegate.swift ou SceneDelegate.swift

```swift
import UIKit
import StripeCore

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Configurer Stripe avec votre clé publique
        StripeAPI.defaultPublishableKey = "pk_test_..." // Votre clé publique Stripe
        
        return true
    }
}
```

**⚠️ Important :** Utilisez la clé publique (`pk_test_...` pour le test, `pk_live_...` pour la production).

---

## 🧪 Tests

### Cartes de Test Stripe

Utilisez ces cartes pour tester :

#### ✅ Paiement Réussi
```
Numéro : 4242 4242 4242 4242
Date : 12/25 (ou n'importe quelle date future)
CVC : 123
Code postal : 12345
```

#### ❌ Paiement Refusé
```
Numéro : 4000 0000 0000 0002
Date : 12/25
CVC : 123
```

### Test du Flux Complet

1. **Créer une activité payante** (via votre app ou API)
2. **Afficher l'activité** dans ActivityDetailView
3. **Cliquer sur "Rejoindre"** → Ouvre PaymentView
4. **Initialiser le paiement** → Crée le Payment Intent
5. **Afficher le formulaire Stripe** → Payment Sheet s'affiche
6. **Saisir la carte de test** : `4242 4242 4242 4242`
7. **Confirmer le paiement** → Le paiement est traité
8. **Vérifier** → L'utilisateur est ajouté comme participant

---

## ✅ Checklist iOS

- [ ] Stripe SDK installé via Swift Package Manager
- [ ] Clé publique Stripe configurée dans AppDelegate
- [ ] Models créés (PaymentIntentResponse, ConfirmPaymentRequest, etc.)
- [ ] PaymentService implémenté avec tous les endpoints
- [ ] PaymentViewModel créé avec gestion du Payment Sheet
- [ ] PaymentView créée avec interface utilisateur
- [ ] PaymentSheetView créée pour présenter le formulaire Stripe
- [ ] Gestion des erreurs implémentée
- [ ] Testé avec les cartes de test Stripe
- [ ] Vérification du statut de paiement implémentée

---

## 🎉 Résumé

Vous avez maintenant une implémentation complète pour :

1. ✅ **Créer des Payment Intents** via le backend
2. ✅ **Afficher le formulaire de paiement** Stripe
3. ✅ **Confirmer les paiements** et ajouter les participants
4. ✅ **Vérifier le statut** de paiement
5. ✅ **Gérer les erreurs** de manière appropriée
6. ✅ **Interface utilisateur moderne** avec SwiftUI

L'application iOS peut maintenant gérer les paiements Stripe pour les activités payantes ! 🚀

---

## 📚 Ressources

- [Documentation Stripe iOS](https://stripe.com/docs/payments/accept-a-payment?platform=ios)
- [Stripe iOS SDK](https://github.com/stripe/stripe-ios)
- [Cartes de Test Stripe](https://stripe.com/docs/testing)


# 📊 Guide Complet - Coach Dashboard iOS Swift

## 🎯 Vue d'Ensemble

Ce guide détaille l'intégration complète du **Coach Dashboard** dans une application iOS Swift. Le dashboard permet aux coaches vérifiés de :
- 📈 Visualiser leurs revenus (earnings)
- 💰 Gérer leurs retraits (withdrawals)
- ⭐ Consulter leurs reviews
- 📊 Voir leurs statistiques d'activités
- 👤 Accéder à leur profil

---

## 📡 Endpoints Backend Disponibles

### Base URL
```
https://apinest-production.up.railway.app
```

### 1. **GET** `/payments/coach/earnings`
Récupère les revenus du coach pour une période donnée.

**Query Parameters :**
- `year` (optionnel) : Année (ex: 2025)
- `month` (optionnel) : Mois (1-12)

**Réponse :**
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

### 2. **GET** `/payments/coach/withdraw/balance`
Récupère le solde disponible pour retrait.

**Réponse :**
```json
{
  "availableBalance": 350.0,
  "currency": "usd"
}
```

### 3. **GET** `/payments/coach/withdraw/history`
Récupère l'historique des retraits.

**Query Parameters :**
- `limit` (optionnel, défaut: 50) : Nombre maximum de retraits

**Réponse :**
```json
{
  "withdraws": [
    {
      "id": "693098209febb8f0f79cb560",
      "withdrawId": "WDR-A1B2C3D4",
      "amount": 350.0,
      "currency": "usd",
      "status": "pending",
      "paymentMethod": "bank_transfer",
      "createdAt": "2025-12-07T15:30:00.000Z",
      "processedAt": null,
      "completedAt": null,
      "failureReason": null
    }
  ],
  "total": 1
}
```

### 4. **POST** `/payments/coach/withdraw`
Demande un retrait des gains.

**Body :**
```json
{
  "amount": 350.0,
  "bankAccount": "FR76 1234 5678 9012 3456 7890 123",
  "paymentMethod": "bank_transfer",
  "currency": "usd",
  "description": "Withdrawal for December earnings"
}
```

**Réponse :**
```json
{
  "success": true,
  "message": "Withdrawal request submitted successfully",
  "withdrawId": "WDR-A1B2C3D4",
  "amount": 350.0,
  "status": "pending",
  "data": {
    "id": "693098209febb8f0f79cb560",
    "createdAt": "2025-12-07T15:30:00.000Z"
  }
}
```

### 5. **GET** `/reviews/coach`
Récupère les reviews reçus par le coach.

**Query Parameters :**
- `limit` (optionnel, défaut: 50) : Nombre maximum de reviews

**Réponse :**
```json
{
  "reviews": [
    {
      "_id": "692afa082c227f35ed1416c5",
      "id": "692afa082c227f35ed1416c5",
      "activityId": "692af9cd2c227f35ed141630",
      "activityTitle": "Morning HIIT Training",
      "userId": "6921d5a722b82871fe4b7fd7",
      "userName": "Sarah M.",
      "userAvatar": "https://...",
      "rating": 5,
      "comment": "Best HIIT session I've attended!",
      "createdAt": "2025-10-30T10:00:00.000Z"
    }
  ],
  "averageRating": 4.8,
  "totalReviews": 24
}
```

### 6. **GET** `/users/profile`
Récupère le profil de l'utilisateur connecté (coach).

**Réponse :**
```json
{
  "_id": "6929ac53a788275eb19568eb",
  "email": "coach@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "isCoachVerified": true,
  "coachVerificationData": {
    "status": "approved",
    "verifiedAt": "2025-10-01T10:00:00.000Z"
  },
  "avatar": "https://...",
  "location": "Paris, France"
}
```

---

## 📦 Modèles Swift

### 1. Earnings Model

```swift
import Foundation

struct CoachEarnings: Codable {
    let totalEarnings: Double
    let earnings: [EarningItem]
}

struct EarningItem: Codable {
    let date: String
    let amount: Double
    let activityId: String
    let activityTitle: String
    
    var dateValue: Date? {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter.date(from: date)
    }
}
```

### 2. Withdraw Models

```swift
import Foundation

struct WithdrawBalance: Codable {
    let availableBalance: Double
    let currency: String
}

struct WithdrawHistory: Codable {
    let withdraws: [WithdrawItem]
    let total: Int
}

struct WithdrawItem: Codable, Identifiable {
    let id: String
    let withdrawId: String
    let amount: Double
    let currency: String
    let status: WithdrawStatus
    let paymentMethod: String
    let createdAt: String
    let processedAt: String?
    let completedAt: String?
    let failureReason: String?
    
    enum WithdrawStatus: String, Codable {
        case pending
        case processing
        case completed
        case failed
        case cancelled
    }
    
    var createdAtDate: Date? {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter.date(from: createdAt)
    }
    
    var statusColor: String {
        switch status {
        case .pending: return "orange"
        case .processing: return "blue"
        case .completed: return "green"
        case .failed: return "red"
        case .cancelled: return "gray"
        }
    }
}

struct CreateWithdrawRequest: Codable {
    let amount: Double
    let bankAccount: String?
    let paymentMethod: String?
    let currency: String?
    let description: String?
}

struct CreateWithdrawResponse: Codable {
    let success: Bool
    let message: String
    let withdrawId: String?
    let amount: Double?
    let status: String?
    let data: WithdrawData?
}

struct WithdrawData: Codable {
    let id: String
    let createdAt: String
}
```

### 3. Review Models

```swift
import Foundation

struct CoachReviews: Codable {
    let reviews: [ReviewItem]
    let averageRating: Double
    let totalReviews: Int
}

struct ReviewItem: Codable, Identifiable {
    let id: String
    let activityId: String
    let activityTitle: String
    let userId: String
    let userName: String
    let userAvatar: String?
    let rating: Int
    let comment: String
    let createdAt: String
    
    var createdAtDate: Date? {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter.date(from: createdAt)
    }
    
    var formattedDate: String {
        guard let date = createdAtDate else { return createdAt }
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .short
        return formatter.string(from: date)
    }
}
```

### 4. Coach Profile Model

```swift
import Foundation

struct CoachProfile: Codable {
    let id: String
    let email: String
    let firstName: String?
    let lastName: String?
    let isCoachVerified: Bool
    let coachVerificationData: CoachVerificationData?
    let avatar: String?
    let location: String?
    
    var fullName: String {
        let first = firstName ?? ""
        let last = lastName ?? ""
        return "\(first) \(last)".trimmingCharacters(in: .whitespaces)
    }
}

struct CoachVerificationData: Codable {
    let status: String
    let verifiedAt: String?
}
```

---

## 🌐 Service API

### CoachDashboardAPIService

```swift
import Foundation
import Combine

class CoachDashboardAPIService {
    static let shared = CoachDashboardAPIService()
    
    private let baseURL = "https://apinest-production.up.railway.app"
    private var cancellables = Set<AnyCancellable>()
    
    private init() {}
    
    // MARK: - Earnings
    
    func getCoachEarnings(year: Int? = nil, month: Int? = nil) -> AnyPublisher<CoachEarnings, Error> {
        var urlString = "\(baseURL)/payments/coach/earnings"
        var queryItems: [URLQueryItem] = []
        
        if let year = year {
            queryItems.append(URLQueryItem(name: "year", value: "\(year)"))
        }
        
        if let month = month {
            queryItems.append(URLQueryItem(name: "month", value: "\(month)"))
        }
        
        if !queryItems.isEmpty {
            var components = URLComponents(string: urlString)
            components?.queryItems = queryItems
            urlString = components?.url?.absoluteString ?? urlString
        }
        
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
            .decode(type: CoachEarnings.self, decoder: JSONDecoder())
            .receive(on: DispatchQueue.main)
            .eraseToAnyPublisher()
    }
    
    // MARK: - Withdraw Balance
    
    func getWithdrawBalance() -> AnyPublisher<WithdrawBalance, Error> {
        guard let url = URL(string: "\(baseURL)/payments/coach/withdraw/balance") else {
            return Fail(error: URLError(.badURL))
                .eraseToAnyPublisher()
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("Bearer \(AuthManager.shared.token ?? "")", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        return URLSession.shared.dataTaskPublisher(for: request)
            .map(\.data)
            .decode(type: WithdrawBalance.self, decoder: JSONDecoder())
            .receive(on: DispatchQueue.main)
            .eraseToAnyPublisher()
    }
    
    // MARK: - Withdraw History
    
    func getWithdrawHistory(limit: Int = 50) -> AnyPublisher<WithdrawHistory, Error> {
        guard let url = URL(string: "\(baseURL)/payments/coach/withdraw/history?limit=\(limit)") else {
            return Fail(error: URLError(.badURL))
                .eraseToAnyPublisher()
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("Bearer \(AuthManager.shared.token ?? "")", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        return URLSession.shared.dataTaskPublisher(for: request)
            .map(\.data)
            .decode(type: WithdrawHistory.self, decoder: JSONDecoder())
            .receive(on: DispatchQueue.main)
            .eraseToAnyPublisher()
    }
    
    // MARK: - Create Withdraw
    
    func createWithdraw(request: CreateWithdrawRequest) -> AnyPublisher<CreateWithdrawResponse, Error> {
        guard let url = URL(string: "\(baseURL)/payments/coach/withdraw") else {
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
            .decode(type: CreateWithdrawResponse.self, decoder: JSONDecoder())
            .receive(on: DispatchQueue.main)
            .eraseToAnyPublisher()
    }
    
    // MARK: - Reviews
    
    func getCoachReviews(limit: Int = 50) -> AnyPublisher<CoachReviews, Error> {
        guard let url = URL(string: "\(baseURL)/reviews/coach?limit=\(limit)") else {
            return Fail(error: URLError(.badURL))
                .eraseToAnyPublisher()
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("Bearer \(AuthManager.shared.token ?? "")", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        return URLSession.shared.dataTaskPublisher(for: request)
            .map(\.data)
            .decode(type: CoachReviews.self, decoder: JSONDecoder())
            .receive(on: DispatchQueue.main)
            .eraseToAnyPublisher()
    }
    
    // MARK: - Profile
    
    func getCoachProfile() -> AnyPublisher<CoachProfile, Error> {
        guard let url = URL(string: "\(baseURL)/users/profile") else {
            return Fail(error: URLError(.badURL))
                .eraseToAnyPublisher()
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("Bearer \(AuthManager.shared.token ?? "")", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        return URLSession.shared.dataTaskPublisher(for: request)
            .map(\.data)
            .decode(type: CoachProfile.self, decoder: JSONDecoder())
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

### CoachDashboardViewModel

```swift
import Foundation
import Combine
import SwiftUI

@MainActor
class CoachDashboardViewModel: ObservableObject {
    @Published var earnings: CoachEarnings?
    @Published var withdrawBalance: WithdrawBalance?
    @Published var withdrawHistory: WithdrawHistory?
    @Published var reviews: CoachReviews?
    @Published var profile: CoachProfile?
    
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var selectedPeriod: PeriodFilter = .allTime
    
    private let apiService = CoachDashboardAPIService.shared
    private var cancellables = Set<AnyCancellable>()
    
    enum PeriodFilter: String, CaseIterable {
        case allTime = "All Time"
        case thisMonth = "This Month"
        case lastMonth = "Last Month"
        case thisYear = "This Year"
        
        var year: Int? {
            switch self {
            case .allTime: return nil
            case .thisMonth, .lastMonth, .thisYear:
                return Calendar.current.component(.year, from: Date())
            }
        }
        
        var month: Int? {
            switch self {
            case .allTime, .thisYear: return nil
            case .thisMonth:
                return Calendar.current.component(.month, from: Date())
            case .lastMonth:
                return Calendar.current.component(.month, from: Date()) - 1
            }
        }
    }
    
    init() {
        loadDashboardData()
    }
    
    func loadDashboardData() {
        isLoading = true
        errorMessage = nil
        
        // Charger toutes les données en parallèle
        let earningsPublisher = apiService.getCoachEarnings(
            year: selectedPeriod.year,
            month: selectedPeriod.month
        )
        
        let balancePublisher = apiService.getWithdrawBalance()
        let historyPublisher = apiService.getWithdrawHistory()
        let reviewsPublisher = apiService.getCoachReviews()
        let profilePublisher = apiService.getCoachProfile()
        
        Publishers.Zip5(
            earningsPublisher,
            balancePublisher,
            historyPublisher,
            reviewsPublisher,
            profilePublisher
        )
        .sink(
            receiveCompletion: { [weak self] completion in
                self?.isLoading = false
                if case .failure(let error) = completion {
                    self?.errorMessage = error.localizedDescription
                }
            },
            receiveValue: { [weak self] earnings, balance, history, reviews, profile in
                self?.earnings = earnings
                self?.withdrawBalance = balance
                self?.withdrawHistory = history
                self?.reviews = reviews
                self?.profile = profile
                self?.isLoading = false
            }
        )
        .store(in: &cancellables)
    }
    
    func refreshEarnings() {
        apiService.getCoachEarnings(
            year: selectedPeriod.year,
            month: selectedPeriod.month
        )
        .sink(
            receiveCompletion: { [weak self] completion in
                if case .failure(let error) = completion {
                    self?.errorMessage = error.localizedDescription
                }
            },
            receiveValue: { [weak self] earnings in
                self?.earnings = earnings
            }
        )
        .store(in: &cancellables)
    }
    
    func requestWithdraw(amount: Double, bankAccount: String?) {
        isLoading = true
        errorMessage = nil
        
        let request = CreateWithdrawRequest(
            amount: amount,
            bankAccount: bankAccount,
            paymentMethod: "bank_transfer",
            currency: "usd",
            description: nil
        )
        
        apiService.createWithdraw(request: request)
            .sink(
                receiveCompletion: { [weak self] completion in
                    self?.isLoading = false
                    if case .failure(let error) = completion {
                        self?.errorMessage = error.localizedDescription
                    }
                },
                receiveValue: { [weak self] response in
                    if response.success {
                        // Recharger l'historique et le solde
                        self?.loadDashboardData()
                    } else {
                        self?.errorMessage = response.message
                    }
                }
            )
            .store(in: &cancellables)
    }
}
```

---

## 🖼️ Vues UI

### CoachDashboardView

```swift
import SwiftUI

struct CoachDashboardView: View {
    @StateObject private var viewModel = CoachDashboardViewModel()
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 20) {
                    // Header avec profil
                    if let profile = viewModel.profile {
                        CoachProfileHeader(profile: profile)
                    }
                    
                    // Statistiques principales
                    StatsOverviewView(
                        earnings: viewModel.earnings,
                        balance: viewModel.withdrawBalance,
                        reviews: viewModel.reviews
                    )
                    
                    // Filtre de période
                    PeriodFilterView(selectedPeriod: $viewModel.selectedPeriod) {
                        viewModel.refreshEarnings()
                    }
                    
                    // Graphique des revenus
                    if let earnings = viewModel.earnings {
                        EarningsChartView(earnings: earnings)
                    }
                    
                    // Section Retraits
                    WithdrawSectionView(
                        balance: viewModel.withdrawBalance,
                        history: viewModel.withdrawHistory,
                        onWithdraw: { amount, bankAccount in
                            viewModel.requestWithdraw(amount: amount, bankAccount: bankAccount)
                        }
                    )
                    
                    // Section Reviews
                    if let reviews = viewModel.reviews {
                        ReviewsSectionView(reviews: reviews)
                    }
                }
                .padding()
            }
            .navigationTitle("Coach Dashboard")
            .refreshable {
                viewModel.loadDashboardData()
            }
            .overlay {
                if viewModel.isLoading {
                    ProgressView()
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                        .background(Color.black.opacity(0.3))
                }
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

### CoachProfileHeader

```swift
import SwiftUI

struct CoachProfileHeader: View {
    let profile: CoachProfile
    
    var body: some View {
        HStack(spacing: 16) {
            // Avatar
            AsyncImage(url: URL(string: profile.avatar ?? "")) { image in
                image
                    .resizable()
                    .aspectRatio(contentMode: .fill)
            } placeholder: {
                Image(systemName: "person.circle.fill")
                    .resizable()
                    .foregroundColor(.gray)
            }
            .frame(width: 60, height: 60)
            .clipShape(Circle())
            
            VStack(alignment: .leading, spacing: 4) {
                Text(profile.fullName.isEmpty ? "Coach" : profile.fullName)
                    .font(.title2)
                    .fontWeight(.bold)
                
                if let location = profile.location {
                    Label(location, systemImage: "location.fill")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                if profile.isCoachVerified {
                    HStack(spacing: 4) {
                        Image(systemName: "checkmark.seal.fill")
                            .foregroundColor(.blue)
                        Text("Verified Coach")
                            .font(.caption)
                            .foregroundColor(.blue)
                    }
                }
            }
            
            Spacer()
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }
}
```

### StatsOverviewView

```swift
import SwiftUI

struct StatsOverviewView: View {
    let earnings: CoachEarnings?
    let balance: WithdrawBalance?
    let reviews: CoachReviews?
    
    var body: some View {
        HStack(spacing: 12) {
            // Total Earnings
            StatCard(
                title: "Total Earnings",
                value: formatCurrency(earnings?.totalEarnings ?? 0),
                icon: "dollarsign.circle.fill",
                color: .green
            )
            
            // Available Balance
            StatCard(
                title: "Available",
                value: formatCurrency(balance?.availableBalance ?? 0),
                icon: "wallet.pass.fill",
                color: .blue
            )
            
            // Average Rating
            StatCard(
                title: "Rating",
                value: String(format: "%.1f", reviews?.averageRating ?? 0),
                icon: "star.fill",
                color: .orange
            )
        }
    }
    
    private func formatCurrency(_ amount: Double) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = "USD"
        return formatter.string(from: NSNumber(value: amount)) ?? "$0.00"
    }
}

struct StatCard: View {
    let title: String
    let value: String
    let icon: String
    let color: Color
    
    var body: some View {
        VStack(spacing: 8) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundColor(color)
            
            Text(value)
                .font(.headline)
                .fontWeight(.bold)
            
            Text(title)
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }
}
```

### PeriodFilterView

```swift
import SwiftUI

struct PeriodFilterView: View {
    @Binding var selectedPeriod: CoachDashboardViewModel.PeriodFilter
    let onPeriodChange: () -> Void
    
    var body: some View {
        Picker("Period", selection: $selectedPeriod) {
            ForEach(CoachDashboardViewModel.PeriodFilter.allCases, id: \.self) { period in
                Text(period.rawValue).tag(period)
            }
        }
        .pickerStyle(.segmented)
        .onChange(of: selectedPeriod) { _ in
            onPeriodChange()
        }
    }
}
```

### EarningsChartView

```swift
import SwiftUI
import Charts

struct EarningsChartView: View {
    let earnings: CoachEarnings
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Earnings Overview")
                .font(.headline)
                .padding(.horizontal)
            
            if #available(iOS 16.0, *) {
                Chart {
                    ForEach(earnings.earnings, id: \.activityId) { earning in
                        BarMark(
                            x: .value("Date", earning.date),
                            y: .value("Amount", earning.amount)
                        )
                        .foregroundStyle(.green.gradient)
                    }
                }
                .frame(height: 200)
                .padding()
            } else {
                // Fallback pour iOS < 16
                EarningsBarChart(earnings: earnings.earnings)
                    .frame(height: 200)
                    .padding()
            }
        }
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }
}

// Fallback pour iOS < 16
struct EarningsBarChart: View {
    let earnings: [EarningItem]
    
    var body: some View {
        GeometryReader { geometry in
            let maxAmount = earnings.map { $0.amount }.max() ?? 1
            let barWidth = geometry.size.width / CGFloat(max(earnings.count, 1))
            
            HStack(alignment: .bottom, spacing: 4) {
                ForEach(earnings, id: \.activityId) { earning in
                    Rectangle()
                        .fill(Color.green)
                        .frame(
                            width: barWidth - 4,
                            height: geometry.size.height * CGFloat(earning.amount / maxAmount)
                        )
                }
            }
        }
    }
}
```

### WithdrawSectionView

```swift
import SwiftUI

struct WithdrawSectionView: View {
    let balance: WithdrawBalance?
    let history: WithdrawHistory?
    let onWithdraw: (Double, String?) -> Void
    
    @State private var showWithdrawSheet = false
    @State private var withdrawAmount: String = ""
    @State private var bankAccount: String = ""
    
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                Text("Withdrawals")
                    .font(.headline)
                Spacer()
                Button(action: { showWithdrawSheet = true }) {
                    Label("Withdraw", systemImage: "arrow.down.circle.fill")
                        .font(.subheadline)
                        .foregroundColor(.blue)
                }
            }
            .padding(.horizontal)
            
            // Available Balance Card
            if let balance = balance {
                HStack {
                    VStack(alignment: .leading) {
                        Text("Available Balance")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        Text(formatCurrency(balance.availableBalance))
                            .font(.title2)
                            .fontWeight(.bold)
                    }
                    Spacer()
                }
                .padding()
                .background(Color.blue.opacity(0.1))
                .cornerRadius(12)
                .padding(.horizontal)
            }
            
            // Withdraw History
            if let history = history, !history.withdraws.isEmpty {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Recent Withdrawals")
                        .font(.subheadline)
                        .fontWeight(.semibold)
                        .padding(.horizontal)
                    
                    ForEach(history.withdraws.prefix(5)) { withdraw in
                        WithdrawRowView(withdraw: withdraw)
                    }
                }
            }
        }
        .sheet(isPresented: $showWithdrawSheet) {
            WithdrawRequestView(
                availableBalance: balance?.availableBalance ?? 0,
                onWithdraw: { amount, bankAccount in
                    onWithdraw(amount, bankAccount)
                    showWithdrawSheet = false
                }
            )
        }
    }
    
    private func formatCurrency(_ amount: Double) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = "USD"
        return formatter.string(from: NSNumber(value: amount)) ?? "$0.00"
    }
}

struct WithdrawRowView: View {
    let withdraw: WithdrawItem
    
    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text(withdraw.withdrawId)
                    .font(.subheadline)
                    .fontWeight(.semibold)
                
                Text(formatCurrency(withdraw.amount))
                    .font(.headline)
                
                if let date = withdraw.createdAtDate {
                    Text(date, style: .date)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            
            Spacer()
            
            // Status Badge
            Text(withdraw.status.rawValue.capitalized)
                .font(.caption)
                .fontWeight(.semibold)
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(Color(withdraw.statusColor).opacity(0.2))
                .foregroundColor(Color(withdraw.statusColor))
                .cornerRadius(8)
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(12)
        .padding(.horizontal)
    }
    
    private func formatCurrency(_ amount: Double) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = "USD"
        return formatter.string(from: NSNumber(value: amount)) ?? "$0.00"
    }
}

struct WithdrawRequestView: View {
    let availableBalance: Double
    let onWithdraw: (Double, String?) -> Void
    
    @State private var amount: String = ""
    @State private var bankAccount: String = ""
    @Environment(\.dismiss) var dismiss
    
    private var isValidAmount: Bool {
        guard let amountValue = Double(amount) else { return false }
        return amountValue > 0 && amountValue <= availableBalance && amountValue >= 10.0
    }
    
    var body: some View {
        NavigationView {
            Form {
                Section {
                    Text("Available: \(formatCurrency(availableBalance))")
                        .foregroundColor(.secondary)
                }
                
                Section("Withdrawal Amount") {
                    TextField("Amount (min $10)", text: $amount)
                        .keyboardType(.decimalPad)
                    
                    if !amount.isEmpty, let amountValue = Double(amount) {
                        if amountValue < 10.0 {
                            Text("Minimum withdrawal is $10.00")
                                .font(.caption)
                                .foregroundColor(.red)
                        } else if amountValue > availableBalance {
                            Text("Amount exceeds available balance")
                                .font(.caption)
                                .foregroundColor(.red)
                        }
                    }
                }
                
                Section("Bank Account (Optional)") {
                    TextField("Bank account number", text: $bankAccount)
                }
                
                Section {
                    Button(action: {
                        if let amountValue = Double(amount), isValidAmount {
                            onWithdraw(amountValue, bankAccount.isEmpty ? nil : bankAccount)
                        }
                    }) {
                        Text("Request Withdrawal")
                            .frame(maxWidth: .infinity)
                    }
                    .disabled(!isValidAmount)
                }
            }
            .navigationTitle("Request Withdrawal")
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
    
    private func formatCurrency(_ amount: Double) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = "USD"
        return formatter.string(from: NSNumber(value: amount)) ?? "$0.00"
    }
}
```

### ReviewsSectionView

```swift
import SwiftUI

struct ReviewsSectionView: View {
    let reviews: CoachReviews
    
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                Text("Reviews")
                    .font(.headline)
                Spacer()
                NavigationLink(destination: AllReviewsView(reviews: reviews)) {
                    Text("See All")
                        .font(.subheadline)
                        .foregroundColor(.blue)
                }
            }
            .padding(.horizontal)
            
            // Rating Summary
            HStack(spacing: 20) {
                VStack {
                    Text(String(format: "%.1f", reviews.averageRating))
                        .font(.largeTitle)
                        .fontWeight(.bold)
                    HStack(spacing: 4) {
                        ForEach(1...5, id: \.self) { star in
                            Image(systemName: star <= Int(reviews.averageRating) ? "star.fill" : "star")
                                .foregroundColor(.orange)
                                .font(.caption)
                        }
                    }
                }
                
                VStack(alignment: .leading, spacing: 4) {
                    Text("\(reviews.totalReviews) reviews")
                        .font(.headline)
                    Text("Based on \(reviews.reviews.count) activities")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            .padding()
            .background(Color(.systemGray6))
            .cornerRadius(12)
            .padding(.horizontal)
            
            // Recent Reviews
            ForEach(reviews.reviews.prefix(3)) { review in
                ReviewRowView(review: review)
            }
        }
    }
}

struct ReviewRowView: View {
    let review: ReviewItem
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                // User Avatar
                AsyncImage(url: URL(string: review.userAvatar ?? "")) { image in
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                } placeholder: {
                    Image(systemName: "person.circle.fill")
                        .resizable()
                        .foregroundColor(.gray)
                }
                .frame(width: 40, height: 40)
                .clipShape(Circle())
                
                VStack(alignment: .leading, spacing: 2) {
                    Text(review.userName)
                        .font(.subheadline)
                        .fontWeight(.semibold)
                    
                    HStack(spacing: 4) {
                        ForEach(1...5, id: \.self) { star in
                            Image(systemName: star <= review.rating ? "star.fill" : "star")
                                .foregroundColor(.orange)
                                .font(.caption2)
                        }
                    }
                }
                
                Spacer()
                
                Text(review.formattedDate)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            Text(review.comment)
                .font(.subheadline)
                .foregroundColor(.primary)
            
            Text(review.activityTitle)
                .font(.caption)
                .foregroundColor(.blue)
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(12)
        .padding(.horizontal)
    }
}

struct AllReviewsView: View {
    let reviews: CoachReviews
    
    var body: some View {
        List {
            ForEach(reviews.reviews) { review in
                ReviewRowView(review: review)
                    .listRowInsets(EdgeInsets())
                    .listRowSeparator(.hidden)
            }
        }
        .navigationTitle("All Reviews")
        .navigationBarTitleDisplayMode(.large)
    }
}
```

---

## 🔄 Gestion des Erreurs

### Error Handling Extension

```swift
import Foundation

extension CoachDashboardAPIService {
    func handleError(_ error: Error) -> String {
        if let urlError = error as? URLError {
            switch urlError.code {
            case .notConnectedToInternet:
                return "No internet connection"
            case .timedOut:
                return "Request timed out"
            default:
                return "Network error: \(urlError.localizedDescription)"
            }
        } else if let decodingError = error as? DecodingError {
            return "Failed to decode response: \(decodingError.localizedDescription)"
        } else {
            return error.localizedDescription
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
                
                CoachDashboardView()
                    .tabItem {
                        Label("Dashboard", systemImage: "chart.bar.fill")
                    }
                    .badge(/* notifications count */)
            }
        }
    }
}
```

---

## ✅ Checklist d'Implémentation

- [ ] Créer les modèles Swift (Earnings, Withdraw, Reviews, Profile)
- [ ] Implémenter `CoachDashboardAPIService`
- [ ] Créer `CoachDashboardViewModel`
- [ ] Implémenter `CoachDashboardView`
- [ ] Créer les composants UI (ProfileHeader, StatsOverview, etc.)
- [ ] Ajouter la gestion des erreurs
- [ ] Tester tous les endpoints
- [ ] Ajouter le refresh pull-to-refresh
- [ ] Implémenter la validation des formulaires
- [ ] Ajouter les animations de chargement
- [ ] Tester sur différents appareils iOS

---

## 🚀 Utilisation

1. **Initialiser le ViewModel** dans votre vue :
```swift
@StateObject private var viewModel = CoachDashboardViewModel()
```

2. **Afficher le dashboard** :
```swift
CoachDashboardView()
```

3. **Gérer les retraits** :
```swift
viewModel.requestWithdraw(amount: 350.0, bankAccount: "FR76...")
```

4. **Filtrer par période** :
```swift
viewModel.selectedPeriod = .thisMonth
viewModel.refreshEarnings()
```

---

## 📝 Notes Importantes

1. **Authentification** : Tous les endpoints nécessitent un token JWT valide
2. **Minimum Withdrawal** : Le montant minimum de retrait est de $10.00
3. **Currency** : Tous les montants sont en USD
4. **Date Format** : Les dates utilisent le format ISO8601
5. **Error Handling** : Toujours gérer les erreurs réseau et de décodage
6. **Loading States** : Afficher des indicateurs de chargement pendant les requêtes
7. **Refresh** : Implémenter pull-to-refresh pour mettre à jour les données

---

## 🔗 URLs des Endpoints

- **Earnings** : `GET /payments/coach/earnings?year=2025&month=11`
- **Balance** : `GET /payments/coach/withdraw/balance`
- **History** : `GET /payments/coach/withdraw/history?limit=50`
- **Withdraw** : `POST /payments/coach/withdraw`
- **Reviews** : `GET /reviews/coach?limit=50`
- **Profile** : `GET /users/profile`

---

Ce guide fournit une implémentation complète du Coach Dashboard pour iOS Swift. Tous les endpoints, modèles, services et vues sont détaillés avec des exemples de code prêts à l'emploi.




# ✅ Solution Complète - Strava OAuth Callback

## 🎯 Problème Identifié

D'après l'image, il manque :
1. ❌ Un endpoint backend pour recevoir le `code` depuis l'app iOS et l'échanger contre un token
2. ❌ Un handler iOS pour gérer le deep link `nexofitness://strava/callback?code=...`

**Ce qui existe déjà :**
- ✅ Endpoint `GET /strava/callback` qui redirige vers l'app avec le code
- ✅ Démarrage de l'OAuth depuis le header button

---

## 📋 Solution Complète

### Partie 1 : Backend - Endpoint POST pour échanger le code

#### 1.1. Ajouter les champs Strava au schéma User

**Fichier : `src/modules/users/schemas/user.schema.ts`**

Ajoutez ces champs dans la classe `User` (après la ligne 104) :

```typescript
  // Strava Integration Fields
  @Prop()
  stravaAccessToken?: string;

  @Prop()
  stravaRefreshToken?: string;

  @Prop()
  stravaTokenExpiresAt?: Date;

  @Prop()
  stravaAthleteId?: string;
```

#### 1.2. Créer le DTO pour la requête

**Fichier : `src/modules/strava/dto/oauth-callback.dto.ts`** (NOUVEAU)

```typescript
import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class StravaOAuthCallbackDto {
  @ApiProperty({
    example: 'abc123def456',
    description: 'Authorization code from Strava OAuth',
  })
  @IsString()
  @IsNotEmpty()
  code: string;
}
```

#### 1.3. Créer le service Strava

**Fichier : `src/modules/strava/strava.service.ts`** (NOUVEAU)

```typescript
import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import axios from 'axios';
import { User, UserDocument } from '../users/schemas/user.schema';

@Injectable()
export class StravaService {
  private readonly logger = new Logger(StravaService.name);
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;

  constructor(
    private configService: ConfigService,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {
    this.clientId = this.configService.get<string>('STRAVA_CLIENT_ID') || '';
    this.clientSecret = this.configService.get<string>('STRAVA_CLIENT_SECRET') || '';
    this.redirectUri = this.configService.get<string>('STRAVA_REDIRECT_URI') || 
      'https://apinest-production.up.railway.app/strava/callback';

    if (!this.clientId || !this.clientSecret) {
      this.logger.warn('⚠️ Strava credentials not configured');
    } else {
      this.logger.log('✅ Strava service initialized');
    }
  }

  /**
   * Échange le code d'autorisation contre un access token
   */
  async exchangeCodeForToken(code: string, userId: string): Promise<{
    success: boolean;
    message: string;
    athleteId?: string;
  }> {
    if (!this.clientId || !this.clientSecret) {
      throw new BadRequestException('Strava credentials not configured');
    }

    try {
      this.logger.log(`[Strava] Exchanging code for token for user ${userId}`);

      // Échanger le code contre un token
      const response = await axios.post('https://www.strava.com/oauth/token', {
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code: code,
        grant_type: 'authorization_code',
      });

      const {
        access_token,
        refresh_token,
        expires_at,
        athlete,
      } = response.data;

      if (!access_token) {
        throw new BadRequestException('No access token received from Strava');
      }

      // Calculer la date d'expiration
      const expiresAt = expires_at ? new Date(expires_at * 1000) : null;

      // Sauvegarder les tokens dans la base de données
      await this.userModel.findByIdAndUpdate(userId, {
        stravaAccessToken: access_token,
        stravaRefreshToken: refresh_token,
        stravaTokenExpiresAt: expiresAt,
        stravaAthleteId: athlete?.id?.toString(),
      });

      this.logger.log(`[Strava] Tokens saved for user ${userId}`);

      return {
        success: true,
        message: 'Strava account connected successfully',
        athleteId: athlete?.id?.toString(),
      };
    } catch (error: any) {
      this.logger.error(`[Strava] Error exchanging code: ${error.message}`);
      
      if (error.response?.data) {
        throw new BadRequestException(
          `Strava error: ${JSON.stringify(error.response.data)}`
        );
      }
      
      throw new BadRequestException(
        `Failed to connect Strava account: ${error.message}`
      );
    }
  }

  /**
   * Rafraîchir le token d'accès Strava
   */
  async refreshAccessToken(userId: string): Promise<string | null> {
    const user = await this.userModel.findById(userId).exec();
    
    if (!user || !user.stravaRefreshToken) {
      return null;
    }

    try {
      const response = await axios.post('https://www.strava.com/oauth/token', {
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: user.stravaRefreshToken,
        grant_type: 'refresh_token',
      });

      const { access_token, refresh_token, expires_at } = response.data;

      // Mettre à jour les tokens
      await this.userModel.findByIdAndUpdate(userId, {
        stravaAccessToken: access_token,
        stravaRefreshToken: refresh_token || user.stravaRefreshToken,
        stravaTokenExpiresAt: expires_at ? new Date(expires_at * 1000) : null,
      });

      return access_token;
    } catch (error: any) {
      this.logger.error(`[Strava] Error refreshing token: ${error.message}`);
      return null;
    }
  }

  /**
   * Obtenir le token d'accès valide (rafraîchir si nécessaire)
   */
  async getValidAccessToken(userId: string): Promise<string | null> {
    const user = await this.userModel.findById(userId).exec();
    
    if (!user || !user.stravaAccessToken) {
      return null;
    }

    // Vérifier si le token est expiré (avec une marge de 5 minutes)
    const now = new Date();
    const expiresAt = user.stravaTokenExpiresAt;
    
    if (expiresAt && expiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
      // Token expiré ou sur le point d'expirer, rafraîchir
      this.logger.log(`[Strava] Token expired for user ${userId}, refreshing...`);
      return await this.refreshAccessToken(userId);
    }

    return user.stravaAccessToken;
  }
}
```

#### 1.4. Mettre à jour le contrôleur Strava

**Fichier : `src/modules/strava/strava.controller.ts`**

Ajoutez l'endpoint POST après l'endpoint GET existant :

```typescript
import { Controller, Get, Post, Body, Query, Redirect, Logger, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { StravaService } from './strava.service';
import { StravaOAuthCallbackDto } from './dto/oauth-callback.dto';

@ApiTags('strava')
@Controller()
export class StravaController {
  private readonly logger = new Logger(StravaController.name);

  constructor(private readonly stravaService: StravaService) {}

  // ... (l'endpoint GET existant reste inchangé) ...

  /**
   * POST /strava/oauth/callback
   * Échange le code d'autorisation contre un access token
   */
  @Post('strava/oauth/callback')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Exchange Strava OAuth code for access token',
    description: 'Exchanges the authorization code received from Strava OAuth callback for an access token and stores it in the user profile',
  })
  @ApiResponse({
    status: 200,
    description: 'Strava account connected successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Strava account connected successfully' },
        athleteId: { type: 'string', example: '12345678' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid code or Strava error' })
  @ApiResponse({ status: 401, description: 'Unauthorized - JWT token required' })
  async stravaOAuthCallback(
    @Request() req,
    @Body() dto: StravaOAuthCallbackDto,
  ) {
    const userId = req.user.sub || req.user._id?.toString();
    
    this.logger.log(`[Strava] OAuth callback received for user ${userId}`);

    return await this.stravaService.exchangeCodeForToken(dto.code, userId);
  }
}
```

#### 1.5. Mettre à jour le module Strava

**Fichier : `src/modules/strava/strava.module.ts`**

```typescript
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { StravaController } from './strava.controller';
import { StravaService } from './strava.service';
import { User, UserSchema } from '../users/schemas/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
  controllers: [StravaController],
  providers: [StravaService],
  exports: [StravaService],
})
export class StravaModule {}
```

#### 1.6. Variables d'environnement nécessaires

Ajoutez ces variables dans votre `.env` et sur Railway :

```env
STRAVA_CLIENT_ID=votre_client_id
STRAVA_CLIENT_SECRET=votre_client_secret
STRAVA_REDIRECT_URI=https://apinest-production.up.railway.app/strava/callback
```

---

### Partie 2 : iOS - Handler pour le Deep Link

#### 2.1. Créer le handler de deep link

**Fichier : `StravaOAuthHandler.swift`** (NOUVEAU)

```swift
import Foundation
import UIKit

class StravaOAuthHandler {
    static let shared = StravaOAuthHandler()
    
    private let baseURL = "https://apinest-production.up.railway.app"
    private var currentCompletion: ((Result<StravaConnectionResult, Error>) -> Void)?
    
    private init() {}
    
    // MARK: - Handle Deep Link
    
    func handleDeepLink(url: URL) -> Bool {
        guard url.scheme == "nexofitness" else {
            return false
        }
        
        guard url.host == "strava" && url.path == "/callback" else {
            return false
        }
        
        // Extraire les paramètres de l'URL
        guard let components = URLComponents(url: url, resolvingAgainstBaseURL: true),
              let queryItems = components.queryItems else {
            return false
        }
        
        // Vérifier s'il y a une erreur
        if let error = queryItems.first(where: { $0.name == "error" })?.value {
            let errorDescription = queryItems.first(where: { $0.name == "error_description" })?.value
            let stravaError = StravaOAuthError(
                code: error,
                description: errorDescription
            )
            currentCompletion?(.failure(stravaError))
            currentCompletion = nil
            return true
        }
        
        // Récupérer le code
        guard let code = queryItems.first(where: { $0.name == "code" })?.value else {
            let error = StravaOAuthError(
                code: "missing_code",
                description: "No authorization code received from Strava"
            )
            currentCompletion?(.failure(error))
            currentCompletion = nil
            return true
        }
        
        // Échanger le code contre un token
        exchangeCodeForToken(code: code)
        
        return true
    }
    
    // MARK: - Exchange Code for Token
    
    func exchangeCodeForToken(
        code: String,
        completion: @escaping (Result<StravaConnectionResult, Error>) -> Void
    ) {
        currentCompletion = completion
        exchangeCodeForToken(code: code)
    }
    
    private func exchangeCodeForToken(code: String) {
        guard let url = URL(string: "\(baseURL)/strava/oauth/callback") else {
            let error = StravaOAuthError(
                code: "invalid_url",
                description: "Invalid backend URL"
            )
            currentCompletion?(.failure(error))
            currentCompletion = nil
            return
        }
        
        guard let token = AuthManager.shared.token else {
            let error = StravaOAuthError(
                code: "not_authenticated",
                description: "User not authenticated"
            )
            currentCompletion?(.failure(error))
            currentCompletion = nil
            return
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let body = ["code": code]
        
        do {
            request.httpBody = try JSONSerialization.data(withJSONObject: body)
        } catch {
            currentCompletion?(.failure(error))
            currentCompletion = nil
            return
        }
        
        URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
            guard let self = self else { return }
            
            if let error = error {
                DispatchQueue.main.async {
                    self.currentCompletion?(.failure(error))
                    self.currentCompletion = nil
                }
                return
            }
            
            guard let httpResponse = response as? HTTPURLResponse else {
                DispatchQueue.main.async {
                    let error = StravaOAuthError(
                        code: "invalid_response",
                        description: "Invalid response from server"
                    )
                    self.currentCompletion?(.failure(error))
                    self.currentCompletion = nil
                }
                return
            }
            
            guard (200...299).contains(httpResponse.statusCode) else {
                let errorMessage: String
                if let data = data,
                   let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                   let message = json["message"] as? String {
                    errorMessage = message
                } else {
                    errorMessage = "Failed to connect Strava account"
                }
                
                DispatchQueue.main.async {
                    let error = StravaOAuthError(
                        code: "server_error",
                        description: errorMessage
                    )
                    self.currentCompletion?(.failure(error))
                    self.currentCompletion = nil
                }
                return
            }
            
            guard let data = data,
                  let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                  let success = json["success"] as? Bool,
                  success else {
                DispatchQueue.main.async {
                    let error = StravaOAuthError(
                        code: "connection_failed",
                        description: "Failed to connect Strava account"
                    )
                    self.currentCompletion?(.failure(error))
                    self.currentCompletion = nil
                }
                return
            }
            
            let result = StravaConnectionResult(
                success: true,
                message: json["message"] as? String ?? "Strava account connected successfully",
                athleteId: json["athleteId"] as? String
            )
            
            DispatchQueue.main.async {
                self.currentCompletion?(.success(result))
                self.currentCompletion = nil
            }
        }.resume()
    }
}

// MARK: - Models

struct StravaConnectionResult {
    let success: Bool
    let message: String
    let athleteId: String?
}

struct StravaOAuthError: LocalizedError {
    let code: String
    let description: String
    
    var errorDescription: String? {
        return description
    }
}

// MARK: - Auth Manager (Exemple)

class AuthManager {
    static let shared = AuthManager()
    var token: String?
    private init() {}
}
```

#### 2.2. Configurer le deep link dans Info.plist

**Fichier : `Info.plist`**

Ajoutez cette configuration :

```xml
<key>CFBundleURLTypes</key>
<array>
    <dict>
        <key>CFBundleTypeRole</key>
        <string>Editor</string>
        <key>CFBundleURLName</key>
        <string>com.nexofitness.app</string>
        <key>CFBundleURLSchemes</key>
        <array>
            <string>nexofitness</string>
        </array>
    </dict>
</array>
```

#### 2.3. Configurer le SceneDelegate ou AppDelegate

**Pour SwiftUI avec SceneDelegate :**

```swift
import SwiftUI
import UIKit

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?
    
    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        guard let url = URLContexts.first?.url else { return }
        
        // Gérer le deep link Strava
        if StravaOAuthHandler.shared.handleDeepLink(url: url) {
            return
        }
        
        // Autres handlers de deep link...
    }
}
```

**Pour SwiftUI sans SceneDelegate (iOS 14+) :**

Dans votre `App` struct :

```swift
import SwiftUI

@main
struct FitnessApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) var appDelegate
    
    var body: some Scene {
        WindowGroup {
            ContentView()
                .onOpenURL { url in
                    _ = StravaOAuthHandler.shared.handleDeepLink(url: url)
                }
        }
    }
}

class AppDelegate: NSObject, UIApplicationDelegate {
    func application(
        _ application: UIApplication,
        open url: URL,
        options: [UIApplication.OpenURLOptionsKey : Any] = [:]
    ) -> Bool {
        return StravaOAuthHandler.shared.handleDeepLink(url: url)
    }
}
```

#### 2.4. Utilisation dans une vue

```swift
import SwiftUI

struct StravaConnectView: View {
    @State private var isConnecting = false
    @State private var showError = false
    @State private var errorMessage = ""
    @State private var showSuccess = false
    
    var body: some View {
        VStack {
            Button(action: {
                startStravaOAuth()
            }) {
                HStack {
                    if isConnecting {
                        ProgressView()
                            .progressViewStyle(CircularProgressViewStyle(tint: .white))
                    }
                    Text(isConnecting ? "Connecting..." : "Connect Strava")
                        .fontWeight(.semibold)
                }
                .frame(maxWidth: .infinity)
                .padding()
                .background(Color.orange)
                .foregroundColor(.white)
                .cornerRadius(10)
            }
            .disabled(isConnecting)
        }
        .alert("Error", isPresented: $showError) {
            Button("OK", role: .cancel) { }
        } message: {
            Text(errorMessage)
        }
        .alert("Success", isPresented: $showSuccess) {
            Button("OK", role: .cancel) { }
        } message: {
            Text("Strava account connected successfully!")
        }
        .onAppear {
            setupStravaCallback()
        }
    }
    
    private func startStravaOAuth() {
        // L'URL d'autorisation Strava (vous devez configurer cela selon votre app)
        let clientId = "YOUR_STRAVA_CLIENT_ID"
        let redirectUri = "https://apinest-production.up.railway.app/strava/callback"
        let scope = "read,activity:read"
        
        let authURL = "https://www.strava.com/oauth/authorize?client_id=\(clientId)&redirect_uri=\(redirectUri)&response_type=code&scope=\(scope)&approval_prompt=auto"
        
        if let url = URL(string: authURL) {
            isConnecting = true
            UIApplication.shared.open(url)
        }
    }
    
    private func setupStravaCallback() {
        // Écouter les notifications pour le callback (optionnel, si vous utilisez des notifications)
        NotificationCenter.default.addObserver(
            forName: NSNotification.Name("StravaOAuthCallback"),
            object: nil,
            queue: .main
        ) { notification in
            if let result = notification.object as? Result<StravaConnectionResult, Error> {
                handleStravaCallback(result: result)
            }
        }
    }
    
    private func handleStravaCallback(result: Result<StravaConnectionResult, Error>) {
        isConnecting = false
        
        switch result {
        case .success(let connectionResult):
            showSuccess = true
            print("Strava connected: \(connectionResult.message)")
            if let athleteId = connectionResult.athleteId {
                print("Athlete ID: \(athleteId)")
            }
            
        case .failure(let error):
            errorMessage = error.localizedDescription
            showError = true
        }
    }
}
```

#### 2.5. Alternative avec Combine (plus moderne)

```swift
import SwiftUI
import Combine

class StravaOAuthViewModel: ObservableObject {
    @Published var isConnecting = false
    @Published var errorMessage: String?
    @Published var showError = false
    @Published var showSuccess = false
    
    private var cancellables = Set<AnyCancellable>()
    
    func startOAuth() {
        isConnecting = true
        errorMessage = nil
        
        // URL d'autorisation Strava
        let clientId = "YOUR_STRAVA_CLIENT_ID"
        let redirectUri = "https://apinest-production.up.railway.app/strava/callback"
        let scope = "read,activity:read"
        
        let authURL = "https://www.strava.com/oauth/authorize?client_id=\(clientId)&redirect_uri=\(redirectUri)&response_type=code&scope=\(scope)&approval_prompt=auto"
        
        if let url = URL(string: authURL) {
            UIApplication.shared.open(url)
        }
    }
    
    func handleCallback(url: URL) {
        StravaOAuthHandler.shared.exchangeCodeForToken(code: extractCode(from: url)) { [weak self] result in
            DispatchQueue.main.async {
                self?.isConnecting = false
                
                switch result {
                case .success:
                    self?.showSuccess = true
                case .failure(let error):
                    self?.errorMessage = error.localizedDescription
                    self?.showError = true
                }
            }
        }
    }
    
    private func extractCode(from url: URL) -> String {
        guard let components = URLComponents(url: url, resolvingAgainstBaseURL: true),
              let queryItems = components.queryItems,
              let code = queryItems.first(where: { $0.name == "code" })?.value else {
            return ""
        }
        return code
    }
}
```

---

## 🔗 Résumé de l'Endpoint Backend

**URL :** `POST /strava/oauth/callback`

**Headers :**
```
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
```

**Body :**
```json
{
  "code": "abc123def456"
}
```

**Réponse (200 OK) :**
```json
{
  "success": true,
  "message": "Strava account connected successfully",
  "athleteId": "12345678"
}
```

**Réponse d'erreur (400 Bad Request) :**
```json
{
  "statusCode": 400,
  "message": "Strava error: ...",
  "error": "Bad Request"
}
```

---

## ✅ Checklist d'Implémentation

### Backend :
- [ ] Ajouter les champs Strava au schéma User
- [ ] Créer le DTO `StravaOAuthCallbackDto`
- [ ] Créer le service `StravaService`
- [ ] Ajouter l'endpoint POST dans `StravaController`
- [ ] Mettre à jour `StravaModule`
- [ ] Ajouter les variables d'environnement Strava

### iOS :
- [ ] Créer `StravaOAuthHandler.swift`
- [ ] Configurer le deep link dans `Info.plist`
- [ ] Configurer le handler dans `SceneDelegate` ou `AppDelegate`
- [ ] Tester le flux complet

---

## 🚀 Flow Complet

1. **L'utilisateur clique sur "Connect Strava"** dans l'app iOS
2. **L'app ouvre l'URL d'autorisation Strava** dans Safari
3. **L'utilisateur autorise l'application** sur Strava
4. **Strava redirige vers** `https://apinest-production.up.railway.app/strava/callback?code=...`
5. **Le backend redirige vers** `nexofitness://strava/callback?code=...`
6. **L'app iOS intercepte le deep link**
7. **L'app appelle** `POST /strava/oauth/callback` avec le code
8. **Le backend échange le code contre un token** et le sauvegarde
9. **L'app affiche un message de succès**

---

Cette solution complète le flux OAuth Strava sans modifier le code existant, en ajoutant uniquement ce qui manque.




# Guide de Test - Fitness API

## Méthodes de Test

### 1. Test avec PowerShell (Invoke-WebRequest)

#### Test 1: Vérifier que l'API est en ligne
```powershell
Invoke-WebRequest -Uri "http://localhost:3000/health" -Method GET | Select-Object -ExpandProperty Content
```

#### Test 2: Inscription (Register)
```powershell
$body = @{
    email = "test@example.com"
    password = "password123"
    firstName = "John"
    lastName = "Doe"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:3000/auth/register" -Method POST -Body $body -ContentType "application/json" | Select-Object -ExpandProperty Content
```

#### Test 3: Connexion (Login)
```powershell
$body = @{
    email = "test@example.com"
    password = "password123"
} | ConvertTo-Json

$response = Invoke-WebRequest -Uri "http://localhost:3000/auth/login" -Method POST -Body $body -ContentType "application/json"
$token = ($response.Content | ConvertFrom-Json).access_token
Write-Host "Token: $token"
```

#### Test 4: Accéder au profil (nécessite un token)
```powershell
$headers = @{
    Authorization = "Bearer $token"
}

Invoke-WebRequest -Uri "http://localhost:3000/users/profile" -Method GET -Headers $headers | Select-Object -ExpandProperty Content
```

### 2. Test avec curl (si disponible)

#### Test Health
```bash
curl http://localhost:3000/health
```

#### Test Register
```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"test@example.com\",\"password\":\"password123\",\"firstName\":\"John\",\"lastName\":\"Doe\"}"
```

#### Test Login
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"test@example.com\",\"password\":\"password123\"}"
```

#### Test Profile (remplacez TOKEN par le token reçu)
```bash
curl -X GET http://localhost:3000/users/profile \
  -H "Authorization: Bearer TOKEN"
```

### 3. Test avec le navigateur

Ouvrez simplement dans votre navigateur :
- `http://localhost:3000/health`

### 4. Test avec Postman

1. **Téléchargez Postman** : https://www.postman.com/downloads/

2. **Créer une collection de tests** :

   - **GET** `http://localhost:3000/health`
   - **POST** `http://localhost:3000/auth/register`
     - Body (raw JSON):
     ```json
     {
       "email": "test@example.com",
       "password": "password123",
       "firstName": "John",
       "lastName": "Doe"
     }
     ```
   
   - **POST** `http://localhost:3000/auth/login`
     - Body (raw JSON):
     ```json
     {
       "email": "test@example.com",
       "password": "password123"
     }
     ```
   
   - **GET** `http://localhost:3000/users/profile`
     - Headers:
       ```
       Authorization: Bearer YOUR_TOKEN_HERE
       ```

## Endpoints Disponibles

| Méthode | Endpoint | Description | Authentification |
|---------|----------|-------------|------------------|
| GET | `/health` | Vérifier l'état de l'API | Non |
| POST | `/auth/register` | Créer un compte | Non |
| POST | `/auth/login` | Se connecter | Non |
| GET | `/users/profile` | Obtenir le profil | Oui (JWT) |
| GET | `/users` | Liste des utilisateurs | Oui (JWT) |
| GET | `/users/:id` | Obtenir un utilisateur | Oui (JWT) |
| PATCH | `/users/:id` | Modifier un utilisateur | Oui (JWT) |
| DELETE | `/users/:id` | Supprimer un utilisateur | Oui (JWT) |

## Notes Importantes

- Assurez-vous que MongoDB est en cours d'exécution
- Le port par défaut est 3000 (vérifiez votre fichier `.env`)
- Les tokens JWT expirent après 7 jours par défaut
- Les mots de passe sont hashés avec bcrypt


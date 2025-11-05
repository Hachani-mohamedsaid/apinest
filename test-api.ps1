# Script de test PowerShell pour Fitness API
# Usage: .\test-api.ps1

$baseUrl = "http://localhost:3000"
$email = "test@example.com"
$password = "password123"

Write-Host "=== Test de l'API Fitness ===" -ForegroundColor Cyan
Write-Host ""

# Test 1: Health Check
Write-Host "1. Test Health Check..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/health" -Method GET -ErrorAction Stop
    Write-Host "✓ Health Check OK" -ForegroundColor Green
    Write-Host "  Réponse: $($response.Content)" -ForegroundColor Gray
} catch {
    Write-Host "✗ Health Check FAILED" -ForegroundColor Red
    Write-Host "  Erreur: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "  Assurez-vous que l'API est démarrée (npm run start:dev)" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# Test 2: Register
Write-Host "2. Test Register..." -ForegroundColor Yellow
try {
    $body = @{
        email = $email
        password = $password
        firstName = "John"
        lastName = "Doe"
    } | ConvertTo-Json

    $response = Invoke-WebRequest -Uri "$baseUrl/auth/register" -Method POST -Body $body -ContentType "application/json" -ErrorAction Stop
    Write-Host "✓ Register OK" -ForegroundColor Green
    $registerData = $response.Content | ConvertFrom-Json
    Write-Host "  Email: $($registerData.email)" -ForegroundColor Gray
} catch {
    if ($_.Exception.Response.StatusCode -eq 400) {
        Write-Host "⚠ Utilisateur existe déjà, tentative de connexion..." -ForegroundColor Yellow
    } else {
        Write-Host "✗ Register FAILED" -ForegroundColor Red
        Write-Host "  Erreur: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""

# Test 3: Login
Write-Host "3. Test Login..." -ForegroundColor Yellow
try {
    $body = @{
        email = $email
        password = $password
    } | ConvertTo-Json

    $response = Invoke-WebRequest -Uri "$baseUrl/auth/login" -Method POST -Body $body -ContentType "application/json" -ErrorAction Stop
    Write-Host "✓ Login OK" -ForegroundColor Green
    $loginData = $response.Content | ConvertFrom-Json
    $token = $loginData.access_token
    Write-Host "  Token reçu: $($token.Substring(0, [Math]::Min(50, $token.Length)))..." -ForegroundColor Gray
} catch {
    Write-Host "✗ Login FAILED" -ForegroundColor Red
    Write-Host "  Erreur: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "  Vérifiez que l'utilisateur existe et que le mot de passe est correct" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# Test 4: Get Profile (avec token)
Write-Host "4. Test Get Profile (avec token)..." -ForegroundColor Yellow
try {
    $headers = @{
        Authorization = "Bearer $token"
    }

    $response = Invoke-WebRequest -Uri "$baseUrl/users/profile" -Method GET -Headers $headers -ErrorAction Stop
    Write-Host "✓ Get Profile OK" -ForegroundColor Green
    $profileData = $response.Content | ConvertFrom-Json
    Write-Host "  Email: $($profileData.email)" -ForegroundColor Gray
    Write-Host "  Nom: $($profileData.firstName) $($profileData.lastName)" -ForegroundColor Gray
} catch {
    Write-Host "✗ Get Profile FAILED" -ForegroundColor Red
    Write-Host "  Erreur: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== Tests terminés ===" -ForegroundColor Cyan


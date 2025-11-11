import { Controller, Post, Body, UseGuards, Get, Request, Query, Res, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Connecter un utilisateur existant' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 200, description: 'Authentification réussie' })
  @ApiResponse({ status: 401, description: 'Identifiants invalides' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('register')
  @ApiOperation({ summary: 'Créer un nouvel utilisateur' })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({ status: 201, description: 'Inscription réussie' })
  @ApiResponse({ status: 400, description: 'Requête invalide' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('forgot-password')
  @ApiOperation({ summary: 'Envoyer un email de réinitialisation de mot de passe' })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiResponse({ status: 200, description: 'Email de réinitialisation envoyé' })
  @ApiResponse({ status: 404, description: 'Utilisateur non trouvé' })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  @Get('reset-password')
  async getResetPasswordPage(@Query('token') token: string, @Res() res: Response) {
    if (!token) {
      return res.status(HttpStatus.BAD_REQUEST).send(`
        <html>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h1>❌ Token manquant</h1>
            <p>Le lien de réinitialisation est invalide. Veuillez demander une nouvelle réinitialisation.</p>
          </body>
        </html>
      `);
    }

    // Vérifier que le token est valide
    const isValid = await this.authService.validateResetToken(token);
    
    if (!isValid) {
      return res.status(HttpStatus.BAD_REQUEST).send(`
        <html>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h1>❌ Token invalide ou expiré</h1>
            <p>Ce lien de réinitialisation est invalide ou a expiré. Veuillez demander une nouvelle réinitialisation.</p>
          </body>
        </html>
      `);
    }

    // Afficher le formulaire de réinitialisation
    return res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Réinitialisation de mot de passe</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              margin: 0;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            }
            .container {
              background: white;
              padding: 40px;
              border-radius: 10px;
              box-shadow: 0 10px 25px rgba(0,0,0,0.2);
              max-width: 400px;
              width: 100%;
            }
            h1 {
              color: #333;
              margin-bottom: 20px;
            }
            .form-group {
              margin-bottom: 20px;
            }
            label {
              display: block;
              margin-bottom: 5px;
              color: #555;
              font-weight: bold;
            }
            input {
              width: 100%;
              padding: 12px;
              border: 1px solid #ddd;
              border-radius: 5px;
              box-sizing: border-box;
              font-size: 16px;
            }
            button {
              width: 100%;
              padding: 12px;
              background: #667eea;
              color: white;
              border: none;
              border-radius: 5px;
              font-size: 16px;
              cursor: pointer;
              font-weight: bold;
            }
            button:hover {
              background: #5568d3;
            }
            .message {
              margin-top: 20px;
              padding: 10px;
              border-radius: 5px;
              display: none;
            }
            .success {
              background: #d4edda;
              color: #155724;
              border: 1px solid #c3e6cb;
            }
            .error {
              background: #f8d7da;
              color: #721c24;
              border: 1px solid #f5c6cb;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>🔐 Réinitialiser votre mot de passe</h1>
            <form id="resetForm">
              <div class="form-group">
                <label for="password">Nouveau mot de passe :</label>
                <input type="password" id="password" name="password" required minlength="6" placeholder="Minimum 6 caractères">
              </div>
              <div class="form-group">
                <label for="confirmPassword">Confirmer le mot de passe :</label>
                <input type="password" id="confirmPassword" name="confirmPassword" required minlength="6" placeholder="Répétez le mot de passe">
              </div>
              <button type="submit">Réinitialiser le mot de passe</button>
            </form>
            <div id="message" class="message"></div>
          </div>
          <script>
            const form = document.getElementById('resetForm');
            const messageDiv = document.getElementById('message');
            
            form.addEventListener('submit', async (e) => {
              e.preventDefault();
              
              const password = document.getElementById('password').value;
              const confirmPassword = document.getElementById('confirmPassword').value;
              
              if (password !== confirmPassword) {
                showMessage('Les mots de passe ne correspondent pas.', 'error');
                return;
              }
              
              if (password.length < 6) {
                showMessage('Le mot de passe doit contenir au moins 6 caractères.', 'error');
                return;
              }
              
              const token = new URLSearchParams(window.location.search).get('token');
              
              try {
                const response = await fetch(window.location.origin + '/auth/reset-password', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    token: token,
                    password: password
                  })
                });
                
                const data = await response.json();
                
                if (response.ok) {
                  showMessage('✅ ' + data.message + ' Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.', 'success');
                  form.style.display = 'none';
                } else {
                  showMessage('❌ ' + (data.message || 'Une erreur est survenue.'), 'error');
                }
              } catch (error) {
                showMessage('❌ Erreur de connexion. Veuillez réessayer.', 'error');
              }
            });
            
            function showMessage(text, type) {
              messageDiv.textContent = text;
              messageDiv.className = 'message ' + type;
              messageDiv.style.display = 'block';
            }
          </script>
        </body>
      </html>
    `);
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Réinitialiser le mot de passe via le token reçu' })
  @ApiBody({ type: ResetPasswordDto })
  @ApiResponse({ status: 200, description: 'Mot de passe mis à jour' })
  @ApiResponse({ status: 400, description: 'Token invalide ou expiré' })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }
}


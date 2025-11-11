import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { SendVerificationEmailDto } from './dto/send-verification-email.dto';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private mailService: MailService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    if (user && await bcrypt.compare(password, user.password)) {
      const userObj = user.toObject ? user.toObject() : user;
      const { password, ...result } = userObj;
      return result;
    }
    return null;
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.email, loginDto.password);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }
    const payload = { email: user.email, sub: user._id };
    return {
      access_token: this.jwtService.sign(payload),
      user,
    };
  }

  async register(registerDto: RegisterDto) {
    // Vérifier si l'utilisateur existe déjà
    const existingUser = await this.usersService.findByEmail(registerDto.email);
    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(registerDto.password, 10);
    
    // Créer l'utilisateur
    const user = await this.usersService.create({
      email: registerDto.email,
      password: hashedPassword,
      name: registerDto.name,
      location: registerDto.location,
    });
    
    const userObj = user.toObject();
    const { password, ...result } = userObj;
    return result;
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<{ message: string }> {
    const user = await this.usersService.findByEmail(forgotPasswordDto.email);
    
    // Pour la sécurité, on ne révèle pas si l'email existe ou non
    if (!user) {
      // On retourne le même message dans tous les cas pour éviter l'énumération d'emails
      return { message: 'If the email exists, a password reset link has been sent.' };
    }

    // Générer un token de réinitialisation
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpires = new Date();
    resetTokenExpires.setHours(resetTokenExpires.getHours() + 1); // Expire dans 1 heure

    // Sauvegarder le token dans la base de données
    await this.usersService.setResetToken(user.email, resetToken, resetTokenExpires);

    // Envoyer l'email de réinitialisation
    try {
      await this.mailService.sendPasswordResetEmail(user.email, resetToken);
    } catch (error) {
      // Si l'envoi d'email échoue, on supprime le token pour éviter des problèmes
      await this.usersService.setResetToken(user.email, undefined, undefined);
      throw new BadRequestException('Failed to send reset email. Please try again later.');
    }

    return { message: 'If the email exists, a password reset link has been sent.' };
  }

  async validateResetToken(token: string): Promise<boolean> {
    const user = await this.usersService.findByResetToken(token);
    return !!user;
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<{ message: string }> {
    // Trouver l'utilisateur avec le token valide
    const user = await this.usersService.findByResetToken(resetPasswordDto.token);
    
    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Hasher le nouveau mot de passe
    const hashedPassword = await bcrypt.hash(resetPasswordDto.password, 10);

    // Mettre à jour le mot de passe et supprimer le token
    await this.usersService.updatePassword(user._id.toString(), hashedPassword);

    return { message: 'Password has been reset successfully' };
  }

  async verifyEmail(token: string): Promise<{ message: string }> {
    if (!token) {
      throw new BadRequestException('Verification token is required');
    }

    const user = await this.usersService.findByVerificationToken(token);

    if (!user) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    await this.usersService.markEmailAsVerified(user._id.toString());

    return { message: 'Email verified successfully' };
  }

  async resendVerificationEmail(sendVerificationEmailDto: SendVerificationEmailDto): Promise<{ message: string }> {
    const user = await this.usersService.findByEmail(sendVerificationEmailDto.email);

    if (!user) {
      // ne pas révéler si l'email existe
      return { message: 'If the email exists, a verification link has been sent.' };
    }

    if (user.isEmailVerified) {
      return { message: 'Email is already verified.' };
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    await this.usersService.setEmailVerificationToken(user._id.toString(), verificationToken);

    try {
      await this.mailService.sendVerificationEmail(user.email, verificationToken);
    } catch (error) {
      throw new BadRequestException('Failed to send verification email. Please try again later.');
    }

    return { message: 'If the email exists, a verification link has been sent.' };
  }
}


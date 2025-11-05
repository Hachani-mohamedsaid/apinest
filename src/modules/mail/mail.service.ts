import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MailService {
  constructor(private configService: ConfigService) {}

  async sendEmail(to: string, subject: string, text: string, html?: string): Promise<void> {
    // TODO: Implémenter l'envoi d'email
    // Pour l'instant, on simule l'envoi
    console.log(`Email envoyé à ${to}: ${subject}`);
    console.log(`Contenu: ${text}`);
  }

  async sendVerificationEmail(to: string, token: string): Promise<void> {
    const verificationUrl = `${process.env.APP_URL || 'http://localhost:3000'}/auth/verify-email?token=${token}`;
    await this.sendEmail(
      to,
      'Vérifiez votre email',
      `Cliquez sur ce lien pour vérifier votre email: ${verificationUrl}`,
      `<a href="${verificationUrl}">Vérifier mon email</a>`,
    );
  }

  async sendPasswordResetEmail(to: string, token: string): Promise<void> {
    const resetUrl = `${process.env.APP_URL || 'http://localhost:3000'}/auth/reset-password?token=${token}`;
    await this.sendEmail(
      to,
      'Réinitialisation de mot de passe',
      `Cliquez sur ce lien pour réinitialiser votre mot de passe: ${resetUrl}`,
      `<a href="${resetUrl}">Réinitialiser mon mot de passe</a>`,
    );
  }
}


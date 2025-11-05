import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sgMail from '@sendgrid/mail';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private configService: ConfigService) {
    const sendGridApiKey = this.configService.get<string>('SENDGRID_API_KEY');
    const fromEmail = this.configService.get<string>('SENDGRID_FROM_EMAIL') || 
                      this.configService.get<string>('GMAIL_USER') || 
                      'noreply@fitness-api.com';

    // Vérifier que SendGrid est configuré
    if (!sendGridApiKey) {
      this.logger.warn('⚠️ SendGrid API key not configured. Email sending will fail.');
      this.logger.warn('Please set SENDGRID_API_KEY environment variable.');
      this.logger.warn('Falling back to Gmail SMTP (may have timeout issues on Railway)...');
    } else {
      // Configuration SendGrid
      sgMail.setApiKey(sendGridApiKey);
      this.logger.log('✅ SendGrid configured successfully');
    }
  }

  async sendEmail(to: string, subject: string, text: string, html?: string): Promise<void> {
    const sendGridApiKey = this.configService.get<string>('SENDGRID_API_KEY');
    const fromEmail = this.configService.get<string>('SENDGRID_FROM_EMAIL') || 
                      this.configService.get<string>('GMAIL_USER') || 
                      'noreply@fitness-api.com';

    // Utiliser SendGrid si configuré
    if (sendGridApiKey) {
      try {
        const msg = {
          to,
          from: fromEmail,
          subject,
          text,
          html: html || text,
        };

        await sgMail.send(msg);
        this.logger.log(`✅ Email sent successfully via SendGrid to ${to}`);
        return;
      } catch (error: any) {
        this.logger.error(`❌ Failed to send email via SendGrid to ${to}`);
        this.logger.error(`Error: ${error.message}`);
        if (error.response?.body) {
          this.logger.error(`Error details: ${JSON.stringify(error.response.body)}`);
        }
        throw error;
      }
    }

    // Fallback: En développement, on log seulement
    if (process.env.NODE_ENV !== 'production') {
      this.logger.warn(`[DEV] Email envoyé à ${to}: ${subject}`);
      this.logger.warn(`[DEV] Contenu: ${text}`);
      return;
    }

    throw new Error('Email service not configured. Please set SENDGRID_API_KEY or GMAIL credentials.');
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


import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    const gmailUser = this.configService.get<string>('GMAIL_USER');
    const gmailPassword = this.configService.get<string>('GMAIL_APP_PASSWORD');

    // Vérifier que les variables sont configurées
    if (!gmailUser || !gmailPassword) {
      this.logger.warn('⚠️ Gmail credentials not configured. Email sending will fail.');
      this.logger.warn('Please set GMAIL_USER and GMAIL_APP_PASSWORD environment variables.');
    }

    // Configuration Gmail SMTP
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: gmailPassword?.replace(/\s/g, ''), // Enlever les espaces de l'App Password
      },
    });
  }

  async sendEmail(to: string, subject: string, text: string, html?: string): Promise<void> {
    try {
      const mailOptions = {
        from: this.configService.get<string>('GMAIL_USER'),
        to,
        subject,
        text,
        html: html || text,
      };

      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log(`✅ Email sent successfully to ${to}: ${info.messageId}`);
    } catch (error: any) {
      this.logger.error(`❌ Failed to send email to ${to}`);
      this.logger.error(`Error: ${error.message}`);
      if (error.code) {
        this.logger.error(`Error code: ${error.code}`);
      }
      if (error.response) {
        this.logger.error(`Error response: ${JSON.stringify(error.response)}`);
      }
      
      // En développement, on log quand même
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[DEV] Email envoyé à ${to}: ${subject}`);
        console.log(`[DEV] Contenu: ${text}`);
      }
      throw error;
    }
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


import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MailService } from '../../mail/mail.service';
import { 
  LeaderboardCouponEmail, 
  LeaderboardCouponEmailDocument 
} from '../schemas/leaderboard-coupon-email.schema';

@Injectable()
export class LeaderboardEmailService {
  private readonly logger = new Logger(LeaderboardEmailService.name);

  constructor(
    private mailService: MailService,
    @InjectModel(LeaderboardCouponEmail.name)
    private couponEmailModel: Model<LeaderboardCouponEmailDocument>
  ) {}

  /**
   * Vérifie si le coupon a déjà été envoyé cette semaine
   */
  async hasCouponBeenSentThisWeek(userId: string): Promise<boolean> {
    const startOfWeek = this.getStartOfWeek();
    
    const existingEmail = await this.couponEmailModel.findOne({
      userId,
      sentAt: { $gte: startOfWeek }
    }).exec();

    return !!existingEmail;
  }

  /**
   * Envoie l'email avec le coupon LEADERBOARD
   */
  async sendLeaderboardCouponEmail(
    userId: string,
    userName: string,
    userEmail: string,
    xp: number
  ): Promise<void> {
    const couponCode = 'LEADERBOARD';
    const discount = 20; // 20% de réduction

    // Template HTML de l'email
    const emailHtml = this.getEmailTemplate(userName, couponCode, discount, xp);

    // Envoyer l'email
    await this.mailService.sendEmail(
      userEmail,
      '🏆 Félicitations ! Vous êtes #1 au Leaderboard - Code Coupon Exclusif',
      `Félicitations ${userName} ! Vous êtes #1 au Leaderboard avec ${xp} XP. Votre code coupon: ${couponCode} - ${discount}% de réduction.`,
      emailHtml
    );

    // Enregistrer l'envoi dans la base de données
    await this.couponEmailModel.create({
      userId,
      userEmail,
      couponCode,
      sentAt: new Date(),
      weekStart: this.getStartOfWeek()
    });

    this.logger.log(`📧 Email sent to ${userEmail} with coupon ${couponCode}`);
  }

  /**
   * Template HTML de l'email
   */
  private getEmailTemplate(
    userName: string,
    couponCode: string,
    discount: number,
    xp: number
  ): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      text-align: center;
      border-radius: 10px 10px 0 0;
    }
    .content {
      background: #f9f9f9;
      padding: 30px;
      border-radius: 0 0 10px 10px;
    }
    .trophy {
      font-size: 60px;
      margin-bottom: 10px;
    }
    .coupon-box {
      background: white;
      border: 3px dashed #667eea;
      border-radius: 10px;
      padding: 20px;
      text-align: center;
      margin: 20px 0;
    }
    .coupon-code {
      font-size: 32px;
      font-weight: bold;
      color: #667eea;
      letter-spacing: 5px;
      margin: 10px 0;
    }
    .discount {
      font-size: 24px;
      color: #10b981;
      font-weight: bold;
    }
    .button {
      display: inline-block;
      background: #667eea;
      color: white;
      padding: 15px 30px;
      text-decoration: none;
      border-radius: 5px;
      margin-top: 20px;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      color: #666;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="trophy">🏆</div>
    <h1>Félicitations ${userName} !</h1>
    <p>Vous êtes #1 au Leaderboard Hebdomadaire</p>
  </div>
  
  <div class="content">
    <h2>Vous avez gagné !</h2>
    <p>
      Avec <strong>${xp} XP</strong> cette semaine, vous êtes en tête du classement ! 
      Pour récompenser votre performance exceptionnelle, nous vous offrons un code coupon exclusif.
    </p>
    
    <div class="coupon-box">
      <p style="margin: 0; color: #666;">Votre code coupon :</p>
      <div class="coupon-code">${couponCode}</div>
      <p class="discount">-${discount}% de réduction</p>
      <p style="margin: 10px 0; color: #666; font-size: 14px;">
        ⚠️ Ce coupon ne peut être utilisé <strong>qu'une seule fois</strong>
      </p>
    </div>
    
    <p>
      Utilisez ce code lors de votre prochaine réservation de session pour bénéficier de 
      <strong>${discount}% de réduction</strong> !
    </p>
    
    <div style="text-align: center;">
      <a href="https://yourapp.com/book" class="button">Réserver une Session</a>
    </div>
    
    <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin-top: 20px; border-radius: 5px;">
      <strong>💡 Comment utiliser votre coupon :</strong>
      <ol style="margin: 10px 0; padding-left: 20px;">
        <li>Choisissez une session de votre choix</li>
        <li>Dans le champ "Coupon", entrez : <strong>${couponCode}</strong></li>
        <li>Cliquez sur "Apply"</li>
        <li>Profitez de votre réduction de ${discount}% !</li>
      </ol>
    </div>
  </div>
  
  <div class="footer">
    <p>Merci d'être un membre actif de notre communauté !</p>
    <p>L'équipe Nexo Sports</p>
  </div>
</body>
</html>
    `;
  }

  /**
   * Calcule le début de la semaine (Lundi)
   */
  private getStartOfWeek(): Date {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day + (day === 0 ? -6 : 1));
    startOfWeek.setHours(0, 0, 0, 0);
    return startOfWeek;
  }
}


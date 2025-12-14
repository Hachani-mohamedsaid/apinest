import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { 
  LeaderboardCouponEmail, 
  LeaderboardCouponEmailDocument 
} from '../../achievements/schemas/leaderboard-coupon-email.schema';

@Injectable()
export class CouponService {
  private readonly logger = new Logger(CouponService.name);

  constructor(
    @InjectModel(LeaderboardCouponEmail.name)
    private couponEmailModel: Model<LeaderboardCouponEmailDocument>
  ) {}

  /**
   * Valide et applique un coupon
   */
  async validateAndApplyCoupon(
    userId: string,
    couponCode: string,
    originalPrice: number
  ): Promise<{ valid: boolean; discount: number; newPrice: number; message?: string }> {
    const code = couponCode.trim().toUpperCase();

    // Vérifier si c'est le coupon LEADERBOARD
    if (code !== 'LEADERBOARD') {
      return {
        valid: false,
        discount: 0,
        newPrice: originalPrice,
        message: 'Code coupon invalide'
      };
    }

    // Vérifier si l'utilisateur a reçu ce coupon
    const couponEmail = await this.couponEmailModel.findOne({
      userId,
      couponCode: 'LEADERBOARD'
    }).exec();

    if (!couponEmail) {
      return {
        valid: false,
        discount: 0,
        newPrice: originalPrice,
        message: 'Vous n\'avez pas reçu ce coupon'
      };
    }

    // Vérifier si le coupon a déjà été utilisé
    if (couponEmail.couponUsed) {
      return {
        valid: false,
        discount: 0,
        newPrice: originalPrice,
        message: 'Ce coupon a déjà été utilisé'
      };
    }

    // Calculer la réduction (20%)
    const discount = originalPrice * 0.20;
    const newPrice = Math.max(0, originalPrice - discount);

    // Marquer le coupon comme utilisé
    couponEmail.couponUsed = true;
    couponEmail.usedAt = new Date();
    await couponEmail.save();

    this.logger.log(`✅ Coupon ${code} applied by user ${userId}. Discount: ${discount}, New price: ${newPrice}`);

    return {
      valid: true,
      discount: Math.round(discount * 100) / 100,
      newPrice: Math.round(newPrice * 100) / 100
    };
  }

  /**
   * Vérifie si un utilisateur peut utiliser un coupon
   */
  async canUseCoupon(userId: string, couponCode: string): Promise<boolean> {
    const code = couponCode.trim().toUpperCase();
    
    if (code !== 'LEADERBOARD') {
      return false;
    }

    const couponEmail = await this.couponEmailModel.findOne({
      userId,
      couponCode: 'LEADERBOARD',
      couponUsed: false
    }).exec();

    return !!couponEmail;
  }

  /**
   * Crée un coupon de test pour un utilisateur (DEV ONLY)
   */
  async createTestCoupon(
    userId: string,
    userEmail: string,
    userName: string
  ): Promise<{ success: boolean; message: string; coupon?: any }> {
    // Calculer le début de la semaine actuelle (Lundi)
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day + (day === 0 ? -6 : 1));
    weekStart.setHours(0, 0, 0, 0);

    // Vérifier si un coupon existe déjà pour cette semaine
    const existingCoupon = await this.couponEmailModel.findOne({
      userId,
      weekStart: {
        $gte: weekStart,
        $lt: new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000)
      }
    }).exec();

    if (existingCoupon) {
      return {
        success: false,
        message: 'Un coupon existe déjà pour cette semaine. Supprimez-le d\'abord ou attendez la semaine prochaine.',
        coupon: existingCoupon
      };
    }

    // Créer le coupon de test
    const coupon = await this.couponEmailModel.create({
      userId,
      userEmail,
      couponCode: 'LEADERBOARD',
      sentAt: new Date(),
      weekStart: weekStart,
      couponUsed: false
    });

    this.logger.log(`✅ Test coupon created for user ${userId} (${userEmail})`);

    return {
      success: true,
      message: `Coupon LEADERBOARD créé avec succès pour ${userName}`,
      coupon: {
        id: coupon._id.toString(),
        userId: coupon.userId,
        couponCode: coupon.couponCode,
        weekStart: coupon.weekStart,
        couponUsed: coupon.couponUsed
      }
    };
  }
}


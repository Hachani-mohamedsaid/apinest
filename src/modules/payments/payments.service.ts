import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { StripeService } from '../stripe/stripe.service';
import { Activity, ActivityDocument } from '../activities/schemas/activity.schema';
import { Payment, PaymentDocument } from './schemas/payment.schema';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @InjectModel(Activity.name) private activityModel: Model<ActivityDocument>,
    @InjectModel(Payment.name) private paymentModel: Model<PaymentDocument>,
    private stripeService: StripeService,
  ) {}

  /**
   * Créer un Payment Intent pour une activité
   * @param dto Données de la requête
   * @param userId ID de l'utilisateur connecté
   */
  async createPaymentIntent(dto: CreatePaymentIntentDto, userId: string) {
    // Vérifier que l'activité existe
    const activity = await this.activityModel.findById(dto.activityId).exec();
    if (!activity) {
      throw new NotFoundException('Activity not found');
    }

    // Vérifier que l'activité a un prix
    if (!activity.price || activity.price <= 0) {
      throw new BadRequestException('Activity is free, no payment required');
    }

    // Vérifier que le montant correspond au prix de l'activité
    if (Math.abs(dto.amount - activity.price) > 0.01) {
      throw new BadRequestException(
        `Amount must match activity price: ${activity.price}`,
      );
    }

    // Vérifier que l'utilisateur n'a pas déjà payé
    const isParticipant = activity.participantIds?.some(
      (id) => id.toString() === userId,
    );
    if (isParticipant) {
      throw new BadRequestException('User has already paid for this activity');
    }

    // Vérifier qu'il reste de la place
    const currentParticipants = activity.participantIds?.length || 0;
    if (currentParticipants >= activity.participants) {
      throw new BadRequestException('Activity is full');
    }

    // Créer le Payment Intent
    try {
      const paymentIntent = await this.stripeService.createPaymentIntent(
        dto.amount,
        dto.currency || 'eur',
        {
          activityId: dto.activityId,
          userId: userId,
        },
      );

      this.logger.log(
        `Payment intent created: ${paymentIntent.paymentIntentId} for activity ${dto.activityId} by user ${userId}`,
      );

      return paymentIntent;
    } catch (error) {
      this.logger.error(
        `Error creating payment intent: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException('Failed to create payment intent');
    }
  }

  /**
   * Confirmer un paiement et ajouter l'utilisateur comme participant
   * @param dto Données de la requête
   * @param userId ID de l'utilisateur connecté
   */
  async confirmPayment(dto: ConfirmPaymentDto, userId: string) {
    // Vérifier le paiement avec Stripe
    let paymentResult;
    try {
      paymentResult = await this.stripeService.confirmPayment(
        dto.paymentIntentId,
      );
    } catch (error) {
      this.logger.error(`Error confirming payment: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to confirm payment');
    }

    if (!paymentResult.success) {
      throw new BadRequestException(
        `Payment not confirmed. Status: ${paymentResult.status}`,
      );
    }

    // Vérifier que l'activité existe
    const activity = await this.activityModel.findById(dto.activityId).exec();
    if (!activity) {
      throw new NotFoundException('Activity not found');
    }

    // Vérifier si l'utilisateur est déjà participant
    const userIdObject = new Types.ObjectId(userId);
    const isParticipant = activity.participantIds?.some(
      (id) => id.toString() === userId,
    );

    if (isParticipant) {
      this.logger.log(
        `User ${userId} is already a participant of activity ${dto.activityId}`,
      );
      return {
        success: true,
        message: 'User is already a participant',
        activityId: dto.activityId,
      };
    }

    // Vérifier qu'il reste de la place
    const currentParticipants = activity.participantIds?.length || 0;
    if (currentParticipants >= activity.participants) {
      throw new BadRequestException('Activity is full');
    }

    // Ajouter l'utilisateur comme participant
    if (!activity.participantIds) {
      activity.participantIds = [];
    }
    activity.participantIds.push(userIdObject);
    await activity.save();

    // Récupérer le Payment Intent depuis Stripe pour obtenir les détails
    let paymentIntentDetails;
    try {
      paymentIntentDetails = await this.stripeService.retrievePaymentIntent(
        dto.paymentIntentId,
      );
    } catch (error) {
      this.logger.warn(
        `Could not retrieve payment intent details: ${error.message}`,
      );
    }

    // Enregistrer le paiement dans MongoDB
    const coachId = activity.creator.toString();
    const amount = paymentIntentDetails?.amount || Math.round(activity.price * 100); // Montant en cents
    const currency = paymentIntentDetails?.currency || 'eur';

    try {
      // Vérifier si le paiement n'existe pas déjà (éviter les doublons)
      const existingPayment = await this.paymentModel
        .findOne({ paymentIntentId: dto.paymentIntentId })
        .exec();

      if (!existingPayment) {
        const payment = new this.paymentModel({
          activityId: new Types.ObjectId(dto.activityId),
          userId: new Types.ObjectId(userId),
          coachId: new Types.ObjectId(coachId),
          amount: amount,
          currency: currency,
          paymentIntentId: dto.paymentIntentId,
          status: 'succeeded',
        });

        await payment.save();
        this.logger.log(
          `Payment saved to database: ${payment._id} for activity ${dto.activityId}`,
        );
      } else {
        this.logger.log(
          `Payment already exists in database: ${existingPayment._id}`,
        );
      }
    } catch (error) {
      // Log l'erreur mais ne bloque pas le processus si l'enregistrement échoue
      this.logger.error(
        `Error saving payment to database: ${error.message}`,
        error.stack,
      );
    }

    this.logger.log(
      `Payment confirmed and user ${userId} added as participant to activity ${dto.activityId}`,
    );

    return {
      success: true,
      message: 'Payment confirmed and user added as participant',
      activityId: dto.activityId,
    };
  }

  /**
   * Vérifier le statut de paiement d'un utilisateur pour une activité
   * @param activityId ID de l'activité
   * @param userId ID de l'utilisateur
   */
  async checkPayment(activityId: string, userId: string) {
    const activity = await this.activityModel.findById(activityId).exec();
    if (!activity) {
      throw new NotFoundException('Activity not found');
    }

    const isParticipant = activity.participantIds?.some(
      (id) => id.toString() === userId,
    ) || false;

    // Pour l'instant, on considère que si l'utilisateur est participant et que l'activité a un prix, il a payé
    const hasPaid = isParticipant && activity.price && activity.price > 0;

    return {
      hasPaid,
      isParticipant,
      activityPrice: activity.price || 0,
    };
  }

  /**
   * Récupérer les earnings (revenus) d'un coach
   * Utilise les paiements stockés dans MongoDB (priorité) ou calcule depuis les activités (fallback)
   */
  async getCoachEarnings(
    coachId: string,
    year?: number,
    month?: number,
  ): Promise<{
    totalEarnings: number;
    earnings: Array<{
      date: string;
      amount: number;
      activityId: string;
      activityTitle: string;
    }>;
  }> {
    // Construire la query pour les paiements du coach
    const paymentQuery: any = {
      coachId: new Types.ObjectId(coachId),
      status: 'succeeded', // Seulement les paiements réussis
    };

    // Filtrer par date si fourni
    if (year && month) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);
      paymentQuery.createdAt = {
        $gte: startDate,
        $lte: endDate,
      };
    } else if (year) {
      const startDate = new Date(year, 0, 1);
      const endDate = new Date(year, 11, 31, 23, 59, 59);
      paymentQuery.createdAt = {
        $gte: startDate,
        $lte: endDate,
      };
    }

    // Récupérer les paiements depuis MongoDB
    const payments = await this.paymentModel
      .find(paymentQuery)
      .populate('activityId', 'title date')
      .sort({ createdAt: -1 })
      .exec();

    // Si des paiements existent, les utiliser
    if (payments && payments.length > 0) {
      const earningsMap = new Map<string, {
        date: string;
        amount: number;
        activityId: string;
        activityTitle: string;
      }>();

      let totalEarnings = 0;

      for (const payment of payments) {
        const paymentObj = payment.toObject ? payment.toObject() : payment;
        const createdAt = (paymentObj as any).createdAt || new Date();
        const dateStr = createdAt instanceof Date
          ? createdAt.toISOString().split('T')[0]
          : new Date(createdAt).toISOString().split('T')[0];

        // Convertir le montant de cents en unité de devise
        const amountInCurrency = payment.amount / 100;

        // Grouper par date et activité (clé: date_activityId)
        const activityIdStr = payment.activityId.toString();
        const key = `${dateStr}_${activityIdStr}`;
        const existing = earningsMap.get(key);

        if (existing) {
          existing.amount += amountInCurrency;
        } else {
          // Récupérer le titre de l'activité depuis le populate ou depuis la base
          let activityTitle = 'Unknown Activity';
          const activity = payment.activityId as any;
          
          // Si l'activité est populée (objet), utiliser directement
          if (activity && typeof activity === 'object' && 'title' in activity) {
            activityTitle = activity.title || 'Unknown Activity';
          } else {
            // Sinon, récupérer depuis la base de données
            try {
              const activityDoc = await this.activityModel.findById(activityIdStr).exec();
              if (activityDoc) {
                activityTitle = activityDoc.title;
              }
            } catch (error) {
              this.logger.warn(`Could not fetch activity title for ${activityIdStr}: ${error.message}`);
            }
          }

          earningsMap.set(key, {
            date: dateStr,
            amount: amountInCurrency,
            activityId: activityIdStr,
            activityTitle: activityTitle,
          });
        }

        totalEarnings += amountInCurrency;
      }

      // Convertir en format de réponse
      const earnings = Array.from(earningsMap.values()).map((item) => ({
        date: item.date,
        amount: Math.round(item.amount * 100) / 100,
        activityId: item.activityId,
        activityTitle: item.activityTitle,
      }));

      // Trier par date (plus récentes en premier)
      earnings.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      );

      return {
        totalEarnings: Math.round(totalEarnings * 100) / 100,
        earnings,
      };
    }

    // Fallback: Calculer depuis les activités si aucun paiement n'est trouvé
    this.logger.log(
      `No payments found in database for coach ${coachId}, falling back to activity-based calculation`,
    );

    const query: any = {
      creator: new Types.ObjectId(coachId),
      price: { $exists: true, $gt: 0 },
      participantIds: { $exists: true, $ne: [] },
    };

    if (year && month) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);
      query.createdAt = {
        $gte: startDate,
        $lte: endDate,
      };
    } else if (year) {
      const startDate = new Date(year, 0, 1);
      const endDate = new Date(year, 11, 31, 23, 59, 59);
      query.createdAt = {
        $gte: startDate,
        $lte: endDate,
      };
    }

    const activities = await this.activityModel.find(query).exec();

    const earnings: Array<{
      date: string;
      amount: number;
      activityId: string;
      activityTitle: string;
    }> = [];
    let totalEarnings = 0;

    for (const activity of activities) {
      if (!activity.price || activity.price <= 0) {
        continue;
      }

      const participantCount = activity.participantIds?.length || 0;
      if (participantCount === 0) {
        continue;
      }

      const earningsAmount = activity.price * participantCount;
      totalEarnings += earningsAmount;

      const activityObj = activity.toObject ? activity.toObject() : activity;
      const activityDate = activity.date || (activityObj as any).createdAt || new Date();
      const dateStr = activityDate instanceof Date
        ? activityDate.toISOString().split('T')[0]
        : new Date(activityDate).toISOString().split('T')[0];

      earnings.push({
        date: dateStr,
        amount: Math.round(earningsAmount * 100) / 100,
        activityId: activity._id.toString(),
        activityTitle: activity.title,
      });
    }

    earnings.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );

    return {
      totalEarnings: Math.round(totalEarnings * 100) / 100,
      earnings,
    };
  }
}


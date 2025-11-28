import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private stripe: Stripe;

  constructor(private configService: ConfigService) {
    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    
    if (!secretKey) {
      this.logger.warn('⚠️ STRIPE_SECRET_KEY not configured. Stripe functionality will be disabled.');
    } else {
      this.stripe = new Stripe(secretKey, {
        apiVersion: '2025-11-17.clover',
      });
      this.logger.log('✅ Stripe configured successfully');
    }
  }

  /**
   * Créer un Payment Intent
   * @param amount Montant en unité de la devise (ex: 25.00 pour 25€)
   * @param currency Devise (par défaut: 'eur')
   * @param metadata Métadonnées optionnelles
   */
  async createPaymentIntent(
    amount: number,
    currency: string = 'eur',
    metadata?: Record<string, string>,
  ): Promise<{ clientSecret: string; paymentIntentId: string }> {
    if (!this.stripe) {
      throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY in environment variables.');
    }

    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convertir en cents
        currency,
        metadata,
        automatic_payment_methods: {
          enabled: true,
        },
      });

      return {
        clientSecret: paymentIntent.client_secret!,
        paymentIntentId: paymentIntent.id,
      };
    } catch (error) {
      this.logger.error(`Error creating payment intent: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Confirmer un paiement
   * @param paymentIntentId ID du Payment Intent
   */
  async confirmPayment(paymentIntentId: string): Promise<{ success: boolean; paymentIntent?: Stripe.PaymentIntent; status?: string }> {
    if (!this.stripe) {
      throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY in environment variables.');
    }

    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);

      if (paymentIntent.status === 'succeeded') {
        return {
          success: true,
          paymentIntent,
        };
      }

      return {
        success: false,
        status: paymentIntent.status,
      };
    } catch (error) {
      this.logger.error(`Error confirming payment: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Récupérer un Payment Intent
   * @param paymentIntentId ID du Payment Intent
   */
  async retrievePaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    if (!this.stripe) {
      throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY in environment variables.');
    }

    try {
      return await this.stripe.paymentIntents.retrieve(paymentIntentId);
    } catch (error) {
      this.logger.error(`Error retrieving payment intent: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Construire un événement depuis un webhook Stripe
   * @param payload Payload du webhook
   * @param signature Signature Stripe
   * @param webhookSecret Secret du webhook
   */
  constructEvent(payload: string | Buffer, signature: string, webhookSecret: string): Stripe.Event {
    if (!this.stripe) {
      throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY in environment variables.');
    }

    try {
      return this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (error) {
      this.logger.error(`Error constructing webhook event: ${error.message}`, error.stack);
      throw error;
    }
  }
}


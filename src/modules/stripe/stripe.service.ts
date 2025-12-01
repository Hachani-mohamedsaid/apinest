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

  /**
   * Crée un client Stripe
   */
  async createCustomer(email: string, name: string, metadata?: Record<string, string>): Promise<Stripe.Customer> {
    if (!this.stripe) {
      throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY in environment variables.');
    }

    try {
      return await this.stripe.customers.create({
        email,
        name,
        metadata,
      });
    } catch (error) {
      this.logger.error(`Error creating customer: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Récupère ou crée un client Stripe
   */
  async getOrCreateCustomer(userId: string, email: string, name: string): Promise<Stripe.Customer> {
    if (!this.stripe) {
      throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY in environment variables.');
    }

    try {
      const existingCustomers = await this.stripe.customers.list({
        email,
        limit: 1,
      });

      if (existingCustomers.data.length > 0) {
        return existingCustomers.data[0];
      }

      return this.createCustomer(email, name, { userId });
    } catch (error) {
      this.logger.error(`Error getting or creating customer: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Crée ou met à jour une subscription Stripe
   */
  async createOrUpdateSubscription(
    userId: string,
    subscriptionType: string,
    paymentMethodId: string,
    customerEmail?: string,
    customerName?: string,
  ): Promise<Stripe.Subscription> {
    if (!this.stripe) {
      throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY in environment variables.');
    }

    try {
      const priceId = this.getPriceIdForSubscriptionType(subscriptionType);
      
      if (!priceId) {
        throw new Error(`Type de subscription invalide: ${subscriptionType}`);
      }

      // Récupérer ou créer le client Stripe
      const customer = await this.getOrCreateCustomer(
        userId,
        customerEmail || `${userId}@example.com`,
        customerName || `User ${userId}`,
      );

      // Attacher le payment method au client
      await this.stripe.paymentMethods.attach(paymentMethodId, {
        customer: customer.id,
      });

      // Définir comme payment method par défaut
      await this.stripe.customers.update(customer.id, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });

      // Créer la subscription
      const subscription = await this.stripe.subscriptions.create({
        customer: customer.id,
        items: [{ price: priceId }],
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
        metadata: {
          userId,
          subscriptionType,
        },
      });

      this.logger.log(`Subscription created for user ${userId}: ${subscription.id}`);
      return subscription;
    } catch (error) {
      this.logger.error(`Error creating subscription: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Annule une subscription Stripe
   */
  async cancelSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    if (!this.stripe) {
      throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY in environment variables.');
    }

    try {
      return await this.stripe.subscriptions.cancel(subscriptionId);
    } catch (error) {
      this.logger.error(`Error canceling subscription: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Retourne le Price ID Stripe selon le type de subscription
   */
  private getPriceIdForSubscriptionType(subscriptionType: string): string | null {
    const priceIds = {
      premium_normal: this.configService.get<string>('STRIPE_PRICE_PREMIUM_NORMAL'),
      premium_gold: this.configService.get<string>('STRIPE_PRICE_PREMIUM_GOLD'),
      premium_platinum: this.configService.get<string>('STRIPE_PRICE_PREMIUM_PLATINUM'),
    };

    return priceIds[subscriptionType] || null;
  }

  /**
   * Récupère les invoices d'un client Stripe
   */
  async getCustomerInvoices(customerId: string): Promise<Stripe.Invoice[]> {
    if (!this.stripe) {
      throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY in environment variables.');
    }

    try {
      const invoices = await this.stripe.invoices.list({
        customer: customerId,
        limit: 100,
      });
      return invoices.data;
    } catch (error) {
      this.logger.error(`Error retrieving customer invoices: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Récupère une invoice spécifique
   */
  async getInvoice(invoiceId: string): Promise<Stripe.Invoice> {
    if (!this.stripe) {
      throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY in environment variables.');
    }

    try {
      return await this.stripe.invoices.retrieve(invoiceId);
    } catch (error) {
      this.logger.error(`Error retrieving invoice: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Met à jour la méthode de paiement d'un client
   */
  async updatePaymentMethod(
    customerId: string,
    paymentMethodId: string,
    subscriptionId?: string
  ): Promise<void> {
    if (!this.stripe) {
      throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY in environment variables.');
    }

    try {
      // Attacher le nouveau payment method au client
      await this.stripe.paymentMethods.attach(paymentMethodId, {
        customer: customerId,
      });

      // Définir comme méthode par défaut
      await this.stripe.customers.update(customerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });

      // Mettre à jour la subscription si fournie
      if (subscriptionId) {
        await this.stripe.subscriptions.update(subscriptionId, {
          default_payment_method: paymentMethodId,
        });
      }
    } catch (error) {
      this.logger.error(`Error updating payment method: ${error.message}`, error.stack);
      throw error;
    }
  }
}


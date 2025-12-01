export class PaymentHistoryDto {
  payments: Array<{
    id: string;
    date: Date;
    amount: number;
    currency: string;
    plan: string;
    status: 'success' | 'failed' | 'pending' | 'refunded';
    invoiceUrl?: string;
    stripeInvoiceId?: string;
  }>;
  totalPaid: number;
  nextPaymentDate?: Date;
  nextPaymentAmount?: number;
}


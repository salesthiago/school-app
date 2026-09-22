export type PaymentMethod = 'pix' | 'boleto';

export interface ChargeResult {
  providerReference: string;
  pixQrCode?: string;
  pixCopyPaste?: string;
  boletoUrl?: string;
  boletoBarcode?: string;
  expiresAt?: string;
}

export interface CheckoutResponse {
  order: { id: string; moduleId?: string; courseId: string; amount: number };
  payment: { id: string } & ChargeResult;
}

export type OrderStatus = 'pending' | 'paid' | 'canceled' | 'expired';

/** Pedido do aluno (GET /orders/mine). Sem moduleId = compra da trilha de aulas avulsas do curso. */
export interface Order {
  id: string;
  courseId: string;
  moduleId?: string;
  amount: number;
  paymentMethod: 'pix' | 'boleto' | 'credit_card' | 'debit_card';
  status: OrderStatus;
  paidAt?: string;
  createdAt: string;
}

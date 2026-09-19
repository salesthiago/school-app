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

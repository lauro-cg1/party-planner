// ==========================================
// TIPOS DO PLANEJADOR DE FESTA
// ==========================================

export type GuestStatus = 'confirmado' | 'nao_vem' | 'pago_parcial' | 'pago_total' | 'pendente';

export interface GuestPayment {
  id: string;
  guestId: string;
  amount: number;
  paymentDate: string;
  createdAt: string;
}

export interface Guest {
  id: string;
  name: string;
  family: string;
  status: GuestStatus;
  observations: string;
  totalPaid: number;
  payments: GuestPayment[];
  createdAt: string;
}

export interface ShoppingItem {
  id: string;
  name: string;
  price: number;
  category: 'compra' | 'contratacao';
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface FinancialSummary {
  totalExpenses: number;
  totalReceived: number;
  netBalance: number;
  paidGuests: number;
  pricePerGuest: number;
}

// ==========================================
// TIPOS DO PLANEJADOR DE FESTA
// ==========================================

export type GuestStatus = 'confirmado' | 'nao_vem' | 'pago' | 'pendente';

export interface Guest {
  id: string;
  name: string;
  status: GuestStatus;
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

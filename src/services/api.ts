// ==========================================
// SERVIÇO DE API - CLOUDFLARE WORKERS
// ==========================================

import { Guest, GuestStatus, GuestPayment, ShoppingItem } from '../types';

const API_BASE_URL = 'https://party-planner-api.laurocg2.workers.dev';

// ==========================================
// CONVIDADOS
// ==========================================

export async function fetchGuests(): Promise<Guest[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/guests`);
    if (!response.ok) throw new Error('Erro ao buscar convidados');
    const data = await response.json();
    return data.guests || [];
  } catch (error) {
    console.error('fetchGuests error:', error);
    return [];
  }
}

export async function addGuest(name: string, family: string, isChild: boolean = false): Promise<Guest | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/guests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, family, isChild }),
    });
    if (!response.ok) throw new Error('Erro ao adicionar convidado');
    const data = await response.json();
    return data.guest;
  } catch (error) {
    console.error('addGuest error:', error);
    return null;
  }
}

export async function updateGuest(id: string, updates: { status?: GuestStatus; observations?: string; family?: string; isChild?: boolean }): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/guests/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    return response.ok;
  } catch (error) {
    console.error('updateGuest error:', error);
    return false;
  }
}

export async function deleteGuest(id: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/guests/${id}`, {
      method: 'DELETE',
    });
    return response.ok;
  } catch (error) {
    console.error('deleteGuest error:', error);
    return false;
  }
}

// ==========================================
// PAGAMENTOS
// ==========================================

export async function addPayment(guestId: string, amount: number, paymentDate: string): Promise<GuestPayment | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/guests/${guestId}/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, paymentDate }),
    });
    if (!response.ok) throw new Error('Erro ao adicionar pagamento');
    const data = await response.json();
    return data.payment;
  } catch (error) {
    console.error('addPayment error:', error);
    return null;
  }
}

export async function deletePayment(paymentId: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/payments/${paymentId}`, {
      method: 'DELETE',
    });
    return response.ok;
  } catch (error) {
    console.error('deletePayment error:', error);
    return false;
  }
}

// ==========================================
// LISTA DE COMPRAS / CONTRATAÇÕES
// ==========================================

export async function fetchShoppingItems(): Promise<ShoppingItem[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/shopping`);
    if (!response.ok) throw new Error('Erro ao buscar itens');
    const data = await response.json();
    return data.items || [];
  } catch (error) {
    console.error('fetchShoppingItems error:', error);
    return [];
  }
}

export async function addShoppingItem(
  name: string,
  price: number,
  category: 'compra' | 'contratacao'
): Promise<ShoppingItem | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/shopping`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, price, category }),
    });
    if (!response.ok) throw new Error('Erro ao adicionar item');
    const data = await response.json();
    return data.item;
  } catch (error) {
    console.error('addShoppingItem error:', error);
    return null;
  }
}

export async function deleteShoppingItem(id: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/shopping/${id}`, {
      method: 'DELETE',
    });
    return response.ok;
  } catch (error) {
    console.error('deleteShoppingItem error:', error);
    return false;
  }
}

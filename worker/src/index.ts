// ==========================================
// CLOUDFLARE WORKER - API DO PLANEJADOR DE FESTA
// ==========================================

export interface Env {
  DB: D1Database;
}

function generateId(): string {
  return crypto.randomUUID();
}

function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: corsHeaders(),
  });
}

function errorResponse(message: string, status = 400): Response {
  return jsonResponse({ error: message }, status);
}

// ==========================================
// CONVIDADOS
// ==========================================

async function handleGetGuests(db: D1Database): Promise<Response> {
  const guests = await db
    .prepare('SELECT id, name, family, is_child as isChild, status, observations, created_at as createdAt FROM guests ORDER BY family ASC, name ASC')
    .all();

  const payments = await db
    .prepare('SELECT id, guest_id as guestId, amount, payment_date as paymentDate, created_at as createdAt FROM guest_payments ORDER BY payment_date ASC')
    .all();

  const paymentsByGuest: Record<string, any[]> = {};
  for (const p of (payments.results || [])) {
    const gid = (p as any).guestId;
    if (!paymentsByGuest[gid]) paymentsByGuest[gid] = [];
    paymentsByGuest[gid].push(p);
  }

  const enrichedGuests = (guests.results || []).map((g: any) => {
    const guestPayments = paymentsByGuest[g.id] || [];
    const totalPaid = guestPayments.reduce((sum: number, p: any) => sum + p.amount, 0);
    const guestPrice = g.isChild ? 75 : 150;
    let derivedStatus = g.status;

    // Keep explicit RSVP statuses, derive payment statuses from actual payments.
    if (g.status !== 'confirmado' && g.status !== 'nao_vem') {
      if (totalPaid >= guestPrice && totalPaid > 0) {
        derivedStatus = 'pago_total';
      } else if (totalPaid > 0) {
        derivedStatus = 'pago_parcial';
      } else {
        derivedStatus = 'pendente';
      }
    }

    return { ...g, status: derivedStatus, payments: guestPayments, totalPaid };
  });

  return jsonResponse({ guests: enrichedGuests });
}

async function handleAddGuest(db: D1Database, request: Request): Promise<Response> {
  const body = await request.json() as { name?: string; family?: string; isChild?: boolean };
  const name = body.name?.trim();
  const family = body.family?.trim() || '';
  const isChild = body.isChild ? 1 : 0;
  if (!name) return errorResponse('Nome é obrigatório');

  const id = generateId();
  const now = new Date().toISOString();

  await db
    .prepare('INSERT INTO guests (id, name, family, is_child, status, observations, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(id, name, family, isChild, 'pendente', '', now)
    .run();

  return jsonResponse({
    guest: { id, name, family, isChild, status: 'pendente', observations: '', totalPaid: 0, payments: [], createdAt: now },
  }, 201);
}

async function handleUpdateGuest(db: D1Database, id: string, request: Request): Promise<Response> {
  const body = await request.json() as { status?: string; observations?: string; family?: string; isChild?: boolean };

  const updates: string[] = [];
  const values: any[] = [];

  if (body.status !== undefined) {
    const validStatuses = ['pendente', 'confirmado', 'nao_vem', 'pago_parcial', 'pago_total'];
    if (!validStatuses.includes(body.status)) {
      return errorResponse('Status inválido');
    }
    updates.push('status = ?');
    values.push(body.status);
  }

  if (body.observations !== undefined) {
    updates.push('observations = ?');
    values.push(body.observations);
  }

  if (body.family !== undefined) {
    updates.push('family = ?');
    values.push(body.family.trim());
  }

  if (body.isChild !== undefined) {
    updates.push('is_child = ?');
    values.push(body.isChild ? 1 : 0);
  }

  if (updates.length === 0) return errorResponse('Nenhum campo para atualizar');

  values.push(id);
  await db
    .prepare(`UPDATE guests SET ${updates.join(', ')} WHERE id = ?`)
    .bind(...values)
    .run();

  return jsonResponse({ success: true });
}

async function handleDeleteGuest(db: D1Database, id: string): Promise<Response> {
  await db.prepare('DELETE FROM guest_payments WHERE guest_id = ?').bind(id).run();
  await db.prepare('DELETE FROM guests WHERE id = ?').bind(id).run();
  return jsonResponse({ success: true });
}

// ==========================================
// PAGAMENTOS
// ==========================================

async function handleAddPayment(db: D1Database, guestId: string, request: Request): Promise<Response> {
  const body = await request.json() as { amount?: number; paymentDate?: string };
  const amount = body.amount;
  const paymentDate = body.paymentDate?.trim();

  if (typeof amount !== 'number' || amount <= 0) return errorResponse('Valor inválido');
  if (!paymentDate) return errorResponse('Data é obrigatória');

  const id = generateId();
  const now = new Date().toISOString();

  await db
    .prepare('INSERT INTO guest_payments (id, guest_id, amount, payment_date, created_at) VALUES (?, ?, ?, ?, ?)')
    .bind(id, guestId, amount, paymentDate, now)
    .run();

  return jsonResponse({
    payment: { id, guestId, amount, paymentDate, createdAt: now },
  }, 201);
}

async function handleDeletePayment(db: D1Database, paymentId: string): Promise<Response> {
  await db.prepare('DELETE FROM guest_payments WHERE id = ?').bind(paymentId).run();
  return jsonResponse({ success: true });
}

async function handleGetGuestPayments(db: D1Database, guestId: string): Promise<Response> {
  const result = await db
    .prepare('SELECT id, guest_id as guestId, amount, payment_date as paymentDate, created_at as createdAt FROM guest_payments WHERE guest_id = ? ORDER BY payment_date ASC')
    .bind(guestId)
    .all();
  return jsonResponse({ payments: result.results || [] });
}

// ==========================================
// COMPRAS
// ==========================================

async function handleGetShopping(db: D1Database): Promise<Response> {
  const result = await db
    .prepare('SELECT id, name, price, category, due_date as dueDate, created_at as createdAt FROM shopping_items ORDER BY created_at ASC')
    .all();

  const payments = await db
    .prepare('SELECT id, item_id as itemId, amount, payment_date as paymentDate, created_at as createdAt FROM shopping_payments ORDER BY payment_date ASC')
    .all();

  const paymentsByItem: Record<string, any[]> = {};
  for (const p of (payments.results || [])) {
    const iid = (p as any).itemId;
    if (!paymentsByItem[iid]) paymentsByItem[iid] = [];
    paymentsByItem[iid].push(p);
  }

  const enrichedItems = (result.results || []).map((item: any) => {
    const itemPayments = paymentsByItem[item.id] || [];
    const totalPaid = itemPayments.reduce((sum: number, p: any) => sum + p.amount, 0);
    return { ...item, payments: itemPayments, totalPaid };
  });

  return jsonResponse({ items: enrichedItems });
}

async function handleAddShopping(db: D1Database, request: Request): Promise<Response> {
  const body = await request.json() as { name?: string; price?: number; category?: string; dueDate?: string };
  const name = body.name?.trim();
  const price = body.price;
  const category = body.category;
  const dueDate = body.dueDate?.trim() || null;

  if (!name) return errorResponse('Nome é obrigatório');
  if (typeof price !== 'number' || price <= 0) return errorResponse('Preço inválido');
  if (!category || !['compra', 'contratacao'].includes(category)) {
    return errorResponse('Categoria inválida');
  }

  const id = generateId();
  const now = new Date().toISOString();

  await db
    .prepare('INSERT INTO shopping_items (id, name, price, category, due_date, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(id, name, price, category, dueDate, now)
    .run();

  return jsonResponse({
    item: { id, name, price, category, dueDate, totalPaid: 0, payments: [], createdAt: now },
  }, 201);
}

async function handleDeleteShopping(db: D1Database, id: string): Promise<Response> {
  await db.prepare('DELETE FROM shopping_payments WHERE item_id = ?').bind(id).run();
  await db.prepare('DELETE FROM shopping_items WHERE id = ?').bind(id).run();
  return jsonResponse({ success: true });
}

async function handleUpdateShopping(db: D1Database, id: string, request: Request): Promise<Response> {
  const body = await request.json() as { dueDate?: string | null };
  const updates: string[] = [];
  const values: any[] = [];

  if (body.dueDate !== undefined) {
    updates.push('due_date = ?');
    values.push(body.dueDate?.trim() || null);
  }

  if (updates.length === 0) return errorResponse('Nenhum campo para atualizar');

  values.push(id);
  await db
    .prepare(`UPDATE shopping_items SET ${updates.join(', ')} WHERE id = ?`)
    .bind(...values)
    .run();

  return jsonResponse({ success: true });
}

async function handleAddShoppingPayment(db: D1Database, itemId: string, request: Request): Promise<Response> {
  const body = await request.json() as { amount?: number; paymentDate?: string };
  const amount = body.amount;
  const paymentDate = body.paymentDate?.trim();

  if (typeof amount !== 'number' || amount <= 0) return errorResponse('Valor inválido');
  if (!paymentDate) return errorResponse('Data é obrigatória');

  const id = generateId();
  const now = new Date().toISOString();

  await db
    .prepare('INSERT INTO shopping_payments (id, item_id, amount, payment_date, created_at) VALUES (?, ?, ?, ?, ?)')
    .bind(id, itemId, amount, paymentDate, now)
    .run();

  return jsonResponse({
    payment: { id, itemId, amount, paymentDate, createdAt: now },
  }, 201);
}

async function handleDeleteShoppingPayment(db: D1Database, paymentId: string): Promise<Response> {
  await db.prepare('DELETE FROM shopping_payments WHERE id = ?').bind(paymentId).run();
  return jsonResponse({ success: true });
}

// ==========================================
// ROTEADOR PRINCIPAL
// ==========================================

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    try {
      // --- CONVIDADOS ---
      if (path === '/api/guests' && method === 'GET') {
        return handleGetGuests(env.DB);
      }
      if (path === '/api/guests' && method === 'POST') {
        return handleAddGuest(env.DB, request);
      }

      // --- PAGAMENTOS ---
      const paymentMatch = path.match(/^\/api\/guests\/([^/]+)\/payments$/);
      if (paymentMatch) {
        const guestId = paymentMatch[1];
        if (method === 'GET') return handleGetGuestPayments(env.DB, guestId);
        if (method === 'POST') return handleAddPayment(env.DB, guestId, request);
      }

      const deletePaymentMatch = path.match(/^\/api\/payments\/([^/]+)$/);
      if (deletePaymentMatch && method === 'DELETE') {
        return handleDeletePayment(env.DB, deletePaymentMatch[1]);
      }

      const guestMatch = path.match(/^\/api\/guests\/([^/]+)$/);
      if (guestMatch) {
        const id = guestMatch[1];
        if (method === 'PUT') return handleUpdateGuest(env.DB, id, request);
        if (method === 'DELETE') return handleDeleteGuest(env.DB, id);
      }

      // --- COMPRAS ---
      if (path === '/api/shopping' && method === 'GET') {
        return handleGetShopping(env.DB);
      }
      if (path === '/api/shopping' && method === 'POST') {
        return handleAddShopping(env.DB, request);
      }
      const shoppingMatch = path.match(/^\/api\/shopping\/([^/]+)$/);
      if (shoppingMatch) {
        const id = shoppingMatch[1];
        if (method === 'PUT') return handleUpdateShopping(env.DB, id, request);
        if (method === 'DELETE') return handleDeleteShopping(env.DB, id);
      }

      // --- PAGAMENTOS DE COMPRAS ---
      const shoppingPaymentMatch = path.match(/^\/api\/shopping\/([^/]+)\/payments$/);
      if (shoppingPaymentMatch) {
        const itemId = shoppingPaymentMatch[1];
        if (method === 'POST') return handleAddShoppingPayment(env.DB, itemId, request);
      }

      const deleteShoppingPaymentMatch = path.match(/^\/api\/shopping-payments\/([^/]+)$/);
      if (deleteShoppingPaymentMatch && method === 'DELETE') {
        return handleDeleteShoppingPayment(env.DB, deleteShoppingPaymentMatch[1]);
      }

      // --- CONFIG ---
      const configMatch = path.match(/^\/api\/config\/([\w-]+)$/);
      if (configMatch && method === 'GET') {
        const key = configMatch[1];
        const row = await env.DB.prepare('SELECT value FROM config WHERE key = ?').bind(key).first<{ value: string }>();
        if (!row) return errorResponse('Configuração não encontrada', 404);
        return jsonResponse({ value: row.value });
      }

      // --- HEALTH CHECK ---
      if (path === '/' || path === '/health') {
        return jsonResponse({
          status: 'ok',
          service: 'Party Planner API',
          timestamp: new Date().toISOString(),
        });
      }

      return errorResponse('Rota não encontrada', 404);
    } catch (error) {
      console.error('Worker error:', error);
      return errorResponse('Erro interno do servidor', 500);
    }
  },
};

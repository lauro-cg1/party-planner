// ==========================================
// CLOUDFLARE WORKER - API DO PLANEJADOR DE FESTA
// ==========================================
// Este Worker serve como backend para o app,
// usando Cloudflare D1 como banco de dados.
// ==========================================

export interface Env {
  DB: D1Database;
}

// Gera UUID simples
function generateId(): string {
  return crypto.randomUUID();
}

// Cabeçalhos CORS
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
// ROTAS
// ==========================================

async function handleGetGuests(db: D1Database): Promise<Response> {
  const result = await db
    .prepare('SELECT id, name, status, created_at as createdAt FROM guests ORDER BY created_at ASC')
    .all();
  return jsonResponse({ guests: result.results });
}

async function handleAddGuest(db: D1Database, request: Request): Promise<Response> {
  const body = await request.json() as { name?: string };
  const name = body.name?.trim();
  if (!name) return errorResponse('Nome é obrigatório');

  const id = generateId();
  const now = new Date().toISOString();

  await db
    .prepare('INSERT INTO guests (id, name, status, created_at) VALUES (?, ?, ?, ?)')
    .bind(id, name, 'pendente', now)
    .run();

  return jsonResponse({
    guest: { id, name, status: 'pendente', createdAt: now },
  }, 201);
}

async function handleUpdateGuest(db: D1Database, id: string, request: Request): Promise<Response> {
  const body = await request.json() as { status?: string };
  const status = body.status;

  const validStatuses = ['pendente', 'confirmado', 'nao_vem', 'pago'];
  if (!status || !validStatuses.includes(status)) {
    return errorResponse('Status inválido');
  }

  await db
    .prepare('UPDATE guests SET status = ? WHERE id = ?')
    .bind(status, id)
    .run();

  return jsonResponse({ success: true });
}

async function handleDeleteGuest(db: D1Database, id: string): Promise<Response> {
  await db.prepare('DELETE FROM guests WHERE id = ?').bind(id).run();
  return jsonResponse({ success: true });
}

async function handleGetShopping(db: D1Database): Promise<Response> {
  const result = await db
    .prepare('SELECT id, name, price, category, created_at as createdAt FROM shopping_items ORDER BY created_at ASC')
    .all();
  return jsonResponse({ items: result.results });
}

async function handleAddShopping(db: D1Database, request: Request): Promise<Response> {
  const body = await request.json() as { name?: string; price?: number; category?: string };
  const name = body.name?.trim();
  const price = body.price;
  const category = body.category;

  if (!name) return errorResponse('Nome é obrigatório');
  if (typeof price !== 'number' || price <= 0) return errorResponse('Preço inválido');
  if (!category || !['compra', 'contratacao'].includes(category)) {
    return errorResponse('Categoria inválida');
  }

  const id = generateId();
  const now = new Date().toISOString();

  await db
    .prepare('INSERT INTO shopping_items (id, name, price, category, created_at) VALUES (?, ?, ?, ?, ?)')
    .bind(id, name, price, category, now)
    .run();

  return jsonResponse({
    item: { id, name, price, category, createdAt: now },
  }, 201);
}

async function handleDeleteShopping(db: D1Database, id: string): Promise<Response> {
  await db.prepare('DELETE FROM shopping_items WHERE id = ?').bind(id).run();
  return jsonResponse({ success: true });
}

// ==========================================
// ROTEADOR PRINCIPAL
// ==========================================

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Tratar CORS preflight
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
      const guestMatch = path.match(/^\/api\/guests\/(.+)$/);
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
      const shoppingMatch = path.match(/^\/api\/shopping\/(.+)$/);
      if (shoppingMatch) {
        const id = shoppingMatch[1];
        if (method === 'DELETE') return handleDeleteShopping(env.DB, id);
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

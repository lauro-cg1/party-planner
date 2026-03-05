// ==========================================
// SERVIÇO GEMINI AI - VERTEX AI REST API
// ==========================================

const API_BASE_URL = 'https://party-planner-api.laurocg2.workers.dev';
const VERTEX_MODEL = 'gemini-3.1-pro-preview';
const VERTEX_URL = `https://aiplatform.googleapis.com/v1/publishers/google/models/${VERTEX_MODEL}:generateContent`;

const SYSTEM_PROMPT = `Você é uma assistente de um organizador de uma festa junina que irá acontecer no dia 11 de julho. Essa festa tem início as 18 horas e acontecerá entre as cidades de valinhos e vinhedo, local aonde irá ser comprado os materiais. A festa terá banda, buffet com bebida e comida à vontade pelo preço de 150 reais por pessoa, com uma média de 40 convidados. Responda as perguntas utilizando o contexto em que você se encontra.`;

interface VertexMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

let history: VertexMessage[] = [];
let cachedApiKey: string | null = null;

async function getApiKey(): Promise<string> {
  if (cachedApiKey) return cachedApiKey;
  const response = await fetch(`${API_BASE_URL}/api/config/gemini-key`);
  if (!response.ok) throw new Error('Não foi possível obter a chave da API');
  const data = await response.json() as { value: string };
  cachedApiKey = data.value;
  return cachedApiKey;
}

export async function sendMessage(message: string): Promise<string> {
  try {
    const apiKey = await getApiKey();

    history.push({ role: 'user', parts: [{ text: message }] });

    const body = {
      system_instruction: {
        parts: [{ text: SYSTEM_PROMPT }],
      },
      contents: history,
    };

    const response = await fetch(`${VERTEX_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`API error ${response.status}: ${errorData}`);
    }

    const data = await response.json() as any;
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'Sem resposta.';

    history.push({ role: 'model', parts: [{ text }] });

    return text;
  } catch (error: any) {
    console.error('Vertex AI error:', error);
    // Remove last user message on error so history stays consistent
    if (history.length > 0 && history[history.length - 1].role === 'user') {
      history.pop();
    }
    const msg = error?.message || String(error);
    if (msg.includes('API_KEY_INVALID') || msg.includes('API key') || msg.includes('401') || msg.includes('403')) {
      return '⚠️ A chave da API está inválida ou foi revogada. Gere uma nova chave.';
    }
    return `Desculpe, houve um erro: ${msg}`;
  }
}

export function resetChat(): void {
  history = [];
}

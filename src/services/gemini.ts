// ==========================================
// SERVIÇO GEMINI AI - CHATBOT
// ==========================================

import { GoogleGenerativeAI, ChatSession } from '@google/generative-ai';

const API_BASE_URL = 'https://party-planner-api.laurocg2.workers.dev';

const SYSTEM_PROMPT = `Você é uma assistente de um organizador de uma festa junina que irá acontecer no dia 11 de julho. Essa festa tem início as 18 horas e acontecerá entre as cidades de valinhos e vinhedo, local aonde irá ser comprado os materiais. A festa terá banda, buffet com bebida e comida à vontade pelo preço de 150 reais por pessoa, com uma média de 40 convidados. Responda as perguntas utilizando o contexto em que você se encontra.`;

let chat: ChatSession | null = null;
let cachedApiKey: string | null = null;

async function getApiKey(): Promise<string> {
  if (cachedApiKey) return cachedApiKey;
  const response = await fetch(`${API_BASE_URL}/api/config/gemini-key`);
  if (!response.ok) throw new Error('Não foi possível obter a chave da API');
  const data = await response.json() as { value: string };
  cachedApiKey = data.value;
  return cachedApiKey;
}

async function getChat(): Promise<ChatSession> {
  if (chat) return chat;
  const apiKey = await getApiKey();
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash-lite',
    systemInstruction: SYSTEM_PROMPT,
  });
  chat = model.startChat({ history: [] });
  return chat;
}

export async function sendMessage(message: string): Promise<string> {
  try {
    const currentChat = await getChat();
    const result = await currentChat.sendMessage(message);
    const response = result.response;
    return response.text();
  } catch (error: any) {
    console.error('Gemini error:', error);
    const msg = error?.message || String(error);
    if (msg.includes('API_KEY_INVALID') || msg.includes('API key') || msg.includes('401') || msg.includes('403')) {
      return '⚠️ A chave da API Gemini está inválida ou foi revogada. Gere uma nova chave em aistudio.google.com.';
    }
    return `Desculpe, houve um erro: ${msg}`;
  }
}

export function resetChat(): void {
  chat = null;
}

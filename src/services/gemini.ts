// ==========================================
// SERVIÇO GEMINI AI - CHATBOT
// ==========================================

import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = 'AIzaSyBreqAc1OAx8P39pf9vGbZpA6YKvPh5xmE';

const SYSTEM_PROMPT = `Você é uma assistente de um organizador de uma festa junina que irá acontecer no dia 11 de julho. Essa festa tem início as 18 horas e acontecerá entre as cidades de valinhos e vinhedo, local aonde irá ser comprado os materiais. A festa terá banda, buffet com bebida e comida à vontade pelo preço de 150 reais por pessoa, com uma média de 40 convidados. Responda as perguntas utilizando o contexto em que você se encontra.`;

const genAI = new GoogleGenerativeAI(API_KEY);

const model = genAI.getGenerativeModel({
  model: 'gemini-2.0-flash',
  systemInstruction: SYSTEM_PROMPT,
});

let chat: ReturnType<typeof model.startChat> | null = null;

function getChat() {
  if (!chat) {
    chat = model.startChat({
      history: [],
    });
  }
  return chat;
}

export async function sendMessage(message: string): Promise<string> {
  try {
    const currentChat = getChat();
    const result = await currentChat.sendMessage(message);
    const response = result.response;
    return response.text();
  } catch (error) {
    console.error('Gemini error:', error);
    return 'Desculpe, houve um erro ao processar sua mensagem. Tente novamente.';
  }
}

export function resetChat(): void {
  chat = null;
}

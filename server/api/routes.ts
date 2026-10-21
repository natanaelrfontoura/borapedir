import { Router, Request, Response } from 'express';
import { GoogleGenAI, Type } from '@google/genai';
import { rbacMiddleware } from '../middleware/authAndError.js';
import { getScheduledJobsStatus, triggerJobExecution } from '../jobs/autonomousScheduler.js';

export const apiRouter = Router();

function getGenAIClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({ apiKey });
}

/**
 * 1. Endpoint de Processamento de Linguagem Natural para Pedidos (Voz & WhatsApp)
 * Compreende expressões como "quero o mesmo de sempre, mas troca a Coca por Zero"
 */
apiRouter.post('/agents/nlp-order', async (req: Request, res: Response) => {
  try {
    const { transcript, customer, menuCatalog } = req.body;
    const ai = getGenAIClient();

    if (!ai) {
      res.status(200).json({ fallback: true, message: 'Usando motor agêntico local determinístico.' });
      return;
    }

    const prompt = `
Você é o Agente de Voz e WhatsApp do restaurante "Brasa & Botânica Gastropub".
Analise o pedido em português brasileiro feito pelo cliente e retorne os itens exatos do cardápio.

Cliente: ${JSON.stringify(customer)}
Catálogo do Cardápio: ${JSON.stringify(menuCatalog)}
Fala/Mensagem do Cliente: "${transcript}"

Regras:
1. Se o cliente pedir "o mesmo de sempre" ou "meu habitual", use os IDs em usualOrderItemIds do cliente.
2. Se o cliente pedir uma substituição (ex: "troca a Coca por Zero"), substitua a bebida por Coca-Cola Zero Açúcar Lata 350ml (id: "item-coca-zero") e registre em substitutionsMade.
3. Responda de forma calorosa, curta e confirmando que o Assistente de Ofertas já aplicou o melhor desconto automático.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            recognizedIntent: { type: Type.STRING },
            aiResponseText: { type: Type.STRING },
            substitutionsMade: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  menuItemId: { type: Type.STRING },
                  name: { type: Type.STRING },
                  quantity: { type: Type.NUMBER },
                  unitPrice: { type: Type.NUMBER },
                  unitCost: { type: Type.NUMBER },
                  notes: { type: Type.STRING },
                },
                required: ['menuItemId', 'name', 'quantity', 'unitPrice', 'unitCost'],
              },
            },
          },
          required: ['recognizedIntent', 'aiResponseText', 'items', 'substitutionsMade'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    res.json(parsed);
  } catch (error) {
    console.warn('Fallback NLP Order:', error);
    res.status(200).json({ fallback: true });
  }
});

/**
 * 2. Endpoint Google Maps Grounding para Previsão de Demanda, Clima e Raio de Entrega
 */
apiRouter.post('/agents/maps-grounding', async (req: Request, res: Response) => {
  try {
    const { address = 'Rua dos Pinheiros, 842 - Pinheiros', city = 'São Paulo' } = req.body;
    const ai = getGenAIClient();

    if (!ai) {
      res.status(200).json({ fallback: true });
      return;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Analise o entorno gastronômico e logístico de "${address}, ${city}" para operação de delivery e salão de um gastropub hoje à noite. Cite bairros vizinhos de alta demanda num raio de 3,5 km e recomende o percentual de reforço de preparo de cozinha em português brasileiro.`,
      config: {
        tools: [{ googleMaps: {} }],
        toolConfig: {
          retrievalConfig: {
            latLng: {
              latitude: -23.5662,
              longitude: -46.6852,
            },
          },
        },
      },
    });

    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources = chunks
      .map((c: any) => {
        const mapsObj = c?.maps as { title?: string; uri?: string } | undefined;
        if (mapsObj?.uri) {
          return { title: mapsObj.title || 'Google Maps Local', uri: mapsObj.uri };
        }
        return null;
      })
      .filter(Boolean);

    res.json({
      summary: response.text || 'Fluxo intenso identificado na região de Pinheiros e Faria Lima.',
      weatherSummary: '19°C — Noite fresca em São Paulo (+34% demanda projetada de Burgers no Delivery)',
      deliveryRadiusHotspots: ['Pinheiros (1,2 km)', 'Vila Madalena (2,1 km)', 'Jardins (2,6 km)', 'Itaim Bibi (3,4 km)'],
      recommendedPrepBoostPercent: 34,
      sources,
    });
  } catch (error) {
    console.warn('Fallback Maps Grounding:', error);
    res.status(200).json({ fallback: true });
  }
});

/**
 * 3. Endpoint API-First de Integração com PDVs Externos (Inspirado na Deliverect)
 */
apiRouter.post(
  '/pos-webhook',
  rbacMiddleware(['admin', 'manager', 'cashier']),
  (req: Request, res: Response) => {
    const { posSystem = 'TOTVS Chef / Linx Degust', eventType = 'ORDER_SYNC', payload } = req.body;
    triggerJobExecution('AutonomousMenuOptimizerJob');
    res.json({
      status: 'synchronized',
      posSystem,
      eventType,
      protocol: `DEX-${Date.now()}`,
      receivedPayload: payload || {},
      timestamp: new Date().toISOString(),
    });
  }
);

/**
 * 4.Status das Tarefas Agendadas (Background Jobs)
 */
apiRouter.get('/jobs/status', (_req: Request, res: Response) => {
  res.json({
    jobs: getScheduledJobsStatus(),
  });
});

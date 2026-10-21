/**
 * @file /src/services/geminiClient.ts
 * @description Cliente para comunicação com o runtime Node.js (/api/agents/*) que executa o Gemini API e Google Maps Grounding,
 * com fallback local imediato caso o restaurante esteja operando em modo Offline-First.
 */

import { Customer, MenuItem, OrderItem } from '../models/types';
import { parseNaturalLanguageOrder } from '../agents/decisionEngine';

export interface NlpOrderApiResponse {
  recognizedIntent: string;
  items: OrderItem[];
  aiResponseText: string;
  substitutionsMade: string[];
  usedServerGemini: boolean;
}

export async function processVoiceOrWhatsappOrderWithAI(
  transcript: string,
  customer: Customer,
  menuItems: MenuItem[],
  isOffline: boolean
): Promise<NlpOrderApiResponse> {
  // Calcula o baseline local determinístico primeiro (garante funcionamento offline instantâneo)
  const localParsed = parseNaturalLanguageOrder(transcript, customer, menuItems);

  if (isOffline) {
    return {
      ...localParsed,
      usedServerGemini: false,
    };
  }

  try {
    const response = await fetch('/api/agents/nlp-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transcript,
        customer: {
          name: customer.name,
          usualOrderDescription: customer.usualOrderDescription,
          usualOrderItemIds: customer.usualOrderItemIds,
          cashbackBalance: customer.cashbackBalance,
          loyaltyPoints: customer.loyaltyPoints,
        },
        menuCatalog: menuItems.map((m) => ({
          id: m.id,
          name: m.name,
          price: m.price,
          cost: m.cost,
          category: m.category,
        })),
      }),
    });

    if (!response.ok) {
      return { ...localParsed, usedServerGemini: false };
    }

    const data = await response.json();
    if (data && Array.isArray(data.items) && data.items.length > 0) {
      return {
        recognizedIntent: data.recognizedIntent || localParsed.recognizedIntent,
        items: data.items,
        aiResponseText: data.aiResponseText || localParsed.aiResponseText,
        substitutionsMade: data.substitutionsMade || localParsed.substitutionsMade,
        usedServerGemini: true,
      };
    }
    return { ...localParsed, usedServerGemini: false };
  } catch {
    return { ...localParsed, usedServerGemini: false };
  }
}

export interface MapsDemandInsight {
  summary: string;
  weatherSummary: string;
  deliveryRadiusHotspots: string[];
  recommendedPrepBoostPercent: number;
  sources: { title: string; uri: string }[];
}

export async function fetchMapsGroundingDemandInsight(
  address: string,
  city: string,
  isOffline: boolean
): Promise<MapsDemandInsight> {
  const fallback: MapsDemandInsight = {
    summary:
      'Alta concentração gastronômica e fluxo corporativo/noturno em Pinheiros (Raio 3km). Tráfego intenso na Av. Rebouças e Faria Lima favorece pedidos via WhatsApp e Delivery Direto entre 19h30 e 22h30.',
    weatherSummary: '19°C — Noite fresca com garoa leve em São Paulo (+34% conversão em Burgers e Pratos Quentes)',
    deliveryRadiusHotspots: ['Pinheiros (1,2 km)', 'Vila Madalena (2,1 km)', 'Jardins (2,6 km)', 'Itaim Bibi (3,4 km)'],
    recommendedPrepBoostPercent: 34,
    sources: [
      { title: 'Google Maps — Rua dos Pinheiros, São Paulo', uri: 'https://maps.google.com/?q=Rua+dos+Pinheiros+842+Sao+Paulo' },
    ],
  };

  if (isOffline) return fallback;

  try {
    const res = await fetch('/api/agents/maps-grounding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address, city }),
    });
    if (!res.ok) return fallback;
    const data = await res.json();
    return {
      summary: data.summary || fallback.summary,
      weatherSummary: data.weatherSummary || fallback.weatherSummary,
      deliveryRadiusHotspots: data.deliveryRadiusHotspots || fallback.deliveryRadiusHotspots,
      recommendedPrepBoostPercent: data.recommendedPrepBoostPercent || fallback.recommendedPrepBoostPercent,
      sources: data.sources?.length ? data.sources : fallback.sources,
    };
  } catch {
    return fallback;
  }
}

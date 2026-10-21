import { MenuItem, RecipeIngredient, TaxClassification2026 } from '../models/types';

export function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value || 0);
}

export function formatPercent(value: number, decimals = 1): string {
  return `${(value || 0).toFixed(decimals)}%`;
}

export function formatNumber(value: number, decimals = 1): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(value || 0);
}

/**
 * Calcula o Score Agêntico de Prioridade no Cardápio (0 a 100)
 * Fórmula ponderada: Margem (45%) + Taxa de Conversão (35%) + Saúde do Estoque (20%)
 */
export function calculateMenuPriorityScore(item: Pick<MenuItem, 'price' | 'cost' | 'conversionRate' | 'stockAvailable'>): {
  marginPercent: number;
  aiPriorityScore: number;
  aiBadge: string;
} {
  const marginPercent = item.price > 0 ? ((item.price - item.cost) / item.price) * 100 : 0;
  const conversionNormalized = Math.min(100, item.conversionRate * 320); // Ex: 25% conv -> 80 pts
  const stockNormalized = item.stockAvailable <= 0 ? 0 : Math.min(100, (item.stockAvailable / 40) * 100);

  const rawScore = marginPercent * 0.45 + conversionNormalized * 0.35 + stockNormalized * 0.2;
  const aiPriorityScore = item.stockAvailable <= 0 ? 5 : Math.round(Math.min(99, Math.max(10, rawScore)));

  let aiBadge = 'Equilibrado';
  if (item.stockAvailable <= 3) {
    aiBadge = 'Estoque Crítico — Rebaixado';
  } else if (marginPercent >= 68 && item.conversionRate >= 0.2) {
    aiBadge = 'Top Margem & Conversão (#1 IA)';
  } else if (marginPercent >= 65) {
    aiBadge = 'Alta Margem — Destaque IA';
  } else if (item.conversionRate >= 0.24) {
    aiBadge = 'Ímã de Pedidos';
  }

  return {
    marginPercent: Number(marginPercent.toFixed(1)),
    aiPriorityScore,
    aiBadge,
  };
}

/**
 * Calcula Ficha Técnica (Custo Total e CMV %)
 */
export function calculateRecipeMetrics(
  ingredients: RecipeIngredient[],
  yieldPortions: number,
  sellingPrice: number
): {
  totalIngredientCost: number;
  unitPortionCost: number;
  cmvPercent: number;
} {
  const totalIngredientCost = ingredients.reduce((sum, ing) => {
    const line = ing.quantity * ing.unitCost * (ing.correctionFactor || 1);
    return sum + line;
  }, 0);

  const unitPortionCost = yieldPortions > 0 ? totalIngredientCost / yieldPortions : totalIngredientCost;
  const cmvPercent = sellingPrice > 0 ? (unitPortionCost / sellingPrice) * 100 : 0;

  return {
    totalIngredientCost: Number(totalIngredientCost.toFixed(2)),
    unitPortionCost: Number(unitPortionCost.toFixed(2)),
    cmvPercent: Number(cmvPercent.toFixed(1)),
  };
}

/**
 * Motor Tributário Reforma 2026 (LC 214/2025 - IBS / CBS / Imposto Seletivo)
 * Retorna alíquotas efetivas e preço dinâmico sugerido para preservar margem líquida.
 */
export function calculateTaxReform2026(
  classification: TaxClassification2026,
  currentPrice: number,
  unitCost: number,
  targetNetMarginPercent = 52
): {
  ibsRate: number;
  cbsRate: number;
  isRate: number;
  effectiveTaxPercent: number;
  taxAmount: number;
  suggestedDynamicPrice: number;
  regimeLabel: string;
} {
  let ibsRate = 6.9;
  let cbsRate = 3.7;
  let isRate = 0;
  let regimeLabel = 'Regime Específico Bares & Restaurantes (-60% Alíquota)';

  switch (classification) {
    case 'ALIMENTACAO_PREPARADA_REDUCAO_60':
      // Redução de 60% sobre alíquota padrão de 26.5% -> ~10.6% total (IBS 6.9% + CBS 3.7%)
      ibsRate = 6.9;
      cbsRate = 3.7;
      isRate = 0;
      regimeLabel = 'Alimentação Preparada (-60% IBS/CBS)';
      break;
    case 'CESTA_BASICA_ALIQUOTA_ZERO':
      ibsRate = 0;
      cbsRate = 0;
      isRate = 0;
      regimeLabel = 'Alíquota Zero (Cesta Básica Nacional)';
      break;
    case 'PADRAO_BEBIDAS_INDUSTRIALIZADOS':
      ibsRate = 17.7;
      cbsRate = 8.8;
      isRate = 0;
      regimeLabel = 'Alíquota Padrão Integral (Industrializados)';
      break;
    case 'IMPOSTO_SELETIVO_ALCOOL_ACUCAR':
      ibsRate = 17.7;
      cbsRate = 8.8;
      isRate = 4.5;
      regimeLabel = 'Padrão + Imposto Seletivo (Bebidas Alcoólicas/Açucaradas)';
      break;
  }

  const effectiveTaxPercent = Number((ibsRate + cbsRate + isRate).toFixed(1));
  const taxAmount = Number(((currentPrice * effectiveTaxPercent) / 100).toFixed(2));

  // Preço sugerido pela IA para preservar targetNetMarginPercent após impostos + CMV
  const denominator = 1 - (effectiveTaxPercent + targetNetMarginPercent) / 100;
  const rawSuggested = denominator > 0.15 ? unitCost / denominator : currentPrice * 1.15;
  // Arredonda para .90 comercial
  const suggestedDynamicPrice = Number((Math.ceil(rawSuggested) - 0.1).toFixed(2));

  return {
    ibsRate,
    cbsRate,
    isRate,
    effectiveTaxPercent,
    taxAmount,
    suggestedDynamicPrice,
    regimeLabel,
  };
}

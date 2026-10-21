import React, { useState, useMemo } from 'react';
import {
  Receipt,
  Scale,
  TrendingUp,
  CheckCircle2,
  PlusCircle,
  Sparkles,
  FileCheck2,
} from 'lucide-react';
import { useStore } from '../services/storeContext';
import { calculateTaxReform2026, formatBRL } from '../utils/formatters';

export const FinancialFiscalPage: React.FC = () => {
  const {
    financialRecords,
    menuItems,
    orders,
    layoutMode,
    addFinancialRecord,
    triggerTaxReformPricingAgent,
  } = useStore();

  const isDark = layoutMode === 'gastropub_warm';
  const cardSurface = isDark
    ? 'bg-[#292524] border-stone-700 text-stone-100'
    : 'bg-white border-stone-200 text-stone-900 shadow-xs';

  const [newDesc, setNewDesc] = useState('');
  const [newAmount, setNewAmount] = useState('1250');
  const [newType, setNewType] = useState<'payable' | 'receivable'>('payable');

  const dreMetrics = useMemo(() => {
    const grossRevenue = financialRecords
      .filter((r) => r.type === 'revenue')
      .reduce((s, r) => s + r.amount, 0);

    const ibsDebits = financialRecords
      .filter((r) => r.type === 'revenue')
      .reduce((s, r) => s + (r.taxIbsAmount || 0), 0);
    const cbsDebits = financialRecords
      .filter((r) => r.type === 'revenue')
      .reduce((s, r) => s + (r.taxCbsAmount || 0), 0);

    const ibsCredits = financialRecords
      .filter((r) => r.category === 'Insumos & Mercadorias (CMV)')
      .reduce((s, r) => s + (r.taxIbsAmount || 0), 0);
    const cbsCredits = financialRecords
      .filter((r) => r.category === 'Insumos & Mercadorias (CMV)')
      .reduce((s, r) => s + (r.taxCbsAmount || 0), 0);

    const netTaxes2026 = Math.max(0, ibsDebits + cbsDebits - (ibsCredits + cbsCredits));
    const netRevenue = grossRevenue - netTaxes2026;

    const cmvTotal = financialRecords
      .filter((r) => r.category === 'Insumos & Mercadorias (CMV)')
      .reduce((s, r) => s + r.amount, 0);

    const grossProfit = netRevenue - cmvTotal;

    const opexTotal = financialRecords
      .filter(
        (r) =>
          (r.type === 'expense' || r.type === 'payable') &&
          r.category !== 'Insumos & Mercadorias (CMV)' &&
          r.category !== 'Impostos (IBS/CBS/IS)'
      )
      .reduce((s, r) => s + r.amount, 0);

    const ebitda = grossProfit - opexTotal;
    const ebitdaMargin = grossRevenue > 0 ? (ebitda / grossRevenue) * 100 : 0;

    return {
      grossRevenue,
      ibsDebits,
      cbsDebits,
      taxCredits: ibsCredits + cbsCredits,
      netTaxes2026,
      netRevenue,
      cmvTotal,
      grossProfit,
      opexTotal,
      ebitda,
      ebitdaMargin,
    };
  }, [financialRecords]);

  const handleCreateEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDesc.trim()) return;
    await addFinancialRecord({
      type: newType,
      category: newType === 'payable' ? 'Ocupação & Utilidades' : 'Vendas Salão',
      description: newDesc,
      amount: parseFloat(newAmount) || 0,
      paymentMethod: 'PIX / Boleto',
      status: 'pending',
      dueDate: '2026-10-10',
    });
    setNewDesc('');
  };

  return (
    <div className="space-y-6">
      {/* Resumo Financeiro Simples e Direto */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={`rounded-3xl border p-5 ${cardSurface}`}>
          <span className="text-xs font-bold text-stone-500">Vendas Totais do Mês</span>
          <p className="text-2xl font-extrabold mt-1">{formatBRL(dreMetrics.grossRevenue)}</p>
          <span className="text-xs font-bold text-emerald-600">
            Salão + Delivery Próprio
          </span>
        </div>

        <div className={`rounded-3xl border p-5 ${cardSurface}`}>
          <span className="text-xs font-bold text-stone-500">Gasto com Mercadoria (Compras)</span>
          <p className="text-2xl font-extrabold mt-1">{formatBRL(dreMetrics.cmvTotal)}</p>
          <span className="text-xs font-bold text-stone-500">
            {((dreMetrics.cmvTotal / dreMetrics.grossRevenue) * 100).toFixed(1)}% das vendas
          </span>
        </div>

        <div className={`rounded-3xl border p-5 ${cardSurface}`}>
          <span className="text-xs font-bold text-stone-500">Imposto com Desconto deNotas</span>
          <p className="text-2xl font-extrabold text-amber-600 mt-1">
            {formatBRL(dreMetrics.netTaxes2026)}
          </p>
          <span className="text-xs font-bold text-emerald-600">
            Economia de {formatBRL(dreMetrics.taxCredits)} nas notas de entrada
          </span>
        </div>

        <div className="rounded-3xl border-2 border-emerald-500 bg-emerald-50 text-emerald-950 p-5 shadow-xs">
          <span className="text-xs font-extrabold uppercase text-emerald-700">
            Lucro Livre no Bolso (EBITDA)
          </span>
          <p className="text-2xl font-extrabold text-emerald-700 mt-1">
            {formatBRL(dreMetrics.ebitda)}
          </p>
          <span className="text-xs font-extrabold text-emerald-800">
            {dreMetrics.ebitdaMargin.toFixed(1)}% de margem líquida
          </span>
        </div>
      </div>

      {/* Resultado do Mês (DRE) + Contas a Pagar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className={`lg:col-span-7 rounded-3xl border p-6 space-y-4 ${cardSurface}`}>
          <div className="flex items-center justify-between border-b border-stone-200/60 pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#D94E1F]" />
              <h2 className="text-base font-extrabold">
                Resultado do Restaurante no Mês (DRE Simplificado)
              </h2>
            </div>
            <span className="text-xs font-bold text-stone-500">Setembro / 2026</span>
          </div>

          <div className="space-y-2.5 text-sm">
            <div className="flex justify-between py-2 border-b border-stone-200/60 font-extrabold">
              <span>(+) Total de Vendas (Salão + WhatsApp + QR)</span>
              <span>{formatBRL(dreMetrics.grossRevenue)}</span>
            </div>
            <div className="flex justify-between py-1.5 text-stone-500 pl-3">
              <span>(-) Impostos sobre Vendas (Regime Reduzido Restaurantes)</span>
              <span className="text-red-600 font-bold">
                -{formatBRL(dreMetrics.ibsDebits + dreMetrics.cbsDebits)}
              </span>
            </div>
            <div className="flex justify-between py-1.5 text-emerald-600 font-bold pl-3">
              <span>(+) Desconto de Imposto pelas Notas de Compras</span>
              <span>+{formatBRL(dreMetrics.taxCredits)}</span>
            </div>
            <div className="flex justify-between py-2.5 px-3 rounded-xl bg-stone-100 text-stone-900 font-extrabold">
              <span>(=) Vendas Líquidas</span>
              <span>{formatBRL(dreMetrics.netRevenue)}</span>
            </div>
            <div className="flex justify-between py-1.5 text-stone-500 pl-3">
              <span>(-) Custo dos Ingredientes Usados (Carnes, Pães, Bebidas)</span>
              <span className="text-red-600 font-bold">-{formatBRL(dreMetrics.cmvTotal)}</span>
            </div>
            <div className="flex justify-between py-1.5 text-stone-500 pl-3">
              <span>(-) Despesas Fixas (Equipe, Aluguel, Luz, Gás)</span>
              <span className="text-red-600 font-bold">-{formatBRL(dreMetrics.opexTotal)}</span>
            </div>
            <div className="flex justify-between py-4 px-4 rounded-2xl bg-emerald-600 text-white font-extrabold text-base shadow-sm">
              <span>(=) LUCRO FINAL DO RESTAURANTE</span>
              <span>
                {formatBRL(dreMetrics.ebitda)} ({dreMetrics.ebitdaMargin.toFixed(1)}%)
              </span>
            </div>
          </div>
        </div>

        {/* Contas do Mês */}
        <div className={`lg:col-span-5 rounded-3xl border p-6 space-y-4 ${cardSurface}`}>
          <h3 className="text-base font-extrabold flex items-center gap-2">
            <Receipt className="w-5 h-5 text-[#D94E1F]" />
            <span>Contas a Pagar e Receber</span>
          </h3>

          <form
            onSubmit={handleCreateEntry}
            className="space-y-3 bg-stone-100/80 p-4 rounded-2xl border border-stone-200 text-stone-900"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Ex: Conta de Gás, Fornecedor..."
                className="bg-white border border-stone-300 rounded-xl px-3 py-2 text-xs font-bold text-stone-900"
              />
              <div className="flex gap-1.5">
                <input
                  type="number"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  className="w-24 bg-white border border-stone-300 rounded-xl px-2.5 py-2 text-xs font-bold text-stone-900"
                />
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as 'payable' | 'receivable')}
                  className="flex-1 bg-white border border-stone-300 rounded-xl px-2 py-2 text-xs font-bold text-stone-900"
                >
                  <option value="payable">A Pagar</option>
                  <option value="receivable">A Receber</option>
                </select>
              </div>
            </div>
            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-[#D94E1F] hover:bg-[#B83D14] text-white text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Adicionar Conta</span>
            </button>
          </form>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {financialRecords.map((rec) => (
              <div
                key={rec.id}
                className="p-3 rounded-2xl bg-stone-100/70 text-stone-900 flex items-center justify-between text-xs"
              >
                <div className="min-w-0 pr-2">
                  <p className="font-extrabold truncate">{rec.description}</p>
                  <span className="text-stone-500">
                    {rec.category} • Vence: {rec.dueDate}
                  </span>
                </div>
                <span
                  className={`font-extrabold text-sm shrink-0 ${
                    rec.type === 'revenue' || rec.type === 'receivable'
                      ? 'text-emerald-700'
                      : 'text-red-600'
                  }`}
                >
                  {rec.type === 'revenue' || rec.type === 'receivable' ? '+' : '-'}
                  {formatBRL(rec.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Cupom Fiscal Automático & Sugestão de Preços */}
      <div className={`rounded-3xl border p-6 space-y-4 ${cardSurface}`}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200/60 pb-4">
          <div>
            <h2 className="text-base font-extrabold flex items-center gap-2">
              <Scale className="w-5 h-5 text-emerald-600" />
              <span>Tabela de Preços & Cupom Fiscal Automático (NFC-e)</span>
            </h2>
            <p className="text-xs text-stone-500">
              Veja quanto cada prato paga de imposto e o preço ideal sugerido para você manter mais de 50% de lucro limpo.
            </p>
          </div>
          <button
            onClick={triggerTaxReformPricingAgent}
            className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Sparkles className="w-4 h-4" />
            <span>Aplicar Preços Sugeridos no Cardápio</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {menuItems.map((item) => {
            const taxInfo = calculateTaxReform2026(
              item.taxClassification2026,
              item.price,
              item.cost
            );
            return (
              <div
                key={item.id}
                className="p-4 rounded-2xl bg-stone-100/80 text-stone-900 space-y-2 flex flex-col justify-between"
              >
                <div>
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                    Imposto: {taxInfo.effectiveTaxPercent}%
                  </span>
                  <h4 className="text-sm font-extrabold mt-1.5">{item.name}</h4>
                </div>
                <div className="pt-2 border-t border-stone-200 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-stone-500 block">Preço Hoje</span>
                    <span className="text-sm font-extrabold">{formatBRL(item.price)}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-emerald-700 font-bold block">Sugerido Ideal</span>
                    <span className="text-sm font-extrabold text-emerald-700">
                      {formatBRL(taxInfo.suggestedDynamicPrice)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Cupons Fiscais Emitidos */}
        <div className="pt-3 border-t border-stone-200/60">
          <p className="text-xs font-extrabold uppercase text-stone-500 mb-2 flex items-center gap-1.5">
            <FileCheck2 className="w-4 h-4 text-emerald-600" />
            <span>Últimos Cupons Fiscais (NFC-e) Emitidos Sozinhos ao Fechar Pedido:</span>
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {orders.slice(0, 3).map((o) => (
              <div
                key={o.id}
                className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-stone-900 flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-extrabold block">Pedido #{o.orderNumber} — {o.customerName}</span>
                  <span className="text-stone-500">Cupom autorizado na Sefaz ✓</span>
                </div>
                <span className="text-sm font-extrabold text-emerald-700">
                  {formatBRL(o.total)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

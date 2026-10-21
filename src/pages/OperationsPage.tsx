import React, { useState } from 'react';
import {
  ChefHat,
  Clock,
  CheckCircle2,
  Package,
  FileSpreadsheet,
  Calculator,
  Wallet,
  UploadCloud,
  Sparkles,
  ArrowRight,
  Flame,
  AlertTriangle,
  Bike,
  Maximize2,
} from 'lucide-react';
import { useStore } from '../services/storeContext';
import { formatBRL } from '../utils/formatters';
import { Order } from '../models/types';

export const OperationsPage: React.FC = () => {
  const {
    orders,
    inventory,
    recipes,
    layoutMode,
    advanceOrderStatus,
    setAppViewMode,
    importSefazInvoiceXml,
    triggerPredictiveStockAgent,
    updateRecipeIngredientQty,
    addFinancialRecord,
  } = useStore();

  const isDark = layoutMode === 'gastropub_warm';
  const cardSurface = isDark
    ? 'bg-[#292524] border-stone-700 text-stone-100'
    : 'bg-white border-stone-200 text-stone-900 shadow-xs';

  const [activeSubTab, setActiveSubTab] = useState<'kds' | 'inventory_sefaz' | 'recipes_cmv' | 'cashier'>('kds');
  const [invoiceInput, setInvoiceInput] = useState('NF-e 000.519.882');
  const [supplierInput, setSupplierInput] = useState('Frigorífico Boutique Serra Negra');
  const [cashierOpeningBalance, setCashierOpeningBalance] = useState<number>(450.0);
  const [cashierStatus, setCashierStatus] = useState<'open' | 'closed'>('open');

  const newOrders = orders.filter((o) => o.status === 'new');
  const preparingOrders = orders.filter((o) => o.status === 'preparing');
  const readyOrders = orders.filter((o) => o.status === 'ready');
  const outForDeliveryOrders = orders.filter((o) => o.status === 'out_for_delivery');

  const paymentBreakdown = orders.reduce(
    (acc, ord) => {
      acc[ord.paymentMethod] = (acc[ord.paymentMethod] || 0) + ord.total;
      return acc;
    },
    {} as Record<string, number>
  );

  const totalShiftSales = orders.reduce((s, o) => s + o.total, 0);

  const renderChannelBadge = (channel: Order['channel']) => {
    const map: Record<Order['channel'], { label: string; color: string }> = {
      voice_agent: { label: 'Voz / Áudio', color: 'bg-purple-100 text-purple-800' },
      whatsapp: { label: 'WhatsApp', color: 'bg-emerald-100 text-emerald-800' },
      qr_table: { label: 'QR Code Mesa', color: 'bg-orange-100 text-orange-800' },
      waiter_app: { label: 'Garçom', color: 'bg-sky-100 text-sky-800' },
      delivery_link: { label: 'Cardápio Digital', color: 'bg-amber-100 text-amber-900' },
      takeout: { label: 'Balcão', color: 'bg-stone-200 text-stone-800' },
    };
    const item = map[channel];
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold ${item.color}`}>
        {item.label}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Sub-navigation Bar */}
      <div className={`rounded-3xl p-5 border flex flex-wrap items-center justify-between gap-4 ${cardSurface}`}>
        <div>
          <span className="text-xs font-extrabold uppercase tracking-wider text-orange-600 block">
            Operação do Dia a Dia
          </span>
          <h2 className="text-xl font-extrabold">
            Tela da Cozinha (KDS), Estoque, Ficha Técnica e Caixa
          </h2>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveSubTab('kds')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'kds'
                ? 'bg-[#D94E1F] text-white shadow-sm'
                : isDark
                ? 'bg-stone-800 text-stone-300'
                : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
            }`}
          >
            <ChefHat className="w-4 h-4" />
            <span>Pedidos na Cozinha ({newOrders.length + preparingOrders.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('inventory_sefaz')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'inventory_sefaz'
                ? 'bg-[#D94E1F] text-white shadow-sm'
                : isDark
                ? 'bg-stone-800 text-stone-300'
                : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Estoque & Entrada de Notas</span>
          </button>

          <button
            onClick={() => setActiveSubTab('recipes_cmv')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'recipes_cmv'
                ? 'bg-[#D94E1F] text-white shadow-sm'
                : isDark
                ? 'bg-stone-800 text-stone-300'
                : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
            }`}
          >
            <Calculator className="w-4 h-4" />
            <span>Receitas & Custo do Prato</span>
          </button>

          <button
            onClick={() => setActiveSubTab('cashier')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'cashier'
                ? 'bg-[#D94E1F] text-white shadow-sm'
                : isDark
                ? 'bg-stone-800 text-stone-300'
                : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
            }`}
          >
            <Wallet className="w-4 h-4" />
            <span>Frente de Caixa</span>
          </button>
        </div>
      </div>

      {/* 1. KDS (TELA DE COMANDAS DA COZINHA & EXPEDIÇÃO) */}
      {activeSubTab === 'kds' && (
        <div className="space-y-4">
          {/* Banner de Acesso à Tela Dedicada Fullscreen da Cozinha */}
          <div className="p-4 rounded-3xl bg-gradient-to-r from-stone-900 via-stone-850 to-stone-900 border border-orange-500/50 flex flex-wrap items-center justify-between gap-3 text-white shadow-md">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#D94E1F] flex items-center justify-center font-black">
                <ChefHat className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-black text-white flex items-center gap-2">
                  <span>Tela Dedicada de Chegada & Produção de Pedidos (KDS)</span>
                  <span className="px-2 py-0.5 rounded-full bg-orange-600 text-[10px] font-black">
                    Recomendado para Cozinha
                  </span>
                </h4>
                <p className="text-xs text-stone-300">
                  Ideal para tablets e monitores na parede da cozinha com alerta sonoro de chegada de pedidos.
                </p>
              </div>
            </div>

            <button
              onClick={() => setAppViewMode('kitchen_dispatch')}
              className="px-4 py-2 rounded-2xl bg-[#D94E1F] hover:bg-[#B83D14] text-white text-xs font-black flex items-center gap-1.5 shadow-sm cursor-pointer transition-colors"
            >
              <Maximize2 className="w-4 h-4" />
              <span>Abrir Modo KDS Fullscreen</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {/* Coluna 1: Acabou de Chegar */}
            <div className={`rounded-3xl border p-4 space-y-3.5 ${cardSurface}`}>
              <div className="flex items-center justify-between border-b border-stone-200/60 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-red-500 animate-ping" />
                  <h3 className="text-sm font-black">
                    1. Chegando ({newOrders.length})
                  </h3>
                </div>
                <span className="text-[11px] font-bold text-orange-600">Aceitar</span>
              </div>

              <div className="space-y-3">
                {newOrders.map((ord) => (
                  <div
                    key={ord.id}
                    className="rounded-2xl border-2 border-orange-400 bg-orange-50/50 text-stone-900 p-3.5 space-y-2.5 shadow-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-lg font-black text-[#D94E1F]">
                          #{ord.orderNumber}
                        </span>
                        {renderChannelBadge(ord.channel)}
                      </div>
                      <span className="text-[11px] font-bold text-orange-800 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Novo
                      </span>
                    </div>

                    <div className="text-xs font-extrabold text-stone-800">
                      {ord.customerName} {ord.tableNumber ? `• ${ord.tableNumber}` : ''}
                    </div>

                    <div className="space-y-1.5 pt-1.5 border-t border-orange-200 text-xs">
                      {ord.items.map((item, i) => (
                        <div key={i}>
                          <div className="font-extrabold text-stone-900">
                            {item.quantity}x {item.name}
                          </div>
                          {item.removedIngredients && item.removedIngredients.length > 0 && (
                            <p className="text-[10px] font-black text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded mt-0.5 inline-block">
                              ✕ Sem: {item.removedIngredients.join(', ')}
                            </p>
                          )}
                          {item.notes && (
                            <p className="text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded mt-0.5 block">
                              Obs: {item.notes}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={() => advanceOrderStatus(ord.id, 'preparing')}
                      className="w-full py-2.5 rounded-xl bg-[#D94E1F] hover:bg-[#B83D14] text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                    >
                      <Flame className="w-3.5 h-3.5" />
                      <span>Colocar no Fogo / Preparar</span>
                    </button>
                  </div>
                ))}
                {newOrders.length === 0 && (
                  <p className="text-xs text-stone-400 text-center py-8">
                    Nenhum pedido novo aguardando.
                  </p>
                )}
              </div>
            </div>

            {/* Coluna 2: No Fogo / Preparando */}
            <div className={`rounded-3xl border p-4 space-y-3.5 ${cardSurface}`}>
              <div className="flex items-center justify-between border-b border-stone-200/60 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-amber-500" />
                  <h3 className="text-sm font-black">
                    2. No Forno ({preparingOrders.length})
                  </h3>
                </div>
                <span className="text-[11px] font-bold text-amber-600">Cozinha</span>
              </div>

              <div className="space-y-3">
                {preparingOrders.map((ord) => (
                  <div
                    key={ord.id}
                    className="rounded-2xl border-2 border-amber-400 bg-amber-50/50 text-stone-900 p-3.5 space-y-2.5 shadow-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-lg font-black text-amber-900">
                          #{ord.orderNumber}
                        </span>
                        {renderChannelBadge(ord.channel)}
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-950 text-[10px] font-bold">
                        {ord.station}
                      </span>
                    </div>

                    <div className="text-xs font-extrabold text-stone-800">{ord.customerName}</div>

                    <div className="space-y-1 pt-1.5 border-t border-amber-200 text-xs">
                      {ord.items.map((item, i) => (
                        <div key={i} className="font-bold text-stone-900">
                          {item.quantity}x {item.name}
                          {item.removedIngredients && item.removedIngredients.length > 0 && (
                            <span className="text-rose-700 font-bold ml-1">
                              (Sem {item.removedIngredients.join(', ')})
                            </span>
                          )}
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={() => advanceOrderStatus(ord.id, 'ready')}
                      className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Finalizar Preparo (Pronto)</span>
                    </button>
                  </div>
                ))}
                {preparingOrders.length === 0 && (
                  <p className="text-xs text-stone-400 text-center py-8">
                    Nenhum pedido no forno.
                  </p>
                )}
              </div>
            </div>

            {/* Coluna 3: Prontos para Retirar ou Despachar */}
            <div className={`rounded-3xl border p-4 space-y-3.5 ${cardSurface}`}>
              <div className="flex items-center justify-between border-b border-stone-200/60 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-purple-500" />
                  <h3 className="text-sm font-black">
                    3. Prontos / Despacho ({readyOrders.length})
                  </h3>
                </div>
                <span className="text-[11px] font-bold text-purple-600">Expedição</span>
              </div>

              <div className="space-y-3">
                {readyOrders.map((ord) => (
                  <div
                    key={ord.id}
                    className="rounded-2xl border-2 border-purple-500 bg-purple-50/50 text-stone-900 p-3.5 space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-black text-purple-900">
                        #{ord.orderNumber}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-purple-600 text-white text-[10px] font-bold">
                        {ord.channel === 'takeout' ? 'Balcão' : 'Delivery'}
                      </span>
                    </div>
                    <div className="text-xs font-extrabold text-stone-900">{ord.customerName}</div>
                    <div className="text-[11px] text-stone-700">
                      {ord.items.map((i) => `${i.quantity}x ${i.name}`).join(', ')}
                    </div>

                    {ord.channel === 'takeout' ? (
                      <button
                        onClick={() => advanceOrderStatus(ord.id, 'delivered')}
                        className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Entregue ao Cliente no Balcão</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => advanceOrderStatus(ord.id, 'out_for_delivery', { driverName: 'Motoboy da Casa' })}
                        className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Bike className="w-3.5 h-3.5" />
                        <span>Saiu para Entrega (Motoboy) 🛵</span>
                      </button>
                    )}
                  </div>
                ))}
                {readyOrders.length === 0 && (
                  <p className="text-xs text-stone-400 text-center py-8">
                    Nenhum pedido pronto no balcão.
                  </p>
                )}
              </div>
            </div>

            {/* Coluna 4: Em Rota de Entrega */}
            <div className={`rounded-3xl border p-4 space-y-3.5 ${cardSurface}`}>
              <div className="flex items-center justify-between border-b border-stone-200/60 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-blue-500 animate-pulse" />
                  <h3 className="text-sm font-black">
                    4. Em Rota ({outForDeliveryOrders.length})
                  </h3>
                </div>
                <span className="text-[11px] font-bold text-blue-600">Na Rua</span>
              </div>

              <div className="space-y-3">
                {outForDeliveryOrders.map((ord) => (
                  <div
                    key={ord.id}
                    className="rounded-2xl border-2 border-blue-500 bg-blue-50/50 text-stone-900 p-3.5 space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-black text-blue-900">
                        #{ord.orderNumber}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-bold">
                        {ord.driverName || 'Motoboy'}
                      </span>
                    </div>
                    <div className="text-xs font-extrabold text-stone-900">{ord.customerName}</div>
                    {ord.deliveryAddress && (
                      <p className="text-[11px] text-stone-600 truncate">
                        📍 {ord.deliveryAddress}
                      </p>
                    )}

                    <button
                      onClick={() => advanceOrderStatus(ord.id, 'delivered')}
                      className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Confirmar Entrega Concluída ✓</span>
                    </button>
                  </div>
                ))}
                {outForDeliveryOrders.length === 0 && (
                  <p className="text-xs text-stone-400 text-center py-8">
                    Nenhum entregador na rua no momento.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. ESTOQUE INTELIGENTE & ENTRADA DE NOTA FISCAL */}
      {activeSubTab === 'inventory_sefaz' && (
        <div className="space-y-5">
          <div className={`rounded-3xl border p-5 flex flex-wrap items-center justify-between gap-4 ${cardSurface}`}>
            <div>
              <h3 className="text-base font-extrabold flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                <span>Entrada Automática de Nota Fiscal & Alerta de Compras</span>
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                O sistema avisa o que vai acabar antes do fim de semana e puxa as notas direto do fornecedor.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={invoiceInput}
                onChange={(e) => setInvoiceInput(e.target.value)}
                className="bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-xs font-bold text-stone-900"
                placeholder="Nº da Nota Fiscal"
              />
              <input
                type="text"
                value={supplierInput}
                onChange={(e) => setSupplierInput(e.target.value)}
                className="bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-xs font-bold text-stone-900"
                placeholder="Fornecedor"
              />
              <button
                onClick={() => importSefazInvoiceXml(invoiceInput, supplierInput)}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
              >
                <UploadCloud className="w-4 h-4" />
                <span>Dar Entrada na Nota</span>
              </button>
              <button
                onClick={triggerPredictiveStockAgent}
                className="px-4 py-2 rounded-xl bg-[#D94E1F] hover:bg-[#B83D14] text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>Gerar Lista de Compras da Semana</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {inventory.map((inv) => {
              const isLow = inv.daysUntilDepletion <= 1.5;
              return (
                <div
                  key={inv.id}
                  className={`rounded-3xl border p-5 flex flex-col justify-between space-y-3 ${cardSurface}`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-bold text-orange-600 uppercase">
                        {inv.category}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold inline-flex items-center gap-1 ${
                          isLow
                            ? 'bg-red-100 text-red-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {isLow && <AlertTriangle className="w-3.5 h-3.5" />}
                        Dura {inv.daysUntilDepletion} dias
                      </span>
                    </div>
                    <h4 className="text-base font-extrabold mt-1">{inv.name}</h4>
                    <p className="text-xs text-stone-500 mt-0.5">Fornecedor: {inv.supplier}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 p-3 rounded-2xl bg-stone-100/80 text-stone-900 text-xs">
                    <div>
                      <span className="text-stone-500 block">Na Despensa / Câmara</span>
                      <span className="text-base font-extrabold">
                        {inv.currentStock} {inv.unit}
                      </span>
                    </div>
                    <div>
                      <span className="text-stone-500 block">Sugestão de Compra</span>
                      <span className="text-base font-extrabold text-emerald-700">
                        +{inv.aiSuggestedOrderQty} {inv.unit}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-stone-500">💡 {inv.weatherImpactFactor}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. RECEITAS & CUSTO DO PRATO (FICHA TÉCNICA SIMPLES) */}
      {activeSubTab === 'recipes_cmv' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {recipes.map((rec) => (
            <div
              key={rec.id}
              className={`rounded-3xl border p-6 space-y-4 flex flex-col justify-between ${cardSurface}`}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2 border-b border-stone-200/60 pb-3">
                  <div>
                    <span className="text-xs font-extrabold uppercase text-orange-600">
                      Receita Padrão da Cozinha
                    </span>
                    <h3 className="text-lg font-extrabold">{rec.menuItemName}</h3>
                  </div>
                  <div className="text-right">
                    <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-extrabold">
                      Custo (CMV): {rec.cmvPercent}%
                    </span>
                  </div>
                </div>

                <p className="text-xs text-stone-500 leading-relaxed">
                  <strong>Modo de Preparo:</strong> {rec.instructions}
                </p>

                <div className="space-y-2 pt-2">
                  <p className="text-xs font-extrabold text-stone-500 uppercase">
                    Ingredientes por Porção (Altere a quantidade para simular custo):
                  </p>
                  {rec.ingredients.map((ing) => (
                    <div
                      key={ing.inventoryItemId}
                      className="p-3 rounded-2xl bg-stone-100/70 text-stone-900 flex items-center justify-between gap-2 text-xs"
                    >
                      <span className="font-bold flex-1">{ing.name}</span>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          step="0.02"
                          min="0.01"
                          value={ing.quantity}
                          onChange={(e) =>
                            updateRecipeIngredientQty(
                              rec.id,
                              ing.inventoryItemId,
                              parseFloat(e.target.value) || 0.01
                            )
                          }
                          className="w-20 bg-white border border-stone-300 rounded-xl px-2.5 py-1 text-xs font-extrabold text-stone-900"
                        />
                        <span className="text-stone-600 font-semibold">{ing.unit}</span>
                      </div>
                      <span className="font-extrabold text-[#D94E1F] w-20 text-right">
                        {formatBRL(ing.lineCost)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-stone-200/60 flex items-center justify-between">
                <span className="text-sm font-bold text-stone-500">
                  Custo Total de Ingredientes do Prato:
                </span>
                <span className="text-2xl font-extrabold text-[#D94E1F]">
                  {formatBRL(rec.totalIngredientCost)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 4. FRENTE DE CAIXA */}
      {activeSubTab === 'cashier' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className={`lg:col-span-7 rounded-3xl border p-6 space-y-5 ${cardSurface}`}>
            <div className="flex items-center justify-between border-b border-stone-200/60 pb-3">
              <div>
                <h2 className="text-lg font-extrabold">Resumo da Gaveta & Pagamentos de Hoje</h2>
                <p className="text-xs text-stone-500">
                  Valores somados automaticamente a cada pedido fechado
                </p>
              </div>
              <span
                className={`px-3.5 py-1 rounded-full text-xs font-extrabold ${
                  cashierStatus === 'open'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {cashierStatus === 'open' ? 'CAIXA ABERTO' : 'CAIXA FECHADO'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-stone-100 text-stone-900">
                <span className="text-xs text-stone-500 font-semibold">Troco Inicial</span>
                <p className="text-xl font-extrabold mt-1">{formatBRL(cashierOpeningBalance)}</p>
              </div>
              <div className="p-4 rounded-2xl bg-emerald-50 text-emerald-950 border border-emerald-200">
                <span className="text-xs text-emerald-700 font-semibold">Vendas do Turno</span>
                <p className="text-xl font-extrabold text-emerald-700 mt-1">
                  {formatBRL(totalShiftSales)}
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-orange-50 text-orange-950 border border-orange-200">
                <span className="text-xs text-orange-700 font-semibold">Total no Caixa</span>
                <p className="text-xl font-extrabold text-[#D94E1F] mt-1">
                  {formatBRL(cashierOpeningBalance + totalShiftSales)}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-xs font-extrabold uppercase text-stone-500">
                Recebimentos por Forma de Pagamento
              </h3>
              {Object.entries(paymentBreakdown).map(([method, amount]) => (
                <div
                  key={method}
                  className="p-3.5 rounded-2xl bg-stone-100/80 text-stone-900 flex items-center justify-between text-sm"
                >
                  <span className="font-bold">{method}</span>
                  <span className="font-extrabold text-emerald-700">{formatBRL(amount)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className={`lg:col-span-5 rounded-3xl border p-6 space-y-4 ${cardSurface}`}>
            <h3 className="text-base font-extrabold">Abrir ou Fechar Turno</h3>
            <div>
              <label className="text-xs font-bold text-stone-500 block mb-1.5">
                Valor de Troco na Gaveta (R$)
              </label>
              <input
                type="number"
                value={cashierOpeningBalance}
                onChange={(e) => setCashierOpeningBalance(parseFloat(e.target.value) || 0)}
                className="w-full bg-stone-50 border border-stone-300 rounded-2xl px-4 py-3 text-sm font-extrabold text-stone-900"
              />
            </div>

            <button
              onClick={async () => {
                const next = cashierStatus === 'open' ? 'closed' : 'open';
                setCashierStatus(next);
                await addFinancialRecord({
                  type: next === 'closed' ? 'cash_closing' : 'cash_opening',
                  category: 'Vendas Salão',
                  description:
                    next === 'closed'
                      ? `Fechamento de Turno (${orders.length} pedidos)`
                      : 'Abertura de Caixa',
                  amount: cashierOpeningBalance + totalShiftSales,
                  paymentMethod: 'PIX / Cartões',
                  status: 'paid',
                  dueDate: new Date().toISOString().slice(0, 10),
                });
              }}
              className="w-full py-3.5 rounded-2xl bg-[#D94E1F] hover:bg-[#B83D14] text-white text-sm font-extrabold cursor-pointer shadow-md"
            >
              {cashierStatus === 'open' ? 'Fechar Caixa do Dia' : 'Abrir Novo Turno'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

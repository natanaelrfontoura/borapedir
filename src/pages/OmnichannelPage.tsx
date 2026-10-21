import React, { useState, useMemo } from 'react';
import {
  Mic,
  Send,
  QrCode,
  Sparkles,
  ShoppingBag,
  Plus,
  Minus,
  CheckCircle2,
  Watch,
  Users,
  ArrowRight,
  Flame,
  Percent,
  Utensils,
  MessageCircle,
  LayoutGrid,
} from 'lucide-react';
import { useStore } from '../services/storeContext';
import { evaluateBestOfferForCart } from '../agents/decisionEngine';
import { processVoiceOrWhatsappOrderWithAI } from '../services/geminiClient';
import { formatBRL } from '../utils/formatters';
import { OrderItem, ServiceChannelType } from '../models/types';

export const OmnichannelPage: React.FC = () => {
  const {
    menuItems,
    customers,
    tables,
    layoutMode,
    isOffline,
    createOrder,
    triggerAutonomousMenuAgent,
    updateTableStatus,
    setIsLayoutPickerOpen,
  } = useStore();

  const isDark = layoutMode === 'gastropub_warm';

  // Começa direto no Cardápio Visual & PDV para parecer um restaurante de verdade logo de cara!
  const [activeTab, setActiveTab] = useState<'qr_menu' | 'voice_whatsapp' | 'waiter_app'>('qr_menu');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');

  // Estado do Agente de Voz & WhatsApp
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(customers[0]?.id || 'cust-1');
  const [voiceInput, setVoiceInput] = useState<string>(
    'Quero o mesmo de sempre, mas troca a Coca por Zero'
  );
  const [isListening, setIsListening] = useState<boolean>(false);
  const [isProcessingNlp, setIsProcessingNlp] = useState<boolean>(false);
  const [chatHistory, setChatHistory] = useState<
    {
      sender: 'customer' | 'agent';
      channel: 'WhatsApp do Restaurante' | 'Pedido por Voz';
      text: string;
      time: string;
      savingsBadge?: string;
      orderNumber?: number;
    }[]
  >([
    {
      sender: 'agent',
      channel: 'WhatsApp do Restaurante',
      text: 'Olá Rafael! 😊 Sextou por aqui e a grelha já está acesa! Você tem R$ 18,50 de cashback disponível. Quer repetir seu Smash Duplo hoje?',
      time: '19:12',
    },
    {
      sender: 'customer',
      channel: 'Pedido por Voz',
      text: '🎙️ Áudio (0:04): "Quero o mesmo de sempre, mas troca a Coca por Zero"',
      time: '19:14',
    },
    {
      sender: 'agent',
      channel: 'Pedido por Voz',
      text: 'Combinado, Rafael! Lancei seu pedido de sempre (1x Smash Duplo Cheddar + 1x Croquetas de Costela) e já troquei a Coca tradicional pela Coca-Cola Zero gelada! Apliquei seu desconto automático: Você economizou R$ 18,50! Pedido #4091 já está na cozinha.',
      time: '19:14',
      savingsBadge: 'Você economizou R$ 18,50',
      orderNumber: 4091,
    },
  ]);

  // Estado do Cardápio Digital QR Code & Comanda
  const [selectedTableForQr, setSelectedTableForQr] = useState<string>('Mesa 04');
  const [selectedChannelForCart, setSelectedChannelForCart] = useState<ServiceChannelType>('qr_table');
  const [cart, setCart] = useState<OrderItem[]>([
    {
      menuItemId: 'item-wagyu-burger',
      name: 'Burger Brasa Wagyu Trufado 200g',
      quantity: 1,
      unitPrice: 58.9,
      unitCost: 16.4,
    },
    {
      menuItemId: 'item-croqueta-costela',
      name: 'Croquetas de Costela Defumada (6 un)',
      quantity: 1,
      unitPrice: 39.9,
      unitCost: 9.2,
    },
  ]);
  const [orderSuccessBanner, setOrderSuccessBanner] = useState<string | null>(null);

  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === selectedCustomerId) || customers[0],
    [customers, selectedCustomerId]
  );

  const categories = ['Todos', 'Burgers Artesanais', 'Pratos Principais', 'Entradas', 'Bebidas', 'Sobremesas'];

  const filteredMenuItems = useMemo(() => {
    if (selectedCategory === 'Todos') return menuItems;
    return menuItems.filter((item) => item.category === selectedCategory);
  }, [menuItems, selectedCategory]);

  const offerEvaluation = useMemo(
    () => evaluateBestOfferForCart(cart, selectedCustomer),
    [cart, selectedCustomer]
  );

  const cartSubtotal = useMemo(
    () => cart.reduce((acc, i) => acc + i.unitPrice * i.quantity, 0),
    [cart]
  );

  const handleAddToCart = (itemId: string) => {
    const found = menuItems.find((m) => m.id === itemId);
    if (!found) return;
    setCart((prev) => {
      const existing = prev.find((i) => i.menuItemId === itemId);
      if (existing) {
        return prev.map((i) =>
          i.menuItemId === itemId ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [
        ...prev,
        {
          menuItemId: found.id,
          name: found.name,
          quantity: 1,
          unitPrice: found.price,
          unitCost: found.cost,
        },
      ];
    });
  };

  const handleUpdateCartQty = (itemId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) =>
          i.menuItemId === itemId ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i
        )
        .filter((i) => i.quantity > 0)
    );
  };

  const handleSendVoiceOrWhatsappCommand = async (presetText?: string) => {
    const textToProcess = (presetText ?? voiceInput).trim();
    if (!textToProcess || !selectedCustomer) return;

    setIsProcessingNlp(true);
    const nowStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    setChatHistory((prev) => [
      ...prev,
      {
        sender: 'customer',
        channel: 'Pedido por Voz',
        text: `🎙️ "${textToProcess}"`,
        time: nowStr,
      },
    ]);

    const parsed = await processVoiceOrWhatsappOrderWithAI(
      textToProcess,
      selectedCustomer,
      menuItems,
      isOffline
    );

    const bestOffer = evaluateBestOfferForCart(parsed.items, selectedCustomer);
    const subtotal = parsed.items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);

    const created = await createOrder({
      channel: 'voice_agent',
      customerId: selectedCustomer.id,
      customerName: selectedCustomer.name,
      customerPhone: selectedCustomer.phone,
      items: parsed.items,
      status: 'new',
      subtotal: Number(subtotal.toFixed(2)),
      discountAmount: bestOffer.discountAmount,
      appliedPromotion: bestOffer.bestPromotionName,
      total: bestOffer.finalTotal,
      paymentMethod: 'PIX',
      paymentStatus: 'paid',
      nfceStatus: 'issued',
      nfceProtocol: `352609487193020001846500100000${Date.now().toString().slice(-5)}`,
      station: 'Grelha & Brasa',
    });

    setChatHistory((prev) => [
      ...prev,
      {
        sender: 'agent',
        channel: 'Pedido por Voz',
        text: parsed.aiResponseText,
        time: nowStr,
        savingsBadge: bestOffer.savingsBannerText,
        orderNumber: created.orderNumber,
      },
    ]);

    setIsProcessingNlp(false);
    if (!presetText) setVoiceInput('');
  };

  const handleStartMicrophoneSimulation = () => {
    setIsListening(true);
    setTimeout(() => {
      setVoiceInput('Quero o mesmo de sempre, mas troca a Coca por Zero e manda bem passado');
      setIsListening(false);
    }, 1000);
  };

  const handleCheckoutDigitalMenu = async () => {
    if (cart.length === 0) return;
    const created = await createOrder({
      channel: selectedChannelForCart,
      tableNumber: selectedChannelForCart === 'qr_table' ? selectedTableForQr : undefined,
      wristbandId: selectedChannelForCart === 'qr_table' ? 'PUL-QR99' : undefined,
      customerId: selectedCustomer?.id,
      customerName:
        selectedChannelForCart === 'qr_table'
          ? `${selectedTableForQr} (${selectedCustomer?.name.split(' ')[0]})`
          : selectedCustomer?.name || 'Cliente Balcão',
      items: cart,
      status: 'new',
      subtotal: Number(cartSubtotal.toFixed(2)),
      discountAmount: offerEvaluation.discountAmount,
      appliedPromotion: offerEvaluation.bestPromotionName,
      total: offerEvaluation.finalTotal,
      paymentMethod: 'PIX',
      paymentStatus: 'paid',
      nfceStatus: 'issued',
      nfceProtocol: `352609487193020001846500100000${Date.now().toString().slice(-5)}`,
      station: 'Grelha & Brasa',
    });

    setOrderSuccessBanner(
      `Pedido #${created.orderNumber} enviado para a Cozinha! (${offerEvaluation.savingsBannerText})`
    );
    setTimeout(() => setOrderSuccessBanner(null), 6000);
  };

  const cardSurface = isDark
    ? 'bg-[#292524] border-stone-700 text-stone-100'
    : 'bg-white border-stone-200/90 text-stone-900 shadow-xs';

  return (
    <div className="space-y-6">
      {/* Friendly Restaurant Welcome & Channel Selector */}
      <div
        className={`rounded-3xl p-5 lg:p-6 border flex flex-wrap items-center justify-between gap-4 ${
          isDark
            ? 'bg-gradient-to-r from-[#292524] to-[#1C1917] border-stone-700'
            : 'bg-white border-stone-200 shadow-xs'
        }`}
      >
        <div>
          <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-orange-600 mb-1">
            <Utensils className="w-3.5 h-3.5" />
            Atendimento Simples & Rápido
          </span>
          <h2 className="text-xl lg:text-2xl font-extrabold">
            Balcão, Cardápio Digital, Mesas e WhatsApp
          </h2>
          <p className={`text-xs mt-0.5 ${isDark ? 'text-stone-400' : 'text-stone-500'}`}>
            Lance pedidos em 2 toques, atenda por voz no WhatsApp ou acompanhe o salão ao vivo.
          </p>
        </div>

        {/* Big Friendly Navigation Pills */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveTab('qr_menu')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'qr_menu'
                ? 'bg-[#D94E1F] text-white shadow-md'
                : isDark
                ? 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>Cardápio Visual & Comanda</span>
          </button>

          <button
            onClick={() => setActiveTab('voice_whatsapp')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'voice_whatsapp'
                ? 'bg-emerald-600 text-white shadow-md'
                : isDark
                ? 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
            }`}
          >
            <MessageCircle className="w-4 h-4" />
            <span>WhatsApp & Pedido por Voz</span>
          </button>

          <button
            onClick={() => setActiveTab('waiter_app')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'waiter_app'
                ? 'bg-amber-600 text-white shadow-md'
                : isDark
                ? 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
            }`}
          >
            <Watch className="w-4 h-4" />
            <span>Mapa de Mesas & Garçom</span>
          </button>

          <button
            onClick={() => setIsLayoutPickerOpen(true)}
            className={`px-3.5 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-1.5 border cursor-pointer ${
              isDark
                ? 'border-amber-500/50 text-amber-300 hover:bg-amber-500/10'
                : 'border-orange-300 bg-orange-50 text-orange-800 hover:bg-orange-100'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            <span>Trocar Layout</span>
          </button>
        </div>
      </div>

      {/* ABA 1: CARDÁPIO VISUAL COM FOTOS REAIS & COMANDA INTELIGENTE */}
      {activeTab === 'qr_menu' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Esquerda 8 Colunas: Fotos dos Pratos, Categorias e Destaque Automático */}
          <div className="lg:col-span-8 space-y-4">
            {/* Filtro de Categorias + Botão de Organizar Cardápio pelos Mais Lucrativos */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-4 py-2 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
                      selectedCategory === cat
                        ? 'bg-stone-900 text-white shadow-xs'
                        : isDark
                        ? 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                        : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <button
                onClick={triggerAutonomousMenuAgent}
                className="px-3.5 py-2 rounded-full bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                <span>Destacar Pratos Mais Lucrativos</span>
              </button>
            </div>

            {orderSuccessBanner && (
              <div className="p-4 rounded-2xl bg-emerald-600 text-white text-sm font-bold flex items-center gap-2 shadow-lg">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <span>{orderSuccessBanner}</span>
              </div>
            )}

            {/* Grade de Pratos com Fotos Apetitosas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredMenuItems.map((item) => (
                <div
                  key={item.id}
                  className={`rounded-3xl border overflow-hidden flex flex-col justify-between transition-all hover:shadow-md ${cardSurface}`}
                >
                  <div>
                    {/* Foto do Prato */}
                    <div className="relative h-44 w-full overflow-hidden bg-stone-200">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-orange-100 text-orange-600">
                          <Utensils className="w-10 h-10" />
                        </div>
                      )}

                      {/* Selo de Destaque no Canto da Foto */}
                      <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-black/75 text-white backdrop-blur-xs">
                          #{item.displayOrder} no Cardápio
                        </span>
                        {item.aiBadge && (
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-amber-400 text-stone-950 shadow-xs flex items-center gap-1">
                            <Flame className="w-3 h-3" />
                            {item.aiBadge}
                          </span>
                        )}
                      </div>

                      <div className="absolute bottom-3 right-3">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[11px] font-bold shadow-xs ${
                            item.stockAvailable <= 5
                              ? 'bg-red-600 text-white'
                              : 'bg-emerald-600 text-white'
                          }`}
                        >
                          Lucro {item.marginPercent}%
                        </span>
                      </div>
                    </div>

                    {/* Nome e Descrição Apetitosa */}
                    <div className="p-4">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-orange-600">
                        {item.category}
                      </span>
                      <h3 className="text-base font-extrabold mt-0.5 leading-snug">
                        {item.name}
                      </h3>
                      <p
                        className={`text-xs mt-1 line-clamp-2 leading-relaxed ${
                          isDark ? 'text-stone-400' : 'text-stone-600'
                        }`}
                      >
                        {item.description}
                      </p>
                    </div>
                  </div>

                  {/* Preço e Botão Grande de Adicionar */}
                  <div
                    className={`px-4 pb-4 pt-3 border-t flex items-center justify-between ${
                      isDark ? 'border-stone-800' : 'border-stone-100'
                    }`}
                  >
                    <div>
                      <span className="text-xl font-extrabold text-[#D94E1F]">
                        {formatBRL(item.price)}
                      </span>
                      <span className="block text-[11px] text-stone-400">
                        Custo da receita: {formatBRL(item.cost)}
                      </span>
                    </div>

                    <button
                      onClick={() => handleAddToCart(item.id)}
                      className="px-4 py-2.5 rounded-2xl bg-[#D94E1F] hover:bg-[#B83D14] text-white text-xs font-extrabold flex items-center gap-1.5 shadow-sm cursor-pointer active:scale-95 transition-transform"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Adicionar</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Direita 4 Colunas: Comanda do Pedido + Assistente Inteligente de Descontos */}
          <div className="lg:col-span-4">
            <div className={`rounded-3xl border p-5 space-y-4 sticky top-20 ${cardSurface}`}>
              <div className="flex items-center justify-between border-b border-stone-200/60 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-orange-100 text-[#D94E1F] flex items-center justify-center">
                    <ShoppingBag className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold">Comanda Atual</h3>
                    <p className="text-xs text-stone-500">Salão QR Code ou Balcão</p>
                  </div>
                </div>

                <select
                  value={selectedTableForQr}
                  onChange={(e) => setSelectedTableForQr(e.target.value)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold border ${
                    isDark
                      ? 'bg-stone-800 border-stone-700 text-white'
                      : 'bg-stone-100 border-stone-200 text-stone-800'
                  }`}
                >
                  <option value="Mesa 01">Mesa 01</option>
                  <option value="Mesa 04">Mesa 04</option>
                  <option value="Mesa 06">Mesa 06</option>
                  <option value="Mesa 09">Mesa 09</option>
                  <option value="Mesa 12">Mesa 12</option>
                  <option value="Balcão / Viagem">Para Viagem</option>
                </select>
              </div>

              {/* Cliente Vinculado à Comanda */}
              <div>
                <label className="text-xs font-bold text-stone-500 block mb-1">
                  Cliente Fidelidade:
                </label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className={`w-full rounded-xl px-3 py-2 text-xs font-bold border ${
                    isDark
                      ? 'bg-stone-800 border-stone-700 text-white'
                      : 'bg-stone-50 border-stone-200 text-stone-900'
                  }`}
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} — Cashback: {formatBRL(c.cashbackBalance)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Lista de Itens na Comanda */}
              <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                {cart.map((item) => (
                  <div
                    key={item.menuItemId}
                    className={`p-3 rounded-2xl border flex items-center justify-between gap-2 ${
                      isDark
                        ? 'bg-stone-800/70 border-stone-700'
                        : 'bg-[#FAF6F0] border-stone-200/70'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-extrabold truncate">{item.name}</p>
                      <p className="text-xs text-stone-500 font-semibold">
                        {formatBRL(item.unitPrice)} cada
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleUpdateCartQty(item.menuItemId, -1)}
                        className="w-7 h-7 rounded-xl bg-white border border-stone-200 text-stone-700 flex items-center justify-center hover:bg-stone-100 cursor-pointer"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-sm font-extrabold w-5 text-center">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => handleUpdateCartQty(item.menuItemId, 1)}
                        className="w-7 h-7 rounded-xl bg-white border border-stone-200 text-stone-700 flex items-center justify-center hover:bg-stone-100 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
                {cart.length === 0 && (
                  <p className="text-xs text-stone-400 text-center py-6">
                    Toque em "+ Adicionar" nos pratos ao lado para montar o pedido.
                  </p>
                )}
              </div>

              {/* Destaque Verde de Economia Automática ("Você economizou R$ X") */}
              <div className="p-4 rounded-2xl bg-emerald-50 border-2 border-emerald-500/40 text-emerald-950 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-extrabold uppercase tracking-wide text-emerald-800 flex items-center gap-1">
                    <Percent className="w-4 h-4 text-emerald-600" />
                    Melhor Desconto Aplicado
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-600 text-white text-xs font-extrabold shadow-2xs">
                    {offerEvaluation.savingsBannerText}
                  </span>
                </div>
                <p className="text-xs font-bold text-emerald-900">
                  {offerEvaluation.bestPromotionName}
                </p>
                <p className="text-[11px] text-emerald-700 leading-snug">
                  O sistema testou cupons, combos e cashback do cliente e escolheu a melhor opção automaticamente.
                </p>
              </div>

              {/* Resumo de Valores */}
              <div className="space-y-1.5 pt-2 border-t border-stone-200/60 text-xs">
                <div className="flex justify-between text-stone-500 font-medium">
                  <span>Soma dos Pratos</span>
                  <span>{formatBRL(cartSubtotal)}</span>
                </div>
                <div className="flex justify-between text-emerald-600 font-bold">
                  <span>Desconto Automático</span>
                  <span>-{formatBRL(offerEvaluation.discountAmount)}</span>
                </div>
                <div className="flex justify-between text-lg font-extrabold pt-1">
                  <span>Total a Pagar</span>
                  <span className="text-[#D94E1F]">{formatBRL(offerEvaluation.finalTotal)}</span>
                </div>
              </div>

              <button
                onClick={handleCheckoutDigitalMenu}
                disabled={cart.length === 0}
                className="w-full py-3.5 rounded-2xl bg-[#D94E1F] hover:bg-[#B83D14] text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-orange-600/20 cursor-pointer disabled:opacity-40"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>Enviar Pedido para a Cozinha</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ABA 2: WHATSAPP REALISTA & PEDIDO POR VOZ ("O MESMO DE SEMPRE, TROCA COCA POR ZERO") */}
      {activeTab === 'voice_whatsapp' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Esquerda 7 Colunas: Tela Idêntica ao WhatsApp Real */}
          <div className="lg:col-span-7 rounded-3xl overflow-hidden border border-stone-300 shadow-md flex flex-col bg-[#EFEAE2]">
            {/* Cabeçalho Verde WhatsApp */}
            <div className="p-4 bg-[#075E54] text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center font-extrabold text-base">
                  {selectedCustomer?.name.charAt(0) || 'R'}
                </div>
                <div>
                  <h3 className="text-sm font-extrabold">
                    {selectedCustomer?.name} • WhatsApp & Voz IA
                  </h3>
                  <p className="text-xs text-emerald-100">
                    Online agora • Entende áudio e lembra o prato preferido do cliente
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#25D366] text-stone-950">
                Atendimento Automático
              </span>
            </div>

            {/* Faixa do Pedido Favorito do Cliente */}
            {selectedCustomer && (
              <div className="px-4 py-2.5 bg-amber-50 border-b border-amber-200 text-stone-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div>
                  <strong className="text-amber-900">Prato Favorito ("O Mesmo de Sempre"): </strong>
                  <span>{selectedCustomer.usualOrderDescription}</span>
                </div>
                <span className="font-extrabold text-emerald-700">
                  Cashback: {formatBRL(selectedCustomer.cashbackBalance)}
                </span>
              </div>
            )}

            {/* Balões de Conversa Estilo WhatsApp */}
            <div className="p-4 space-y-3 flex-1 max-h-[400px] overflow-y-auto">
              {chatHistory.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col ${
                    msg.sender === 'customer' ? 'items-end' : 'items-start'
                  }`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl p-3.5 text-xs leading-relaxed shadow-xs ${
                      msg.sender === 'customer'
                        ? 'bg-[#D9FDD3] text-stone-900 rounded-tr-none'
                        : 'bg-white text-stone-900 rounded-tl-none'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4 mb-1 text-[10px] font-bold text-stone-500">
                      <span>{msg.channel}</span>
                      <span>{msg.time}</span>
                    </div>
                    <p className="text-sm">{msg.text}</p>
                    {msg.savingsBadge && (
                      <div className="mt-2.5 pt-2 border-t border-stone-200 flex items-center justify-between gap-2">
                        <span className="px-2.5 py-1 rounded-full bg-emerald-600 text-white font-extrabold text-xs">
                          🎉 {msg.savingsBadge}
                        </span>
                        {msg.orderNumber && (
                          <span className="text-xs font-extrabold text-orange-700">
                            Pedido #{msg.orderNumber} na Cozinha!
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Botões de Teste Rápido de Voz */}
            <div className="px-4 py-3 bg-stone-100 border-t border-stone-200">
              <p className="text-xs font-bold text-stone-600 mb-2">
                Clique em uma frase abaixo para simular o cliente falando no WhatsApp:
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() =>
                    handleSendVoiceOrWhatsappCommand(
                      'Quero o mesmo de sempre, mas troca a Coca por Zero'
                    )
                  }
                  disabled={isProcessingNlp}
                  className="px-3 py-2 rounded-xl bg-white hover:bg-emerald-50 border border-stone-300 text-xs font-bold text-stone-800 shadow-2xs cursor-pointer"
                >
                  🎙️ "Quero o mesmo de sempre, mas troca a Coca por Zero"
                </button>
                <button
                  onClick={() =>
                    handleSendVoiceOrWhatsappCommand(
                      'Manda 2 Burger Wagyu Trufado mal passado e 1 Croqueta de Costela'
                    )
                  }
                  disabled={isProcessingNlp}
                  className="px-3 py-2 rounded-xl bg-white hover:bg-emerald-50 border border-stone-300 text-xs font-bold text-stone-800 shadow-2xs cursor-pointer"
                >
                  🎙️ "2 Burger Wagyu mal passado + 1 Croqueta"
                </button>
              </div>
            </div>

            {/* Barra de Digitar / Microfone do WhatsApp */}
            <div className="p-3 bg-[#F0F2F5] flex items-center gap-2">
              <button
                onClick={handleStartMicrophoneSimulation}
                title="Gravar áudio"
                className={`p-3 rounded-full transition-all cursor-pointer ${
                  isListening
                    ? 'bg-red-600 text-white animate-pulse'
                    : 'bg-white text-stone-700 hover:bg-stone-200 shadow-2xs'
                }`}
              >
                <Mic className="w-5 h-5" />
              </button>
              <input
                type="text"
                value={voiceInput}
                onChange={(e) => setVoiceInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSendVoiceOrWhatsappCommand();
                }}
                placeholder="Digite ou fale o pedido como o cliente falaria..."
                className="flex-1 bg-white rounded-full px-4 py-2.5 text-sm text-stone-900 border border-stone-200 focus:outline-none"
              />
              <button
                onClick={() => handleSendVoiceOrWhatsappCommand()}
                disabled={isProcessingNlp}
                className="px-5 py-2.5 rounded-full bg-[#00A884] hover:bg-[#008F6F] text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Send className="w-4 h-4" />
                <span>{isProcessingNlp ? 'Anotando...' : 'Enviar'}</span>
              </button>
            </div>
          </div>

          {/* Direita 5 Colunas: Clientes Fiéis & Mensagens Ativas no WhatsApp */}
          <div className="lg:col-span-5 space-y-4">
            <div className={`rounded-3xl border p-5 space-y-4 ${cardSurface}`}>
              <div>
                <span className="text-xs font-extrabold uppercase text-emerald-600">
                  Vendas Ativas no WhatsApp
                </span>
                <h3 className="text-lg font-extrabold mt-0.5">
                  Clientes que o Robô Chama Automaticamente
                </h3>
                <p className="text-xs text-stone-500 mt-1">
                  Ao contrário do Anota AI (que fica parado esperando), nosso sistema avisa o cliente quando bate a fome no dia que ele costuma pedir!
                </p>
              </div>

              <div className="space-y-3">
                {customers.map((c) => (
                  <div
                    key={c.id}
                    className={`p-4 rounded-2xl border space-y-2 ${
                      isDark
                        ? 'bg-stone-800/70 border-stone-700'
                        : 'bg-[#FAF6F0] border-stone-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-extrabold">{c.name}</span>
                      <span
                        className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                          c.churnRiskScore >= 70
                            ? 'bg-red-100 text-red-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {c.churnRiskScore >= 70
                          ? `Sumido há ${c.daysSinceLastOrder} dias`
                          : 'Cliente Frequente'}
                      </span>
                    </div>
                    <p className="text-xs text-stone-500">
                      Costuma pedir: <strong>{c.usualOrderDescription}</strong>
                    </p>
                    <div className="pt-1 flex items-center justify-between">
                      <span className="text-xs font-bold text-orange-700">
                        Cashback acumulado: {formatBRL(c.cashbackBalance)}
                      </span>
                      <button
                        onClick={() => {
                          setSelectedCustomerId(c.id);
                          handleSendVoiceOrWhatsappCommand(
                            'Quero o mesmo de sempre, mas troca a Coca por Zero'
                          );
                        }}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold flex items-center gap-1 hover:bg-emerald-700 cursor-pointer"
                      >
                        <span>Atender Cliente</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ABA 3: MAPA VISUAL DE MESAS DO SALÃO & PULSEIRAS */}
      {activeTab === 'waiter_app' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {tables.map((tbl) => {
              const isFree = tbl.status === 'free';
              const isCalling = tbl.status === 'calling_waiter';
              const isClosing = tbl.status === 'closing_bill';

              const badgeStyle = isFree
                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                : isCalling
                ? 'bg-red-100 text-red-800 border-red-300 animate-pulse'
                : isClosing
                ? 'bg-amber-100 text-amber-900 border-amber-300'
                : 'bg-orange-100 text-orange-900 border-orange-300';

              const statusText = isFree
                ? 'Mesa Livre'
                : isCalling
                ? '🔔 Chamando Garçom!'
                : isClosing
                ? '💳 Pediu a Conta'
                : '🍽️ Ocupada — Consumindo';

              return (
                <div
                  key={tbl.id}
                  className={`rounded-3xl border-2 p-5 flex flex-col justify-between space-y-4 transition-all ${
                    isCalling
                      ? 'border-red-500 bg-red-50/30 shadow-lg'
                      : isFree
                      ? `${cardSurface} border-emerald-500/30`
                      : `${cardSurface} border-orange-500/40`
                  }`}
                >
                  {/* Visual Round Table Icon + Status */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3.5">
                      <div
                        className={`w-14 h-14 rounded-full flex flex-col items-center justify-center font-extrabold border-4 shadow-xs ${
                          isFree
                            ? 'bg-emerald-600 text-white border-emerald-200'
                            : 'bg-[#D94E1F] text-white border-orange-200'
                        }`}
                      >
                        <span className="text-xs leading-none">MESA</span>
                        <span className="text-lg leading-none">
                          {tbl.tableNumber.replace('Mesa ', '')}
                        </span>
                      </div>
                      <div>
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-extrabold border ${badgeStyle}`}
                        >
                          {statusText}
                        </span>
                        <p className="text-xs text-stone-500 mt-1.5 flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" />
                          <span>
                            {tbl.guestsCount} pessoas • Garçom: {tbl.waiterName}
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-xs text-stone-400 block font-semibold">Conta</span>
                      <span className="text-xl font-extrabold text-[#D94E1F]">
                        {formatBRL(tbl.currentTotal)}
                      </span>
                    </div>
                  </div>

                  {/* Pulseiras de Consumo Individual */}
                  <div
                    className={`p-3 rounded-2xl ${
                      isDark ? 'bg-stone-800' : 'bg-[#FAF6F0]'
                    }`}
                  >
                    <p className="text-xs font-bold text-stone-500 mb-1.5 flex items-center gap-1.5">
                      <Watch className="w-3.5 h-3.5 text-orange-600" />
                      <span>Comandas / Pulseiras na Mesa:</span>
                    </p>
                    {tbl.wristbandIds.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {tbl.wristbandIds.map((w) => (
                          <span
                            key={w}
                            className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white text-stone-800 border border-stone-200 shadow-2xs"
                          >
                            Pulseira {w}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-stone-400">
                        Mesa pronta para receber clientes
                      </span>
                    )}
                  </div>

                  {/* Botões Grandes para o Garçom */}
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={async () => {
                        updateTableStatus(tbl.id, 'occupied', 58.9);
                        await createOrder({
                          channel: 'waiter_app',
                          tableNumber: tbl.tableNumber,
                          wristbandId: tbl.wristbandIds[0] || 'PUL-NOVO',
                          customerName: `${tbl.tableNumber}`,
                          items: [
                            {
                              menuItemId: 'item-wagyu-burger',
                              name: 'Burger Brasa Wagyu Trufado 200g',
                              quantity: 1,
                              unitPrice: 58.9,
                              unitCost: 16.4,
                            },
                          ],
                          status: 'new',
                          subtotal: 58.9,
                          discountAmount: 0,
                          total: 58.9,
                          paymentMethod: 'Cartão de Crédito',
                          paymentStatus: 'pending',
                          nfceStatus: 'pending',
                          station: 'Grelha & Brasa',
                        });
                      }}
                      className="flex-1 py-2.5 rounded-2xl bg-[#D94E1F] hover:bg-[#B83D14] text-white text-xs font-extrabold cursor-pointer shadow-xs"
                    >
                      + Lançar Pedido na Mesa
                    </button>

                    {!isFree && (
                      <button
                        onClick={() => updateTableStatus(tbl.id, 'free')}
                        className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold cursor-pointer"
                      >
                        Fechar Conta
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

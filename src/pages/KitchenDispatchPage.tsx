import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  ChefHat,
  Flame,
  CheckCircle2,
  Bike,
  Store,
  Clock,
  Volume2,
  VolumeX,
  Phone,
  MessageCircle,
  MapPin,
  ArrowRight,
  RotateCcw,
  PlusCircle,
  User,
  ShoppingBag,
  ExternalLink,
  Maximize2,
  Minimize2,
  Store as StoreIcon,
  Lock,
  Search,
  Filter,
} from 'lucide-react';
import { useStore } from '../services/storeContext';
import { Order, OrderStatus } from '../models/types';
import { formatBRL } from '../utils/formatters';

// Lista de entregadores pré-cadastrados para seleção rápida com 1 clique
const QUICK_DRIVERS = [
  { name: 'Motoboy Carlos', phone: '85991234567' },
  { name: 'Motoboy Lucas', phone: '85992345678' },
  { name: 'Motoboy Thiago', phone: '85993456789' },
  { name: 'Motoboy Rafael', phone: '85994567890' },
];

// Helper para tocar som de campainha de novo pedido na cozinha via Web Audio API
const playKitchenChime = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    // Primeira nota (alta)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, ctx.currentTime); // A5
    gain1.gain.setValueAtTime(0.25, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start();
    osc1.stop(ctx.currentTime + 0.4);

    // Segunda nota (mais alta e ressonante)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(1174.66, ctx.currentTime + 0.15); // D6
    gain2.gain.setValueAtTime(0.3, ctx.currentTime + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.65);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(ctx.currentTime + 0.15);
    osc2.stop(ctx.currentTime + 0.65);
  } catch {
    // Ignora se o navegador bloquear autoplay
  }
};

export const KitchenDispatchPage: React.FC = () => {
  const {
    orders,
    advanceOrderStatus,
    createOrder,
    setAppViewMode,
    isOffline,
  } = useStore();

  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [selectedDriverByOrder, setSelectedDriverByOrder] = useState<Record<string, string>>({});
  const [activeFilterTab, setActiveFilterTab] = useState<'all' | 'new' | 'preparing' | 'ready' | 'out_for_delivery' | 'delivered'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showDriverModalForOrderId, setShowDriverModalForOrderId] = useState<string | null>(null);
  const [customDriverInput, setCustomDriverInput] = useState('');

  // Rastreia a quantidade de pedidos novos para disparar a campainha quando entrar um novo
  const isFirstRender = useRef(true);
  const prevNewCountRef = useRef<number>(orders.filter((o) => o.status === 'new').length);
  const [latestNewOrderAlert, setLatestNewOrderAlert] = useState<string | null>(null);
  const newOrdersCount = orders.filter((o) => o.status === 'new').length;

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      prevNewCountRef.current = newOrdersCount;
      return;
    }

    if (newOrdersCount > prevNewCountRef.current) {
      if (soundEnabled) {
        playKitchenChime();
      }
      setLatestNewOrderAlert('🔔 NOVO PEDIDO RECEBIDO NA COZINHA! Atenção equipe!');
      const timer = setTimeout(() => setLatestNewOrderAlert(null), 8000);
      return () => clearTimeout(timer);
    }
    prevNewCountRef.current = newOrdersCount;
  }, [newOrdersCount, soundEnabled]);

  // Tempo decorrido em minutos a partir de uma data ISO
  const getElapsedMinutes = (isoDate: string): number => {
    const diffMs = Date.now() - new Date(isoDate).getTime();
    return Math.max(0, Math.floor(diffMs / 60000));
  };

  // Cores de urgência do cronômetro da comanda
  const getTimerBadge = (isoDate: string) => {
    const mins = getElapsedMinutes(isoDate);
    if (mins < 10) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
          <Clock className="w-3.5 h-3.5" />
          {mins} min
        </span>
      );
    }
    if (mins < 20) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-900 border border-amber-300">
          <Clock className="w-3.5 h-3.5" />
          {mins} min
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-900 border border-rose-300 animate-pulse">
        <Clock className="w-3.5 h-3.5 text-rose-600" />
        {mins} min ⚠️
      </span>
    );
  };

  // Filtros de pedidos por estágio
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const matchesSearch =
        searchQuery === '' ||
        o.orderNumber.toString().includes(searchQuery) ||
        o.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (o.customerPhone && o.customerPhone.includes(searchQuery)) ||
        o.items.some((i) => i.name.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchesSearch;
    });
  }, [orders, searchQuery]);

  const newOrders = useMemo(() => filteredOrders.filter((o) => o.status === 'new'), [filteredOrders]);
  const preparingOrders = useMemo(() => filteredOrders.filter((o) => o.status === 'preparing'), [filteredOrders]);
  const readyOrders = useMemo(() => filteredOrders.filter((o) => o.status === 'ready'), [filteredOrders]);
  const outForDeliveryOrders = useMemo(() => filteredOrders.filter((o) => o.status === 'out_for_delivery'), [filteredOrders]);
  const deliveredOrders = useMemo(() => filteredOrders.filter((o) => o.status === 'delivered'), [filteredOrders]);

  // Handler para simular um pedido rápido de teste da cozinha
  const handleCreateSampleOrder = async () => {
    await createOrder({
      channel: 'delivery_link',
      customerName: 'Cliente Teste (Mesa/Delivery)',
      customerPhone: '(85) 99876-5432',
      deliveryAddress: 'Rua das Oliveiras, 450 - Bairro Centro',
      items: [
        {
          menuItemId: 'pizza-calabresa',
          name: 'Pizza Calabresa Artesanal',
          quantity: 1,
          unitPrice: 42.0,
          unitCost: 14.5,
          notes: 'Massa fininha e bem tostada na borda',
          removedIngredients: ['Cebola', 'Azeitona Preta'],
        },
        {
          menuItemId: 'esfiha-carne',
          name: 'Esfiha de Carne Suculenta',
          quantity: 3,
          unitPrice: 3.5,
          unitCost: 1.2,
        },
      ],
      status: 'new',
      subtotal: 52.5,
      discountAmount: 0,
      total: 52.5,
      paymentMethod: 'PIX',
      paymentStatus: 'paid',
      nfceStatus: 'pending',
      station: 'Grelha & Brasa',
    });
    if (soundEnabled) playKitchenChime();
  };

  // Handler para sinalizar saída para entrega
  const handleDispatchOrder = async (order: Order, driverName: string) => {
    await advanceOrderStatus(order.id, 'out_for_delivery', {
      driverName: driverName || 'Entregador da Casa',
    });
    setShowDriverModalForOrderId(null);
  };

  // Toggle tela cheia
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#1c1917] text-stone-100 flex flex-col font-sans">
      {/* Barra Superior da Cozinha & Expedição */}
      <header className="bg-stone-900 border-b border-stone-800 px-4 lg:px-6 py-3.5 sticky top-0 z-30 shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Lado Esquerdo: Identidade do KDS */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#D94E1F] flex items-center justify-center text-white font-extrabold shadow-sm">
              <ChefHat className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
                  <span>Chegada & Produção de Pedidos</span>
                  <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-orange-950 text-orange-400 border border-orange-800 font-extrabold">
                    KDS • Cozinha & Entrega
                  </span>
                </h1>
              </div>
              <p className="text-xs text-stone-400 font-medium">
                Sinalize preparo, término e saída do entregador — Atualização ao vivo para o cliente
              </p>
            </div>
          </div>

          {/* Lado Direito: Ações Rápidas, Som, Fullscreen e Navegação */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Som de Campainha */}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`px-3 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer border ${
                soundEnabled
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700 hover:bg-emerald-900'
                  : 'bg-stone-800 text-stone-400 border-stone-700 hover:bg-stone-700'
              }`}
              title={soundEnabled ? 'Campainha Ativa' : 'Campainha Desativada'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4" />}
              <span className="hidden sm:inline">{soundEnabled ? 'Som Ativo' : 'Mudo'}</span>
            </button>

            {/* Teste Rápido de Pedido Chegando */}
            <button
              onClick={handleCreateSampleOrder}
              className="px-3 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 bg-orange-600 hover:bg-orange-500 text-white cursor-pointer shadow-xs transition-colors"
              title="Inserir pedido demonstrativo para testar o som e o fluxo"
            >
              <PlusCircle className="w-4 h-4" />
              <span className="hidden md:inline">+ Testar Chegada de Pedido</span>
            </button>

            {/* Tela Cheia */}
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 cursor-pointer border border-stone-700 transition-colors"
              title={isFullscreen ? 'Sair da Tela Cheia' : 'Modo Tela Cheia para TV/Monitor'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Voltar ao Cardápio */}
            <button
              onClick={() => setAppViewMode('customer_storefront')}
              className="px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 cursor-pointer transition-colors"
            >
              <StoreIcon className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">Ver Cardápio do Cliente</span>
            </button>

            {/* Ir para Painel Master */}
            <button
              onClick={() => setAppViewMode('manager_dashboard')}
              className="px-3 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 cursor-pointer transition-colors"
            >
              <Lock className="w-3.5 h-3.5 text-orange-400" />
              <span className="hidden lg:inline">Painel Gerencial</span>
            </button>
          </div>
        </div>

        {latestNewOrderAlert && (
          <div className="mt-3 bg-gradient-to-r from-orange-600 via-rose-600 to-amber-600 text-white px-4 py-2.5 rounded-xl font-black text-sm flex items-center justify-between shadow-lg animate-pulse">
            <div className="flex items-center gap-2">
              <span className="text-xl">🚨</span>
              <span>{latestNewOrderAlert}</span>
            </div>
            <button
              onClick={() => setLatestNewOrderAlert(null)}
              className="px-2.5 py-1 bg-black/30 hover:bg-black/50 rounded-lg text-xs cursor-pointer text-white"
            >
              Dispensar
            </button>
          </div>
        )}

        {/* Barra de Filtros e Busca */}
        <div className="mt-3.5 pt-3 border-t border-stone-800 flex flex-wrap items-center justify-between gap-3">
          {/* Abas de Navegação Rápida */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
            <button
              onClick={() => setActiveFilterTab('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors ${
                activeFilterTab === 'all'
                  ? 'bg-white text-stone-900 shadow-sm'
                  : 'bg-stone-800/80 text-stone-400 hover:bg-stone-800 hover:text-stone-200'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Visão Kanban Geral</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-stone-700 text-white font-black">
                {orders.length}
              </span>
            </button>

            <button
              onClick={() => setActiveFilterTab('new')}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors ${
                activeFilterTab === 'new'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-stone-800/80 text-rose-400 hover:bg-stone-800'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping" />
              <span>1. Novos Chegando</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-950 text-rose-200 font-black">
                {newOrders.length}
              </span>
            </button>

            <button
              onClick={() => setActiveFilterTab('preparing')}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors ${
                activeFilterTab === 'preparing'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-stone-800/80 text-amber-400 hover:bg-stone-800'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-amber-300" />
              <span>2. No Forno / Produção</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-950 text-amber-200 font-black">
                {preparingOrders.length}
              </span>
            </button>

            <button
              onClick={() => setActiveFilterTab('ready')}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors ${
                activeFilterTab === 'ready'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-stone-800/80 text-purple-400 hover:bg-stone-800'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>3. Prontos / Despacho</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-purple-950 text-purple-200 font-black">
                {readyOrders.length}
              </span>
            </button>

            <button
              onClick={() => setActiveFilterTab('out_for_delivery')}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors ${
                activeFilterTab === 'out_for_delivery'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-stone-800/80 text-blue-400 hover:bg-stone-800'
              }`}
            >
              <Bike className="w-3.5 h-3.5" />
              <span>4. Em Rota de Entrega</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-blue-950 text-blue-200 font-black">
                {outForDeliveryOrders.length}
              </span>
            </button>

            <button
              onClick={() => setActiveFilterTab('delivered')}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors ${
                activeFilterTab === 'delivered'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-stone-800/80 text-emerald-400 hover:bg-stone-800'
              }`}
            >
              <span>5. Concluídos ✓</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-950 text-emerald-200 font-black">
                {deliveredOrders.length}
              </span>
            </button>
          </div>

          {/* Campo de Busca Rápida */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-stone-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar pedido #, cliente..."
              className="w-full bg-stone-800 border border-stone-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-stone-500 focus:outline-none focus:border-orange-500"
            />
          </div>
        </div>
      </header>

      {/* Banner de Novo Pedido Chegando (se houver pedido novo com menos de 3 min) */}
      {newOrders.length > 0 && (
        <div className="bg-rose-950/80 border-b border-rose-800/80 px-4 lg:px-6 py-2.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping shrink-0" />
            <p className="text-xs sm:text-sm font-extrabold text-rose-200">
              🚨 Atenção Cozinha: {newOrders.length} {newOrders.length === 1 ? 'pedido novo aguardando' : 'pedidos novos aguardando'} aceite para iniciar preparo!
            </p>
          </div>
          <button
            onClick={playKitchenChime}
            className="px-2.5 py-1 rounded-lg bg-rose-900 hover:bg-rose-800 text-rose-200 text-xs font-bold flex items-center gap-1 cursor-pointer"
          >
            <Volume2 className="w-3 h-3" />
            <span>Tocar Campainha</span>
          </button>
        </div>
      )}

      {/* Conteúdo Principal do KDS: Kanban com as 4 Etapas Principais */}
      <main className="flex-1 p-4 lg:p-6 overflow-x-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 min-w-[320px]">
          {/* ======================================================== */}
          {/* COLUNA 1: 1. CHEGADA DE PEDIDOS (NOVOS)                   */}
          {/* ======================================================== */}
          {(activeFilterTab === 'all' || activeFilterTab === 'new') && (
            <div className="flex flex-col bg-stone-900/90 rounded-3xl border border-rose-900/60 shadow-lg overflow-hidden">
              {/* Header da Coluna */}
              <div className="p-4 bg-rose-950/60 border-b border-rose-900/50 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping" />
                  <div>
                    <h3 className="text-sm font-black text-rose-300 uppercase tracking-wider">
                      1. Chegada de Pedidos
                    </h3>
                    <p className="text-[11px] text-stone-400">Aguardando aceite da cozinha</p>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-600 text-white">
                  {newOrders.length}
                </span>
              </div>

              {/* Lista de Comandas */}
              <div className="p-3.5 space-y-3.5 flex-1 overflow-y-auto max-h-[calc(100vh-250px)]">
                {newOrders.map((ord) => (
                  <div
                    key={ord.id}
                    className="rounded-2xl border-2 border-rose-500/80 bg-stone-850 p-4 space-y-3 shadow-md hover:border-rose-400 transition-colors"
                  >
                    {/* Linha Topo: Número, Canal e Tempo */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xl font-black text-white">
                          #{ord.orderNumber}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            ord.channel === 'delivery_link' || ord.channel === 'whatsapp'
                              ? 'bg-amber-950 text-amber-300 border border-amber-800'
                              : 'bg-sky-950 text-sky-300 border border-sky-800'
                          }`}
                        >
                          {ord.channel === 'delivery_link' || ord.channel === 'whatsapp'
                            ? '🛵 Delivery'
                            : '🛍️ Retirada'}
                        </span>
                      </div>
                      {getTimerBadge(ord.createdAt)}
                    </div>

                    {/* Cliente e Contato */}
                    <div className="text-xs space-y-0.5 pb-2 border-b border-stone-800">
                      <p className="font-extrabold text-stone-100 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-stone-400" />
                        <span>{ord.customerName}</span>
                      </p>
                      {ord.customerPhone && (
                        <p className="text-[11px] text-stone-400 flex items-center gap-1">
                          <Phone className="w-3 h-3 text-stone-500" />
                          <span>{ord.customerPhone}</span>
                        </p>
                      )}
                      {ord.deliveryAddress && (
                        <p className="text-[11px] text-amber-300/90 flex items-start gap-1 font-semibold pt-0.5">
                          <MapPin className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />
                          <span>{ord.deliveryAddress}</span>
                        </p>
                      )}
                    </div>

                    {/* Itens da Comanda com Ingredientes Removidos Bem Destacados */}
                    <div className="space-y-2 text-xs">
                      <span className="text-[10px] font-black uppercase tracking-wider text-stone-400 block">
                        Itens a Preparar:
                      </span>
                      {ord.items.map((item, idx) => (
                        <div
                          key={idx}
                          className="p-2.5 rounded-xl bg-stone-900 border border-stone-800 space-y-1.5"
                        >
                          <div className="flex items-start justify-between font-extrabold text-stone-100">
                            <span>
                              <span className="text-rose-400 font-black text-sm">{item.quantity}x</span>{' '}
                              {item.name}
                            </span>
                          </div>

                          {/* INGREDIENTES REMOVIDOS EM DESTAQUE VERMELHO */}
                          {item.removedIngredients && item.removedIngredients.length > 0 && (
                            <div className="p-1.5 rounded-lg bg-rose-950/80 border border-rose-800/80 text-rose-200 space-y-0.5">
                              <p className="text-[10px] font-black uppercase text-rose-400 flex items-center gap-1">
                                <span>⚠️ ATENÇÃO: NÃO COLOCAR:</span>
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {item.removedIngredients.map((ing) => (
                                  <span
                                    key={ing}
                                    className="px-2 py-0.5 rounded bg-rose-600 text-white text-[10px] font-black"
                                  >
                                    ✕ SEM {ing.toUpperCase()}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Observação Adicional */}
                          {item.notes && (
                            <p className="text-[11px] text-amber-300 font-semibold bg-amber-950/60 border border-amber-900/60 px-2 py-0.5 rounded-md">
                              📝 Obs: {item.notes}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Botão de Ação: Receber e Colocar no Fogo */}
                    <button
                      onClick={() => advanceOrderStatus(ord.id, 'preparing')}
                      className="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black flex items-center justify-center gap-2 shadow-sm cursor-pointer transition-colors"
                    >
                      <Flame className="w-4 h-4 text-amber-200" />
                      <span>RECEBER & INICIAR PREPARO 🔥</span>
                    </button>
                  </div>
                ))}

                {newOrders.length === 0 && (
                  <div className="text-center py-12 text-stone-500 space-y-2">
                    <CheckCircle2 className="w-8 h-8 mx-auto text-stone-600" />
                    <p className="text-xs font-bold">Nenhum pedido novo no momento</p>
                    <p className="text-[11px] text-stone-600">Novos pedidos aparecerão aqui com alerta sonoro</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* COLUNA 2: 2. EM PRODUÇÃO NA COZINHA (NO FORNO / FOGÃO)    */}
          {/* ======================================================== */}
          {(activeFilterTab === 'all' || activeFilterTab === 'preparing') && (
            <div className="flex flex-col bg-stone-900/90 rounded-3xl border border-amber-900/60 shadow-lg overflow-hidden">
              {/* Header da Coluna */}
              <div className="p-4 bg-amber-950/60 border-b border-amber-900/50 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Flame className="w-5 h-5 text-amber-400" />
                  <div>
                    <h3 className="text-sm font-black text-amber-300 uppercase tracking-wider">
                      2. Em Produção
                    </h3>
                    <p className="text-[11px] text-stone-400">No forno / fogão sendo montado</p>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-600 text-white">
                  {preparingOrders.length}
                </span>
              </div>

              {/* Lista de Comandas em Produção */}
              <div className="p-3.5 space-y-3.5 flex-1 overflow-y-auto max-h-[calc(100vh-250px)]">
                {preparingOrders.map((ord) => (
                  <div
                    key={ord.id}
                    className="rounded-2xl border-2 border-amber-500/80 bg-stone-850 p-4 space-y-3 shadow-md hover:border-amber-400 transition-colors"
                  >
                    {/* Linha Topo */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xl font-black text-white">
                          #{ord.orderNumber}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-950 text-amber-300 border border-amber-800">
                          🔥 Forno / Cozinha
                        </span>
                      </div>
                      {getTimerBadge(ord.prepStartedAt || ord.createdAt)}
                    </div>

                    <div className="text-xs space-y-0.5 pb-2 border-b border-stone-800">
                      <p className="font-extrabold text-stone-100 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-stone-400" />
                        <span>{ord.customerName}</span>
                      </p>
                      {ord.deliveryAddress && (
                        <p className="text-[11px] text-stone-400 truncate">
                          📍 {ord.deliveryAddress}
                        </p>
                      )}
                    </div>

                    {/* Itens */}
                    <div className="space-y-2 text-xs">
                      {ord.items.map((item, idx) => (
                        <div
                          key={idx}
                          className="p-2.5 rounded-xl bg-stone-900 border border-stone-800 space-y-1.5"
                        >
                          <div className="flex items-start justify-between font-extrabold text-stone-100">
                            <span>
                              <span className="text-amber-400 font-black text-sm">{item.quantity}x</span>{' '}
                              {item.name}
                            </span>
                          </div>

                          {/* INGREDIENTES REMOVIDOS */}
                          {item.removedIngredients && item.removedIngredients.length > 0 && (
                            <div className="p-1.5 rounded-lg bg-rose-950/80 border border-rose-800/80 text-rose-200">
                              <p className="text-[10px] font-black text-rose-400">
                                ✕ SEM: {item.removedIngredients.join(', ')}
                              </p>
                            </div>
                          )}

                          {item.notes && (
                            <p className="text-[11px] text-amber-300 font-semibold bg-amber-950/60 border border-amber-900/60 px-2 py-0.5 rounded-md">
                              📝 {item.notes}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Botão de Ação: Finalizar Preparo */}
                    <button
                      onClick={() => advanceOrderStatus(ord.id, 'ready')}
                      className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-black flex items-center justify-center gap-2 shadow-sm cursor-pointer transition-colors"
                    >
                      <CheckCircle2 className="w-4 h-4 text-purple-200" />
                      <span>FINALIZAR PRODUÇÃO (PRONTO) ✅</span>
                    </button>
                  </div>
                ))}

                {preparingOrders.length === 0 && (
                  <div className="text-center py-12 text-stone-500 space-y-2">
                    <ChefHat className="w-8 h-8 mx-auto text-stone-600" />
                    <p className="text-xs font-bold">Nenhum prato no forno agora</p>
                    <p className="text-[11px] text-stone-600">Aceite pedidos da coluna anterior para iniciar</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* COLUNA 3: 3. PRONTOS / DESPACHO & EXPEDIÇÃO (AGUARDA SAÍDA) */}
          {/* ======================================================== */}
          {(activeFilterTab === 'all' || activeFilterTab === 'ready') && (
            <div className="flex flex-col bg-stone-900/90 rounded-3xl border border-purple-900/60 shadow-lg overflow-hidden">
              {/* Header da Coluna */}
              <div className="p-4 bg-purple-950/60 border-b border-purple-900/50 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <ShoppingBag className="w-5 h-5 text-purple-400" />
                  <div>
                    <h3 className="text-sm font-black text-purple-300 uppercase tracking-wider">
                      3. Prontos / Despacho
                    </h3>
                    <p className="text-[11px] text-stone-400">Embalado e pronto para sair</p>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-purple-600 text-white">
                  {readyOrders.length}
                </span>
              </div>

              {/* Lista de Pedidos Prontos */}
              <div className="p-3.5 space-y-3.5 flex-1 overflow-y-auto max-h-[calc(100vh-250px)]">
                {readyOrders.map((ord) => {
                  const isTakeout = ord.channel === 'takeout';
                  const currentSelectedDriver = selectedDriverByOrder[ord.id] || QUICK_DRIVERS[0].name;

                  return (
                    <div
                      key={ord.id}
                      className="rounded-2xl border-2 border-purple-500/80 bg-stone-850 p-4 space-y-3 shadow-md hover:border-purple-400 transition-colors"
                    >
                      {/* Topo */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xl font-black text-white">
                            #{ord.orderNumber}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                              isTakeout
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                : 'bg-purple-950 text-purple-300 border border-purple-800'
                            }`}
                          >
                            {isTakeout ? '🛍️ Retirada Balcão' : '🛵 Delivery'}
                          </span>
                        </div>
                        {getTimerBadge(ord.readyAt || ord.createdAt)}
                      </div>

                      <div className="text-xs space-y-1 pb-2 border-b border-stone-800">
                        <p className="font-extrabold text-stone-100 flex items-center justify-between">
                          <span>{ord.customerName}</span>
                          <span className="text-purple-300 font-black">{formatBRL(ord.total)}</span>
                        </p>
                        {ord.customerPhone && (
                          <p className="text-[11px] text-stone-400 flex items-center gap-1">
                            <Phone className="w-3 h-3 text-stone-500" />
                            <span>{ord.customerPhone}</span>
                          </p>
                        )}
                        {!isTakeout && ord.deliveryAddress && (
                          <div className="p-2 rounded-xl bg-stone-900 border border-stone-800 text-[11px] text-amber-200">
                            <p className="font-bold flex items-center gap-1 text-amber-300">
                              <MapPin className="w-3.5 h-3.5 shrink-0" />
                              <span>Endereço de Entrega:</span>
                            </p>
                            <p className="mt-0.5 leading-snug">{ord.deliveryAddress}</p>
                          </div>
                        )}
                      </div>

                      {/* Resumo dos Itens */}
                      <div className="text-xs text-stone-300 space-y-1">
                        <p className="text-[10px] font-bold uppercase text-stone-500">Conteúdo do Pacote:</p>
                        {ord.items.map((i, idx) => (
                          <p key={idx} className="font-medium text-[11px]">
                            • {i.quantity}x {i.name}
                            {i.removedIngredients && i.removedIngredients.length > 0 && (
                              <span className="text-rose-400 font-bold ml-1">
                                (Sem {i.removedIngredients.join(', ')})
                              </span>
                            )}
                          </p>
                        ))}
                      </div>

                      {/* Se for RETIRADA: Botão de Entregar ao Cliente no Balcão */}
                      {isTakeout ? (
                        <button
                          onClick={() => advanceOrderStatus(ord.id, 'delivered')}
                          className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center justify-center gap-2 shadow-sm cursor-pointer transition-colors"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>ENTREGAR AO CLIENTE NO BALCÃO ✓</span>
                        </button>
                      ) : (
                        /* Se for DELIVERY: Seleção do Entregador e Botão de Saída para Entrega */
                        <div className="space-y-2.5 pt-1">
                          <div>
                            <label className="text-[11px] font-extrabold text-stone-400 block mb-1 flex items-center justify-between">
                              <span>Quem vai levar este pedido?</span>
                              <span className="text-orange-400 font-bold">1-Clique</span>
                            </label>

                            {/* Botões Rápidos de Motoboys */}
                            <div className="grid grid-cols-2 gap-1.5">
                              {QUICK_DRIVERS.map((driver) => (
                                <button
                                  key={driver.name}
                                  type="button"
                                  onClick={() =>
                                    setSelectedDriverByOrder((prev) => ({
                                      ...prev,
                                      [ord.id]: driver.name,
                                    }))
                                  }
                                  className={`px-2 py-1.5 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer text-left truncate ${
                                    currentSelectedDriver === driver.name
                                      ? 'bg-blue-600 text-white border-blue-500 font-black shadow-xs'
                                      : 'bg-stone-800 text-stone-300 border-stone-700 hover:bg-stone-750'
                                  }`}
                                >
                                  🛵 {driver.name.replace('Motoboy ', '')}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Botão de Sinalizar Saída para Entrega */}
                          <button
                            onClick={() => handleDispatchOrder(ord, currentSelectedDriver)}
                            className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black flex items-center justify-center gap-2 shadow-md cursor-pointer transition-colors"
                          >
                            <Bike className="w-4 h-4" />
                            <span>SAIU PARA ENTREGA ({currentSelectedDriver}) 🛵💨</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}

                {readyOrders.length === 0 && (
                  <div className="text-center py-12 text-stone-500 space-y-2">
                    <ShoppingBag className="w-8 h-8 mx-auto text-stone-600" />
                    <p className="text-xs font-bold">Nenhum pedido no balcão de despacho</p>
                    <p className="text-[11px] text-stone-600">Pedidos finalizados no forno virão para cá</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* COLUNA 4: 4. EM ROTA DE ENTREGA (COM O MOTOBOY)           */}
          {/* ======================================================== */}
          {(activeFilterTab === 'all' || activeFilterTab === 'out_for_delivery') && (
            <div className="flex flex-col bg-stone-900/90 rounded-3xl border border-blue-900/60 shadow-lg overflow-hidden">
              {/* Header da Coluna */}
              <div className="p-4 bg-blue-950/60 border-b border-blue-900/50 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Bike className="w-5 h-5 text-blue-400" />
                  <div>
                    <h3 className="text-sm font-black text-blue-300 uppercase tracking-wider">
                      4. Em Rota de Entrega
                    </h3>
                    <p className="text-[11px] text-stone-400">Motoboy a caminho do cliente</p>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-blue-600 text-white">
                  {outForDeliveryOrders.length}
                </span>
              </div>

              {/* Lista de Pedidos em Trânsito */}
              <div className="p-3.5 space-y-3.5 flex-1 overflow-y-auto max-h-[calc(100vh-250px)]">
                {outForDeliveryOrders.map((ord) => {
                  const whatsappPhone = ord.customerPhone?.replace(/\D/g, '') || '';
                  const whatsappMessage = encodeURIComponent(
                    `Olá, ${ord.customerName}! Aqui é o entregador do Bora Pedir (${ord.driverName || 'Motoboy'}). Acabei de sair para entrega com o seu pedido #${ord.orderNumber}. Já estou a caminho!`
                  );
                  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    ord.deliveryAddress || 'Fortaleza CE'
                  )}`;

                  return (
                    <div
                      key={ord.id}
                      className="rounded-2xl border-2 border-blue-500/80 bg-stone-850 p-4 space-y-3 shadow-md hover:border-blue-400 transition-colors"
                    >
                      {/* Topo */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xl font-black text-white">
                            #{ord.orderNumber}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-blue-950 text-blue-300 border border-blue-800 animate-pulse">
                            🛵 Em Rota
                          </span>
                        </div>
                        {getTimerBadge(ord.dispatchedAt || ord.createdAt)}
                      </div>

                      {/* Entregador Responsável */}
                      <div className="p-2.5 rounded-xl bg-blue-950/70 border border-blue-800/80 flex items-center justify-between text-xs">
                        <span className="font-extrabold text-blue-200 flex items-center gap-1.5">
                          <Bike className="w-4 h-4 text-blue-400" />
                          <span>{ord.driverName || 'Motoboy da Casa'}</span>
                        </span>
                        <span className="text-[10px] text-blue-300 font-bold">
                          Saiu há {getElapsedMinutes(ord.dispatchedAt || ord.createdAt)} min
                        </span>
                      </div>

                      {/* Destinatário & Endereço */}
                      <div className="text-xs space-y-1.5 pb-2 border-b border-stone-800">
                        <p className="font-extrabold text-stone-100">{ord.customerName}</p>
                        {ord.deliveryAddress && (
                          <div className="p-2 rounded-xl bg-stone-900 border border-stone-800 text-[11px] text-stone-300 space-y-1">
                            <p className="flex items-start gap-1 font-semibold text-stone-200">
                              <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                              <span>{ord.deliveryAddress}</span>
                            </p>
                            <a
                              href={googleMapsUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-400 hover:text-blue-300 pt-1"
                            >
                              <span>Abrir no Google Maps</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        )}
                      </div>

                      {/* Botões Rápidos de Contato com o Cliente */}
                      {whatsappPhone && (
                        <div className="flex items-center gap-2">
                          <a
                            href={`https://web.whatsapp.com/send?phone=55${whatsappPhone}&text=${whatsappMessage}`}
                            target="_blank"
                            rel="noreferrer"
                            className="flex-1 py-2 px-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-[11px] font-black flex items-center justify-center gap-1.5 transition-colors"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span>WhatsApp do Cliente</span>
                          </a>
                        </div>
                      )}

                      {/* Botão de Finalização pelo Entregador */}
                      <button
                        onClick={() => advanceOrderStatus(ord.id, 'delivered')}
                        className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center justify-center gap-2 shadow-sm cursor-pointer transition-colors"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>CONFIRMAR ENTREGA CONCLUÍDA ✓</span>
                      </button>
                    </div>
                  );
                })}

                {outForDeliveryOrders.length === 0 && (
                  <div className="text-center py-12 text-stone-500 space-y-2">
                    <Bike className="w-8 h-8 mx-auto text-stone-600" />
                    <p className="text-xs font-bold">Nenhum motoboy na rua agora</p>
                    <p className="text-[11px] text-stone-600">Despache pedidos prontos para acompanhar as rotas</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* COLUNA 5: CONCLUÍDOS (SELECIONÁVEL PELA ABA DE FILTRO)     */}
          {/* ======================================================== */}
          {activeFilterTab === 'delivered' && (
            <div className="col-span-full bg-stone-900/90 rounded-3xl border border-emerald-900/60 p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                <h3 className="text-base font-black text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Histórico de Pedidos Entregues ({deliveredOrders.length})</span>
                </h3>
                <span className="text-xs text-stone-400">Total Faturado: {formatBRL(deliveredOrders.reduce((s, o) => s + o.total, 0))}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {deliveredOrders.map((ord) => (
                  <div
                    key={ord.id}
                    className="p-4 rounded-2xl bg-stone-850 border border-stone-800 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-base font-black text-white">#{ord.orderNumber}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-950 text-emerald-300 border border-emerald-800">
                        Entregue ✓
                      </span>
                    </div>
                    <p className="font-extrabold text-stone-200">{ord.customerName}</p>
                    <p className="text-[11px] text-stone-400">
                      {ord.channel === 'takeout' ? '🛍️ Retirada no Balcão' : `🛵 Delivery (${ord.driverName || 'Motoboy'})`}
                    </p>
                    <div className="text-[11px] text-stone-400 pt-1 border-t border-stone-800">
                      {ord.items.map((i) => `${i.quantity}x ${i.name}`).join(', ')}
                    </div>
                    <div className="flex items-center justify-between pt-1 font-black text-emerald-400">
                      <span>Total:</span>
                      <span>{formatBRL(ord.total)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

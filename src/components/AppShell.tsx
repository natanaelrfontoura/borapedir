import React from 'react';
import {
  UtensilsCrossed,
  Sparkles,
  ChefHat,
  Wallet,
  HeartHandshake,
  Wifi,
  WifiOff,
  RefreshCw,
  LogIn,
  LogOut,
  X,
  CheckCircle2,
  LayoutGrid,
  Bike,
  Tablet,
  Flame,
  Gift,
  Store,
} from 'lucide-react';
import { useStore } from '../services/storeContext';
import { UserRole, RestaurantLayoutMode } from '../models/types';
import { LayoutSelectorModal } from './LayoutSelectorModal';

export type ActiveModule =
  | 'menu_combos'
  | 'operations'
  | 'omnichannel'
  | 'agents'
  | 'financial'
  | 'analytics';

interface AppShellProps {
  activeModule: ActiveModule;
  setActiveModule: (m: ActiveModule) => void;
  children: React.ReactNode;
}

const NAV_ITEMS: {
  id: ActiveModule;
  label: string;
  sublabel: string;
  icon: React.FC<{ className?: string }>;
  badge?: string;
}[] = [
  {
    id: 'menu_combos',
    label: 'Organizar Cardápio & Combos',
    sublabel: 'Cadastrar Pratos, Preços e Promoções',
    icon: Gift,
    badge: 'GERENTE',
  },
  {
    id: 'operations',
    label: 'Cozinha (KDS) & Estoque',
    sublabel: 'Tela da Cozinha, Receitas e Caixa',
    icon: ChefHat,
  },
  {
    id: 'omnichannel',
    label: 'Mesas, Garçom & WhatsApp',
    sublabel: 'Mapa do Salão, Pulseiras e Voz IA',
    icon: UtensilsCrossed,
  },
  {
    id: 'agents',
    label: 'Piloto Automático IA',
    sublabel: 'Promoções, Cardápio e Clientes Fiéis',
    icon: Sparkles,
  },
  {
    id: 'financial',
    label: 'Financeiro & Notas',
    sublabel: 'Lucro do Mês, Contas e Cupom Fiscal',
    icon: Wallet,
  },
  {
    id: 'analytics',
    label: 'Clientes, Mapa & Avaliações',
    sublabel: 'Região de Entrega, Satisfação e PDV',
    icon: HeartHandshake,
  },
];

const QUICK_LAYOUTS: {
  id: RestaurantLayoutMode;
  shortName: string;
  icon: React.FC<{ className?: string }>;
}[] = [
  { id: 'bistro_light', shortName: '1. Bistrô Claro', icon: UtensilsCrossed },
  { id: 'delivery_hub', shortName: '2. Estilo iFood / Delivery', icon: Bike },
  { id: 'pos_touch', shortName: '3. PDV Touch Balcão', icon: Tablet },
  { id: 'gastropub_warm', shortName: '4. Steakhouse Noturno', icon: Flame },
];

export const AppShell: React.FC<AppShellProps> = ({
  activeModule,
  setActiveModule,
  children,
}) => {
  const {
    user,
    userRole,
    setUserRole,
    layoutMode,
    setLayoutMode,
    setIsLayoutPickerOpen,
    lockManagerDashboard,
    loginWithGoogle,
    logout,
    isOffline,
    toggleOfflineSimulation,
    pendingSyncCount,
    syncNow,
    restaurant,
    orders,
    lastAgentToast,
    dismissAgentToast,
    setAppViewMode,
  } = useStore();

  const activeKitchenOrders = orders.filter(
    (o) => o.status === 'new' || o.status === 'preparing' || o.status === 'ready' || o.status === 'out_for_delivery'
  ).length;

  const isDarkGastropub = layoutMode === 'gastropub_warm';
  const isDeliveryTopNav = layoutMode === 'delivery_hub';
  const isPosTouch = layoutMode === 'pos_touch';

  // Theme wrapper classes per layout mode
  const rootThemeClass = isDarkGastropub
    ? 'bg-[#1C1917] text-[#FAFAF9]'
    : isDeliveryTopNav
    ? 'bg-[#F4F5F7] text-stone-900'
    : isPosTouch
    ? 'bg-[#F0FDF4] text-stone-900'
    : 'bg-[#FAF6F0] text-stone-900';

  const primaryAccentBg = isDarkGastropub
    ? 'bg-amber-600 hover:bg-amber-500 text-white'
    : isDeliveryTopNav
    ? 'bg-[#EA1D2C] hover:bg-[#C81422] text-white'
    : isPosTouch
    ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
    : 'bg-[#D94E1F] hover:bg-[#B83D14] text-white';

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-200 ${rootThemeClass}`}>
      {/* Modal de Escolha Visual de Layout */}
      <LayoutSelectorModal />

      {/* Top Layout Switcher Bar — Always Accessible to Test 4 Restaurant Styles */}
      <div
        className={`px-4 py-2 border-b flex flex-wrap items-center justify-between gap-2 text-xs ${
          isDarkGastropub
            ? 'bg-[#292524] border-stone-700 text-stone-200'
            : 'bg-white border-stone-200 text-stone-700 shadow-2xs'
        }`}
      >
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={lockManagerDashboard}
            className="px-3.5 py-1.5 rounded-full font-extrabold flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer"
          >
            <Store className="w-3.5 h-3.5" />
            <span>← Cardápio do Cliente</span>
          </button>

          <button
            onClick={() => setAppViewMode('kitchen_dispatch')}
            className="px-3.5 py-1.5 rounded-full font-extrabold flex items-center gap-1.5 bg-[#D94E1F] hover:bg-[#B83D14] text-white shadow-xs cursor-pointer"
          >
            <ChefHat className="w-3.5 h-3.5" />
            <span>Cozinha & KDS</span>
            {activeKitchenOrders > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-white text-[#D94E1F] text-[10px] font-black">
                {activeKitchenOrders}
              </span>
            )}
          </button>

          <button
            onClick={() => setIsLayoutPickerOpen(true)}
            className={`px-3 py-1.5 rounded-full font-bold flex items-center gap-1.5 shadow-xs cursor-pointer ${primaryAccentBg}`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Estilo do Painel (4 Opções)</span>
          </button>

          <span className="text-xs opacity-75 hidden sm:inline">Trocar visual com 1 clique:</span>

          <div className="flex items-center gap-1 flex-wrap">
            {QUICK_LAYOUTS.map((l) => {
              const Icon = l.icon;
              const active = layoutMode === l.id;
              return (
                <button
                  key={l.id}
                  onClick={() => setLayoutMode(l.id)}
                  className={`px-3 py-1 rounded-full font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    active
                      ? isDarkGastropub
                        ? 'bg-amber-500 text-stone-950 font-bold shadow-xs'
                        : 'bg-stone-900 text-white font-bold shadow-xs'
                      : isDarkGastropub
                      ? 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                      : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{l.shortName}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Quick Restaurant Status & User */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={toggleOfflineSimulation}
            className={`px-3 py-1 rounded-full font-semibold flex items-center gap-1.5 cursor-pointer border ${
              isOffline
                ? 'bg-amber-100 text-amber-900 border-amber-400'
                : isDarkGastropub
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700'
                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
            }`}
          >
            {isOffline ? (
              <>
                <WifiOff className="w-3.5 h-3.5 text-amber-600" />
                <span>Operando Sem Internet (Modo Contingência)</span>
              </>
            ) : (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-600" />
                <span>Restaurante Aberto & Online</span>
              </>
            )}
          </button>

          {pendingSyncCount > 0 && (
            <button
              onClick={syncNow}
              className="px-2.5 py-1 rounded-full bg-orange-100 text-orange-800 border border-orange-300 font-bold flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3 h-3 animate-spin" />
              <span>Sincronizar ({pendingSyncCount})</span>
            </button>
          )}

          <select
            value={userRole}
            onChange={(e) => setUserRole(e.target.value as UserRole)}
            aria-label="Selecionar função no restaurante"
            className={`rounded-full px-3 py-1 font-semibold border cursor-pointer focus:outline-none ${
              isDarkGastropub
                ? 'bg-stone-800 border-stone-700 text-stone-100'
                : 'bg-stone-100 border-stone-200 text-stone-800'
            }`}
          >
            <option value="admin">Visão: Dono / Sócio</option>
            <option value="manager">Visão: Gerente</option>
            <option value="waiter">Visão: Garçom de Salão</option>
            <option value="kitchen">Visão: Chef / Cozinha</option>
            <option value="cashier">Visão: Caixa</option>
          </select>

          {user ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-stone-100 text-stone-800">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span className="truncate max-w-[110px] font-medium">
                {user.displayName || user.email}
              </span>
              <button onClick={logout} title="Sair" className="text-stone-500 hover:text-red-600 cursor-pointer">
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={loginWithGoogle}
              className="px-3 py-1 rounded-full font-semibold bg-stone-900 text-white hover:bg-stone-800 flex items-center gap-1 cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Entrar</span>
            </button>
          )}
        </div>
      </div>

      {/* LAYOUT 2 ("DELIVERY HUB" / ESTILO IFOOD & ANOTA AI): Vibrant Red Top Header Bar */}
      {isDeliveryTopNav && (
        <header className="bg-[#EA1D2C] text-white shadow-md sticky top-0 z-30">
          <div className="max-w-[1600px] mx-auto px-4 lg:px-6 py-3 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white text-[#EA1D2C] flex items-center justify-center font-extrabold shadow-xs">
                <Bike className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-lg font-extrabold tracking-tight leading-none">
                  {restaurant.name}
                </h1>
                <p className="text-xs text-red-100 mt-0.5">
                  Central de Pedidos WhatsApp, Delivery & Salão • Tempo Médio: 18 min
                </p>
              </div>
            </div>

            <nav className="flex items-center gap-2 overflow-x-auto py-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = activeModule === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveModule(item.id)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shrink-0 cursor-pointer ${
                      isActive
                        ? 'bg-white text-[#EA1D2C] shadow-md'
                        : 'bg-red-700/60 text-white hover:bg-red-700'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                    {item.id === 'operations' && activeKitchenOrders > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-400 text-stone-950 font-extrabold">
                        {activeKitchenOrders}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </header>
      )}

      {/* LAYOUT 3 ("POS TOUCH BALCÃO"): Giant Touch Dock */}
      {isPosTouch && (
        <header className="bg-emerald-800 text-white shadow-md sticky top-0 z-30">
          <div className="max-w-[1600px] mx-auto px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-stone-950 flex items-center justify-center font-extrabold">
                <Tablet className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-base font-extrabold">{restaurant.name} — Frente de Caixa Touch</h1>
                <p className="text-xs text-emerald-200">Toque rápido para Garçom, Balcão e Comandas RFID</p>
              </div>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = activeModule === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveModule(item.id)}
                    className={`px-5 py-3 rounded-2xl text-sm font-extrabold flex items-center gap-2.5 transition-all shrink-0 cursor-pointer ${
                      isActive
                        ? 'bg-amber-400 text-stone-950 shadow-lg scale-[1.02]'
                        : 'bg-emerald-900/70 text-emerald-100 hover:bg-emerald-900'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </header>
      )}

      {/* Body Container (With Sidebar for Layout 1 & Layout 4, or Full-Width for Layout 2 & 3) */}
      <div className="flex-1 flex flex-col lg:flex-row">
        {!isDeliveryTopNav && !isPosTouch && (
          <aside
            className={`w-full lg:w-72 shrink-0 flex flex-col border-b lg:border-b-0 lg:border-r ${
              isDarkGastropub
                ? 'bg-[#24201D] border-stone-800'
                : 'bg-white border-stone-200/80 shadow-xs'
            }`}
          >
            {/* Restaurant Brand Card */}
            <div
              className={`p-5 border-b ${
                isDarkGastropub ? 'border-stone-800' : 'border-stone-100'
              }`}
            >
              <div className="flex items-center gap-3.5">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-md ${
                    isDarkGastropub
                      ? 'bg-gradient-to-br from-amber-500 to-orange-700'
                      : 'bg-gradient-to-br from-[#D94E1F] to-[#9A3412]'
                  }`}
                >
                  <UtensilsCrossed className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-orange-600 block">
                    Restaurante Ativo
                  </span>
                  <h1
                    className={`font-display font-extrabold text-base leading-tight ${
                      isDarkGastropub ? 'text-white' : 'text-stone-900'
                    }`}
                  >
                    {restaurant.name}
                  </h1>
                  <p className="text-xs text-stone-500 mt-0.5">Pinheiros, São Paulo</p>
                </div>
              </div>
            </div>

            {/* Friendly Restaurant Navigation */}
            <nav className="p-3.5 space-y-1.5 flex-1 flex lg:flex-col overflow-x-auto lg:overflow-x-visible gap-2 lg:gap-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = activeModule === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveModule(item.id)}
                    className={`w-full text-left px-4 py-3.5 rounded-2xl transition-all flex items-center gap-3.5 shrink-0 lg:shrink cursor-pointer ${
                      isActive
                        ? isDarkGastropub
                          ? 'bg-amber-500 text-stone-950 font-bold shadow-md'
                          : 'bg-[#FFF3ED] text-[#D94E1F] border border-[#FDBA9C] shadow-xs'
                        : isDarkGastropub
                        ? 'text-stone-300 hover:bg-stone-800/70'
                        : 'text-stone-600 hover:bg-stone-100/80 hover:text-stone-900'
                    }`}
                  >
                    <div
                      className={`p-2.5 rounded-xl ${
                        isActive
                          ? isDarkGastropub
                            ? 'bg-stone-950 text-amber-400'
                            : 'bg-[#D94E1F] text-white'
                          : isDarkGastropub
                          ? 'bg-stone-800 text-stone-400'
                          : 'bg-stone-100 text-stone-600'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-sm font-bold truncate">{item.label}</span>
                        {item.id === 'operations' && activeKitchenOrders > 0 && (
                          <span className="px-2 py-0.5 text-[11px] font-extrabold rounded-full bg-orange-600 text-white">
                            {activeKitchenOrders} na fila
                          </span>
                        )}
                      </div>
                      <p
                        className={`text-xs truncate hidden sm:block ${
                          isActive
                            ? isDarkGastropub
                              ? 'text-stone-800'
                              : 'text-orange-900/70'
                            : 'text-stone-400'
                        }`}
                      >
                        {item.sublabel}
                      </p>
                    </div>
                  </button>
                );
              })}
            </nav>

            {/* Daily Summary Widget in Sidebar */}
            <div
              className={`hidden lg:block p-4 m-4 rounded-2xl border ${
                isDarkGastropub
                  ? 'bg-stone-800/60 border-stone-700'
                  : 'bg-[#FAF6F0] border-stone-200'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-bold mb-2">
                <span className="flex items-center gap-1.5 text-emerald-600">
                  <Sparkles className="w-4 h-4" />
                  Resumo do Turno Hoje
                </span>
                <span className="text-emerald-600">Sexta-feira</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div
                  className={`p-2.5 rounded-xl ${
                    isDarkGastropub ? 'bg-stone-900' : 'bg-white'
                  }`}
                >
                  <span className="text-stone-400 block text-[11px]">Pedidos Hoje</span>
                  <span className="text-base font-extrabold">38 pedidos</span>
                </div>
                <div
                  className={`p-2.5 rounded-xl ${
                    isDarkGastropub ? 'bg-stone-900' : 'bg-white'
                  }`}
                >
                  <span className="text-stone-400 block text-[11px]">Tempo Cozinha</span>
                  <span className="text-base font-extrabold text-emerald-600">16 min</span>
                </div>
              </div>
            </div>
          </aside>
        )}

        {/* Main Workspace Content */}
        <main className="flex-1 p-4 lg:p-7 max-w-[1560px] w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Friendly Toast when an AI Helper Action Completes */}
      {lastAgentToast && (
        <div className="fixed bottom-5 right-5 z-50 max-w-md bg-white text-stone-900 border-2 border-emerald-500 rounded-2xl p-4 shadow-2xl">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-extrabold text-emerald-700">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>AÇÃO AUTOMÁTICA DO RESTAURANTE</span>
            </div>
            <button
              onClick={dismissAgentToast}
              className="text-stone-400 hover:text-stone-700 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-sm font-medium text-stone-800 mt-1.5 leading-snug">
            {lastAgentToast.summary}
          </p>
          <div className="mt-2.5 pt-2 border-t border-stone-100 flex items-center justify-between text-xs">
            <span className="text-emerald-700 font-bold">{lastAgentToast.impactMetric}</span>
            <span className="text-stone-500">Aplicado agora</span>
          </div>
        </div>
      )}
    </div>
  );
};

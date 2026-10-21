/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { StoreProvider, useStore } from './services/storeContext';
import { AppShell, ActiveModule } from './components/AppShell';
import { CustomerStorefrontPage } from './pages/CustomerStorefrontPage';
import { KitchenDispatchPage } from './pages/KitchenDispatchPage';
import { ManagerMenuCombosPage } from './pages/ManagerMenuCombosPage';
import { OmnichannelPage } from './pages/OmnichannelPage';
import { AgentsHubPage } from './pages/AgentsHubPage';
import { OperationsPage } from './pages/OperationsPage';
import { FinancialFiscalPage } from './pages/FinancialFiscalPage';
import { AnalyticsQualityPage } from './pages/AnalyticsQualityPage';

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; errorMessage: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, errorMessage: error.message };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#FAF6F0] text-stone-900 flex items-center justify-center p-6">
          <div className="max-w-md bg-white border border-red-200 rounded-3xl p-6 space-y-4 shadow-xl">
            <h2 className="text-base font-extrabold text-stone-900">
              Contingência Operacional Acionada
            </h2>
            <p className="text-xs text-stone-600 leading-relaxed">
              Ocorreu uma exceção inesperada, mas seus dados locais estão protegidos: {this.state.errorMessage}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full py-2.5 rounded-2xl bg-[#D94E1F] text-white text-xs font-extrabold cursor-pointer"
            >
              Recarregar Interface
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const MainRouter: React.FC = () => {
  const { appViewMode } = useStore();
  const [activeModule, setActiveModule] = useState<ActiveModule>('menu_combos');

  // Tela de Chegada e Produção de Pedidos (Cozinha & Despacho de Entregadores)
  if (appViewMode === 'kitchen_dispatch') {
    return <KitchenDispatchPage />;
  }

  // Tela Principal do Sistema: Área do Cliente (Cardápio Digital com Produtos e Combos)
  if (appViewMode === 'customer_storefront') {
    return <CustomerStorefrontPage />;
  }

  // Dashboard Completa Restrita ao Gerente
  return (
    <AppShell activeModule={activeModule} setActiveModule={setActiveModule}>
      {activeModule === 'menu_combos' && <ManagerMenuCombosPage />}
      {activeModule === 'operations' && <OperationsPage />}
      {activeModule === 'omnichannel' && <OmnichannelPage />}
      {activeModule === 'agents' && <AgentsHubPage />}
      {activeModule === 'financial' && <FinancialFiscalPage />}
      {activeModule === 'analytics' && <AnalyticsQualityPage />}
    </AppShell>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <StoreProvider>
        <MainRouter />
      </StoreProvider>
    </ErrorBoundary>
  );
}

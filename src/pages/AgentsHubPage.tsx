import React from 'react';
import {
  Sparkles,
  TrendingUp,
  PackageCheck,
  UserCheck,
  Scale,
  CheckCircle2,
  Zap,
} from 'lucide-react';
import { useStore } from '../services/storeContext';
import { formatBRL } from '../utils/formatters';

const ANOTA_AI_COMPARISON = [
  {
    feature: 'Atendimento no WhatsApp',
    anotaAi: 'Robô passivo que só manda o link quando o cliente chama',
    nexoAi: 'Chama o cliente pelo nome no dia que ele costuma pedir e entende áudio ("o mesmo de sempre")',
    metric: '+38% mais pedidos',
  },
  {
    feature: 'Ordem dos Pratos no Cardápio',
    anotaAi: 'Ordem fixa manual (você precisa arrastar na mão)',
    nexoAi: 'Coloca os pratos que dão mais lucro no topo sozinho e esconde os que estão acabando na cozinha',
    metric: '+R$ 1.420/dia em lucro',
  },
  {
    feature: 'Controle de Despensa e Compras',
    anotaAi: 'Só baixa estoque depois que você digita a nota',
    nexoAi: 'Avisa antes de acabar olhando a previsão de chuva e movimento do fim de semana',
    metric: 'Não falta ingrediente',
  },
  {
    feature: 'Promoções e Cupons',
    anotaAi: 'Cliente precisa lembrar código de cupom',
    nexoAi: 'Calcula sozinho o melhor combo ou cashback e mostra "Você economizou R$ X" na hora de pagar',
    metric: 'Mais clientes fecham a conta',
  },
  {
    feature: 'Resgate de Clientes Sumidos',
    anotaAi: 'Fidelidade igual para todo mundo',
    nexoAi: 'Percebe quando um cliente fiel sumiu há mais de 15 dias e manda um mimo no WhatsApp',
    metric: '86% dos clientes voltam',
  },
  {
    feature: 'Preços & Impostos Novos (2026)',
    anotaAi: 'Apenas preenche código fiscal',
    nexoAi: 'Ajusta o preço sugerido dos pratos e bebidas para o imposto nunca comer o seu lucro',
    metric: 'Lucro protegido',
  },
];

export const AgentsHubPage: React.FC = () => {
  const {
    menuItems,
    inventory,
    customers,
    agentLogs,
    layoutMode,
    triggerAutonomousMenuAgent,
    triggerPredictiveStockAgent,
    triggerTaxReformPricingAgent,
    triggerChurnRecoveryCampaign,
  } = useStore();

  const isDark = layoutMode === 'gastropub_warm';
  const cardSurface = isDark
    ? 'bg-[#292524] border-stone-700 text-stone-100'
    : 'bg-white border-stone-200 text-stone-900 shadow-xs';

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className={`rounded-3xl p-6 border flex flex-wrap items-center justify-between gap-4 ${cardSurface}`}>
        <div className="max-w-3xl space-y-1">
          <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-orange-600">
            <Sparkles className="w-4 h-4" />
            Gerente Inteligente 24 Horas
          </span>
          <h1 className="text-xl lg:text-2xl font-extrabold">
            Piloto Automático de Vendas, Cardápio e Clientes Fiéis
          </h1>
          <p className="text-xs text-stone-500 leading-relaxed">
            Enquanto você cuida da cozinha e do salão, nossos assistentes organizam os pratos mais lucrativos, chamam clientes sumidos no WhatsApp e avisam o que precisa comprar.
          </p>
        </div>

        <button
          onClick={triggerAutonomousMenuAgent}
          className="px-5 py-3 rounded-2xl bg-[#D94E1F] hover:bg-[#B83D14] text-white text-xs font-extrabold flex items-center gap-2 shadow-md cursor-pointer"
        >
          <Zap className="w-4 h-4" />
          <span>Otimizar Meu Restaurante Agora</span>
        </button>
      </div>

      {/* 4 Cards Simples e Intuitivos dos Assistentes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* 1. Organizador de Cardápio */}
        <div className={`rounded-3xl border p-6 flex flex-col justify-between space-y-4 ${cardSurface}`}>
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-orange-600 uppercase flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4" />
                1. Vitrine Inteligente do Cardápio
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                Ligado
              </span>
            </div>
            <h3 className="text-base font-extrabold mt-1">
              Destaca os pratos que dão mais dinheiro no bolso
            </h3>
            <p className="text-xs text-stone-500 mt-1">
              Coloca automaticamente no topo do QR Code os pratos com maior margem de lucro e que têm bastante ingrediente na cozinha.
            </p>

            <div className="mt-4 space-y-2">
              {menuItems.slice(0, 3).map((m) => (
                <div
                  key={m.id}
                  className="p-3 rounded-2xl bg-stone-100/80 text-stone-900 flex items-center justify-between text-xs"
                >
                  <span className="font-extrabold">
                    {m.displayOrder}º Lugar — {m.name}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-600 text-white font-bold">
                    Lucro {m.marginPercent}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={triggerAutonomousMenuAgent}
            className="w-full py-3 rounded-2xl bg-orange-50 hover:bg-orange-100 text-[#D94E1F] border border-orange-200 text-xs font-extrabold cursor-pointer"
          >
            Reorganizar Vitrine do Cardápio Agora
          </button>
        </div>

        {/* 2. Recuperador de Clientes Sumidos */}
        <div className={`rounded-3xl border p-6 flex flex-col justify-between space-y-4 ${cardSurface}`}>
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-emerald-600 uppercase flex items-center gap-1.5">
                <UserCheck className="w-4 h-4" />
                2. Resgate de Clientes no WhatsApp
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                Automático
              </span>
            </div>
            <h3 className="text-base font-extrabold mt-1">
              Não deixa seus melhores clientes esquecerem de você
            </h3>
            <p className="text-xs text-stone-500 mt-1">
              Quando um cliente fiel demora mais dias do que o normal para pedir, o sistema envia um presente personalizado no WhatsApp dele.
            </p>

            <div className="mt-4 space-y-2">
              {customers.slice(0, 3).map((c) => (
                <div
                  key={c.id}
                  className="p-3 rounded-2xl bg-stone-100/80 text-stone-900 flex items-center justify-between gap-2 text-xs"
                >
                  <div>
                    <span className="font-extrabold block">{c.name}</span>
                    <span className="text-stone-500">
                      Último pedido: há {c.daysSinceLastOrder} dias • Já gastou {formatBRL(c.lifetimeValue)}
                    </span>
                  </div>
                  <button
                    onClick={() => triggerChurnRecoveryCampaign(c.id)}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold shrink-0 cursor-pointer"
                  >
                    Mandar Convite VIP
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 3. Previsão de Compras */}
        <div className={`rounded-3xl border p-6 flex flex-col justify-between space-y-4 ${cardSurface}`}>
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-sky-600 uppercase flex items-center gap-1.5">
                <PackageCheck className="w-4 h-4" />
                3. Previsão de Compras & Clima
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-100 text-sky-800">
                Sexta Chuvosa (+34% Delivery)
              </span>
            </div>
            <h3 className="text-base font-extrabold mt-1">
              Avisa o que comprar antes de faltar na sexta à noite
            </h3>
            <p className="text-xs text-stone-500 mt-1">
              Cruza o clima da cidade com as vendas das últimas semanas para sugerir a quantidade exata de carne, pão e bebidas.
            </p>
          </div>

          <button
            onClick={triggerPredictiveStockAgent}
            className="w-full py-3 rounded-2xl bg-sky-50 hover:bg-sky-100 text-sky-900 border border-sky-200 text-xs font-extrabold cursor-pointer"
          >
            Atualizar Previsão de Estoque Agora
          </button>
        </div>

        {/* 4. Protetor de Preços & Impostos */}
        <div className={`rounded-3xl border p-6 flex flex-col justify-between space-y-4 ${cardSurface}`}>
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-amber-600 uppercase flex items-center gap-1.5">
                <Scale className="w-4 h-4" />
                4. Protetor de Lucro nos Preços
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900">
                Reforma 2026
              </span>
            </div>
            <h3 className="text-base font-extrabold mt-1">
              Sugere o preço ideal de cada prato e bebida
            </h3>
            <p className="text-xs text-stone-500 mt-1">
              Aproveita o desconto de 60% de imposto para restaurantes em pratos feitos na cozinha e ajusta bebidas para você nunca perder margem.
            </p>
          </div>

          <button
            onClick={triggerTaxReformPricingAgent}
            className="w-full py-3 rounded-2xl bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-300 text-xs font-extrabold cursor-pointer"
          >
            Recalcular Preços Sugeridos
          </button>
        </div>
      </div>

      {/* Comparativo Claro: Anota AI vs Nosso Sistema */}
      <div className={`rounded-3xl border overflow-hidden ${cardSurface}`}>
        <div className="p-5 border-b border-stone-200/60">
          <h2 className="text-base font-extrabold">
            Por que este sistema traz mais lucro que o Anota AI comum?
          </h2>
          <p className="text-xs text-stone-500">
            Veja na prática como o sistema trabalha por você sem precisar configurar regras complicadas:
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-100/80 text-stone-600">
                <th className="py-3.5 px-4 font-extrabold">Área do Restaurante</th>
                <th className="py-3.5 px-4 font-extrabold">Sistemas Comuns (Anota AI)</th>
                <th className="py-3.5 px-4 font-extrabold text-emerald-700">Como Fazemos Aqui</th>
                <th className="py-3.5 px-4 font-extrabold text-right">Resultado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200/60">
              {ANOTA_AI_COMPARISON.map((row, idx) => (
                <tr key={idx}>
                  <td className="py-3.5 px-4 font-extrabold">{row.feature}</td>
                  <td className="py-3.5 px-4 text-stone-500">{row.anotaAi}</td>
                  <td className="py-3.5 px-4 font-medium flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{row.nexoAi}</span>
                  </td>
                  <td className="py-3.5 px-4 text-right font-extrabold text-emerald-600">
                    {row.metric}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Últimas Ações que o Sistema Fez Sozinho */}
      <div className={`rounded-3xl border p-5 space-y-3 ${cardSurface}`}>
        <h3 className="text-sm font-extrabold flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-orange-600" />
          <span>Últimas Melhorias Feitas Automaticamente Hoje</span>
        </h3>
        <div className="space-y-2.5">
          {agentLogs.slice(0, 4).map((log) => (
            <div
              key={log.id}
              className="p-4 rounded-2xl bg-stone-100/80 text-stone-900 flex flex-col md:flex-row md:items-center justify-between gap-3"
            >
              <div>
                <span className="text-xs font-extrabold text-orange-700">
                  {log.agentName} • {log.executedAt}
                </span>
                <p className="text-sm font-bold mt-0.5">{log.summary}</p>
              </div>
              <span className="px-3 py-1 rounded-full bg-emerald-600 text-white text-xs font-extrabold shrink-0">
                {log.impactMetric}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

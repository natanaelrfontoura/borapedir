import React from 'react';
import {
  UtensilsCrossed,
  Bike,
  Tablet,
  Flame,
  Check,
  X,
  Sparkles,
  LayoutGrid,
} from 'lucide-react';
import { useStore } from '../services/storeContext';
import { RestaurantLayoutMode } from '../models/types';

export const LAYOUT_OPTIONS: {
  id: RestaurantLayoutMode;
  title: string;
  subtitle: string;
  inspiration: string;
  description: string;
  colors: { bg: string; accent: string; card: string; text: string };
  highlights: string[];
  icon: React.FC<{ className?: string }>;
}[] = [
  {
    id: 'bistro_light',
    title: '1. Bistrô & Gastronomia (Claro & Acolhedor)',
    subtitle: 'Visual limpo, fotos grandes dos pratos e navegação super intuitiva',
    inspiration: 'Inspirado em Goomer / Toast POS Light',
    description:
      'Fundo creme suave, cartões claros com fotos apetitosas dos pratos, linguagem simples de restaurante e menu lateral acolhedor.',
    colors: {
      bg: '#FAF6F0',
      card: '#FFFFFF',
      accent: '#D94E1F',
      text: '#1C1917',
    },
    highlights: [
      'Fotos reais e grandes dos pratos no cardápio',
      'Leitura confortável o dia inteiro sem parecer tela de programação',
      'Ideal para donos de restaurante, gerentes e atendimento geral',
    ],
    icon: UtensilsCrossed,
  },
  {
    id: 'delivery_hub',
    title: '2. Central Delivery & WhatsApp (Vibrante)',
    subtitle: 'Barra vermelha no topo e foco total em pedidos entrando e WhatsApp',
    inspiration: 'Inspirado em iFood Parceiros / Anota AI Pro',
    description:
      'Sem barra lateral ocupando espaço: menu rápido no topo em vermelho gastronômico, tela ampla para acompanhar pedidos do WhatsApp, Voz e Delivery.',
    colors: {
      bg: '#F4F5F7',
      card: '#FFFFFF',
      accent: '#EA1D2C',
      text: '#111827',
    },
    highlights: [
      'Cabeçalho vermelho vibrante com atalhos diretos no topo',
      'Chat do WhatsApp idêntico ao WhatsApp real (verde e bege)',
      'Perfeito para operações com alto volume de Delivery e WhatsApp',
    ],
    icon: Bike,
  },
  {
    id: 'pos_touch',
    title: '3. Frente de Caixa & Garçom Touch (PDV Balcão)',
    subtitle: 'Botões grandes para toque rápido com o dedo em Tablet ou Monitor Touch',
    inspiration: 'Inspirado em Square for Restaurants / PDV Touch',
    description:
      'Focado em agilidade de balcão e salão: grade de produtos com toque rápido, comanda sempre visível à direita e mapa de mesas redondas.',
    colors: {
      bg: '#F0FDF4',
      card: '#FFFFFF',
      accent: '#15803D',
      text: '#14532D',
    },
    highlights: [
      'Botões amplos feitos para toque rápido sem erro',
      'Comanda e desconto inteligente sempre abertos na lateral',
      'Excelente para garçons no salão e operadores de caixa',
    ],
    icon: Tablet,
  },
  {
    id: 'gastropub_warm',
    title: '4. Steakhouse & Bar Noturno (Madeira & Âmbar)',
    subtitle: 'Tons quentes de café e dourado para ambientes de salão à meia-luz',
    inspiration: 'Inspirado em Lounges, Parrillas & Bares Artesanais',
    description:
      'Substitui o preto/azul frio de programação por tons quentes de madeira torrada, café expresso e dourado âmbar para não ofuscar a vista no salão à noite.',
    colors: {
      bg: '#1C1917',
      card: '#292524',
      accent: '#D97706',
      text: '#FAFAF9',
    },
    highlights: [
      'Conforto visual para operação noturna de bar e cozinha (KDS)',
      'Visual sofisticado de parrilla e gastropub',
      'Contraste quente em âmbar e verde esmeralda',
    ],
    icon: Flame,
  },
];

export const LayoutSelectorModal: React.FC = () => {
  const { layoutMode, setLayoutMode, isLayoutPickerOpen, setIsLayoutPickerOpen } = useStore();

  if (!isLayoutPickerOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white text-stone-900 rounded-3xl max-w-5xl w-full p-6 lg:p-8 shadow-2xl border border-stone-200 my-auto max-h-[92vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-4 border-b border-stone-200 pb-5">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-100 text-orange-800 text-xs font-bold mb-2">
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Personalize a Cara do Seu Restaurante</span>
            </div>
            <h2 className="text-2xl lg:text-3xl font-extrabold text-stone-900 tracking-tight">
              Escolha o Layout Ideal para a Sua Operação
            </h2>
            <p className="text-sm text-stone-600 mt-1">
              Removemos toda a aparência técnica de programação. Clique em qualquer uma das 4 opções abaixo para transformar o sistema instantaneamente:
            </p>
          </div>
          <button
            onClick={() => setIsLayoutPickerOpen(false)}
            className="p-2 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 4 Visual Layout Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 my-6">
          {LAYOUT_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const isSelected = layoutMode === opt.id;
            return (
              <div
                key={opt.id}
                onClick={() => {
                  setLayoutMode(opt.id);
                  setIsLayoutPickerOpen(false);
                }}
                className={`group rounded-2xl border-2 p-5 transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'border-orange-600 bg-orange-50/40 shadow-lg ring-2 ring-orange-500/20'
                    : 'border-stone-200 hover:border-orange-400 bg-white hover:shadow-md'
                }`}
              >
                <div>
                  {/* Mini Visual Mockup Header */}
                  <div
                    className="h-24 rounded-xl mb-4 p-3 flex flex-col justify-between border border-black/10 shadow-inner"
                    style={{ backgroundColor: opt.colors.bg }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-white shadow-sm"
                          style={{ backgroundColor: opt.colors.accent }}
                        >
                          <Icon className="w-4 h-4" />
                        </span>
                        <span
                          className="text-xs font-bold"
                          style={{ color: opt.colors.text }}
                        >
                          {opt.inspiration}
                        </span>
                      </div>
                      <div className="flex gap-1.5">
                        <span
                          className="w-4 h-4 rounded-full border border-black/10"
                          style={{ backgroundColor: opt.colors.bg }}
                        />
                        <span
                          className="w-4 h-4 rounded-full border border-black/10"
                          style={{ backgroundColor: opt.colors.accent }}
                        />
                        <span
                          className="w-4 h-4 rounded-full border border-black/10"
                          style={{ backgroundColor: opt.colors.card }}
                        />
                      </div>
                    </div>

                    {/* Mini UI bars preview */}
                    <div className="grid grid-cols-3 gap-2">
                      <div
                        className="h-7 rounded-md border border-black/5 px-2 flex items-center"
                        style={{ backgroundColor: opt.colors.card }}
                      >
                        <div
                          className="w-full h-2 rounded-full opacity-70"
                          style={{ backgroundColor: opt.colors.accent }}
                        />
                      </div>
                      <div
                        className="h-7 rounded-md border border-black/5 px-2 flex items-center"
                        style={{ backgroundColor: opt.colors.card }}
                      >
                        <div className="w-2/3 h-2 rounded-full bg-emerald-500/60" />
                      </div>
                      <div
                        className="h-7 rounded-md border border-black/5 px-2 flex items-center"
                        style={{ backgroundColor: opt.colors.card }}
                      >
                        <div className="w-3/4 h-2 rounded-full bg-amber-500/60" />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-base font-extrabold text-stone-900">{opt.title}</h3>
                      <p className="text-xs font-semibold text-orange-700 mt-0.5">{opt.subtitle}</p>
                    </div>
                    {isSelected && (
                      <span className="px-2.5 py-1 rounded-full bg-orange-600 text-white text-xs font-bold flex items-center gap-1 shrink-0">
                        <Check className="w-3.5 h-3.5" /> Ativo
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-stone-600 mt-2 leading-relaxed">{opt.description}</p>

                  <ul className="mt-3 space-y-1">
                    {opt.highlights.map((h, i) => (
                      <li key={i} className="text-xs text-stone-700 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  type="button"
                  className={`mt-4 w-full py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-orange-600 text-white shadow-md'
                      : 'bg-stone-100 group-hover:bg-orange-600 group-hover:text-white text-stone-800'
                  }`}
                >
                  {isSelected ? '✓ Layout Selecionado — Continuar Usando' : 'Aplicar Este Layout Agora'}
                </button>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-stone-200 text-xs text-stone-500">
          <span>
            Dica: Você também pode alternar entre os 4 layouts a qualquer momento na barra superior da tela!
          </span>
          <button
            onClick={() => setIsLayoutPickerOpen(false)}
            className="px-5 py-2 rounded-xl bg-stone-900 text-white font-bold hover:bg-stone-800 cursor-pointer"
          >
            Fechar Galeria
          </button>
        </div>
      </div>
    </div>
  );
};

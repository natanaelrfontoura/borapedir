import React, { useState } from 'react';
import {
  Plus,
  Sparkles,
  Gift,
  Utensils,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  Trash2,
  CheckCircle2,
  Flame,
} from 'lucide-react';
import { useStore } from '../services/storeContext';
import { formatBRL } from '../utils/formatters';
import { MenuItem, ComboIncludedItem } from '../models/types';

const PRESET_PHOTOS = [
  {
    label: 'Foto Pizza Artesanal',
    url: '/src/assets/images/pizza_artesanal_destaque_1790728826411.jpg',
  },
  {
    label: 'Foto Pizza Doce',
    url: '/src/assets/images/pizza_doce_chocolate_1790729049026.jpg',
  },
  {
    label: 'Foto Esfihas Salgadas',
    url: '/src/assets/images/esfihas_artesanais_1790729059940.jpg',
  },
  {
    label: 'Foto Esfihas Doces',
    url: '/src/assets/images/esfihas_doces_1790729072111.jpg',
  },
  {
    label: 'Foto Refrigerantes',
    url: '/src/assets/images/refrigerantes_gelados_1790729083559.jpg',
  },
];

export const ManagerMenuCombosPage: React.FC = () => {
  const {
    menuItems,
    combos,
    layoutMode,
    addMenuItem,
    updateMenuItem,
    deleteMenuItem,
    moveMenuItemOrder,
    addCombo,
    updateCombo,
    deleteCombo,
    triggerAutonomousMenuAgent,
    setAppViewMode,
  } = useStore();

  const isDark = layoutMode === 'gastropub_warm';
  const cardSurface = isDark
    ? 'bg-[#292524] border-stone-700 text-stone-100'
    : 'bg-white border-stone-200 text-stone-900 shadow-xs';

  const [subTab, setSubTab] = useState<'manage_combos' | 'manage_products'>('manage_combos');

  // Formulário para Criar Novo Combo Promocional
  const [comboName, setComboName] = useState('');
  const [comboBadge, setComboBadge] = useState('Oferta Especial do Gerente');
  const [comboServes, setComboServes] = useState<number>(2);
  const [comboPhoto, setComboPhoto] = useState(PRESET_PHOTOS[0].url);
  const [comboItems, setComboItems] = useState<ComboIncludedItem[]>([
    { menuItemId: 'item-wagyu-burger', name: 'Burger Brasa Wagyu Trufado 200g', quantity: 2 },
    { menuItemId: 'item-coca-zero', name: 'Coca-Cola Zero Açúcar Lata 350ml', quantity: 2 },
  ]);
  const [customComboPrice, setCustomComboPrice] = useState<string>('114.90');
  const [feedbackBanner, setFeedbackBanner] = useState<string | null>(null);

  // Formulário para Criar Novo Produto no Cardápio
  const [prodName, setProdName] = useState('');
  const [prodDesc, setProdDesc] = useState('');
  const [prodCategory, setProdCategory] = useState<MenuItem['category']>('Pizzas');
  const [prodPrice, setProdPrice] = useState('34.99');
  const [prodCost, setProdCost] = useState('12.00');
  const [prodStock, setProdStock] = useState('60');
  const [prodBadge, setProdBadge] = useState('Novidade da Casa');
  const [prodPhoto, setProdPhoto] = useState(PRESET_PHOTOS[0].url);

  // Calcula soma original e custo do combo sendo montado
  const calculatedComboOriginalPrice = comboItems.reduce((acc, inc) => {
    const found = menuItems.find((m) => m.id === inc.menuItemId);
    return acc + (found ? found.price * inc.quantity : 0);
  }, 0);

  const calculatedComboCost = comboItems.reduce((acc, inc) => {
    const found = menuItems.find((m) => m.id === inc.menuItemId);
    return acc + (found ? found.cost * inc.quantity : 0);
  }, 0);

  const handleToggleItemInNewCombo = (item: MenuItem) => {
    setComboItems((prev) => {
      const exists = prev.find((i) => i.menuItemId === item.id);
      if (exists) {
        return prev.filter((i) => i.menuItemId !== item.id);
      }
      return [...prev, { menuItemId: item.id, name: item.name, quantity: 1 }];
    });
  };

  const handleChangeComboItemQty = (menuItemId: string, qty: number) => {
    setComboItems((prev) =>
      prev.map((i) => (i.menuItemId === menuItemId ? { ...i, quantity: Math.max(1, qty) } : i))
    );
  };

  const handleCreateCombo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comboName.trim() || comboItems.length === 0) return;

    const description = comboItems.map((i) => `${i.quantity}x ${i.name}`).join(' + ');
    const comboPriceNum = parseFloat(customComboPrice) || calculatedComboOriginalPrice * 0.85;

    await addCombo({
      name: comboName,
      description,
      itemsIncluded: comboItems,
      originalPrice: Number(calculatedComboOriginalPrice.toFixed(2)),
      comboPrice: Number(comboPriceNum.toFixed(2)),
      cost: Number(calculatedComboCost.toFixed(2)),
      badge: comboBadge,
      imageUrl: comboPhoto,
      isActive: true,
      servesCount: comboServes,
    });

    setComboName('');
    setFeedbackBanner('Novo Combo publicado imediatamente no Cardápio Digital do Cliente!');
    setTimeout(() => setFeedbackBanner(null), 5000);
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodName.trim()) return;

    await addMenuItem({
      name: prodName,
      description: prodDesc || 'Preparado na hora com ingredientes selecionados.',
      category: prodCategory,
      price: parseFloat(prodPrice) || 39.9,
      cost: parseFloat(prodCost) || 12.0,
      stockAvailable: parseInt(prodStock, 10) || 30,
      conversionRate: 0.25,
      ncm: '2106.90.90',
      cfop: '5101',
      taxClassification2026: 'ALIMENTACAO_PREPARADA_REDUCAO_60',
      ibsRate: 6.9,
      cbsRate: 3.7,
      isRate: 0,
      isActive: true,
      aiBadge: prodBadge,
      imageUrl: prodPhoto,
      tags: ['Novo'],
    });

    setProdName('');
    setProdDesc('');
    setFeedbackBanner('Novo Produto adicionado ao Cardápio Digital do Cliente!');
    setTimeout(() => setFeedbackBanner(null), 5000);
  };

  return (
    <div className="space-y-6">
      {/* Topo do Gestor de Cardápio & Combos */}
      <div className={`rounded-3xl p-6 border flex flex-wrap items-center justify-between gap-4 ${cardSurface}`}>
        <div>
          <span className="text-xs font-extrabold uppercase tracking-wider text-orange-600 block">
            Controle Exclusivo do Gerente
          </span>
          <h2 className="text-xl lg:text-2xl font-extrabold">
            Organizar Cardápio Digital, Produtos, Preços e Combos
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Tudo o que você criar, pausar ou alterar aqui atualiza na mesma hora na Tela Principal do Cliente.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setSubTab('manage_combos')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold flex items-center gap-2 cursor-pointer ${
              subTab === 'manage_combos'
                ? 'bg-[#D94E1F] text-white shadow-sm'
                : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
            }`}
          >
            <Gift className="w-4 h-4" />
            <span>Gerenciar Combos ({combos.length})</span>
          </button>

          <button
            onClick={() => setSubTab('manage_products')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold flex items-center gap-2 cursor-pointer ${
              subTab === 'manage_products'
                ? 'bg-[#D94E1F] text-white shadow-sm'
                : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
            }`}
          >
            <Utensils className="w-4 h-4" />
            <span>Gerenciar Produtos ({menuItems.length})</span>
          </button>

          <button
            onClick={() => setAppViewMode('customer_storefront')}
            className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Eye className="w-4 h-4" />
            <span>Ver no Cardápio do Cliente</span>
          </button>
        </div>
      </div>

      {feedbackBanner && (
        <div className="p-4 rounded-2xl bg-emerald-600 text-white text-sm font-extrabold flex items-center gap-2 shadow-md">
          <CheckCircle2 className="w-5 h-5" />
          <span>{feedbackBanner}</span>
        </div>
      )}

      {/* SUB-ABA 1: CRIAR E ORGANIZAR COMBOS PROMOCIONAIS */}
      {subTab === 'manage_combos' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Esquerda 5 Colunas: Construtor Visual de Novo Combo */}
          <div className={`lg:col-span-5 rounded-3xl border p-6 space-y-4 ${cardSurface}`}>
            <div className="flex items-center gap-2 border-b border-stone-200/60 pb-3">
              <Gift className="w-5 h-5 text-[#D94E1F]" />
              <h3 className="text-base font-extrabold">Criar Novo Combo Promocional</h3>
            </div>

            <form onSubmit={handleCreateCombo} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-stone-500 block mb-1">Nome do Combo:</label>
                <input
                  type="text"
                  value={comboName}
                  onChange={(e) => setComboName(e.target.value)}
                  placeholder="Ex: Combo Família Sexta-Feira (4 Burgers + Bebidas)"
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-xs font-bold text-stone-900"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="font-bold text-stone-500 block mb-1">Selo de Destaque:</label>
                  <input
                    type="text"
                    value={comboBadge}
                    onChange={(e) => setComboBadge(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-xs font-bold text-stone-900"
                  />
                </div>
                <div>
                  <label className="font-bold text-stone-500 block mb-1">Serve Quantas Pessoas:</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={comboServes}
                    onChange={(e) => setComboServes(parseInt(e.target.value, 10) || 2)}
                    className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-xs font-bold text-stone-900"
                  />
                </div>
              </div>

              {/* Selecionar Produtos que Entram no Combo */}
              <div>
                <label className="font-bold text-stone-500 block mb-1.5">
                  Escolha os Produtos que Fazem Parte do Combo:
                </label>
                <div className="space-y-1.5 max-h-48 overflow-y-auto p-2 rounded-2xl bg-stone-100/80 border border-stone-200 text-stone-900">
                  {menuItems.map((item) => {
                    const selected = comboItems.find((i) => i.menuItemId === item.id);
                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-2 p-2 rounded-xl bg-white border border-stone-200/70"
                      >
                        <label className="flex items-center gap-2 cursor-pointer flex-1 truncate">
                          <input
                            type="checkbox"
                            checked={Boolean(selected)}
                            onChange={() => handleToggleItemInNewCombo(item)}
                            className="rounded accent-[#D94E1F]"
                          />
                          <span className="font-bold truncate">{item.name}</span>
                        </label>
                        {selected && (
                          <div className="flex items-center gap-1">
                            <span className="text-stone-400">Qtd:</span>
                            <input
                              type="number"
                              min={1}
                              max={10}
                              value={selected.quantity}
                              onChange={(e) =>
                                handleChangeComboItemQty(item.id, parseInt(e.target.value, 10) || 1)
                              }
                              className="w-12 bg-stone-100 border border-stone-300 rounded px-1.5 py-0.5 text-center font-extrabold"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Foto do Combo */}
              <div>
                <label className="font-bold text-stone-500 block mb-1">Foto de Capa do Combo:</label>
                <select
                  value={comboPhoto}
                  onChange={(e) => setComboPhoto(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-xs font-bold text-stone-900"
                >
                  {PRESET_PHOTOS.map((p) => (
                    <option key={p.label} value={p.url}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Resumo de Preço Original vs Preço Promocional do Combo */}
              <div className="p-3.5 rounded-2xl bg-orange-50 border border-orange-200 text-stone-900 space-y-2">
                <div className="flex justify-between">
                  <span className="text-stone-600">Preço Normal dos Itens Somados:</span>
                  <span className="font-bold line-through">
                    {formatBRL(calculatedComboOriginalPrice)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-600">Custo Total (Ficha Técnica):</span>
                  <span className="font-bold">{formatBRL(calculatedComboCost)}</span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-orange-200">
                  <span className="font-extrabold text-[#D94E1F]">Preço Promocional do Combo (R$):</span>
                  <input
                    type="number"
                    step="0.10"
                    value={customComboPrice}
                    onChange={(e) => setCustomComboPrice(e.target.value)}
                    className="w-28 bg-white border-2 border-[#D94E1F] rounded-xl px-2.5 py-1 text-right text-sm font-extrabold text-stone-900"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-2xl bg-[#D94E1F] hover:bg-[#B83D14] text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Publicar Combo no Cardápio do Cliente</span>
              </button>
            </form>
          </div>

          {/* Direita 7 Colunas: Lista de Combos Ativos para Editar Preço ou Pausar */}
          <div className="lg:col-span-7 space-y-4">
            <h3 className="text-base font-extrabold">
              Combos Cadastrados no Cardápio ({combos.length})
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {combos.map((combo) => (
                <div
                  key={combo.id}
                  className={`rounded-3xl border overflow-hidden flex flex-col justify-between ${cardSurface} ${
                    !combo.isActive ? 'opacity-60' : ''
                  }`}
                >
                  <div>
                    <div className="relative h-36 bg-stone-200">
                      <img
                        src={combo.imageUrl}
                        alt={combo.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-[#D94E1F] text-white">
                        {combo.badge}
                      </span>
                      <span
                        className={`absolute top-2.5 right-2.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold ${
                          combo.isActive
                            ? 'bg-emerald-600 text-white'
                            : 'bg-stone-700 text-stone-300'
                        }`}
                      >
                        {combo.isActive ? 'Visível p/ Cliente' : 'Pausado'}
                      </span>
                    </div>

                    <div className="p-4 space-y-2">
                      <h4 className="text-sm font-extrabold">{combo.name}</h4>
                      <p className="text-xs text-stone-500">{combo.description}</p>

                      <div className="flex items-center justify-between pt-2 border-t border-stone-200/60 text-xs">
                        <div>
                          <span className="text-stone-400 line-through block">
                            De {formatBRL(combo.originalPrice)}
                          </span>
                          <span className="text-base font-extrabold text-emerald-600">
                            Por {formatBRL(combo.comboPrice)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-stone-400">Novo Preço:</span>
                          <input
                            type="number"
                            step="1"
                            value={combo.comboPrice}
                            onChange={(e) =>
                              updateCombo(combo.id, {
                                comboPrice: parseFloat(e.target.value) || combo.comboPrice,
                              })
                            }
                            className="w-20 bg-stone-100 border border-stone-300 rounded-xl px-2 py-1 text-xs font-extrabold text-stone-900"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-stone-100/60 border-t border-stone-200/60 flex items-center justify-between gap-2">
                    <button
                      onClick={() => updateCombo(combo.id, { isActive: !combo.isActive })}
                      className={`flex-1 py-2 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer ${
                        combo.isActive
                          ? 'bg-amber-100 text-amber-900 hover:bg-amber-200'
                          : 'bg-emerald-600 text-white hover:bg-emerald-700'
                      }`}
                    >
                      {combo.isActive ? (
                        <>
                          <EyeOff className="w-3.5 h-3.5" />
                          <span>Pausar Combo</span>
                        </>
                      ) : (
                        <>
                          <Eye className="w-3.5 h-3.5" />
                          <span>Ativar Combo</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => deleteCombo(combo.id)}
                      className="p-2 rounded-xl bg-red-100 hover:bg-red-200 text-red-700 cursor-pointer"
                      title="Excluir Combo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SUB-ABA 2: CRIAR E ORGANIZAR PRODUTOS DO CARDÁPIO */}
      {subTab === 'manage_products' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Esquerda 4 Colunas: Adicionar Novo Prato ou Bebida */}
          <div className={`lg:col-span-4 rounded-3xl border p-6 space-y-4 ${cardSurface}`}>
            <div className="flex items-center gap-2 border-b border-stone-200/60 pb-3">
              <Utensils className="w-5 h-5 text-[#D94E1F]" />
              <h3 className="text-base font-extrabold">Cadastrar Novo Produto</h3>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-stone-500 block mb-1">Nome do Prato / Bebida:</label>
                <input
                  type="text"
                  value={prodName}
                  onChange={(e) => setProdName(e.target.value)}
                  placeholder="Ex: Batata Rústica Trufada com Parmesão"
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-xs font-bold text-stone-900"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-stone-500 block mb-1">Categoria no Cardápio:</label>
                <select
                  value={prodCategory}
                  onChange={(e) => setProdCategory(e.target.value as MenuItem['category'])}
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-xs font-bold text-stone-900"
                >
                  <option value="Pizzas">Pizzas</option>
                  <option value="Pizzas Doces">Pizzas Doces</option>
                  <option value="Esfihas">Esfihas</option>
                  <option value="Esfihas Doces">Esfihas Doces</option>
                  <option value="Refrigerantes">Refrigerantes</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-stone-500 block mb-1">Descrição Apetitosa:</label>
                <textarea
                  rows={2}
                  value={prodDesc}
                  onChange={(e) => setProdDesc(e.target.value)}
                  placeholder="Ingredientes e preparo..."
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-xs text-stone-900"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="font-bold text-stone-500 block mb-1">Preço Venda (R$)</label>
                  <input
                    type="number"
                    step="0.10"
                    value={prodPrice}
                    onChange={(e) => setProdPrice(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-300 rounded-xl px-2.5 py-2 text-xs font-extrabold text-stone-900"
                  />
                </div>
                <div>
                  <label className="font-bold text-stone-500 block mb-1">Custo (R$)</label>
                  <input
                    type="number"
                    step="0.10"
                    value={prodCost}
                    onChange={(e) => setProdCost(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-300 rounded-xl px-2.5 py-2 text-xs font-extrabold text-stone-900"
                  />
                </div>
                <div>
                  <label className="font-bold text-stone-500 block mb-1">Estoque</label>
                  <input
                    type="number"
                    value={prodStock}
                    onChange={(e) => setProdStock(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-300 rounded-xl px-2.5 py-2 text-xs font-extrabold text-stone-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-stone-500 block mb-1">Selo de Destaque</label>
                  <input
                    type="text"
                    value={prodBadge}
                    onChange={(e) => setProdBadge(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-300 rounded-xl px-2.5 py-2 text-xs font-bold text-stone-900"
                  />
                </div>
                <div>
                  <label className="font-bold text-stone-500 block mb-1">Foto do Prato</label>
                  <select
                    value={prodPhoto}
                    onChange={(e) => setProdPhoto(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-300 rounded-xl px-2.5 py-2 text-xs font-bold text-stone-900"
                  >
                    {PRESET_PHOTOS.map((p) => (
                      <option key={p.label} value={p.url}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-2xl bg-[#D94E1F] hover:bg-[#B83D14] text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Adicionar Produto ao Cardápio</span>
              </button>
            </form>
          </div>

          {/* Direita 8 Colunas: Organizar Ordem, Preços e Disponibilidade dos Produtos */}
          <div className="lg:col-span-8 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-base font-extrabold">
                Produtos no Cardápio (Suba/Desça a Posição ou Otimize com IA)
              </h3>
              <button
                onClick={triggerAutonomousMenuAgent}
                className="px-4 py-2 rounded-2xl bg-amber-400 hover:bg-amber-500 text-stone-950 text-xs font-extrabold flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>Ordenar Automaticamente por Maior Lucro (IA)</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {menuItems.map((item, idx) => (
                <div
                  key={item.id}
                  className={`p-4 rounded-2xl border flex flex-wrap items-center justify-between gap-3 ${cardSurface} ${
                    !item.isActive ? 'opacity-55' : ''
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    {/* Botões de Subir / Descer Ordem */}
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => moveMenuItemOrder(item.id, 'up')}
                        disabled={idx === 0}
                        className="p-1 rounded bg-stone-100 hover:bg-stone-200 text-stone-700 disabled:opacity-30 cursor-pointer"
                        title="Subir posição"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => moveMenuItemOrder(item.id, 'down')}
                        disabled={idx === menuItems.length - 1}
                        className="p-1 rounded bg-stone-100 hover:bg-stone-200 text-stone-700 disabled:opacity-30 cursor-pointer"
                        title="Descer posição"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {item.imageUrl && (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        referrerPolicy="no-referrer"
                        className="w-14 h-14 rounded-2xl object-cover shrink-0"
                      />
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded-full bg-orange-100 text-[#D94E1F] text-[11px] font-extrabold">
                          #{item.displayOrder}
                        </span>
                        <h4 className="text-sm font-extrabold truncate">{item.name}</h4>
                        <span className="text-xs font-bold text-emerald-600">
                          (Lucro {item.marginPercent}%)
                        </span>
                      </div>
                      <p className="text-xs text-stone-500 truncate mt-0.5">
                        {item.category} • Estoque: {item.stockAvailable} un •{' '}
                        <span className="text-amber-700 font-semibold">
                          <Flame className="w-3 h-3 inline" /> {item.aiBadge}
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Controles Rápidos de Preço, Pausar e Excluir */}
                  <div className="flex items-center gap-2">
                    <div>
                      <span className="text-[10px] text-stone-400 block font-bold">Preço (R$)</span>
                      <input
                        type="number"
                        step="0.50"
                        value={item.price}
                        onChange={(e) =>
                          updateMenuItem(item.id, { price: parseFloat(e.target.value) || item.price })
                        }
                        className="w-20 bg-stone-100 border border-stone-300 rounded-xl px-2 py-1 text-xs font-extrabold text-stone-900"
                      />
                    </div>

                    <button
                      onClick={() => updateMenuItem(item.id, { isActive: !item.isActive })}
                      className={`px-3 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1 cursor-pointer ${
                        item.isActive
                          ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                          : 'bg-stone-200 text-stone-700'
                      }`}
                    >
                      {item.isActive ? (
                        <>
                          <Eye className="w-3.5 h-3.5" />
                          <span>Ativo</span>
                        </>
                      ) : (
                        <>
                          <EyeOff className="w-3.5 h-3.5" />
                          <span>Pausado</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => deleteMenuItem(item.id)}
                      className="p-2 rounded-xl bg-red-100 hover:bg-red-200 text-red-700 cursor-pointer"
                      title="Remover item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

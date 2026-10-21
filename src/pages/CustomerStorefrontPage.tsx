import React, { useState, useMemo, useEffect } from 'react';
import {
  ShoppingBag,
  Plus,
  Minus,
  Sparkles,
  Flame,
  Clock,
  Star,
  MapPin,
  Search,
  Lock,
  Mic,
  CheckCircle2,
  Percent,
  Utensils,
  Bike,
  QrCode,
  Store,
  Gift,
  X,
  ChefHat,
  MessageCircle,
  Send,
  Copy,
  Check,
  Phone,
  Edit3,
  Sliders,
  Trash2,
  ClipboardList,
  AlertCircle,
  ArrowRight,
  CheckSquare,
  Square,
} from 'lucide-react';
import { useStore } from '../services/storeContext';
import { evaluateBestOfferForCart } from '../agents/decisionEngine';
import { processVoiceOrWhatsappOrderWithAI } from '../services/geminiClient';
import { formatBRL } from '../utils/formatters';
import { OrderItem, ServiceChannelType, ComboOffer } from '../models/types';

export interface DeliveryLocationOption {
  id: string;
  name: string;
  fee: number;
  tag: string;
}

export const DELIVERY_LOCATION_OPTIONS: DeliveryLocationOption[] = [
  {
    id: 'condominios_flores',
    name: 'Condominios - Rosas, orquídeas e margaridas',
    fee: 1.0,
    tag: 'Condomínios',
  },
  {
    id: 'alameda',
    name: 'Alameda',
    fee: 3.0,
    tag: 'Alameda',
  },
  {
    id: 'pedras_ancuri',
    name: 'Pedras, Ancuri itaitinga, Alto do Ancuri',
    fee: 6.0,
    tag: 'Pedras / Ancuri / Itaitinga',
  },
  {
    id: 'outros',
    name: 'Outros',
    fee: 7.0,
    tag: 'Outras Regiões',
  },
];

export const CustomerStorefrontPage: React.FC = () => {
  const {
    restaurant,
    menuItems,
    combos,
    customers,
    orders,
    isOffline,
    createOrder,
    registerCustomer,
    isManagerUnlocked,
    userRole,
    setAppViewMode,
    unlockManagerDashboard,
    loginWithGoogle,
  } = useStore();

  // Modo de Atendimento do Cliente (Delivery, Mesa QR Code ou Retirada)
  const [serviceMode, setServiceMode] = useState<ServiceChannelType>('delivery_link');
  const [tableNumber, setTableNumber] = useState<string>('Mesa 04');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Checkout Rápido no WhatsApp (O cliente NÃO precisa fazer login!)
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState<boolean>(false);
  const [customerNameInput, setCustomerNameInput] = useState<string>('');
  const [customerPhoneInput, setCustomerPhoneInput] = useState<string>('');
  const [deliveryLocationId, setDeliveryLocationId] = useState<string>('condominios_flores');
  const [deliveryAddressInput, setDeliveryAddressInput] = useState<string>('');
  const [deliveryNeighborhoodInput, setDeliveryNeighborhoodInput] = useState<string>('');
  const [deliveryNotesInput, setDeliveryNotesInput] = useState<string>('');
  const [needChange, setNeedChange] = useState<boolean>(false);
  const [changeForInput, setChangeForInput] = useState<string>('');
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  // Modal de Confirmação & Envio Direto ao WhatsApp
  const [successOrderData, setSuccessOrderData] = useState<{
    orderNumber: string;
    orderId: string;
    whatsappUrl: string;
    universalWhatsappUrl?: string;
    messageText: string;
    total: number;
    customerName: string;
  } | null>(null);
  const [hasCopiedWhatsApp, setHasCopiedWhatsApp] = useState<boolean>(false);

  // Sacola de Compras do Cliente
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [isCartModalOpen, setIsCartModalOpen] = useState<boolean>(false);
  const [cartModalTab, setCartModalTab] = useState<'cart' | 'orders'>('cart');
  const [paymentMethod, setPaymentMethod] = useState<'PIX' | 'Cartão de Crédito' | 'Cartão de Débito' | 'Dinheiro'>('PIX');
  const [activeCustomerOrderId, setActiveCustomerOrderId] = useState<string | null>(null);

  // Histórico de pedidos realizados pelo cliente (apenas estado em memória / Firestore)
  const [placedOrderIds, setPlacedOrderIds] = useState<string[]>([]);

  // Estado para Personalizar e Editar Pedido (Tirar Ingredientes, etc.)
  const [customizingItem, setCustomizingItem] = useState<{
    isEditingExistingCartItem: boolean;
    cartItemId?: string;
    menuItemId: string;
    name: string;
    category: string;
    price: number;
    cost: number;
    imageUrl?: string;
    description: string;
    quantity: number;
    allIngredients: string[];
    removedIngredients: string[];
    notes: string;
  } | null>(null);

  // Assistente de Voz / IA na Área do Cliente
  const [voicePrompt, setVoicePrompt] = useState<string>('');
  const [isVoiceProcessing, setIsVoiceProcessing] = useState<boolean>(false);
  const [voiceFeedback, setVoiceFeedback] = useState<string | null>(null);

  // Modal de Acesso Restrito do Gerente e Master (PIN 1234)
  const [isPinModalOpen, setIsPinModalOpen] = useState<boolean>(false);
  const [pinInput, setPinInput] = useState<string>('1234');
  const [pinError, setPinError] = useState<string | null>(null);

  const activeMenuItems = useMemo(
    () => menuItems.filter((m) => m.isActive),
    [menuItems]
  );

  const activeCombos = useMemo(
    () => combos.filter((c) => c.isActive),
    [combos]
  );

  const categories = [
    { id: 'Todos', label: '🔥 Todos', description: 'Cardápio completo separado por categoria' },
    { id: 'Combos de Esfihas', label: '🎁 Combos', description: '5 Esfihas por R$ 18,00 • 10 Esfihas por R$ 35,00' },
    { id: 'Pizzas', label: '🍕 Pizzas', description: 'Pizzas tradicionais e especiais com molho artesanal' },
    { id: 'Pizzas Doces', label: '🍫 Pizzas Doces', description: 'Chocolate, Banana Nevada, Ouro Branco e M&Ms' },
    { id: 'Esfihas', label: '🥟 Esfihas', description: 'Esfihas abertas assadas na hora (a partir de R$ 4,00)' },
    { id: 'Esfihas Doces', label: '🍬 Esfihas Doces', description: 'Esfihas doces recheadas por apenas R$ 5,00' },
    { id: 'Refrigerantes', label: '🥤 Refrigerantes', description: 'Latas 350ml (R$ 6,00) e Refrigerante 1 Litro (R$ 10,00)' },
  ];

  const menuSectionCategories = [
    'Pizzas',
    'Pizzas Doces',
    'Esfihas',
    'Esfihas Doces',
    'Refrigerantes',
  ] as const;

  const filteredProducts = useMemo(() => {
    return activeMenuItems.filter((item) => {
      const matchesSearch =
        !searchQuery.trim() ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;
      if (selectedCategory === 'Todos' || selectedCategory === 'Combos de Esfihas') {
        return true;
      }
      return item.category === selectedCategory;
    });
  }, [activeMenuItems, selectedCategory, searchQuery]);

  // Cálculo automático da melhor oferta / cupom / combos na sacola
  const offerEvaluation = useMemo(
    () => evaluateBestOfferForCart(cart, null),
    [cart]
  );

  const cartSubtotal = useMemo(
    () => cart.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0),
    [cart]
  );

  const selectedDeliveryOption = useMemo(
    () =>
      DELIVERY_LOCATION_OPTIONS.find((opt) => opt.id === deliveryLocationId) ||
      DELIVERY_LOCATION_OPTIONS[0],
    [deliveryLocationId]
  );

  const currentDeliveryFee = useMemo(
    () => (serviceMode === 'delivery_link' ? selectedDeliveryOption.fee : 0),
    [serviceMode, selectedDeliveryOption]
  );

  const finalGrandTotal = useMemo(
    () => Number((offerEvaluation.finalTotal + currentDeliveryFee).toFixed(2)),
    [offerEvaluation.finalTotal, currentDeliveryFee]
  );

  const trackedOrder = useMemo(
    () => (activeCustomerOrderId ? orders.find((o) => o.id === activeCustomerOrderId) : null),
    [orders, activeCustomerOrderId]
  );

  // Pedidos consultáveis do cliente (recente + persistidos)
  const customerPlacedOrders = useMemo(() => {
    return orders.filter(
      (o) =>
        placedOrderIds.includes(o.id) ||
        o.id === activeCustomerOrderId ||
        (customerPhoneInput.trim() && o.customerPhone === customerPhoneInput.trim())
    );
  }, [orders, placedOrderIds, activeCustomerOrderId, customerPhoneInput]);

  const activeCustomerOrdersCount = useMemo(() => {
    return customerPlacedOrders.filter(
      (o) => o.status !== 'delivered' && o.status !== 'cancelled'
    ).length;
  }, [customerPlacedOrders]);

  useEffect(() => {
    if (trackedOrder?.status === 'delivered' || trackedOrder?.status === 'cancelled') {
      const timer = setTimeout(() => {
        setActiveCustomerOrderId(null);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [trackedOrder?.status]);

  const handleClearCompletedOrders = () => {
    setPlacedOrderIds((prev) => {
      const activeOnly = prev.filter((id) => {
        const ord = orders.find((o) => o.id === id);
        return ord && ord.status !== 'delivered' && ord.status !== 'cancelled';
      });
      return activeOnly;
    });
    setActiveCustomerOrderId(null);
  };

  // Inteligência para extrair ou associar ingredientes de cada produto do cardápio
  const getItemIngredients = (item: { name: string; category?: string; description?: string }): string[] => {
    const nameLower = item.name.toLowerCase();
    const desc = item.description || '';

    if (nameLower.includes('calabresa')) {
      return ['Molho de Tomate Artesanal', 'Muçarela', 'Calabresa Fatiada', 'Cebola em Rodelas', 'Azeitonas Pretas', 'Orégano'];
    }
    if (nameLower.includes('portuguesa')) {
      return ['Molho Artesanal', 'Muçarela', 'Presunto Cozido', 'Ovos Cozidos', 'Ervilha', 'Cebola em Rodelas', 'Azeitonas Pretas', 'Orégano'];
    }
    if (nameLower.includes('muçarela') || nameLower.includes('mussarela')) {
      return ['Molho de Tomate Artesanal', 'Muçarela Especial', 'Azeitonas Pretas', 'Orégano Fresco'];
    }
    if (nameLower.includes('mista')) {
      return ['Molho Artesanal', 'Muçarela', 'Presunto Cozido', 'Azeitonas', 'Orégano'];
    }
    if (nameLower.includes('frango com catupiry') || nameLower.includes('frango e catupiry')) {
      return ['Molho Artesanal', 'Muçarela', 'Frango Desfiado', 'Catupiry Original', 'Milho Verde', 'Orégano'];
    }
    if (nameLower.includes('frango com milho') || nameLower.includes('frango e milho')) {
      return ['Molho Artesanal', 'Muçarela', 'Frango Desfiado Temperado', 'Milho Doce', 'Orégano'];
    }
    if (nameLower.includes('carne de sol')) {
      return ['Molho Artesanal', 'Muçarela', 'Carne de Sol Desfiada', 'Cebola Roxa', 'Manteiga da Terra'];
    }
    if (nameLower.includes('bacon')) {
      return ['Molho Artesanal', 'Muçarela', 'Bacon Crocante em Cubos', 'Cebola em Rodelas', 'Orégano'];
    }
    if (nameLower.includes('4 queijos') || nameLower.includes('quatro queijos')) {
      return ['Molho Artesanal', 'Muçarela', 'Catupiry Original', 'Provolone Defumado', 'Parmesão Ralado'];
    }
    if (nameLower.includes('do chefe') || nameLower.includes('chefe')) {
      return ['Molho Artesanal', 'Muçarela', 'Frango', 'Calabresa', 'Bacon Crocante', 'Catupiry Original'];
    }
    if (nameLower.includes('banana nevada')) {
      return ['Banana Fatiada', 'Chocolate Branco Forneável', 'Canela em Pó', 'Leite Condensado'];
    }
    if (nameLower.includes('ouro branco')) {
      return ['Creme de Chocolate', 'Bombom Ouro Branco Picado', 'Leite Condensado'];
    }
    if (nameLower.includes('prestígio')) {
      return ['Chocolate Cremoso', 'Coco Ralado Úmido', 'Leite Condensado'];
    }
    if (nameLower.includes('m&ms') || nameLower.includes('confete')) {
      return ['Creme de Chocolate ao Leite', 'M&Ms Crocantes'];
    }
    if (nameLower.includes('chocolate')) {
      return ['Chocolate Cremoso ao Leite', 'Granulado'];
    }

    if (nameLower.includes('esfiha') || item.category === 'Esfihas') {
      if (nameLower.includes('carne')) return ['Carne Moída Especial', 'Cebola Picadinha', 'Tomate', 'Limão Fresco'];
      if (nameLower.includes('frango')) return ['Frango Desfiado Temperado', 'Temperos Verdes'];
      if (nameLower.includes('queijo')) return ['Queijo Muçarela Derretido', 'Orégano'];
      if (nameLower.includes('calabresa')) return ['Calabresa Moída', 'Cebola', 'Orégano'];
      if (nameLower.includes('presunto')) return ['Presunto Ralado', 'Muçarela'];
    }

    const parts = desc
      .split(/[,.]|\be\b/i)
      .map((p) => p.trim())
      .filter((p) => p.length > 2 && !p.toLowerCase().startsWith('serv') && !p.toLowerCase().includes('por apenas'));

    if (parts.length >= 2) {
      return Array.from(new Set(parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1))));
    }

    if (item.category === 'Pizzas') {
      return ['Molho Especial', 'Muçarela', 'Cebola', 'Azeitonas', 'Orégano'];
    }

    return ['Ingrediente Principal', 'Temperos'];
  };

  const COMMON_EXCLUSIONS = [
    'Cebola',
    'Azeitona',
    'Orégano',
    'Ervilha',
    'Tomate',
    'Milho',
    'Molho',
    'Presunto',
  ];

  const handleOpenCustomizeModal = (product: (typeof menuItems)[0]) => {
    const allIngredients = getItemIngredients(product);
    setCustomizingItem({
      isEditingExistingCartItem: false,
      menuItemId: product.id,
      name: product.name,
      category: product.category,
      price: product.price,
      cost: product.cost,
      imageUrl: product.imageUrl,
      description: product.description,
      quantity: 1,
      allIngredients,
      removedIngredients: [],
      notes: '',
    });
  };

  const handleOpenEditCartItem = (cartItem: OrderItem) => {
    const product = menuItems.find((m) => m.id === cartItem.menuItemId);
    const allIngredients = product
      ? getItemIngredients(product)
      : getItemIngredients({ name: cartItem.name });

    setCustomizingItem({
      isEditingExistingCartItem: true,
      cartItemId: cartItem.cartItemId || `cart_${cartItem.menuItemId}_${Math.random()}`,
      menuItemId: cartItem.menuItemId,
      name: cartItem.name,
      category: product ? product.category : 'Pizzas',
      price: cartItem.unitPrice,
      cost: cartItem.unitCost,
      imageUrl: product?.imageUrl,
      description: product?.description || '',
      quantity: cartItem.quantity,
      allIngredients,
      removedIngredients: cartItem.removedIngredients ? [...cartItem.removedIngredients] : [],
      notes: cartItem.notes || '',
    });
  };

  const handleToggleIngredientRemoval = (ingredient: string) => {
    setCustomizingItem((prev) => {
      if (!prev) return null;
      const isAlreadyRemoved = prev.removedIngredients.some(
        (r) => r.toLowerCase() === ingredient.toLowerCase()
      );
      const updated = isAlreadyRemoved
        ? prev.removedIngredients.filter((r) => r.toLowerCase() !== ingredient.toLowerCase())
        : [...prev.removedIngredients, ingredient];
      return { ...prev, removedIngredients: updated };
    });
  };

  const handleQuickExclusion = (exclusion: string) => {
    setCustomizingItem((prev) => {
      if (!prev) return null;
      const isAlreadyRemoved = prev.removedIngredients.some(
        (r) => r.toLowerCase().includes(exclusion.toLowerCase())
      );
      const updated = isAlreadyRemoved
        ? prev.removedIngredients.filter((r) => !r.toLowerCase().includes(exclusion.toLowerCase()))
        : [...prev.removedIngredients, exclusion];
      return { ...prev, removedIngredients: updated };
    });
  };

  const handleSaveCustomizedItem = () => {
    if (!customizingItem) return;

    const itemToSave: OrderItem = {
      cartItemId:
        customizingItem.cartItemId ||
        `cart_${customizingItem.menuItemId}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      menuItemId: customizingItem.menuItemId,
      name: customizingItem.name,
      quantity: Math.max(1, customizingItem.quantity),
      unitPrice: customizingItem.price,
      unitCost: customizingItem.cost,
      notes: customizingItem.notes.trim() || undefined,
      removedIngredients:
        customizingItem.removedIngredients.length > 0 ? customizingItem.removedIngredients : undefined,
    };

    setCart((prev) => {
      if (customizingItem.isEditingExistingCartItem && customizingItem.cartItemId) {
        return prev.map((item) =>
          (item.cartItemId && item.cartItemId === customizingItem.cartItemId) ||
          (!item.cartItemId && item.menuItemId === customizingItem.menuItemId)
            ? itemToSave
            : item
        );
      }
      return [...prev, itemToSave];
    });

    setCustomizingItem(null);
  };

  const handleRemoveCartItem = (identifier: string) => {
    setCart((prev) => prev.filter((i) => (i.cartItemId || i.menuItemId) !== identifier));
  };

  const handleAddProductToCart = (itemId: string, customNote?: string) => {
    const product = menuItems.find((m) => m.id === itemId);
    if (!product) return;

    setCart((prev) => {
      const existing = prev.find(
        (i) => i.menuItemId === itemId && !i.removedIngredients?.length && i.notes === customNote
      );
      if (existing) {
        return prev.map((i) =>
          i === existing ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [
        ...prev,
        {
          cartItemId: `cart_${itemId}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          menuItemId: product.id,
          name: product.name,
          quantity: 1,
          unitPrice: product.price,
          unitCost: product.cost,
          notes: customNote,
        },
      ];
    });
  };

  const handleAddComboToCart = (combo: ComboOffer) => {
    setCart((prev) => {
      const comboKey = `combo-item-${combo.id}`;
      const existing = prev.find((i) => i.menuItemId === comboKey);
      if (existing) {
        return prev.map((i) =>
          i.menuItemId === comboKey ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [
        ...prev,
        {
          cartItemId: `cart_combo_${combo.id}_${Date.now()}`,
          menuItemId: comboKey,
          name: `🎁 ${combo.name}`,
          quantity: 1,
          unitPrice: combo.comboPrice,
          unitCost: combo.cost,
          notes: combo.itemsIncluded.map((inc) => `${inc.quantity}x ${inc.name}`).join(' + '),
        },
      ];
    });
  };

  const handleUpdateQty = (itemRef: OrderItem, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) => {
          const match = itemRef.cartItemId
            ? i.cartItemId === itemRef.cartItemId
            : i.menuItemId === itemRef.menuItemId && i.notes === itemRef.notes;
          return match ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i;
        })
        .filter((i) => i.quantity > 0)
    );
  };

  const handleVoiceQuickOrder = async (textCommand: string) => {
    if (!textCommand.trim()) return;
    setIsVoiceProcessing(true);
    const guestCustomer = {
      id: 'cliente-avulso',
      name: customerNameInput.trim() || 'Cliente Cardápio Digital',
      phone: customerPhoneInput.trim() || '',
      cashbackBalance: 0,
      loyaltyPoints: 0,
      usualOrderDescription: '',
      usualOrderItemIds: [],
    };
    const parsed = await processVoiceOrWhatsappOrderWithAI(
      textCommand,
      guestCustomer as any,
      activeMenuItems,
      isOffline
    );
    setCart(parsed.items);
    setVoiceFeedback(parsed.aiResponseText);
    setIsVoiceProcessing(false);
  };

  const handleOpenCheckoutModal = () => {
    if (cart.length === 0) return;
    setCheckoutError(null);
    setIsCheckoutModalOpen(true);
  };

  const handleConfirmAndSendToWhatsApp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (cart.length === 0) return;

    if (!customerNameInput.trim()) {
      setCheckoutError('Por favor, informe seu nome para identificar o pedido.');
      return;
    }

    const cleanPhoneDigits = customerPhoneInput.replace(/\D/g, '');
    if (cleanPhoneDigits.length < 8) {
      setCheckoutError('Por favor, informe seu número de WhatsApp com DDD (ex: 85 99812-4401).');
      return;
    }

    if (serviceMode === 'delivery_link' && !deliveryAddressInput.trim()) {
      setCheckoutError('Por favor, informe o endereço e número para entrega.');
      return;
    }

    const fullDeliveryAddress =
      serviceMode === 'delivery_link'
        ? `[${selectedDeliveryOption.name}] ${deliveryAddressInput.trim()}${
            deliveryNeighborhoodInput.trim() ? ` - Bairro: ${deliveryNeighborhoodInput.trim()}` : ''
          }`
        : undefined;

    // 1. Grava no banco de dados e estado local (aparece na cozinha KDS e no painel do gerente)
    const created = await createOrder({
      channel: serviceMode,
      customerName: customerNameInput.trim(),
      customerPhone: customerPhoneInput.trim(),
      items: cart,
      status: 'new',
      subtotal: Number(cartSubtotal.toFixed(2)),
      discountAmount: offerEvaluation.discountAmount,
      deliveryFee: currentDeliveryFee,
      appliedPromotion: offerEvaluation.bestPromotionName,
      total: finalGrandTotal,
      deliveryAddress: fullDeliveryAddress,
      paymentMethod,
      paymentStatus: 'pending',
      nfceStatus: 'issued',
      nfceProtocol: `352609487193020001846500100000${Date.now().toString().slice(-5)}`,
      station: 'Cozinha Quente',
    });

    // 2. Monta a mensagem estruturada com formatação profissional para o WhatsApp da Pizzaria
    const itemsSummary = cart
      .map((item) => {
        let lines = `• ${item.quantity}x ${item.name} — ${formatBRL(item.unitPrice * item.quantity)}`;
        if (item.removedIngredients && item.removedIngredients.length > 0) {
          lines += `\n❌ *REMOVER:*\n${item.removedIngredients.map((ing) => ` * ${ing}`).join('\n')}`;
        }
        if (item.notes) {
          lines += `\n✅ *Obs:* ${item.notes}`;
        }
        return lines;
      })
      .join('\n\n');

    let paymentDesc = paymentMethod;
    if (paymentMethod === 'Dinheiro' && needChange && changeForInput.trim()) {
      paymentDesc += ` (Troco para ${changeForInput.trim()})`;
    }

    let msg = `🍕*NOVO PEDIDO NO BORA PEDIR!*🍕\n`;
    msg += `*Pedido:* #${created.orderNumber}\n`;
    msg += `👤 *Cliente:* ${customerNameInput.trim()}\n`;
    msg += `📱 *WhatsApp:* ${customerPhoneInput.trim()}\n`;
    if (serviceMode === 'delivery_link') {
      msg += `🛵 *Modalidade:* Entrega / Delivery\n`;
      msg += `🏢 *Condomínio / Região:* ${selectedDeliveryOption.name}\n`;
      msg += `📍*Endereço:* ${deliveryAddressInput.trim()}${
        deliveryNeighborhoodInput.trim() ? ` (Bairro: ${deliveryNeighborhoodInput.trim()})` : ''
      }\n`;
    } else {
      msg += `🛍️ *Modalidade:* Retirada no Balcão\n`;
    }
    msg += `💰*Pagamento:* ${paymentDesc}\n\n`;

    msg += `🧾*ITENS DO PEDIDO:*\n${itemsSummary}\n\n`;

    if (deliveryNotesInput.trim()) {
      msg += `📝 *Observações:* ${deliveryNotesInput.trim()}\n\n`;
    }

    msg += `📝 *RESUMO FINANCEIRO:*\n`;
    msg += `• Subtotal: ${formatBRL(cartSubtotal)}\n`;
    if (offerEvaluation.discountAmount > 0) {
      msg += `Desconto (${offerEvaluation.bestPromotionName}): -${formatBRL(offerEvaluation.discountAmount)}\n`;
    }
    if (serviceMode === 'delivery_link') {
      msg += `💵 *Taxa de Entrega (${selectedDeliveryOption.name.split('-')[0].trim()}):* ${formatBRL(currentDeliveryFee)}\n`;
    }
    msg += `💳 *TOTAL A PAGAR:* ${formatBRL(finalGrandTotal)}\n\n`;
    msg += `-  Pedido enviado via Cardápio Digital Bora Pedir -`;

    const rawRestaurantPhone = restaurant.whatsappPhone || '5581989061961';
    const cleanRestPhone = rawRestaurantPhone.replace(/\D/g, '');
    const finalRestPhone = cleanRestPhone.startsWith('55') ? cleanRestPhone : `55${cleanRestPhone}`;

    // Evita o encurtador wa.me (que corrompe emojis UTF-8 de 4 bytes para o símbolo  durante o redirect HTTP 302).
    // No celular, usa o protocolo direto do aplicativo (whatsapp://send). No computador, usa o WhatsApp Web direto (web.whatsapp.com/send).
    const isMobileDevice =
      typeof navigator !== 'undefined' &&
      /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
    const waUrl = isMobileDevice
      ? `whatsapp://send?phone=${finalRestPhone}&text=${encodeURIComponent(msg)}`
      : `https://web.whatsapp.com/send?phone=${finalRestPhone}&text=${encodeURIComponent(msg)}`;
    const universalWaUrl = `https://api.whatsapp.com/send?phone=${finalRestPhone}&text=${encodeURIComponent(msg)}`;

    // 3. Tenta abrir a conversa no WhatsApp
    try {
      window.open(waUrl, '_blank');
    } catch {
      // Ignora se bloqueado pelo navegador
    }

    // 4. Salva dados para o modal de sucesso com botão direto para WhatsApp e acompanhamento ao vivo
    setSuccessOrderData({
      orderNumber: String(created.orderNumber),
      orderId: created.id,
      whatsappUrl: waUrl,
      universalWhatsappUrl: universalWaUrl,
      messageText: msg,
      total: finalGrandTotal,
      customerName: customerNameInput.trim(),
    });

    setActiveCustomerOrderId(created.id);
    setPlacedOrderIds((prev) => {
      const updated = [created.id, ...prev.filter((id) => id !== created.id)];
      return updated;
    });

    setCart([]);
    setIsCheckoutModalOpen(false);
  };

  const handleCopyOrderText = () => {
    if (!successOrderData?.messageText) return;
    navigator.clipboard.writeText(successOrderData.messageText);
    setHasCopiedWhatsApp(true);
    setTimeout(() => setHasCopiedWhatsApp(false), 3000);
  };

  const handleManagerAccessClick = () => {
    if (isManagerUnlocked) {
      setAppViewMode('manager_dashboard');
    } else {
      setPinError(null);
      setIsPinModalOpen(true);
    }
  };

  const handlePinSubmitForMode = (targetMode: 'manager_dashboard' | 'kitchen_dispatch') => {
    const ok = unlockManagerDashboard(pinInput);
    if (ok) {
      setIsPinModalOpen(false);
      setAppViewMode(targetMode);
    } else {
      setPinError('Senha incorreta. Digite 1234 para acessar como Gerente ou Master.');
    }
  };

  const handleVerifyPin = (e: React.FormEvent) => {
    e.preventDefault();
    handlePinSubmitForMode('manager_dashboard');
  };

  return (
    <div className="min-h-screen bg-[#FAF6F0] text-stone-900 pb-24">
      {/* Top Bar do Cardápio Digital */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-stone-200 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#D94E1F] text-white flex items-center justify-center font-extrabold shadow-sm">
              <Utensils className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display font-extrabold text-lg lg:text-xl text-stone-900 tracking-tight">
                  Bora Pedir
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-100 text-emerald-800">
                  ● Aberto Agora
                </span>
              </div>
              <p className="text-xs text-stone-500 hidden sm:flex items-center gap-2">
                <span className="flex items-center gap-1 text-amber-600 font-bold">
                  <Star className="w-3.5 h-3.5 fill-amber-400" /> 4,9 (1.420 avaliações)
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> 25–35 min
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" /> {restaurant.address}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Opção de Ver Carrinho */}
            <button
              onClick={() => {
                setCartModalTab('cart');
                setIsCartModalOpen(true);
              }}
              className="px-3.5 py-2 rounded-full bg-[#D94E1F] hover:bg-[#B83D14] text-white text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
              title="Abrir carrinho de compras"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Carrinho</span>
              {cart.reduce((s, i) => s + i.quantity, 0) > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-white text-[#D94E1F] text-[11px] font-black">
                  {cart.reduce((s, i) => s + i.quantity, 0)}
                </span>
              )}
            </button>

          </div>
        </div>
      </header>

      {/* Hero Banner Gastronômico da Área do Cliente */}
      <div className="max-w-7xl mx-auto px-4 lg:px-6 pt-5">
        <div className="relative rounded-3xl overflow-hidden bg-stone-900 text-white shadow-lg border border-stone-800">
          <img
            src="/src/assets/images/pizza_artesanal_destaque_1790728826411.jpg"
            alt="Capa Bora Pedir"
            referrerPolicy="no-referrer"
            className="absolute inset-0 w-full h-full object-cover opacity-35 pointer-events-none"
          />
          <div className="relative z-10 bg-gradient-to-br from-stone-950/95 via-stone-900/85 to-stone-900/65 p-5 sm:p-7 lg:p-9 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            {/* Bloco Esquerdo: Apresentação Clara e Acolhedora */}
            <div className="max-w-xl space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#D94E1F] text-white text-xs font-extrabold shadow-xs">
                  <Flame className="w-3.5 h-3.5" />
                  Bora Pedir • Cardápio Digital
                </span>
              </div>

              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight leading-tight">
                Bateu a fome? Escolha seu combo ou prato favorito!
              </h2>

              <p className="text-xs sm:text-sm text-stone-200 leading-relaxed">
                CHAMA A GALERA E BORA PEDIR!
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Acompanhamento ao Vivo quando o Cliente faz um pedido */}
      {trackedOrder && (
        <div className="max-w-7xl mx-auto px-4 lg:px-6 mt-5">
          <div className="rounded-3xl bg-emerald-900 text-white p-5 shadow-lg border-2 border-emerald-400 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-stone-950 flex items-center justify-center font-extrabold">
                <ChefHat className="w-7 h-7" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-400 text-stone-950 text-xs font-extrabold">
                    Pedido #{trackedOrder.orderNumber} em Andamento
                  </span>
                  <span className="text-xs text-emerald-200">
                    {trackedOrder.appliedPromotion}
                  </span>
                </div>
                <h3 className="text-lg font-extrabold mt-1">
                  {trackedOrder.status === 'new' && '1/4 — Seu pedido foi recebido pela Cozinha! Aguardando o forno 🔔'}
                  {trackedOrder.status === 'preparing' && '2/4 — O Chef já está preparando seu pedido no Forno! 🔥'}
                  {trackedOrder.status === 'ready' &&
                    (trackedOrder.channel === 'takeout'
                      ? '3/4 — Seu pedido está Pronto para Retirada no Balcão! Pode vir retirar! 🛍️'
                      : '3/4 — Pedido Pronto e Embalado! Aguardando o entregador sair 📦')}
                  {trackedOrder.status === 'out_for_delivery' &&
                    `4/4 — O entregador ${trackedOrder.driverName ? `(${trackedOrder.driverName}) ` : ''}já saiu com seu pedido e está a caminho do seu endereço! 🛵💨`}
                  {trackedOrder.status === 'delivered' && '✓ Pedido Entregue! Bom apetite e obrigado pela preferência! 🍕'}
                </h3>
              </div>
            </div>
            <button
              onClick={() => setActiveCustomerOrderId(null)}
              className="px-3 py-1.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-xs font-bold cursor-pointer"
            >
              Ocultar Status
            </button>
          </div>
        </div>
      )}

      {/* Conteúdo Principal do Cardápio: Categorias + Combos + Produtos (Esquerda) e Sacola (Direita) */}
      <div className="max-w-7xl mx-auto px-4 lg:px-6 mt-6 grid grid-cols-1 lg:grid-cols-12 gap-7">
        {/* Coluna Esquerda (8 cols): Combos e Produtos do Cardápio */}
        <div className="lg:col-span-8 space-y-7">
          {/* Busca + Navegação Rápida por Categorias */}
          <div className="bg-white rounded-3xl border border-stone-200 p-4 shadow-2xs space-y-3.5">
            <div className="relative">
              <Search className="w-4 h-4 text-stone-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar pizza, esfiha, chocolate, carne do sol ou refrigerante..."
                className="w-full bg-[#FAF6F0] border border-stone-200 rounded-2xl pl-11 pr-4 py-3 text-sm text-stone-900 focus:outline-none focus:border-[#D94E1F]"
              />
            </div>

            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-stone-400 block mb-2">
                Navegue pelas Categorias do Cardápio:
              </span>
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {categories.map((cat) => {
                  const count =
                    cat.id === 'Todos'
                      ? activeMenuItems.length
                      : cat.id === 'Combos de Esfihas'
                      ? activeCombos.length
                      : activeMenuItems.filter((i) => i.category === cat.id).length;

                  return (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold transition-all shrink-0 flex items-center gap-2 cursor-pointer ${
                        selectedCategory === cat.id
                          ? 'bg-[#D94E1F] text-white shadow-sm'
                          : 'bg-stone-100 text-stone-700 border border-stone-200/80 hover:bg-orange-50 hover:text-[#D94E1F]'
                      }`}
                    >
                      <span>{cat.label}</span>
                      <span
                        className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                          selectedCategory === cat.id
                            ? 'bg-white/25 text-white'
                            : 'bg-white text-stone-600'
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* SEÇÃO DE COMBOS DE ESFIHAS (Do Cardápio: 5 por R$ 18 | 10 por R$ 35) */}
          {(selectedCategory === 'Todos' || selectedCategory === 'Combos de Esfihas') &&
            activeCombos.length > 0 && (
              <section className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Gift className="w-5 h-5 text-[#D94E1F]" />
                    <div>
                      <h2 className="text-lg font-extrabold text-stone-900">
                        Combos de Esfihas em Promoção
                      </h2>
                      <p className="text-xs text-stone-500">
                        5 esfihas por apenas R$ 18,00 • 10 esfihas por apenas R$ 35,00
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full">
                    Economia Garantida
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {activeCombos.map((combo) => (
                    <div
                      key={combo.id}
                      className="rounded-3xl bg-white border-2 border-orange-200 hover:border-[#D94E1F] overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="relative h-40 w-full bg-stone-200">
                          <img
                            src={combo.imageUrl}
                            alt={combo.name}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                            <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-[#D94E1F] text-white shadow-xs">
                              {combo.badge}
                            </span>
                          </div>
                          <div className="absolute bottom-3 right-3">
                            <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-600 text-white shadow-sm">
                              Economize {formatBRL(combo.savingsAmount)}
                            </span>
                          </div>
                        </div>

                        <div className="p-4">
                          <h3 className="text-base font-extrabold text-stone-900 leading-snug">
                            {combo.name}
                          </h3>
                          <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                            {combo.description}
                          </p>
                        </div>
                      </div>

                      <div className="px-4 pb-4 pt-3 border-t border-stone-100 flex items-center justify-between">
                        <div>
                          <span className="text-xs text-stone-400 line-through block">
                            De {formatBRL(combo.originalPrice)}
                          </span>
                          <span className="text-xl font-extrabold text-emerald-700">
                            Por {formatBRL(combo.comboPrice)}
                          </span>
                        </div>

                        <button
                          onClick={() => handleAddComboToCart(combo)}
                          className="px-4 py-2.5 rounded-2xl bg-[#D94E1F] hover:bg-[#B83D14] text-white text-xs font-extrabold flex items-center gap-1.5 shadow-sm cursor-pointer active:scale-95 transition-transform"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Pedir Combo</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

          {/* SEÇÕES DE PRODUTOS SEPARADAS POR CATEGORIA PARA FÁCIL NAVEGAÇÃO */}
          {selectedCategory !== 'Combos de Esfihas' && (
            <div className="space-y-8">
              {(selectedCategory === 'Todos'
                ? menuSectionCategories
                : [selectedCategory as (typeof menuSectionCategories)[number]]
              ).map((catName) => {
                const catItems = filteredProducts.filter((item) => item.category === catName);
                if (catItems.length === 0) return null;

                const catMeta = categories.find((c) => c.id === catName);

                return (
                  <section key={catName} className="space-y-3.5">
                    <div className="flex items-center justify-between border-b border-stone-200 pb-2.5">
                      <div>
                        <h2 className="text-lg sm:text-xl font-extrabold text-stone-900 flex items-center gap-2">
                          <span>{catMeta?.label || catName}</span>
                        </h2>
                        {catMeta?.description && (
                          <p className="text-xs text-stone-500">{catMeta.description}</p>
                        )}
                      </div>
                      <span className="px-3 py-1 rounded-full bg-stone-200/70 text-stone-700 text-xs font-extrabold">
                        {catItems.length} opções
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {catItems.map((item) => (
                        <div
                          key={item.id}
                          className="rounded-3xl bg-white border border-stone-200/90 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                        >
                          <div>
                            <div className="relative h-40 w-full bg-stone-200">
                              {item.imageUrl ? (
                                <img
                                  src={item.imageUrl}
                                  alt={item.name}
                                  referrerPolicy="no-referrer"
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-orange-50 text-orange-500">
                                  <Utensils className="w-10 h-10" />
                                </div>
                              )}

                              {item.aiBadge && (
                                <div className="absolute top-3 left-3">
                                  <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-amber-400 text-stone-950 shadow-xs flex items-center gap-1">
                                    <Sparkles className="w-3 h-3" />
                                    {item.aiBadge}
                                  </span>
                                </div>
                              )}
                            </div>

                            <div className="p-4">
                              <span className="text-[11px] font-extrabold uppercase tracking-wider text-orange-600">
                                {item.category}
                              </span>
                              <h3 className="text-base font-extrabold text-stone-900 mt-0.5 leading-snug">
                                {item.name}
                              </h3>
                              <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                                {item.description}
                              </p>
                            </div>
                          </div>

                          <div className="px-4 pb-4 pt-3 border-t border-stone-100 flex items-center justify-between gap-2">
                            <span className="text-xl font-extrabold text-[#D94E1F]">
                              {formatBRL(item.price)}
                            </span>

                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => handleOpenCustomizeModal(item)}
                                className="px-2.5 py-2 rounded-xl bg-orange-50 hover:bg-orange-100 border border-orange-200 text-[#D94E1F] text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                                title="Personalizar pedido e tirar ingredientes (ex: sem cebola, sem azeitona)"
                              >
                                <Sliders className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Personalizar</span>
                              </button>
                              <button
                                onClick={() => handleAddProductToCart(item.id)}
                                className="px-3.5 py-2 rounded-xl bg-[#D94E1F] hover:bg-[#B83D14] text-white text-xs font-extrabold flex items-center gap-1 shadow-xs cursor-pointer active:scale-95 transition-transform"
                                title="Adicionar diretamente à sacola"
                              >
                                <Plus className="w-4 h-4" />
                                <span>Adicionar</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </div>

        {/* Coluna Direita (4 cols): Sacola Inteligente do Cliente */}
        <div className="lg:col-span-4">
          <div className="rounded-3xl bg-white border border-stone-200 p-5 shadow-md space-y-4 sticky top-20">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-orange-100 text-[#D94E1F] flex items-center justify-center">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-stone-900">Sua Sacola</h3>
                  <p className="text-xs text-stone-500">
                    {serviceMode === 'delivery_link'
                      ? 'Entrega Delivery (25-35 min)'
                      : 'Retirada no Balcão (15-20 min)'}
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-stone-100 text-stone-800 text-xs font-extrabold">
                {cart.reduce((s, i) => s + i.quantity, 0)} itens
              </span>
            </div>

            {/* Alternar Modalidade: Delivery / Retirada */}
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-stone-100 rounded-2xl">
              <button
                type="button"
                onClick={() => setServiceMode('delivery_link')}
                className={`py-2 px-1 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  serviceMode === 'delivery_link'
                    ? 'bg-white text-[#D94E1F] shadow-xs'
                    : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                <Bike className="w-4 h-4" />
                <span>Delivery</span>
              </button>
              <button
                type="button"
                onClick={() => setServiceMode('takeout')}
                className={`py-2 px-1 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  serviceMode === 'takeout'
                    ? 'bg-white text-[#D94E1F] shadow-xs'
                    : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                <Store className="w-4 h-4" />
                <span>Retirada</span>
              </button>
            </div>

            {/* Itens na Sacola */}
            <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
              {cart.map((item, idx) => (
                <div
                  key={`${item.cartItemId || item.menuItemId}-${idx}`}
                  className="p-3 rounded-2xl bg-[#FAF6F0] border border-stone-200/80 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-extrabold text-stone-900 leading-snug">{item.name}</p>
                      <p className="text-xs text-stone-500 font-semibold mt-0.5">
                        {formatBRL(item.unitPrice)} cada • <span className="font-extrabold text-stone-900">{formatBRL(item.unitPrice * item.quantity)}</span>
                      </p>

                      {/* Ingredientes Removidos */}
                      {item.removedIngredients && item.removedIngredients.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {item.removedIngredients.map((ing) => (
                            <span
                              key={ing}
                              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-rose-100 text-rose-800 text-[10px] font-black"
                            >
                              ✕ Sem {ing}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Observações do Item */}
                      {item.notes && (
                        <p className="text-[11px] text-amber-800 font-medium mt-1 bg-amber-50 rounded-lg px-2 py-0.5 border border-amber-200/60 inline-block">
                          📝 {item.notes}
                        </p>
                      )}
                    </div>

                    <button
                      onClick={() => handleRemoveCartItem(item.cartItemId || item.menuItemId)}
                      className="text-stone-400 hover:text-rose-600 p-1 cursor-pointer transition-colors"
                      title="Remover este item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-stone-200/50">
                    <button
                      onClick={() => handleOpenEditCartItem(item)}
                      className="text-[11px] font-bold text-[#D94E1F] hover:text-[#B83D14] flex items-center gap-1 cursor-pointer underline underline-offset-2"
                      title="Editar observação ou retirar ingredientes"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Editar / Tirar Ingrediente</span>
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleUpdateQty(item, -1)}
                        className="w-6 h-6 rounded-lg bg-white border border-stone-200 text-stone-700 flex items-center justify-center hover:bg-stone-100 cursor-pointer shadow-2xs"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-xs font-black w-4 text-center">{item.quantity}</span>
                      <button
                        onClick={() => handleUpdateQty(item, 1)}
                        className="w-6 h-6 rounded-lg bg-white border border-stone-200 text-stone-700 flex items-center justify-center hover:bg-stone-100 cursor-pointer shadow-2xs"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {cart.length === 0 && (
                <p className="text-xs text-stone-400 text-center py-8">
                  Sua sacola está vazia. Escolha um Combo ou Prato ao lado!
                </p>
              )}
            </div>

            {/* Assistente Inteligente de Ofertas ("Você economizou R$ X") */}
            {cart.length > 0 && (
              <div className="p-4 rounded-2xl bg-emerald-50 border-2 border-emerald-500/40 text-emerald-950 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-extrabold uppercase text-emerald-800 flex items-center gap-1">
                    <Percent className="w-4 h-4 text-emerald-600" />
                    Melhor Oferta Aplicada
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-600 text-white text-xs font-extrabold shadow-2xs">
                    🎉 {offerEvaluation.savingsBannerText}
                  </span>
                </div>
                <p className="text-xs font-bold text-emerald-900">
                  {offerEvaluation.bestPromotionName}
                </p>
              </div>
            )}

            {/* Escolha de Pagamento */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-500 block">
                Forma de Pagamento:
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {(['PIX', 'Cartão de Crédito', 'Cartão de Débito', 'Dinheiro'] as const).map(
                  (method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setPaymentMethod(method)}
                      className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        paymentMethod === method
                          ? 'border-[#D94E1F] bg-orange-50 text-[#D94E1F] font-extrabold'
                          : 'border-stone-200 bg-stone-50 text-stone-600 hover:bg-stone-100'
                      }`}
                    >
                      {method}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Totais */}
            <div className="space-y-1.5 pt-2 border-t border-stone-100 text-xs">
              <div className="flex justify-between text-stone-500 font-medium">
                <span>Subtotal</span>
                <span>{formatBRL(cartSubtotal)}</span>
              </div>
              <div className="flex justify-between text-emerald-600 font-bold">
                <span>Desconto Automático IA</span>
                <span>-{formatBRL(cart.length > 0 ? offerEvaluation.discountAmount : 0)}</span>
              </div>
              {serviceMode === 'delivery_link' && cart.length > 0 && (
                <div className="flex justify-between text-stone-700 font-medium">
                  <span>Taxa de Entrega ({selectedDeliveryOption.name.split('-')[0].trim()})</span>
                  <span className="font-bold text-stone-900">{formatBRL(currentDeliveryFee)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-extrabold text-stone-900 pt-1">
                <span>Total Final</span>
                <span className="text-[#D94E1F]">
                  {formatBRL(cart.length > 0 ? finalGrandTotal : 0)}
                </span>
              </div>
            </div>

            <button
              onClick={handleOpenCheckoutModal}
              disabled={cart.length === 0}
              className="w-full py-4 rounded-2xl bg-[#25D366] hover:bg-[#20BA5C] text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 cursor-pointer disabled:opacity-40 transition-all active:scale-[0.98]"
            >
              <MessageCircle className="w-5 h-5 fill-white" />
              <span>
                {cart.length > 0
                  ? `Finalizar Pedido no WhatsApp (${formatBRL(finalGrandTotal)})`
                  : 'Adicione itens na sacola'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Barra Flutuante de Carrinho no Mobile/Tablet */}
      {cart.length > 0 && (
        <div className="fixed bottom-4 inset-x-4 z-40 lg:hidden">
          <button
            onClick={() => {
              setCartModalTab('cart');
              setIsCartModalOpen(true);
            }}
            className="w-full py-3.5 px-5 rounded-2xl bg-[#D94E1F] hover:bg-[#B83D14] text-white font-extrabold text-sm flex items-center justify-between shadow-2xl shadow-orange-950/40 cursor-pointer active:scale-[0.99] transition-transform border border-white/20"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                <ShoppingBag className="w-4 h-4 text-white" />
              </div>
              <span className="font-extrabold">
                {cart.reduce((s, i) => s + i.quantity, 0)} {cart.reduce((s, i) => s + i.quantity, 0) === 1 ? 'item' : 'itens'} na Sacola
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-black text-amber-200">
                {formatBRL(finalGrandTotal)}
              </span>
              <span className="text-xs bg-white text-[#D94E1F] px-2.5 py-1 rounded-xl font-black flex items-center gap-1 shadow-xs">
                Ver Carrinho <ArrowRight className="w-3 h-3" />
              </span>
            </div>
          </button>
        </div>
      )}

      {/* Modal / Gaveta de Carrinho e Pedidos do Cliente */}
      {isCartModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-5 sm:p-6 space-y-4 shadow-2xl border border-stone-200 max-h-[92vh] flex flex-col">
            {/* Header do Modal com Abas */}
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2 bg-stone-100 p-1 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setCartModalTab('cart')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                    cartModalTab === 'cart'
                      ? 'bg-white text-[#D94E1F] shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>Sacola ({cart.reduce((s, i) => s + i.quantity, 0)})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCartModalTab('orders')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                    cartModalTab === 'orders'
                      ? 'bg-white text-[#D94E1F] shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <ClipboardList className="w-3.5 h-3.5" />
                  <span>Meus Pedidos ({activeCustomerOrdersCount})</span>
                </button>
              </div>

              <button
                onClick={() => setIsCartModalOpen(false)}
                className="p-1.5 rounded-full bg-stone-100 text-stone-500 hover:text-stone-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Conteúdo Aba Carrinho */}
            {cartModalTab === 'cart' && (
              <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                {/* Modalidade */}
                <div className="grid grid-cols-2 gap-1.5 p-1 bg-stone-100 rounded-2xl">
                  <button
                    type="button"
                    onClick={() => setServiceMode('delivery_link')}
                    className={`py-2 px-1 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      serviceMode === 'delivery_link'
                        ? 'bg-white text-[#D94E1F] shadow-xs'
                        : 'text-stone-500 hover:text-stone-800'
                    }`}
                  >
                    <Bike className="w-3.5 h-3.5" />
                    <span>Delivery</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setServiceMode('takeout')}
                    className={`py-2 px-1 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      serviceMode === 'takeout'
                        ? 'bg-white text-[#D94E1F] shadow-xs'
                        : 'text-stone-500 hover:text-stone-800'
                    }`}
                  >
                    <Store className="w-3.5 h-3.5" />
                    <span>Retirada</span>
                  </button>
                </div>

                {/* Itens do Carrinho */}
                <div className="space-y-2.5">
                  {cart.map((item, idx) => (
                    <div
                      key={`${item.cartItemId || item.menuItemId}-${idx}`}
                      className="p-3.5 rounded-2xl bg-[#FAF6F0] border border-stone-200/80 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <h4 className="text-sm font-extrabold text-stone-900 leading-snug">{item.name}</h4>
                          <p className="text-xs text-stone-500 font-semibold mt-0.5">
                            {formatBRL(item.unitPrice)} cada • <span className="font-extrabold text-[#D94E1F]">{formatBRL(item.unitPrice * item.quantity)}</span>
                          </p>

                          {/* Ingredientes Removidos */}
                          {item.removedIngredients && item.removedIngredients.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {item.removedIngredients.map((ing) => (
                                <span
                                  key={ing}
                                  className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 text-[10px] font-black"
                                >
                                  ✕ Sem {ing}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Observações */}
                          {item.notes && (
                            <p className="text-[11px] text-amber-800 font-medium mt-1 bg-amber-50 rounded-lg px-2 py-0.5 border border-amber-200/60 inline-block">
                              📝 {item.notes}
                            </p>
                          )}
                        </div>

                        <button
                          onClick={() => handleRemoveCartItem(item.cartItemId || item.menuItemId)}
                          className="text-stone-400 hover:text-rose-600 p-1.5 cursor-pointer transition-colors"
                          title="Remover este item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-stone-200/50">
                        {/* Botão de Editar Pedido (Tirar Ingredientes) */}
                        <button
                          onClick={() => {
                            handleOpenEditCartItem(item);
                            setIsCartModalOpen(false);
                          }}
                          className="px-2.5 py-1 rounded-xl bg-orange-100/70 hover:bg-orange-100 text-[#D94E1F] text-xs font-extrabold flex items-center gap-1.5 cursor-pointer transition-colors"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Editar / Tirar Ingrediente</span>
                        </button>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleUpdateQty(item, -1)}
                            className="w-7 h-7 rounded-xl bg-white border border-stone-200 text-stone-700 flex items-center justify-center hover:bg-stone-100 cursor-pointer shadow-2xs"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-sm font-black w-4 text-center">{item.quantity}</span>
                          <button
                            onClick={() => handleUpdateQty(item, 1)}
                            className="w-7 h-7 rounded-xl bg-white border border-stone-200 text-stone-700 flex items-center justify-center hover:bg-stone-100 cursor-pointer shadow-2xs"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {cart.length === 0 && (
                    <div className="text-center py-10 space-y-2">
                      <div className="w-12 h-12 rounded-full bg-orange-50 text-[#D94E1F] flex items-center justify-center mx-auto">
                        <ShoppingBag className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-bold text-stone-700">Sua sacola está vazia</p>
                      <p className="text-xs text-stone-400">
                        Escolha suas pizzas, esfihas ou bebidas favoritas no cardápio!
                      </p>
                    </div>
                  )}
                </div>

                {/* Resumo de Valores */}
                {cart.length > 0 && (
                  <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-2 text-xs">
                    <div className="flex justify-between text-stone-600 font-medium">
                      <span>Subtotal</span>
                      <span>{formatBRL(cartSubtotal)}</span>
                    </div>
                    {offerEvaluation.discountAmount > 0 && (
                      <div className="flex justify-between text-emerald-600 font-bold">
                        <span>Desconto ({offerEvaluation.bestPromotionName})</span>
                        <span>-{formatBRL(offerEvaluation.discountAmount)}</span>
                      </div>
                    )}
                    {serviceMode === 'delivery_link' && (
                      <div className="flex justify-between text-stone-700 font-medium">
                        <span>Taxa de Entrega ({selectedDeliveryOption.name.split('-')[0].trim()})</span>
                        <span className="font-bold text-stone-900">{formatBRL(currentDeliveryFee)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-base font-extrabold text-stone-900 pt-1 border-t border-stone-200">
                      <span>Total</span>
                      <span className="text-[#D94E1F]">{formatBRL(finalGrandTotal)}</span>
                    </div>
                  </div>
                )}

                {/* Botão de Finalizar */}
                {cart.length > 0 && (
                  <button
                    onClick={() => {
                      setIsCartModalOpen(false);
                      handleOpenCheckoutModal();
                    }}
                    className="w-full py-3.5 rounded-2xl bg-[#25D366] hover:bg-[#20BA5C] text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 cursor-pointer active:scale-[0.98] transition-all"
                  >
                    <MessageCircle className="w-5 h-5 fill-white" />
                    <span>Pedir pelo WhatsApp ({formatBRL(finalGrandTotal)})</span>
                  </button>
                )}
              </div>
            )}

            {/* Conteúdo Aba Meus Pedidos Realizados */}
            {cartModalTab === 'orders' && (
              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {customerPlacedOrders.length > 0 && (
                  <div className="flex items-center justify-between pb-2 border-b border-stone-100">
                    <span className="text-xs font-bold text-stone-500">Seus pedidos e histórico:</span>
                    <button
                      onClick={handleClearCompletedOrders}
                      className="px-2.5 py-1 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <span>🧹 Limpar Concluídos</span>
                    </button>
                  </div>
                )}
                {customerPlacedOrders.length === 0 ? (
                  <div className="text-center py-10 space-y-2">
                    <div className="w-12 h-12 rounded-full bg-stone-100 text-stone-400 flex items-center justify-center mx-auto">
                      <ClipboardList className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-bold text-stone-700">Nenhum pedido realizado ainda</p>
                    <p className="text-xs text-stone-400 max-w-xs mx-auto">
                      Assim que você enviar um pedido pelo WhatsApp, ele aparecerá aqui com acompanhamento em tempo real!
                    </p>
                  </div>
                ) : (
                  customerPlacedOrders.map((order) => {
                    const statusInfo =
                      order.status === 'new'
                        ? { label: 'Recebido na Cozinha', color: 'bg-amber-100 text-amber-900 border-amber-300' }
                        : order.status === 'preparing'
                        ? { label: 'No Forno / Em Preparo 🔥', color: 'bg-orange-100 text-orange-900 border-orange-300' }
                        : order.status === 'ready'
                        ? {
                            label: order.channel === 'takeout' ? 'Pronto no Balcão 🛍️' : 'Pronto p/ Entrega 📦',
                            color: 'bg-purple-100 text-purple-900 border-purple-300',
                          }
                        : order.status === 'out_for_delivery'
                        ? {
                            label: `Saiu p/ Entrega ${order.driverName ? `(${order.driverName})` : ''} 🛵💨`,
                            color: 'bg-blue-100 text-blue-900 border-blue-300 animate-pulse font-black',
                          }
                        : order.status === 'delivered'
                        ? { label: 'Entregue com Sucesso ✓', color: 'bg-emerald-100 text-emerald-900 border-emerald-300' }
                        : { label: 'Cancelado', color: 'bg-rose-100 text-rose-900 border-rose-300' };

                    return (
                      <div
                        key={order.id}
                        className="p-4 rounded-2xl bg-white border border-stone-200 shadow-xs space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-xs font-bold text-stone-400">Pedido</span>
                            <h4 className="text-sm font-extrabold text-stone-900">
                              #{order.orderNumber}
                            </h4>
                          </div>
                          <span
                            className={`px-3 py-1 rounded-full text-[11px] font-extrabold border ${statusInfo.color}`}
                          >
                            ● {statusInfo.label}
                          </span>
                        </div>

                        <div className="text-xs text-stone-600 space-y-1 bg-stone-50 p-2.5 rounded-xl border border-stone-100">
                          <p className="font-bold text-stone-800">Itens do Pedido:</p>
                          {order.items.map((item, idx) => (
                            <div key={idx} className="flex flex-col py-0.5">
                              <span className="font-semibold text-stone-900">
                                • {item.quantity}x {item.name} ({formatBRL(item.unitPrice * item.quantity)})
                              </span>
                              {item.removedIngredients && item.removedIngredients.length > 0 && (
                                <span className="text-[11px] text-rose-700 font-bold pl-3">
                                  ↳ ❌ Sem: {item.removedIngredients.join(', ')}
                                </span>
                              )}
                              {item.notes && (
                                <span className="text-[11px] text-amber-800 pl-3">
                                  ↳ 📝 Obs: {item.notes}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>

                        <div className="flex items-center justify-between text-xs pt-1 border-t border-stone-100">
                          <span className="font-semibold text-stone-500">
                            {order.channel === 'delivery_link'
                              ? '🛵 Delivery'
                              : order.channel === 'takeout'
                              ? '🛍️ Retirada'
                              : `🍽️ Mesa ${order.tableNumber || ''}`}
                          </span>
                          <span className="text-sm font-extrabold text-[#D94E1F]">
                            Total: {formatBRL(order.total)}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de Personalização e Edição de Item (Tirar Ingredientes do Pedido) */}
      {customizingItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 space-y-4 shadow-2xl border border-stone-200 max-h-[92vh] flex flex-col">
            {/* Header com Foto e Informações do Item */}
            <div className="flex items-start justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-3">
                {customizingItem.imageUrl ? (
                  <img
                    src={customizingItem.imageUrl}
                    alt={customizingItem.name}
                    className="w-14 h-14 rounded-2xl object-cover border border-stone-200 shrink-0"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-2xl bg-orange-100 text-[#D94E1F] flex items-center justify-center shrink-0">
                    <Utensils className="w-7 h-7" />
                  </div>
                )}
                <div>
                  <span className="px-2 py-0.5 rounded-md bg-orange-100 text-[#D94E1F] text-[10px] font-extrabold uppercase">
                    {customizingItem.category}
                  </span>
                  <h3 className="text-base font-extrabold text-stone-900 leading-snug">
                    {customizingItem.name}
                  </h3>
                  <p className="text-sm font-black text-[#D94E1F]">
                    {formatBRL(customizingItem.price)}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setCustomizingItem(null)}
                className="p-1.5 rounded-full bg-stone-100 text-stone-500 hover:text-stone-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
              {/* Descrição do Produto */}
              {customizingItem.description && (
                <p className="text-stone-500 leading-relaxed bg-stone-50 p-2.5 rounded-xl border border-stone-100">
                  {customizingItem.description}
                </p>
              )}

              {/* Seção Principal: Tirar Ingrediente do Pedido */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-extrabold text-stone-900 text-xs flex items-center gap-1.5">
                    <Sliders className="w-4 h-4 text-[#D94E1F]" />
                    <span>Ingredientes Deste Produto:</span>
                  </label>
                  <span className="text-[11px] text-stone-400 font-semibold">
                    Toque para tirar do pedido
                  </span>
                </div>

                {/* Lista Interativa de Ingredientes com Toggle On/Off */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {customizingItem.allIngredients.map((ingredient) => {
                    const isRemoved = customizingItem.removedIngredients.some(
                      (r) => r.toLowerCase() === ingredient.toLowerCase()
                    );

                    return (
                      <button
                        key={ingredient}
                        type="button"
                        onClick={() => handleToggleIngredientRemoval(ingredient)}
                        className={`p-2.5 rounded-2xl border text-left flex items-center justify-between gap-2 transition-all cursor-pointer ${
                          isRemoved
                            ? 'bg-rose-50 border-rose-300 text-rose-800 shadow-2xs'
                            : 'bg-emerald-50/70 border-emerald-300 text-emerald-950 hover:bg-emerald-100/60'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {isRemoved ? (
                            <span className="w-5 h-5 rounded-full bg-rose-200 text-rose-800 flex items-center justify-center font-black text-xs">
                              ✕
                            </span>
                          ) : (
                            <span className="w-5 h-5 rounded-full bg-emerald-200 text-emerald-800 flex items-center justify-center font-black text-xs">
                              ✓
                            </span>
                          )}
                          <span className={`font-extrabold text-xs ${isRemoved ? 'line-through text-rose-700' : ''}`}>
                            {ingredient}
                          </span>
                        </div>
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                          isRemoved ? 'bg-rose-600 text-white' : 'bg-emerald-200 text-emerald-900'
                        }`}>
                          {isRemoved ? 'Removido' : 'Incluído'}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Exclusões Rápidas mais comuns (1-clique) */}
                <div className="pt-2">
                  <p className="text-[11px] font-extrabold text-stone-600 mb-1.5">
                    Atalhos Rápidos de Remoção:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {COMMON_EXCLUSIONS.map((exclusion) => {
                      const isRemoved = customizingItem.removedIngredients.some(
                        (r) => r.toLowerCase().includes(exclusion.toLowerCase())
                      );
                      return (
                        <button
                          key={exclusion}
                          type="button"
                          onClick={() => handleQuickExclusion(exclusion)}
                          className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
                            isRemoved
                              ? 'bg-rose-600 text-white border-rose-600'
                              : 'bg-stone-100 text-stone-700 border-stone-200 hover:bg-stone-200'
                          }`}
                        >
                          {isRemoved ? `✕ Sem ${exclusion}` : `🚫 Sem ${exclusion}`}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Banner de Aviso de Ingredientes Removidos */}
                {customizingItem.removedIngredients.length > 0 && (
                  <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 flex items-start gap-2 mt-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-extrabold text-xs">Atenção para a Cozinha:</p>
                      <p className="text-[11px] text-rose-800 mt-0.5">
                        Este item será preparado <span className="font-black">SEM: {customizingItem.removedIngredients.join(', ')}</span>.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Observações Extras do Prato */}
              <div className="space-y-1.5 pt-1">
                <label className="font-extrabold text-stone-800 text-xs block">
                  Alguma observação adicional? (opcional)
                </label>
                <textarea
                  rows={2}
                  value={customizingItem.notes}
                  onChange={(e) =>
                    setCustomizingItem({ ...customizingItem, notes: e.target.value })
                  }
                  placeholder="Ex: Massa bem assada, pouco sal, cortar em 8 fatias..."
                  className="w-full bg-stone-50 border border-stone-300 rounded-2xl px-3.5 py-2.5 text-xs font-semibold text-stone-900 focus:outline-none focus:border-[#D94E1F]"
                />
              </div>

              {/* Quantidade */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-stone-50 border border-stone-200">
                <span className="font-extrabold text-stone-800">Quantidade:</span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setCustomizingItem({
                        ...customizingItem,
                        quantity: Math.max(1, customizingItem.quantity - 1),
                      })
                    }
                    className="w-8 h-8 rounded-xl bg-white border border-stone-200 text-stone-700 flex items-center justify-center font-bold hover:bg-stone-100 cursor-pointer shadow-2xs"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="text-base font-black text-stone-900 w-5 text-center">
                    {customizingItem.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setCustomizingItem({
                        ...customizingItem,
                        quantity: customizingItem.quantity + 1,
                      })
                    }
                    className="w-8 h-8 rounded-xl bg-white border border-stone-200 text-stone-700 flex items-center justify-center font-bold hover:bg-stone-100 cursor-pointer shadow-2xs"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Rodapé com Ações */}
            <div className="pt-2 border-t border-stone-100 flex items-center gap-2">
              {customizingItem.isEditingExistingCartItem && customizingItem.cartItemId && (
                <button
                  type="button"
                  onClick={() => {
                    handleRemoveCartItem(customizingItem.cartItemId!);
                    setCustomizingItem(null);
                  }}
                  className="p-3.5 rounded-2xl bg-stone-100 hover:bg-rose-50 text-stone-500 hover:text-rose-600 transition-colors cursor-pointer"
                  title="Remover do Carrinho"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              )}

              <button
                type="button"
                onClick={handleSaveCustomizedItem}
                className="flex-1 py-3.5 rounded-2xl bg-[#D94E1F] hover:bg-[#B83D14] text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-orange-900/20 cursor-pointer active:scale-[0.98] transition-all"
              >
                <span>
                  {customizingItem.isEditingExistingCartItem
                    ? 'Salvar Alterações no Pedido'
                    : 'Adicionar à Sacola'}
                </span>
                <span>• {formatBRL(customizingItem.price * customizingItem.quantity)}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Finalizar Pedido pelo WhatsApp (Sem necessidade de Login) */}
      {isCheckoutModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 space-y-5 shadow-2xl border border-stone-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#25D366] text-white flex items-center justify-center shadow-sm shrink-0">
                  <MessageCircle className="w-6 h-6 fill-white" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-stone-900 leading-tight">
                    Finalizar Pedido pelo WhatsApp
                  </h3>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Preencha seus dados para receber a confirmação e enviar à pizzaria
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCheckoutModalOpen(false)}
                className="p-1.5 rounded-full bg-stone-100 text-stone-500 hover:text-stone-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmAndSendToWhatsApp} className="space-y-4 text-xs">
              {/* Nome do Cliente */}
              <div>
                <label className="font-extrabold text-stone-700 block mb-1">
                  Seu Nome Completo: <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={customerNameInput}
                  onChange={(e) => setCustomerNameInput(e.target.value)}
                  placeholder="Ex: Natanael Fontoura"
                  className="w-full bg-stone-50 border border-stone-300 rounded-2xl px-4 py-3 text-sm font-semibold text-stone-900 focus:outline-none focus:border-[#25D366]"
                  required
                />
              </div>

              {/* WhatsApp do Cliente */}
              <div>
                <label className="font-extrabold text-stone-700 block mb-1">
                  Seu WhatsApp com DDD: <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-stone-400 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    value={customerPhoneInput}
                    onChange={(e) => setCustomerPhoneInput(e.target.value)}
                    placeholder="Ex: (85) 99812-4401"
                    className="w-full bg-stone-50 border border-stone-300 rounded-2xl pl-11 pr-4 py-3 text-sm font-semibold text-stone-900 focus:outline-none focus:border-[#25D366]"
                    required
                  />
                </div>
                <span className="text-[11px] text-stone-400 mt-1 block">
                  Enviaremos o comprovante e status do forno para este número.
                </span>
              </div>

              {/* Modalidade de Atendimento */}
              <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-stone-800">
                    Modalidade de Pedido:
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-[#D94E1F] text-white">
                    {serviceMode === 'delivery_link'
                      ? '🛵 Entrega Delivery'
                      : '🛍️ Retirada no Balcão'}
                  </span>
                </div>

                {serviceMode === 'delivery_link' && (
                  <div className="space-y-3 pt-1">
                    {/* Seleção do Condomínio / Local para cálculo da Taxa de Entrega */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="font-extrabold text-stone-700 text-xs flex items-center gap-1.5">
                          <span>🏡</span>
                          <span>Condomínio / Região de Entrega:</span>
                          <span className="text-red-500">*</span>
                        </label>
                        <span className="text-[11px] font-black text-[#D94E1F] bg-orange-100 px-2.5 py-0.5 rounded-full border border-orange-200">
                          Taxa: {formatBRL(currentDeliveryFee)}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {DELIVERY_LOCATION_OPTIONS.map((loc) => {
                          const isSelected = deliveryLocationId === loc.id;
                          return (
                            <button
                              key={loc.id}
                              type="button"
                              onClick={() => setDeliveryLocationId(loc.id)}
                              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                                isSelected
                                  ? 'border-[#D94E1F] bg-orange-50/80 ring-2 ring-[#D94E1F]/20 shadow-xs'
                                  : 'border-stone-200 bg-white hover:bg-stone-50 hover:border-stone-300'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <span className={`text-xs font-black leading-snug ${isSelected ? 'text-[#D94E1F]' : 'text-stone-800'}`}>
                                  {loc.name}
                                </span>
                                <span
                                  className={`text-xs font-black px-2 py-0.5 rounded-lg shrink-0 ${
                                    isSelected
                                      ? 'bg-[#D94E1F] text-white shadow-2xs'
                                      : 'bg-stone-100 text-stone-700'
                                  }`}
                                >
                                  {formatBRL(loc.fee)}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 text-[11px] text-stone-500">
                                <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-[#D94E1F]' : 'bg-stone-300'}`} />
                                <span className="font-semibold">
                                  {isSelected ? 'Opção selecionada' : 'Selecionar local'}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <label className="font-bold text-stone-600 block mb-1">
                        Endereço de Entrega (Rua, Quadra, Bloco ou Apto): <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={deliveryAddressInput}
                        onChange={(e) => setDeliveryAddressInput(e.target.value)}
                        placeholder="Ex: Bloco B, Apto 204 ou Rua 05, Casa 12"
                        className="w-full bg-white border border-stone-300 rounded-xl px-3.5 py-2.5 text-xs text-stone-900 font-semibold focus:outline-none focus:border-[#25D366]"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="font-bold text-stone-600 block mb-1">
                          {deliveryLocationId === 'outros' ? 'Bairro / Região: *' : 'Complemento / Casa:'}
                        </label>
                        <input
                          type="text"
                          value={deliveryNeighborhoodInput}
                          onChange={(e) => setDeliveryNeighborhoodInput(e.target.value)}
                          placeholder={deliveryLocationId === 'outros' ? 'Ex: Bairro tal' : 'Ex: Casa 08, Bloco C'}
                          className="w-full bg-white border border-stone-300 rounded-xl px-3.5 py-2.5 text-xs text-stone-900 font-semibold focus:outline-none focus:border-[#25D366]"
                        />
                      </div>
                      <div>
                        <label className="font-bold text-stone-600 block mb-1">Ponto de Referência:</label>
                        <input
                          type="text"
                          value={deliveryNotesInput}
                          onChange={(e) => setDeliveryNotesInput(e.target.value)}
                          placeholder="Ex: Próximo à portaria ou portão"
                          className="w-full bg-white border border-stone-300 rounded-xl px-3.5 py-2.5 text-xs text-stone-900 font-semibold focus:outline-none focus:border-[#25D366]"
                        />
                      </div>
                    </div>
                  </div>
                )}


                {serviceMode === 'takeout' && (
                  <p className="text-xs text-stone-600">
                    Seu pedido estará quentinho e embalado para retirada no balcão em <strong>15 a 20 minutos</strong>.
                  </p>
                )}
              </div>

              {/* Forma de Pagamento */}
              <div className="space-y-2">
                <label className="font-extrabold text-stone-700 block">
                  Forma de Pagamento:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['PIX', 'Cartão de Crédito', 'Cartão de Débito', 'Dinheiro'] as const).map(
                    (method) => (
                      <button
                        key={method}
                        type="button"
                        onClick={() => setPaymentMethod(method)}
                        className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          paymentMethod === method
                            ? 'border-[#25D366] bg-emerald-50 text-emerald-800 font-extrabold shadow-2xs'
                            : 'border-stone-200 bg-stone-50 text-stone-600 hover:bg-stone-100'
                        }`}
                      >
                        {method === 'PIX' ? '⚡ PIX' : method}
                      </button>
                    )
                  )}
                </div>

                {paymentMethod === 'Dinheiro' && (
                  <div className="pt-2 space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer font-bold text-stone-700">
                      <input
                        type="checkbox"
                        checked={needChange}
                        onChange={(e) => setNeedChange(e.target.checked)}
                        className="rounded accent-[#25D366] w-4 h-4 cursor-pointer"
                      />
                      <span>Precisa de troco para dinheiro?</span>
                    </label>
                    {needChange && (
                      <input
                        type="text"
                        value={changeForInput}
                        onChange={(e) => setChangeForInput(e.target.value)}
                        placeholder="Ex: Troco para R$ 50,00 ou R$ 100,00"
                        className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2 text-xs font-semibold text-stone-900 focus:outline-none focus:border-[#25D366]"
                      />
                    )}
                  </div>
                )}
              </div>

              {/* Resumo do Valor */}
              <div className="p-3.5 rounded-2xl bg-[#FAF6F0] border border-stone-200/80 space-y-1.5 text-xs">
                <div className="flex justify-between text-stone-500 font-medium">
                  <span>Subtotal ({cart.reduce((s, i) => s + i.quantity, 0)} itens):</span>
                  <span>{formatBRL(cartSubtotal)}</span>
                </div>
                {offerEvaluation.discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-bold">
                    <span>Desconto ({offerEvaluation.bestPromotionName}):</span>
                    <span>-{formatBRL(offerEvaluation.discountAmount)}</span>
                  </div>
                )}
                {serviceMode === 'delivery_link' && (
                  <div className="flex justify-between text-stone-700 font-medium">
                    <span>Taxa de Entrega ({selectedDeliveryOption.name}):</span>
                    <span className="font-bold text-stone-900">{formatBRL(currentDeliveryFee)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-extrabold text-stone-900 pt-1 border-t border-stone-200">
                  <span>Total do Pedido:</span>
                  <span className="text-[#D94E1F]">
                    {formatBRL(finalGrandTotal)}
                  </span>
                </div>
              </div>

              {checkoutError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 font-bold text-xs">
                  {checkoutError}
                </div>
              )}

              <button
                type="submit"
                className="w-full py-4 rounded-2xl bg-[#25D366] hover:bg-[#20BA5C] text-white text-sm font-extrabold flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 cursor-pointer active:scale-98 transition-all"
              >
                <MessageCircle className="w-5 h-5 fill-white" />
                <span>Enviar Pedido no WhatsApp ({formatBRL(finalGrandTotal)})</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Pedido Concluído & Encaminhado ao WhatsApp */}
      {successOrderData && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 space-y-5 shadow-2xl border border-stone-200 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div className="space-y-1.5">
              <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-extrabold inline-block">
                Pedido #{successOrderData.orderNumber} Registrado!
              </span>
              <h3 className="text-xl font-extrabold text-stone-900">
                Seu pedido foi enviado!
              </h3>
              <p className="text-xs text-stone-500 leading-relaxed max-w-sm mx-auto">
                Registramos seu pedido na nossa cozinha e preparamos a mensagem para o WhatsApp do restaurante.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#FAF6F0] border border-stone-200 text-left space-y-1.5 text-xs">
              <div className="flex justify-between font-bold text-stone-700">
                <span>Cliente:</span>
                <span>{successOrderData.customerName}</span>
              </div>
              <div className="flex justify-between font-bold text-stone-700">
                <span>Total a Pagar:</span>
                <span className="text-[#D94E1F] font-extrabold">
                  {formatBRL(successOrderData.total)}
                </span>
              </div>
              <div className="flex justify-between font-bold text-stone-700">
                <span>WhatsApp Restaurante:</span>
                <span className="text-emerald-700 font-extrabold">+55 (81) 98906-1961</span>
              </div>
            </div>

            <div className="space-y-2.5 pt-1">
              <a
                href={successOrderData.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-4 rounded-2xl bg-[#25D366] hover:bg-[#20BA5C] text-white text-sm font-extrabold flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
              >
                <MessageCircle className="w-5 h-5 fill-white" />
                <span>Abrir WhatsApp da Pizzaria Agora</span>
              </a>

              <button
                type="button"
                onClick={handleCopyOrderText}
                className="w-full py-3 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-extrabold flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                {hasCopiedWhatsApp ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span className="text-emerald-700">Resumo Copiado para a Área de Transferência!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-stone-600" />
                    <span>Copiar Resumo do Pedido</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setSuccessOrderData(null)}
                className="w-full py-2 text-xs font-bold text-stone-500 hover:text-stone-800 cursor-pointer"
              >
                Fechar e voltar ao Cardápio
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Acesso Restrito ao Painel do Gerente */}
      {isPinModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 space-y-5 shadow-2xl border border-stone-200">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-stone-900 text-amber-400 flex items-center justify-center">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-stone-900">
                    Acesso Restrito de Gerente
                  </h3>
                  <p className="text-xs text-stone-500">
                    Organize cardápio, combos, preços, cozinha (KDS) e financeiro
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsPinModalOpen(false)}
                className="p-1.5 rounded-full bg-stone-100 text-stone-500 hover:text-stone-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleVerifyPin} className="space-y-4">
              <div>
                <input
                  type="password"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  placeholder="Digite o PIN de acesso"
                  aria-label="PIN de Gerente"
                  autoFocus
                  className="w-full bg-stone-100 border border-stone-300 rounded-2xl px-4 py-3 text-center text-lg font-extrabold tracking-widest text-stone-900 focus:outline-none focus:border-stone-900"
                />
                {pinError && (
                  <p className="text-xs font-bold text-red-600 mt-1.5">{pinError}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <button
                  type="submit"
                  className="w-full py-3 rounded-2xl bg-[#D94E1F] hover:bg-[#B83D14] text-white text-xs font-extrabold shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Painel do Gerente</span>
                </button>
                <button
                  type="button"
                  onClick={() => handlePinSubmitForMode('kitchen_dispatch')}
                  className="w-full py-3 rounded-2xl bg-stone-900 hover:bg-stone-800 text-amber-300 text-xs font-extrabold shadow-md cursor-pointer flex items-center justify-center gap-1.5 border border-stone-700"
                >
                  <ChefHat className="w-3.5 h-3.5 text-orange-400" />
                  <span>Cozinha & Chegada</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

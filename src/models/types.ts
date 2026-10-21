/**
 * @file /src/models/types.ts
 * @description Schema relacional unificado para a plataforma NexoRestô AI.
 * Contempla as 8 entidades centrais obrigatórias + logs agênticos, mesas/pulseiras e fila offline.
 */

export type UserRole = 'admin' | 'manager' | 'waiter' | 'kitchen' | 'cashier';

export type RestaurantLayoutMode =
  | 'bistro_light'
  | 'delivery_hub'
  | 'pos_touch'
  | 'gastropub_warm';

export interface AppUser {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
}

export interface Restaurant {
  id: string;
  name: string;
  cnpj: string;
  ie: string;
  address: string;
  city: string;
  state: string;
  taxRegime: 'Simples Nacional' | 'Lucro Presumido' | 'Regime Específico Bares e Restaurantes (IBS/CBS 2026)';
  sefazCertificateStatus: 'valid' | 'expiring' | 'expired';
  sefazCertificateExpiry: string;
  autonomousMenuOptimization: boolean;
  autonomousStockPurchase: boolean;
  autonomousChurnRecovery: boolean;
  dynamicTaxPricing: boolean;
  facebookPixelId: string;
  googlePixelId: string;
  posIntegrationsCount: number;
  whatsappPhone?: string;
  updatedAt: string;
}

export type ServiceChannelType = 'whatsapp' | 'qr_table' | 'waiter_app' | 'voice_agent' | 'delivery_link' | 'takeout';

export interface Service {
  id: string;
  type: ServiceChannelType;
  name: string;
  active: boolean;
  serviceFeePercent: number;
  avgPrepMinutes: number;
  activeOrdersCount: number;
  conversionRatePercent: number;
}

export type TaxClassification2026 =
  | 'ALIMENTACAO_PREPARADA_REDUCAO_60' // Redução de 60% IBS/CBS para bares e restaurantes (alíquota efetiva ~10.6%)
  | 'CESTA_BASICA_ALIQUOTA_ZERO'      // Alíquota 0% insumos essenciais
  | 'PADRAO_BEBIDAS_INDUSTRIALIZADOS' // Alíquota padrão integral (~26.5%)
  | 'IMPOSTO_SELETIVO_ALCOOL_ACUCAR'; // Alíquota padrão + Imposto Seletivo (IS)

export type MenuCategory =
  | 'Pizzas'
  | 'Pizzas Doces'
  | 'Esfihas'
  | 'Esfihas Doces'
  | 'Refrigerantes'
  | 'Entradas'
  | 'Pratos Principais'
  | 'Burgers Artesanais'
  | 'Sobremesas'
  | 'Bebidas';

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  category: MenuCategory;
  price: number;
  suggestedDynamicPrice?: number;
  cost: number;
  marginPercent: number;
  stockAvailable: number;
  conversionRate: number; // ex: 0.18 = 18%
  aiPriorityScore: number; // 0-100 calculado pelo Agente Autônomo
  displayOrder: number;
  ncm: string;
  cfop: string;
  taxClassification2026: TaxClassification2026;
  ibsRate: number; // % Imposto sobre Bens e Serviços
  cbsRate: number; // % Contribuição sobre Bens e Serviços
  isRate: number;  // % Imposto Seletivo
  isActive: boolean;
  aiBadge?: string;
  imageUrl?: string;
  tags: string[];
}

export interface ComboIncludedItem {
  menuItemId: string;
  name: string;
  quantity: number;
}

export interface ComboOffer {
  id: string;
  name: string;
  description: string;
  itemsIncluded: ComboIncludedItem[];
  originalPrice: number;
  comboPrice: number;
  cost: number;
  savingsAmount: number;
  badge: string;
  imageUrl: string;
  isActive: boolean;
  servesCount: number;
}

export interface OrderItem {
  cartItemId?: string;
  menuItemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  unitCost: number;
  notes?: string;
  removedIngredients?: string[];
}

export type OrderStatus = 'new' | 'preparing' | 'ready' | 'out_for_delivery' | 'delivered' | 'cancelled';

export interface Order {
  id: string;
  orderNumber: number;
  channel: ServiceChannelType;
  tableNumber?: string;
  wristbandId?: string;
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  deliveryAddress?: string;
  orderNotes?: string;
  items: OrderItem[];
  status: OrderStatus;
  subtotal: number;
  discountAmount: number;
  deliveryFee?: number;
  appliedPromotion?: string;
  loyaltyPointsUsed?: number;
  total: number;
  paymentMethod: 'PIX' | 'Cartão de Crédito' | 'Cartão de Débito' | 'Dinheiro' | 'Carteira Fidelidade';
  paymentStatus: 'pending' | 'paid' | 'refunded';
  nfceStatus: 'pending' | 'issued' | 'error';
  nfceProtocol?: string;
  taxTotalEstimated?: number;
  createdAt: string;
  prepStartedAt?: string;
  readyAt?: string;
  dispatchedAt?: string;
  driverName?: string;
  driverPhone?: string;
  deliveredAt?: string;
  station: 'Grelha & Brasa' | 'Cozinha Quente' | 'Bar & Bebidas' | 'Confeitaria';
  syncStatus: 'synced' | 'pending_sync';
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  neighborhood: string;
  totalOrders: number;
  lifetimeValue: number;
  loyaltyPoints: number;
  cashbackBalance: number;
  usualOrderDescription: string;
  usualOrderItemIds: string[];
  daysSinceLastOrder: number;
  avgOrderFrequencyDays: number;
  churnRiskScore: number; // 0 a 100
  lastRecoveryOffer?: string;
  lastRecoverySentAt?: string;
  npsScore: number;
  lastFeedback?: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: 'Proteínas' | 'Hortifruti' | 'Laticínios' | 'Secos & Grãos' | 'Bebidas' | 'Embalagens';
  unit: 'kg' | 'un' | 'L';
  currentStock: number;
  minStock: number;
  unitCost: number;
  predictedDailyUsage: number;
  daysUntilDepletion: number;
  aiSuggestedOrderQty: number;
  supplier: string;
  supplierCnpj: string;
  lastInvoiceNumber: string;
  weatherImpactFactor: string;
  autoPurchaseTriggered?: boolean;
}

export interface RecipeIngredient {
  inventoryItemId: string;
  name: string;
  quantity: number;
  unit: 'kg' | 'un' | 'L';
  unitCost: number;
  correctionFactor: number; // Fator de Correção (perda no preparo/limpeza)
  lineCost: number;
}

export interface Recipe {
  id: string;
  menuItemId: string;
  menuItemName: string;
  yieldPortions: number;
  ingredients: RecipeIngredient[];
  totalIngredientCost: number;
  cmvPercent: number;
  targetCmvPercent: number;
  prepTimeMinutes: number;
  instructions: string;
}

export interface FinancialRecord {
  id: string;
  type: 'revenue' | 'expense' | 'payable' | 'receivable' | 'cash_opening' | 'cash_closing';
  category:
    | 'Vendas Salão'
    | 'Vendas Delivery'
    | 'Insumos & Mercadorias (CMV)'
    | 'Folha & Encargos'
    | 'Impostos (IBS/CBS/IS)'
    | 'Taxas de Pagamento'
    | 'Ocupação & Utilidades'
    | 'Marketing & Fidelidade';
  description: string;
  amount: number;
  paymentMethod: string;
  status: 'paid' | 'pending' | 'overdue';
  dueDate: string;
  nfceNumber?: string;
  taxIbsAmount?: number;
  taxCbsAmount?: number;
  createdAt: string;
}

export interface AgentLog {
  id: string;
  agentName:
    | 'Agente de Cardápio Dinâmico'
    | 'Assistente de Ofertas & Combos'
    | 'Agente Preditivo de Estoque'
    | 'Agente Anti-Churn & Fidelidade'
    | 'Motor Tributário IA (Reforma 2026)'
    | 'Agente Conversacional (Voz/WhatsApp)';
  actionType: 'menu_reorder' | 'offer_applied' | 'stock_purchase' | 'churn_recovery' | 'tax_reprice' | 'voice_order';
  summary: string;
  reasoning: string;
  impactMetric: string;
  confidence: number;
  executedAt: string;
}

export interface TableSession {
  id: string;
  tableNumber: string;
  wristbandIds: string[];
  status: 'free' | 'occupied' | 'calling_waiter' | 'closing_bill';
  guestsCount: number;
  waiterName: string;
  currentTotal: number;
  openedAt?: string;
}

export interface OfflineMutation {
  id: string;
  collectionName: string;
  docId: string;
  operation: 'set' | 'update' | 'delete';
  payload: Record<string, unknown>;
  timestamp: string;
  retries: number;
}

export interface OfferEvaluationResult {
  bestPromotionName: string;
  discountAmount: number;
  finalTotal: number;
  savingsBannerText: string;
  reasoning: string;
  alternativesEvaluated: {
    name: string;
    discount: number;
    preservedMarginPercent: number;
  }[];
}

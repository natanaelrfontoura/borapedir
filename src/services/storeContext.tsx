import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { collection, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import {
  db,
  auth,
  onAuthStateChanged,
  signInWithGoogle,
  signOutUser,
  User,
  handleFirestoreError,
  OperationType,
} from '../firebase';
import {
  Restaurant,
  Service,
  MenuItem,
  ComboOffer,
  Order,
  OrderStatus,
  Customer,
  InventoryItem,
  Recipe,
  FinancialRecord,
  AgentLog,
  TableSession,
  UserRole,
  RestaurantLayoutMode,
} from '../models/types';
import {
  INITIAL_RESTAURANT,
  INITIAL_SERVICES,
  INITIAL_MENU_ITEMS,
  INITIAL_COMBOS,
  INITIAL_ORDERS,
  INITIAL_CUSTOMERS,
  INITIAL_INVENTORY,
  INITIAL_RECIPES,
  INITIAL_FINANCIAL_RECORDS,
  INITIAL_AGENT_LOGS,
  INITIAL_TABLES,
} from '../models/seedData';
import {
  persistEntityWithOfflineFallback,
  flushOfflineQueue,
  getOfflineQueue,
  isSimulatedOffline,
  setSimulatedOffline,
  purgeFakeOrdersFromOfflineQueue,
} from './offlineSyncService';
import {
  runAutonomousMenuOptimization,
  runAutonomousStockPrediction,
  runDynamicTaxPricing2026,
} from '../agents/decisionEngine';
import { calculateMenuPriorityScore } from '../utils/formatters';

export type AppViewMode = 'customer_storefront' | 'kitchen_dispatch' | 'manager_dashboard';

/**
 * Identifica se um pedido é fake / mock / demonstrativo antigo
 */
export const isFakeOrder = (order: Order | Record<string, unknown> | null | undefined): boolean => {
  if (!order) return false;
  const ord = order as Order;
  const knownFakeIds = ['ord-4091', 'ord-4092', 'ord-4093', 'ord-4094'];
  if (ord.id && knownFakeIds.includes(ord.id)) return true;

  const testNames = [
    'cliente teste',
    'rafael mendonça',
    'mesa 04',
    'dr. henrique alencar',
    'camila vasconcelos',
  ];
  if (ord.customerName && testNames.some((tn) => ord.customerName.toLowerCase().includes(tn))) {
    return true;
  }

  const fakeKeywords = [
    'wagyu',
    'smash',
    'chorizo',
    'croqueta',
    'costela defumada',
    'cheesecake basco',
    'salmao',
    'parrilla',
    'botânica',
  ];
  const hasFakeItem = ord.items?.some((i) =>
    fakeKeywords.some(
      (kw) =>
        i.name?.toLowerCase().includes(kw) ||
        i.menuItemId?.toLowerCase().includes(kw) ||
        i.notes?.toLowerCase().includes('anti-churn') ||
        i.notes?.toLowerCase().includes('via voz')
    )
  );
  if (hasFakeItem) return true;

  return false;
};

interface StoreContextType {
  user: User | null;
  userRole: UserRole;
  setUserRole: (role: UserRole) => void;
  layoutMode: RestaurantLayoutMode;
  setLayoutMode: (mode: RestaurantLayoutMode) => void;
  isLayoutPickerOpen: boolean;
  setIsLayoutPickerOpen: (open: boolean) => void;

  // Main Screen Switcher (Customer Storefront, Kitchen & Dispatch Screen, Manager Restricted Dashboard)
  appViewMode: AppViewMode;
  setAppViewMode: (mode: AppViewMode) => void;
  isManagerUnlocked: boolean;
  unlockManagerDashboard: (pin: string) => boolean;
  lockManagerDashboard: () => void;

  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;

  // Offline-first state
  isOffline: boolean;
  toggleOfflineSimulation: () => void;
  pendingSyncCount: number;
  syncNow: () => Promise<void>;

  // Core Entities
  restaurant: Restaurant;
  services: Service[];
  menuItems: MenuItem[];
  combos: ComboOffer[];
  orders: Order[];
  customers: Customer[];
  inventory: InventoryItem[];
  recipes: Recipe[];
  financialRecords: FinancialRecord[];
  agentLogs: AgentLog[];
  tables: TableSession[];

  // Customer & Order Actions
  createOrder: (newOrder: Omit<Order, 'id' | 'orderNumber' | 'createdAt' | 'syncStatus'>) => Promise<Order>;
  advanceOrderStatus: (
    orderId: string,
    nextStatus?: OrderStatus,
    extraData?: { driverName?: string; driverPhone?: string }
  ) => Promise<void>;
  registerCustomer: (data: {
    name: string;
    phone: string;
    neighborhood: string;
  }) => Promise<Customer>;
  deleteOrder: (orderId: string) => Promise<void>;
  clearFakeOrders: () => Promise<number>;
  clearAllOrders: () => Promise<void>;

  // Manager Menu & Combos CRUD Actions
  addMenuItem: (item: Omit<MenuItem, 'id' | 'marginPercent' | 'aiPriorityScore' | 'displayOrder'>) => Promise<void>;
  updateMenuItem: (id: string, updates: Partial<MenuItem>) => Promise<void>;
  deleteMenuItem: (id: string) => Promise<void>;
  moveMenuItemOrder: (id: string, direction: 'up' | 'down') => Promise<void>;

  addCombo: (combo: Omit<ComboOffer, 'id' | 'savingsAmount'>) => Promise<void>;
  updateCombo: (id: string, updates: Partial<ComboOffer>) => Promise<void>;
  deleteCombo: (id: string) => Promise<void>;

  // AI & Operational Actions
  triggerAutonomousMenuAgent: () => Promise<void>;
  triggerPredictiveStockAgent: () => Promise<void>;
  triggerTaxReformPricingAgent: () => Promise<void>;
  triggerChurnRecoveryCampaign: (customerId: string) => Promise<void>;
  importSefazInvoiceXml: (invoiceNumber: string, supplierName: string) => Promise<void>;
  updateRecipeIngredientQty: (recipeId: string, inventoryItemId: string, newQty: number) => Promise<void>;
  updateTableStatus: (tableId: string, status: TableSession['status'], addAmount?: number) => void;
  addFinancialRecord: (record: Omit<FinancialRecord, 'id' | 'createdAt'>) => Promise<void>;
  lastAgentToast: AgentLog | null;
  dismissAgentToast: () => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<UserRole>('admin');
  const [layoutMode, setLayoutMode] = useState<RestaurantLayoutMode>('bistro_light');
  const [isLayoutPickerOpen, setIsLayoutPickerOpen] = useState<boolean>(false);

  // Tela Principal inicia na ÁREA DO CLIENTE (Cardápio Digital com Produtos e Combos)
  const [appViewMode, setAppViewMode] = useState<AppViewMode>('customer_storefront');
  const [isManagerUnlocked, setIsManagerUnlocked] = useState<boolean>(false);

  const [isOffline, setIsOffline] = useState<boolean>(() => isSimulatedOffline() || !navigator.onLine);
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(() => getOfflineQueue().length);

  const [restaurant] = useState<Restaurant>(INITIAL_RESTAURANT);
  const [services, setServices] = useState<Service[]>(INITIAL_SERVICES);
  const [menuItems, setMenuItems] = useState<MenuItem[]>(INITIAL_MENU_ITEMS);
  const [combos, setCombos] = useState<ComboOffer[]>(INITIAL_COMBOS);
  const [orders, setOrders] = useState<Order[]>(INITIAL_ORDERS);
  const [customers, setCustomers] = useState<Customer[]>(INITIAL_CUSTOMERS);
  const [inventory, setInventory] = useState<InventoryItem[]>(INITIAL_INVENTORY);
  const [recipes, setRecipes] = useState<Recipe[]>(INITIAL_RECIPES);
  const [financialRecords, setFinancialRecords] = useState<FinancialRecord[]>(INITIAL_FINANCIAL_RECORDS);
  const [agentLogs, setAgentLogs] = useState<AgentLog[]>(INITIAL_AGENT_LOGS);
  const [tables, setTables] = useState<TableSession[]>(INITIAL_TABLES);
  const [lastAgentToast, setLastAgentToast] = useState<AgentLog | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setIsManagerUnlocked(true);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      if (!isSimulatedOffline()) {
        setIsOffline(false);
        flushOfflineQueue().then((res) => setPendingSyncCount(res.remainingCount));
      }
    };
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Proactively purge legacy fake test orders on mount from Firestore
  useEffect(() => {
    const knownIds = ['ord-4091', 'ord-4092', 'ord-4093', 'ord-4094'];
    knownIds.forEach((id) => {
      deleteDoc(doc(db, 'orders', id)).catch(() => {});
    });
  }, []);

  // Real-time Firestore Listeners
  useEffect(() => {
    const unsubOrders = onSnapshot(
      collection(db, 'orders'),
      (snap) => {
        if (!snap.empty) {
          const loaded = snap.docs.map((d) => d.data() as Order);
          const cleanOrders = loaded.filter((o) => !isFakeOrder(o));
          cleanOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setOrders(cleanOrders);

          // Purge any fake orders found in Firestore
          const fakeDocs = snap.docs.filter((d) => isFakeOrder(d.data() as Order));
          fakeDocs.forEach((d) => {
            deleteDoc(doc(db, 'orders', d.id)).catch(() => {});
          });
        } else {
          setOrders([]);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'orders');
      }
    );

    const unsubMenu = onSnapshot(
      collection(db, 'menuItems'),
      (snap) => {
        if (!snap.empty) {
          const validCategories = new Set([
            'Pizzas',
            'Pizzas Doces',
            'Esfihas',
            'Esfihas Doces',
            'Refrigerantes',
          ]);
          const loaded = snap.docs
            .map((d) => d.data() as MenuItem)
            .filter((item) => validCategories.has(item.category));

          if (loaded.length > 0) {
            const seedById = new Map<string, MenuItem>();
            INITIAL_MENU_ITEMS.forEach((item) => seedById.set(item.id, item));

            const mergedMap = new Map<string, MenuItem>();
            INITIAL_MENU_ITEMS.forEach((item) => mergedMap.set(item.id, item));
            loaded.forEach((item) => {
              const seedItem = seedById.get(item.id);
              mergedMap.set(item.id, {
                ...item,
                imageUrl: seedItem ? seedItem.imageUrl : item.imageUrl,
              });
            });
            const merged = Array.from(mergedMap.values()).sort(
              (a, b) => a.displayOrder - b.displayOrder
            );
            setMenuItems(merged);
          }
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'menuItems');
      }
    );

    const unsubCombos = onSnapshot(
      collection(db, 'combos'),
      (snap) => {
        if (!snap.empty) {
          const loaded = snap.docs
            .map((d) => d.data() as ComboOffer)
            .filter((c) => !c.id.includes('wagyu') && !c.id.includes('parrilla') && !c.id.includes('smash'));

          if (loaded.length > 0) {
            const mergedMap = new Map<string, ComboOffer>();
            INITIAL_COMBOS.forEach((c) => mergedMap.set(c.id, c));
            loaded.forEach((c) => mergedMap.set(c.id, c));
            setCombos(Array.from(mergedMap.values()));
          }
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'combos');
      }
    );

    return () => {
      unsubOrders();
      unsubMenu();
      unsubCombos();
    };
  }, [user]);

  const unlockManagerDashboard = useCallback((pin: string): boolean => {
    // Aceita PIN padrão do gerente 1234 ou qualquer confirmação rápida
    if (pin === '1234' || pin === '0000' || pin === 'admin') {
      setIsManagerUnlocked(true);
      setAppViewMode('manager_dashboard');
      return true;
    }
    return false;
  }, []);

  const lockManagerDashboard = useCallback(() => {
    setAppViewMode('customer_storefront');
  }, []);

  const loginWithGoogle = async () => {
    try {
      const loggedUser = await signInWithGoogle();
      if (loggedUser) {
        setIsManagerUnlocked(true);
      }
    } catch (e) {
      console.error('Erro no login Google:', e);
    }
  };

  const logout = async () => {
    await signOutUser();
    setIsManagerUnlocked(false);
    setAppViewMode('customer_storefront');
  };

  const toggleOfflineSimulation = useCallback(() => {
    const next = !isOffline;
    setSimulatedOffline(next);
    setIsOffline(next);
    if (!next) {
      flushOfflineQueue().then((res) => setPendingSyncCount(res.remainingCount));
    }
  }, [isOffline]);

  const syncNow = useCallback(async () => {
    setSimulatedOffline(false);
    setIsOffline(false);
    const res = await flushOfflineQueue();
    setPendingSyncCount(res.remainingCount);
    setOrders((prev) => prev.map((o) => ({ ...o, syncStatus: 'synced' })));
  }, []);

  const recordAgentDecision = useCallback(
    async (log: AgentLog) => {
      setAgentLogs((prev) => [log, ...prev]);
      setLastAgentToast(log);
      const res = await persistEntityWithOfflineFallback(
        'agentLogs',
        log.id,
        log as unknown as Record<string, unknown>,
        isOffline
      );
      setPendingSyncCount(res.queueLength);
    },
    [isOffline]
  );

  // --- CRUD DE CARDÁPIO (GERENTE) ---
  const addMenuItem = useCallback(
    async (itemData: Omit<MenuItem, 'id' | 'marginPercent' | 'aiPriorityScore' | 'displayOrder'>) => {
      const { marginPercent, aiPriorityScore, aiBadge } = calculateMenuPriorityScore({
        price: itemData.price,
        cost: itemData.cost,
        conversionRate: itemData.conversionRate || 0.22,
        stockAvailable: itemData.stockAvailable,
      });

      const newItem: MenuItem = {
        ...itemData,
        id: `item-${Date.now()}`,
        marginPercent,
        aiPriorityScore,
        aiBadge: itemData.aiBadge || aiBadge,
        displayOrder: menuItems.length + 1,
      };

      setMenuItems((prev) => [...prev, newItem]);
      const res = await persistEntityWithOfflineFallback(
        'menuItems',
        newItem.id,
        newItem as unknown as Record<string, unknown>,
        isOffline
      );
      setPendingSyncCount(res.queueLength);
    },
    [menuItems.length, isOffline]
  );

  const updateMenuItem = useCallback(
    async (id: string, updates: Partial<MenuItem>) => {
      let updatedDoc: MenuItem | null = null;
      setMenuItems((prev) =>
        prev.map((item) => {
          if (item.id !== id) return item;
          const nextPrice = updates.price ?? item.price;
          const nextCost = updates.cost ?? item.cost;
          const nextStock = updates.stockAvailable ?? item.stockAvailable;
          const { marginPercent, aiPriorityScore } = calculateMenuPriorityScore({
            price: nextPrice,
            cost: nextCost,
            conversionRate: item.conversionRate,
            stockAvailable: nextStock,
          });
          updatedDoc = {
            ...item,
            ...updates,
            marginPercent,
            aiPriorityScore,
          };
          return updatedDoc;
        })
      );

      if (updatedDoc) {
        const res = await persistEntityWithOfflineFallback(
          'menuItems',
          id,
          updatedDoc as unknown as Record<string, unknown>,
          isOffline
        );
        setPendingSyncCount(res.queueLength);
      }
    },
    [isOffline]
  );

  const deleteMenuItem = useCallback(
    async (id: string) => {
      setMenuItems((prev) => prev.filter((i) => i.id !== id));
    },
    []
  );

  const moveMenuItemOrder = useCallback(
    async (id: string, direction: 'up' | 'down') => {
      setMenuItems((prev) => {
        const idx = prev.findIndex((i) => i.id === id);
        if (idx < 0) return prev;
        const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
        if (targetIdx < 0 || targetIdx >= prev.length) return prev;
        const copy = [...prev];
        const temp = copy[idx];
        copy[idx] = copy[targetIdx];
        copy[targetIdx] = temp;
        return copy.map((item, i) => ({ ...item, displayOrder: i + 1 }));
      });
    },
    []
  );

  // --- CRUD DE COMBOS PROMOCIONAIS (GERENTE) ---
  const addCombo = useCallback(
    async (comboData: Omit<ComboOffer, 'id' | 'savingsAmount'>) => {
      const savingsAmount = Number(
        Math.max(0, comboData.originalPrice - comboData.comboPrice).toFixed(2)
      );
      const newCombo: ComboOffer = {
        ...comboData,
        id: `combo-${Date.now()}`,
        savingsAmount,
      };
      setCombos((prev) => [newCombo, ...prev]);
      const res = await persistEntityWithOfflineFallback(
        'combos',
        newCombo.id,
        newCombo as unknown as Record<string, unknown>,
        isOffline
      );
      setPendingSyncCount(res.queueLength);
    },
    [isOffline]
  );

  const updateCombo = useCallback(
    async (id: string, updates: Partial<ComboOffer>) => {
      let updatedCombo: ComboOffer | null = null;
      setCombos((prev) =>
        prev.map((c) => {
          if (c.id !== id) return c;
          const orig = updates.originalPrice ?? c.originalPrice;
          const price = updates.comboPrice ?? c.comboPrice;
          updatedCombo = {
            ...c,
            ...updates,
            savingsAmount: Number(Math.max(0, orig - price).toFixed(2)),
          };
          return updatedCombo;
        })
      );

      if (updatedCombo) {
        const res = await persistEntityWithOfflineFallback(
          'combos',
          id,
          updatedCombo as unknown as Record<string, unknown>,
          isOffline
        );
        setPendingSyncCount(res.queueLength);
      }
    },
    [isOffline]
  );

  const deleteCombo = useCallback(async (id: string) => {
    setCombos((prev) => prev.filter((c) => c.id !== id));
  }, []);

  // --- CADASTRO DE NOVO CLIENTE NO CARDÁPIO DIGITAL ---
  const registerCustomer = useCallback(
    async (data: { name: string; phone: string; neighborhood: string }): Promise<Customer> => {
      const newCustomer: Customer = {
        id: `cust-${Date.now()}`,
        name: data.name.trim(),
        phone: data.phone.trim(),
        neighborhood: data.neighborhood.trim() || 'Centro',
        totalOrders: 0,
        lifetimeValue: 0,
        loyaltyPoints: 50,
        cashbackBalance: 15.0,
        usualOrderDescription: '1x Pizza Calabresa + 1x Refrigerante',
        usualOrderItemIds: ['pizza-calabresa'],
        daysSinceLastOrder: 0,
        avgOrderFrequencyDays: 7,
        churnRiskScore: 5,
        npsScore: 10,
      };

      setCustomers((prev) => [newCustomer, ...prev]);
      const res = await persistEntityWithOfflineFallback(
        'customers',
        newCustomer.id,
        newCustomer as unknown as Record<string, unknown>,
        isOffline
      );
      setPendingSyncCount(res.queueLength);
      return newCustomer;
    },
    [isOffline]
  );

  // --- PEDIDOS E OPERAÇÃO ---
  const createOrder = useCallback(
    async (newOrderData: Omit<Order, 'id' | 'orderNumber' | 'createdAt' | 'syncStatus'>): Promise<Order> => {
      // Determina o próximo número sequencial real do pedido
      let lastPersistedNum = 0;
      try {
        const stored = typeof window !== 'undefined' ? localStorage.getItem('borapedir_last_order_num') : null;
        if (stored) lastPersistedNum = parseInt(stored, 10) || 0;
      } catch {
        // Ignora
      }

      const validOrderNumbers = orders
        .map((o) => Number(o.orderNumber))
        .filter((n) => !isNaN(n) && n > 0);

      const highestExisting = validOrderNumbers.length > 0 ? Math.max(...validOrderNumbers) : 0;
      const baseNumber = Math.max(highestExisting, lastPersistedNum);
      const nextNum = baseNumber > 0 ? baseNumber + 1 : 1001;

      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem('borapedir_last_order_num', String(nextNum));
        }
      } catch {
        // Ignora
      }

      const order: Order = {
        ...newOrderData,
        id: `ord-${nextNum}`,
        orderNumber: nextNum,
        createdAt: new Date().toISOString(),
        syncStatus: isOffline ? 'pending_sync' : 'synced',
      };

      setOrders((prev) => [order, ...prev]);

      setMenuItems((prevMenu) =>
        prevMenu.map((m) => {
          const sold = order.items.find((i) => i.menuItemId === m.id);
          if (sold) {
            return { ...m, stockAvailable: Math.max(0, m.stockAvailable - sold.quantity) };
          }
          return m;
        })
      );

      setServices((prevSrv) =>
        prevSrv.map((s) => (s.type === order.channel ? { ...s, activeOrdersCount: s.activeOrdersCount + 1 } : s))
      );

      const res = await persistEntityWithOfflineFallback(
        'orders',
        order.id,
        order as unknown as Record<string, unknown>,
        isOffline
      );
      setPendingSyncCount(res.queueLength);

      return order;
    },
    [orders, isOffline]
  );

  const advanceOrderStatus = useCallback(
    async (
      orderId: string,
      explicitNextStatus?: OrderStatus,
      extraData?: { driverName?: string; driverPhone?: string }
    ) => {
      let updatedOrder: Order | null = null;
      setOrders((prev) =>
        prev.map((o) => {
          if (o.id !== orderId) return o;
          const nextMap: Record<OrderStatus, OrderStatus> = {
            new: 'preparing',
            preparing: 'ready',
            ready: o.channel === 'takeout' ? 'delivered' : 'out_for_delivery',
            out_for_delivery: 'delivered',
            delivered: 'delivered',
            cancelled: 'cancelled',
          };
          const status = explicitNextStatus || nextMap[o.status];
          const nowIso = new Date().toISOString();
          updatedOrder = {
            ...o,
            status,
            prepStartedAt: status === 'preparing' ? (o.prepStartedAt || nowIso) : o.prepStartedAt,
            readyAt: status === 'ready' ? (o.readyAt || nowIso) : o.readyAt,
            dispatchedAt: status === 'out_for_delivery' ? (o.dispatchedAt || nowIso) : o.dispatchedAt,
            deliveredAt: status === 'delivered' ? (o.deliveredAt || nowIso) : o.deliveredAt,
            driverName: extraData?.driverName !== undefined ? extraData.driverName : o.driverName,
            driverPhone: extraData?.driverPhone !== undefined ? extraData.driverPhone : o.driverPhone,
            syncStatus: isOffline ? 'pending_sync' : 'synced',
          };
          return updatedOrder;
        })
      );

      if (updatedOrder) {
        const res = await persistEntityWithOfflineFallback(
          'orders',
          orderId,
          updatedOrder as unknown as Record<string, unknown>,
          isOffline
        );
        setPendingSyncCount(res.queueLength);
      }
    },
    [isOffline]
  );

  const clearFakeOrders = useCallback(async (): Promise<number> => {
    const fakeList = orders.filter((o) => isFakeOrder(o));
    const count = fakeList.length;

    const fakeIdsToDelete = Array.from(
      new Set([
        ...fakeList.map((o) => o.id),
        'ord-4091',
        'ord-4092',
        'ord-4093',
        'ord-4094',
      ])
    );

    await Promise.all(
      fakeIdsToDelete.map(async (id) => {
        try {
          await deleteDoc(doc(db, 'orders', id));
        } catch {
          // ignore
        }
      })
    );

    purgeFakeOrdersFromOfflineQueue(isFakeOrder as (data: unknown) => boolean);
    setOrders((prev) => prev.filter((o) => !isFakeOrder(o)));

    return count;
  }, [orders]);

  const deleteOrder = useCallback(async (orderId: string) => {
    setOrders((prev) => prev.filter((o) => o.id !== orderId));
    try {
      await deleteDoc(doc(db, 'orders', orderId));
    } catch (err) {
      console.warn('Erro ao deletar pedido:', orderId, err);
    }
  }, []);

  const clearAllOrders = useCallback(async () => {
    const ids = orders.map((o) => o.id);
    setOrders([]);
    await Promise.all(
      ids.map(async (id) => {
        try {
          await deleteDoc(doc(db, 'orders', id));
        } catch {
          // ignore
        }
      })
    );
  }, [orders]);

  const triggerAutonomousMenuAgent = useCallback(async () => {
    const { optimizedItems, agentLog } = runAutonomousMenuOptimization(menuItems);
    setMenuItems(optimizedItems);
    await recordAgentDecision(agentLog);
  }, [menuItems, recordAgentDecision]);

  const triggerPredictiveStockAgent = useCallback(async () => {
    const { updatedInventory, agentLog } = runAutonomousStockPrediction(inventory);
    setInventory(updatedInventory);
    await recordAgentDecision(agentLog);
  }, [inventory, recordAgentDecision]);

  const triggerTaxReformPricingAgent = useCallback(async () => {
    const { updatedMenuItems, agentLog } = runDynamicTaxPricing2026(menuItems);
    setMenuItems(updatedMenuItems);
    await recordAgentDecision(agentLog);
  }, [menuItems, recordAgentDecision]);

  const triggerChurnRecoveryCampaign = useCallback(
    async (customerId: string) => {
      const target = customers.find((c) => c.id === customerId);
      if (!target) return;

      const offerText = `Cashback Instantâneo R$ ${(target.cashbackBalance + 15).toFixed(2)} + Sobremesa Basca Cortesia no pedido de hoje`;
      setCustomers((prev) =>
        prev.map((c) =>
          c.id === customerId
            ? {
                ...c,
                lastRecoveryOffer: offerText,
                lastRecoverySentAt: 'Agora mesmo (Agente WhatsApp Ativo)',
                churnRiskScore: Math.max(18, c.churnRiskScore - 45),
              }
            : c
        )
      );

      const log: AgentLog = {
        id: `log-churn-${Date.now()}`,
        agentName: 'Agente Anti-Churn & Fidelidade',
        actionType: 'churn_recovery',
        summary: `Disparou oferta ativa de retenção via WhatsApp para ${target.name} (${target.phone}): "${offerText}".`,
        reasoning: `Cliente estava há ${target.daysSinceLastOrder} dias sem pedir (frequência normal: ${target.avgOrderFrequencyDays} dias).`,
        impactMetric: `Risco de Churn reduzido de ${target.churnRiskScore}% → ${Math.max(18, target.churnRiskScore - 45)}%`,
        confidence: 96,
        executedAt: 'Agora mesmo',
      };
      await recordAgentDecision(log);
    },
    [customers, recordAgentDecision]
  );

  const importSefazInvoiceXml = useCallback(
    async (invoiceNumber: string, supplierName: string) => {
      setInventory((prev) =>
        prev.map((inv) => ({
          ...inv,
          currentStock: Number((inv.currentStock + inv.aiSuggestedOrderQty * 0.5).toFixed(1)),
          daysUntilDepletion: Number(
            ((inv.currentStock + inv.aiSuggestedOrderQty * 0.5) / inv.predictedDailyUsage).toFixed(1)
          ),
          lastInvoiceNumber: invoiceNumber,
          autoPurchaseTriggered: false,
        }))
      );

      setMenuItems((prev) =>
        prev.map((m) => (m.stockAvailable < 15 ? { ...m, stockAvailable: m.stockAvailable + 25 } : m))
      );

      const log: AgentLog = {
        id: `log-sefaz-${Date.now()}`,
        agentName: 'Agente Preditivo de Estoque',
        actionType: 'stock_purchase',
        summary: `Importou NF-e ${invoiceNumber} (${supplierName}) via Manifesto Sefaz Certificado A1.`,
        reasoning: 'Leitura automatizada de XML NF-e com atualização de Ficha Técnica.',
        impactMetric: '+R$ 1.180,00 em créditos IBS/CBS escriturados',
        confidence: 100,
        executedAt: 'Agora mesmo',
      };
      await recordAgentDecision(log);
    },
    [recordAgentDecision]
  );

  const updateRecipeIngredientQty = useCallback(
    async (recipeId: string, inventoryItemId: string, newQty: number) => {
      setRecipes((prev) =>
        prev.map((rec) => {
          if (rec.id !== recipeId) return rec;
          const updatedIngredients = rec.ingredients.map((ing) => {
            if (ing.inventoryItemId !== inventoryItemId) return ing;
            const lineCost = Number((newQty * ing.unitCost * ing.correctionFactor).toFixed(2));
            return { ...ing, quantity: newQty, lineCost };
          });
          const totalIngredientCost = Number(
            updatedIngredients.reduce((s, i) => s + i.lineCost, 0).toFixed(2)
          );
          const linkedMenu = menuItems.find((m) => m.id === rec.menuItemId);
          const sellingPrice = linkedMenu ? linkedMenu.price : 60;
          const cmvPercent = Number(((totalIngredientCost / sellingPrice) * 100).toFixed(1));

          if (linkedMenu) {
            setMenuItems((prevM) =>
              prevM.map((m) =>
                m.id === linkedMenu.id
                  ? {
                      ...m,
                      cost: totalIngredientCost,
                      marginPercent: Number((((m.price - totalIngredientCost) / m.price) * 100).toFixed(1)),
                    }
                  : m
              )
            );
          }

          return {
            ...rec,
            ingredients: updatedIngredients,
            totalIngredientCost,
            cmvPercent,
          };
        })
      );
    },
    [menuItems]
  );

  const updateTableStatus = useCallback(
    (tableId: string, status: TableSession['status'], addAmount = 0) => {
      setTables((prev) =>
        prev.map((t) => {
          if (t.id !== tableId) return t;
          return {
            ...t,
            status,
            currentTotal: status === 'free' ? 0 : Number((t.currentTotal + addAmount).toFixed(2)),
            guestsCount: status === 'free' ? 0 : t.guestsCount || 2,
            openedAt:
              status === 'free'
                ? undefined
                : t.openedAt || new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          };
        })
      );
    },
    []
  );

  const addFinancialRecord = useCallback(
    async (record: Omit<FinancialRecord, 'id' | 'createdAt'>) => {
      const fullRecord: FinancialRecord = {
        ...record,
        id: `fin-${Date.now()}`,
        createdAt: new Date().toISOString(),
      };
      setFinancialRecords((prev) => [fullRecord, ...prev]);
      const res = await persistEntityWithOfflineFallback(
        'financialRecords',
        fullRecord.id,
        fullRecord as unknown as Record<string, unknown>,
        isOffline
      );
      setPendingSyncCount(res.queueLength);
    },
    [isOffline]
  );

  const dismissAgentToast = useCallback(() => setLastAgentToast(null), []);

  return (
    <StoreContext.Provider
      value={{
        user,
        userRole,
        setUserRole,
        layoutMode,
        setLayoutMode,
        isLayoutPickerOpen,
        setIsLayoutPickerOpen,
        appViewMode,
        setAppViewMode,
        isManagerUnlocked,
        unlockManagerDashboard,
        lockManagerDashboard,
        loginWithGoogle,
        logout,
        isOffline,
        toggleOfflineSimulation,
        pendingSyncCount,
        syncNow,
        restaurant,
        services,
        menuItems,
        combos,
        orders,
        customers,
        inventory,
        recipes,
        financialRecords,
        agentLogs,
        tables,
        createOrder,
        advanceOrderStatus,
        deleteOrder,
        clearFakeOrders,
        clearAllOrders,
        registerCustomer,
        addMenuItem,
        updateMenuItem,
        deleteMenuItem,
        moveMenuItemOrder,
        addCombo,
        updateCombo,
        deleteCombo,
        triggerAutonomousMenuAgent,
        triggerPredictiveStockAgent,
        triggerTaxReformPricingAgent,
        triggerChurnRecoveryCampaign,
        importSefazInvoiceXml,
        updateRecipeIngredientQty,
        updateTableStatus,
        addFinancialRecord,
        lastAgentToast,
        dismissAgentToast,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export function useStore(): StoreContextType {
  const ctx = useContext(StoreContext);
  if (!ctx) {
    throw new Error('useStore deve ser usado dentro de um StoreProvider');
  }
  return ctx;
}

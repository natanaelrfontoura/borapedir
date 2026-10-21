# PROJECT_STANDARDS.md — Constituição Arquitetural (NexoRestô AI)

## 1. Visão Geral e Missão Arquitetural
O **NexoRestô AI** é uma plataforma full-stack de gestão para o setor de food service projetada para superar soluções passivas (como Anota AI) por meio de **IA Agêntica Decisória**, **experiência unificada multicanal** (WhatsApp, Cardápio QR Code, App do Garçom, KDS e Agente de Voz) e **operação Offline-First resiliente**.

---

## 2. Diretivas do Sistema (System Instructions)
Todas as alterações de código e agentes de IA devem obedecer rigorosamente às seguintes diretrizes:
1. **Código Limpo e Tipado**: TypeScript estrito (`strict`), interfaces explícitas em `/src/models`, sem uso de `any` não tratado.
2. **Idioma da Interface**: Todo o texto voltado ao usuário final, mensagens de erro, relatórios fiscais e interações de voz/chat devem estar em **Português Brasileiro (pt-BR)**.
3. **Convenções de Código**: Nomenclatura de variáveis, funções, classes, rotas e coleções de banco de dados em **Inglês** (`camelCase` para variáveis/funções, `PascalCase` para componentes/tipos).
4. **Segurança e RBAC**: Autenticação Firebase Auth integrada com controle de acesso baseado em papéis (`admin`, `manager`, `waiter`, `kitchen`, `cashier`) validado tanto no cliente quanto nas Security Rules do Firestore e no middleware do servidor Node.js.
5. **Resiliência Offline-First**: Restaurantes sofrem quedas de conexão. O sistema utiliza cache local persistente (`IndexedDB` do Firestore + fila de sincronização `OfflineQueue` em `localStorage`) com retry exponencial e reconciliação automática ao reconectar.

---

## 3. Padrão Arquitetural (Três Camadas + API-First + BaaS)

### 3.1 Estrutura de Diretórios Obrigatória
```
/src
  /components        # Componentes React reutilizáveis (Layout, OfflineBanner, AgentDecisionToast, etc.)
  /pages             # Módulos principais da aplicação (Omnichannel, Agents, Operations, Financial, Analytics)
  /services          # Sincronização Firebase, cliente API, fila offline-first e integrações PDV
  /agents            # Motores de IA Agêntica Decisória (Cardápio, Ofertas, Estoque, Churn, Fiscal, Voz/WhatsApp)
  /models            # Interfaces TypeScript e Schemas relacionais unificados
  /utils             # Formatadores de moeda (BRL), cálculos de CMV, impostos (IBS/CBS 2026) e helpers
/server              # Runtime Backend Node.js (Express + Vite Middleware)
  /api               # Endpoints REST (/api/agents/*, /api/orders/*, /api/sefaz/*, /api/pos-webhook)
  /middleware        # Autenticação RBAC, telemetria, rate-limit e tratamento centralizado de erros
  /jobs              # Tarefas agendadas e gatilhos autônomos (reordenação de cardápio, previsão de estoque)
PROJECT_STANDARDS.md # Esta constituição arquitetural
```

### 3.2 Modelo de Dados Relacional Unificado
As seguintes entidades centrais mantêm sincronização em tempo real entre todos os pontos de contato:
- `Restaurant`: Dados cadastrais, CNPJ, regime tributário, certificado digital Sefaz A1, configurações de pixels e automação agêntica.
- `Service`: Canais de atendimento ativos (`delivery`, `dine_in`, `takeout`, `whatsapp`, `voice`) com taxas, SLA médio e status operacional.
- `Menu` (`MenuItem`): Itens do cardápio com preço dinâmico, custo unitário (via `Recipe`), margem de contribuição (%), estoque atual, taxa de conversão, `aiPriorityScore` e classificação fiscal IBS/CBS 2026.
- `Order`: Pedidos multicanal com canal de origem, mesa/pulseira, itens, combinação ótima de descontos (`appliedPromotion`), status KDS (`new`, `preparing`, `ready`, `delivered`), pagamento e status de sincronização offline (`synced` | `pending_sync`).
- `Customer`: Perfil unificado, histórico omnicanal, prato favorito ("mesmo de sempre"), saldo de cashback/fidelidade, `churnRiskScore` (0-100) e ofertas de recuperação disparadas.
- `Inventory` (`InventoryItem`): Insumos com estoque atual, ponto de pedido, consumo diário previsto pela IA, fornecedor e sugestão automática de compra.
- `Recipe`: Ficha técnica vinculando cada `MenuItem` aos insumos (`InventoryItem`) com quantidades exatas, fator de correção, custo total de insumos e CMV teórico (%).
- `FinancialRecord`: Lançamentos de DRE, fluxo de caixa (abertura/fechamento), contas a pagar/receber e notas fiscais NFC-e/NF-e com alíquotas da Reforma Tributária 2026 (IBS, CBS, IS).

---

## 4. Diferenciais de IA Agêntica Decisória
1. **Agente Autônomo de Otimização de Cardápio**: Calcula continuamente `aiPriorityScore = (marginPercent * 0.45) + (conversionRate * 100 * 0.35) + (stockHealth * 0.20)` e reordena o cardápio digital automaticamente, promovendo pratos de alta margem e pausando itens sem insumo.
2. **Assistente Inteligente de Ofertas**: Avalia todas as permutações de cupons, combos e pontos de fidelidade para o carrinho ativo, aplica a opção que maximiza a conversão preservando a margem mínima e exibe `"Você economizou R$ X"`.
3. **Agente Preditivo de Estoque + Google Maps Grounding**: Combina histórico de saída, previsão climática/eventos locais e lead time do fornecedor para gerar ordens de compra automáticas antes da ruptura.
4. **Fidelidade Dinâmica Anti-Churn**: Monitora dias desde o último pedido vs. frequência média do cliente e dispara campanhas personalizadas via WhatsApp quando o risco de churn ultrapassa 70%.
5. **Motor Tributário IA (Reforma 2026)**: Classifica automaticamente itens do cardápio nos regimes de redução de 60% para alimentação fora do lar (Bares e Restaurantes) ou alíquota padrão (bebidas alcoólicas/industrializados), ajustando o preço sugerido para proteger a margem líquida.

---

## 5. Estrutura de Iteração e Validação
Toda evolução no código segue o protocolo:
- `[CONTEXTO]` → `[OBJETIVO]` → `[RESTRIÇÕES]` → `[FORMATO]` → `[VALIDAÇÃO]`
- Testes automatizados integrados cobrindo cálculo de ofertas, ficha técnica (CMV), motor tributário 2026, fila offline-first e fluxo de pedido KDS.

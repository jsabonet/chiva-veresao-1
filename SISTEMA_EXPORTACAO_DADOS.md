# Sistema de Exportação de Dados - Documentação Completa

## 📋 Visão Geral

O sistema de exportação permite aos administradores exportar dados do e-commerce em múltiplos formatos (Excel, PDF, CSV) para fins de contabilidade, análise e gestão administrativa.

## 🎯 Componentes Implementados

### Backend

#### 1. **Export Service** (`backend/cart/export_service.py`)
Serviço centralizado para geração de arquivos em diferentes formatos.

**Métodos Principais:**
- `export_to_excel()` - Gera arquivos Excel (.xlsx) com formatação profissional
- `export_to_csv()` - Gera arquivos CSV com suporte a UTF-8 e delimitador `;`
- `export_to_pdf()` - Gera arquivos PDF com tabelas formatadas
- `export_data()` - Método unificado que chama o formato apropriado

**Características:**
- ✅ Formatação profissional (cores, bordas, alinhamento)
- ✅ Auto-ajuste de largura de colunas (Excel)
- ✅ Suporte a UTF-8 (CSV)
- ✅ Orientação landscape/portrait (PDF)
- ✅ Títulos e data de geração

#### 2. **Export Endpoints** (`backend/cart/order_views.py`)

##### **Endpoint: Exportar Pedidos**
```
GET /api/cart/admin/export/orders/
```

**Parâmetros (Query String):**
- `format` - Formato do arquivo: `excel`, `csv`, `pdf` (padrão: `excel`)
- `status` - Filtrar por status: `pending`, `confirmed`, `processing`, `shipped`, `delivered`, `cancelled`, `failed`
- `search` - Buscar por número de pedido, email do cliente, ou endereço
- `date_from` - Data inicial (formato: YYYY-MM-DD)
- `date_to` - Data final (formato: YYYY-MM-DD)

**Exemplo:**
```
GET /api/cart/admin/export/orders/?format=excel&status=confirmed&date_from=2024-01-01
```

**Colunas Exportadas:**
- Nº Pedido
- Status
- Cliente (email)
- Valor Total (MT)
- Método Pagamento
- Data Criação
- Última Atualização
- Endereço Entrega
- Rastreamento

---

##### **Endpoint: Exportar Clientes**
```
GET /api/cart/admin/export/customers/
```

**Parâmetros:**
- `format` - Formato do arquivo: `excel`, `csv`, `pdf` (padrão: `excel`)

**Colunas Exportadas:**
- Email
- UID
- Data Cadastro
- Último Acesso
- Nº Pedidos
- Total Gasto (MT)
- Ativo (Sim/Não)

---

##### **Endpoint: Exportar Estatísticas do Dashboard**
```
GET /api/cart/admin/export/dashboard/
```

**Parâmetros:**
- `format` - Formato do arquivo: `excel`, `pdf` (padrão: `excel`)
- `days` - Período em dias (padrão: `30`)

**Dados Exportados:**
- Resumo geral (total de pedidos, receita total, ticket médio)
- Pedidos por status (quantidade e valor total)

---

### Frontend

#### 1. **Hook useExport** (`frontend/src/hooks/useExport.ts`)

Hook React para exportação de dados com gestão de estado.

**Uso:**
```tsx
import { useExport, generateFilename } from '@/hooks/useExport';

const { exportData, isExporting, error } = useExport();

const handleExport = async (format: 'excel' | 'csv' | 'pdf') => {
  await exportData({
    endpoint: '/api/cart/admin/export/orders',
    format,
    filename: generateFilename('pedidos'),
    filters: { status: 'confirmed' }
  });
};
```

**Retorno:**
- `exportData(options)` - Função para iniciar exportação
- `isExporting` - Boolean indicando se está exportando
- `error` - String com mensagem de erro (ou null)

**Funções Auxiliares:**
- `formatDateFilter(date)` - Formata data para filtro (YYYY-MM-DD)
- `generateFilename(base)` - Gera nome de arquivo com timestamp

---

#### 2. **Integração em AdminDashboard.tsx**

**Localização:** Botão "Exportar" no cabeçalho do dashboard

**Formatos Suportados:**
- Excel (.xlsx)
- PDF
- CSV

**Exemplo de Código:**
```tsx
import { useExport, generateFilename } from '@/hooks/useExport';

const { exportData, isExporting } = useExport();

const handleExport = async (format: 'excel' | 'csv' | 'pdf') => {
  await exportData({
    endpoint: '/api/cart/admin/export/dashboard',
    format,
    filename: generateFilename('dashboard_stats'),
    filters: { days: 30 }
  });
};

// No JSX:
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="outline" disabled={isExporting}>
      {isExporting ? 'Exportando...' : 'Exportar'}
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuItem onClick={() => handleExport('excel')}>
      Exportar Excel (.xlsx)
    </DropdownMenuItem>
    <DropdownMenuItem onClick={() => handleExport('pdf')}>
      Exportar PDF
    </DropdownMenuItem>
    <DropdownMenuItem onClick={() => handleExport('csv')}>
      Exportar CSV
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

---

#### 3. **Integração em OrdersManagement.tsx**

**Localização:** Botão "Exportar Relatório" no cabeçalho

**Filtros Aplicados:**
- Status do pedido
- Termo de busca
- Período (se configurado)

**Características:**
- ✅ Exporta apenas pedidos filtrados
- ✅ Mantém sincronização com visualização atual
- ✅ Suporta Excel, PDF e CSV

**Exemplo:**
```tsx
const handleExport = async (format: 'excel' | 'csv' | 'pdf') => {
  const filters: Record<string, any> = {};
  
  if (statusFilter && statusFilter !== 'all') {
    filters.status = statusFilter;
  }
  
  if (searchTerm) {
    filters.search = searchTerm;
  }
  
  await exportData({
    endpoint: '/api/cart/admin/export/orders',
    format,
    filename: generateFilename('pedidos'),
    filters
  });
};
```

---

#### 4. **Integração em CustomersManagement.tsx**

**Localização:** Botão "Exportar" no cabeçalho

**Formatos Suportados:**
- Excel (.xlsx)
- PDF
- CSV

**Características:**
- ✅ Exporta todos os clientes cadastrados
- ✅ Inclui estatísticas (nº pedidos, total gasto)
- ✅ Indica status ativo/inativo

---

## 📦 Dependências

### Backend (Python)
```txt
openpyxl==3.1.2       # Manipulação de arquivos Excel
reportlab==4.0.7      # Geração de PDFs
xlsxwriter==3.2.5     # Alternativa para Excel
```

**Instalação:**
```bash
cd backend
pip install -r requirements.txt
```

### Frontend (React)
Sem dependências adicionais - usa APIs nativas do browser para download.

---

## 🔐 Segurança

### Autenticação
Todos os endpoints requerem:
- ✅ Usuário autenticado (`IsAuthenticated`)
- ✅ Permissões de administrador (`IsAdmin`)

### Validação
- ✅ Token Firebase verificado em cada requisição
- ✅ Filtros validados no backend
- ✅ Formatação de dados sanitizada

---

## 🎨 Formatação dos Arquivos

### Excel (.xlsx)
- **Cabeçalhos:** Fundo azul (#1F4788), texto branco, negrito
- **Dados:** Bordas finas, alinhamento apropriado (números à direita)
- **Layout:** Auto-ajuste de largura, linhas alternadas
- **Extras:** Título e data de geração

### PDF
- **Orientação:** Landscape (A4 rotacionado) por padrão
- **Cabeçalhos:** Fundo azul, texto branco
- **Dados:** Linhas alternadas (branco/cinza claro)
- **Extras:** Título, data, contagem de registros

### CSV
- **Codificação:** UTF-8 com BOM (para Excel reconhecer)
- **Delimitador:** `;` (ponto e vírgula)
- **Compatibilidade:** Excel, Google Sheets, LibreOffice

---

## 📊 Exemplos de Uso

### 1. Exportar Pedidos Confirmados do Último Mês
```tsx
await exportData({
  endpoint: '/api/cart/admin/export/orders',
  format: 'excel',
  filename: 'pedidos_confirmados_2024_01',
  filters: {
    status: 'confirmed',
    date_from: '2024-01-01',
    date_to: '2024-01-31'
  }
});
```

### 2. Exportar Todos os Clientes em PDF
```tsx
await exportData({
  endpoint: '/api/cart/admin/export/customers',
  format: 'pdf',
  filename: 'clientes_completo',
  filters: {}
});
```

### 3. Exportar Estatísticas dos Últimos 7 Dias
```tsx
await exportData({
  endpoint: '/api/cart/admin/export/dashboard',
  format: 'excel',
  filename: generateFilename('dashboard_stats'),
  filters: { days: 7 }
});
```

---

## 🧪 Testes

### Manual (Browser)
1. Acessar área administrativa
2. Navegar para Dashboard, Pedidos ou Clientes
3. Clicar em "Exportar" e escolher formato
4. Verificar download automático
5. Abrir arquivo e validar conteúdo

### Backend (Python)
```bash
cd backend
python manage.py shell

from cart.export_service import ExportService
from cart.models import Order

# Testar exportação
orders = Order.objects.all()[:10]
data = [{'order_number': o.order_number, 'total': o.total_amount} for o in orders]
headers = {'order_number': 'Pedido', 'total': 'Total'}

# Gerar Excel
response = ExportService.export_to_excel(data, headers, 'teste', 'Teste')
print(f"Content-Type: {response['Content-Type']}")
```

---

## 🐛 Troubleshooting

### Problema: Download não inicia
**Solução:**
- Verificar se usuário está autenticado
- Verificar permissões de admin
- Verificar console do navegador para erros

### Problema: Arquivo corrompido
**Solução:**
- Verificar se backend retorna content-type correto
- Verificar se blob é criado corretamente
- Testar endpoint diretamente (Postman/Insomnia)

### Problema: Dados incompletos
**Solução:**
- Verificar filtros aplicados
- Verificar queries no backend (logging)
- Verificar permissões de acesso aos dados

### Problema: Caracteres especiais quebrados (CSV)
**Solução:**
- Abrir CSV no Excel: Dados → Obter Dados → De Arquivo de Texto/CSV
- Ou abrir direto no Google Sheets (reconhece UTF-8 automaticamente)

---

## 📁 Estrutura de Arquivos

```
backend/
├── cart/
│   ├── export_service.py       # ⭐ Serviço de exportação
│   ├── order_views.py          # ⭐ Endpoints de exportação
│   └── urls.py                 # ⭐ Rotas de exportação
└── requirements.txt            # ⭐ Dependências atualizadas

frontend/
└── src/
    ├── hooks/
    │   └── useExport.ts        # ⭐ Hook de exportação
    └── pages/
        ├── AdminDashboard.tsx  # ⭐ Integração dashboard
        ├── OrdersManagement.tsx # ⭐ Integração pedidos
        └── CustomersManagement.tsx # ⭐ Integração clientes
```

---

## 🚀 Deploy

### Backend
```bash
# Instalar dependências
pip install -r requirements.prod.txt

# Migrar banco (se necessário)
python manage.py migrate

# Reiniciar servidor
docker-compose up -d --build
```

### Frontend
```bash
# Build
npm run build

# Deploy (Cloudflare Pages)
# (Automático via GitHub)
```

---

## 📈 Roadmap Futuro

### Funcionalidades Planejadas
- [ ] Exportação agendada (cronjobs)
- [ ] Templates personalizados de relatórios
- [ ] Gráficos em PDFs
- [ ] Exportação de produtos e estoque
- [ ] Exportação incremental (apenas novos dados)
- [ ] Compressão ZIP para múltiplos arquivos

### Melhorias Técnicas
- [ ] Cache de relatórios frequentes
- [ ] Processamento assíncrono (Celery)
- [ ] Notificação por email quando arquivo estiver pronto
- [ ] Histórico de exportações

---

## 👨‍💻 Autor

Sistema desenvolvido para **Chiva Computer Store**
Data: Janeiro 2025

---

## 📝 Notas Importantes

1. **Limites de Dados:** Exportações muito grandes podem demorar. Considere implementar paginação ou processamento assíncrono para datasets > 10.000 registros.

2. **Permissões:** Sempre verificar se o usuário tem permissão para ver os dados sendo exportados.

3. **Performance:** Excel é mais pesado que CSV. Para grandes volumes, recomende CSV.

4. **Compatibilidade:** PDFs em landscape comportam mais colunas (recomendado para tabelas largas).

5. **Segurança:** Dados exportados contêm informações sensíveis. Certifique-se de que apenas admins autorizados tenham acesso.

---

## 🔗 Links Úteis

- [Documentação openpyxl](https://openpyxl.readthedocs.io/)
- [Documentação reportlab](https://www.reportlab.com/docs/reportlab-userguide.pdf)
- [CSV RFC 4180](https://tools.ietf.org/html/rfc4180)

---

**Fim da Documentação** ✅

# 🧪 Guia de Testes - Sistema de Exportação

## ✅ Status: Backend Corrigido e Pronto

### Erros Resolvidos:
1. ✅ **ImportError corrigido** - Removida importação desnecessária de `Customer`
2. ✅ **Dependências instaladas** - openpyxl==3.1.2 e reportlab==4.0.7
3. ✅ **Módulo testado** - ExportService importado com sucesso

---

## 🚀 Como Testar o Sistema

### Opção 1: Teste Manual via Browser (RECOMENDADO)

1. **Certifique-se que o backend está rodando:**
   ```bash
   cd D:\Projectos\versao_1_chiva\backend
   python manage.py runserver
   ```

2. **Acesse o frontend:**
   - URL: `http://localhost:5173` (ou porta do Vite)
   - Faça login como admin (jsabonete09@gmail.com)

3. **Teste Dashboard:**
   - Vá para `/admin/dashboard`
   - Clique no botão "Exportar"
   - Selecione formato (Excel, PDF ou CSV)
   - Arquivo deve baixar automaticamente

4. **Teste Pedidos:**
   - Vá para `/admin/pedidos` ou `/admin/orders`
   - Clique em "Exportar Relatório"
   - Selecione formato
   - Arquivo baixa com filtros aplicados

5. **Teste Clientes:**
   - Vá para `/admin/clientes` ou `/admin/customers`
   - Clique em "Exportar"
   - Selecione formato
   - Arquivo baixa com lista completa

---

### Opção 2: Teste Automatizado via Script

1. **Obter Token Firebase:**
   - Abra o console do browser (F12)
   - Digite: `localStorage.getItem('firebaseIdToken')`
   - Copie o token retornado

2. **Editar script de teste:**
   ```bash
   # Abrir: backend/test_export_system.py
   # Linha 11: TOKEN = "cole_seu_token_aqui"
   ```

3. **Executar script:**
   ```bash
   cd D:\Projectos\versao_1_chiva\backend
   python test_export_system.py
   ```

4. **Verificar resultados:**
   - Pasta `test_exports/` será criada
   - 8 arquivos devem ser gerados
   - Console mostrará resumo dos testes

---

### Opção 3: Teste via cURL (Avançado)

```bash
# Substituir SEU_TOKEN pelo token Firebase

# 1. Dashboard Excel
curl -H "Authorization: Bearer SEU_TOKEN" \
  "http://localhost:8000/api/cart/admin/export/dashboard?format=excel" \
  -o dashboard.xlsx

# 2. Pedidos PDF
curl -H "Authorization: Bearer SEU_TOKEN" \
  "http://localhost:8000/api/cart/admin/export/orders?format=pdf" \
  -o pedidos.pdf

# 3. Clientes CSV
curl -H "Authorization: Bearer SEU_TOKEN" \
  "http://localhost:8000/api/cart/admin/export/customers?format=csv" \
  -o clientes.csv
```

---

## 📊 Checklist de Verificação

### Backend:
- [x] Servidor Django rodando sem erros
- [x] Dependências instaladas (openpyxl, reportlab)
- [x] Módulo ExportService importável
- [x] Endpoints registrados em urls.py

### Frontend:
- [ ] Botão "Exportar" visível no Dashboard
- [ ] Dropdown com 3 opções (Excel, PDF, CSV)
- [ ] Botão "Exportar Relatório" em Pedidos
- [ ] Botão "Exportar" em Clientes
- [ ] Toast de sucesso aparece após exportação
- [ ] Arquivo baixa automaticamente

### Arquivos Gerados:
- [ ] Excel (.xlsx) abre corretamente
- [ ] PDF abre sem erros
- [ ] CSV abre no Excel com encoding correto
- [ ] Dados estão completos e formatados
- [ ] Colunas têm cabeçalhos corretos

---

## 🐛 Troubleshooting

### Erro: "Failed to fetch"
**Solução:** Verifique se o backend está rodando na porta 8000

### Erro: "403 Forbidden"
**Solução:** Confirme que está logado como admin

### Erro: "Cannot import ExportService"
**Solução:** 
```bash
cd backend
pip install openpyxl==3.1.2 reportlab==4.0.7
```

### Arquivo não baixa
**Solução:**
- Verifique console do browser (F12)
- Verifique logs do Django
- Teste endpoint direto no browser

### CSV com caracteres estranhos
**Solução:**
- Excel: Dados → Obter Dados → De Arquivo de Texto/CSV
- Ou abra no Google Sheets (reconhece UTF-8)

---

## 📈 Resultados Esperados

### Dashboard Export (Excel/PDF):
```
RESUMO GERAL
├── Total de Pedidos: X
├── Receita Total: Y MT
└── Ticket Médio: Z MT

PEDIDOS POR STATUS
├── Confirmado: X pedidos (Y MT)
├── Processando: X pedidos (Y MT)
└── ...
```

### Pedidos Export (Excel/CSV/PDF):
```
Colunas:
- Nº Pedido
- Status
- Cliente
- Valor Total (MT)
- Método Pagamento
- Data Criação
- Última Atualização
- Endereço Entrega
- Rastreamento
```

### Clientes Export (Excel/CSV/PDF):
```
Colunas:
- Email
- UID
- Data Cadastro
- Último Acesso
- Nº Pedidos
- Total Gasto (MT)
- Ativo
```

---

## 🎯 Teste Completo

Execute este checklist completo:

1. **Dashboard:**
   - [ ] Exportar Excel → Abrir arquivo → Verificar dados
   - [ ] Exportar PDF → Abrir arquivo → Verificar formatação
   - [ ] Exportar CSV → Abrir no Excel → Verificar encoding

2. **Pedidos:**
   - [ ] Filtrar por status "Confirmado"
   - [ ] Exportar Excel → Verificar apenas confirmados
   - [ ] Buscar por termo
   - [ ] Exportar PDF → Verificar filtro aplicado

3. **Clientes:**
   - [ ] Exportar Excel → Contar linhas
   - [ ] Verificar estatísticas (Nº Pedidos, Total Gasto)
   - [ ] Exportar CSV → Importar no Google Sheets

---

## ✅ Critérios de Sucesso

O sistema está funcionando corretamente se:

1. **Todos os 3 componentes** têm botões de exportação funcionais
2. **Todos os 3 formatos** (Excel, PDF, CSV) geram arquivos válidos
3. **Filtros** são respeitados (ex: status, busca em Pedidos)
4. **Dados** estão completos e formatados profissionalmente
5. **Performance** é aceitável (< 5 segundos para datasets pequenos)
6. **Notificações** (toast) aparecem após sucesso/erro

---

## 📞 Suporte

Se encontrar problemas:

1. Verifique logs do Django (terminal backend)
2. Verifique console do browser (F12)
3. Revise documentação completa: `SISTEMA_EXPORTACAO_DADOS.md`
4. Teste endpoints direto (Postman/Insomnia)

---

**Status Final:** ✅ SISTEMA PRONTO PARA TESTE
**Data:** 22/10/2025
**Versão:** 1.0

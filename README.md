# 🛒 Cotação Online

App PWA de cotação de preços entre supermercados em grupo, com scanner de código de barras, base de dados própria híbrida, marcação de ofertas de convênio/fidelidade e funcionamento offline.
**Stack:** React + Vite + Firebase + Vercel · **Região:** pt-BR

---

## 🚀 Setup

### 1. Instalar dependências
```bash
npm install
```

### 2. Criar projeto Firebase
- Acesse [console.firebase.google.com](https://console.firebase.google.com)
- Crie um projeto novo
- **IMPORTANTE:** Ao criar o Firestore, escolha a região **`southamerica-east1` (São Paulo)**
- Ative **Authentication** → método **Anônimo**
- Ative **Firestore Database**

### 3. Pegar credenciais
Crie o arquivo `.env` na raiz (nunca versione esse arquivo):

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

### 4. Configurar Regras do Firestore

As regras estão em **`firestore.rules`** na raiz.

**Como aplicar (console):**
1. Firebase Console → **Firestore Database** → aba **Regras**
2. Cole o conteúdo de `firestore.rules` e clique em **Publicar**

**Ou pela CLI:**
```bash
firebase deploy --only firestore:rules
```

**O que as regras fazem:**

| Coleção | Read | Create | Update | Delete |
|---|---|---|---|---|
| `salas` | ✅ Autenticado | ✅ Autenticado | ✅ Autenticado (validado) | ✅ Autenticado |
| `salas/{id}/precos` | ✅ Autenticado | ✅ Autenticado (campos validados) | ✅ Autenticado (campos validados) | ❌ |
| `produtos` | ✅ Autenticado | ✅ Autenticado (com validação) | ❌ Não permitido | ❌ Não permitido |

Os campos aceitos em `precos` incluem `preco`, `oferta`, `tipoOferta` e `obsOferta`.

> **Por que produtos não pode editar/apagar?** Para proteger a base própria. Uma vez cadastrado, o produto fica disponível para todos. Correções podem ser feitas pelo Firebase Console.

### 5. Rodar local
```bash
npm run dev
```

### 6. Deploy no Vercel
```bash
npm i -g vercel
vercel --prod
```

---

## 📷 Scanner — Fluxo Híbrido

1. **Base Própria** (Firestore) → produtos já cadastrados
2. **Open Food Facts** (API online) → base mundial
3. **Manual** → usuário digita

Quando encontra na Open Food Facts, pergunta se quer salvar na base própria.

### 🔁 Sem duplicação (novo)
Se o código de barras lido **já estiver na cotação atual**, o app não cadastra o item de novo: ele abre direto o lançamento de preço do produto existente. A mesma trava vale para o cadastro manual pelo código.

---

## 🏷️ Ofertas de convênio / fidelidade (novo)

No lançamento de preço é possível marcar que o valor é **preço de oferta** e informar:

- **Tipo:** `Convênio`, `Fidelidade`, `Clube/App` ou `Promoção`
- **Observação:** texto livre (ex.: "somente com cartão da loja")

Onde aparece:
- Selo **🏷️** na célula da **Tabela de Cotação**
- Selo no **menor preço** destacado
- Selo na **Lista de Compras otimizada**

Formato salvo no Firestore (`salas/{sala}/precos/{produto}`):

```json
{
  "Mercado A": { "preco": 12.9, "oferta": true, "tipoOferta": "Fidelidade", "obsOferta": "com cartão da loja" }
}
```

> Preços antigos gravados como número simples continuam funcionando (leitura retrocompatível).

---

## 📊 Aba "Cotação completa" (novo)

Na tela da sala há duas visões da tabela:

- **Todos os produtos** — visão completa da cotação
- **Cotação completa** — apenas os produtos com preço lançado em **todos os mercados pesquisados**, ideal para comparar mercado a mercado sem lacunas

---

## 📶 Queda de internet / retomar sala (novo)

- **Cache offline persistente** do Firestore (`persistentLocalCache` + multi-abas): a sala continua navegável sem conexão
- Indicador **OFFLINE** na interface quando a rede cai
- Lançamentos feitos offline são **sincronizados automaticamente** ao voltar a conexão
- A última sala acessada fica salva localmente; a tela inicial mostra o botão **"Retomar sala"** para voltar de onde parou

---

## 🎮 Como usar

1. **Criar:** escaneia/adiciona produtos → código `#X7K9P2`
2. **Compartilhar:** manda no WhatsApp
3. **Entrar:** código + nome + mercado
4. **Lançar preços** (marcando oferta quando for o caso)
5. **Resultado:** lista por mercado **e por categoria**, com selos de oferta

---

## 📁 Estrutura

```
src/
├── main.jsx
├── App.jsx                  # + botão "Retomar sala"
├── firebase.js              # base própria + cache offline persistente
├── index.css
├── utils/
│   ├── ptBR.js
│   ├── barcode.js
│   ├── precos.js            # leitura de preço/oferta + tipos de oferta
│   └── conexao.js           # status online/offline + última sala
└── components/
    ├── CriarSala.jsx        # Busca híbrida
    ├── EntrarSala.jsx
    ├── Sala.jsx             # anti-duplicação, abas, aviso offline
    ├── TabelaCotacao.jsx    # selos de oferta + aba cotação completa
    ├── ListaOtimizada.jsx   # agrupamento por categoria + selos
    ├── Participantes.jsx
    ├── BarcodeScanner.jsx
    ├── ProdutoModal.jsx     # lançamento de preço + oferta
    ├── CadastrarProduto.jsx
    ├── ManutencaoProdutos.jsx
    ├── EditarProdutoBase.jsx
    ├── MinhasSalas.jsx
    └── ErrorBoundary.jsx
```

---

## 🗒️ Pendências mapeadas

- **Produtos similares:** indicar equivalentes entre marcas/embalagens (agrupamento na base própria) — ainda não implementado.

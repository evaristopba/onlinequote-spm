# 🛒 Cotação Online

App PWA de cotação de preços entre supermercados em grupo, com scanner de código de barras e base de dados própria híbrida.
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
Crie o arquivo `.env` na raiz:

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

### 4. Configurar Regras do Firestore

As regras de segurança estão no arquivo **`firestore.rules`** na raiz do projeto.

**Como aplicar:**

1. Acesse [console.firebase.google.com](https://console.firebase.google.com)
2. Vá em **Firestore Database** → aba **Regras**
3. Copie o conteúdo do arquivo `firestore.rules`
4. Cole no editor de regras do Firebase
5. Clique em **Publicar**

**O que as regras fazem:**

| Coleção | Read | Create | Update | Delete |
|---|---|---|---|---|
| `salas` | ✅ Autenticado | ✅ Autenticado | ✅ Autenticado | ✅ Autenticado |
| `produtos` | ✅ Autenticado | ✅ Autenticado (com validação) | ❌ Não permitido | ❌ Não permitido |

> **Por que produtos não pode editar/apagar?** Para proteger a base própria. Uma vez cadastrado, o produto fica disponível para todos. Se precisar corrigir, faça direto no Firebase Console.

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

---

## 🎮 Como usar

1. **Criar:** escaneia/adiciona produtos → código `#X7K9P2`
2. **Compartilhar:** manda no WhatsApp
3. **Entrar:** código + nome + mercado
4. **Lançar preços**
5. **Resultado:** lista por mercado **e por categoria**

---

## 📁 Estrutura

```
src/
├── main.jsx
├── App.jsx
├── firebase.js           # + base própria de produtos
├── index.css
├── utils/
│   ├── ptBR.js
│   └── barcode.js
└── components/
    ├── CriarSala.jsx     # Busca híbrida
    ├── EntrarSala.jsx
    ├── Sala.jsx          # Busca híbrida
    ├── TabelaCotacao.jsx
    ├── ListaOtimizada.jsx # + agrupamento por categoria
    ├── Participantes.jsx
    ├── BarcodeScanner.jsx
    └── CadastrarProduto.jsx  # Modal para salvar na base
```

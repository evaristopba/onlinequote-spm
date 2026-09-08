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
| `salas` | ✅ Autenticado | ✅ Autenticado | ✅ Autenticado, mas só a **própria** entrada em `participantes` OU o array `produtos` — nunca o documento inteiro (impede sequestro de sala e falsificação de participante/mercado alheio) | ✅ Só quem criou a sala (ou qualquer participante, em salas antigas de antes do campo `criadorUid`), **ou um admin** |
| `salas/{id}/precos` | ✅ Autenticado | ✅ Autenticado (campos validados) | ✅ Autenticado (campos validados, só o dono daquele mercado) | ✅ Dono do mercado, ou quem pode excluir a sala inteira |
| `produtos` | ✅ Autenticado | ✅ Autenticado (com validação) | ✅ Autenticado — só `nome`, `marca`, `categoria`, `quantidade`, `unidade`, `ativo` e `grupoVariante` (nunca `codigoBarras` nem quem cadastrou) | ❌ Ninguém apaga de vez, **exceto um admin** (uso normal continua sendo "desativar") |
| `admins` | ✅ Só o próprio (`admins/<meu uid>`) | ❌ | ❌ | ❌ (gerenciado só pelo Firebase Console) |

Os campos aceitos em `precos` incluem `preco`, `oferta`, `tipoOferta` e `obsOferta`.

> **Por que `codigoBarras` não pode ser alterado?** Pra proteger a base própria: é a chave que liga o produto físico ao cadastro, então corrigi-lo por engano quebraria o histórico de cotações antigas. Correções desse campo específico exigem o Firebase Console. Todo o resto (nome, categoria, quantidade, variantes) pode ser corrigido direto pela tela de Manutenção.

### 5. Rodar local
```bash
npm run dev
```

### 6. Deploy no Vercel
```bash
npm i -g vercel
vercel --prod
```

### 7. Criar o admin (opcional, mas recomendado)

O painel administrativo (`/admin`) permite excluir **qualquer** sala do banco (não só a que você criou) e apagar produtos de vez da base própria — pra quando "desativar" não é suficiente ou o criador da sala perdeu a sessão anônima e ninguém mais consegue apagar. Não tem link visível em nenhuma tela — só é acessível digitando a URL.

1. Firebase Console → **Authentication** → ative o método **E-mail/Senha**
2. Ainda em Authentication → **Users** → **Add user** → crie um usuário só seu (esse é o admin)
3. Copie o **User UID** desse usuário
4. Firebase Console → **Firestore Database** → crie uma coleção chamada **`admins`** → crie um documento cujo **ID seja exatamente esse UID** (o conteúdo do documento pode ficar vazio)
5. Publique o `firestore.rules` deste projeto (ele já reconhece essa coleção)
6. Acesse `suaurl.vercel.app/admin` e entre com o e-mail/senha criados no passo 2

> Sem esse setup, a rota `/admin` mostra a tela de login mas ninguém consegue fazer nada nela — as regras do Firestore bloqueiam qualquer exclusão de sala alheia ou remoção definitiva de produto pra quem não tiver um documento em `admins/<uid>`.

### 8. App Check (opcional, recomendado antes de divulgar o app)

Login anônimo aberto significa que, tecnicamente, um script fora do navegador (não uma pessoa usando o app de verdade) consegue chamar as mesmas APIs do Firebase e criar milhares de sessões, salas ou produtos falsos. O [App Check](https://firebase.google.com/docs/app-check) resolve isso: só libera as chamadas ao Firestore/Auth se vierem do seu app de verdade, rodando num navegador de verdade.

**⚠️ Ordem importa — siga exatamente assim, nessa sequência:**

1. Firebase Console → **App Check** → registre um provedor **reCAPTCHA v3** para o seu app web → copie a **chave do site** (site key)
2. Coloque essa chave em `VITE_RECAPTCHA_SITE_KEY` no `.env` (e nas variáveis de ambiente do Vercel)
3. Faça o **deploy** com essa variável configurada
4. Volte no Firebase Console → App Check → confira, na aba de métricas, se as requisições do app estão chegando como **verificadas** (pode levar alguns minutos)
5. **Só depois de confirmar isso**, vá em Firestore Database → App Check → e ative o **modo de aplicação (enforcement)**

> Se você ativar o enforcement no passo 5 **antes** de confirmar o passo 4, o app para de funcionar pra todo mundo (inclusive você) até reverter. A chave do reCAPTCHA sozinha não faz nada — ela só tem efeito depois que o enforcement é ligado.

### 9. Proteção Anti-bot com CAPTCHA Gratuito (Cloudflare Turnstile) e Vercel

Para proteger a criação e entrada de salas contra bots, scripts maliciosos e ataques automatizados **sem precisar de cadastro de cartão de crédito**:
- O app utiliza **Cloudflare Turnstile**, que é 100% gratuito e não exige cartão de crédito.
- Conta com validação dupla: no navegador (widget visual) e no servidor (Vercel Serverless Function `/api/verify-turnstile.js`).
- Em desenvolvimento/teste, funciona imediatamente com uma chave de teste oficial e conta com fallback local inteligente caso esteja sem conexão externa.

#### Como funciona a segurança das chaves:
1. **`VITE_TURNSTILE_SITE_KEY` (Chave Pública)**: É a chave que renderiza o widget no navegador. Como qualquer CAPTCHA da web, ela é pública por design. O que impede alguém de roubá-la e usá-la em outro site é a **Lista de Domínios Permitidos** que você configura no painel da Cloudflare (apenas seu domínio pode disparar desafios válidos).
2. **`TURNSTILE_SECRET_KEY` (Chave Secreta)**: É a chave de validação no servidor. **Ela NUNCA deve ir para o Git nem para o código do navegador**. Fica apenas nas configurações da Vercel.

#### Como configurar na Vercel:
1. Crie uma conta gratuita em [dash.cloudflare.com](https://dash.cloudflare.com) (sem cartão).
2. Vá em **Turnstile** → **Add Site**.
3. Adicione seu domínio da Vercel (ex: `seu-app.vercel.app`).
4. A Cloudflare fornecerá duas chaves: **Site Key** e **Secret Key**.
5. No painel da **Vercel**:
   - Vá em **Project Settings** → **Environment Variables**.
   - Adicione:
     - `VITE_TURNSTILE_SITE_KEY`: cole sua Site Key pública.
     - `TURNSTILE_SECRET_KEY`: cole sua Secret Key privada.
6. Faça o deploy (ou re-deploy). Nenhuma chave secreta fica exposta em arquivo ou no GitHub!

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

## 🔁 Comparar tamanhos/embalagens & Vínculo de Variantes

Pra combater a "falsa promoção" e decidir se realmente compensa levar embalagens maiores ou kits econômicos (ex.: sabão em pó 800g vs 1,6kg vs 2,4kg; creme dental 70g vs 180g; amaciante 500ml vs 1L):

### Como funciona o vínculo:
1. **🛠️ Manutenção de Produtos** (ou no próprio card/modal do produto) → localize o item → clique em **🔗 Variante**.
2. Busque pelo nome a outra embalagem/versão já cadastrada e clique em **Vincular**.
3. O identificador comum (`grupoVariante`) fica registrado no Firestore — **não precisa refazer em cada nova cotação**.
4. Se você vincular um item a outro que já pertence a uma família de variantes, o sistema **funde os grupos automaticamente** sem perder os vínculos anteriores.
5. Para remover um produto do grupo, basta clicar em **✂️ Desvincular**.

### Como ajuda na cotação:
Quando dois ou mais produtos de um mesmo grupo de variantes entram na **mesma sala de cotação** e recebem preços dos mercados:
1. **Normalização Automática de Unidade**: O app converte gramas para **Quilogramas (kg)** e mililitros para **Litros (L)**.
2. **Custo Real Relativo**: Calcula o valor exato por kg ou L para cada opção pesquisada:
   * *Exemplo*: Frasco 500ml por R$ 9,90 = **R$ 19,80 / L**
   * *Exemplo*: Refil 1 Litro por R$ 16,50 = **R$ 16,50 / L**
3. **Selo Troféu 🏆**: O produto com menor custo unitário real recebe o troféu verde de destaque.
4. **Cálculo de Economia**: A tela exibe um alerta automático indicando a economia percentual exata (ex.: *"💡 Levar Refil 1L sai até 17% mais em conta por Litro do que Frasco 500ml"*).

> **Por que é manual?** A decisão de equivalência é do usuário: o sistema não tenta adivinhar por semelhança de texto, evitando unir acidentalmente marcas ou fórmulas com qualidades diferentes.

---

## 🔗 Link pessoal de participante (novo)

Cada participante tem um link próprio (`.../sala/CODIGO?nome=...&mercado=...`) que reabre a sala **já reconectado como aquela pessoa**, em qualquer aparelho — mesmo sem sessão anterior naquele navegador. Resolve o cenário de perder o acesso no meio de uma cotação (trocar de celular, limpar dados do navegador, etc.): reabrindo o link, a pessoa recupera a própria coluna sem digitar nada de novo e sem perder nenhum preço já lançado (os preços ficam gravados por nome de mercado, não pela sessão de quem lançou).

Onde encontrar:
- Botão **🔗 Meu link** no topo da sala (visível pra qualquer participante já registrado)
- Ícone **🔗** ao lado de cada nome na lista de participantes — assim qualquer pessoa da sala pode reenviar o link de alguém que perdeu o próprio, sem depender de quem criou a sala

> Esse link não tem senha — quem tiver o link consegue lançar preço "como" aquela pessoa. Pra esse app (compartilhado entre gente de confiança, sem dado sensível em jogo) é um risco aceitável, mas vale não forwardar o link de terceiros sem necessidade.

**Limitações conhecidas, por design:**
- O link restaura a coluna de **preço/mercado**, mas **não** o botão "Encerrar sala" pra quem criou a sala — status de criador fica preso ao navegador/sessão original de propósito (senão, qualquer um que soubesse o nome público do criador poderia forjar um link e sequestrar a sala). Se o criador perder o acesso original, a exclusão dessa sala vira tarefa do admin (`/admin`).
- Reabrir o mesmo link em navegadores/aparelhos diferentes gera uma sessão anônima nova a cada vez, então a lista de participantes pode acumular entradas repetidas com nome+mercado iguais (cada sessão perdida deixa uma "sombra" pra trás). A lista já mescla isso visualmente (mostra só a mais recente + contador de sessões antigas), mas apagar as entradas de verdade do banco só o admin consegue fazer (`/admin` → Todas as salas → ▼ Participantes → 🗑️).

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
├── firebase.js              # base própria + variantes + cache offline persistente
├── index.css
├── migrarProdutos.js
├── utils/
│   ├── ptBR.js
│   ├── barcode.js
│   ├── precos.js            # leitura de preço/oferta + tipos de oferta
│   ├── conexao.js           # status online/offline + última sala
│   ├── linkParticipante.js  # link pessoal de participante (nome+mercado na URL)
│   └── dialog.js            # substitui alert()/confirm() nativos
└── components/
    ├── CriarSala.jsx        # Busca híbrida
    ├── EntrarSala.jsx
    ├── Sala.jsx             # anti-duplicação, abas, aviso offline, comparação de variantes
    ├── TabelaCotacao.jsx    # selos de oferta + aba cotação completa
    ├── ListaOtimizada.jsx   # agrupamento por categoria + selos
    ├── VariantesComparacao.jsx  # comparação de custo por kg/L entre tamanhos vinculados
    ├── Participantes.jsx
    ├── BarcodeScanner.jsx
    ├── ProdutoModal.jsx     # lançamento de preço + oferta
    ├── CadastrarProduto.jsx
    ├── ManutencaoProdutos.jsx
    ├── EditarProdutoBase.jsx
    ├── VincularVariante.jsx     # vincular/desvincular tamanhos do mesmo produto
    ├── MinhasSalas.jsx
    ├── MigracaoProdutos.jsx
    ├── Admin.jsx             # painel restrito (excluir qualquer sala, apagar produto de vez)
    ├── DialogHost.jsx        # modal de confirmação/aviso com a cara do app
    └── ErrorBoundary.jsx
```

---

## 🗒️ Pendências mapeadas

Nenhuma pendência mapeada no momento. (A antiga pendência de "produtos similares" foi implementada — veja **🔁 Comparar tamanhos/embalagens** acima.)

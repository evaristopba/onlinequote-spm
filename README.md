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

## 🔁 Comparar tamanhos/embalagens (novo)

Pra decidir se compensa levar 1 pacote grande em vez de 2 pequenos (ex.: creme dental 75g vs 180g), vincule os dois na base própria:

1. **🛠️ Manutenção de Produtos** → ache o produto → **🔗 Variante** → busque o outro tamanho pelo nome e vincule
2. O vínculo (`grupoVariante`) fica salvo na base — não precisa refazer em cada cotação
3. Quando os dois produtos vinculados estiverem na **mesma cotação** e já tiverem **pelo menos um preço lançado**, aparece o bloco **"🔁 Comparar tamanhos/embalagens"** na tela da sala, com o custo por kg/L de cada um lado a lado e o mais em conta destacado

Pra desvincular, use **✂️ Desvincular** na Manutenção. Vincular um produto que já tem outra variante a um terceiro funde os grupos automaticamente, sem perder nenhum vínculo já feito.

> É um vínculo **manual** por escolha — o app não tenta adivinhar por semelhança de nome, porque isso arriscaria juntar produtos diferentes por engano.

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

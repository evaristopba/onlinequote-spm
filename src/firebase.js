import { initializeApp } from 'firebase/app'
import { getAuth, signInAnonymously, setPersistence, browserLocalPersistence, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth'
import {
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager,
  doc, setDoc, getDoc, updateDoc, deleteDoc, onSnapshot,
  arrayUnion, collection, query, where, getDocs, addDoc, runTransaction
} from 'firebase/firestore'

const cfg = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const miss = Object.entries(cfg).filter(([, v]) => !v).map(([k]) => k)

let app, auth, db

if (miss.length > 0) {
  console.error('Firebase config incompleta. Variaveis ausentes:', miss.join(', '))
  console.error('Verifique se o arquivo .env existe na raiz do projeto e se o servidor foi reiniciado.')
  app = null
  auth = null
  db = null
} else {
  app = initializeApp(cfg)
  auth = getAuth(app)
  try {
    db = initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    })
  } catch (e) {
    console.warn('Cache offline indisponivel, seguindo sem persistencia:', e)
    db = initializeFirestore(app, {})
  }
}

export { auth, db }

export const loginAnonimo = () => {
  if (!auth) return Promise.reject(new Error('Firebase nao inicializado. Verifique o arquivo .env.'))
  // Se já existe uma sessão (anônima OU de admin logado com e-mail/senha),
  // não sobrescreve — signInAnonymously() trocaria até uma sessão de admin
  // por uma anônima nova sem avisar. Quem decide QUANDO chamar isso é o
  // App.jsx, via observarAuth().
  if (auth.currentUser) return Promise.resolve(auth.currentUser)
  return setPersistence(auth, browserLocalPersistence)
    .then(() => signInAnonymously(auth))
}

// Observa mudanças de sessão (login/logout, restauração ao abrir o app).
// Usado pelo App.jsx pra decidir se precisa logar anônimo ou se já existe
// uma sessão válida (inclusive uma sessão de admin persistida).
export const observarAuth = (cb) => {
  if (!auth) return () => {}
  return onAuthStateChanged(auth, cb)
}

// ===== Painel Admin (login real, e-mail/senha) =====
// O admin é reconhecido por um documento em admins/{uid} — cada usuário
// só pode ler o PRÓPRIO documento (pra souAdmin() conferir), nunca
// escrever nada ali (isso só é feito manualmente no Firebase Console).
export const loginAdmin = (email, senha) => {
  if (!auth) return Promise.reject(new Error('Firebase nao inicializado'))
  return signInWithEmailAndPassword(auth, email, senha)
}

export const logoutAdmin = async () => {
  if (!auth) return
  await signOut(auth)
  await loginAnonimo()
}

export const souAdmin = async () => {
  if (!db || !auth?.currentUser) return false
  try {
    const snap = await getDoc(doc(db, 'admins', auth.currentUser.uid))
    return snap.exists()
  } catch (e) {
    return false
  }
}

// Lista TODAS as salas do banco (não só as do usuário atual) — só
// funciona de verdade se as regras permitirem o delete/gerência pra
// quem chama; usada pelo painel admin.
export const listarTodasSalas = async () => {
  if (!db) throw new Error('Firebase nao inicializado')
  const snap = await getDocs(collection(db, 'salas'))
  return snap.docs.map((d) => ({ codigo: d.id, ...d.data() }))
}

// Apaga um produto DE VEZ da base própria (diferente de
// definirAtivoBasePropria, que só desativa). Só admins conseguem — a
// regra do Firestore bloqueia isso pra qualquer outro usuário. Não
// verifica se o produto está referenciado em cotações ativas; se
// estiver, essas cotações passam a mostrar um item "órfão" (sem
// cadastro na base) — use com cuidado.
export const apagarProdutoDeVez = async (id) => {
  if (!db) throw new Error('Firebase nao inicializado')
  await deleteDoc(doc(db, 'produtos', id))
}

// Remove UMA entrada específica de participante de uma sala (por uid) —
// usado pra limpar sessões fantasma (mesma pessoa reabrindo o link
// pessoal em navegadores/aparelhos diferentes, cada um vira um uid novo
// e uma entrada nova). Só admin consegue: a regra de update de `salas`
// só deixa cada participante mexer na PRÓPRIA entrada, então remover a
// entrada de outra pessoa exige o bypass de admin.
export const removerParticipanteAdmin = async (codigo, uidParticipante) => {
  if (!db) throw new Error('Firebase nao inicializado')
  const salaRef = doc(db, 'salas', codigo)
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(salaRef)
    if (!snap.exists()) throw new Error('Sala nao encontrada')
    const participantes = { ...(snap.data().participantes || {}) }
    delete participantes[uidParticipante]
    tx.update(salaRef, { participantes })
  })
}

export const gerarCodigo = () => {
  const c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let r = ''
  for (let i = 0; i < 6; i++) r += c[Math.floor(Math.random() * c.length)]
  return r
}

export const buscarProdutoBasePropria = async (codigoBarras) => {
  if (!db) throw new Error('Firebase nao inicializado')
  const qry = query(collection(db, 'produtos'), where('codigoBarras', '==', codigoBarras), where('ativo', '==', true))
  const snap = await getDocs(qry)
  if (snap.empty) return null
  const d = snap.docs[0].data()
  return { id: snap.docs[0].id, ...d }
}

export const buscarProdutosPorNome = async (termo, limite = 10) => {
  if (!db) throw new Error('Firebase nao inicializado')
  if (!termo || termo.length < 2) return []
  const termoLower = termo.toLowerCase().trim()
  try {
    const qry = query(collection(db, 'produtos'), where('ativo', '==', true))
    const snap = await getDocs(qry)
    const resultados = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter(p => p.nome && p.nome.toLowerCase().includes(termoLower))
      .slice(0, limite)
    resultados.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
    return resultados
  } catch (e) {
    console.error('Erro ao buscar produtos por nome:', e)
    return []
  }
}

export const salvarProdutoBasePropria = async (dados) => {
  if (!db) throw new Error('Firebase nao inicializado')
  const docRef = await addDoc(collection(db, 'produtos'), {
    codigoBarras: dados.codigoBarras,
    nome: dados.nome,
    marca: dados.marca || '',
    categoria: dados.categoria || 'Outros',
    quantidade: dados.quantidade || '',
    unidade: dados.unidade || '',
    imagem: dados.imagem || null,
    ativo: true,
    cadastradoEm: new Date().toISOString(),
    cadastradoPor: auth?.currentUser?.uid || null,
  })
  return docRef.id
}

export const listarBasePropria = async () => {
  if (!db) throw new Error('Firebase nao inicializado')
  const snap = await getDocs(collection(db, 'produtos'))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export const editarProdutoBasePropria = async (id, dados) => {
  if (!db) throw new Error('Firebase nao inicializado')
  await updateDoc(doc(db, 'produtos', id), {
    nome: dados.nome,
    marca: dados.marca || '',
    categoria: dados.categoria || 'Outros',
    quantidade: dados.quantidade || '',
    unidade: dados.unidade || '',
  })
}

export const buscarProdutoPorId = async (id) => {
  if (!db) throw new Error('Firebase nao inicializado')
  const snap = await getDoc(doc(db, 'produtos', id))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

// Liga dois produtos da base própria como "variantes" um do outro (mesmo
// produto, tamanho/embalagem diferente — ex: creme dental 75g e 180g).
// Usa um campo compartilhado `grupoVariante`: se um dos dois já pertence
// a um grupo, o outro entra nesse grupo; se os dois já tiverem grupos
// DIFERENTES (cada um já linkado com outros produtos), os dois grupos
// são fundidos em um só, pra não perder vínculos já feitos.
export const vincularVariante = async (idA, idB) => {
  if (!db) throw new Error('Firebase nao inicializado')
  if (idA === idB) throw new Error('Selecione dois produtos diferentes')
  const [snapA, snapB] = await Promise.all([
    getDoc(doc(db, 'produtos', idA)),
    getDoc(doc(db, 'produtos', idB)),
  ])
  if (!snapA.exists() || !snapB.exists()) throw new Error('Produto não encontrado')
  const grupoA = snapA.data().grupoVariante || null
  const grupoB = snapB.data().grupoVariante || null

  if (grupoA && grupoB && grupoA !== grupoB) {
    const qGrupoB = query(collection(db, 'produtos'), where('grupoVariante', '==', grupoB))
    const snapGrupoB = await getDocs(qGrupoB)
    await Promise.all(snapGrupoB.docs.map((d) => updateDoc(d.ref, { grupoVariante: grupoA })))
    return grupoA
  }

  const grupo = grupoA || grupoB || `grp_${idA}`
  await Promise.all([
    updateDoc(doc(db, 'produtos', idA), { grupoVariante: grupo }),
    updateDoc(doc(db, 'produtos', idB), { grupoVariante: grupo }),
  ])
  return grupo
}

// Remove só este produto do grupo de variantes (os outros continuam ligados).
export const desvincularVariante = async (id) => {
  if (!db) throw new Error('Firebase nao inicializado')
  await updateDoc(doc(db, 'produtos', id), { grupoVariante: null })
}

export const definirAtivoBasePropria = async (id, ativo) => {
  if (!db) throw new Error('Firebase nao inicializado')
  await updateDoc(doc(db, 'produtos', id), { ativo })
}

export const criarSala = async (nomeSala, produtos, criadorNome, criadorMercado) => {
  if (!db || !auth) throw new Error('Firebase nao inicializado')
  const user = auth.currentUser
  if (!user) throw new Error('Nao autenticado')
  let codigo, salaRef, snap, tentativas = 0
  do {
    codigo = gerarCodigo()
    salaRef = doc(db, 'salas', codigo)
    snap = await getDoc(salaRef)
    tentativas++
  } while (snap.exists() && tentativas < 5)
  if (snap.exists()) throw new Error('Codigo indisponivel. Tente novamente.')
  const participantes = {}
  participantes[user.uid] = {
    nome: criadorNome,
    mercado: criadorMercado,
    uid: user.uid,
    entrouEm: new Date().toISOString(),
  }
  await setDoc(salaRef, {
    nome: nomeSala || 'Cotacao',
    criadoEm: new Date().toISOString(),
    ativa: true,
    criadorUid: user.uid,
    produtos: produtos.map((p, i) => ({
      id: `p${i}`,
      nome: p.nome,
      quantidade: p.quantidade || 1,
      unidade: p.unidade || 'un',
      codigo: p.codigo || null,
      categoria: p.categoria || 'Outros',
    })),
    participantes,
  })
  return codigo
}

export const entrarSala = async (codigo, nome, mercado) => {
  if (!db || !auth) throw new Error('Firebase nao inicializado')
  const user = auth.currentUser
  const salaRef = doc(db, 'salas', codigo)
  const snap = await getDoc(salaRef)
  if (!snap.exists()) throw new Error('Sala nao encontrada.')
  await updateDoc(salaRef, {
    [`participantes.${user.uid}`]: {
      nome,
      mercado,
      uid: user.uid,
      entrouEm: new Date().toISOString(),
    },
  })
  return snap.data()
}

export const escutarSala = (codigo, cb) => {
  if (!db) {
    console.error('Firebase nao inicializado')
    return () => {}
  }
  const ref = doc(db, 'salas', codigo)
  return onSnapshot(ref, (s) => cb(s.exists() ? s.data() : null))
}

export const lancarPreco = async (codigo, produtoId, mercado, preco, oferta = null) => {
  if (!db) throw new Error('Firebase nao inicializado')
  const precoId = `${produtoId}__${sanitizarId(mercado)}`
  await setDoc(doc(db, 'salas', codigo, 'precos', precoId), {
    produtoId,
    mercado,
    preco: parseFloat(preco),
    oferta: !!(oferta && oferta.tipo),
    tipoOferta: (oferta && oferta.tipo) || '',
    obsOferta: (oferta && oferta.obs) || '',
    atualizadoPor: auth?.currentUser?.uid || null,
    atualizadoEm: new Date().toISOString(),
  })
}

export const escutarPrecos = (codigo, cb) => {
  if (!db) {
    console.error('Firebase nao inicializado')
    return () => {}
  }
  const ref = collection(db, 'salas', codigo, 'precos')
  return onSnapshot(ref, (snap) => {
    const precos = {}
    snap.forEach((docSnap) => {
      const d = docSnap.data()
      if (!precos[d.produtoId]) precos[d.produtoId] = {}
      precos[d.produtoId][d.mercado] = {
        preco: d.preco,
        oferta: !!d.oferta,
        tipoOferta: d.tipoOferta || '',
        obsOferta: d.obsOferta || '',
        atualizadoEm: d.atualizadoEm || null,
      }
    })
    cb(precos)
  })
}

function sanitizarId(s) {
  return String(s).trim().replace(/\//g, '_') || 'mercado'
}

export const editarProduto = async (codigo, produtoId, dadosNovos) => {
  if (!db) throw new Error('Firebase nao inicializado')
  const salaRef = doc(db, 'salas', codigo)
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(salaRef)
    if (!snap.exists()) throw new Error('Sala nao encontrada')
    const produtos = snap.data().produtos || []
    const idx = produtos.findIndex((p) => p.id === produtoId)
    if (idx === -1) throw new Error('Produto nao encontrado')
    const novos = [...produtos]
    novos[idx] = { ...novos[idx], ...dadosNovos }
    tx.update(salaRef, { produtos: novos })
  })
}

export const removerProduto = async (codigo, produtoId) => {
  if (!db) throw new Error('Firebase nao inicializado')
  try {
    const precosRef = collection(db, 'salas', codigo, 'precos')
    const qry = query(precosRef, where('produtoId', '==', produtoId))
    const snap = await getDocs(qry)
    await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)))
  } catch (e) {
    console.error('Erro ao limpar precos do produto removido:', e)
  }
  const salaRef = doc(db, 'salas', codigo)
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(salaRef)
    if (!snap.exists()) throw new Error('Sala nao encontrada')
    const produtos = (snap.data().produtos || []).filter((p) => p.id !== produtoId)
    tx.update(salaRef, { produtos })
  })
}

export const adicionarProduto = async (codigo, nome, quantidade, unidade, codigoBarras = null, categoria = 'Outros') => {
  if (!db) throw new Error('Firebase nao inicializado')
  const id = `p${Date.now()}`
  await updateDoc(doc(db, 'salas', codigo), {
    produtos: arrayUnion({ 
      id, 
      nome, 
      quantidade: quantidade || 1, 
      unidade: unidade || 'un',
      codigo: codigoBarras, 
      categoria 
    }),
  })
  return id
}

export const listarMinhasSalas = async () => {
  if (!db || !auth?.currentUser) throw new Error('Nao autenticado')
  const uid = auth.currentUser.uid
  const qry = query(collection(db, 'salas'), where(`participantes.${uid}.uid`, '==', uid))
  const snap = await getDocs(qry)
  return snap.docs.map((d) => ({ codigo: d.id, ...d.data() }))
}

export const excluirSala = async (codigo) => {
  if (!db) throw new Error('Firebase nao inicializado')
  const precosRef = collection(db, 'salas', codigo, 'precos')
  const snap = await getDocs(precosRef)
  await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)))
  await deleteDoc(doc(db, 'salas', codigo))
}
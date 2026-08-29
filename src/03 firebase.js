import { initializeApp } from 'firebase/app'
import { getAuth, signInAnonymously, setPersistence, browserLocalPersistence } from 'firebase/auth'
import {
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager,
  doc, setDoc, getDoc, updateDoc, deleteDoc, onSnapshot,
  arrayUnion, collection, query, where, getDocs, addDoc, runTransaction,
  orderBy, limit, startAt, endAt
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
  return setPersistence(auth, browserLocalPersistence)
    .then(() => signInAnonymously(auth))
}

export const gerarCodigo = () => {
  const c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let r = ''
  for (let i = 0; i < 6; i++) r += c[Math.floor(Math.random() * c.length)]
  return r
}

// ===== BASE PROPRIA DE PRODUTOS =====
export const buscarProdutoBasePropria = async (codigoBarras) => {
  if (!db) throw new Error('Firebase nao inicializado')
  const qry = query(collection(db, 'produtos'), where('codigoBarras', '==', codigoBarras), where('ativo', '==', true))
  const snap = await getDocs(qry)
  if (snap.empty) return null
  const d = snap.docs[0].data()
  return { id: snap.docs[0].id, ...d }
}

// 🔥 NOVO: Busca produtos por nome (autocomplete)
export const buscarProdutosPorNome = async (termo, limite = 10) => {
  if (!db) throw new Error('Firebase nao inicializado')
  if (!termo || termo.length < 2) return []
  
  const termoLower = termo.toLowerCase().trim()
  const termoUpper = termoLower.charAt(0).toUpperCase() + termoLower.slice(1)
  
  // Busca produtos ativos com nome começando com o termo
  const qry = query(
    collection(db, 'produtos'),
    where('ativo', '==', true),
    orderBy('nome'),
    startAt(termoUpper),
    endAt(termoUpper + '\uf8ff'),
    limit(limite)
  )
  
  try {
    const snap = await getDocs(qry)
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  } catch (e) {
    // Fallback: se a busca com orderBy falhar (ex: índice não criado), busca sem ordenação
    console.warn('Busca com orderBy falhou, usando fallback:', e)
    const fallbackQry = query(collection(db, 'produtos'), where('ativo', '==', true), limit(limite * 2))
    const snap = await getDocs(fallbackQry)
    const resultados = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    // Filtra manualmente
    return resultados.filter(p => 
      p.nome && p.nome.toLowerCase().includes(termoLower)
    ).slice(0, limite)
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

export const definirAtivoBasePropria = async (id, ativo) => {
  if (!db) throw new Error('Firebase nao inicializado')
  await updateDoc(doc(db, 'produtos', id), { ativo })
}

// ===== SALAS =====
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
      quantidade: p.quantidade || '1.000 un',
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
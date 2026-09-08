import { initializeApp } from 'firebase/app'
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check'
import { getAuth, signInAnonymously, setPersistence, browserLocalPersistence, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth'
import {
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager,
  doc, setDoc, getDoc, updateDoc, deleteDoc, onSnapshot,
  arrayUnion, collection, query, where, getDocs, addDoc, runTransaction,
  writeBatch, limit
} from 'firebase/firestore'

import { chaveMercado } from './utils/mercados.js'
import {
  mockAuth,
  mockLoginAnonimo,
  mockObservarAuth,
  mockLoginAdmin,
  mockLogoutAdmin,
  mockSouAdmin,
  mockListarTodasSalas,
  mockApagarProdutoDeVez,
  mockRemoverParticipanteAdmin,
  mockGerarCodigo,
  mockBuscarProdutoBasePropria,
  mockBuscarProdutosPorNome,
  mockSalvarProdutoBasePropria,
  mockListarBasePropria,
  mockEditarProdutoBasePropria,
  mockBuscarProdutoPorId,
  mockVincularVariante,
  mockDesvincularVariante,
  mockDefinirAtivoBasePropria,
  mockCriarSala,
  mockEntrarSala,
  mockEscutarSala,
  mockLancarPreco,
  mockEscutarPrecos,
  mockEditarProduto,
  mockRemoverProduto,
  mockAdicionarProduto,
  mockListarMinhasSalas,
  mockExcluirSala,
} from './utils/mockStore.js'

const cfg = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || import.meta.env.FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || import.meta.env.FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || import.meta.env.FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || import.meta.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || import.meta.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || import.meta.env.FIREBASE_APP_ID,
}

const miss = Object.entries(cfg).filter(([, v]) => !v).map(([k]) => k)

export const isFirebaseConfigured = miss.length === 0

let app = null
let realAuth = null
let realDb = null

if (!isFirebaseConfigured) {
  console.warn('[AI Studio] Firebase config ausente no .env (' + miss.join(', ') + '). Utilizando modo em memória/local para o preview.')
} else {
  try {
    app = initializeApp(cfg)
    const chaveRecaptcha = import.meta.env.VITE_RECAPTCHA_SITE_KEY
    if (chaveRecaptcha) {
      try {
        initializeAppCheck(app, {
          provider: new ReCaptchaV3Provider(chaveRecaptcha),
          isTokenAutoRefreshEnabled: true,
        })
      } catch (e) {
        console.warn('App Check nao inicializado:', e)
      }
    }
    realAuth = getAuth(app)
    try {
      realDb = initializeFirestore(app, {
        localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
      })
    } catch (e) {
      console.warn('Cache offline indisponivel, seguindo sem persistencia:', e)
      realDb = initializeFirestore(app, {})
    }
  } catch (e) {
    console.error('Falha ao inicializar Firebase:', e)
  }
}

export const auth = isFirebaseConfigured && realAuth ? realAuth : mockAuth
export const db = isFirebaseConfigured && realDb ? realDb : {}

export const loginAnonimo = () => {
  if (!isFirebaseConfigured) return mockLoginAnonimo()
  if (!realAuth) return Promise.reject(new Error('Firebase nao inicializado.'))
  if (realAuth.currentUser) return Promise.resolve(realAuth.currentUser)
  return setPersistence(realAuth, browserLocalPersistence)
    .then(() => signInAnonymously(realAuth))
}

export const observarAuth = (cb) => {
  if (!isFirebaseConfigured) return mockObservarAuth(cb)
  if (!realAuth) return () => {}
  return onAuthStateChanged(realAuth, cb)
}

export const loginAdmin = (email, senha) => {
  if (!isFirebaseConfigured) return mockLoginAdmin(email, senha)
  if (!realAuth) return Promise.reject(new Error('Firebase nao inicializado'))
  return signInWithEmailAndPassword(realAuth, email, senha)
}

export const logoutAdmin = async () => {
  if (!isFirebaseConfigured) return mockLogoutAdmin()
  if (!realAuth) return
  await signOut(realAuth)
  await loginAnonimo()
}

export const souAdmin = async () => {
  if (!isFirebaseConfigured) return mockSouAdmin()
  if (!realDb || !realAuth?.currentUser) return false
  try {
    const snap = await getDoc(doc(realDb, 'admins', realAuth.currentUser.uid))
    return snap.exists()
  } catch (e) {
    return false
  }
}

export const listarTodasSalas = async () => {
  if (!isFirebaseConfigured) return mockListarTodasSalas()
  if (!realDb) throw new Error('Firebase nao inicializado')
  const snap = await getDocs(collection(realDb, 'salas'))
  return snap.docs.map((d) => ({ codigo: d.id, ...d.data() }))
}

export const apagarProdutoDeVez = async (id) => {
  if (!isFirebaseConfigured) return mockApagarProdutoDeVez(id)
  if (!realDb) throw new Error('Firebase nao inicializado')
  await deleteDoc(doc(realDb, 'produtos', id))
}

export const removerParticipanteAdmin = async (codigo, uidParticipante) => {
  if (!isFirebaseConfigured) return mockRemoverParticipanteAdmin(codigo, uidParticipante)
  if (!realDb) throw new Error('Firebase nao inicializado')
  const salaRef = doc(realDb, 'salas', codigo)
  await runTransaction(realDb, async (tx) => {
    const snap = await tx.get(salaRef)
    if (!snap.exists()) throw new Error('Sala nao encontrada')
    const participantes = { ...(snap.data().participantes || {}) }
    delete participantes[uidParticipante]
    tx.update(salaRef, { participantes })
  })
}

export const gerarCodigo = () => {
  if (!isFirebaseConfigured) return mockGerarCodigo()
  const c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let r = ''
  for (let i = 0; i < 6; i++) r += c[Math.floor(Math.random() * c.length)]
  return r
}

export const buscarProdutoBasePropria = async (codigoBarras) => {
  if (!isFirebaseConfigured) return mockBuscarProdutoBasePropria(codigoBarras)
  if (!realDb) throw new Error('Firebase nao inicializado')
  const qry = query(collection(realDb, 'produtos'), where('codigoBarras', '==', codigoBarras), where('ativo', '==', true), limit(1))
  const snap = await getDocs(qry)
  if (snap.empty) return null
  const d = snap.docs[0].data()
  return { id: snap.docs[0].id, ...d }
}

export const buscarProdutosPorNome = async (termo, limite = 10) => {
  if (!isFirebaseConfigured) return mockBuscarProdutosPorNome(termo, limite)
  if (!realDb) throw new Error('Firebase nao inicializado')
  if (!termo || termo.length < 2) return []
  const termoLower = termo.toLowerCase().trim()
  try {
    const qry = query(collection(realDb, 'produtos'), where('ativo', '==', true))
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
  if (!isFirebaseConfigured) return mockSalvarProdutoBasePropria(dados)
  if (!realDb) throw new Error('Firebase nao inicializado')
  const docRef = await addDoc(collection(realDb, 'produtos'), {
    codigoBarras: dados.codigoBarras,
    nome: dados.nome,
    marca: dados.marca || '',
    categoria: dados.categoria || 'Outros',
    quantidade: dados.quantidade || '',
    unidade: dados.unidade || '',
    imagem: dados.imagem || null,
    ativo: true,
    cadastradoEm: new Date().toISOString(),
    cadastradoPor: realAuth?.currentUser?.uid || null,
  })
  return docRef.id
}

export const listarBasePropria = async () => {
  if (!isFirebaseConfigured) return mockListarBasePropria()
  if (!realDb) throw new Error('Firebase nao inicializado')
  const snap = await getDocs(collection(realDb, 'produtos'))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export const editarProdutoBasePropria = async (id, dados) => {
  if (!isFirebaseConfigured) return mockEditarProdutoBasePropria(id, dados)
  if (!realDb) throw new Error('Firebase nao inicializado')
  await updateDoc(doc(realDb, 'produtos', id), {
    nome: dados.nome,
    marca: dados.marca || '',
    categoria: dados.categoria || 'Outros',
    quantidade: dados.quantidade || '',
    unidade: dados.unidade || '',
  })
}

export const buscarProdutoPorId = async (id) => {
  if (!isFirebaseConfigured) return mockBuscarProdutoPorId(id)
  if (!realDb) throw new Error('Firebase nao inicializado')
  const snap = await getDoc(doc(realDb, 'produtos', id))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

export const vincularVariante = async (idA, idB) => {
  if (!isFirebaseConfigured) return mockVincularVariante(idA, idB)
  if (!realDb) throw new Error('Firebase nao inicializado')
  if (idA === idB) throw new Error('Selecione dois produtos diferentes')
  const [snapA, snapB] = await Promise.all([
    getDoc(doc(realDb, 'produtos', idA)),
    getDoc(doc(realDb, 'produtos', idB)),
  ])
  if (!snapA.exists() || !snapB.exists()) throw new Error('Produto não encontrado')
  const grupoA = snapA.data().grupoVariante || null
  const grupoB = snapB.data().grupoVariante || null

  if (grupoA && grupoB && grupoA !== grupoB) {
    const qGrupoB = query(collection(realDb, 'produtos'), where('grupoVariante', '==', grupoB))
    const snapGrupoB = await getDocs(qGrupoB)
    await Promise.all(snapGrupoB.docs.map((d) => updateDoc(d.ref, { grupoVariante: grupoA })))
    return grupoA
  }

  const grupo = grupoA || grupoB || `grp_${idA}`
  await Promise.all([
    updateDoc(doc(realDb, 'produtos', idA), { grupoVariante: grupo }),
    updateDoc(doc(realDb, 'produtos', idB), { grupoVariante: grupo }),
  ])
  return grupo
}

export const desvincularVariante = async (id) => {
  if (!isFirebaseConfigured) return mockDesvincularVariante(id)
  if (!realDb) throw new Error('Firebase nao inicializado')
  await updateDoc(doc(realDb, 'produtos', id), { grupoVariante: null })
}

export const definirAtivoBasePropria = async (id, ativo) => {
  if (!isFirebaseConfigured) return mockDefinirAtivoBasePropria(id, ativo)
  if (!realDb) throw new Error('Firebase nao inicializado')
  await updateDoc(doc(realDb, 'produtos', id), { ativo })
}

export const criarSala = async (nomeSala, produtos, criadorNome, criadorMercado) => {
  if (!isFirebaseConfigured) return mockCriarSala(nomeSala, produtos, criadorNome, criadorMercado)
  if (!realDb || !realAuth) throw new Error('Firebase nao inicializado')
  const user = realAuth.currentUser
  if (!user) throw new Error('Nao autenticado')
  let codigo, salaRef, snap, tentativas = 0
  do {
    codigo = gerarCodigo()
    salaRef = doc(realDb, 'salas', codigo)
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
  if (!isFirebaseConfigured) return mockEntrarSala(codigo, nome, mercado)
  if (!realDb || !realAuth) throw new Error('Firebase nao inicializado')
  const user = realAuth.currentUser
  const salaRef = doc(realDb, 'salas', codigo)
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
  if (!isFirebaseConfigured) return mockEscutarSala(codigo, cb)
  if (!realDb) {
    console.error('Firebase nao inicializado')
    return () => {}
  }
  const ref = doc(realDb, 'salas', codigo)
  return onSnapshot(ref, { includeMetadataChanges: true }, (s) =>
    cb(s.exists() ? s.data() : null, { hasPendingWrites: s.metadata.hasPendingWrites, fromCache: s.metadata.fromCache })
  )
}

export const lancarPreco = async (codigo, produtoId, mercado, preco, oferta = null) => {
  if (!isFirebaseConfigured) return mockLancarPreco(codigo, produtoId, mercado, preco, oferta)
  if (!realDb) throw new Error('Firebase nao inicializado')
  const precoId = `${produtoId}__${sanitizarId(mercado)}`
  await setDoc(doc(realDb, 'salas', codigo, 'precos', precoId), {
    produtoId,
    mercado,
    preco: parseFloat(preco),
    oferta: !!(oferta && oferta.tipo),
    tipoOferta: (oferta && oferta.tipo) || '',
    obsOferta: (oferta && oferta.obs) || '',
    atualizadoPor: realAuth?.currentUser?.uid || null,
    atualizadoEm: new Date().toISOString(),
  })
}

export const escutarPrecos = (codigo, cb) => {
  if (!isFirebaseConfigured) return mockEscutarPrecos(codigo, cb)
  if (!realDb) {
    console.error('Firebase nao inicializado')
    return () => {}
  }
  const ref = collection(realDb, 'salas', codigo, 'precos')
  return onSnapshot(ref, { includeMetadataChanges: true }, (snap) => {
    const precos = {}
    snap.forEach((docSnap) => {
      const d = docSnap.data()
      if (!precos[d.produtoId]) precos[d.produtoId] = {}
      precos[d.produtoId][chaveMercado(d.mercado)] = {
        preco: d.preco,
        oferta: !!d.oferta,
        tipoOferta: d.tipoOferta || '',
        obsOferta: d.obsOferta || '',
        atualizadoEm: d.atualizadoEm || null,
      }
    })
    cb(precos, { hasPendingWrites: snap.metadata.hasPendingWrites, fromCache: snap.metadata.fromCache })
  })
}

function sanitizarId(s) {
  return String(s).trim().toLowerCase().replace(/\//g, '_') || 'mercado'
}

export const editarProduto = async (codigo, produtoId, dadosNovos) => {
  if (!isFirebaseConfigured) return mockEditarProduto(codigo, produtoId, dadosNovos)
  if (!realDb) throw new Error('Firebase nao inicializado')
  const salaRef = doc(realDb, 'salas', codigo)
  await runTransaction(realDb, async (tx) => {
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
  if (!isFirebaseConfigured) return mockRemoverProduto(codigo, produtoId)
  if (!realDb) throw new Error('Firebase nao inicializado')
  try {
    const precosRef = collection(realDb, 'salas', codigo, 'precos')
    const qry = query(precosRef, where('produtoId', '==', produtoId))
    const snap = await getDocs(qry)
    await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)))
  } catch (e) {
    console.error('Erro ao limpar precos do produto removido:', e)
  }
  const salaRef = doc(realDb, 'salas', codigo)
  await runTransaction(realDb, async (tx) => {
    const snap = await tx.get(salaRef)
    if (!snap.exists()) throw new Error('Sala nao encontrada')
    const produtos = (snap.data().produtos || []).filter((p) => p.id !== produtoId)
    tx.update(salaRef, { produtos })
  })
}

export const adicionarProduto = async (codigo, nome, quantidade, unidade, codigoBarras = null, categoria = 'Outros') => {
  if (!isFirebaseConfigured) return mockAdicionarProduto(codigo, nome, quantidade, unidade, codigoBarras, categoria)
  if (!realDb) throw new Error('Firebase nao inicializado')
  const id = `p${Date.now()}`
  await updateDoc(doc(realDb, 'salas', codigo), {
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
  if (!isFirebaseConfigured) return mockListarMinhasSalas()
  if (!realDb || !realAuth?.currentUser) throw new Error('Nao autenticado')
  const uid = realAuth.currentUser.uid
  const qry = query(collection(realDb, 'salas'), where(`participantes.${uid}.uid`, '==', uid))
  const snap = await getDocs(qry)
  return snap.docs.map((d) => ({ codigo: d.id, ...d.data() }))
}

export const excluirSala = async (codigo) => {
  if (!isFirebaseConfigured) return mockExcluirSala(codigo)
  if (!realDb) throw new Error('Firebase nao inicializado')
  const precosRef = collection(realDb, 'salas', codigo, 'precos')
  const snap = await getDocs(precosRef)
  const docs = snap.docs
  for (let i = 0; i < docs.length; i += 400) {
    const lote = docs.slice(i, i + 400)
    const batch = writeBatch(realDb)
    lote.forEach((d) => batch.delete(d.ref))
    await batch.commit()
  }
  await deleteDoc(doc(realDb, 'salas', codigo))
}

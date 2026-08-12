import { initializeApp } from 'firebase/app'
import { getAuth, signInAnonymously } from 'firebase/auth'
import {
  getFirestore, doc, setDoc, getDoc, updateDoc, deleteDoc, onSnapshot,
  arrayUnion, collection, query, where, getDocs, addDoc
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
  db = getFirestore(app)
}

export { auth, db }

export const loginAnonimo = () => {
  if (!auth) return Promise.reject(new Error('Firebase nao inicializado. Verifique o arquivo .env.'))
  return signInAnonymously(auth)
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
      quantidade: p.quantidade || '1 un',
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

export const lancarPreco = async (codigo, produtoId, mercado, preco) => {
  if (!db) throw new Error('Firebase nao inicializado')
  const precoId = `${produtoId}__${sanitizarId(mercado)}`
  await setDoc(doc(db, 'salas', codigo, 'precos', precoId), {
    produtoId,
    mercado,
    preco: parseFloat(preco),
    atualizadoPor: auth?.currentUser?.uid || null,
    atualizadoEm: new Date().toISOString(),
  })
}

// Escuta a subcoleção de precos e monta o mesmo formato { produtoId: { mercado: preco } }
// que os componentes de tela ja esperam, entao nenhum componente precisa mudar.
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
      precos[d.produtoId][d.mercado] = d.preco
    })
    cb(precos)
  })
}

function sanitizarId(s) {
  return String(s).trim().replace(/\//g, '_') || 'mercado'
}

export const adicionarProduto = async (codigo, nome, quantidade, codigoBarras = null, categoria = 'Outros') => {
  if (!db) throw new Error('Firebase nao inicializado')
  const id = `p${Date.now()}`
  await updateDoc(doc(db, 'salas', codigo), {
    produtos: arrayUnion({ id, nome, quantidade: quantidade || '1 un', codigo: codigoBarras, categoria }),
  })
  return id
}

// Lista todas as salas criadas pelo usuário logado (pra tela "Minhas Salas")
export const listarMinhasSalas = async () => {
  if (!db || !auth?.currentUser) throw new Error('Nao autenticado')
  const qry = query(collection(db, 'salas'), where('criadorUid', '==', auth.currentUser.uid))
  const snap = await getDocs(qry)
  return snap.docs.map((d) => ({ codigo: d.id, ...d.data() }))
}

// Exclui a sala inteira. Precisa apagar a subcolecao de precos manualmente,
// pois o Firestore nao remove subcolecoes junto com o documento pai.
export const excluirSala = async (codigo) => {
  if (!db) throw new Error('Firebase nao inicializado')
  const precosRef = collection(db, 'salas', codigo, 'precos')
  const snap = await getDocs(precosRef)
  await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)))
  await deleteDoc(doc(db, 'salas', codigo))
}
